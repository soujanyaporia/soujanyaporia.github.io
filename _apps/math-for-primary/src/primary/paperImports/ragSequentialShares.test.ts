import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragSequentialShares';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,type Question} from '../generate';

const visible=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');

/** Independent solver: reads only the visible context and prompt. */
function solve(q:Question):{kind:'money'|'category'|'total';value:number}{
 const t=visible(q);
 if(q.prompt.startsWith('How much was')){
  const m1=/spent (\d+)% of \w+ monthly pay on rent and \$(\d+) on bus fares/.exec(t)!;
  const m2=/gave (\d+)\/(\d+) of the money that was left to \w+ grandmother and spent \$(\d+) on a book/.exec(t)!;
  const m3=/had \$(\d+) left at the end/.exec(t)!;
  const [p,F]=[Number(m1[1]),Number(m1[2])],[a,b,G]=[Number(m2[1]),Number(m2[2]),Number(m2[3])],L=Number(m3[1]);
  const beforeGift=(L+G)*b/(b-a),wholeAfterRent=beforeGift+F;
  return {kind:'money',value:wholeAfterRent*100/(100-p)};
 }
 const s=/(\d+)% of the \w+ were (\w+)\. (\d+)% of the rest were (\w+), and the remaining \w+ were (\w+)\./.exec(t)!;
 const A=Number(s[1]),B=Number(s[3]),names=[s[2],s[4],s[5]];
 const pct=[A,(100-A)*B/100,(100-A)*(100-B)/100];
 if(q.prompt.includes('altogether')){
  const d=/There were (\d+) more (\w+) \w+ than (\w+) \w+\./.exec(t)!;
  const gap=pct[names.indexOf(d[2])]-pct[names.indexOf(d[3])];
  expect(gap).toBeGreaterThan(0);
  return {kind:'total',value:Number(d[1])*100/gap};
 }
 const z=/There were (\d+) (\w+) \w+\./.exec(t)!,asked=/How many (\w+) \w+ were there\?/.exec(t)!;
 expect(asked[1]).toBe(names[0]);
 const total=Number(z[1])*100/pct[names.indexOf(z[2])];
 return {kind:'category',value:total*A/100};
}

describe('sequential shares and remainder reconstruction',()=>{
 it('has valid metadata and curriculum skills',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-sequential-shares-remainder-reconstruction');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('answers match an independent solution of the visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=80;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),solved=solve(q);
   kinds.add(solved.kind);
   expect(Number.isInteger(solved.value)).toBe(true);
   expect(solved.value).toBeGreaterThan(0);
   expect(Number(q.answer)).toBeCloseTo(solved.value,6);
   expect(correctAnswer(q,q.answer)).toBe(true);
   expect(correctAnswer(q,String(solved.value+1))).toBe(false);
  }
  expect([...kinds].sort()).toEqual(['category','money','total']);
 });

 it('shows worked steps, a hint and a consistent final step',()=>{
  for(let seed=1;seed<=30;seed++){
   const q=makeRagQuestion(seed,seed%5);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).toContain(String(Number(q.answer)));
   expect(q.workedSteps![q.workedSteps!.length-1].text).toContain(String(Number(q.answer)));
  }
 });

 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const seen=new Set<string>();
  for(let seed=1;seed<=60;seed++)seen.add(visible(makeRagQuestion(seed,0)));
  expect(seen.size).toBeGreaterThan(25);
 });

 it('uses original wording rather than source names',()=>{
  for(let seed=1;seed<=40;seed++){
   const t=visible(makeRagQuestion(seed,0));
   for(const word of ['Ashley','Siti','Mrs Lim','Muthu','petrol','muffins','buttons'])expect(t).not.toContain(word);
  }
 });
});
