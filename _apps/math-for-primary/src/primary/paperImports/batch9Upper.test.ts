import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,numberValue,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {BATCH9_UPPER_PARTS,makeBatch9Upper} from './batch9Upper';
const nums=(text:string)=>[...text.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
/** Reconstruct each answer from the visible question, not the generator answer or proof. */
export function solveBatch9Upper(part:string,q:Question):number|string{
 const a=nums([...(q.context??[]),q.prompt].join(' '));
 switch(part){
  case 'weighted-chart':{const p=q.picture;if(p?.type!=='bars')throw Error('Missing graph');return p.values.reduce((sum,n,i)=>sum+Number(p.labels[i])*n,0);}
  case 'annual-interest':return a[0]*(1+a[1]/100);
  case 'extra-items-cost':return (a[3]-a[0]*a[1])/(a[1]+a[2]);
  case 'fixed-then-fraction':return a[0]/(1-(a[3]/a[4])/(1-a[1]/a[2]));
  case 'fraction-rest-of-rest':return (1-a[0]/a[1])*(1-a[2]/a[3]);
  case 'shared-pizzas':return a[0]/a[1];
  case 'related-prices':return a[2]*(a[0]+a[1])/(a[3]*a[1]+a[4]*a[0]);
  case 'quiz-penalty':return a[0]-(a[0]*a[1]-a[3])/(a[1]+a[2]);
  case 'average-correction':return (a[1]-a[2])/(a[3]-a[0]);
  case 'future-age-ratio':return a[0]/(a[3]-1)-a[0]/(a[1]-1);
  case 'ratio-after-addition':return a[2]/(a[3]/a[4]-a[0]/a[1]);
  case 'percent-remainder-reverse':return a[0]/(1-a[2]/(100-a[1]));
  case 'linked-team-ratios':{const n=a[0]*a[3]*a[4],d=a[1]*a[5]*a[2],g=gcd(n,d);return `${n/g}:${d/g}`;}
  case 'discount-plus-fixed':return (1-(a[0]-a[2])/(a[0]/(1-a[1]/100)))*100;
  case 'tank-rate-fraction':return a[0]*a[1]*a[2]*a[4]/a[5]/1000/a[3];
  case 'weighted-group-average':return a[2]+a[0]*a[3]/(a[0]+a[1]);
  default:throw Error(`Unknown task ${part}`);
 }
}
describe('batch9 upper original questions',()=>{
 it('independently solves 20 seeds per visible question, checks readiness and determinism',()=>{
  for(const p of BATCH9_UPPER_PARTS)for(let seed=0;seed<20;seed++){
   const q=makeBatch9Upper(p.id,seed),expected=solveBatch9Upper(p.id,q),where=`${p.id} seed ${seed}`;
   if(typeof expected==='number')expect(numberValue(q.answer),where).toBeCloseTo(expected,7);else expect(q.answer,where).toBe(expected);
   expect(correctAnswer(q,q.answer),where).toBe(true);expect(paperAnswerStatus(q,q.answer),where).toBe('complete');
   expect(makeBatch9Upper(p.id,seed)).toEqual(q);expect(q.workedSteps?.length).toBeGreaterThan(0);
   if(q.choices){expect(q.choices).toHaveLength(4);expect(new Set(q.choices).size).toBe(4);expect(q.choices).toContain(q.answer);}
  }
 });
 it('keeps generated ages plausible while preserving both ratios',()=>{
  for(let seed=0;seed<60;seed++){const q=makeBatch9Upper('future-age-ratio',seed),a=nums(q.context!.join(' ')),younger=a[0]/(a[1]-1);expect(younger*a[1]).toBeLessThanOrEqual(84);expect(younger).toBeGreaterThanOrEqual(3);}
 });
 it('retains fractional averages and a real frequency-graph question',()=>{
  expect(Array.from({length:20},(_,seed)=>Number(makeBatch9Upper('weighted-group-average',seed).answer)).some(n=>!Number.isInteger(n))).toBe(true);
  const q=makeBatch9Upper('weighted-chart',4);expect(q.picture?.type).toBe('bars');if(q.picture?.type==='bars')expect(q.picture.values).toHaveLength(5);
 });
 it('has eight age-appropriate configurations at each level with valid skills',()=>{
  expect(BATCH9_UPPER_PARTS.filter(p=>p.level===5)).toHaveLength(8);expect(BATCH9_UPPER_PARTS.filter(p=>p.level===6)).toHaveLength(8);
  const skills=new Set(CURRICULUM_SKILLS.map(s=>s.id));for(const p of BATCH9_UPPER_PARTS)for(const s of p.skillIds)expect(skills.has(s),s).toBe(true);
 });
});
