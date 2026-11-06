import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragQuadrantCompositeBoundaries';
import type {Question} from '../generate';

const PI=22/7;
const visibleText=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const variantOf=(q:Question)=>{
 const t=visibleText(q);
 if(/Three identical quarter-circles/.test(t))return 'three-quadrants';
 if(/two opposite corners/.test(t))return 'square-cuts';
 if(/joined along one side/.test(t))return 'square-quadrant';
 throw new Error('Unknown variant');
};
// Independent solver: uses only the visible context and prompt, never q.answer.
function solve(q:Question):number{
 const t=visibleText(q);
 const kind=variantOf(q);
 if(kind==='three-quadrants'){
  const rad=Number(/radius (\d+) /.exec(t)![1]);
  return 3*(PI*rad/2)+2*rad;
 }
 if(kind==='square-cuts'){
  const side=Number(/side (\d+) /.exec(t)![1]),rad=side/2;
  return 2*(PI*rad/2)+4*rad;
 }
 const width=Number(/(\d+) (?:cm|m) wide/.exec(t)![1]),side=width/2;
 return 2*side+width+PI*side/2;
}

describe('RAG quadrant composite boundaries',()=>{
 it('declares matching metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-quadrant-composite-boundaries');
  expect(RAG_PATTERN.skillIds).toContain('P6.S.CIRCLE.03');
 });

 it('answers agree with an independent solution from the visible givens',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   expect(Math.abs(solve(q)-Number(q.answer))).toBeLessThan(1e-6);
   expect(Number.isInteger(Number(q.answer))).toBe(true);
  }
 });

 it('uses all three variants and the same unit in the text and answer',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=30;seed++){
   const q=makeRagQuestion(seed,0);
   seen.add(variantOf(q));
   expect(visibleText(q)).toContain(` ${q.unit}`);
   expect(q.prompt).toMatch(/perimeter/);
  }
  expect(seen.size).toBe(3);
 });

 it('is deterministic and keyed by seed and index',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  expect(makeRagQuestion(7,2).key).not.toBe(makeRagQuestion(7,3).key);
 });

 it('has hint, worked steps and a figure whose arc count matches the method',()=>{
  for(let seed=1;seed<=24;seed++){
   const q=makeRagQuestion(seed,0);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   const pic=q.picture as unknown as {type:string;marks:{kind:string;d?:string}[]};
   expect(pic.type).toBe('batch11-upper');
   const arcs=pic.marks.filter(m=>m.kind==='path'&&m.d).reduce((n,m)=>n+(m.d!.match(/A /g)??[]).length,0);
   const expected=variantOf(q)==='three-quadrants'?3:variantOf(q)==='square-cuts'?2:1;
   expect(arcs).toBe(expected);
  }
 });
});
