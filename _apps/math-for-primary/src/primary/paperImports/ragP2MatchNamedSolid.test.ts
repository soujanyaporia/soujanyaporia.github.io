import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragP2MatchNamedSolid';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

type Obj={label:string;shape:string};
/** Independent solver: reads only the visible prompt and picture. */
function solve(q:ReturnType<typeof makeRagQuestion>):string{
 const name=/^Which object is a (\w+)\?$/.exec(q.prompt)?.[1];
 const pic=q.picture as unknown as {objects:Obj[]};
 const matches=pic.objects.filter(o=>o.shape===name);
 expect(matches.length).toBe(1);
 return matches[0].label;
}

describe('P2 match a named solid',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(2);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });
 it('answers match the visible picture across seeds',()=>{
  const targets=new Set<string>(),counts=new Set<number>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.answer).toBe(solve(q));
   const objs=(q.picture as unknown as {objects:Obj[]}).objects;
   expect(q.choices).toEqual(objs.map(o=>o.label));
   expect(q.choices).toContain(q.answer);
   expect(new Set(objs.map(o=>o.shape)).size).toBe(objs.length);
   expect(objs.some(o=>o.shape==='cube')&&objs.some(o=>o.shape==='cuboid')).toBe(false);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.explanation.length).toBeGreaterThan(0);
   targets.add(/a (\w+)\?/.exec(q.prompt)![1]);counts.add(objs.length);
  }
  expect(targets.size).toBeGreaterThanOrEqual(4);
  expect(counts).toEqual(new Set([3,4]));
 });
 it('is deterministic',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
 });
});
