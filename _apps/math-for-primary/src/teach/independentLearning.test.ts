import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {lessonById,LESSONS} from './catalog';
import {INDEPENDENCE_CHECKS} from './depth/independence';
import {isCorrect,feedbackFor} from './gen';
import {modelReading} from './modelReading';
import {supportRecommendation} from './learningUi';
import {freshItemWork,mergeItemWork} from './progress';
import {ExampleReplay,PictureKey,reflectionReplay} from './LearningSupport';
import {ItemCard} from './LessonPlayer';

describe('Support for learning a new idea independently',()=>{
 it('puts a decision and a changed context between reflection and independent practice',()=>{
  expect(Object.keys(INDEPENDENCE_CHECKS)).toHaveLength(10);
  for(const [id,items] of Object.entries(INDEPENDENCE_CHECKS)){
   const lesson=lessonById(id)!,at=lesson.stages.findIndex(s=>s.title==='Choose a first step, then try it');
   expect(lesson.stages[at-1].kind,id).toBe('reflect');
   expect(lesson.stages[at+1],id).toMatchObject({kind:'practice',mode:'independent'});
   expect(items[0].facet).toBe('reasoning');expect(items[1].facet).toBe('word');
   expect(lesson.revision).toMatch(/-v6$/);
   const bridge=lesson.stages[at];if(bridge.kind!=='practice')throw Error('Missing bridge');
   expect(bridge.gen(5,1).modelNote?.length,id).toBeGreaterThan(40);
   for(const item of items){
    expect(isCorrect(item,item.answer),id).toBe(true);
    for(const value of Object.keys(item.wrong??{})){
     expect(isCorrect(item,value),`${id}: ${value}`).toBe(false);
     expect(feedbackFor(item,value)).toBe(item.wrong![value]);
    }
   }
  }
 });
 it('varies the correct choice position while keeping a resumed question stable',()=>{
  const stage=lessonById('p6s-alg-05')!.stages.find(s=>s.title==='Choose a first step, then try it');
  if(stage?.kind!=='practice')throw Error('Missing bridge');
  const positions=new Set(Array.from({length:30},(_,seed)=>{const q=stage.gen(seed,0);return q.choices!.indexOf(q.answer);}));
  expect(positions.size).toBe(2);expect(stage.gen(31,0)).toEqual(stage.gen(31,0));
 });
 it('independently checks the ten transferred answers against their quantities',()=>{
  const expected:Record<string,number>={'p1s-as-03':10-4,'p1s-as-07':12-4,'p2s-md-02':20/5,'p2s-frac-01':3/4,'p3s-frac-01':8/2,'p4s-dec-01':7/1000,'p4s-dec-05':.71-.26,'p5s-pct-03':90*.3,'p5s-area-02':10*6/2,'p6s-alg-05':(20-2)/3};
  for(const [id,value] of Object.entries(expected))expect(isCorrect(INDEPENDENCE_CHECKS[id][1],String(Number(value.toFixed(6)))),id).toBe(true);
 });
 it('explains bag notation and equality without leaking a hidden value',()=>{
  const tool={kind:'balance' as const,left:{x:2,n:3},right:{x:0,n:1461},xValue:729};
  const text=JSON.stringify(modelReading(tool));
  expect(text).toContain('two equal bags');expect(text).toContain('Both sides');expect(text).not.toContain('729');
  const html=renderToStaticMarkup(createElement(PictureKey,{tool}));expect(html).toContain('Read this picture');expect(html).not.toContain('open=""');
 });
 it('explains place, whole and unit before asking for calculations',()=>{
  expect(JSON.stringify(modelReading({kind:'place',digits:[0,0,7]}))).toContain('thousandth');
  expect(JSON.stringify(modelReading({kind:'ratio',names:['Ali','Ben'],units:[2,3],unitValue:null}))).toContain('each unit may stand for more than one object');
  expect(JSON.stringify(modelReading({kind:'fractions',denominators:[4],shaded:[3]}))).toContain('uncoloured');
 });
 it('offers a first step, then a building block or previous example when support is needed',()=>{
  const item=INDEPENDENCE_CHECKS['p6s-alg-05'][1],work={...freshItemWork(false),tries:2};
  expect(supportRecommendation(item,work,true).kind).toBe('steps');
  expect(supportRecommendation(item,{...work,teach:1},true).kind).toBe('example');
  expect(supportRecommendation({...item,simpler:INDEPENDENCE_CHECKS['p6s-alg-05'][0]},{...work,teach:1},true).kind).toBe('smaller');
  expect(supportRecommendation(item,{...work,teach:1},false).kind).toBe('steps');
 });
 it('does not lose the help evidence when a child returns from an example',()=>{
  expect(mergeItemWork({...freshItemWork(false),usedRecovery:true},freshItemWork(false)).usedRecovery).toBe(true);
 });
 it('initially shows two clear help entries without flooding the question with methods',()=>{
  const html=renderToStaticMarkup(createElement(ItemCard,{item:INDEPENDENCE_CHECKS['p6s-alg-05'][1],guided:false,level:6,onDone:()=>{}}));
  expect(html).toContain('Help me with this');expect(html).toContain('Give me a clue');
  expect(html).not.toContain('What would help?');expect(html).not.toContain('The answer is 6.');
 });
 it('labels the replay as an earlier example and keeps its later steps unrevealed',()=>{
  const example={kind:'worked' as const,title:'Example',problem:'A saved example',steps:[{text:'Look at the groups.'},{text:'Finish the solution.',math:'3 × 17 = 51'}]};
  const html=renderToStaticMarkup(createElement(ExampleReplay,{example,onReturn:()=>{}}));
  expect(html).toContain('Earlier worked example');expect(html).toContain('own numbers');expect(html).toContain('Look at the groups.');expect(html).not.toContain('51');
 });
 it('keeps reflection help on the same values when its example differs from the worked question',()=>{
  const lesson=lessonById('p6s-alg-05')!,stage=lesson.stages.find(s=>s.kind==='reflect');
  if(stage?.kind!=='reflect')throw Error('Missing reflection');
  const replay=reflectionReplay(stage);
  expect(replay.problem).toContain('2x + 3 = 11');
  expect(replay.steps.every(s=>s.tool===stage.tool)).toBe(true);
  expect(replay.steps.map(s=>s.text).join(' ')).not.toContain('fourteen');
 });
 it('keeps a worked example available for every lesson',()=>{
  expect(LESSONS).toHaveLength(265);
  for(const lesson of LESSONS)expect(lesson.stages.some(s=>s.kind==='worked'&&s.steps.length>=2),lesson.id).toBe(true);
 });
});
