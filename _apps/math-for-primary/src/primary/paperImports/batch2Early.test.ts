import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {makeBatch2Early,BATCH2_EARLY_PARTS,type Batch2EarlyQuestion} from './batch2Early';
import {Batch2EarlyDiagram} from './batch2EarlyDiagram';
import type {Batch2EarlyPicture} from './batch2EarlyPicture';
import {correctAnswer} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

function permutations(values:number[]):number[][]{
 return values.length===0?[[]]:values.flatMap((value,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[value,...rest]));
}
const cards=(q:Batch2EarlyQuestion)=>{
 if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Missing visible number cards');
 return q.picture.cards.map(card=>Number(card.value));
};
const svg=(q:Batch2EarlyQuestion)=>{
 if(q.picture.type!=='batch2-early')throw Error('Missing exact original diagram');
 return renderToStaticMarkup(createElement(Batch2EarlyDiagram,{model:q.picture}));
};

/** Reconstruct from child-visible cards/text and rendered geometry. Never reads answer/proof/steps. */
export function solveBatch2Early(q:Batch2EarlyQuestion):string|number{
 if(q.picture.type==='paper'){
  const values=cards(q);
  if(q.prompt.includes('cards add up')){
   const target=Number(q.prompt.match(/\d+/)![0]),pairs:string[]=[];
   for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){
    if(values[i]+values[j]===target)pairs.push(`${values[i]} and ${values[j]}`);
   }
   if(pairs.length!==1)throw Error('Pair choice must have one solution');
   return pairs[0];
  }
  const odd=q.prompt.includes('odd'),valid=permutations(values).filter(d=>d[0]!==0&&d.at(-1)!%2===(odd?1:0)).map(d=>Number(d.join('')));
  if(!valid.length)throw Error('No valid digit arrangement');
  return q.prompt.includes('greatest')?Math.max(...valid):Math.min(...valid);
 }
 const html=svg(q);
 if(q.picture.type==='batch2-early'&&q.picture.layout==='offset-rulers'){
  const zero=Number(html.match(/data-ruler-tick="0" x1="([\d.]+)"/)![1]);
  const one=Number(html.match(/data-ruler-tick="1" x1="([\d.]+)"/)![1]);
  const lengths=[...html.matchAll(/data-measured-object="([^"]+)" x="([\d.]+)"[^>]* width="([\d.]+)"/g)].map(m=>({label:m[1],length:Number(m[3])/(one-zero)}));
  const blue=lengths.find(m=>m.label==='Blue ribbon')!,orange=lengths.find(m=>m.label==='Orange ribbon')!;
  return Math.round((blue.length-orange.length)*1e8)/1e8;
 }
 const ticks=[...html.matchAll(/data-chart-tick="(\d+)" x="([\d.]+)"/g)].map(m=>({value:Number(m[1]),x:Number(m[2])}));
 const unitPixels=(ticks[1].x-ticks[0].x)/(ticks[1].value-ticks[0].value);
 const bars=[...html.matchAll(/data-sales-bar="([^"]+)" x="([\d.]+)"[^>]* width="([\d.]+)"/g)];
 const selected=bars.filter(m=>q.prompt.includes(m[1]));
 if(selected.length!==1)throw Error('Requested day is ambiguous');
 const count=Math.round(Number(selected[0][3])/unitPixels),price=Number(q.context!.join(' ').match(/\$(\d+)/)![1]);
 // Repeated addition is independent of the generator's multiplication formula.
 return Array.from({length:count},()=>price).reduce((total,value)=>total+value,0);
}

describe('Batch two original early-primary structures',()=>{
 it('registers five responses from four mathematical families against valid curriculum objectives',()=>{
  expect(BATCH2_EARLY_PARTS).toHaveLength(5);
  expect(new Set(BATCH2_EARLY_PARTS.map(p=>p.family)).size).toBe(4);
  for(const part of BATCH2_EARLY_PARTS)for(const skill of part.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves 3000 examples and checks the shared answer grader',()=>{
  for(const part of BATCH2_EARLY_PARTS)for(let seed=0;seed<150;seed++)for(let index=0;index<4;index++){
   const q=makeBatch2Early(part.id,seed,index),solved=solveBatch2Early(q),where=`${part.id}:${seed}:${index}`;
   if(typeof solved==='number')expect(Number(q.answer),where).toBeCloseTo(solved,7);else expect(q.answer,where).toBe(solved);
   const {picture,workedSteps,...plain}=q;
   expect(correctAnswer(plain,String(solved)),where).toBe(true);
   expect(correctAnswer(plain,typeof solved==='number'?String(solved+1):'not a pair'),where).toBe(false);
   expect(workedSteps.length,where).toBeGreaterThan(1);
   expect(q.context!.join(' ').length,where).toBeGreaterThan(20);
   if(q.choices)expect(q.choices.filter(choice=>correctAnswer(plain,choice)),where).toHaveLength(1);
   expect(makeBatch2Early(part.id,seed,index),where).toEqual(q);
  }
 });
 it('does not derive the independent result from stored answers or explanations',()=>{
  for(const part of BATCH2_EARLY_PARTS){
   const q=makeBatch2Early(part.id,23),solved=solveBatch2Early(q);
   const poisoned={...q,answer:'poison',explanation:'poison',workedSteps:[],proof:123456,hint:'poison'};
   expect(solveBatch2Early(poisoned)).toBe(solved);
  }
 });
 it('preserves nonzero starts and compares lengths rather than endpoint readings',()=>{
  let misleadingEndpoints=0;
  for(let seed=0;seed<250;seed++){
   const q=makeBatch2Early('offset-ruler-difference',seed),m=q.picture as Extract<Batch2EarlyPicture,{layout:'offset-rulers'}>,[blue,orange]=m.objects;
   expect(blue.start).toBeGreaterThan(0);expect(orange.start).toBeGreaterThan(0);expect(blue.start).not.toBe(orange.start);
   expect(blue.end-blue.start).toBeGreaterThan(orange.end-orange.start);
   expect(blue.end).toBeLessThanOrEqual(m.maximum);expect(orange.end).toBeLessThanOrEqual(m.maximum);
   if(blue.end<=orange.end)misleadingEndpoints++;
   const changed={...q,picture:{...m,objects:[{...blue,end:blue.end+1},orange]}};
   expect(solveBatch2Early(changed)).toBeCloseTo(Number(q.answer)+1);
  }
  expect(misleadingEndpoints).toBeGreaterThan(10);
 });
 it('includes zero and nontrivial parity constraints without copying source digit sets',()=>{
  let zeroCases=0,restrictedCases=0;
  for(let seed=0;seed<150;seed++)for(const part of ['greatest-even-three','smallest-odd-four'] as const){
   const q=makeBatch2Early(part,seed),values=cards(q);
   expect(new Set(values).size).toBe(values.length);
   expect(values.slice().sort().join(',')).not.toBe(part==='greatest-even-three'?'3,6,8':'0,1,3,6');
   if(values.includes(0))zeroCases++;
   const unconstrained=permutations(values).filter(d=>d[0]!==0).map(d=>Number(d.join('')));
   if((part==='greatest-even-three'?Math.max(...unconstrained):Math.min(...unconstrained))!==Number(q.answer))restrictedCases++;
  }
  expect(zeroCases).toBeGreaterThan(20);expect(restrictedCases).toBeGreaterThan(40);
 });
 it('uses unlabelled two-unit graph intervals, complete labels and fresh quantities',()=>{
  for(let seed=0;seed<80;seed++){
   const q=makeBatch2Early('chart-sales',seed),m=q.picture as Extract<Batch2EarlyPicture,{layout:'sales-bars'}>,day=m.days.findIndex(d=>q.prompt.includes(d)),html=svg(q);
   expect(m.values[day]%m.labelStep).not.toBe(0);expect(m.values[day]%m.minorStep).toBe(0);
   expect(html.match(/data-chart-tick=/g)).toHaveLength(7);expect(html.match(/data-chart-grid=/g)).toHaveLength(31);expect(html.match(/data-sales-bar=/g)).toHaveLength(5);
   expect(html).toContain('role="img"');expect(html).toContain('aria-label=');expect(html).not.toMatch(/NaN|Infinity|undefined/);
   expect(q.context!.join(' ')).toMatch(/Each bookmark costs \$[2-8]/);
  }
 });
});
