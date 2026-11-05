import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,numberValue,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {BATCH11_UPPER_PARTS,makeBatch11Upper} from './batch11Upper';
const nums=(t:string)=>[...t.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
export function solveBatch11Upper(part:string,q:Question):number|string{
 const text=[...(q.context??[]),q.prompt].join(' '),a=nums(text);
 switch(part){
  case 'iso-split':return 180-2*a[0]-a[1];
  case 'parallel-equilateral':return 120-a[0];
  case 'point-right':return 270-a[0]-a[1];
  case 'iso-crossing':return a[1]-(180-a[0])/2-a[2];
  case 'crossing-equal':{const pic=q.picture as unknown as {label:string},m=/labelled ([a-z]), ([a-z]), ([a-z]), ([a-z])/.exec(pic.label);if(!m)throw Error('Missing angle labels');return `∠${m[1]} and ∠${m[3]}`;}
  case 'turns-compass':{const dirs=['north','north-east','east','south-east','south','south-west','west','north-west'],m=/faces (north-east|north-west|south-east|south-west|north|east|south|west), turns (\d+)° clockwise, then turns (\d+)° anticlockwise/.exec(text);if(!m)throw Error('Missing directions');return dirs[(dirs.indexOf(m[1])+Number(m[2])/45-Number(m[3])/45+16)%8];}
  case 'smallest-marked-angle':{const pic=q.picture as unknown as {label:string};const values=[...pic.label.matchAll(/Angle ([a-e]) is (\d+) degrees/g)].map(m=>({n:m[1],v:Number(m[2])}));return `∠${values.sort((x,y)=>x.v-y.v)[0].n}`;}
  case 'two-obtuse-angles':{const pic=q.picture as unknown as {label:string};return JSON.stringify([...pic.label.matchAll(/Angle ([a-e]) is (\d+) degrees/g)].filter(m=>Number(m[2])>90).map(m=>`∠${m[1]}`));}
  case 'semicircles-area':return `${Number((3*((a[0]+2*a[1])/3)**2/8).toFixed(4))}π`;
  case 'quadrant-union-area':return Number((a[3]*a[0]*a[0]/2-a[1]).toFixed(2));
  case 'quadrant-union-perimeter':return Number((a[3]*a[0]+4*a[0]-a[2]).toFixed(2));
  case 'triangle-cuts-area':return (a[0]*a[1]-a[2])/6;
  case 'triangle-cuts-perimeter':{const base=a[1]/3,removed=(a[0]*a[1]-a[2])/6,depth=2*removed/base;return base+2*Math.sqrt((base/2)**2+depth**2);}
  case 'stacked-semicircles-area':return Number((a[0]**2/8+3*a[1]*a[0]**2/16).toFixed(2));
  case 'stacked-semicircles-perimeter':return Number((a[1]*a[0]+a[0]/2).toFixed(2));
  case 'four-circles':return Number((a[0]**2-4*a[1]*(a[0]/4)**2).toFixed(2));
  default:throw Error(`Unknown task ${part}`);
 }
}
describe('batch11 upper',()=>{
 it('independently solves visible givens, marks answers and regenerates each seed',()=>{
  for(const p of BATCH11_UPPER_PARTS)for(let seed=0;seed<20;seed++){
   const q=makeBatch11Upper(p.id,seed),expected=solveBatch11Upper(p.id,q);
   if(typeof expected==='number')expect(numberValue(q.answer),`${p.id} seed ${seed}`).toBeCloseTo(expected,7);else expect(q.answer,`${p.id} seed ${seed}`).toBe(expected);
   expect(paperAnswerStatus(q,q.answer),p.id).toBe('complete');expect(correctAnswer(q,q.answer),p.id).toBe(true);expect(makeBatch11Upper(p.id,seed)).toEqual(q);expect(q.picture).toBeTruthy();
  }
 });
 it('draws each overlapping region as a true quarter circle',()=>{for(let seed=0;seed<20;seed++){const q=makeBatch11Upper('quadrant-union-area',seed),pic=q.picture as unknown as {marks:{kind:string;d?:string}[]},arcs=pic.marks.filter(m=>m.kind==='path').slice(0,2);for(const arc of arcs){const m=/M 160 170 L ([\d.e+-]+) ([\d.e+-]+) A 120 120 0 0 1 ([\d.e+-]+) ([\d.e+-]+) Z/.exec(arc.d!);expect(m).toBeTruthy();const [x1,y1,x2,y2]=m!.slice(1).map(Number);expect((x1-160)*(x2-160)+(y1-170)*(y2-170)).toBeCloseTo(0,7);}}});
 it('varies crossed-line diagrams while retaining one opposite pair',()=>{const diagrams=new Set<string>();for(let seed=0;seed<40;seed++){const q=makeBatch11Upper('crossing-equal',seed);diagrams.add(JSON.stringify(q.picture));const expected=solveBatch11Upper('crossing-equal',q);expect(q.choices!.filter(x=>x===expected)).toHaveLength(1);expect(q.choices).toContain(expected);}expect(diagrams.size).toBeGreaterThan(25);});
 it('finds the perimeter of a 3-4-5 triangular notch',()=>{const q=makeBatch11Upper('triangle-cuts-perimeter',1);q.context=['A 20 cm by 18 cm rectangle has six identical isosceles triangles cut from its two vertical sides, three on each side. Their bases cover each side exactly.','The remaining area is 288 cm². The new perimeter is 24 cm longer than the original perimeter.'];expect(solveBatch11Upper('triangle-cuts-perimeter',q)).toBe(16);});
 it('uses valid curriculum skills',()=>{const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));for(const p of BATCH11_UPPER_PARTS)for(const id of p.skillIds)expect(ids.has(id),`${p.id} ${id}`).toBe(true);});
});
