import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragIncompleteDistribution';
import {structuredResponseReady} from './batch6MiddleResponse';

const kind=(q:ReturnType<typeof makeRagQuestion>)=>q.structuredResponse?'share':(q.context?.[0]??'').includes('altogether')?'transfer':'depart';

/** Solvers read only the visible context text and search for the unique solution. */
function solveDepart(ctx:string[]):number[]{
 const [,a,b]=/(\d+):(\d+)/.exec(ctx[0])!.map(Number),k=Number(/^(\d+)/.exec(ctx[1])![1]);
 const out:number[]=[];
 for(let u=1;u<=3000;u++)if(a*u-k===b*u)out.push((a+b)*u);
 return out;
}
function solveTransfer(ctx:string[]):number[]{
 const T=Number(/had (\d+)/.exec(ctx[0])![1]),[,a,b]=/(\d+):(\d+)/.exec(ctx[1])!.map(Number),D=Number(/Then \S+ had (\d+) more/.exec(ctx[2])![1]);
 if((T*a)%(a+b)!==0)return [];
 const first=T*a/(a+b),second=T-first,out:number[]=[];
 for(let t=0;t<=first;t++)if((second+t)-(first-t)===D)out.push(t);
 return out;
}
function solveShare(ctx:string[]):[number,number][]{
 const [,p,q]=/(\d+)\/(\d+)/.exec(ctx[0])!.map(Number);
 const m=/among (\w+), (\w+) and (\w+) in the ratio (\d+):(\d+):(\d+)/.exec(ctx[1])!;
 const names=[m[1],m[2],m[3]],ratio=[Number(m[4]),Number(m[5]),Number(m[6])],sum=ratio[0]+ratio[1]+ratio[2];
 const d=/had (\d+) more .* than (\w+)\./.exec(ctx[2])!,D=Number(d[1]),f=names.indexOf(d[2]);
 const out:[number,number][]=[];
 for(let T=q;T<=200000;T+=q){
  const sister=T/q*p,rest=T-sister;
  if(rest%sum!==0)continue;
  if(sister-rest/sum*ratio[f]===D)out.push([sister,T]);
 }
 return out;
}

describe('p5 incomplete distribution and equalization',()=>{
 it('exports consistent metadata',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-incomplete-distribution-equalization');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('is deterministic and uses all three variants',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=12;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   expect(makeRagQuestion(seed,index)).toEqual(q);
   kinds.add(kind(q));
  }
  expect([...kinds].sort()).toEqual(['depart','share','transfer']);
 });

 it('answers match an independent solution of the visible givens across seeds',()=>{
  const seen={depart:0,share:0,transfer:0};
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),k=kind(q);
   seen[k]++;
   expect(q.context?.length).toBe(3);
   if(k==='depart'){const s=solveDepart(q.context!);expect(s).toHaveLength(1);expect(String(s[0])).toBe(q.answer);}
   else if(k==='transfer'){const s=solveTransfer(q.context!);expect(s).toHaveLength(1);expect(String(s[0])).toBe(q.answer);}
   else{
    const s=solveShare(q.context!);expect(s).toHaveLength(1);
    expect(JSON.parse(q.answer)).toEqual([String(s[0][0]),String(s[0][1])]);
    expect(structuredResponseReady(q.structuredResponse!,q.answer)).toBe(true);
   }
  }
  expect(seen.depart).toBeGreaterThan(0);expect(seen.share).toBeGreaterThan(0);expect(seen.transfer).toBeGreaterThan(0);
 });

 it('has worked steps, a hint, distinct keys and no copied source wording',()=>{
  const keys=new Set<string>();
  for(let seed=1;seed<=20;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   keys.add(q.key);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
   expect(q.explanation.length).toBeGreaterThan(20);
   const text=[...(q.context??[]),q.prompt].join(' ');
   expect(text).not.toMatch(/Rosyth|Henry Park|sgexam|Amy|Nancy|Siti/);
   if(kind(q)!=='share'){
    const last=q.workedSteps![q.workedSteps!.length-1].equation!;
    expect(last.endsWith(`= ${q.answer}`)).toBe(true);
   }
  }
  expect(keys.size).toBe(60);
 });
});
