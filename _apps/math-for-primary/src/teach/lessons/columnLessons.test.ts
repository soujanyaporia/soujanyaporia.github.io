import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {COLUMN_LESSONS,COLUMN_LESSON_META,columnLessonItem,columnLessonChallenge,withColumnLessons} from './columnLessons';
import {columnSteps,columnPlace} from '../tools/columnArithmetic';
import {ColumnArithmetic} from '../tools/ColumnCalculation';
import {JoinParts} from '../tools/JoinParts';
import {isCorrect} from '../gen';
import {goalReachable,movesFor} from '../tools/moves';
import type {Item} from '../model';
import {activityById} from '../../primary/catalog';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

const numericResult=(q:Item)=>{if(q.tool?.kind!=='column-algorithm')throw Error('Missing column facts');return q.tool.operation==='+'?q.tool.a+q.tool.b:q.tool.a-q.tool.b;};
function independentlySolve(q:Item):string{
 if(q.kind==='column-missing'){
  if(q.tool?.kind!=='bar'||q.tool.whole===null)throw Error('Missing whole/part');
  return String(q.tool.whole-q.tool.parts.reduce<number>((sum,n)=>sum+(n??0),0));
 }
 if(q.tool?.kind!=='column-algorithm')throw Error('Missing aligned operands');
 if(q.kind==='column-reason'){
  const values:Record<string,number>={one:1,ones:1,ten:10,tens:10,hundred:100,hundreds:100};
  const valid=q.choices!.filter(c=>{const match=c.match(/^Exchange (\d+) (\w+) for (\d+) (\w+)/);return match&&Number(match[1])*values[match[2]]===Number(match[3])*values[match[4]];});
  expect(valid).toHaveLength(1);return valid[0];
 }
 const answer=numericResult(q);
 if(q.kind==='column-digit'){
  const s=columnSteps(q.tool.a,q.tool.b,q.tool.operation)[q.tool.step];
  return String(Math.floor(answer/10**(s.top.length-s.column!-1))%10);
 }
 return String(answer);
}

describe('Four written-column lesson extensions',()=>{
 it('places addition then subtraction directly after the relevant class prerequisite',()=>{
  const existing=[{id:'first'},{id:'p1s-as-05'},{id:'middle'},{id:'p2s-as-01'},{id:'last'}],extensions=COLUMN_LESSON_META.map(({id})=>({id}));
  const result=withColumnLessons(existing,extensions);
  expect(result.map(l=>l.id)).toEqual(['first','p1s-as-05','p1-written-addition','p1-written-subtraction','middle','p2s-as-01','p2-written-addition','p2-written-subtraction','last']);
  expect(withColumnLessons(result,extensions)).toEqual(result);expect(existing).toHaveLength(5);
 });
 it('links to actual matching practice and includes five facets and three separate challenges',()=>{
  expect(COLUMN_LESSONS).toHaveLength(4);
  for(const lesson of COLUMN_LESSONS){
   const meta=COLUMN_LESSON_META.find(m=>m.id===lesson.id)!;
   expect(lesson.objectives).toContain(meta.objective);
   const activity=activityById(lesson.activityId)!;
   expect(activity.kind).toBe(lesson.id.includes('subtraction')?'subtract':'add');
   if(lesson.level===1)expect(activity.parameter).toBe('large');
   for(const id of lesson.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===id)).toBe(true);
   const mastery=lesson.stages.find(s=>s.kind==='mastery');if(mastery?.kind!=='mastery')throw Error('No mastery');
   expect(new Set(mastery.gens.map(g=>g.facet)).size).toBe(5);
   const challenge=lesson.stages.find(s=>s.kind==='practice'&&s.challenge);expect(challenge).toMatchObject({kind:'practice',count:3,challenge:true});
   expect(lesson.stages.length).toBeLessThanOrEqual(12);
   for(const kind of ['readiness','explain','explore','worked','reflect','practice','apply','reason','mastery','discovery'])expect(lesson.stages.some(s=>s.kind===kind)).toBe(true);
   expect(lesson.revision).toBe('catalogue-depth-written-columns-2026-11-04-v1');
   const exploration=lesson.stages.find(s=>s.kind==='explore');if(exploration?.kind!=='explore')throw Error('No hands-on exchange');
   expect(exploration.goal(exploration.tool)).toBe(false);expect(movesFor(exploration.tool).length).toBeGreaterThan(0);expect(goalReachable(exploration.tool,exploration.goal)).toBe(true);
   const reflection=lesson.stages.find(s=>s.kind==='reflect');if(reflection?.kind!=='reflect')throw Error('No explain-back');
   expect(reflection.prompts).toHaveLength(3);expect(reflection.explanation).toHaveLength(3);
   expect(lesson.stages.indexOf(reflection)).toBeGreaterThan(lesson.stages.findIndex(s=>s.kind==='worked'));
   expect(lesson.stages.indexOf(reflection)).toBeLessThan(lesson.stages.findIndex(s=>s.kind==='mastery'));
   for(const facet of mastery.gens){const q=facet.gen(31,0);expect(q.simpler).toBeDefined();expect(q.another?.length).toBeGreaterThan(0);}
  }
 });
 it('asks for every written answer digit without revealing it or erasing earlier work',()=>{
  for(const lesson of COLUMN_LESSONS){
   const worked=lesson.stages.find(s=>s.kind==='worked');if(worked?.kind!=='worked'||worked.tool?.kind!=='column-algorithm')throw Error('No worked column example');
   const {a,b,operation}=worked.tool,result=operation==='+'?a+b:a-b;
   const snapshots=columnSteps(a,b,operation),questions=worked.steps.filter(s=>s.ask);
   expect(questions).toHaveLength(String(result).length);
   for(const frame of questions){
    if(frame.tool?.kind!=='column-algorithm')throw Error('No checkpoint model');
    const snapshot=snapshots[frame.tool.step],column=snapshot.column!,width=snapshot.top.length;
    expect(frame.ask!.answer).toBe(String(Math.floor(result/10**(width-column-1))%10));
    expect(frame.math).toBeUndefined();expect(frame.text).not.toMatch(/\d/);expect(frame.tool.hideValue).toBe(true);
    const html=renderToStaticMarkup(createElement(ColumnArithmetic,{t:frame.tool}));
    expect(html).toContain(`Unknown ${columnPlace(width,column)}`);
    const row=html.match(/<tr class="column-result">([\s\S]*?)<\/tr>/)![1],cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
    expect(cells[column]).toBe('?');
    for(let i=column+1;i<width;i++)if(snapshot.result[i]!==null)expect(cells[i]).toBe(String(snapshot.result[i]));
   }
  }
 });
 it('makes P2 subtraction across a zero an actual chain of two adjacent exchanges',()=>{
  const lesson=COLUMN_LESSONS.find(l=>l.id==='p2-written-subtraction')!,explain=lesson.stages.find(s=>s.kind==='explain');
  if(explain?.kind!=='explain')throw Error('No explanation');
  const models=explain.frames!.map(f=>f.tool).filter(t=>t?.kind==='column-algorithm');
  expect(models[0]).toMatchObject({a:402,b:187,operation:'-'});
  const steps=columnSteps(402,187,'-'),exchanges=steps.filter(s=>s.phase==='exchange');
  expect(exchanges.slice(0,2).map(s=>s.top)).toEqual([[3,10,2],[3,9,12]]);
  expect(exchanges.slice(0,2).map(s=>s.exchange)).toEqual([{from:0,to:1},{from:1,to:2}]);
  expect(steps.at(-1)!.result.join('')).toBe('215');
 });
 it('shows whole counters in the readiness boosters, never fractional place-value charts',()=>{
  for(const lesson of COLUMN_LESSONS){
   const readiness=lesson.stages.find(s=>s.kind==='readiness');if(readiness?.kind!=='readiness')throw Error('No readiness');
   const model=readiness.booster[0].tool;if(model?.kind!=='join-parts')throw Error('A whole-counter model is required');
   const total=lesson.id.includes('addition')?13:10;
   expect(model.parts.reduce((a,b)=>a+b,0)).toBe(total);
   const html=renderToStaticMarkup(createElement(JoinParts,{t:model}));
   expect(html.match(/class="joining-counter"/g)).toHaveLength(total);
   expect(html).not.toMatch(/tenths|hundredths|0\.13|0\.1/);
  }
 });
 it.each(COLUMN_LESSON_META.map(m=>[m.id,m.level] as const))('%s has independently solvable, deterministic questions across five facets',(id,level)=>{
  for(let seed=0;seed<200;seed++)for(const facet of ['direct','visual','missing','word','reasoning'] as const){
   const index=seed%6,q=columnLessonItem(id,seed,index,facet);
   expect(q.answer,`${id}:${seed}:${facet}`).toBe(independentlySolve(q));
   expect(columnLessonItem(id,seed,index,facet)).toEqual(q);expect(isCorrect(q,q.answer)).toBe(true);
   expect(q.hints.length).toBeGreaterThan(0);expect(q.steps.length).toBeGreaterThan(1);
   if(q.choices){expect(new Set(q.choices).size).toBe(3);expect(q.choices.filter(c=>isCorrect(q,c))).toEqual([q.answer]);}
   for(const wrong of Object.keys(q.wrong??{}))expect(isCorrect(q,wrong)).toBe(false);
   if(q.tool?.kind==='column-algorithm'){
    const t=q.tool,max=level===1?100:999;
    expect(t.a).toBeLessThanOrEqual(max);expect(t.b).toBeLessThanOrEqual(max);
    expect(numericResult(q)).toBeGreaterThanOrEqual(0);expect(numericResult(q)).toBeLessThanOrEqual(max);
    expect(columnSteps(t.a,t.b,t.operation).some(s=>s.phase==='exchange')).toBe(true);
    if(id==='p2-written-subtraction'&&index%3===0)expect(Math.floor(t.a/10)%10).toBe(0);
   }
   expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
 it('independently follows the two stated changes in all three challenges per lesson',()=>{
  for(const lesson of COLUMN_LESSONS)for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=columnLessonChallenge(lesson.id,seed,index),[a,b,change]=(q.prompt.match(/\d+/g)??[]).map(Number);
   expect([a,b,change].every(Number.isFinite)).toBe(true);
   const first=lesson.id.includes('addition')?a+b:a-b,second=/Noor adds|then gets/.test(q.prompt)?first+change:first-change;
   expect(Number(q.answer)).toBe(second);expect(second).toBeGreaterThan(0);expect(second).toBeLessThanOrEqual(lesson.level===1?100:999);
   expect(q.hints[0]).toMatch(/^Strategy:/);expect(q.answer).not.toBe(String(first));
   if(index===2)expect(q.prompt).toMatch(/How many more (?:beads|stickers) does Lina have than Noor\?/);
   expect(columnLessonChallenge(lesson.id,seed,index)).toEqual(q);
  }
 });
});
