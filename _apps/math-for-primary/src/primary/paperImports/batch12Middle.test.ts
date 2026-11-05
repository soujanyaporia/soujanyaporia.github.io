import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {makeBatch12Middle,BATCH12_MIDDLE_PARTS} from './batch12Middle';
import {correctAnswer,type Question} from '../generate';
import {responseReady} from '../answerFormat';
import {shownAnswer} from '../answerDisplay';
import {PaperAnswer} from '../PracticePapers';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const tokens=(s:string):string[]=>s.match(/\d+(?:\.\d+)?/g)??[];
/** Read a visible decimal exactly as an integer multiple of the requested small unit. */
function smallUnit(text:string,places:number){const [whole,part='']=text.split('.');if(part.length>places)throw Error('Visible value exceeds expected precision');return Number(whole)*10**places+Number(part.padEnd(places,'0'));}
const one=<T,>(values:T[])=>{if(values.length!==1)throw Error(`Visible task has ${values.length} solutions`);return values[0];};
const result=(a:number,b:number,scale=1)=>JSON.stringify([String(a/scale),String(b/scale)]);
/** Solve only the public shared givens and subquestions, without answer/proof/steps/hint. */
export function solveBatch12Middle(q:Question,part:string):string{
 const c=q.context??[];
 if(part==='coin-shortfall'){
  const [fifty,twenty]=tokens(c[0]).map(Number),short=smallUnit(tokens(c[1])[0],2);let cash=0;for(let i=0;i<fifty;i++)cash+=50;for(let i=0;i<twenty;i++)cash+=20;return result(cash,cash+short,100);
 }
 if(part==='compare-shortfall'){
  const [file,pen]=tokens(c[0]),folder=smallUnit(file,2),penCents=Number(pen),cash=Number(tokens(c[1])[0])*100;return result(folder-penCents,folder+penCents-cash,100);
 }
 if(part==='compound-mass-share'){
  const [count,kilograms,grams]=tokens(c[0]).map(Number),box=Number(tokens(c[1])[0]);let total=grams;for(let i=0;i<kilograms;i++)total+=1000;const contents=total-box;
  const mass=one(Array.from({length:contents+1},(_,candidate)=>candidate).filter(candidate=>candidate*count===contents));return result(contents,mass);
 }
 if(part==='working-hours'){
  const times=[...c[0].matchAll(/(\d{2}):00/g)].map(m=>Number(m[1])),[days,weeks]=tokens(c[1]).map(Number);let hours=0;for(let hour=times[0];hour<times[1];hour++)hours++;let total=0;for(let week=0;week<weeks;week++)for(let day=0;day<days;day++)for(let hour=0;hour<hours;hour++)total++;return result(hours,total);
 }
 if(part==='shared-mass-totals'){
  const [ab,bc,abc]=c.map(text=>smallUnit(tokens(text)[0],1)),b=one(Array.from({length:Math.min(ab,bc)+1},(_,value)=>value).filter(value=>(ab-value)+value+(bc-value)===abc));return result(b,ab-b,10);
 }
 if(part==='ribbon-change'){
  const initial=Number(tokens(c[0])[0]),[cut,final]=tokens(c[1]),removed=smallUnit(cut,1),multiple=Number(final),now=one(Array.from({length:5001},(_,n)=>n).filter(short=>short>0&&initial*(short+removed)===multiple*short));return result(now,(initial+1)*(now+removed),10);
 }
 if(part==='bakery-bills'){
  const [small,paidA]=tokens(c[0]),[large,paidB]=tokens(c[1]),a=smallUnit(paidA,2),b=smallUnit(paidB,2),firstCount=Number(small),lastCount=Number(large),valid:{bun:number;cake:number}[]=[];
  for(let bun=1;bun<a; bun++){const cake=a-firstCount*bun;if(cake>0&&cake+lastCount*bun===b)valid.push({bun,cake});}const chosen=one(valid);return result(firstCount*chosen.bun,2*chosen.cake,100);
 }
 if(part==='fraction-repack'){
  const [start,used,denominator]=tokens(c[0]),total=smallUnit(start,3),parts=Number(denominator),left=Number(denominator)-Number(used),packets=Number(tokens(c[1])[0]);
  if(total%parts)throw Error('Cannot split into equal gram portions');let remaining=0;for(let piece=0;piece<left;piece++)remaining+=total/parts;let perPacket=0,rest=remaining;while(rest>=packets){rest-=packets;perPacket++;}if(rest!==0)throw Error('Unequal repacking');return result(remaining,perPacket,1000);
 }
 throw Error(`Missing independent visible-givens solver for ${part}`);
}

describe('Batch12 linked P3/P4 everyday source tasks',()=>{
 it('declares four tasks per level, exact selected subparts and valid curriculum skills',()=>{
  expect(BATCH12_MIDDLE_PARTS).toHaveLength(8);for(const level of [3,4])expect(BATCH12_MIDDLE_PARTS.filter(p=>p.level===level)).toHaveLength(4);
  for(const part of BATCH12_MIDDLE_PARTS){expect(part.sourceUnits[0].sourceQuestion).toContain('(a),(b)');expect(part.sourceUnits[0].sourcePage).toBeGreaterThan(0);for(const id of part.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===id),id).toBe(true);}
 });
 it('independently solves20seeds per task, with two ordered answers and all shared givens retained',()=>{
  for(const part of BATCH12_MIDDLE_PARTS)for(let seed=0;seed<20;seed++){
   const index=seed%3,q=makeBatch12Middle(part.id,seed,index),where=`${part.id}/${seed}/${index}`,solved=solveBatch12Middle(q,part.id),pair=JSON.parse(solved)as string[];
   expect(correctAnswer(q,solved),where).toBe(true);expect(responseReady(q,solved),where).toBe(true);expect(responseReady(q,''),where).toBe(false);expect(responseReady(q,JSON.stringify([pair[0],''])),where).toBe(false);expect(correctAnswer(q,JSON.stringify([pair[0],String(Number(pair[1])+1)])),where).toBe(false);
   expect(q,where).toEqual(makeBatch12Middle(part.id,seed,index));expect(q.key,where).toBe(`batch12-middle-${part.id}:${seed}:${index}`);expect(q.prompt,where).toContain('(a)');expect(q.prompt,where).toContain('(b)');expect(q.context!.length,where).toBeGreaterThanOrEqual(2);expect(q.workedSteps!.length,where).toBeGreaterThanOrEqual(2);expect(JSON.stringify(q),where).not.toMatch(/NaN|undefined|Infinity/);expect(q.explanation,where).toBe(q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '));
   const hidden={...q,answer:'hidden',hint:'hidden',proof:999,explanation:'hidden',workedSteps:[{text:'hidden'}]};expect(solveBatch12Middle(hidden,part.id),where).toBe(solved);
   if(pair[0]!==pair[1])expect(correctAnswer(q,JSON.stringify(pair.reverse())),where).toBe(false);
  }
 });
 it('renders the two real subpart fields with decimal entry where needed and readable answer labels',()=>{
  for(const part of BATCH12_MIDDLE_PARTS){const q=makeBatch12Middle(part.id,37),spec=q.structuredResponse;if(spec?.kind!=='number-pair')throw Error('Missing paired fields');const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:part.level}));
   expect((html.match(/<input /g)??[]).length).toBe(2);expect(html).toContain(spec.firstLabel.replaceAll('&','&amp;'));expect(html).toContain(spec.secondLabel.replaceAll('&','&amp;'));expect(html).toContain(`inputMode="${spec.decimal?'decimal':'numeric'}"`);
   const shown=shownAnswer(q,q.answer);expect(shown).toContain('(a)');expect(shown).toContain('(b)');expect(shown).not.toContain('["');
  }
 });
 it('keeps currency exact to cents and distinguishes comparison from shortfall',()=>{
  for(let seed=0;seed<20;seed++)for(const id of ['coin-shortfall','compare-shortfall','bakery-bills']){
   const q=makeBatch12Middle(id,seed),answers=JSON.parse(q.answer)as string[];for(const a of answers){expect(a).toMatch(/^\d+\.\d{2}$/);expect(Number(a)).toBeGreaterThan(0);}expect(correctAnswer(q,JSON.stringify(answers.map(a=>String(Number(a)))))).toBe(true);
  }
  const fixture:Question={...makeBatch12Middle('compare-shortfall',1),context:['A folder costs $2.15. A pen costs 65 cents.','Ben has 2 $1 coins and no other money. He wants both items.']};expect(JSON.parse(solveBatch12Middle(fixture,'compare-shortfall'))).toEqual(['1.5','0.8']);
 });
 it('preserves unchanged-ribbon logic and three-place packet precision rather than rounding away a response',()=>{
  const packetPrecisions=new Set<number>();for(let seed=0;seed<20;seed++){
   const ribbon=makeBatch12Middle('ribbon-change',seed);expect(ribbon.context![1]).toContain('Ribbon A was not changed');const packet=makeBatch12Middle('fraction-repack',seed),a=JSON.parse(packet.answer)as string[];packetPrecisions.add((a[1].split('.')[1]??'').length);expect(tokens(packet.context![0])[0]).toMatch(/^\d+(?:\.\d{1,2})?$/);expect(correctAnswer(packet,solveBatch12Middle(packet,'fraction-repack'))).toBe(true);
  }
  expect(packetPrecisions.has(3)).toBe(true);
  const fixture:Question={...makeBatch12Middle('ribbon-change',1),context:['At first, Ribbon A was 2 times as long as Ribbon B.','71.2 cm was cut from Ribbon B. Ribbon A was not changed. Ribbon A is now 6 times as long as Ribbon B.']};expect(JSON.parse(solveBatch12Middle(fixture,'ribbon-change'))).toEqual(['35.6','320.4']);
 });
});
