import {describe,expect,it} from 'vitest';
import {lessonById} from './catalog';
import {stageItems,stagesFor} from './LessonPlayer';
import {questionKey,withDistinctQuestions} from './distinct';
import type {Gen,Item,Lesson,Stage} from './model';

const itemsFor=(stages:Stage[],seed:number)=>stages.flatMap((stage,index)=>stageItems(stage,seed,index));
const expectDistinct=(items:Item[])=>expect(new Set(items.map(questionKey)).size).toBe(items.length);
// Every initial draw repeats the same question, but redraws offer enough distinct questions.
// This exposes a bypassed wrapper without depending on a generator's random-number distribution.
const repeated:Gen=(_seed,index)=>({key:`item-${index}`,prompt:`How many counters are in group ${Math.floor(index/1000)}?`,answer:String(Math.floor(index/1000)),hints:['Count each counter.'],steps:['Count each counter once.']});
const fixture=():Lesson=>({...lessonById('p1s-length-02')!,stages:[
 {kind:'readiness',title:'Warm up',items:[repeated(0,0)],booster:[]},
 {kind:'mastery',title:'Check',gens:[{facet:'visual',gen:repeated},{facet:'word',gen:repeated},{facet:'missing',gen:repeated}]},
 {kind:'practice',mode:'independent',challenge:true,title:'Challenge',gen:repeated,count:3},
]});

describe('Distinct questions in the sequence the pupil actually plays',()=>{
 it('does not repeat the same ruler question in a reordered quick review',()=>{
  const lesson=lessonById('p1s-length-02')!;
  for(const seed of [7919,15841])expectDistinct(itemsFor(stagesFor(lesson,'review'),seed));
 });

 it('unwraps old catalogue positions before deduplicating reordered review facets',()=>{
  const lesson=withDistinctQuestions(fixture());
  const questions=itemsFor(stagesFor(lesson,'review'),73);
  expect(questions).toHaveLength(3);
  expectDistinct(questions);
  // The warm-up was not played, so its question need not be excluded from this review.
  expect(questions.map(q=>q.answer)).toEqual(['0','1','2']);
 });

 it('deduplicates across the check and challenge after their stage positions change',()=>{
  const lesson=withDistinctQuestions(fixture());
  const questions=itemsFor(stagesFor(lesson,'challenge'),73);
  expect(questions).toHaveLength(6);
  expectDistinct(questions);
  expect(questions.map(q=>q.answer)).toEqual(['0','1','2','3','4','5']);
 });

 it('recreates identical questions and keys when an attempt resumes in any mode',()=>{
  const lesson=withDistinctQuestions(fixture());
  for(const mode of ['learn','review','challenge'] as const){
   const initial=itemsFor(stagesFor(lesson,mode),501);
   itemsFor(stagesFor(lesson,mode),902);
   expect(itemsFor(stagesFor(lesson,mode),501)).toEqual(initial);
  }
 });

 it('does not change draws when the same sequence is wrapped repeatedly',()=>{
  const once=withDistinctQuestions(fixture());
  const twice=withDistinctQuestions(once);
  expect(itemsFor(twice.stages,320)).toEqual(itemsFor(once.stages,320));
 });
});
