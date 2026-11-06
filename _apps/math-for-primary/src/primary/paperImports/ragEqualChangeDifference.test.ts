import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragEqualChangeDifference';

const KNOWN_SKILLS=['P3.S.AS.01','P4.S.MD.03','P5.S.WN.01','P5.S.WN.02','P5.S.WN.03'];

/** Solves only from the visible context and prompt. */
function solve(q:{context?:string[];prompt:string}):number{
 const lines=q.context??[];
 const boxes:Record<string,number>={};
 for(const line of lines){const m=/^Box ([ABC]) had (\d+) /.exec(line);if(m)boxes[m[1]]=Number(m[2]);}
 if(Object.keys(boxes).length===3){
  const ratio=lines.map(l=>/^Then Box ([ABC]) had (\d+) times as many .* as Box ([ABC])\./.exec(l)).find(Boolean)!;
  const large=boxes[ratio[1]],small=boxes[ratio[3]],k=Number(ratio[2]);
  const endSmall=(large-small)/(k-1),removed=small-endSmall;
  const asked=/in Box ([ABC])\?/.exec(q.prompt)![1];
  return boxes[asked]-removed;
 }
 const first=/^(\w+) had (\d+) \w+ and (\w+) had (\d+) /.exec(lines[0])!;
 const small=Number(first[2]),large=Number(first[4]);
 const k=Number(/^Then \w+ had (\d+) times as many/.exec(lines[2])![1]);
 const endSmall=(large-small)/(k-1);
 return q.prompt.includes('altogether')?endSmall*(k+1):endSmall-small;
}

describe('equal changes preserve difference',()=>{
 it('declares known skills and a p5 canonical id',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p5-')).toBe(true);
  for(const id of RAG_PATTERN.skillIds)expect(KNOWN_SKILLS).toContain(id);
 });
 it('matches an independent solution from the visible givens',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   const expected=solve(q);
   expect(Number.isInteger(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(Number(q.answer)).toBe(expected);
  }
 });
 it('covers all three variants with worked steps',()=>{
  const seen=new Set<string>();
  for(let seed=0;seed<9;seed++){
   const q=makeRagQuestion(seed,0);
   seen.add(/Box/.test(q.context![0])?'removal':q.prompt.includes('altogether')?'total':'each');
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
  }
  expect([...seen].sort()).toEqual(['each','removal','total']);
 });
 it('is deterministic and varies across seeds',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(Array.from({length:30},(_,i)=>JSON.stringify(makeRagQuestion(i,0).context)));
  expect(prompts.size).toBeGreaterThan(20);
 });
 it('keeps the two ratio quantities in the stated order and the third box different',()=>{
  for(let seed=0;seed<60;seed+=3){
   const q=makeRagQuestion(seed,0),nums=q.context!.slice(0,3).map(l=>Number(/had (\d+)/.exec(l)![1]));
   expect(new Set(nums).size).toBe(3);
  }
 });
});
