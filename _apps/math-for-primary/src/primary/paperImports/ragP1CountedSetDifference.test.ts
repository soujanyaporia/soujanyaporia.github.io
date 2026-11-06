import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP1CountedSetDifference';
import {correctAnswer,type Question} from '../generate';

type Counts=Record<string,number>;
function visibleCounts(q:Question):Counts{
 const picture=q.picture as unknown as {cards?:{label:string;count?:number}[]};
 const result:Counts={};
 for(const card of picture.cards??[]){const m=/^Set ([AB])$/.exec(card.label);if(m&&typeof card.count==='number')result[m[1]]=card.count;}
 return result;
}
/** Solves only from the visible figure counts, prompt and displayed choices. */
function solve(q:Question):string{
 const c=visibleCounts(q);
 const m=/^How many (more|fewer) [a-z]+ does Set ([AB]) have than Set ([AB])\?$/.exec(q.prompt);
 if(m){const [,kind,x,y]=m;return String(kind==='more'?c[x]-c[y]:c[y]-c[x]);}
 const truths=(q.choices??[]).filter(choice=>{
  const s=/^Set ([AB]) has (\d+) (more|fewer) [a-z]+ than Set ([AB])$/.exec(choice);
  if(!s)return false;
  const [,x,d,kind,y]=s;
  return (kind==='more'?c[x]-c[y]:c[y]-c[x])===Number(d);
 });
 return truths.length===1?truths[0]:'ambiguous';
}

describe('RAG p1 counted set difference',()=>{
 it('declares matching metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(1);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p1-counted-set-difference');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches the independently solved visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=60;seed++){
   for(let index=0;index<4;index++){
    const q=makeRagQuestion(seed,index),c=visibleCounts(q);
    expect(typeof c.A).toBe('number');
    expect(typeof c.B).toBe('number');
    expect(c.A).not.toBe(c.B);
    expect(Math.max(c.A,c.B)).toBeLessThanOrEqual(20);
    expect(Math.min(c.A,c.B)).toBeGreaterThanOrEqual(1);
    const solved=solve(q);
    expect(solved).not.toBe('ambiguous');
    expect(q.answer).toBe(solved);
    expect(correctAnswer(q,solved)).toBe(true);
    if(q.choices){expect(q.choices).toContain(q.answer);expect(new Set(q.choices).size).toBe(q.choices.length);expect(q.choices.length).toBe(4);kinds.add('choice');}
    else{expect(Number(solved)).toBeGreaterThan(0);kinds.add(/\bmore\b/.test(q.prompt)?'more':'fewer');}
   }
  }
  expect(kinds).toEqual(new Set(['choice','more','fewer']));
 });

 it('has worked steps whose subtraction matches the visible counts',()=>{
  for(let seed=1;seed<=30;seed++){
   for(let index=0;index<4;index++){
    const q=makeRagQuestion(seed,index),c=visibleCounts(q);
    expect(q.workedSteps&&q.workedSteps.length).toBeGreaterThanOrEqual(2);
    const equation=(q.workedSteps??[]).map(s=>s.equation??'').find(e=>/^\d+ − \d+ = \d+$/.test(e));
    expect(equation).toBeDefined();
    const [a,b,d]=(equation as string).split(/ − | = /).map(Number);
    expect(a).toBe(Math.max(c.A,c.B));
    expect(b).toBe(Math.min(c.A,c.B));
    expect(a-b).toBe(d);
    expect(d).toBe(Math.abs(c.A-c.B));
    expect(q.hint.length).toBeGreaterThan(0);
    expect(q.explanation.length).toBeGreaterThan(0);
   }
  }
 });

 it('is deterministic and varies the givens',()=>{
  expect(JSON.stringify(makeRagQuestion(7,2))).toBe(JSON.stringify(makeRagQuestion(7,2)));
  const seen=new Set<string>();
  for(let seed=1;seed<=40;seed++){const c=visibleCounts(makeRagQuestion(seed,0));seen.add(`${c.A}:${c.B}`);}
  expect(seen.size).toBeGreaterThan(8);
 });
});
