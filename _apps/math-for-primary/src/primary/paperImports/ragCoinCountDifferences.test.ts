import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragCoinCountDifferences';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

/** Solves only from the visible context and prompt; it never reads q.answer. */
function parse(q:Question){
 const text=[...(q.context??[]),q.prompt].join(' ');
 const dens=[...new Set([...text.matchAll(/(\d+)-cent coin|\$1 coin/g)].map(m=>m[1]?Number(m[1]):100))].sort((a,b)=>a-b);
 expect(dens.length).toBe(2);
 const [lo,hi]=dens;
 const d=Number(/(?<![.\d$])(\d+) more/.exec(text)![1]);
 const diff=Math.round(Number(/\$(\d+\.\d\d) more/.exec(text)![1])*100);
 const matches:number[]=[];
 for(let n=1;n<=20000;n++)if(hi*n-lo*(n+d)===diff)matches.push(n);
 expect(matches.length).toBe(1);
 const n=matches[0];
 const asked=/How many (\d+-cent|\$1) coins/.exec(q.prompt)!;
 const askedValue=asked[1]==='$1'?100:parseInt(asked[1],10);
 const count=askedValue===hi?n:n+d;
 const cost=/costs \$(\d+\.\d\d)/.exec(text);
 const price=cost?Math.round(Number(cost[1])*100):null;
 const total=hi*n+lo*(n+d);
 return {lo,hi,d,diff,n,count,price,total};
}
function solve(q:Question):string{
 const p=parse(q);
 return p.price===null?String(p.count):JSON.stringify([String(p.count),((p.price-p.total)/100).toFixed(2)]);
}
function kind(q:Question){
 const text=(q.context??[]).join(' ');
 return /costs \$/.test(text)?'shortfall':/^A box/.test(text)?'small-count':'large-count';
}

describe('coin counts from count and value differences',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-coin-counts-from-count-and-value-differences');
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });
 it('independently solves visible givens across seeds, indices and variants',()=>{
  for(let seed=1;seed<=120;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),expected=solve(q);
   expect(correctAnswer(q,expected)).toBe(true);
   expect(JSON.parse(q.answer==='' ?'0':(q.structuredResponse?q.answer:`"${q.answer}"`))).toEqual(JSON.parse(q.structuredResponse?expected:`"${expected}"`));
   const wrong=q.structuredResponse?JSON.stringify([String(Number(JSON.parse(expected)[0])+1),JSON.parse(expected)[1]]):String(Number(expected)+1);
   expect(correctAnswer(q,wrong)).toBe(false);
  }
 });
 it('reaches all three variants from seeds 1 to 9 at index 0',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=9;seed++)kinds.add(kind(makeRagQuestion(seed,0)));
  expect([...kinds].sort()).toEqual(['large-count','shortfall','small-count']);
 });
 it('rotates through all variants over the indices of one seed',()=>{
  const kinds=new Set([0,1,2].map(i=>kind(makeRagQuestion(7,i))));
  expect(kinds.size).toBe(3);
 });
 it('varies the denominations and keeps numbers reasonable',()=>{
  const pairs=new Set<string>();
  for(let seed=1;seed<=100;seed++){
   const q=makeRagQuestion(seed,0),p=parse(q);
   pairs.add(`${p.lo}-${p.hi}`);
   expect(p.n).toBeGreaterThan(0);
   expect(p.diff).toBeGreaterThan(0);
   expect(p.count).toBeLessThanOrEqual(200);
   if(p.price!==null){expect(p.price).toBeGreaterThan(p.total);expect(p.price-p.total).toBeLessThan(p.price);}
  }
  expect(pairs.size).toBeGreaterThanOrEqual(4);
 });
 it('is deterministic, has unique keys and gives worked steps',()=>{
  expect(makeRagQuestion(5,1)).toEqual(makeRagQuestion(5,1));
  const keys=new Set<string>();
  for(let seed=1;seed<=20;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   keys.add(q.key);
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(5);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
  }
  expect(keys.size).toBe(60);
 });
});
