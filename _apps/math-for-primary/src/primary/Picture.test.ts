import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {Picture} from './Picture';
import {fractionColumns} from './pictureLayout';
import {ACTIVITIES} from './catalog';
import {makeQuestion,type Picture as PictureModel} from './generate';
import {visibleQuestionKey} from './practicePaper';

const render=(model:PictureModel)=>renderToStaticMarkup(createElement(Picture,{model}));
const at=(level:number,kind:string,parameter?:string)=>ACTIVITIES.find(a=>a.level===level&&a.kind===kind&&(parameter===undefined||a.parameter===parameter))!;
type Point=[number,number];
const vertices=(html:string):Point[]=>html.match(/points="([^"]+)"/)![1].split(' ').map(p=>p.split(',').map(Number) as Point);
function angle(a:Point,b:Point,c:Point){const u=[a[0]-b[0],a[1]-b[1]],v=[c[0]-b[0],c[1]-b[1]];return Math.acos((u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)))*180/Math.PI;}

describe('Question pictures preserve all visible mathematical facts',()=>{
 it('partitions a complete rectangular whole with no unpartitioned empty slots',()=>{
  for(const parts of [2,3,4,5,6,8,10,12,20,25,100]){
   const columns=fractionColumns(parts),html=render({type:'fraction',parts,filled:Math.floor(parts/2)});
   expect(parts%columns,`${parts} equal parts`).toBe(0);
   expect(html).toContain(`repeat(${columns},1fr)`);
   expect(html.match(/<span/g)).toHaveLength(parts);
  }
  expect(fractionColumns(8)).toBe(4);expect(fractionColumns(10)).toBe(5);expect(fractionColumns(20)).toBe(5);expect(fractionColumns(25)).toBe(5);
 });
 it('shows the two addends as separate groups and crosses out the actual subtrahend',()=>{
  for(let seed=0;seed<80;seed++)for(const kind of ['add','subtract']){
   const q=makeQuestion(at(1,kind),seed),p=q.picture!;
   expect(p.type).toBe('counters');if(p.type!=='counters')continue;
   const numbers=[...q.display!.matchAll(/\d+/g)].map(m=>Number(m[0]));
   if(kind==='add'){expect(p.parts).toEqual(numbers);expect(p.parts!.reduce((a,b)=>a+b)).toBe(Number(q.answer));expect(render(p).match(/class="play-counter-group"/g)).toHaveLength(2);}
   else{expect(p.count).toBe(numbers[0]);expect(p.removed).toBe(numbers[1]);expect(render(p).match(/class="counter-removed"/g)).toHaveLength(numbers[1]);expect(p.count-p.removed!).toBe(Number(q.answer));}
  }
 });
 it('draws triangle angles from the givens instead of reusing an incompatible fixed triangle',()=>{
  for(let a=30;a<=80;a+=10)for(let b=30;b<=80;b+=10){
   const html=render({type:'angleProblem',layout:'triangle',a,b}),[left,right,top]=vertices(html);
   expect(angle(right,left,top)).toBeCloseTo(a,8);expect(angle(left,right,top)).toBeCloseTo(b,8);
   expect(angle(left,top,right)).toBeCloseTo(180-a-b,8);
   expect(html).toContain(`>${a}°</text>`);expect(html).toContain(`>${b}°</text>`);expect(html).toContain('>?</text>');
   for(const [x,y] of [left,right,top]){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(400);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(285);}
  }
 });
 it('marks the requested parallelogram vertex and its geometry independently yields the answer',()=>{
  for(let seed=0;seed<80;seed++){
   const q=makeQuestion(at(5,'quadrilateral'),seed),p=q.picture!;
   expect(p.type).toBe('angleProblem');if(p.type!=='angleProblem')continue;
   const html=render(p),[a,b,c,d]=vertices(html);
   expect(angle(b,a,d)).toBeCloseTo(p.a,8);
   const target=p.target==='opposite'?angle(b,c,d):angle(a,b,c);
   expect(target).toBeCloseTo(Number(q.answer),8);expect(html).toContain('>?</text>');
  }
 });
 it('includes the hidden fourth base vertex and apex edge of a square pyramid',()=>{
  const html=render({type:'solid',shape:'square pyramid'});
  expect(html).toContain('data-hidden-square-base="true"');
  expect(html).toContain('M90 180L160 130 285 165M160 130L190 35');
  expect(html).toContain('stroke-dasharray="5 4"');
 });
 it('puts the complete transfer story in readable givens and shows before, giving and after',()=>{
  for(let seed=0;seed<40;seed++){
   const q=makeQuestion(at(3,'paper','p3-transfer'),seed),context=q.context!.join(' '),p=q.picture!;
   expect(context).toMatch(/Lina has \d+ more badges than Noor\. Lina gives Noor \d+ badges\./);
   expect(q.prompt).toBe('How many more badges does Lina have than Noor after sharing?');
   const [gap,transfer]=[...context.matchAll(/\d+/g)].map(m=>Number(m[0]));expect(gap-transfer*2).toBe(Number(q.answer));
   const html=render(p);expect(html).toContain('1. Before sharing');expect(html).toContain(`Lina gives Noor ${transfer} badges`);expect(html).toContain(`−${transfer} badges`);expect(html).toContain(`+${transfer} badges`);expect(html).toContain('3. After sharing');expect(html).toContain('? badges');
   expect(visibleQuestionKey({...q,context:[`Lina has ${gap+1} more badges than Noor.`,q.context![1]]})).not.toBe(visibleQuestionKey(q));
  }
 });
 it('keeps essential distances, rates and unchanged totals outside small captions',()=>{
  const required=['p3-gaps','p3-boxes','p2-before','p2-fraction','p2-bottles','p4-factor','p4-freebie','p5-bundles','p6-average','p6-charge','p6-redistribute'];
  for(const parameter of required){const a=ACTIVITIES.find(a=>a.kind==='paper'&&a.parameter===parameter)!,q=makeQuestion(a,42);expect(q.context?.join(' ').length,parameter).toBeGreaterThan(20);if(q.picture?.type==='paper')expect(q.picture.caption,parameter).toBeUndefined();}
 });
 it('renders representative data from every activity without blank pictures or invalid coordinates',()=>{
  for(const activity of ACTIVITIES)for(let seed=0;seed<8;seed++){
   const q=makeQuestion(activity,seed,seed%6);if(!q.picture)continue;
   const html=render(q.picture);expect(html.length,`${activity.id} ${seed}`).toBeGreaterThan(40);expect(html,`${activity.id} ${seed}`).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
});
