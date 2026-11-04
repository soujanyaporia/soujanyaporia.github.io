import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FOUR_ADDENDS_AFTER,FOUR_ADDENDS_ID,FOUR_ADDENDS_LESSON,FOUR_ADDENDS_META,fourAddendChallenge,fourAddendItem,withFourAddends} from './fourAddends';
import {JoinParts,joinedTotal} from '../tools/JoinParts';
import {goalReachable} from '../tools/moves';
import {isCorrect} from '../gen';
import {activityById} from '../../primary/catalog';

describe('four-addend extension after joining three groups',()=>{
 it('preserves every counter through pair, third group and final group',()=>{
  const stage=FOUR_ADDENDS_LESSON.stages.find(s=>s.kind==='explain');
  if(stage?.kind!=='explain')throw Error('Missing illustrated explanation');
  const totals:number[]=[];
  for(const frame of stage.frames??[]){
   if(frame.tool?.kind!=='join-parts')throw Error('Missing counter model');
   expect(frame.tool.parts).toEqual([2,3,1,2]);
   totals.push(joinedTotal(frame.tool));
   expect(renderToStaticMarkup(createElement(JoinParts,{t:frame.tool})).match(/class="joining-counter"/g)).toHaveLength(8);
  }
  expect(totals).toEqual([0,5,6,8]);
  expect(stage.frames?.[1].text).toContain('still waiting');
  expect(stage.frames?.[2].text).toContain('still waiting');
 });
 it('asks for each subtotal without printing its answer on the model',()=>{
  const stage=FOUR_ADDENDS_LESSON.stages.find(s=>s.kind==='worked');
  if(stage?.kind!=='worked')throw Error('Missing worked example');
  const questions=stage.steps.filter(step=>step.ask);
  expect(questions.map(step=>step.ask?.answer)).toEqual(['5','7','8']);
  for(const step of questions){
   if(step.tool?.kind!=='join-parts')throw Error('Missing model');
   expect(joinedTotal(step.tool)).toBe(Number(step.ask?.answer));
   expect(step.tool.hideValue).toBe(true);
   expect(renderToStaticMarkup(createElement(JoinParts,{t:step.tool}))).not.toContain('counters together');
  }
 });
 it('requires all four groups and is reachable using the existing touch controls',()=>{
  const stage=FOUR_ADDENDS_LESSON.stages.find(s=>s.kind==='explore');
  if(stage?.kind!=='explore'||stage.tool.kind!=='join-parts')throw Error('Missing interactive model');
  expect(stage.goal({...stage.tool,joined:[0,1,2]})).toBe(false);
  expect(stage.goal({...stage.tool,joined:[0,0,1,2]})).toBe(false);
  expect(stage.goal({...stage.tool,joined:[3,1,0,2]})).toBe(true);
  expect(goalReachable(stage.tool,stage.goal)).toBe(true);
  expect(renderToStaticMarkup(createElement(JoinParts,{t:stage.tool,onChange:()=>{}})).match(/<button/g)).toHaveLength(4);
 });
 it('independently verifies sums and missing parts for 500 seeds',()=>{
  for(let seed=0;seed<500;seed++)for(const facet of ['direct','visual','word','missing','reasoning'] as const){
   const q=fourAddendItem(seed,seed%5,facet);
   expect(fourAddendItem(seed,seed%5,facet)).toEqual(q);
   expect(isCorrect(q,q.answer)).toBe(true);
   for(const answer of Object.keys(q.wrong??{}))expect(isCorrect(q,answer)).toBe(false);
   if(q.tool?.kind==='join-parts'){
    expect(q.tool.parts).toHaveLength(4);
    const whole=q.tool.parts.reduce((sum,n)=>sum+n,0);
    expect(whole).toBeLessThanOrEqual(20);
    expect(q.tool.parts.every(n=>n>=1&&n<=5)).toBe(true);
    if(facet!=='reasoning')expect(Number(q.answer)).toBe(whole);
    else {expect(q.tool.joined).toEqual([0,1,2]);expect(q.answer).toBe('Add the pink group.');}
   }else if(q.tool?.kind==='bar')expect(Number(q.answer)).toBe(q.tool.whole!-q.tool.parts.reduce<number>((sum,n)=>sum+(n??0),0));
   else throw Error('Question lost its picture');
  }
 });
 it('independently solves each challenge from its stated amounts',()=>{
  for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=fourAddendChallenge(seed,index),numbers=(q.prompt.match(/\d+/g)??[]).map(Number);
   if(index===2){const [whole,a,b,c]=numbers;expect(Number(q.answer)).toBe(whole-a-b-c);}
   else {const [a,b,c,d,change]=numbers;expect(Number(q.answer)).toBe(a+b+c+d+(index===0?-change:change));}
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(q.hints[0]).toMatch(/^Strategy: /);
  }
 });
 it('inserts the extension after three-addend teaching without replacing it',()=>{
  const before=[{id:'first'},{id:FOUR_ADDENDS_AFTER},{id:'last'}];
  expect(withFourAddends(before,{id:FOUR_ADDENDS_ID}).map(l=>l.id)).toEqual(['first',FOUR_ADDENDS_AFTER,FOUR_ADDENDS_ID,'last']);
  expect(before).toHaveLength(3);
  expect(FOUR_ADDENDS_LESSON.prerequisites).toEqual([FOUR_ADDENDS_AFTER]);
  expect(FOUR_ADDENDS_LESSON.objectives).toContain(FOUR_ADDENDS_META.objective);
  expect(activityById(FOUR_ADDENDS_META.activityId)?.parameter).toBe('three');
 });
});
