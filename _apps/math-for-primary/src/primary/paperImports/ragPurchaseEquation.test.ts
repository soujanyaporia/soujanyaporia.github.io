import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragPurchaseEquation';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';

const money=(t:string)=>[...t.matchAll(/\$(\d+(?:\.\d+)?)/g)].map(m=>Math.round(Number(m[1])*100));
function need(m:RegExpExecArray|null,label:string):RegExpExecArray{if(!m)throw new Error(`Cannot read ${label}`);return m;}

/** Solves from the visible context and prompt only. */
function solve(q:Question):{variant:string;answer:string}{
 const lines=q.context??[];
 const ctx=lines.join(' ');
 if(/more money/.test(q.prompt)){
  const [price,have]=money(ctx);
  const len=Number(need(/buy (\d+(?:\.\d+)?) m of/.exec(ctx),'length')[1]);
  const cost=Math.round(price*len);
  return {variant:'shortfall',answer:((cost-have)/100).toFixed(2)};
 }
 if(/cents/.test(q.prompt)){
  const [total]=money(ctx);
  const count=Number(need(/for (\d+) /.exec(ctx),'count')[1]);
  expect(total%count).toBe(0);
  return {variant:'unit',answer:String(total/count)};
 }
 if(/ n = \d+/.test(ctx)){
  const n=Number(need(/n = (\d+)/.exec(ctx),'n')[1]);
  const a=Number(need(/\(n \+ (\d+)\) dollars/.exec(ctx),'extra')[1]);
  const pens=Number(need(/(\d+) pens/.exec(ctx),'pens')[1]);
  const total=money(ctx)[0]/100;
  const left=total-pens*n,price=n+a;
  expect(left%price).toBe(0);
  return {variant:'algebra',answer:String(left/price)};
 }
 const sells=need(/sells [a-z]+ (\d+) for \$(\d+(?:\.\d+)?)/.exec(lines[0]??''),'bundle');
 const bundle=Number(sells[1]),bundleCents=Math.round(Number(sells[2])*100);
 const [paid,change]=money(lines[1]??'');
 const spent=paid-change;
 expect(spent%bundleCents).toBe(0);
 return {variant:'change',answer:String((spent/bundleCents)*bundle)};
}

describe('p6 simple purchase equation',()=>{
 it('matches an independent solution of the visible givens across seeds',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=250;seed++)for(let index=0;index<2;index++){
   const q=makeRagQuestion(seed,index);
   const solved=solve(q);
   seen.add(solved.variant);
   expect(Number(q.answer)).toBeCloseTo(Number(solved.answer),6);
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect(q.choices).toBeUndefined();
   expect(q.picture).toBeUndefined();
  }
  expect([...seen].sort()).toEqual(['algebra','change','shortfall','unit']);
 });
 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  const prompts=new Set(Array.from({length:60},(_,i)=>JSON.stringify([makeRagQuestion(i,0).context,makeRagQuestion(i,0).prompt])));
  expect(prompts.size).toBeGreaterThan(30);
 });
 it('keeps whole-number quantity answers whole',()=>{
  for(let seed=1;seed<=200;seed++){
   const q=makeRagQuestion(seed,0);
   if(q.unit!=='dollars')expect(Number.isInteger(Number(q.answer))).toBe(true);
  }
 });
 it('declares valid metadata',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-simple-purchase-equation');
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });
});
