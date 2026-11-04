import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PaperAnswer} from '../PracticePapers';
import {showQuestionPicture} from '../answerDisplay';
import {describe,expect,it} from 'vitest';
import {makeBatch3Early,BATCH3_EARLY_PARTS,type Batch3EarlyQuestion} from './batch3Early';
import {correctAnswer} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const items=(q:Batch3EarlyQuestion)=>{
 if(q.picture?.type!=='pattern')throw Error('Missing visible cards');
 return q.picture.items;
};
/** Reads visible question content only; no answer, proof or worked-step dependence. */
export function solveBatch3Early(q:Batch3EarlyQuestion):string|number{
 if(q.display){
  const [divisor,quotient,remainder]=(q.display.match(/\d+/g)??[]).map(Number);
  const matches=Array.from({length:1000},(_,i)=>i).filter(value=>Math.floor(value/divisor)===quotient&&value%divisor===remainder);
  if(matches.length!==1)throw Error('Missing dividend is not unique');return matches[0];
 }
 const shown=items(q);
 if(q.order){
  // Independent integer comparison: all source-related denominators divide twelve.
  return [...shown].sort((a,b)=>{const [an,ad]=a.split('/').map(Number),[bn,bd]=b.split('/').map(Number);return an*(12/ad)-bn*(12/bd);}).join(',');
 }
 if(q.numberSentence){
  const values=shown.map(Number),solutions:string[]=[];
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)if(i!==j&&i!==k&&j!==k&&values[i]-values[j]===values[k])solutions.push(`${values[i]} - ${values[j]} = ${values[k]}`);
  if(solutions.length!==2)throw Error('Expect exactly the two related subtractions');
  return solutions[0];
 }
 const blank=shown.indexOf('?'),known=shown.map(Number),step=known[1]-known[0];
 // Recover using the later known term, independently of the generator's preceding-term construction.
 return known[blank+1]-step;
}

describe('Batch three early-primary configuration variants',()=>{
 it('uses existing representations for four reviewed source structures',()=>{
  expect(BATCH3_EARLY_PARTS).toHaveLength(4);
  for(const part of BATCH3_EARLY_PARTS){
   expect(part.sourceUnits[0].sourceQuestion).toBeTruthy();
   for(const skill of part.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
  }
 });
 it('independently solves 2400 original examples, including both valid subtraction sentences',()=>{
  for(const part of BATCH3_EARLY_PARTS)for(let seed=0;seed<150;seed++)for(let index=0;index<4;index++){
   const q=makeBatch3Early(part.id,seed,index),solved=solveBatch3Early(q),where=`${part.id}/${seed}/${index}`;
   expect(correctAnswer(q,String(solved)),where).toBe(true);
   if(q.numberSentence){
    const values=items(q).map(Number),whole=Math.max(...values),parts=values.filter(v=>v!==whole);
    expect(correctAnswer(q,`${whole} - ${parts[0]} = ${parts[1]}`),where).toBe(true);
    expect(correctAnswer(q,`${whole} - ${parts[1]} = ${parts[0]}`),where).toBe(true);
    expect(correctAnswer(q,`${parts[0]} - ${whole} = ${parts[1]}`),where).toBe(false);
    // Preserve source no-regrouping structure and exactly three distinct three-digit cards.
    expect(new Set(values).size,where).toBe(3);expect(values.every(v=>v>=100&&v<=999),where).toBe(true);
    for(const place of [1,10,100])expect(Math.floor(parts[0]/place)%10+Math.floor(parts[1]/place)%10,where).toBeLessThan(10);
   }else{
    expect(String(q.answer),where).toBe(String(solved));
    expect(correctAnswer(q,typeof solved==='number'?String(solved+1):String(solved).split(',').reverse().join(',')),where).toBe(false);
   }
   expect(q.workedSteps.length,where).toBeGreaterThan(1);
   expect(makeBatch3Early(part.id,seed,index),where).toEqual(q);
   expect(solveBatch3Early({...q,answer:'poison',hint:'',explanation:'',workedSteps:[],proof:987654}),where).toBe(solved);
  }
 });
 it('keeps the gap internal, all six terms three-digit, and the fraction ordering complete',()=>{
  for(let seed=0;seed<120;seed++){
   const gap=makeBatch3Early('increasing-gap',seed),shown=items(gap),missing=shown.indexOf('?');
   expect(missing).toBeGreaterThan(1);expect(missing).toBeLessThan(5);expect(shown).toHaveLength(6);
   expect(shown.filter(v=>v!=='?').every(v=>Number(v)>=100&&Number(v)<=999)).toBe(true);
   const fractions=makeBatch3Early('order-related-fractions',seed),cards=items(fractions);
   expect(cards).toHaveLength(3);expect(fractions.answer.split(',').sort()).toEqual([...cards].sort());
   expect(new Set(cards.map(f=>{const [a,b]=f.split('/').map(Number);return a/b;})).size).toBe(3);
   expect(new Set(cards.map(f=>f.split('/')[1])).size).toBe(3);
   expect(cards.every(f=>12%Number(f.split('/')[1])===0)).toBe(true);
  }
 });
 it('keeps every subtraction given visible in the actual paper answer controls',()=>{
  for(let seed=0;seed<30;seed++){
   const q=makeBatch3Early('three-card-subtraction',seed);
   expect(showQuestionPicture(q)).toBe(false); // The touch-card bank is the visible stimulus.
   const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:2}));
   expect(html).toContain('Use every number card once.');
   expect(html).not.toContain('Count the picture');
   expect(html).toContain('aria-label="Number cards"');
   expect(html.match(/aria-label="Place \d+"/g)).toHaveLength(3);
   for(const value of q.numberSentence!.numbers)expect(html).toContain(`aria-label="Place ${value}"`);
   expect(q.numberSentence!.freeEntry).not.toBe(true);
  }
 });
 it('keeps the dividend unknown and includes a valid nonzero remainder',()=>{
  for(let seed=0;seed<120;seed++){
   const q=makeBatch3Early('missing-dividend-remainder',seed),[divisor,quotient,remainder]=q.display!.match(/\d+/g)!.map(Number);
   expect(q.display).toMatch(/^□ ÷ /);expect(remainder).toBeGreaterThan(0);expect(remainder).toBeLessThan(divisor);
   expect(Number(q.answer)).toBeLessThan(1000);expect(Math.floor(Number(q.answer)/divisor)).toBe(quotient);
   expect(correctAnswer(q,String(divisor*quotient))).toBe(false);
  }
 });
});
