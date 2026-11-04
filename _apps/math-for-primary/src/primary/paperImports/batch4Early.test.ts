import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {makeBatch4Early,BATCH4_EARLY_PARTS,type Batch4EarlyQuestion} from './batch4Early';
import {Batch4EarlyDiagram} from './batch4EarlyDiagram';
import type {Batch4EarlyPicture} from './batch4EarlyPicture';
import {PaperAnswer} from '../PracticePapers';
import {correctAnswer} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const sum=(expression:string)=>expression.match(/\d+/g)!.map(Number).reduce((a,b)=>a+b,0);
const svg=(q:Batch4EarlyQuestion)=>{
 if(q.picture?.type!=='batch4-early')throw Error('Missing mathematical pictograph');
 return renderToStaticMarkup(createElement(Batch4EarlyDiagram,{model:q.picture}));
};
/** Independent visible-givens solver: choice text, story constraints, drawn glyphs and clock counting. */
export function solveBatch4Early(q:Batch4EarlyQuestion):string|number{
 if(q.choices){
  const target=q.prompt.includes('same answer')?sum(q.prompt):Number(q.prompt.match(/\d+/)![0]);
  const matches=q.choices.filter(choice=>sum(choice)===target);
  if(matches.length!==1)throw Error('Need exactly one correct expression');return matches[0];
 }
 if(q.picture){
  const html=svg(q),scale=Number(html.match(/data-legend-scale="true">(\d+)</)![1]),rows=[...html.matchAll(/<div data-pictograph-row="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)];
  const requested=rows.filter(row=>q.prompt.toLowerCase().includes(row[1].toLowerCase()));
  if(requested.length!==2)throw Error('Must identify exactly two requested categories');
  const values=requested.map(row=>{
   const whole=(row[2].match(/data-whole-symbol="true"/g)??[]).length,halves=(row[2].match(/data-half-symbol="true"/g)??[]).length;
   // Expand each rendered glyph into its represented objects; half glyphs retain their objects.
   return [...Array(whole).fill(scale),...Array(halves).fill(scale/2)].flatMap(n=>Array(n).fill(1)).length;
  });
  return q.prompt.includes('altogether')?values.reduce((a,b)=>a+b,0):Math.abs(values[0]-values[1]);
 }
 if(q.prompt.includes('blue counters')){
  const total=Number(q.context![0].match(/\d+/)![0]),difference=Number(q.context![1].match(/\d+/)![0]),matches:number[]=[];
  for(let blue=0;blue<=20;blue++)for(let red=0;red<=20;red++)if(red+blue===total&&red-blue===difference)matches.push(blue);
  if(matches.length!==1)throw Error('Whole-number group counts are not unique');return matches[0];
 }
 const t=q.prompt.match(/(\d+):(\d+) am/)!,duration=Number(q.prompt.match(/takes (\d+) minutes/)![1]);
 let hour=Number(t[1]),minute=Number(t[2]);
 for(let elapsed=0;elapsed<duration;elapsed++){minute++;if(minute===60){minute=0;hour++;}}
 return `${hour}:${String(minute).padStart(2,'0')} am`;
}

describe('Batch four early-primary reusable configurations',()=>{
 it('registers six variants with complete exact source identities and valid skills',()=>{
  expect(BATCH4_EARLY_PARTS).toHaveLength(6);
  for(const part of BATCH4_EARLY_PARTS){expect(part.sourceUnits[0].paperId).toHaveLength(16);expect(part.sourceUnits[0].sourcePage).toBeGreaterThan(0);for(const skill of part.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);}
 });
 it('independently solves 3600 numeric and expression responses and checks the shared grader',()=>{
  for(const part of BATCH4_EARLY_PARTS)for(let seed=0;seed<150;seed++)for(let index=0;index<4;index++){
   const q=makeBatch4Early(part.id,seed,index),solved=solveBatch4Early(q),where=`${part.id}/${seed}/${index}`,{picture,workedSteps,...plain}=q;
   expect(q.answer,where).toBe(String(solved));expect(correctAnswer(plain,String(solved)),where).toBe(true);
   expect(correctAnswer(plain,typeof solved==='number'?String(solved+1):'incorrect expression'),where).toBe(false);
   expect(makeBatch4Early(part.id,seed,index),where).toEqual(q);
   expect(solveBatch4Early({...q,answer:'poison',explanation:'poison',hint:'',workedSteps:[],proof:7654321}),where).toBe(solved);
   expect(workedSteps.length,where).toBeGreaterThan(1);
   if(q.choices)expect(q.choices.filter(choice=>correctAnswer(plain,choice)),where).toHaveLength(1);
   if(part.id==='total-difference-smaller')expect(Number(q.context![0].match(/\d+/)![0]),where).toBeLessThanOrEqual(20);
  }
 });
 it('renders legible native-size rows and the actual half symbols and keeps a half worth two objects when the whole is four',()=>{
  for(let seed=0;seed<50;seed++){
   const q=makeBatch4Early('half-symbol-pair-total',seed),m=q.picture as Batch4EarlyPicture,html=svg(q);
   expect(html.match(/data-pictograph-row=/g)).toHaveLength(4);expect(html.match(/data-half-symbol=/g)).toHaveLength(2);
   expect(html).toContain('Each whole symbol represents');expect(html).toContain('data-legend-scale="true">4<');expect(html).toContain('role="img"');
   expect(html).not.toMatch(/NaN|Infinity|undefined/);
   expect(html).toContain('font-size:16px');expect(html).toContain('flex-wrap:wrap');
   expect(html.match(/width="22" height="22"/g)).toHaveLength(m.rows.reduce((n,row)=>n+row.wholeSymbols+Number(row.halfSymbol),0)+1);
   expect(html).not.toContain('overflow:hidden');
   const changed={...q,picture:{...m,rows:m.rows.map(row=>row.label==='Puzzles'?{...row,halfSymbol:false}:row)}};
   expect(solveBatch4Early(changed)).toBe(Number(q.answer)-2);
   const full=makeBatch4Early('pictograph-difference',seed);expect(svg(full)).not.toContain('data-half-symbol');
  }
 });
 it('exposes every visual row label and whole/half count in the accessible name without deriving totals',()=>{
  for(const part of ['half-symbol-pair-total','pictograph-difference'] as const)for(let seed=0;seed<30;seed++){
   const q=makeBatch4Early(part,seed),m=q.picture as Batch4EarlyPicture,html=svg(q),name=html.match(/<figure role="img" aria-label="([^"]+)"/)![1];
   for(const row of m.rows){
    expect(name).toContain(`${row.label}: ${row.wholeSymbols} whole ${row.wholeSymbols===1?'symbol':'symbols'}${row.halfSymbol?' and 1 half symbol':''}.`);
   }
   expect(name).toContain(`Each whole symbol represents ${m.scale}.`);
   expect(name).not.toContain('total');expect(name).not.toContain('toys altogether');
  }
 });
 it('keeps expression choices visible in the actual paper answer controls',()=>{
  for(const part of ['three-addend-choice','equivalent-sum-choice'] as const)for(let seed=0;seed<30;seed++){
   const q=makeBatch4Early(part,seed),{picture,workedSteps,...plain}=q;
   const html=renderToStaticMarkup(createElement(PaperAnswer,{question:plain,value:'',onChange:()=>{},level:1}));
   for(const choice of q.choices!)expect(html).toContain(choice);
   expect(q.picture).toBeUndefined();
   expect(new Set(q.choices).size).toBe(q.choices!.length);
   expect(q.choices!.every(choice=>choice.split('+').length===(part==='three-addend-choice'?3:2))).toBe(true);
  }
 });
 it('preserves whole-hour crossing and a fully specified morning arrival',()=>{
  for(let seed=0;seed<150;seed++){
   const q=makeBatch4Early('finish-time',seed),times=[...q.prompt.matchAll(/(\d+):(\d+) am/g)];
   expect(times).toHaveLength(1);expect(q.answer).toMatch(/^\d{1,2}:\d{2} am$/);
   expect(Number(q.answer.split(':')[0])).toBeGreaterThan(Number(times[0][1]));expect(Number(q.answer.split(':')[0])).toBeLessThan(12);
   expect(q.picture).toBeUndefined();
  }
 });
});
