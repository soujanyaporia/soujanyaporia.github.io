import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragPicturedGroupExpression';

const WORDS:Record<string,number>={twos:2,threes:3,fours:4,fives:5,sixes:6,sevens:7,eights:8,nines:9};

/** Independent evaluator for the visible sentence text. */
function evaluate(text:string):number{
 let m:RegExpExecArray|null;
 if((m=/^(\d+) × (\d+)$/.exec(text)))return Number(m[1])*Number(m[2]);
 if((m=/^(\d+) groups of (\d+)$/.exec(text)))return Number(m[1])*Number(m[2]);
 if((m=/^(\d+) (twos|threes|fours|fives|sixes|sevens|eights|nines)$/.exec(text)))return Number(m[1])*WORDS[m[2]];
 if(/^\d+( \+ \d+)+$/.test(text))return text.split(' + ').reduce((a,b)=>a+Number(b),0);
 throw new Error(`Cannot evaluate ${text}`);
}

function solveFromVisible(q:ReturnType<typeof makeRagQuestion>):string{
 const p=q.picture as {type:string;count:number;group:number};
 expect(p.type).toBe('counters');
 expect(Number.isInteger(p.count/p.group)).toBe(true);
 const total=p.count;
 const choices=q.choices!;
 const equalOnes=choices.filter(c=>evaluate(c)===total);
 const differentOnes=choices.filter(c=>evaluate(c)!==total);
 if(/\bnot\b/i.test(q.prompt)){
  expect(differentOnes).toHaveLength(1);
  expect(equalOnes).toHaveLength(3);
  return differentOnes[0];
 }
 expect(equalOnes).toHaveLength(1);
 expect(differentOnes).toHaveLength(3);
 return equalOnes[0];
}

describe('pictured group expression check',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(1);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p1-pictured-group-expression-check');
  expect(RAG_PATTERN.skillIds).toEqual(['P1.S.MD.01']);
 });

 it('is solved correctly from the visible picture and choices across seeds',()=>{
  let negative=0,positive=0;
  for(let seed=1;seed<=150;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.choices).toHaveLength(4);
   expect(new Set(q.choices).size).toBe(4);
   expect(q.choices).toContain(q.answer);
   expect(solveFromVisible(q)).toBe(q.answer);
   const p=q.picture as {count:number;group:number};
   expect(p.count).toBeLessThanOrEqual(40);
   expect(p.count/p.group).toBeGreaterThanOrEqual(2);
   expect(p.count/p.group).not.toBe(p.group);
   if(/\bnot\b/i.test(q.prompt))negative++;else positive++;
  }
  expect(negative).toBeGreaterThan(50);
  expect(positive).toBeGreaterThan(50);
 });

 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const totals=new Set<number>();
  for(let seed=1;seed<=40;seed++)totals.add((makeRagQuestion(seed,0).picture as {count:number}).count);
  expect(totals.size).toBeGreaterThan(5);
 });

 it('provides hint, worked steps and an explanation',()=>{
  for(let seed=1;seed<=30;seed++){
   const q=makeRagQuestion(seed,seed%3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect(q.key).toContain(RAG_PATTERN.id);
  }
 });
});
