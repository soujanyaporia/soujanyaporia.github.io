import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragRhombusDiagonalAngleChain';

type P=[number,number];
const rad=(d:number)=>d*Math.PI/180;
const angleAt=(v:P,a:P,b:P)=>{
 const u=[a[0]-v[0],a[1]-v[1]],w=[b[0]-v[0],b[1]-v[1]];
 return Math.acos((u[0]*w[0]+u[1]*w[1])/(Math.hypot(u[0],u[1])*Math.hypot(w[0],w[1])))*180/Math.PI;
};
const givens=(q:Question)=>{
 const m:Record<string,number>={};
 for(const x of (q.context??[]).join(' ').matchAll(/angle ([A-Z]{3}) = (\d+)°/gi))m[x[1].toUpperCase()]=Number(x[2]);
 return m;
};
/** Build rhombus KLMN from the visible angle KMN using KN = NM, independently of the generator. */
function rhombus(d:number){
 const N:P=[1,0],M:P=[0,0],t=2*Math.cos(rad(d)),K:P=[t*Math.cos(rad(d)),t*Math.sin(rad(d))],L:P=[K[0]+M[0]-N[0],K[1]+M[1]-N[1]];
 const len=(a:P,b:P)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 for(const side of [len(K,L),len(L,M),len(M,N),len(N,K)])expect(Math.abs(side-1)).toBeLessThan(1e-9);
 return {K,L,M,N};
}
function solve(q:Question):number{
 const g=givens(q);
 if(q.prompt==='Find angle KLM.'){const {K,L,M}=rhombus(g.KMN);return angleAt(L,K,M);}
 if(q.prompt==='Find angle HNK.'){
  const {K,N}=rhombus(g.KMN),H:P=[N[0]+K[1]/Math.tan(rad(g.NHK)),K[1]];
  expect(H[0]).toBeGreaterThan(K[0]);
  return angleAt(N,H,K);
 }
 if(q.prompt==='Find angle KLT.'){
  const {K,L,M}=rhombus(g.KMN),T:P=[L[0]+(L[0]-M[0]),L[1]+(L[1]-M[1])];
  return angleAt(L,K,T);
 }
 if(q.prompt==='Find angle XYO.'){
  const tw=Math.tan(rad(g.WZX)),X:P=[1,0],Y:P=[0,-tw],O:P=[0,0];
  return angleAt(Y,X,O);
 }
 throw new Error(`Unexpected prompt ${q.prompt}`);
}

describe('rhombus diagonal angle chain',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-rhombus-diagonal-angle-chain');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P5\.S\.(SHAPE|ANGLE)\.0\d$/);
 });
 it('answers match an independent solution of the visible givens across seeds',()=>{
  const prompts=new Set<string>();
  for(let seed=1;seed<=80;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),measured=solve(q),answer=Number(q.answer);
   prompts.add(q.prompt);
   expect(Number.isInteger(answer)).toBe(true);
   expect(answer).toBeGreaterThan(0);
   expect(answer).toBeLessThan(180);
   expect(Math.abs(measured-answer)).toBeLessThan(1e-6);
   expect(q.unit).toBe('degrees');
  }
  expect(prompts.size).toBe(4);
 });
 it('keeps givens in range and shows them in the figure',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),g=givens(q),values=Object.values(g);
   expect(values.length).toBeGreaterThan(0);
   const pic=q.picture as unknown as {type:string;label:string;marks:{kind:string;text?:string}[]};
   expect(pic.type).toBe('batch11-upper');
   expect(pic.label.length).toBeGreaterThan(20);
   const texts=pic.marks.filter(m=>m.kind==='text').map(m=>m.text);
   expect(texts).toContain('?');
   for(const v of values){expect(v).toBeGreaterThan(0);expect(v).toBeLessThan(180);expect(texts).toContain(`${v}°`);}
   expect(pic.marks.filter(m=>m.kind==='line').length).toBeGreaterThanOrEqual(5);
  }
 });
 it('has worked steps, hint, determinism and unique keys',()=>{
  const keys=new Set<string>();
  for(let seed=1;seed<=20;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(JSON.stringify(q)).toBe(JSON.stringify(makeRagQuestion(seed,index)));
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).toContain(`${q.answer}°`);
   expect(JSON.stringify(q)).not.toMatch(/sgexam|Catholic|Raffles|Nan Hua/i);
   keys.add(q.key);
  }
  expect(keys.size).toBe(160);
 });
 it('varies the numbers between seeds',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=30;seed++)seen.add(makeRagQuestion(seed,0).context!.join('|'));
  expect(seen.size).toBeGreaterThan(10);
 });
});
