import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragLinkedTriangleRegionRatios';

type Pt=[number,number];
function givens(q:ReturnType<typeof makeRagQuestion>){
 const text=(q.context??[]).join(' ');
 const ratio=/ratio (\d+) : (\d+) : (\d+)/.exec(text),d=/area of D is (\d+) cm²/.exec(text);
 expect(ratio).not.toBeNull();expect(d).not.toBeNull();
 return {a:Number(ratio![1]),b:Number(ratio![2]),c:Number(ratio![3]),dArea:Number(d![1])};
}
/** Independent solver: uses only visible givens and the equal-halves fact. */
function solve(q:ReturnType<typeof makeRagQuestion>):number{
 const {a,b,c,dArea}=givens(q);
 const k=dArea/(a+b-c);
 const m=/area of triangle ([ABC])\?/.exec(q.prompt);
 if(m)return k*({A:a,B:b,C:c} as Record<string,number>)[m[1]];
 expect(q.prompt).toContain('whole square');
 return k*a+k*b+k*c+dArea;
}
const tri=(p:Pt,q:Pt,r:Pt)=>Math.abs((q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]))/2;

describe('linked triangle regions in a square',()=>{
 it('exposes consistent metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-linked-triangle-region-area-ratios');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/Raffles|Henry|sgexam/i);
 });
 it('answers match an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=80;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),want=solve(q);
   expect(Number.isInteger(want)).toBe(true);
   expect(Number(q.answer)).toBe(want);
   expect(q.unit).toBe('cm²');
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
   expect(q.hint.length).toBeGreaterThan(0);
  }
 });
 it('gives lowest-terms ratios with a valid figure order',()=>{
  const gcd=(x:number,y:number):number=>y?gcd(y,x%y):x;
  for(let seed=1;seed<=60;seed++){
   const {a,b,c}=givens(makeRagQuestion(seed));
   expect(gcd(gcd(a,b),c)).toBe(1);
   expect(c).toBeLessThan(b);
   expect(a+b-c).toBeGreaterThan(0);
  }
 });
 it('draws a figure whose triangle areas match the stated ratio',()=>{
  const P:Pt=[60,15],Q:Pt=[220,15],R:Pt=[220,175],S:Pt=[60,175];
  const same=(p:Pt,q:Pt)=>Math.abs(p[0]-q[0])<0.01&&Math.abs(p[1]-q[1])<0.01;
  for(let seed=1;seed<=40;seed++){
   const q=makeRagQuestion(seed),{a,b,c}=givens(q),d=a+b-c;
   const pic=q.picture as unknown as {type:string;marks:{kind:string;x1?:number;y1?:number;x2?:number;y2?:number}[]};
   expect(pic.type).toBe('batch11-upper');
   const lines=pic.marks.filter(m=>m.kind==='line').map(m=>[[m.x1!,m.y1!],[m.x2!,m.y2!]] as [Pt,Pt]);
   const other=(corner:Pt)=>{
    const hit=lines.filter(([p,r])=>(same(p,corner)||same(r,corner))&&![P,Q,R,S].some(v=>!same(v,corner)&&(same(p,v)||same(r,v))));
    expect(hit.length).toBe(1);
    return same(hit[0][0],corner)?hit[0][1]:hit[0][0];
   };
   const E=other(Q),F=other(S);
   expect(Math.hypot(E[0]-P[0],E[1]-P[1])).toBeLessThan(Math.hypot(F[0]-P[0],F[1]-P[1]));
   const A=tri(P,Q,E),B=tri(Q,E,R),C=tri(S,F,R),D=tri(P,S,F);
   const near=(x:number,y:number)=>expect(Math.abs(x-y)/y).toBeLessThan(0.02);
   near(A/D,a/d);near(B/D,b/d);near(C/D,c/d);
   near(A+B+C+D,25600);
  }
 });
 it('varies the requested quantity, numbers and is deterministic',()=>{
  const asks=new Set<string>(),answers=new Set<string>();
  for(let seed=1;seed<=60;seed++){const q=makeRagQuestion(seed);asks.add(q.prompt);answers.add(q.answer);}
  expect(asks.size).toBeGreaterThanOrEqual(4);
  expect(answers.size).toBeGreaterThan(20);
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  expect(makeRagQuestion(7,2).key).not.toBe(makeRagQuestion(7,3).key);
 });
});
