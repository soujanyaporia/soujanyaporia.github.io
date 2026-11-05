import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,type Question} from '../generate';
import {BATCH7_UPPER_PARTS,makeBatch7Upper} from './batch7Upper';
const numbers=(s:string)=>[...s.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
/** Recalculate from the visible text, without reading answer, proof, or worked steps. */
export function solveBatch7Upper(id:string,q:Question):number{
 const a=numbers([...(q.context??[]),q.prompt].join(' '));
 switch(id){
  case 'remaining-percent':return (a[0]-a[1])*100/a[0];
  case 'mass-share':return (a[0]*1000-a[1])/a[2]/1000;
  case 'rate-minute':return a[0]*a[1]*60;
  case 'ratio-transfer':return (a[2]-a[2]*a[0]/a[1])/2;
  case 'sharing-cost':return a[2]*(a[0]-a[1])/a[1];
  case 'recipe-capacity':return a[1]*(a[0]-a[2])/a[0];
  case 'average-added':return (a[1]-a[0])/(a[2]-a[0])-1;
  case 'successive-percent':return a[0]*(100-a[1])*(100-a[2])/10000;
  case 'percent-growth':return (a[1]-a[0])*100/a[0];
  case 'average-missing':return 3*a[0]-a[1]-a[2];
  case 'two-stage-ratio':return a[4]*20/3;
  case 'meeting-speed':return (a[0]/(a[2]/60)+a[1])/2;
  default:throw Error(`Unknown task ${id}`);
 }
}
describe('batch7 upper original problem patterns',()=>{
 it('solves visible-givens examples and validates the actual grader',()=>{
  for(const p of BATCH7_UPPER_PARTS)for(let seed=0;seed<30;seed++){
   const q=makeBatch7Upper(p.id,seed),expected=solveBatch7Upper(p.id,q);
   expect(Number(q.answer),`${p.id} seed ${seed}`).toBeCloseTo(expected,7);
   expect(correctAnswer(q,q.answer)).toBe(true);expect(q.workedSteps?.length).toBeGreaterThan(0);
   expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);
  }
 });
 it('uses curriculum skills and only finite physically meaningful quantities',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const p of BATCH7_UPPER_PARTS){for(const skill of p.skillIds)expect(ids.has(skill),skill).toBe(true);
   for(let seed=0;seed<20;seed++){const q=makeBatch7Upper(p.id,seed);expect(Number(q.answer)).toBeGreaterThan(0);expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);}
  }
 });
});
