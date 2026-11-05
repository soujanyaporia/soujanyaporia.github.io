import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {makeBatch7Early,BATCH7_EARLY_PARTS,BATCH7_EARLY_MAPPING_STATUS} from './batch7Early';
import {correctAnswer,type Question} from '../generate';
import {responseReady} from '../answerFormat';
import {Picture} from '../Picture';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+/g)?.map(Number)??[];
const only=<T,>(values:T[])=>{if(values.length!==1)throw Error('Visible constraints must have exactly one solution');return values[0];};
const permutations=(xs:string[]):string[][]=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];

/** Small independent reconstruction from visible text, choices and actual clock-hand geometry. */
export function solveBatch7Early(q:Question,part:string):string|number{
 const text=(q.context??[]).join(' '),n=nums(text);
 if(part==='race-first'){
  const ahead=text.match(/(\w+) is ahead of (\w+)/)!,behind=text.match(/(\w+) is behind (\w+)/)!,last=text.match(/(\w+) is last/)![1];
  const order=only(permutations(q.choices!).filter(p=>p.indexOf(ahead[1])<p.indexOf(ahead[2])&&p.indexOf(behind[1])>p.indexOf(behind[2])&&p.at(-1)===last));return order[0];
 }
 if(part==='queue-total')return [...Array(n[0]).fill('child'),'Nila',...Array(n[1]).fill('child'),'Omar'].length;
 if(part==='transfer-equal')return only(Array.from({length:n[0]+1},(_,moved)=>moved).filter(moved=>n[0]-moved===n[1]+moved));
 if(part==='fewest-notes'){
  const amount=nums(q.prompt)[0],cost=[0];
  for(let value=1;value<=amount;value++)cost[value]=Math.min(...n.filter(note=>note<=value).map(note=>(cost[value-note]??Infinity)+1));
  return cost[amount];
 }
 if(part==='digit-riddle')return only(Array.from({length:90},(_,i)=>i+10).filter(value=>Math.floor(value/10)+value%10===n[0]&&value%10-Math.floor(value/10)===n[1]));
 if(part==='animal-legs'){
  let legs=0;for(let cow=0;cow<n[0];cow++)for(let leg=0;leg<n[2];leg++)legs++;
  for(let duck=0;duck<n[1];duck++)for(let leg=0;leg<n[3];leg++)legs++;return legs;
 }
 if(part==='alternating-pattern'){
  const terms=q.display!.split(', ').map(value=>value==='?'?null:Number(value)),up=terms[1]!-terms[0]!,down=terms[2]!-terms[1]!,expected=[terms[0]!];
  for(let i=1;i<terms.length;i++)expected.push(expected.at(-1)!+(i%2?up:down));
  if(!terms.every((term,i)=>term===null||term===expected[i]))throw Error('Inconsistent alternating pattern');return expected[terms.indexOf(null)];
 }
 if(part==='purchase-bonus'){
  let bought=n[2],gifts=0;while(bought>0){bought-=n[0];gifts+=n[1];}if(bought!==0)throw Error('Incomplete offer group');return gifts;
 }
 if(part==='equal-after-giving'){
  const remaining=only(Array.from({length:n[0]+1},(_,value)=>value).filter(value=>value+n[1]===n[0]));return [...Array(remaining),...Array(remaining)].length;
 }
 if(part==='repack-share'){
  const toys:number[]=[];for(let box=0;box<n[0];box++)for(let toy=0;toy<n[1];toy++)toys.push(1);
  const shares=Array(n[2]).fill(0);toys.forEach((toy,i)=>{shares[i%shares.length]+=toy;});if(!shares.every(count=>count===shares[0]))throw Error('Unequal shares');return shares[0];
 }
 if(part==='fraction-given-away')return `${only(Array.from({length:n[0]},(_,i)=>i).filter(given=>given+n[1]===n[0]))}/${n[0]}`;
 if(part==='start-from-clock'){
  if(q.picture?.type!=='clock')throw Error('Missing necessary finish clock');
  const html=renderToStaticMarkup(createElement(Picture,{model:q.picture})),hands=[...html.matchAll(/<line x1="150" y1="123" x2="([\d.eE+-]+)" y2="([\d.eE+-]+)"/g)];
  if(hands.length!==2)throw Error('Clock needs two visible hands');
  const angle=(hand:RegExpMatchArray)=>(Math.atan2(Number(hand[1])-150,123-Number(hand[2]))*180/Math.PI+360)%360;
  const minute=Math.round(angle(hands[1])/6)%60,hour=Math.floor((angle(hands[0])+1e-7)/30)%12;let start=hour*60+minute;
  for(let elapsed=0;elapsed<n[0];elapsed++)start--;return `${Math.floor(start/60)%12||12}:${String(start%60).padStart(2,'0')} am`;
 }
 throw Error(`No visible-input solver for ${part}`);
}

describe('Implementation-first P1–P2 pattern expansion',()=>{
 it('declares twelve configurations and explicitly unaudited source inspirations',()=>{
  expect(BATCH7_EARLY_PARTS).toHaveLength(12);expect(BATCH7_EARLY_PARTS.filter(p=>p.level===1)).toHaveLength(6);expect(BATCH7_EARLY_PARTS.filter(p=>p.level===2)).toHaveLength(6);
  expect(new Set(BATCH7_EARLY_PARTS.map(p=>p.canonicalPatternId)).size).toBe(12);
  for(const p of BATCH7_EARLY_PARTS){expect(p.sourceMappingStatus).toBe(BATCH7_EARLY_MAPPING_STATUS);expect(p.sourceUnits).toHaveLength(1);expect(p.sourceUnits[0].sourcePage).toBeGreaterThan(0);for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);}
  expect(()=>makeBatch7Early('missing',0)).toThrow(/Unknown/);
 });
 it('solves a bounded thirty-seed smoke sample for every original configuration',()=>{
  for(const part of BATCH7_EARLY_PARTS)for(let seed=0;seed<30;seed++){
   const index=seed%3,q=makeBatch7Early(part.id,seed,index),solved=solveBatch7Early(q,part.id),where=`${part.id}/${seed}/${index}`;
   expect(correctAnswer(q,String(solved)),where).toBe(true);expect(correctAnswer(q,'__wrong__'),where).toBe(false);expect(responseReady(q,q.answer),where).toBe(true);
   expect(q,where).toEqual(makeBatch7Early(part.id,seed,index));expect(q.workedSteps!.length,where).toBeGreaterThanOrEqual(2);
   expect(q.explanation,where).toBe(q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '));
   expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);expect(q.prompt.split(/\s+/).length,where).toBeLessThanOrEqual(35);
   if(q.choices){expect(new Set(q.choices).size,where).toBe(q.choices.length);expect(q.choices.filter(c=>c===q.answer),where).toHaveLength(1);}
   if(part.level===1&&/^\d+$/.test(q.answer))expect(Number(q.answer),where).toBeLessThanOrEqual(100);
  }
 });
 it('keeps all givens in child-readable text and uses only the necessary clock figure',()=>{
  for(const p of BATCH7_EARLY_PARTS){
   const q=makeBatch7Early(p.id,17),text=[q.prompt,...q.context??[],q.hint,...q.workedSteps!.map(s=>s.text)].join(' ');
   expect(text).not.toMatch(/\b(?:from|to|of|has|are)\d|\d(?:minutes|children|toys|notes)\b/);
   expect(!!q.picture).toBe(p.id==='start-from-clock');
   expect(solveBatch7Early({...q,answer:'poisoned',proof:999,explanation:'poisoned',workedSteps:[{text:'poisoned'}]},p.id)).toEqual(solveBatch7Early(q,p.id));
  }
  const q=makeBatch7Early('fraction-given-away',17),[n,d]=q.answer.split('/').map(Number);expect(correctAnswer(q,`${n*2}/${d*2}`)).toBe(true);
 });
});
