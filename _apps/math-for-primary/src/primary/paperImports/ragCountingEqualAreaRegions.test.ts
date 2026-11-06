import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragCountingEqualAreaRegions';

type Mark={kind:string;d?:string;fill?:string};
const SHADE='#8fcfae';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const nums=(d:string)=>(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
const polygonArea=(d:string)=>{const v=nums(d),n=v.length/2;let s=0;for(let i=0;i<n;i++){const j=(i+1)%n;s+=v[2*i]*v[2*j+1]-v[2*j]*v[2*i+1];}return Math.abs(s)/2;};
const sectorAngle=(d:string)=>{const v=nums(d),ax=v[2]-v[0],ay=v[3]-v[1],bx=v[9]-v[0],by=v[10]-v[1];return Math.abs(Math.atan2(ax*by-ay*bx,ax*bx+ay*by))*180/Math.PI;};
const kindOf=(context:string[])=>{const t=context.join(' ');return /equal sectors/.test(t)?'circle':/Each side/.test(t)?'triangle':'squares';};

// Independent solver: reads only the visible context text and the drawn marks.
function solveFromVisible(q:ReturnType<typeof makeRagQuestion>):number{
 const paths=((q.picture as unknown as {marks:Mark[]}).marks).filter(m=>m.kind==='path');
 const shaded=paths.filter(m=>m.fill===SHADE),text=(q.context??[]).join(' ');
 let fraction:number;
 const kind=kindOf(q.context??[]);
 if(kind==='circle'){
  const n=Number(/divided into (\d+) equal sectors/.exec(text)![1]),stated=Number(/angle of (\d+)°/.exec(text)![1]);
  expect(stated*n).toBe(360);
  expect(paths.length).toBe(n);
  for(const p of paths)expect(Math.abs(sectorAngle(p.d!)-stated)).toBeLessThan(0.5);
  fraction=shaded.reduce((s,p)=>s+sectorAngle(p.d!),0)/360;
 }else if(kind==='triangle'){
  const n=Number(/split into (\d+) equal parts/.exec(text)![1]);
  expect(paths.length).toBe(n*n);
  const first=polygonArea(paths[0].d!);
  for(const p of paths)expect(Math.abs(polygonArea(p.d!)/first-1)).toBeLessThan(0.02);
  fraction=shaded.length/(n*n);
 }else{
  const n=Number(/made up of (\d+) identical squares/.exec(text)![1]);
  const whites=paths.filter(m=>m.fill==='white');
  expect(whites.length).toBe(n);
  const total=whites.reduce((s,p)=>s+polygonArea(p.d!),0);
  fraction=shaded.reduce((s,p)=>s+polygonArea(p.d!),0)/total;
 }
 expect(fraction).toBeGreaterThan(0);
 expect(fraction).toBeLessThan(1);
 return /unshaded/.test(q.prompt)?1-fraction:fraction;
}

describe('ragCountingEqualAreaRegions',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-counting-equal-area-regions');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/sgexam|Tao Nan|Ai Tong|Catholic/i);
 });

 it('answers match an independent reading of the visible figure across seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),m=/^(\d+)\/(\d+)$/.exec(q.answer);
   expect(m,q.answer).not.toBeNull();
   const n=Number(m![1]),d=Number(m![2]);
   expect(n).toBeGreaterThan(0);
   expect(n).toBeLessThan(d);
   expect(gcd(n,d)).toBe(1);
   expect(q.requireSimplified).toBe(true);
   expect(Math.abs(n/d-solveFromVisible(q))).toBeLessThan(5e-4);
  }
 });

 it('covers all four variants and asks both shaded and unshaded questions',()=>{
  const kinds=new Set<string>(),words=new Set<string>(),squareStyles=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   kinds.add(kindOf(q.context??[]));
   words.add(/unshaded/.test(q.prompt)?'unshaded':'shaded');
   if(kindOf(q.context??[])==='squares')squareStyles.add(/rectangle/.test((q.context??[]).join(' '))?'whole-squares':'composite');
  }
  expect([...kinds].sort()).toEqual(['circle','squares','triangle']);
  expect([...squareStyles].sort()).toEqual(['composite','whole-squares']);
  expect([...words].sort()).toEqual(['shaded','unshaded']);
 });

 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const seen=new Set<string>();
  for(let seed=1;seed<=30;seed++)seen.add(JSON.stringify([makeRagQuestion(seed,0).context,makeRagQuestion(seed,0).picture]));
  expect(seen.size).toBeGreaterThan(20);
 });

 it('provides hints, worked steps and a simplest-form instruction',()=>{
  for(let seed=1;seed<=20;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
   expect(q.workedSteps!.at(-1)!.text).toContain(q.answer);
   expect(q.prompt).toContain('simplest form');
   expect((q.picture as unknown as {type:string}).type).toBe('batch11-upper');
  }
 });
});
