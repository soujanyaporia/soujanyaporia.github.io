import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragEquilateralIsoscelesChain';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';

type Pt=[number,number];
interface Mark{kind:string;x1?:number;y1?:number;x2?:number;y2?:number;text?:string}
const visibleText=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const given=(t:string,re:RegExp)=>{const m=re.exec(t);if(!m)throw new Error(`Missing given: ${re}`);return Number(m[1]);};

/** Solves from the visible wording only. */
function solve(q:Question):number{
 const t=visibleText(q);
 if(/Find angle EFH/.test(t))return 60-(180-given(t,/Angle GHF = (\d+)°/))/2;
 if(/Find angle GHF/.test(t))return 180-2*(60-given(t,/Angle EFH = (\d+)°/));
 if(/Find angle ABD/.test(t))return (180-given(t,/Angle BAC = (\d+)°/))/2-60;
 if(/Find angle BAC/.test(t))return 180-2*(60+given(t,/Angle ABD = (\d+)°/));
 throw new Error('Unknown prompt');
}

const marks=(q:Question)=>(q.picture as unknown as {marks:Mark[]}).marks;
function points(q:Question):Pt[]{
 const seen=new Map<string,Pt>();
 for(const m of marks(q).filter(k=>k.kind==='line'))for(const p of [[m.x1!,m.y1!],[m.x2!,m.y2!]] as Pt[])seen.set(p.join(','),p);
 return [...seen.values()];
}
const angle=(v:Pt,a:Pt,b:Pt)=>{
 const t=(p:Pt)=>Math.atan2(-(p[1]-v[1]),p[0]-v[0]);
 const d=Math.abs(t(a)-t(b))*180/Math.PI;
 return d>180?360-d:d;
};
const dist=(a:Pt,b:Pt)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

/** Roles of the four figure points, read from their coordinates. */
function roles(q:Question){
 const t=visibleText(q),pts=points(q),byX=[...pts].sort((a,b)=>a[0]-b[0]);
 const left=byX[0],right=byX[byX.length-1];
 const rest=pts.filter(p=>p!==left&&p!==right).sort((a,b)=>a[1]-b[1]);
 return /EFH|GHF/.test(t)?{kind:'equilateral' as const,G:left,F:right,E:rest[0],H:rest[1]}:{kind:'apex' as const,B:left,C:right,A:rest[0],D:rest[1]};
}
function figureAngle(q:Question):number{
 const t=visibleText(q),p=roles(q);
 if(p.kind==='equilateral')return /Find angle EFH/.test(t)?angle(p.F,p.E,p.H):angle(p.H,p.G,p.F);
 return /Find angle ABD/.test(t)?angle(p.B,p.A,p.D):angle(p.A,p.B,p.C);
}

describe('equilateral and isosceles triangle chain',()=>{
 it('has valid metadata and existing skill ids',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toMatch(/^p5-[a-z0-9-]+$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),expected=solve(q);
   expect(Number.isInteger(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(expected).toBeLessThan(180);
   expect(Number(q.answer)).toBe(expected);
   expect(q.unit).toBe('degrees');
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).toContain(`${expected}°`);
  }
 });

 it('draws a figure whose measured angle agrees with the answer',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(Math.abs(figureAngle(q)-Number(q.answer))).toBeLessThan(0.6);
  }
 });

 it('draws the equilateral and isosceles equalities that the wording states',()=>{
  for(let seed=1;seed<=30;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),p=roles(q);
   if(p.kind==='equilateral'){
    expect(Math.abs(dist(p.E,p.F)-dist(p.F,p.G))).toBeLessThan(0.5);
    expect(Math.abs(dist(p.E,p.G)-dist(p.F,p.G))).toBeLessThan(0.5);
    expect(Math.abs(dist(p.G,p.H)-dist(p.F,p.H))).toBeLessThan(0.5);
    expect(p.H[1]).toBeGreaterThan(p.E[1]);
    expect(p.H[1]).toBeLessThan(p.G[1]);
   }else{
    expect(Math.abs(dist(p.A,p.B)-dist(p.A,p.C))).toBeLessThan(0.5);
    expect(Math.abs(dist(p.B,p.C)-dist(p.B,p.D))).toBeLessThan(0.5);
    expect(Math.abs(dist(p.B,p.C)-dist(p.C,p.D))).toBeLessThan(0.5);
    expect(p.D[1]).toBeGreaterThan(p.A[1]);
   }
  }
 });

 it('shows each given angle value in the figure labels',()=>{
  for(let seed=1;seed<=20;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),labels=marks(q).filter(m=>m.kind==='text').map(m=>m.text);
   const t=visibleText(q),value=/Angle (?:GHF|EFH|BAC|ABD) = (\d+)°/.exec(t)![1];
   expect(labels).toContain(`${value}°`);
   expect(labels).toContain('?');
  }
 });

 it('uses all four variants and varies numbers',()=>{
  const prompts=new Set(Array.from({length:4},(_,i)=>makeRagQuestion(7,i).prompt));
  expect(prompts).toEqual(new Set(['Find angle EFH.','Find angle GHF.','Find angle ABD.','Find angle BAC.']));
  const answers=new Set(Array.from({length:40},(_,s)=>makeRagQuestion(s+1,0).answer));
  expect(answers.size).toBeGreaterThan(5);
 });

 it('is deterministic with distinct keys',()=>{
  expect(makeRagQuestion(11,2)).toEqual(makeRagQuestion(11,2));
  expect(makeRagQuestion(11,2).key).not.toBe(makeRagQuestion(11,3).key);
 });
});
