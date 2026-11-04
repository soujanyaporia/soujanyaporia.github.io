import {describe,it,expect} from 'vitest';
import {BATCH5_UPPER_PATTERNS,makeBatch5Upper,type Batch5UpperId} from './batch5Upper';
import type {Question} from '../generate';

/** Solve from the displayed question, never from the generator's hidden parameters. */
export function solveBatch5Upper(id:Batch5UpperId,q:Question):number {
 const text=[...(q.context||[]),q.prompt].join(' ');
 const numbers=(s:string)=>[...s.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
 const a=numbers(text);
 switch(id){
  case 'divide-hundreds':return a[0]/a[1];
  case 'reading-rate':return a[0]/a[1]*a[2];
  case 'cuboid-volume': {
   if(q.picture?.type!=='solid')throw Error('Missing cuboid');
   const {a,b,c}=q.picture; if(a===undefined||b===undefined||c===undefined)throw Error('Missing dimensions');return a*b*c;
  }
  case 'tank-to-fill':return a[0]*a[1]*a[2]-a[3]*1000;
  case 'book-mass':return Math.round((a[2]-a[0])/a[1]*100)/100;
  case 'packing-time':return a[1]*(a[2]/a[0]);
  case 'parking-charge': {
   // Prices, duration block, and visible start/end time.
   const [first,additional,block,startHour,startMinute,endHour,endMinute]=a;
   const duration=(endHour*60+endMinute)-(startHour*60+startMinute);
   return Math.round((first+additional*Math.ceil((duration-60)/block))*100)/100;
  }
  case 'pail-difference':return Math.round((2*a[1]-a[0])*1000)/1000;
  case 'pail-bottles':return Math.floor((a[0]-a[1])*1000/a[2]+1e-9);
  case 'tank-poured':return a[0]*a[1]*(a[2]*a[3]/a[4]-a[5]);
  case 'tank-shorter':return a[6]*a[1]*(a[2]*a[3]/a[4]-a[5]);
  case 'tank-fraction':return a[0]*a[1]*(a[2]*a[6]/a[7]-a[5]);
 }
}
describe('complete Rulang P5 WA3 adaptations',()=>{
 it('explains a nonzero remainder when filling bottles',()=>{
  const q=makeBatch5Upper('pail-bottles',0,0);
  const a=[...q.context!.join(' ').matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
  const remaining=Math.round((a[0]-a[1])*1000), rem=remaining%a[2];
  expect(rem).toBeGreaterThan(0);
  expect(q.explanation).toContain(`+ ${rem} ml`);
  expect(remaining).toBe(Number(q.answer)*a[2]+rem);
 });
 it('preserves related tank scenarios and fractional source-style volumes',()=>{
  for(let seed=0;seed<40;seed++){
   const main=makeBatch5Upper('tank-poured',seed),short=makeBatch5Upper('tank-shorter',seed),fraction=makeBatch5Upper('tank-fraction',seed);
   expect(short.context?.slice(0,2)).toEqual(main.context);
   expect(fraction.context?.slice(0,2)).toEqual(main.context);
   expect(Number(fraction.answer)%1).not.toBe(0);
   for(const q of [main,short,fraction]) expect(Number(q.answer)).toBeGreaterThan(0);
  }
 });
 it('independently solves 6,000 displayed examples and checks any choices',()=>{
  for(const {id} of BATCH5_UPPER_PATTERNS)for(let seed=0;seed<250;seed++)for(let index=0;index<2;index++){
   const q=makeBatch5Upper(id,seed,index),expected=solveBatch5Upper(id,q);
   expect(Number(q.answer),`${id} ${seed}/${index}`).toBeCloseTo(expected,5);
   expect(Number.isFinite(expected)).toBe(true);
   if(q.choices){expect(q.choices).toHaveLength(4);expect(q.choices).toContain(q.answer);expect(new Set(q.choices).size).toBe(4);}
  }
 });
});
