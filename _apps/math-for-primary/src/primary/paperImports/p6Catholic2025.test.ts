import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Activity} from '../catalog';
import {correctAnswer,type Question} from '../generate';
import {Picture} from '../Picture';
import {P6CatholicDiagram} from './P6CatholicDiagram';
import {foldGeometry,parallelShapesGeometry,squareRhombusGeometry,type Point} from './p6CatholicPicture';
import {P6_CATHOLIC_2025_PATTERNS} from './p6Catholic2025Meta';
import {makeP6Catholic2025Question,makeP6Catholic2025Set,type P6ImportedQuestion} from './p6Catholic2025';
const activity=(parameter:string):Activity=>({...P6_CATHOLIC_2025_PATTERNS.find(p=>p.parameter===parameter)!,id:`p6s-paper-${parameter}`,kind:'paper',track:'standard'});
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a:Point,v:Point,b:Point)=>Math.acos(Math.max(-1,Math.min(1,((a.x-v.x)*(b.x-v.x)+(a.y-v.y)*(b.y-v.y))/(distance(a,v)*distance(b,v)))))*180/Math.PI;
const number=(s:string)=>Number(s.replace(/[^\d.-]/g,''));
const round=(n:number)=>Number(n.toFixed(6));
const assert:(condition:unknown,message:string)=>asserts condition=(condition,message)=>{if(!condition)throw Error(message);};
/** Independent reconstruction from displayed dimensions, shape relationships and context only. */
export function solveP6Imported(q:Question|P6ImportedQuestion,parameter:string):string|number{
 const id=parameter.replace(/^ch6a2-/,''),pic=q.picture;
 const cards=pic?.type==='paper'&&pic.layout==='cards'?pic.cards:[],values=cards.map(c=>number(c.value));
 if(id==='01')return round(values[0]/(1+values[1]/100));
 if(id==='04')return round(values[0]-values[0]*values[1]/100);
 if(id==='10'){
  assert(pic?.type==='paper'&&pic.layout==='timeline','Need percentage timeline');const last=number(pic.points[2].label.replace('Week 3: ','')),up=number(pic.gaps[0]),down=number(pic.gaps[1]);
  return round(last/((1+up/100)*(1-down/100)));
 }
 if(id==='11-a'||id==='11-b'){
  const [total,initialPercent,finalPercent]=values,boys=total*(1-initialPercent/100);if(id==='11-a')return round(boys);
  const initialGirls=total-boys,candidates=[];for(let left=0;left<=initialGirls;left++)if(Math.abs((initialGirls-left)/(total-left)*100-finalPercent)<1e-7)candidates.push(left);
  assert(candidates.length===1,'Changed-whole quantities must have one whole-number solution');return candidates[0];
 }
 assert(pic?.type==='catholic-p6','Need original geometry figure');
 if(pic.layout==='circle')return id==='02'?`${pic.value*2}π`:round(22/7*(pic.value/2)**2);
 if(pic.layout==='fold'){const {A,T,Q}=foldGeometry(pic.angle);return round(angle(A,T,Q));}
 if(pic.layout==='square-rhombus'){const {G,F,D}=squareRhombusGeometry(pic.angle);return round(angle(G,F,D));}
 if(pic.layout==='quarter-square')return round(pic.side**2*(1+3.14/4));
 if(pic.layout==='parallel-shapes'){const {B,E,F}=parallelShapesGeometry(pic.alpha,pic.beta,pic.gamma);return round(angle(B,E,F));}
 if(pic.layout==='stadium')return round(pic.length*2+3.14*(2*pic.radius));
 throw Error(`No independent P6 solver for ${parameter}`);
}
describe('Complete P6 assessment-pattern adaptation',()=>{
 it('accounts for 11 numbered questions and both parts of the final question',()=>{
  expect(P6_CATHOLIC_2025_PATTERNS).toHaveLength(12);expect(new Set(P6_CATHOLIC_2025_PATTERNS.flatMap(p=>p.sourceParts)).size).toBe(12);
  expect(new Set(P6_CATHOLIC_2025_PATTERNS.flatMap(p=>p.sourceParts.map(s=>s.split('.')[0]))).size).toBe(11);
 });
 for(const pattern of P6_CATHOLIC_2025_PATTERNS)it(`independently solves ${pattern.parameter} across 400 seeds`,()=>{
  const a=activity(pattern.parameter);for(let seed=0;seed<400;seed++){
   const q=makeP6Catholic2025Question(a,seed,seed%5),solved=String(solveP6Imported(q,pattern.parameter));
   expect(q).toEqual(makeP6Catholic2025Question(a,seed,seed%5));
   expect(correctAnswer(q as Question,solved),`${pattern.parameter}:${seed} ${solved}, stored ${q.answer}`).toBe(true);
   expect(correctAnswer(q as Question,'999999')).toBe(false);expect(q.workedSteps.length).toBeGreaterThanOrEqual(2);
   if(q.picture.type==='catholic-p6')expect(q.picture).not.toHaveProperty('answer');
  }
 });
 it('constructs true folded right corners rather than merely labelling arbitrary triangles',()=>{
  for(const theta of [52,54,56,58,60,64,66,68,70]){
   const {T,C,P,Q}=foldGeometry(theta);
   expect(angle(T,Q,P)).toBeCloseTo(90,9);expect(angle(T,P,Q)).toBeCloseTo(theta,9);
   expect(distance(T,C)).toBeCloseTo(distance(T,Q),9);expect(distance(P,C)).toBeCloseTo(distance(P,Q),9);
  }
 });
 it('constructs actual squares, rhombi and collinear intersections for every allowed angle',()=>{
  for(const theta of [30,34,38,40,42,46,48,50,54,58]){
   const {A,B,C,D,E,F,G}=squareRhombusGeometry(theta),side=distance(A,B);
   for(const [a,b] of [[B,C],[C,D],[D,A],[C,E],[E,F],[F,D]])expect(distance(a,b)).toBeCloseTo(side,9);
   expect(angle(A,D,C)).toBeCloseTo(90,9);expect(angle(G,D,F)).toBeCloseTo(theta,9);
   expect(angle(A,G,F)).toBeCloseTo(180,5);expect(angle(C,G,D)).toBeCloseTo(180,5);
  }
 });
 it('preserves all three given angles and the parallel relation in the composite figure',()=>{
  for(let seed=0;seed<400;seed++){
   const q=makeP6Catholic2025Question(activity('ch6a2-08'),seed);assert(q.picture.type==='catholic-p6'&&q.picture.layout==='parallel-shapes','Need parallel figure');const p=q.picture;
   const {A,B,E,F,G,H}=parallelShapesGeometry(p.alpha,p.beta,p.gamma);
   expect(angle(A,E,H)).toBeCloseTo(p.alpha,7);expect(angle(E,B,H)).toBeCloseTo(p.beta,7);expect(angle(F,G,H)).toBeCloseTo(p.gamma,7);
   const cross=(E.x-A.x)*(B.y-H.y)-(E.y-A.y)*(B.x-H.x);expect(cross).toBeCloseTo(0,7);
   expect(distance(E,F)).toBeCloseTo(distance(H,G),7);expect(distance(E,H)).toBeCloseTo(distance(F,G),7);
  }
 });
 it('uses whole numbers for every visitor count',()=>{
  for(let seed=0;seed<400;seed++){
   const q=makeP6Catholic2025Question(activity('ch6a2-10'),seed,seed%5);
   assert(q.picture.type==='paper'&&q.picture.layout==='timeline','Need percentage timeline');
   const last=number(q.picture.points[2].label.replace('Week 3: ',''));
   const up=number(q.picture.gaps[0]);
   expect(Number.isInteger(last)).toBe(true);
   expect(Number.isInteger(Number(q.answer)*(100+up)/100)).toBe(true);
  }
 });
 it('keeps linked pupils and percentages stable and every person count whole',()=>{
  for(let seed=0;seed<50;seed++){
   const a=makeP6Catholic2025Question(activity('ch6a2-11-a'),seed),b=makeP6Catholic2025Question(activity('ch6a2-11-b'),seed);
   expect(a.picture).toEqual(b.picture);expect(a.context).toEqual(b.context);expect(Number.isInteger(Number(a.answer))).toBe(true);expect(Number.isInteger(Number(b.answer))).toBe(true);
  }
 });
 it('renders all labels and complete visible givens for all new figures',()=>{
  for(const seed of [0,17,7919,15841])for(const {question:q} of makeP6Catholic2025Set(seed)){
   const html=renderToStaticMarkup(q.picture.type==='catholic-p6'?createElement(P6CatholicDiagram,{model:q.picture}):createElement(Picture,{model:q.picture}));
   expect(html.length).toBeGreaterThan(80);expect(html).not.toMatch(/NaN|Infinity|undefined/);
   if(q.picture.type==='catholic-p6'){expect(html).toContain('role="img"');if(q.picture.layout==='parallel-shapes')for(const n of [q.picture.alpha,q.picture.beta,q.picture.gamma])expect(html).toContain(`${n}°`);}
  }
 });
});
