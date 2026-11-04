import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Activity} from '../catalog';
import {correctAnswer,type Question} from '../generate';
import {Picture} from '../Picture';
import {NumberSentence} from '../NumberSentence';
import {GroupingBuilder} from '../GroupingBuilder';
import {validGrouping,groupingValue} from '../groupingAnswer';
import {P2_HENRY_PARK_2025_PATTERNS,P2_HENRY_PARK_2025_SOURCE} from './p2HenryPark2025Meta';
import {makeP2HenryPark2025Question,makeP2HenryPark2025Set,type P2ImportedQuestion} from './p2HenryPark2025';
const activity=(parameter:string):Activity=>({...P2_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter===parameter)!,id:`p2s-paper-${parameter}`,kind:'paper',track:'standard'});
const ints=(s:string)=>s.match(/\d+/g)?.map(Number)??[];
const assert:(condition:unknown,message:string)=>asserts condition=(condition,message)=>{if(!condition)throw Error(message);};
/** Reconstructs only from visible question facts. Never reads answer, proof, solution or hidden builder card pools. */
export function solveP2Imported(q:Question|P2ImportedQuestion,parameter:string):string|number{
 const id=parameter.replace(/^hp2q2-/,''),pic=q.picture;
 const cards=pic?.type==='paper'&&pic.layout==='cards'?pic.cards:[];
 const vals=cards.map(c=>Number(c.value)),groupCount=cards.length,groupSize=cards[0]?.count??0;
 const display=q.display??'',context=q.context??[];
 if(id==='01')return `${groupSize} groups of ${groupCount}`;
 if(id==='02'||id==='11')return vals[0]/vals[1];
 if(id==='03')return vals[0]*vals[1];
 if(id==='04'){
  assert(pic?.type==='pattern','Need symbolic product');const product=Number(pic.items.at(-1));
  const candidates=Array.from({length:101},(_,n)=>n).filter(n=>n>0&&n*n===product);assert(candidates.length===1,'Unique positive factor required');return candidates[0];
 }
 if(id==='05'){const [a,b]=cards.map(c=>ints(c.value));return a[0]*a[1]-b[0]*b[1];}
 if(id==='06'){
  const [a,b,c]=ints(display);const answers=[['+',a+b],['−',a-b],['×',a*b],['÷',a/b]].filter(([,n])=>n===c);assert(answers.length===1,'Operation must be unique');assert(groupCount*groupSize===a,'All objects must match the starting quantity');return answers[0][0] as string;
 }
 if(id==='07'||id==='10'){
  const total=vals[0],target=ints(q.prompt)[0],size=id==='07'?target:total/target;
  assert(Number.isInteger(size),'Equal groups must be possible');
  // Striped partition, deliberately different from the generator's contiguous example.
  const count=total/size;return groupingValue(Array.from({length:count},(_,g)=>Array.from({length:size},(_,i)=>g+i*count)));
 }
 if(id==='08'){assert(pic?.type==='pattern','Need division sentence');return Number(pic.items[2])*Number(pic.items[4]);}
 if(id==='09'){const [known,total]=ints(cards[0].value),[multiplier]=ints(cards[1].value);return total/known*multiplier;}
 if(id.startsWith('12-'))return id.endsWith('multiply')?`${groupSize} * ${groupCount} = ${groupSize*groupCount}`:`${groupSize*groupCount} / ${groupSize} = ${groupCount}`;
 if(id.startsWith('13-a')){const [total,per]=ints(display);return id.endsWith('divisor')?total/per:per/total;}
 if(id==='13-b')return vals[0]/vals[1];
 if(id==='14')return (vals[0]+vals[1])*vals[2];
 if(id.startsWith('15-')){
  const actual=groupCount*groupSize,number=ints(context[0])[0];
  return (id==='15-total'?actual===number:actual%(number+(id==='15-friends'?1:0))===0)?'True':'False';
 }
 if(id==='16')return vals[0]*vals[1]-vals[2];
 if(/^(17|18|19-[ab])-(equation|answer)$/.test(id)){
  let a:number,b:number,op:'*'|'/',answer:number;
  if(id.startsWith('17')){[a,b]=vals;op='/';answer=a/b;}
  else if(id.startsWith('18')){[a,b]=vals;op='*';answer=a*b;}
  else if(id.startsWith('19-a')){a=vals[1];b=vals[0];op='/';answer=a/b;}
  else{a=vals[0];b=vals[2];op='*';answer=a*b;}
  return id.endsWith('equation')?`${a} ${op} ${b} = ${answer}`:answer;
 }
 throw Error(`No independent visible-facts solver for ${id}`);
}

describe('Complete P2 source-pattern adaptation',()=>{
 it('accounts for every question and response without counting response variants as new patterns',()=>{
  expect(P2_HENRY_PARK_2025_SOURCE.numberedQuestions).toBe(19);
  expect(P2_HENRY_PARK_2025_PATTERNS).toHaveLength(29);
  expect(new Set(P2_HENRY_PARK_2025_PATTERNS.flatMap(p=>p.sourceParts)).size).toBe(29);
  expect(P2_HENRY_PARK_2025_PATTERNS.filter(p=>!/(17|18|19-[ab])-equation$/.test(p.parameter))).toHaveLength(25);
  expect(new Set(P2_HENRY_PARK_2025_PATTERNS.map(p=>p.canonicalPatternId)).size).toBe(17);
 });
 for(const pattern of P2_HENRY_PARK_2025_PATTERNS)it(`solves ${pattern.parameter} from the displayed facts across 250 seeds`,()=>{
  const a=activity(pattern.parameter);for(let seed=0;seed<250;seed++){
   const q=makeP2HenryPark2025Question(a,seed,seed%7),solved=String(solveP2Imported(q,pattern.parameter));
   expect(q,`${pattern.parameter}:${seed}`).toEqual(makeP2HenryPark2025Question(a,seed,seed%7));
   expect(q.grouping?validGrouping(q.grouping,solved):correctAnswer(q,solved),`${pattern.parameter}:${seed} solved ${solved}; stored ${q.answer}`).toBe(true);
   expect(q.workedSteps.length).toBeGreaterThanOrEqual(2);expect(q.hint.length).toBeGreaterThan(10);
   expect(q.grouping?validGrouping(q.grouping,'[[0]]'):correctAnswer(q,'999999')).toBe(false);
   if(q.choices){expect(new Set(q.choices).size).toBe(q.choices.length);expect(q.choices).toContain(q.answer);expect(q.choices.filter(c=>correctAnswer(q,c))).toHaveLength(1);}
   if(q.picture.type==='paper'&&q.picture.layout==='cards')for(const card of q.picture.cards)if(card.count!==undefined)expect(card.count).toBeLessThanOrEqual(12);
   if(!q.numberSentence&&!q.choices&&!q.grouping){expect(Number(q.answer)).toBeGreaterThanOrEqual(0);expect(Number(q.answer)).toBeLessThanOrEqual(100);}
  }
 });
 it('keeps linked diagrams and story givens identical across paired responses',()=>{
  for(const seed of [0,17,7919,15841,0xffffffff]){
   const all=makeP2HenryPark2025Set(seed),get=(id:string)=>all.find(x=>x.pattern.parameter===`hp2q2-${id}`)!.question;
   for(const [a,b] of [['12-multiply','12-divide'],['13-a-factor','13-a-divisor'],['15-total','15-friends'],['15-friends','15-children'],['17-equation','17-answer'],['18-equation','18-answer'],['19-a-equation','19-a-answer'],['19-b-equation','19-b-answer']])expect(get(a).picture).toEqual(get(b).picture);
   expect(get('19-a-answer').context?.[0]).toBe(get('19-b-answer').context?.[0]);
  }
 });
 it('renders every adapted figure and response without giving away free-entry construction counts',()=>{
  for(const seed of [0,17,7919])for(const {pattern,question:q} of makeP2HenryPark2025Set(seed)){
   const html=renderToStaticMarkup(createElement(Picture,{model:q.picture}));expect(html.length).toBeGreaterThan(50);expect(html).not.toMatch(/NaN|undefined/);
   if(q.numberSentence){const response=renderToStaticMarkup(createElement(NumberSentence,{spec:q.numberSentence,value:'',onChange:()=>{}}));
    if(q.numberSentence.freeEntry){expect(response).not.toContain('Number cards');expect(response).not.toContain(`Place ${q.numberSentence.numbers.at(-1)}`);expect((response.match(/<input/g)??[]).length).toBe(3);}
    expect(response).not.toContain('Use addition');
   }
   if(q.grouping){const response=renderToStaticMarkup(createElement(GroupingBuilder,{spec:q.grouping,value:'',onChange:()=>{}}));expect((response.match(/aria-label="Select gift /g)??[]).length).toBe(q.grouping.total);expect(response).not.toContain('Group 1</legend>');}
   expect(pattern.coverage).toBe('complete');
  }
 });
});
