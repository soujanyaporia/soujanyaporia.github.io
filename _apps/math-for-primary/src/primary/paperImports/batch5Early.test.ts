import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {makeBatch5Early,BATCH5_EARLY_PARTS,type Batch5EarlyQuestion,type Batch5EarlyPart} from './batch5Early';
import {PaperMaterials} from '../PaperMaterials';
import {PaperAnswer} from '../PracticePapers';
import {showQuestionPicture} from '../answerDisplay';
import {correctAnswer} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+/g)?.map(Number)??[];
const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const total=(s:string)=>nums(s).reduce((a,b)=>a+b,0);
function counted(q:Batch5EarlyQuestion){
 if(!q.picture)throw Error('Missing countable source givens');
 const html=renderToStaticMarkup(createElement(PaperMaterials,{model:q.picture}));
 if(q.picture.type==='counters')return [(html.match(/<i\b/g)??[]).length];
 return html.split('class="paper-counting"').slice(1).map(row=>(row.match(/aria-label="Count this /g)??[]).length);
}
const unique=(values:number[])=>{if(values.length!==1)throw Error('Arithmetic constraint is not unique');return values[0];};
/** Reconstructs all answers from prompt/context, visible equation slots and rendered count objects. */
export function solveBatch5Early(q:Batch5EarlyQuestion,part:Batch5EarlyPart):string|number{
 if(part==='1'||part==='2'){const [count]=counted(q);return part==='2'?words[count]:count;}
 if(part==='3'||part.startsWith('4')){const [a,b]=counted(q);return part==='3'?(a>b?'A':'B'):part==='4a'?a:part==='4b'?b:part==='4c'?Math.min(a,b):Math.max(a,b);}
 if(part==='11'){
  const target=total(q.prompt),matches=q.choices!.filter(choice=>total(choice)===target);if(matches.length!==1)throw Error('Equivalent sum choice is not unique');return matches[0];
 }
 if(part==='6'){
  if(q.picture?.type!=='pattern')throw Error('Missing cards');const values=q.picture.items.map(Number),whole=Math.max(...values),parts=values.filter(v=>v!==whole);return `${parts[0]} + ${parts[1]} = ${whole}`;
 }
 if(part==='10'){const [a,b]=counted(q);return `${a+b} - ${a} = ${b}`;}
 if(part==='13'){
  if(q.picture?.type!=='pattern')throw Error('Missing sequence');const v=q.picture.items,blank=v.indexOf('?'),step=Number(v[1])-Number(v[0]);return Number(v[blank+1])-step;
 }
 if(part==='12'){const [whole,removed]=nums(q.prompt);return unique(Array.from({length:11},(_,i)=>i).filter(left=>left+removed===whole));}
 if(q.display){
  const [first,second]=nums(q.display),pool=Array.from({length:11},(_,i)=>i);
  if(part==='5')return unique(pool.filter(answer=>answer-first===second));
  if(part==='7')return unique(pool.filter(answer=>first+answer===second));
  if(part==='8')return unique(pool.filter(answer=>answer+second===first));
  return unique(pool.filter(answer=>first-answer===second));
 }
 const [first,second]=nums(q.context![0]+(q.context![1]??'')),missing=part.startsWith('16'),answer=unique(Array.from({length:11},(_,i)=>i).filter(value=>missing?value+second===first:value-first===second));
 return part.endsWith('equation')?`${first} ${missing?'-':'+'} ${second} = ${answer}`:answer;
}

describe('Complete early-P1 whole-paper configurations',()=>{
 it('accounts for all16 numbered questions and22 response units with valid objectives',()=>{
  expect(BATCH5_EARLY_PARTS).toHaveLength(22);expect(new Set(BATCH5_EARLY_PARTS.map(p=>p.id)).size).toBe(22);
  expect(new Set(BATCH5_EARLY_PARTS.map(p=>parseInt(p.id))).size).toBe(16);
  for(const p of BATCH5_EARLY_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves6600 responses from visible givens, including every valid equation form',()=>{
  for(const part of BATCH5_EARLY_PARTS)for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=makeBatch5Early(part.id,seed,index),solved=solveBatch5Early(q,part.id),where=`${part.id}/${seed}/${index}`;
   expect(correctAnswer(q,String(solved)),where).toBe(true);expect(q.workedSteps.length,where).toBeGreaterThan(1);
   expect(solveBatch5Early({...q,answer:'poison',proof:987654,workedSteps:[],explanation:'',hint:''},part.id),where).toBe(solved);
   expect(makeBatch5Early(part.id,seed,index),where).toEqual(q);
   if(q.numberSentence){
    const vals=q.numberSentence.numbers;
    if(!q.numberSentence.missingResult){
     const whole=Math.max(...vals),parts=vals.filter(v=>v!==whole),op=q.numberSentence.operation;
     expect(correctAnswer(q,op==='+'?`${parts[1]} + ${parts[0]} = ${whole}`:`${whole} - ${parts[1]} = ${parts[0]}`),where).toBe(true);
    }
    expect(correctAnswer(q,'99 + 99 = 198'),where).toBe(false);
   }else expect(q.answer,where).toBe(String(solved));
  }
 });
 it('preserves shared givens for all four comparison fields and linked story responses',()=>{
  for(let seed=0;seed<50;seed++){
   const compare=['4a','4b','4c','4d'].map(id=>makeBatch5Early(id as Batch5EarlyPart,seed));expect(compare.every(q=>JSON.stringify(q.picture)===JSON.stringify(compare[0].picture))).toBe(true);
   for(const group of ['14','15','16']){
    const a=makeBatch5Early(`${group}-equation` as Batch5EarlyPart,seed),b=makeBatch5Early(`${group}-answer` as Batch5EarlyPart,seed);expect(a.context!.slice(0,-1)).toEqual(b.context);
   }
  }
 });
 it('keeps all counted figures and card givens visible in the actual exam controls',()=>{
  for(const id of ['1','2','3','4a','4b','4c','4d','5','8','9','10'] as const)for(let seed=0;seed<10;seed++){
   const q=makeBatch5Early(id,seed);expect(showQuestionPicture(q)).toBe(true);
   const html=renderToStaticMarkup(createElement(PaperMaterials,{model:q.picture!}));expect(html).toContain('paper-maths-figure');expect(html).not.toContain('undefined');
   if(id==='10'){
    const answer=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:1}));expect(answer).toContain('Count the picture');expect(counted(q)).toHaveLength(2);
   }
  }
  const cards=makeBatch5Early('6',41),html=renderToStaticMarkup(createElement(PaperAnswer,{question:cards,value:'',onChange:()=>{},level:1}));
  expect(showQuestionPicture(cards)).toBe(false);expect(html.match(/aria-label="Place \d+"/g)).toHaveLength(3);expect(html).not.toContain('Count the picture');
 });
 it('retains the early number range and the source’s explicit short pattern exception',()=>{
  for(const part of BATCH5_EARLY_PARTS)for(let seed=0;seed<50;seed++){
   const q=makeBatch5Early(part.id,seed),numbers=[...nums(q.display??''),...nums(q.context?.join(' ')??''),...(q.numberSentence?.numbers??[])];
   expect(numbers.every(n=>n<=10)).toBe(true);
   if(q.choices&&part.id==='11')expect(q.choices.every(c=>total(c)<=10)).toBe(true);
   if(q.picture?.type==='counters')expect(q.picture.count).toBeLessThanOrEqual(10);
   if(part.id==='13'){expect(q.picture?.type).toBe('pattern');if(q.picture?.type==='pattern')expect(q.picture.items.filter(v=>v!=='?').every(v=>Number(v)<=12)).toBe(true);}
  }
 });
});
