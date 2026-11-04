import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch3Upper} from './batch3Upper';
import {BATCH3_UPPER_PATTERNS,type Batch3UpperId} from './batch3UpperMeta';
import {correctAnswer,type Question} from '../generate';
import {Picture} from '../Picture';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.replaceAll(',','').match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
/** Independent from existing generator answers/proofs/steps: uses displayed givens. */
export function solveBatch3Upper(q:Question,id:Batch3UpperId):number{
 if(id==='seven-digit-place-digit'){
  const s=q.prompt.match(/in ([\d,]+)\?/)![1].replaceAll(',','');return Number(s.at(-5));
 }
 if(id==='centimetres-to-metres')return nums(q.prompt)[0]/100;
 if(id==='three-digit-backward-pattern'){
  if(q.picture?.type!=='pattern')throw Error('Missing pattern');const values=q.picture.items,index=values.indexOf('?'),first=Number(values[0]),jump=Number(values[1])-first;return first+jump*index;
 }
 if(id==='square-base-volume'){const [side,height]=nums(q.prompt);let units=0;for(let z=0;z<height;z++)for(let y=0;y<side;y++)for(let x=0;x<side;x++)units++;return units;}
 const [total,pct]=nums(q.prompt);return total-total*pct/100;
}
describe('Batch 3 upper-primary reuse configurations',()=>{
 it('provides five source-backed configurations with valid skills and reused implementations',()=>{
  expect(BATCH3_UPPER_PATTERNS).toHaveLength(5);for(const p of BATCH3_UPPER_PATTERNS){expect(p.reuse).toBeTruthy();for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);}
 });
 it('independently solves 5000 variants from visible givens',()=>{
  for(const p of BATCH3_UPPER_PATTERNS)for(let seed=0;seed<500;seed++)for(const index of [0,1]){
   const q=makeBatch3Upper(p.id,seed,index),solved=solveBatch3Upper(q,p.id);expect(Number(q.answer),`${p.id}:${seed}:${index}`).toBeCloseTo(solved,8);expect(correctAnswer(q,String(solved))).toBe(true);expect(correctAnswer(q,'999999')).toBe(false);
   expect(q).toEqual(makeBatch3Upper(p.id,seed,index));expect(q.workedSteps?.length).toBeGreaterThan(0);expect(q.key).toBe(`batch3-upper:${p.id}:${seed}:${index}`);expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity/);
   if(q.choices){expect(q.choices).toHaveLength(4);expect(new Set(q.choices).size).toBe(4);expect(q.choices.filter(c=>correctAnswer(q,c))).toEqual([q.answer]);}
  }
 });
 it('keeps seven-digit scale, zero digits, three-digit patterns and square bases',()=>{
  let zeros=0;for(let seed=0;seed<300;seed++){
   const q=makeBatch3Upper('seven-digit-place-digit',seed);expect(q.prompt.match(/in ([\d,]+)\?/)![1].replaceAll(',','')).toHaveLength(7);if(q.answer==='0')zeros++;
   const pat=makeBatch3Upper('three-digit-backward-pattern',seed).picture;if(pat?.type!=='pattern')throw Error('Missing pattern');for(const v of pat.items.filter(v=>v!=='?'))expect(Number(v)).toBeGreaterThanOrEqual(100);
   expect(Number.isInteger(Number(makeBatch3Upper('centimetres-to-metres',seed).answer))).toBe(false);
   const volume=makeBatch3Upper('square-base-volume',seed).picture;if(volume?.type!=='solid')throw Error('Missing solid');expect(volume.a).toBe(volume.b);expect(volume.c).not.toBe(volume.a);
  }expect(zeros).toBeGreaterThan(10);
 });
 it('reuses existing picture rendering without a new diagram model',()=>{
  for(const p of BATCH3_UPPER_PATTERNS)for(const seed of [0,17,104,799]){
   const q=makeBatch3Upper(p.id,seed);expect(Boolean(q.picture)).toBe(p.id==='square-base-volume'||p.id==='three-digit-backward-pattern');if(q.picture){const html=renderToStaticMarkup(createElement(Picture,{model:q.picture}));expect(html.length).toBeGreaterThan(40);expect(html).not.toMatch(/NaN|undefined/);expect(q.picture.type).not.toMatch(/batch3/);}
   if(p.id==='percentage-unsold'){expect(JSON.stringify(q)).not.toMatch(/girl|boy|leave|final percentage/i);expect(q.context).toBeUndefined();}
  }
 });
 it('varies answers while retaining the source response form',()=>{
  for(const p of BATCH3_UPPER_PATTERNS){const seen=new Set(Array.from({length:150},(_,seed)=>makeBatch3Upper(p.id,seed).answer));expect(seen.size,p.id).toBeGreaterThanOrEqual(p.id==='seven-digit-place-digit'?10:6);}
  for(const p of BATCH3_UPPER_PATTERNS){const q=makeBatch3Upper(p.id,17);expect(Boolean(q.choices)).toBe(p.id!=='three-digit-backward-pattern');}
 });
 it('independently verifies all five source answers',()=>{
  expect('9402517'.at(-5)).toBe('0');expect(1050/100).toBe(10.5);expect(875-3*30).toBe(785);expect(4*4*10).toBe(160);expect(150-150*52/100).toBe(72);
 });
});
