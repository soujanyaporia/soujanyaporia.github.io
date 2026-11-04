import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {makeBatch6Early,BATCH6_EARLY_PARTS,type Batch6EarlyPart,type Batch6EarlyQuestion} from './batch6Early';
import {PaperMaterials} from '../PaperMaterials';
import {PaperAnswer} from '../PracticePapers';
import {correctAnswer} from '../generate';
import {structuredResponseReady,formatStructuredResponse} from './batch6MiddleResponse';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+/g)?.map(Number)??[];
const unique=(a:number[])=>{if(a.length!==1)throw Error('Source-style constraint has multiple solutions');return a[0];};
const clock=(minutes:number,suffix=false)=>`${Math.floor(minutes/60)%12||12}:${String(minutes%60).padStart(2,'0')}${suffix?minutes>=720?' pm':' am':''}`;
const parseClock=(s:string)=>{const m=s.match(/(\d+):(\d+) (am|pm)/)!;return Number(m[1])%12*60+Number(m[2])+(m[3]==='pm'?720:0);};
const cards=(q:Batch6EarlyQuestion)=>{if(q.picture?.type!=='paper'||q.picture.layout!=='cards')throw Error('Missing visible facts');return q.picture.cards;};

/** All values come from visible prompt/context/facts or rendered clock-hand coordinates. */
export function solveBatch6Early(q:Batch6EarlyQuestion,part:Batch6EarlyPart):string|number{
 if(part==='1'){
  const html=renderToStaticMarkup(createElement(PaperMaterials,{model:q.picture!}));
  const hands=[...html.matchAll(/<line x1="150" y1="123" x2="([\d.eE+-]+)" y2="([\d.eE+-]+)"/g)];
  if(hands.length!==2)throw Error('Clock must show two hands');
  const angle=(m:RegExpMatchArray)=>(Math.atan2(Number(m[1])-150,123-Number(m[2]))*180/Math.PI+360)%360;
  const minute=Math.round(angle(hands[1])/6)%60,hour=Math.floor((angle(hands[0])+1e-7)/30)%12||12;
  return `${hour}:${String(minute).padStart(2,'0')}`;
 }
 if(part==='2'){const [hours,minutes]=nums(q.prompt);return Array.from({length:hours},()=>60).reduce((a,b)=>a+b,minutes);}
 if(part==='3'){
  const [left,right]=q.display!.split('='),addends=nums(left),factor=nums(right)[0];if(!addends.every(n=>n===factor))throw Error('Repeated addends are inconsistent');return addends.length;
 }
 if(part==='4'){
  if(q.picture?.type!=='pattern')throw Error('Missing money tokens');
  const cents=q.picture.items.map(token=>token.startsWith('$')?Number(token.slice(1))*100:Number(token.replace('¢',''))).reduce((a,b)=>a+b,0);
  return `$${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`;
 }
 if(part==='5'){
  const times=[...q.prompt.matchAll(/\d+:\d+ pm/g)].map(m=>parseClock(m[0]));let elapsed=0;for(let t=times[0];t<times[1];t++)elapsed++;return elapsed;
 }
 if(part==='6'){
  let time=parseClock(q.prompt.match(/\d+:\d+ am/)![0]);const duration=Number(q.prompt.match(/takes (\d+) minutes/)![1]);for(let i=0;i<duration;i++)time++;return clock(time,true);
 }
 if(part==='7'){
  const [total,groups]=cards(q).map(c=>Number(c.value)),bins=Array(groups).fill(0);for(let i=0;i<total;i++)bins[i%groups]++;
  if(!bins.every(n=>n===bins[0]))throw Error('Shares must be equal');return bins[0];
 }
 if(part==='8'){const cents=String(nums(q.prompt)[0]);return `${cents.slice(0,-2)}.${cents.slice(-2)}`;}
 if(part==='9'){const [whole,removed]=nums(q.prompt);return unique(Array.from({length:1000},(_,n)=>n).filter(n=>n+removed===whole));}
 if(part==='10'){
  const [a,b]=nums(q.prompt);let result=0;for(const place of [1,10,100])result+=(Math.floor(a/place)%10+Math.floor(b/place)%10)*place;return result;
 }
 if(part==='11'){const [groups,size]=cards(q).map(c=>Number(c.value));return Array.from({length:groups},()=>size).reduce((a,b)=>a+b,0);}
 if(part==='12'){
  const items=cards(q),[paid,left]=nums(q.context![0]),matches:string[][]=[];
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(Number(items[i].value.slice(1))+Number(items[j].value.slice(1))+left===paid)matches.push([items[i].label,items[j].label]);
  if(matches.length!==1)throw Error('Purchase pair must be unique');return JSON.stringify(matches[0]);
 }
 const [first,second]=nums(q.context!.join(' '));
 if(part.startsWith('13')){const smaller=unique(Array.from({length:1000},(_,n)=>n).filter(n=>n+second===first));return part==='13a'?smaller:first+smaller;}
 const friday=unique(Array.from({length:1000},(_,n)=>n).filter(n=>n+second===first));return part==='14a'?friday:friday-second;
}

describe('Complete Maha Bodhi P2 whole-paper configuration',()=>{
 it('represents all14 numbered questions and16 logical responses with exact source links',()=>{
  expect(BATCH6_EARLY_PARTS).toHaveLength(16);expect(new Set(BATCH6_EARLY_PARTS.map(p=>parseInt(p.id))).size).toBe(14);
  for(const part of BATCH6_EARLY_PARTS)for(const skill of part.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves7200 complete visible-input examples with exact canonical choices',()=>{
  for(const part of BATCH6_EARLY_PARTS)for(let seed=0;seed<150;seed++)for(let index=0;index<3;index++){
   const q=makeBatch6Early(part.id,seed,index),solved=solveBatch6Early(q,part.id),where=`${part.id}/${seed}/${index}`;
   expect(correctAnswer(q,String(solved)),where).toBe(true);expect(q.workedSteps.length,where).toBeGreaterThan(1);
   expect(solveBatch6Early({...q,answer:'poison',proof:987654,workedSteps:[],explanation:'',hint:''},part.id),where).toBe(solved);
   expect(makeBatch6Early(part.id,seed,index),where).toEqual(q);
   if(q.structuredResponse){const pair=JSON.parse(String(solved));expect(correctAnswer(q,JSON.stringify([...pair].reverse())),where).toBe(true);}
   else expect(q.answer,where).toBe(String(solved));
   if(q.choices){expect(q.choices,where).toContain(q.answer);expect(new Set(q.choices).size,where).toBe(q.choices.length);expect(q.choices.filter(c=>correctAnswer(q,c)),where).toHaveLength(1);}
  }
 });
 it('preserves both linked subpart givens and their actual regrouping profiles',()=>{
  for(let seed=0;seed<200;seed++){
   for(const family of ['13','14']){const a=makeBatch6Early(`${family}a` as Batch6EarlyPart,seed),b=makeBatch6Early(`${family}b` as Batch6EarlyPart,seed);expect(a.context).toEqual(b.context);}
   const [large,gap]=nums(makeBatch6Early('13a',seed).context!.join(' ')),small=large-gap;
   expect(large%10).toBeLessThan(gap%10);expect(Math.floor(large/10)%10-1).toBeLessThan(Math.floor(gap/10)%10);
   for(const place of [1,10,100])expect(Math.floor(large/place)%10+Math.floor(small/place)%10).toBeLessThan(10);
   expect(large+small).toBeLessThan(1000);
   const [whole,sat]=nums(makeBatch6Early('14a',seed).context!.join(' ')),fri=whole-sat;
   expect(whole%10).toBeLessThan(sat%10);expect(Math.floor(whole/10)%10).toBeGreaterThan(0);expect(Math.floor(whole/10)%10-1).toBeLessThan(Math.floor(sat/10)%10);
   expect(fri%10).toBeLessThan(sat%10);expect(Math.floor(fri/10)%10-1).toBeGreaterThanOrEqual(Math.floor(sat/10)%10);
   expect(fri-sat).toBeGreaterThanOrEqual(10);expect(fri-sat).toBeLessThan(100);
   const [start,given]=nums(makeBatch6Early('9',seed).prompt);expect(Math.floor(start/10)%10).toBe(0);expect(start%10).toBeLessThan(given%10);
   const [a,b]=nums(makeBatch6Early('10',seed).prompt);for(const place of [1,10,100])expect(Math.floor(a/place)%10+Math.floor(b/place)%10).toBeLessThan(10);
  }
 });
 it('exposes two individual item selections and accepts either source-name order',()=>{
  for(let seed=0;seed<50;seed++){
   const q=makeBatch6Early('12',seed),spec=q.structuredResponse!,answer=JSON.parse(q.answer),html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:2}));
   expect(spec.kind).toBe('named-pair');expect(q.choices).toBeUndefined();expect(html).toContain('Select the two items.');expect(html.match(/aria-pressed="false"/g)).toHaveLength(4);
   expect(structuredResponseReady(spec,JSON.stringify([answer[0]]))).toBe(false);expect(structuredResponseReady(spec,JSON.stringify([answer[0],answer[0]]))).toBe(false);
   expect(correctAnswer(q,JSON.stringify([...answer].reverse()))).toBe(true);expect(correctAnswer(q,JSON.stringify([answer[0],answer[0]]))).toBe(false);
   expect(formatStructuredResponse(spec,q.answer)).toBe(answer.join(' and '));
   const facts=renderToStaticMarkup(createElement(PaperMaterials,{model:q.picture!}));for(const item of cards(q)){expect(facts).toContain(item.label);expect(facts).toContain(item.value);}
  }
 });
 it('retains all mixed money denominations, the hundred-cent exchange and two-place precision',()=>{
  for(let seed=0;seed<100;seed++){
   const q=makeBatch6Early('4',seed);if(q.picture?.type!=='pattern')throw Error('Money values missing');
   const rendered=renderToStaticMarkup(createElement(PaperMaterials,{model:q.picture})),tokens=[...rendered.matchAll(/<span>([^<]*)<\/span>/g)].map(m=>m[1]);
   expect(tokens.sort()).toEqual([...q.picture.items].sort());
   expect(q.picture.items.filter(s=>s.startsWith('$'))).toHaveLength(2);const coins=q.picture.items.filter(s=>s.endsWith('¢'));expect(coins).toHaveLength(5);expect(coins.reduce((n,s)=>n+Number(s.replace('¢','')),0)).toBe(100);
   expect(q.answer).toMatch(/^\$\d+\.00$/);expect(q.choices!.every(s=>/^\$\d+\.\d{2}$/.test(s))).toBe(true);
   expect(makeBatch6Early('8',seed).answer).toMatch(/^\d+\.\d{2}$/);
  }
 });
 it('keeps child-readable prose and explanations aligned with the final worked steps',()=>{
  for(const part of BATCH6_EARLY_PARTS)for(let seed=0;seed<30;seed++){
   const q=makeBatch6Early(part.id,seed),prose=[q.prompt,...q.context??[],q.hint,...q.workedSteps.map(s=>s.text)].join(' ');
   expect(prose).not.toMatch(/\b(?:from|to|of|at|in|by)\d|\d(?:minutes|cents)\b/);
   for(const step of q.workedSteps){expect(q.explanation).toContain(step.text);if(step.equation)expect(q.explanation).toContain(step.equation);}
   if(part.id==='1'){const html=renderToStaticMarkup(createElement(PaperMaterials,{model:q.picture!}));expect(html.match(/<line/g)!.length).toBe(62);}
  }
 });
});
