import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragShadedFractionsSegmentRatios';
import {correctAnswer} from '../generate';
import type {Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

const visible=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const value=(s:string)=>{const m=/^(\d+)\/(\d+)$/.exec(s.trim());return m?Number(m[1])/Number(m[2]):Number(s);};

/** Solves from the visible context only, never from the stored answer. */
function solve(q:Question):{variant:number;value:number}{
 const t=visible(q);
 let m=/AE is (\d+) times as long as ED, and AE is equal to AB/.exec(t);
 if(m){const k=Number(m[1]);const ed=1,ae=k*ed,ab=ae,ad=ae+ed;return {variant:0,value:(0.5*ab*ae)/(ab*ad)};}
 m=/area (\d+) cm².*DE : EC = (\d+) : (\d+) and BF : FC = (\d+) : (\d+)/.exec(t);
 if(m){
  const [area,a,b,c,d]=m.slice(1).map(Number),p=a/(a+b),qf=c/(c+d);
  // unit rectangle: A top-left (0,1), E on bottom edge (p,0), F on right edge (1,1-qf)
  const [x1,y1,x2,y2,x3,y3]=[0,1,p,0,1,1-qf];
  const unit=Math.abs(x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2))/2;
  return {variant:1,value:unit*area};
 }
 m=/Tall triangles: (\d+)\. Small triangles: (\d+)\./.exec(t);
 if(m){const tall=Number(m[1]),small=Number(m[2]);return {variant:2,value:(tall*1+small*0.5)/4};}
 throw new Error('unrecognised question');
}

describe('ragShadedFractionsSegmentRatios',()=>{
 it('has valid metadata',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-shaded-area-fractions-from-segment-ratios');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('answers match an independent solution from the visible givens',()=>{
  const seen=new Set<number>();
  for(let seed=0;seed<60;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),s=solve(q);
   seen.add(s.variant);
   expect(Math.abs(value(q.answer)-s.value)).toBeLessThan(1e-9);
   expect(correctAnswer(q,q.answer)).toBe(true);
   if(s.variant===1){expect(Number.isInteger(Number(q.answer))).toBe(true);expect(q.unit).toBe('cm²');}
   else{expect(value(q.answer)).toBeGreaterThan(0);expect(value(q.answer)).toBeLessThan(1);}
  }
  expect([...seen].sort()).toEqual([0,1,2]);
 });

 it('requires simplified fractions',()=>{
  for(let seed=0;seed<30;seed++){
   const q=makeRagQuestion(seed,0);
   if(!q.requireSimplified)continue;
   const [n,d]=q.answer.split('/').map(Number);
   expect(correctAnswer(q,`${n*2}/${d*2}`)).toBe(false);
  }
 });

 it('is deterministic and has a figure and worked steps',()=>{
  for(let seed=0;seed<12;seed++){
   const a=makeRagQuestion(seed,1),b=makeRagQuestion(seed,1);
   expect(a).toEqual(b);
   expect((a.picture as {type:string}).type).toBe('batch11-upper');
   expect(a.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(a.hint.length).toBeGreaterThan(5);
  }
  expect(new Set(Array.from({length:30},(_,i)=>makeRagQuestion(5,i).key)).size).toBe(30);
 });
});
