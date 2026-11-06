import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragEqualAdditionsFill';

const num=(text:string,re:RegExp):number=>{
 const m=re.exec(text);
 if(!m)throw new Error(`Cannot read ${re} from: ${text}`);
 return Number(m[1]);
};

/** Independent solver: uses only the visible context text and prompt. */
function solve(context:string[]):{answer:number;kind:string}{
 const all=context.join(' ');
 const L=num(all,/(\d+) cm long/),W=num(all,/(\d+) cm wide/),H=num(all,/(\d+) cm high/);
 const base=L*W;
 if(/Syrup/.test(all)){
  const m=/(\d+)\/(\d+) full/.exec(all)!;
  const initial=base*H*Number(m[1])/Number(m[2]);
  const finalVol=base*num(all,/liquid in the tank is (\d+) cm deep/);
  const v=num(all,/holds (\d+) ml/);
  return {answer:(finalVol-initial)/v,kind:'depth'};
 }
 if(/full of water/.test(all)){
  const m=/(\d+)\/(\d+) full of water/.exec(all)!;
  const rest=base*H-base*H*Number(m[1])/Number(m[2]);
  const v=num(all,/holds (\d+) ml/);
  return {answer:rest/v,kind:'rest'};
 }
 const depth=num(all,/Water in the tank is (\d+) cm deep/);
 const k=num(all,/(\d+) identical bottles/);
 return {answer:base*(H-depth)/k,kind:'per-bottle'};
}

describe('equal additions to a target fill',()=>{
 it('declares metadata that matches the output pattern',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-equal-additions-target-fill');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
 });

 it('matches an independent solution for varied seeds and indices',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   const s=solve(q.context??[]);
   kinds.add(s.kind);
   expect(Number.isInteger(s.answer)).toBe(true);
   expect(s.answer).toBeGreaterThan(0);
   expect(q.answer).toBe(String(s.answer));
   expect(q.unit).toBe(s.kind==='per-bottle'?'ml':'bottles');
  }
  expect(kinds.size).toBe(3);
 });

 it('is deterministic and gives worked steps ending with the answer',()=>{
  const a=makeRagQuestion(7,2),b=makeRagQuestion(7,2);
  expect(a).toEqual(b);
  for(let seed=1;seed<=10;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.workedSteps![q.workedSteps!.length-1].equation).toContain(q.answer);
   expect(q.hint.length).toBeGreaterThan(10);
  }
 });

 it('produces varied givens across seeds',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=30;seed++)seen.add(JSON.stringify(makeRagQuestion(seed,0).context));
  expect(seen.size).toBeGreaterThan(10);
 });
});
