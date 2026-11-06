import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragTwoPartyTransfer';

type P=number|{op:string;a:P;b:P};
const evalProof=(p:P):number=>typeof p==='number'?p:p.op==='+'?evalProof(p.a)+evalProof(p.b):p.op==='-'?evalProof(p.a)-evalProof(p.b):p.op==='*'?evalProof(p.a)*evalProof(p.b):evalProof(p.a)/evalProof(p.b);

const A=/^(\w+) and (\w+) had some (\w+)\. \1 had (\d+) fewer \3 than \2\. After \2 gave 1\/(\d+) of \2's \3 to \1, \1 had (\d+) more \3 than \2\. How many \3 did \2 have at first\?$/;
const B=/^(\w+) had \$(\d+) more than (\w+)\. After \1 gave (\d+)\/(\d+) of \1's money to \3, they had the same amount of money\. How much money did \3 have at first\?$/;
const C=/^(\w+) and (\w+) each had some (\w+) at first\. After \1 gave 1\/(\d+) of \1's \3 to \2, \2 had (\d+) times as many \3 as \1\. Then \2 gave \1 (\d+) \3\. Now they both had the same number of \3\. How many \3 did \2 have at first\?$/;

// Solves from the visible wording only, then checks the answer against a forward simulation.
function solveFromPrompt(prompt:string):{answer:number;kind:string}{
 let m=A.exec(prompt);
 if(m){
  const d=Number(m[4]),k=Number(m[5]),e=Number(m[6]),transfer=(d+e)/2,x=k*transfer;
  expect(Number.isInteger(transfer)).toBe(true);
  expect(x-d).toBeGreaterThan(0);
  expect((x-d)+x/k-(x-x/k)).toBe(e);
  return {answer:x,kind:'A'};
 }
 m=B.exec(prompt);
 if(m){
  const D=Number(m[2]),num=Number(m[4]),den=Number(m[5]),transfer=D/2,giver=transfer/num*den,other=giver-D;
  expect(den).toBeGreaterThan(2*num);
  expect(other).toBeGreaterThan(0);
  expect(giver-giver*num/den).toBeCloseTo(other+giver*num/den,9);
  return {answer:other,kind:'B'};
 }
 m=C.exec(prompt);
 if(m){
  const k=Number(m[4]),ratio=Number(m[5]),g=Number(m[6]),u=2*g/((ratio-1)*(k-1)),first=k*u,second=(ratio*(k-1)-1)*u;
  expect(Number.isInteger(u)).toBe(true);
  const firstAfter=first-first/k,secondAfter=second+first/k;
  expect(secondAfter).toBe(ratio*firstAfter);
  expect(firstAfter+g).toBe(secondAfter-g);
  return {answer:second,kind:'C'};
 }
 throw new Error(`Unrecognised prompt: ${prompt}`);
}

describe('two-party fraction transfer generator',()=>{
 it('exports consistent metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-two-party-fraction-transfer-comparison');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<9;index++){
   const q=makeRagQuestion(seed,index),solved=solveFromPrompt(q.prompt);
   kinds.add(solved.kind);
   expect(q.answer).toBe(String(solved.answer));
   expect(Number.isInteger(solved.answer)).toBe(true);
   expect(solved.answer).toBeGreaterThan(0);
  }
  expect([...kinds].sort()).toEqual(['A','B','C']);
 });

 it('is deterministic and gives complete supporting text',()=>{
  for(let seed=1;seed<=20;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   expect(makeRagQuestion(seed,index)).toEqual(q);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(20);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.unit).toBeTruthy();
   expect(q.proof).toBeDefined();
   expect(evalProof(q.proof as P)).toBeCloseTo(Number(q.answer),9);
  }
 });

 it('does not reuse the source numbers',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<9;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.prompt).not.toMatch(/1053|2\/9 of .* to Caris/);
   expect(q.prompt).not.toMatch(/\b120 fewer\b.*\b24 more\b/);
   const c=C.exec(q.prompt);
   if(c)expect([c[4],c[5],c[6]].join(',')).not.toBe('4,3,12');
  }
 });

 it('varies the generated questions',()=>{
  const prompts=new Set(Array.from({length:40},(_,i)=>makeRagQuestion(7,i).prompt));
  expect(prompts.size).toBeGreaterThan(30);
  expect(new Set(Array.from({length:12},(_,i)=>makeRagQuestion(3,i).key)).size).toBe(12);
 });
});
