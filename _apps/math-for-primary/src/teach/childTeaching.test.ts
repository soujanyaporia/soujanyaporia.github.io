import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {lessonById,LESSONS} from './catalog';
import {lessonsForActivity} from './index';
import {ACTIVITIES} from '../primary/catalog';
import {makeQuestion} from '../primary/generate';
import {solutionFrames} from '../media/solution';
import {BundleTenScene,bundlePosition} from './tools/BundleTenScene';
import {JoinParts,joinedTotal} from './tools/JoinParts';
import {goalReachable} from './tools/moves';

describe('small, connected steps for a primary-one child',()=>{
 it('keeps exactly the same 32 counters in all five grouping pictures',()=>{
  for(let phase=0;phase<=4;phase++){
   const html=renderToStaticMarkup(createElement(BundleTenScene,{phase}));
   expect(html.match(/class="bundle-counter"/g)).toHaveLength(32);
   const positions=Array.from({length:32},(_,i)=>bundlePosition(i,phase));
   expect(new Set(positions.map(p=>p.join(','))).size).toBe(32);
   if(phase)for(let g=0;g<Math.min(3,phase);g++)expect(positions.filter(([x,y])=>x<300&&y===65+57*g)).toHaveLength(10);
  }
 });
 it('joins two groups before introducing the third, while preserving every object',()=>{
  const lesson=lessonById('p1s-as-06')!,stage=lesson.stages.find(s=>s.kind==='explain');
  if(stage?.kind!=='explain')throw Error('Missing explanation');
  expect(stage.frames!.map(f=>f.tool?.kind==='join-parts'?f.tool.joined:null)).toEqual([[],[0],[0,1],[0,1,2]]);
  for(const frame of stage.frames!){
   if(frame.tool?.kind!=='join-parts')throw Error('Missing joining model');
   expect(frame.tool.parts).toEqual([2,3,4]);
   const html=renderToStaticMarkup(createElement(JoinParts,{t:frame.tool}));
   expect(html.match(/class="joining-counter"/g)).toHaveLength(9);
  }
  expect(stage.frames![2].text).toContain('still waiting');
 });
 it('asks for the subtotal and then the whole without printing either answer on the model',()=>{
  const worked=lessonById('p1s-as-06')!.stages.find(s=>s.kind==='worked');
  if(worked?.kind!=='worked'||worked.tool?.kind!=='join-parts')throw Error('Missing worked model');
  const [a,b,c]=worked.tool.parts,questions=worked.steps.filter(s=>s.ask);
  expect(questions.map(s=>s.ask!.answer)).toEqual([String(a+b),String(a+b+c)]);
  for(const step of questions){
   if(step.tool?.kind!=='join-parts')throw Error('Missing model');
   expect(step.tool.hideValue).toBe(true);
   const html=renderToStaticMarkup(createElement(JoinParts,{t:step.tool}));
   expect(html).not.toContain('join-part-total');expect(html).not.toContain('counters together');
  }
  expect(questions[0].ask!.wrong?.[String(a+b+c)]).toContain('orange group');
  expect(questions[1].ask!.wrong?.[String(a+b)]).toContain('still need');
 });
 it('lets touch controls reach the whole without omitting the waiting group',()=>{
  const s=lessonById('p1s-as-06')!.stages.find(s=>s.kind==='explore');
  if(s?.kind!=='explore'||s.tool.kind!=='join-parts')throw Error('Missing joining activity');
  expect(s.goal({...s.tool,joined:[0,1]})).toBe(false);
  expect(s.goal({...s.tool,joined:[0,0,1]})).toBe(false);
  expect(goalReachable(s.tool,s.goal)).toBe(true);
  expect(joinedTotal({...s.tool,joined:[0,2,1]})).toBe(9);
 });
 it('links three-addend teaching to actual three-addend practice and matching worked solutions',()=>{
  const lesson=lessonById('p1s-as-06')!,activity=ACTIVITIES.find(a=>a.id===lesson.activityId)!;
  expect(activity.parameter).toBe('three');expect(activity.skillIds).toContain('P1.S.AS.06');
  for(let seed=0;seed<50;seed++){
   const q=makeQuestion(activity,seed);
   if(q.picture?.type!=='parts')throw Error('Missing three groups');
   const [a,b,c]=q.picture.parts;expect(q.picture.parts).toHaveLength(3);expect(Number(q.answer)).toBe(a+b+c);
   const frames=solutionFrames(q);
   expect(frames.map(f=>f.model?.type==='parts'?f.model.joined:null)).toEqual([[],[0,1],[0,1,2],[0,1,2]]);
   expect(frames[1].equation).toBe(`${a} + ${b} = ${a+b}`);
   expect(frames[2].equation).toBe(`${a+b} + ${c} = ${a+b+c}`);
  }
 });
 it('provides relevant guided teaching from every activity and guided stages in every lesson',()=>{
  for(const a of ACTIVITIES){
   const linked=lessonsForActivity(a.id);
   expect(linked[0]?.skillIds.some(id=>a.skillIds.includes(id)),a.id).toBe(true);
  }
  for(const l of LESSONS){
   expect(l.stages.some(s=>s.kind==='explain'&&s.frames?.length),l.id).toBe(true);
   expect(l.stages.some(s=>s.kind==='worked'&&s.steps.some(step=>step.ask)),l.id).toBe(true);
   expect(l.stages.some(s=>s.kind==='practice'&&s.mode==='guided'&&s.count>0),l.id).toBe(true);
  }
 });
 it('invalidates old stage positions only for the two rewritten lessons',()=>{
  for(const id of ['p1s-wn-01','p1s-as-06'])expect(lessonById(id)?.revision).toContain('2026-11-04-child-sequence');
  expect(lessonById('p6s-alg-05')?.revision).toBe('catalogue-depth-2026-09-19-v6');
 });
});
