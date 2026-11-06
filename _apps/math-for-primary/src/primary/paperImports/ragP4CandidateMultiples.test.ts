import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP4CandidateMultiples';
import {correctAnswer} from '../generate';

/** Independent solver: uses only the visible prompt, display, choices and context. */
function visibleFactor(prompt:string):number{
 const expr=/(\d+) ÷ (\d+)/.exec(prompt);
 if(expr)return Number(expr[1])/Number(expr[2]);
 const m=/(\d+) as a factor/.exec(prompt);
 if(!m)throw new Error('no factor in prompt');
 return Number(m[1]);
}

describe('p4 candidate multiples',()=>{
 it('has consistent metadata',()=>{
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-candidate-multiples-divisibility-selection');
  expect(RAG_PATTERN.skillIds).toEqual(['P4.S.FACT.03','P4.S.FACT.01']);
 });

 it('solves every variant from the visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   const k=visibleFactor(q.prompt);
   expect(Number.isInteger(k)).toBe(true);
   expect(k).toBeGreaterThanOrEqual(3);
   expect(k).toBeLessThanOrEqual(9);
   if(q.choices){
    kinds.add(q.prompt.includes('÷')?'expression':'factor');
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    const exact=q.choices.filter(c=>Number(c)%k===0);
    expect(exact).toHaveLength(1);
    expect(exact[0]).toBe(q.answer);
    expect(correctAnswer(q,exact[0])).toBe(true);
    for(const c of q.choices.filter(c=>c!==exact[0]))expect(correctAnswer(q,c)).toBe(false);
   }else{
    kinds.add('list');
    const numbers=(q.display??'').split(',').map(s=>Number(s.trim()));
    expect(numbers).toHaveLength(7);
    expect(new Set(numbers).size).toBe(7);
    expect(numbers.every(n=>Number.isInteger(n)&&n>=10&&n<=99)).toBe(true);
    const expected=numbers.filter(n=>n%k===0);
    const stated=Number(/Exactly (\d+)/.exec((q.context??[]).join(' '))?.[1]);
    expect(expected).toHaveLength(stated);
    expect(q.structuredResponse?.kind).toBe('number-fields');
    if(q.structuredResponse?.kind!=='number-fields')throw new Error('unexpected response');
    expect(q.structuredResponse.fields).toHaveLength(expected.length);
    const response=JSON.stringify(expected.map(String));
    expect(correctAnswer(q,response)).toBe(true);
    expect(correctAnswer(q,JSON.stringify([...expected].reverse().map(String)))).toBe(false);
    expect(correctAnswer(q,JSON.stringify(expected.map((n,i)=>String(i===0?n+1:n))))).toBe(false);
   }
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.explanation.length).toBeGreaterThan(0);
  }
  expect([...kinds].sort()).toEqual(['expression','factor','list']);
 });

 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,1)).toEqual(makeRagQuestion(7,1));
  const prompts=new Set<string>();
  for(let seed=1;seed<=30;seed++){const q=makeRagQuestion(seed,0);prompts.add(JSON.stringify([q.prompt,q.choices,q.display]));}
  expect(prompts.size).toBeGreaterThan(10);
 });
});
