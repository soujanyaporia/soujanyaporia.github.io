import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch4Middle} from './batch4Middle';
import {BATCH4_MIDDLE_PARTS,type Batch4MiddlePart} from './batch4MiddleMeta';
import {correctAnswer,numberValue,type Question} from '../generate';
import {Picture} from '../Picture';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
/** Independent solver: visible prompt/context/graph only, never generator internals. */
export function solveBatch4Middle(q:Question,part:Batch4MiddlePart):number{
 const visible=[...(q.context??[]),q.prompt].join(' ');
 if(part==='age-sum-difference'){const [gap,sum]=nums(visible),solutions=[];for(let older=1;older<sum;older++)if(older+(older-gap)===sum&&older>gap)solutions.push(older);if(solutions.length!==1)throw Error('Age solution ambiguous');return solutions[0];}
 if(part==='three-offset-total'){const [total,up,down]=nums(visible),solutions=[];for(let ben=down+1;ben<total;ben++)if(ben+(ben+up)+(ben-down)===total)solutions.push(ben-down);if(solutions.length!==1)throw Error('Money solution ambiguous');return solutions[0];}
 if(part==='equal-remainders'){
  const [total,n,d,used]=nums(visible),solutions=[];for(let asha=1;asha<total;asha++){const ben=total-asha;if(Number.isInteger(asha*n/d)&&ben>used&&Math.abs(asha-asha*n/d-(ben-used))<1e-9)solutions.push(ben);}if(solutions.length!==1)throw Error('Sticker solution ambiguous');return solutions[0];
 }
 if(part==='chart-transfer'){
  const m=q.picture;if(m?.type!=='bars')throw Error('Graph missing');const b=m.values[m.labels.indexOf('Box B')],d=m.values[m.labels.indexOf('Box D')],solutions=[];for(let moved=0;moved<=b;moved++)if(b-moved===d+moved)solutions.push(moved);if(solutions.length!==1)throw Error('Transfer solution ambiguous');return solutions[0];
 }
 if(part==='fraction-left-two'){const fractions=[...visible.matchAll(/(\d+)\/(\d+)/g)].map(m=>Number(m[1])/Number(m[2]));if(fractions.length!==2)throw Error('Need two visible fractions');return 1-fractions.reduce((a,b)=>a+b,0);}
 const [total,per]=nums(q.context![0]);let packed=0,boxes=0;while(packed<total){packed+=per;boxes++;}if(packed!==total)throw Error('Incomplete box');return part==='boxes-a'?boxes:boxes*nums(q.context![1])[0];
}
describe('Batch 4 middle-primary original and reusable structures',()=>{
 it('accounts for seven responses in six groups with real objectives',()=>{
  expect(BATCH4_MIDDLE_PARTS).toHaveLength(7);expect(new Set(BATCH4_MIDDLE_PARTS.map(p=>p.group)).size).toBe(6);for(const p of BATCH4_MIDDLE_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves 6300 variants using visible givens',()=>{
  for(const p of BATCH4_MIDDLE_PARTS)for(let seed=0;seed<300;seed++)for(const index of [0,1,2]){
   const q=makeBatch4Middle(p.id,seed,index),answer=numberValue(q.answer),solved=solveBatch4Middle(q,p.id);expect(answer,`${p.id}:${seed}:${index}`).toBeCloseTo(solved,8);expect(correctAnswer(q,String(solved))).toBe(true);expect(correctAnswer(q,'999999')).toBe(false);expect(q).toEqual(makeBatch4Middle(p.id,seed,index));expect(q.workedSteps!.length).toBeGreaterThan(0);expect(q.choices).toBeUndefined();expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity/);
  }
 });
 it('keeps linked box parts coherent and complete without requiring an earlier answer',()=>{
  for(let seed=0;seed<100;seed++){const a=makeBatch4Middle('boxes-a',seed),b=makeBatch4Middle('boxes-b',seed);expect(a.context).toEqual(b.context!.slice(0,1));expect(b.context).toHaveLength(2);expect(Number(b.answer)).toBe(Number(a.answer)*nums(b.context![1])[0]);expect(a.picture).toBeUndefined();expect(b.picture).toBeUndefined();}
 });
 it('keeps required constraints and renders only the necessary chart',()=>{
  for(let seed=0;seed<100;seed++)for(const p of BATCH4_MIDDLE_PARTS){const q=makeBatch4Middle(p.id,seed);if(p.id!=='chart-transfer'){expect(q.picture).toBeUndefined();continue;}if(q.picture?.type!=='bars')throw Error('Missing graph');const chart=q.picture;expect(chart.labels).toHaveLength(4);expect(chart.values.every(n=>n>0&&n%chart.scale===0)).toBe(true);const html=renderToStaticMarkup(createElement(Picture,{model:q.picture}));expect(html).toContain('Bar graph');expect(html).not.toMatch(/NaN|undefined/);for(const label of q.picture.labels)expect(html).toContain(label);}
 });
 it('varies answers in every response family and preserves positive leftovers',()=>{
  for(const p of BATCH4_MIDDLE_PARTS){const answers=new Set(Array.from({length:150},(_,seed)=>makeBatch4Middle(p.id,seed).answer));expect(answers.size,p.id).toBeGreaterThanOrEqual(p.id==='boxes-a'?5:6);}
  for(let seed=0;seed<100;seed++){const fraction=numberValue(makeBatch4Middle('fraction-left-two',seed).answer)!;expect(fraction).toBeGreaterThan(0);expect(fraction).toBeLessThan(1);const older=Number(makeBatch4Middle('age-sum-difference',seed).answer);expect(older).toBeLessThanOrEqual(36);}
 });
 it('independently verifies source answers and both printed key defects',()=>{
  expect((54+6)/2).toBe(30);expect((54-6)/2).toBe(24);expect((54+6)/2).not.toBe(24);
  expect((4000-1000-300-300)/3).toBe(800);expect((465-30)/5).toBe(87);expect((465-30)/5).not.toBe(587);expect(87*2+30).toBe(204);
  expect((44-20)/2).toBe(12);expect(1-1/8-1/4).toBe(5/8);expect(42/6).toBe(7);expect(42/6*8).toBe(56);
 });
});
