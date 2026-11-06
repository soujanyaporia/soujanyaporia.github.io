import {describe,expect,it} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {RAG_PATTERN,makeRagQuestion} from './ragPaymentsExpensesBalances';
import type {Question} from '../generate';

const tokens=(t:string)=>[...t.matchAll(/\$(\d+(?:\.\d+)?)|(\d+) cents/g)].map(m=>m[1]!==undefined?Math.round(Number(m[1])*100):Number(m[2]));
const kindOf=(q:Question)=>{
 const text=[...(q.context??[]),q.prompt].join(' ');
 if(/was given a \$\d+ note back/.test(text))return 0;
 if(/notes of/.test(text))return 3;
 if(/ each\./.test(text))return 1;
 return 2;
};
/** Solves from the visible givens only. Returns cents. */
function solve(q:Question):number{
 const text=[...(q.context??[]),q.prompt].join(' ');
 const kind=kindOf(q);
 if(kind===0){const [paid,extra,change]=tokens(text);return paid+extra-change;}
 if(kind===3){
  let notes=0;
  const rest=text.replace(/(\d+) notes of \$(\d+)/g,(_m,n:string,d:string)=>{notes+=Number(n)*Number(d)*100;return '';});
  const [start,spent]=tokens(rest);return start+notes-spent;
 }
 if(kind===1){const qty=Number(/buys (\d+) /.exec(text)![1]);const [have,price]=tokens(text);return have-qty*price;}
 const [have,a,b]=tokens(text);return have-a-b;
}

describe('payments, expenses and balances generator',()=>{
 it('declares valid metadata',()=>{
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-payments-expenses-balances');
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });
 it('answers match an independent solution of the visible givens',()=>{
  for(let seed=0;seed<150;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(Math.round(Number(q.answer)*100)).toBe(solve(q));
   expect(q.answer).toMatch(/^\d+\.\d{2}$/);
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(q.unit).toBe('dollars');
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(10);
  }
 });
 it('uses all four variants and keeps change realistic',()=>{
  const seen=new Set<number>();
  for(let seed=0;seed<40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);seen.add(kindOf(q));
   if(kindOf(q)===0){
    const [paid,extra,change]=tokens([...(q.context??[])].join(' '));
    expect(extra).toBeLessThan(change);
    expect(paid+extra-change).toBeLessThan(paid);
   }
  }
  expect([...seen].sort()).toEqual([0,1,2,3]);
 });
 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(Array.from({length:30},(_,s)=>JSON.stringify(makeRagQuestion(s,0).context)));
  expect(prompts.size).toBeGreaterThan(10);
 });
});
