import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,numberValue,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {BATCH10_UPPER_PARTS,makeBatch10Upper} from './batch10Upper';
const nums=(text:string)=>[...text.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
/** Independent arithmetic using visible givens only. */
export function solveBatch10Upper(part:string,q:Question):number|string{
 const a=nums([...(q.context??[]),q.prompt].join(' '));
 switch(part){
  case 'jug-cups':return (a[0]-a[1])/3;
  case 'garden-lights':return a[0]/2-(a[1]-1)+1;
  case 'target-bonus':return a[3]/(a[2]*a[0]+a[1])*a[2];
  case 'work-rates':return a[0]*a[1]*a[3]+a[2]*a[4];
  case 'tiered-mass':return a[1]+(a[3]-a[1]*a[0])/a[2];
  case 'tank-space':return a[0]*a[1]*(a[2]-a[3]);
  case 'saving-rates':return (a[0]*a[1]-a[2])/2;
  case 'rental-blocks':return 60+30*(a[2]-a[0])/a[1];
  case 'chase-rounds':return Math.floor(a[0]*a[2]/(a[0]-a[1])/a[3]);
  case 'fraction-two-colours':return (a[4]/a[5]-(a[0]/a[1])*(a[2]/a[3]))/(1-a[0]/a[1]);
  case 'drops-per-minute':return 60*a[2]*a[1]/a[0];
  case 'daily-use-fraction':return a[4]*a[0]*a[2]/(a[0]*a[2]-a[3]);
  case 'closest-average':{const sum=a[0]*3-a[1],low=Math.floor((sum-1)/2);return JSON.stringify([String(low),String(sum-low)]);}
  case 'percentage-difference-total':return a[2]*100/(a[0]-a[1]);
  case 'mixed-unit-cuboid':return a[2]/(a[0]*100*a[1]);
  case 'painted-cube-cuts':return Math.sqrt(a[1]/(2*(a[0]-1)))**3;
  default:throw Error(`Unknown task ${part}`);
 }
}
describe('batch10 upper',()=>{
 it('independently solves twenty generated examples per question, including grading and reproducibility',()=>{
  expect(BATCH10_UPPER_PARTS.filter(p=>p.level===5)).toHaveLength(8);expect(BATCH10_UPPER_PARTS.filter(p=>p.level===6)).toHaveLength(8);
  for(const p of BATCH10_UPPER_PARTS)for(let seed=0;seed<20;seed++){
   const q=makeBatch10Upper(p.id,seed),expected=solveBatch10Upper(p.id,q);
   if(typeof expected==='number')expect(numberValue(q.answer),`${p.id} ${seed}`).toBeCloseTo(expected,7);else expect(q.answer,`${p.id} ${seed}`).toBe(expected);
   expect(paperAnswerStatus(q,q.answer),p.id).toBe('complete');expect(correctAnswer(q,q.answer),p.id).toBe(true);
   expect(makeBatch10Upper(p.id,seed)).toEqual(q);expect(q.workedSteps?.length).toBeGreaterThan(0);
  }
 });
 it('varies the visible fraction givens without invalid shares',()=>{const variants=new Set<string>();for(let seed=0;seed<40;seed++){const q=makeBatch10Upper('fraction-two-colours',seed),value=solveBatch10Upper('fraction-two-colours',q) as number;variants.add(q.context!.join(' '));expect(value).toBeGreaterThan(0);expect(value).toBeLessThan(1);}expect(variants.size).toBeGreaterThanOrEqual(15);});
 it('keeps the distance comparison unambiguous and asks about at least one complete lap',()=>{for(let seed=0;seed<40;seed++){const q=makeBatch10Upper('chase-rounds',seed);expect(q.context!.join(' ')).toContain('has covered');expect(Number(q.answer)).toBeGreaterThanOrEqual(1);}});
 it('uses known curriculum IDs',()=>{const ids=new Set(CURRICULUM_SKILLS.map(x=>x.id));for(const p of BATCH10_UPPER_PARTS)for(const id of p.skillIds)expect(ids.has(id),`${p.id} ${id}`).toBe(true);});
});
