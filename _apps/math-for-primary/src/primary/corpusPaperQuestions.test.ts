import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {CORPUS_PATTERNS,CORPUS_PATTERN_SOURCES} from './corpusPaperCatalog';
import {makeCorpusPaperQuestion,type CorpusPicture} from './corpusPaperQuestions';
import {CorpusDiagram} from './CorpusDiagram';
import {Picture} from './Picture';
import type {PaperPattern} from './paperCatalog';
import {activityById,type Activity} from './catalog';
import {correctAnswer,makeQuestion,numberValue,type Proof,type Question} from './generate';
import {CURRICULUM_SKILLS} from '../school/curriculum';

const activity=(pattern:PaperPattern):Activity=>({...pattern,id:`corpus-check-${pattern.parameter}`,kind:'paper',track:'standard'});
const numeric=(s:string)=>Number(s.match(/\d+(?:\.\d+)?/)?.[0]);
const render=(model:CorpusPicture)=>renderToStaticMarkup(createElement(CorpusDiagram,{model}));
function cards(q:Question){if(q.picture?.type!=='paper'||q.picture.layout!=='cards')throw Error('Expected visible cards');return q.picture.cards;}
function corpus(q:Question){if(q.picture?.type!=='corpus')throw Error('Expected corpus diagram');return q.picture;}
function proofValue(p:Proof):number{
 if(typeof p==='number')return p;
 const a=proofValue(p.a),b=proofValue(p.b);
 switch(p.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case 'round':return Math.round(a/b)*b;case 'floor':return Math.floor(a/b)*b;}
}

/** Independently reconstruct answers from visible givens. Never read the answer, hint, solution or proof. */
export function solve(q:Question,param:string):number{
 if(!q.picture)throw Error('Missing visible question diagram');
 switch(param){
  case 'p1-pattern-gap':{
   if(q.picture.type!=='pattern')throw Error('Expected a number trail');
   const terms=q.picture.items,first=Number(terms[0]),jump=Number(terms[1])-first;
   return first+terms.indexOf('?')*jump;
  }
  case 'p2-unit-ribbons':{
   const p=corpus(q);if(p.layout!=='fraction-rows')throw Error('Expected fraction ribbons');
   const fractions=p.rows.map(row=>row.filled/row.parts);
   return q.prompt.includes('greatest')?Math.max(...fractions):Math.min(...fractions);
  }
  case 'p3-juice-left':{
   const [initial,glasses,each]=cards(q).map(c=>numeric(c.value));
   let remaining=initial*1000;
   for(let pour=0;pour<glasses;pour++)remaining-=each;
   return remaining;
  }
  case 'p4-path-area':{
   const p=corpus(q);if(p.layout!=='rectangular-frame')throw Error('Expected a garden plan');
   // Count 1 m² cells belonging to the path, independently of subtraction-of-areas.
   let path=0;
   for(let x=0;x<p.outerWidth;x++)for(let y=0;y<p.outerHeight;y++)
    if(x<p.border||x>=p.outerWidth-p.border||y<p.border||y>=p.outerHeight-p.border)path++;
   return path;
  }
  case 'p5-giftbags':{
   const [pencils,stickers]=cards(q).map(c=>numeric(c.value));
   // Enumerate every feasible positive bag count, ensuring none larger works.
   let greatest=0;
   for(let bags=1;bags<=Math.min(pencils,stickers);bags++)if(pencils%bags===0&&stickers%bags===0)greatest=bags;
   return greatest;
  }
  case 'p6-equilateral-line':{
   const p=corpus(q);if(p.layout!=='equilateral-line')throw Error('Expected triangle and line');
   const equilateralAngle=180/3;
   return 180-p.givenAngle-equilateralAngle;
  }
  default:throw Error(`No independent corpus solver for ${param}`);
 }
}

describe('New corpus-informed original families',()=>{
 it.each(CORPUS_PATTERNS.map(p=>[p.parameter,p] as const))('%s is solvable from visible facts, with consistent answers and worked steps',(param,pattern)=>{
  const a=activity(pattern);
  for(let seed=0;seed<100;seed++)for(let index=0;index<6;index++){
   const q=makeCorpusPaperQuestion(a,seed,index),where=`${param}: seed ${seed}, index ${index}`,answer=numberValue(q.answer);
   expect(answer,where).not.toBeNull();expect(answer!,where).toBeGreaterThan(0);
   expect(answer!,where).toBeCloseTo(solve(q,param),7);
   expect(answer!,where).toBeCloseTo(proofValue(q.proof!),7);
   // The GCF family uses a literal Proof; exhaustive enumeration above validates maximality.
   const answerOnly={...q,picture:undefined,workedSteps:undefined};
   expect(correctAnswer(answerOnly,q.answer),where).toBe(true);
   expect(correctAnswer(answerOnly,String(answer!+1)),where).toBe(false);
   expect(makeCorpusPaperQuestion(a,seed,index),where).toEqual(q);
   expect(q.context?.every(s=>s.trim().length>10),where).toBe(true);
   expect(q.prompt.trim().split(/\s+/).length,where).toBeLessThanOrEqual(18);
   expect(q.workedSteps.length,where).toBeGreaterThanOrEqual(3);
   expect(q.workedSteps.every(s=>s.picture&&s.equation&&s.text.length>10),where).toBe(true);
   expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);
   if(q.choices){
    expect(new Set(q.choices).size,where).toBe(4);
    expect(q.choices.filter(c=>correctAnswer(answerOnly,c)),where).toEqual([q.answer]);
   }
  }
 });

 it('keeps each source-derived family genuinely distinct with valid prerequisite metadata',()=>{
  expect(CORPUS_PATTERNS.map(p=>p.level)).toEqual([1,2,3,4,5,6]);
  expect(new Set(CORPUS_PATTERNS.map(p=>p.parameter)).size).toBe(6);
  for(const p of CORPUS_PATTERNS){
   expect(p.skillIds.length).toBeGreaterThan(0);
   for(const id of p.skillIds)expect(CURRICULUM_SKILLS.find(skill=>skill.id===id),id).toBeDefined();
   const source=CORPUS_PATTERN_SOURCES.find(s=>s.parameter===p.parameter)!;
   expect(source.url).toMatch(/^https:\/\/sgexam\.com\/subject\/maths\//);
   expect(source.pdfPage).toBeGreaterThan(0);expect(source.question).toMatch(/^\d+$/);
   const samples=new Set(Array.from({length:80},(_,seed)=>{const q=makeCorpusPaperQuestion(activity(p),seed,seed%6);return JSON.stringify([q.prompt,q.context,q.picture]);}));
   expect(samples.size,p.parameter).toBeGreaterThan(6);
  }
  expect(CORPUS_PATTERNS.find(p=>p.level===5)!.skillIds).toEqual(['P4.S.FACT.02']);
  expect(CORPUS_PATTERNS.find(p=>p.level===6)!.skillIds.every(id=>id.startsWith('P5.'))).toBe(true);
 });

 it('does not turn filled glasses into a counted row of jugs',()=>{
  const p=CORPUS_PATTERNS.find(p=>p.parameter==='p3-juice-left')!;
  const q=makeCorpusPaperQuestion(activity(p),22,0),c=cards(q);
  expect(c[1].label).toBe('Glasses filled');expect(c[1].count).toBeUndefined();expect(c[1].icon).toBe('number');
  expect(q.unit).toBe('ml');expect(q.context?.join(' ')).toContain('No juice is spilled');
 });

 it('routes all six catalogue activities through their actual generator and picture renderer',()=>{
  for(const pattern of CORPUS_PATTERNS){
   const a=activityById(`p${pattern.level}s-paper-${pattern.parameter}`)!;
   expect(a,pattern.parameter).toBeDefined();
   for(const seed of [0,7919,15841,0xffffffff]){
    const q=makeQuestion(a,seed,0),expected=makeCorpusPaperQuestion(a,seed,0);
    expect(q).toEqual(expected);
    expect(numberValue(q.answer)).toBeCloseTo(solve(expected,pattern.parameter),7);
    const html=renderToStaticMarkup(createElement(Picture,{model:q.picture!}));
    expect(html.length).toBeGreaterThan(100);expect(html).not.toMatch(/NaN|Infinity|undefined/);
    if(q.picture?.type==='paper'&&q.picture.layout==='cards'){
     for(const card of q.picture.cards){expect(html).toContain(card.label);expect(html).toContain(card.value);}
    }else expect(html).toMatch(/aria-label|role="img"/);
   }
  }
 });

 it('draws every fraction ribbon as a complete equally long whole with exactly one shaded part',()=>{
  for(const parts of [2,3,4,5,6,8,10,12]){
   const html=render({type:'corpus',layout:'fraction-rows',rows:[{label:'A',parts,filled:1}]});
   const rects=[...html.matchAll(/<rect\b[^>]+>/g)].map(m=>m[0]);
   expect(rects).toHaveLength(parts);
   const widths=rects.map(s=>Number(s.match(/\bwidth="([^"]+)"/)?.[1]));
   expect(widths.reduce((a,b)=>a+b,0)).toBeCloseTo(350,8);
   expect(rects.filter(s=>s.includes('fill="#76a4d0"'))).toHaveLength(1);
   expect(html).toContain(`1 of ${parts} equal parts shaded`);
   expect(html).toContain('Every complete ribbon has the same length');
  }
 });

 it('draws a uniform inside border whose scaled area agrees with independent cell counting',()=>{
  const p=CORPUS_PATTERNS.find(p=>p.parameter==='p4-path-area')!;
  for(let seed=0;seed<100;seed++){
   const q=makeCorpusPaperQuestion(activity(p),seed,0),m=corpus(q);if(m.layout!=='rectangular-frame')throw Error('Expected frame');
   const html=render(m),rect=(which:string)=>{const tag=html.match(new RegExp(`<rect data-plot="${which}"[^>]+>`))![0];return ['x','y','width','height'].map(k=>Number(tag.match(new RegExp(`\\b${k}="([^"]+)"`))![1]));};
   const [x,y,w,h]=rect('outer'),[ix,iy,iw,ih]=rect('inner'),scale=w/m.outerWidth;
   expect((ix-x)/scale).toBeCloseTo(m.border,8);expect((iy-y)/scale).toBeCloseTo(m.border,8);
   expect((w-iw)/scale).toBeCloseTo(2*m.border,8);expect((h-ih)/scale).toBeCloseTo(2*m.border,8);
   expect((w*h-iw*ih)/(scale*scale)).toBeCloseTo(solve(q,p.parameter),8);
   expect(html).toContain(`Path width: ${m.border} m on every side`);
   expect(html).not.toContain(`${q.answer} m²`);
  }
 });

 it('draws three equal triangle sides and the correct unknown angle without leaking the answer',()=>{
  for(let givenAngle=20;givenAngle<=70;givenAngle+=5){
   const html=render({type:'corpus',layout:'equilateral-line',givenAngle});
   const points=html.match(/<polygon data-equilateral="true" points="([^"]+)"/)![1].split(' ').map(s=>s.split(',').map(Number));
   const [o,a,b]=points,length=(u:number[],v:number[])=>Math.hypot(u[0]-v[0],u[1]-v[1]);
   expect(length(o,a)).toBeCloseTo(length(a,b),8);expect(length(o,b)).toBeCloseTo(length(a,b),8);
   const angleBOR=Math.atan2(o[1]-b[1],b[0]-o[0])*180/Math.PI;
   expect(180-angleBOR).toBeCloseTo(120-givenAngle,8);
   expect(html).toContain('Find angle BOL, marked with a question mark');expect(html).toContain('>?</text>');
   expect(html.split(`>${120-givenAngle}°</text>`).length-1).toBe(givenAngle===60?1:0);
   expect(html).not.toContain('Angle BOR =');
  }
 });
});
