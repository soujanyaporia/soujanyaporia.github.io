import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,numberValue,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {BATCH12_DECIMAL_PARTS,makeBatch12Decimal} from './batch12Decimal';
const numbers=(text:string)=>[...text.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
const tidy=(n:number)=>String(Number(n.toFixed(3)));
/** Solve from the question's visible facts, without its answer or worked steps. */
export function solveBatch12Decimal(part:string,q:Question):number|[number,number]{
 const a=numbers((q.context??[]).join(' '));
 switch(part){
  case 'ribbon-plan':return [a[0]*a[1]/100,a[0]*a[1]/100-a[2]];
  case 'berry-boxes':{const boxes=Math.ceil(a[1]*1000/a[0]);return [boxes,(boxes*a[0]-a[1]*1000)/1000];}
  case 'two-batches':return [a[0]*a[1]+a[2]*a[3],a[0]*a[1]-a[2]*a[3]];
  case 'tomato-price':return [a[2]*1000,a[2]*1000/a[1]*a[0]];
  case 'tank-overflow':{const capacity=a[0]*a[1]*a[2]/1000;return [capacity,a[3]+a[4]*a[5]-capacity];}
  case 'bottle-share':return [a[0]/a[1],a[0]*1000/a[1]];
  case 'daily-saving-gap':return a[2]+(a[3]-a[2])/(a[0]-a[1])*a[0];
  case 'parcel-difference':{const values=[a[0],a[1]+a[2]/1000,a[3],a[4]];return Math.max(...values)-Math.min(...values);}
  case 'file-length':return 3*a[0]/80;
  case 'conversion-mistake':return a[0]+a[1]/1000;
  case 'soup-packets':{const small=a[2]/1000,n=(a[3]*small-a[1])/(a[0]-small);return n*a[0]+a[1];}
  case 'bakery-orders':return a[2]*a[3]-a[0]-a[1];
  default:throw Error(`Unknown P5 decimal task ${part}`);
 }
}
describe('source-inspired P5 decimal situations',()=>{
 it('solves visible inputs for twenty seeds and checks every response and reproducibility',()=>{
  for(const p of BATCH12_DECIMAL_PARTS)for(let seed=0;seed<20;seed++){
   const q=makeBatch12Decimal(p.id,seed),solved=solveBatch12Decimal(p.id,q),where=`${p.id} seed ${seed}`;
   const expected=Array.isArray(solved)?JSON.stringify(solved.map(tidy)):tidy(solved);
   if(Array.isArray(solved))expect(JSON.parse(q.answer),where).toEqual(JSON.parse(expected));else expect(numberValue(q.answer),where).toBeCloseTo(solved,7);
   expect(paperAnswerStatus(q,expected),where).toBe('complete');expect(correctAnswer(q,expected),where).toBe(true);expect(makeBatch12Decimal(p.id,seed)).toEqual(q);expect(q.workedSteps!.length).toBeGreaterThan(1);
  }
 });
 it('infers elapsed days from both balances and spending rates',()=>{for(let seed=0;seed<20;seed++){const q=makeBatch12Decimal('daily-saving-gap',seed),givens=numbers(q.context!.join(' '));expect(givens).toHaveLength(4);const days=(givens[3]-givens[2])/(givens[0]-givens[1]);expect(days).toBeCloseTo(Math.round(days),8);expect(solveBatch12Decimal('daily-saving-gap',q)).toBeCloseTo(numberValue(q.answer)!,7);}});
 it('accepts equivalent decimal formatting for both ordered parts and rejects incomplete or swapped entries',()=>{const q=makeBatch12Decimal('ribbon-plan',7),[first,second]=JSON.parse(q.answer) as string[];const equivalent=(x:string)=>x.includes('.')?`${x}0`:`${x}.0`;expect(correctAnswer(q,JSON.stringify([equivalent(first),equivalent(second)]))).toBe(true);expect(paperAnswerStatus(q,JSON.stringify([first,'']))).toBe('partial');expect(correctAnswer(q,JSON.stringify([second,first]))).toBe(false);expect(correctAnswer(q,JSON.stringify([`${first}.`,second]))).toBe(false);});
 it('uses P5 decimal skills and at least five labelled linked scenarios',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));expect(BATCH12_DECIMAL_PARTS).toHaveLength(12);
  for(const p of BATCH12_DECIMAL_PARTS){expect(p.skillIds.some(id=>id.startsWith('P5.S.DEC.')),p.id).toBe(true);for(const id of p.skillIds)expect(ids.has(id),`${p.id} ${id}`).toBe(true);}
  const pairs=BATCH12_DECIMAL_PARTS.map(p=>makeBatch12Decimal(p.id,2)).filter(q=>q.structuredResponse?.kind==='number-pair');expect(pairs.length).toBeGreaterThanOrEqual(5);
  for(const q of pairs){const spec=q.structuredResponse;if(spec?.kind!=='number-pair')throw Error('Expected pair');expect(spec.firstLabel).toMatch(/^\(a\)/);expect(spec.secondLabel).toMatch(/^\(b\)/);}
 });
});
