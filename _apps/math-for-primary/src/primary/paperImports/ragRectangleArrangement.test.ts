import {describe,expect,it} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragRectangleArrangement';

const need=(m:RegExpMatchArray|null,i=1)=>{if(!m)throw new Error('a given is missing from the visible text');return Number(m[i]);};

/** Independent solver: reads only the visible context and prompt. */
function solve(q:Question):number{
 const t=(q.context??[]).join(' ');
 if(q.prompt.startsWith('What is the width of one tile')){
  const length=need(t.match(/Each tile is ([\d.]+) cm long/));
  const top=need(t.match(/covered by (\d+) flat tiles, end to end/));
  const flat=need(t.match(/covered by (\d+) flat tiles? and/));
  const standing=need(t.match(/and (\d+) standing tiles/));
  return (top-flat)*length/standing;
 }
 if(q.prompt.startsWith('What is the length of one block')){
  const height=need(t.match(/box that is ([\d.]+) cm high/));
  const n=need(t.match(/Stack 1 has (\d+) blocks/));
  const gap=need(t.match(/gap of ([\d.]+) cm/));
  const m=need(t.match(/Stack 2 has (\d+) blocks? lying flat/));
  const width=(height-gap)/n;
  return height-m*width;
 }
 const k=need(t.match(/stack of (\d+) flat books/));
 const shelf=need(t.match(/shelf is ([\d.]+) cm long/));
 const first=t.match(/First arrangement: (\d+) books? stands? upright and (\d+) columns? of \d+ flat books are placed in a row from one end of the shelf, leaving a gap of ([\d.]+) cm/);
 const thick=(shelf-need(first,3))/(need(first)+need(first,2)*k);
 if(q.prompt.startsWith('In the second arrangement')){
  const second=t.match(/Second arrangement: (\d+) books? stands? upright and (\d+) columns? of \d+ flat books/);
  return shelf-thick*(need(second)+need(second,2)*k);
 }
 if(q.prompt.startsWith('What is the height of the shelf')){
  return k*thick+need(t.match(/([\d.]+) cm below the top of the shelf/));
 }
 throw new Error('unknown question form');
}

const sample=Array.from({length:240},(_,i)=>makeRagQuestion(1000+Math.floor(i/4)*7,i%4));

describe('rectangle arrangement equations',()=>{
 it('declares valid metadata',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-rectangle-arrangement-equations');
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution from the visible givens across seeds',()=>{
  for(const q of sample){
   const expected=solve(q);
   expect(Number.isFinite(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(Number(q.answer)).toBeCloseTo(expected,6);
   expect(Math.abs(expected*2-Math.round(expected*2))).toBeLessThan(1e-9);
   expect(q.unit).toBe('cm');
   expect(q.choices).toBeUndefined();
  }
 });

 it('uses all four variants',()=>{
  const forms=new Set(sample.map(q=>q.prompt.split('?')[0]));
  expect(forms.size).toBe(4);
 });

 it('is deterministic and varies the numbers',()=>{
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
  expect(new Set(sample.map(q=>q.answer)).size).toBeGreaterThan(15);
  expect(new Set(sample.map(q=>q.key)).size).toBe(sample.length);
 });

 it('keeps stated geometric constraints',()=>{
  for(const q of sample){
   const t=(q.context??[]).join(' ');
   if(q.prompt.startsWith('What is the width of one tile')){
    expect(solve(q)).toBeLessThan(need(t.match(/Each tile is ([\d.]+) cm long/)));
   }
   if(q.prompt.startsWith('What is the length of one block')){
    const height=need(t.match(/box that is ([\d.]+) cm high/));
    const n=need(t.match(/Stack 1 has (\d+) blocks/));
    const gap=need(t.match(/gap of ([\d.]+) cm/));
    expect(gap).toBeGreaterThan(0);
    expect(solve(q)).toBeGreaterThan((height-gap)/n);
   }
   if(q.prompt.startsWith('In the second arrangement')){
    const first=need(t.match(/leaving a gap of ([\d.]+) cm/));
    expect(solve(q)).toBeGreaterThan(first);
   }
  }
 });

 it('provides hint, worked steps ending in the answer, and explanation',()=>{
  for(const q of sample){
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   const last=q.workedSteps![q.workedSteps!.length-1];
   expect(`${last.text} ${last.equation??''}`).toContain(q.answer);
   expect(q.explanation).toContain(q.answer);
  }
 });
});
