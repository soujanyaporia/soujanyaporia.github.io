import {describe,it,expect} from 'vitest';
import {LESSONS,lessonById} from '../catalog';
import {REFERENCE_IDS} from './referenceLessons';
import {goalReachable} from '../tools/moves';
import {isCorrect} from '../gen';
import {freshItemWork,mergeItemWork,masteryStars,readAttempts,writeAttempt,reviewDue,type LessonAttempt} from '../progress';
import type {ProgressState} from '../../state/progress';

describe('Learning quality and honest evidence',()=>{
 it('gives every lesson a grounded explain-back before its assessment',()=>{
  for(const lesson of LESSONS){
   const index=lesson.stages.findIndex(s=>s.kind==='reflect'),reflect=lesson.stages[index];
   expect(index,lesson.id).toBeGreaterThan(lesson.stages.findIndex(s=>s.kind==='worked'));
   expect(index,lesson.id).toBeLessThan(lesson.stages.findIndex(s=>s.kind==='mastery'));
   expect(lesson.stages.filter(s=>s.kind==='reflect'),lesson.id).toHaveLength(1);
   if(reflect.kind!=='reflect')throw Error('No reflection');
   expect(reflect.prompts.length).toBeGreaterThanOrEqual(3);
   expect(reflect.explanation.length).toBeGreaterThanOrEqual(3);
   expect(reflect.transfer.length).toBeGreaterThan(30);
  }
 });
 it('provides ten reference sequences spanning all primary years, with reachable actions',()=>{
  expect(REFERENCE_IDS).toHaveLength(10);
  expect([...new Set(REFERENCE_IDS.map(id=>lessonById(id)!.level))].sort()).toEqual([1,2,3,4,5,6]);
  for(const id of REFERENCE_IDS){
   const l=lessonById(id)!;
   expect(l.stages.slice(0,6).map(s=>s.kind),id).toEqual(['readiness','hook','notice','explore','explain','worked']);
   const explore=l.stages[3];if(explore.kind!=='explore')throw Error('No exploration');
   expect(explore.goal(explore.tool),id).toBe(false);expect(goalReachable(explore.tool,explore.goal),id).toBe(true);
  }
 });
 it('checks an actual earlier skill in the upper-primary reference lessons',()=>{
  const p6=lessonById('p6s-alg-05')!.stages[0],p5=lessonById('p5s-pct-03')!.stages[0];
  if(p6.kind!=='readiness'||p5.kind!=='readiness')throw Error('Missing readiness');
  expect(p6.items[0].tool?.kind).toBe('balance');expect(p6.items[0].answer).toBe('6');
  expect(p5.items[0].answer).toBe('3');expect(p5.items[0].prompt).toContain('ten children');
 });
 it('varies one feature at a time across the new guided question sets',()=>{
  const expected:Record<string,string[]>={
   'p1s-as-03':['3','6','7'],'p2s-md-02':['12','3','5'],'p3s-frac-01':['4','6','6'],
   'p4s-dec-01':['0.3','0.006','0.06'],'p4s-dec-05':['0.62','0.63','0.35'],'p5s-pct-03':['18','24','36'],'p6s-alg-05':['4','5','4']
  };
  for(const [id,answers] of Object.entries(expected)){
   const stage=lessonById(id)!.stages.find(s=>s.kind==='practice'&&s.mode==='guided');
   if(stage?.kind!=='practice')throw Error('Missing guided practice');
   for(const [i,answer] of answers.entries()){
    const question=stage.gen(123,i);expect(isCorrect(question,answer),id).toBe(true);
    if(question.tool?.kind==='bond')expect(Number(answer)).toBe(question.tool.parts.find(p=>p===Number(answer)));
   }
  }
 });
 it('checks decimal exchanges preserve value and fraction cuts preserve area',()=>{
  expect(6/10+2/100).toBeCloseTo(5/10+12/100);
  const lesson=lessonById('p3s-frac-01')!,s=lesson.stages.find(s=>s.kind==='worked');
  if(s?.kind!=='worked')throw Error('Missing worked example');
  for(const step of s.steps)if(step.tool?.kind==='fractions'){
   const t=step.tool;expect(t.shaded[0]/t.denominators[0]).toBe(t.shaded[1]/t.denominators[1]);
  }
 });
 it('retains unfinished answers, wrong attempts and help through a storage round trip',()=>{
  const data=new Map<string,string>(),kv={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
  const work={...freshItemWork(false),value:'9',tries:1,hints:1,wrong:'Look at the parts again.'};
  const attempt:LessonAttempt={v:1,lessonId:'p1s-as-03',attemptId:'test',seed:7,mode:'learn',stage:0,items:{},work:{'0:q':work},done:{},readinessMissed:false,confidence:null,startedAt:1,updatedAt:2,completedAt:null,stars:null};
  writeAttempt(kv,'qa',attempt);
  expect(readAttempts(kv,'qa')[attempt.lessonId].work?.['0:q']).toEqual(work);
  const resumed=mergeItemWork(work,{...freshItemWork(false),value:'3'});
  expect(resumed.value).toBe('3');expect(resumed.tries).toBe(1);expect(resumed.hints).toBe(1);
 });
 it('cannot turn recovered or corrected answers into independent success',()=>{
  const old={...freshItemWork(false),tries:2,teach:2,usedRecovery:true};
  expect(mergeItemWork(old,freshItemWork(false))).toMatchObject({tries:2,teach:2,usedRecovery:true});
  const results=Array.from({length:5},()=>({facet:'direct' as const,correct:true,firstTry:true}));
  expect(masteryStars(results)).toBe(3);
  expect(masteryStars(results.map((r,i)=>i===0?{...r,firstTry:false}:r))).toBe(2);
  expect(masteryStars([{facet:'direct',correct:false,firstTry:true}])).toBe(1);
 });
 it('requires 60% correct for two stars even in a short review',()=>{
  const results=Array.from({length:4},(_,i)=>({facet:'direct' as const,correct:i<2,firstTry:false}));
  expect(masteryStars(results)).toBe(1);
  expect(masteryStars(results.map((r,i)=>i===2?{...r,correct:true}:r))).toBe(2);
 });
 it('returns a weak review to tomorrow even after several earlier reviews',()=>{
  const now=1000000000,day=86400000;
  const progress={nodes:{'learn.example':{completions:1,lastAt:now-day,bestStars:3,lastStars:3},'learn.example.review':{completions:4,lastAt:now,bestStars:3,lastStars:2}}} as unknown as ProgressState;
  expect(reviewDue(progress,{id:'example'},now).at).toBe(now+day);
  progress.nodes['learn.example.review'].lastStars=3;
  expect(reviewDue(progress,{id:'example'},now).at).toBe(now+30*day);
 });
});
