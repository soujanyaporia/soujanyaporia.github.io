import {describe,it,expect} from 'vitest';
import type {Activity} from './catalog';
import type {Proof,Question} from './generate';
import {makeP3PaperQuestion} from './paperP3';

const params=['p3-transfer','p3-gaps','p3-boxes','p3-bundle','p3-timeline','p3-chart'];
const activity=(parameter:string):Activity=>({id:`test-${parameter}`,level:3,track:'standard',strand:'Number & Algebra',kind:'story',title:parameter,objective:parameter,skillIds:[],parameter,icon:'✦'});
const numeric=(s:string)=>Number(s.replace(/[^\d.]/g,''));
const time=(s:string)=>{const m=s.match(/(\d+):(\d+) (am|pm)/)!;return (Number(m[1])%12+(m[3]==='pm'?12:0))*60+Number(m[2]);};
function proof(p:Proof):number{if(typeof p==='number')return p;const a=proof(p.a),b=proof(p.b);switch(p.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case 'floor':return Math.floor(a/b)*b;case 'round':return Math.round(a/b)*b;}}
/** Solve solely from the visible diagram and the child's question, without reading the saved proof. */
export function solve(q:Question,param:string):number{
 const pic=q.picture!;
 if(param==='p3-chart'){
  if(pic.type!=='bars')throw Error('Expected bar graph');
  const at=(s:string)=>pic.values[pic.labels.findIndex(l=>l.toLowerCase()===s)];
  const more=q.prompt.match(/more (\w+) than (\w+)/);if(more)return at(more[1])-at(more[2]);
  const both=q.prompt.match(/many (\w+) and (\w+)/);if(both)return at(both[1])+at(both[2]);
  return at(q.prompt.match(/many (\w+) were/)![1]);
 }
 if(pic.type!=='paper')throw Error('Expected paper diagram');
 if(param==='p3-transfer'){
  if(pic.layout!=='bars')throw Error('Expected comparison bars');
  const original=numeric(pic.rows[0].parts[1].label),transfer=Number(q.context!.join(' ').match(/gives Noor (\d+)/)![1]);
  // Assign an arbitrary equal base to both bars, then independently perform the transfer.
  const noorBefore=137,linaBefore=noorBefore+original;
  return (linaBefore-transfer)-(noorBefore+transfer);
 }
 if(param==='p3-gaps'){
  if(pic.layout!=='timeline')throw Error('Expected marker line');
  const known=q.context!.join(' ').match(/marker 1 to marker (\d+) is (\d+) m/)!;
  const requested=[...q.prompt.matchAll(/marker (\d+)/g)].map(m=>Number(m[1]));
  const oneGap=Number(known[2])/(Number(known[1])-1);
  return (requested[1]-requested[0])*oneGap;
 }
 if(param==='p3-timeline'){
  if(pic.layout!=='timeline')throw Error('Expected time line');
  return time(pic.points[2].label)-time(pic.points[0].label)-numeric(pic.gaps[0]);
 }
 if(pic.layout!=='cards')throw Error('Expected cards');
 if(param==='p3-boxes'){
  const [needed,stock,size]=pic.cards.map(c=>numeric(c.value));
  let boxes=0;while(stock+boxes*size<needed)boxes++;
  return boxes;
 }
 if(param==='p3-bundle'){
  const single=Math.round(numeric(pic.cards[0].value)*100),cost=Math.round(numeric(pic.cards[1].value)*100);
  const size=numeric(pic.cards[1].label),wanted=numeric(pic.cards[2].value);
  const costs=[];for(let groups=0;groups*size<=wanted;groups++)costs.push(groups*cost+(wanted-groups*size)*single);
  return Math.min(...costs)/100;
 }
 throw Error('Unrecognised parameter');
}

describe('Original P3 diagram problems',()=>{
 it('independently solves every archetype from its visible givens across many seeds',()=>{
  for(const param of params)for(let seed=0;seed<80;seed++)for(let index=0;index<6;index++){
   const a=activity(param),q=makeP3PaperQuestion(a,seed,index),where=`${param} seed ${seed} index ${index}`;
   expect(Number(q.answer),where).toBeCloseTo(solve(q,param),7);
   expect(Number(q.answer),where).toBeCloseTo(proof(q.proof!),7);
   expect(makeP3PaperQuestion(a,seed,index),where).toEqual(q);
   expect(q.prompt.split(/\s+/).length,where).toBeLessThanOrEqual(18);
   expect(q.workedSteps,where).toHaveLength(4);
   expect(q.workedSteps!.every(s=>s.picture&&s.text.trim().length>8),where).toBe(true);
   expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
 it('covers exact boxes and nonzero remainders and proves the preceding count insufficient',()=>{
  const remainders=new Set<number>();
  for(let seed=0;seed<70;seed++)for(let index=0;index<3;index++){
   const q=makeP3PaperQuestion(activity('p3-boxes'),seed,index),p=q.picture!;
   if(p.type!=='paper'||p.layout!=='cards')throw Error('Wrong diagram');
   const [needed,stock,size]=p.cards.map(c=>numeric(c.value)),answer=Number(q.answer);
   remainders.add((needed-stock)%size);
   expect(stock+answer*size).toBeGreaterThanOrEqual(needed);
   expect(stock+(answer-1)*size).toBeLessThan(needed);
  }
  expect(remainders.has(0)).toBe(true);expect(remainders.size).toBeGreaterThan(3);
 });
 it('requires a meaningful bundle purchase and includes exact bundles and mixed purchases',()=>{
  const cases=new Set<string>();
  for(let seed=0;seed<100;seed++)for(let index=0;index<4;index++){
   const q=makeP3PaperQuestion(activity('p3-bundle'),seed,index),p=q.picture!;
   if(p.type!=='paper'||p.layout!=='cards')throw Error('Wrong diagram');
   const size=numeric(p.cards[1].label),wanted=numeric(p.cards[2].value);
   expect(wanted).toBeGreaterThanOrEqual(size*2);
   cases.add(wanted<size?'singles':wanted%size?'mixed':'bundles');
  }
  expect([...cases].sort()).toEqual(['bundles','mixed']);
 });
 it('includes scale reading, two-bar comparison and a two-bar total',()=>{
  const prompts=[];
  for(let index=0;index<3;index++){
   const q=makeP3PaperQuestion(activity('p3-chart'),42,index),p=q.picture!;
   expect(p.type).toBe('bars');if(p.type!=='bars')continue;
   expect(p.values.every(v=>v>0&&v%p.scale===0)).toBe(true);prompts.push(q.prompt);
  }
  expect(prompts[0]).not.toMatch(/more|altogether/);expect(prompts[1]).toContain('more');expect(prompts[2]).toContain('altogether');
 });
 it('keeps timeline jumps forwards across noon and whole hours, excluding the wait',()=>{
  let noon=false,whole=false;
  for(let seed=0;seed<100;seed++){
   const q=makeP3PaperQuestion(activity('p3-timeline'),seed,0),p=q.picture!;
   if(p.type!=='paper'||p.layout!=='timeline')throw Error('Wrong diagram');
   const arrived=time(p.points[0].label),start=arrived+numeric(p.gaps[0]),end=time(p.points[2].label);
   if(start<720&&end>=720)noon=true;if(start%60===0)whole=true;
   expect(end-start).toBe(Number(q.answer));
   expect(q.workedSteps![2].equation).not.toMatch(/= -/);
  }
  expect(noon).toBe(true);expect(whole).toBe(true);
 });
});
