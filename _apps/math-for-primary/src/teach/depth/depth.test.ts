import {describe,it,expect} from 'vitest';
import {lessonById} from '../catalog';
import {isCorrect,feedbackFor} from '../gen';
import {movesFor,goalReachable} from '../tools/moves';
import {DEPTH_IDS} from './lessons';
import {fractionItem,subtractionItem,triangleItem} from './items';
import type {Facet} from '../model';

describe('Teaching depth exemplars',()=>{
 it('checks a prior skill, tests a prediction, then explains the action',()=>{
  for(const id of DEPTH_IDS){
   const l=lessonById(id)!;
   expect(l.revision).toContain('depth-');
   expect(l.stages.slice(0,6).map(s=>s.kind)).toEqual(['readiness','hook','notice','explore','explain','worked']);
   const explore=l.stages[3];if(explore.kind!=='explore')throw Error('missing interaction');
   expect(explore.goal(explore.tool)).toBe(false);
   expect(goalReachable(explore.tool,explore.goal)).toBe(true);
  }
 });
 it('preserves the starting counters and allows each action to be undone',()=>{
  const start={kind:'take-away' as const,start:13,removed:[]};
  for(const next of movesFor(start)){
   expect(next.kind).toBe('take-away');if(next.kind!=='take-away')continue;
   expect(next.start).toBe(13);expect(next.removed).toHaveLength(1);
   expect(movesFor(next)).toContainEqual(start);
  }
 });
 it('requires pictures for picture-reading, missing fraction and unfamiliar-shape questions',()=>{
  for(const make of [subtractionItem,fractionItem,triangleItem])expect(make(1,0,'visual').requiresModel).toBe(true);
  for(const facet of ['visual','missing','unfamiliar'] as Facet[]){
   const item=fractionItem(1,0,facet);expect(item.requiresModel).toBe(true);
   if(item.tool?.kind==='fractions')expect(item.tool.hideValue).toBe(true);
  }
  expect(subtractionItem(1,0,'visual').prompt).not.toMatch(/\d/);
  expect(triangleItem(1,0,'visual').prompt).not.toMatch(/\d/);
 });
 it('independently checks the amounts represented by the generated pictures',()=>{
  for(let seed=0;seed<150;seed++){
   const s=subtractionItem(seed,0,'visual'),f=fractionItem(seed,0,'visual'),t=triangleItem(seed,0,'visual');
   if(s.tool?.kind!=='take-away'||f.tool?.kind!=='fractions'||t.tool?.kind!=='triangle-pair')throw Error('missing required picture');
   expect(Number(s.answer)).toBe(s.tool.start-s.tool.removed.length);
   expect(f.answer).toBe(`${f.tool.shaded[0]}/${f.tool.denominators[0]}`);
   expect(Number(t.answer)).toBe(t.tool.base*t.tool.height/2);
   const missing=subtractionItem(seed,0,'missing');
   if(missing.tool?.kind!=='bond')throw Error('missing bond');
   expect(Number(missing.answer)).toBe(missing.tool.whole-missing.tool.parts[0]);
  }
 });
 it('offers smaller questions and relevant alternatives, with feedback only for wrong answers',()=>{
  for(const make of [subtractionItem,fractionItem,triangleItem])for(let seed=0;seed<50;seed++)for(const facet of ['direct','visual','word','reasoning'] as Facet[]){
   const item=make(seed,0,facet);
   expect(item.simpler).toBeDefined();expect(item.simpler!.simpler).toBeUndefined();
   expect(item.another?.length).toBeGreaterThan(0);
   expect(isCorrect(item,item.answer)).toBe(true);
   for(const [answer,message] of Object.entries(item.wrong??{})){
    expect(isCorrect(item,answer),`${item.key}: ${answer}`).toBe(false);
    expect(feedbackFor(item,answer)).toBe(message);
   }
   if(item.choices){expect(new Set(item.choices).size).toBe(3);expect(item.choices).toContain(item.answer);}
  }
 });
 it('does not introduce negative-number distractors into P1 reasoning',()=>{
  for(let seed=0;seed<150;seed++){
   const item=subtractionItem(seed,0,'reasoning');
   for(const choice of item.choices??[]){expect(choice).not.toMatch(/=\s*-/);expect((choice.match(/\d+/g)??[]).map(Number).every(n=>n<=20)).toBe(true);}
  }
 });
});
