import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeP5MahaBodhi2025,type MahaBodhiQuestion} from './p5MahaBodhi2025';
import {P5_MAHA_BODHI_2025_PARTS} from './p5MahaBodhi2025Meta';
import {P5MahaBodhiDiagram} from './P5MahaBodhiDiagram';
import {solidCubes} from './p5MahaBodhiPicture';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const cards=(q:MahaBodhiQuestion)=>{if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Missing visible cards');return q.picture.cards;};
const diagram=(q:MahaBodhiQuestion)=>{if(q.picture.type!=='maha-bodhi-p5')throw Error('Missing visible diagram');return q.picture;};
const gradeable=(q:MahaBodhiQuestion):Question=>({...q,picture:undefined,workedSteps:undefined});
/** Independent reconstruction from visible prompt, context and diagram givens only. */
export function solveP5Imported(q:MahaBodhiQuestion,part:string):number{
 if(part==='1')return nums(cards(q)[1].value)[0]/60;
 if(part==='2a')return cards(q).reduce((a,c)=>a+Number(c.value),0);
 if(part==='2b'){const [whole,dec]=cards(q)[0].value.split('.');return Number(whole)+(Number(dec[0])+(Number(dec[1])>=5?1:0))/10;}
 if(part==='3'){const m=diagram(q);if(m.layout!=='parcel')throw Error('Missing tariff');const mass=nums(q.prompt)[0];let covered=m.firstMass,cost=m.baseCents;while(covered<mass){covered+=m.blockMass;cost+=m.blockCents;}return cost/100;}
 if(part==='4'){const m=diagram(q);if(m.layout!=='two-squares')throw Error('Missing squares');return .5*m.side*(m.side+m.side/m.ratio);}
 if(part==='5'){
  const m=diagram(q);if(m.layout!=='composite')throw Error('Missing composite');
  // Shoelace the displayed shaded polygon P,Q,R,T, independently of decomposition.
  const p=[[0,m.height],[m.width,m.height],[m.width+m.extension,m.tipHeight],[0,0]];
  return Math.abs(p.reduce((s,[x,y],i)=>{const [u,v]=p[(i+1)%p.length];return s+x*v-y*u;},0))/2;
 }
 if(part==='6a'||part==='6b'){const m=diagram(q);if(m.layout!=='containers')throw Error('Missing containers');return m.side**2*m.height*m.multiple-(part==='6b'?m.water:0);}
 if(part==='7'){
  const cs=cards(q),total=Math.round(nums(cs[0].value)[0]*100),mid=nums(cs[1].value)[0],large=nums(cs[2].value)[0],solutions=[];
  for(let n=1;n<=total/10;n++)if(10*n+20*mid*n+50*large*mid*n===total)solutions.push(50*large*mid*n/100);
  if(solutions.length!==1)throw Error('Coin counts are ambiguous');return solutions[0];
 }
 if(part==='8a'||part==='8b'){
  const m=diagram(q);if(m.layout!=='cube-growth')throw Error('Missing cube solids');const target=nums(q.prompt)[0],cubes=solidCubes(m.heights,target);if(part==='8a')return cubes.length;
  const dimensions=[Math.max(...cubes.map(p=>p[0]))+1,Math.max(...cubes.map(p=>p[1]))+1,Math.max(...cubes.map(p=>p[2]))+1],edge=Math.max(...dimensions);return edge**3-cubes.length;
 }
 if(part==='9'){
  const cs=cards(q),[a,b]=nums(cs[0].value),[c,d]=nums(cs[1].value),gap=nums(cs[2].value)[0],pear=nums(cs[3].value)[0];return (gap-(b-d)*pear)/(a-c);
 }
 const m=diagram(q);if(m.layout!=='overlap')throw Error('Missing overlap');
 // Clip the triangle against the square and subtract its shared area from both.
 const side=Math.sqrt(m.area),x=side/2,fx=side*(1+m.extensionRatio),hy=side*(1-(side-x)/(fx-x)),overlap=(side-x)*(side-hy)/2;
 const squareOutside=m.area-overlap,triangleOutside=(side-x)*side/2-overlap;return squareOutside-triangleOutside;
}

describe('complete original P5 Maha Bodhi WA2 adaptation',()=>{
 it('covers every numbered question and all 13 response units with real objectives',()=>{
  expect(P5_MAHA_BODHI_2025_PARTS.map(p=>p.id)).toEqual(['1','2a','2b','3','4','5','6a','6b','7','8a','8b','9','10']);
  expect(new Set(P5_MAHA_BODHI_2025_PARTS.map(p=>p.id.replace(/[ab]$/,''))).size).toBe(10);
  expect(new Set(P5_MAHA_BODHI_2025_PARTS.map(p=>p.canonicalPatternId)).size).toBe(13);
  for(const p of P5_MAHA_BODHI_2025_PARTS)for(const id of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===id),id).toBe(true);
 });
 it('independently solves 11700 generated responses using visible givens',()=>{
  for(const part of P5_MAHA_BODHI_2025_PARTS)for(let seed=0;seed<300;seed++)for(let index=0;index<3;index++){
   const q=makeP5MahaBodhi2025(part.id,seed,index),solved=solveP5Imported(q,part.id);expect(Number(q.answer),`${part.id}:${seed}:${index}`).toBeCloseTo(solved,8);expect(correctAnswer(gradeable(q),String(solved))).toBe(true);expect(correctAnswer(gradeable(q),'999999')).toBe(false);
   expect(q.choices).toBeUndefined();expect(q.workedSteps.length).toBeGreaterThanOrEqual(2);expect(q.hint.length).toBeGreaterThan(15);expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
 it('keeps linked subparts coherent and deterministic',()=>{
  for(let seed=0;seed<80;seed++)for(const group of ['6','8']){const a=makeP5MahaBodhi2025(`${group}a`,seed),b=makeP5MahaBodhi2025(`${group}b`,seed);expect(a.picture).toEqual(b.picture);expect(a.context).toEqual(b.context);expect(a).toEqual(makeP5MahaBodhi2025(`${group}a`,seed));}
 });
 it('creates varied original quantities, including non-exact charge blocks',()=>{
  for(const p of P5_MAHA_BODHI_2025_PARTS){const seen=new Set(Array.from({length:100},(_,seed)=>makeP5MahaBodhi2025(p.id,seed).answer));expect(seen.size,p.id).toBeGreaterThanOrEqual(6);}
  for(let seed=0;seed<100;seed++){
   const q=makeP5MahaBodhi2025('3',seed),m=diagram(q);if(m.layout!=='parcel')throw Error('Missing tariff');expect((nums(q.prompt)[0]-m.firstMass)%m.blockMass).not.toBe(0);
   const c=diagram(makeP5MahaBodhi2025('8a',seed));if(c.layout!=='cube-growth')throw Error('Missing solid');expect(c.heights).not.toEqual([2,3,3,1]);expect(nums(makeP5MahaBodhi2025('8a',seed).prompt)[0]).not.toBe(7);
  }
 });
 it('renders every geometric relationship and each unit cube without missing labels',()=>{
  for(let seed=0;seed<20;seed++)for(const part of ['3','4','5','6a','8a','10']){
   const m=diagram(makeP5MahaBodhi2025(part,seed)),html=renderToStaticMarkup(createElement(P5MahaBodhiDiagram,{model:m}));expect(html).not.toMatch(/NaN|Infinity|undefined/);
   if(m.layout==='parcel'){expect(html).toContain('<table>');expect(html).toContain('part of it');continue;}
   expect(html).toContain('role="img"');expect(html).toContain('<desc');
   if(m.layout==='cube-growth')expect((html.match(/data-unit-cube=/g)??[]).length).toBe(m.depths.reduce((n,d)=>n+solidCubes(m.heights,d).length,0));
   if(m.layout==='two-squares')for(const label of ['A','B','C','D','E','F','G'])expect(html).toContain(`>${label}</text>`);
   if(m.layout==='overlap')for(const label of ['A','B','C','D','E','F','X','Y'])expect(html).toContain(`>${label}</text>`);
  }
 });
 it('independently verifies all 13 source answers and records the Q3 key typo',()=>{
  expect(360/60).toBe(6);expect(25.79+2.31).toBeCloseTo(28.1,10);expect(Math.round(173.896*10)/10).toBe(173.9);
  expect(180/50).toBe(3.6);expect(180/5).not.toBe(3.6);expect(2+Math.ceil((480-300)/50)*.35).toBe(3.4);
  expect((36+36/2)*36/2).toBe(972);expect(100*70+40*70/2-100*35/2).toBe(6650);
  expect(15*15*74*5).toBe(83250);expect(15*15*74*5-5850).toBe(77400);expect(256.5/4.5*8*.5).toBe(228);
  expect(9*7).toBe(63);expect(7**3-63).toBe(280);expect(1.8+28.8/8).toBeCloseTo(5.4,10);expect(196-196/4).toBe(147);
 });
});
