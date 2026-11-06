import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {RAG_PATTERN,makeRagQuestion} from './ragChainedAdditiveComparisons';

type E={a:number;c:number};

function parseExpr(raw:string):{a:number;c:number;letter:string}{
 const s=raw.replace(/[$()]/g,'').replace(/ cm$/,'').trim();
 let m=/^(\d*)([a-z])(?: \+ (\d+))?$/.exec(s);
 if(m)return {a:m[1]===''?1:Number(m[1]),c:m[3]?Number(m[3]):0,letter:m[2]};
 m=/^(\d+)$/.exec(s);
 if(m)return {a:0,c:Number(m[1]),letter:''};
 throw new Error(`cannot parse ${raw}`);
}

/** Reads only the visible context sentences. */
function readGivens(context:string[]){
 const values=new Map<string,E>();let letter='';
 for(const line of context){
  const l=/^The letter ([a-z]) stands for a positive whole number\.$/.exec(line);
  if(l){letter=l[1];continue;}
  const cmp=/^(\w+) (?:has|is) (.+?) (more|less|fewer|taller|shorter)(?: stickers)? than (\w+)\.$/.exec(line);
  if(cmp){
   const d=parseExpr(cmp[2]),ref=values.get(cmp[4]);
   if(!ref)throw new Error('comparison refers to an unknown person');
   const sign=cmp[3]==='more'||cmp[3]==='taller'?1:-1;
   values.set(cmp[1],{a:ref.a+sign*d.a,c:ref.c+sign*d.c});
   continue;
  }
  const dir=/^(\w+) (?:has|is) (.+?)(?: tall| stickers)?\.$/.exec(line);
  if(dir){const e=parseExpr(dir[2]);values.set(dir[1],{a:e.a,c:e.c});continue;}
  throw new Error(`unreadable line ${line}`);
 }
 return {values,letter};
}

function solve(q:Question):string{
 const {values}=readGivens(q.context??[]);
 const all=[...values.values()],total=all.reduce((s,e)=>({a:s.a+e.a,c:s.c+e.c}),{a:0,c:0});
 const prompt=q.prompt;
 if(prompt.startsWith('Is this statement')){
  const st=/“(.+)”/.exec(prompt)![1];
  const cmp=/^(\w+) (?:has more (?:money|stickers)|is taller) than (\w+)\.$/.exec(st);
  if(cmp){
   const A=values.get(cmp[1])!,B=values.get(cmp[2])!;
   let always=true,never=true;
   for(let y=1;y<=300;y++){const diff=(A.a-B.a)*y+(A.c-B.c);if(diff>0)never=false;else always=false;}
   return always?'True':never?'False':'Not possible to tell';
  }
  const tot=/^The total of the three [a-z ]+ is (.+)\.$/.exec(st);
  if(tot){const e=parseExpr(tot[1]);return e.a===total.a&&e.c===total.c?'True':'False';}
  throw new Error('unreadable statement');
 }
 if(prompt.startsWith('(a)')){
  const whenM=/when [a-z] = (\d+)/.exec(prompt),totalM=/The total is \$?(\d+)/.exec(prompt);
  if(whenM)return JSON.stringify([String(total.a),String(total.c),String(total.a*Number(whenM[1])+total.c)]);
  if(totalM){
   const y=(Number(totalM[1])-total.c)/total.a;
   expect(Number.isInteger(y)).toBe(true);
   return JSON.stringify([String(total.a),String(total.c),String(y)]);
  }
  throw new Error('unreadable two-part prompt');
 }
 const fin=/^(\w+) (?:has|is) \$?(\d+)/.exec(prompt);
 if(!fin)throw new Error('unreadable prompt');
 const e=values.get(fin[1])!,y=(Number(fin[2])-e.c)/e.a;
 expect(Number.isInteger(y)).toBe(true);
 return String(y);
}

const questions:Question[]=[];
for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++)questions.push(makeRagQuestion(seed,index));

describe('chained additive comparisons generator',()=>{
 it('exports valid candidate metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-chained-additive-comparisons');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P6\.S\.ALG\.0[1-5]$/);
 });

 it('answers match an independent solution of the visible givens',()=>{
  for(const q of questions)expect(q.answer).toBe(solve(q));
 });

 it('is deterministic and gives distinct keys',()=>{
  expect(JSON.stringify(makeRagQuestion(7,3))).toBe(JSON.stringify(makeRagQuestion(7,3)));
  expect(new Set(questions.map(q=>q.key)).size).toBe(questions.length);
 });

 it('uses all four variants and keeps every amount positive',()=>{
  const kinds=new Set<string>();
  for(const q of questions){
   kinds.add(q.prompt.startsWith('Is this')?'assess':q.prompt.startsWith('(a)')?(q.prompt.includes('when')?'value':'solve'):'invert');
   const {values,letter}=readGivens(q.context??[]);
   expect(values.size).toBe(3);
   expect(letter).toMatch(/^[a-z]$/);
   for(const e of values.values()){expect(e.a).toBeGreaterThanOrEqual(1);expect(e.c).toBeGreaterThanOrEqual(0);}
  }
  expect([...kinds].sort()).toEqual(['assess','invert','solve','value']);
 });

 it('structured answers are accepted when correct and rejected when changed',()=>{
  const structured=questions.filter(q=>q.structuredResponse);
  expect(structured.length).toBeGreaterThan(0);
  for(const q of structured){
   const spec=q.structuredResponse!;
   expect(spec.kind).toBe('number-fields');
   if(spec.kind==='number-fields')expect(spec.fields.length).toBe(3);
   expect(structuredResponseCorrect(spec,q.answer,q.answer)).toBe(true);
   const parts=JSON.parse(q.answer) as string[];
   parts[2]=String(Number(parts[2])+1);
   expect(structuredResponseCorrect(spec,q.answer,JSON.stringify(parts))).toBe(false);
  }
 });

 it('statement questions offer fixed choices and reach every outcome',()=>{
  const statements=questions.filter(q=>q.prompt.startsWith('Is this'));
  const outcomes=new Set<string>();
  let totals=0,comparisons=0;
  for(const q of statements){
   expect(q.choices).toEqual(['True','False','Not possible to tell']);
   expect(q.choices).toContain(q.answer);
   outcomes.add(q.answer);
   if(q.prompt.includes('The total of'))totals++;else comparisons++;
  }
  expect([...outcomes].sort()).toEqual(['False','Not possible to tell','True']);
  expect(totals).toBeGreaterThan(0);
  expect(comparisons).toBeGreaterThan(0);
 });

 it('has worked steps and does not reuse source names',()=>{
  for(const q of questions){
   expect(q.workedSteps?.length).toBeGreaterThan(0);
   for(const step of q.workedSteps!)expect(step.text.length).toBeGreaterThan(0);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(JSON.stringify(q)).not.toMatch(/\b(Ellie|Flora|Gloria|Siti|Kim|Paul|Ali)\b/);
  }
 });
});
