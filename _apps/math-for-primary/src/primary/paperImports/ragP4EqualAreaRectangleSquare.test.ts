import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP4EqualAreaRectangleSquare';

const grab=(re:RegExp,text:string):number[]=>{const m=re.exec(text);if(!m)throw new Error(`Visible given missing: ${re}`);return m.slice(1).map(Number);};

/** Solves from the visible context and prompt only. */
function solve(q:{context?:string[];prompt:string}):number{
 const text=(q.context??[]).join(' ');
 if(/A square has sides of \d+ cm/.test(text)){
  const [s]=grab(/A square has sides of (\d+) cm/,text),[b]=grab(/A rectangle is (\d+) cm wide/,text),length=s*s/b;
  return /perimeter/.test(q.prompt)?2*(length+b):length;
 }
 if(/Rectangle P is/.test(text)){
  const [long,wide]=grab(/Rectangle P is (\d+) cm long and (\d+) cm wide/,text),[known]=grab(/Rectangle Q is (\d+) cm wide/,text);
  return long*wide/known;
 }
 const [l,b]=grab(/A rectangle is (\d+) cm long and (\d+) cm wide/,text);
 return Math.sqrt(l*b);
}

const kind=(q:{prompt:string;context?:string[]}):string=>/perimeter/.test(q.prompt)?'perimeter':/side length of the square/.test(q.prompt)?'square-side':/rectangle Q/.test(q.prompt)?'two-rectangles':'rectangle-length';

describe('equal-area rectangles and squares',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-equal-area-rectangle-square-missing-dimension');
  for(const id of RAG_PATTERN.skillIds)expect(['P4.S.AREA.01','P3.S.AREA.02','P3.S.AREA.03']).toContain(id);
 });
 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=80;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),expected=solve(q);
   expect(Number.isInteger(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(Number(q.answer)).toBe(expected);
   expect(q.unit).toBe('cm');
  }
 });
 it('covers all four variants',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=20;seed++)for(let index=0;index<4;index++)seen.add(kind(makeRagQuestion(seed,index)));
  expect([...seen].sort()).toEqual(['perimeter','rectangle-length','square-side','two-rectangles']);
 });
 it('keeps every task well-posed and equal in area',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),text=(q.context??[]).join(' ');
   if(/A square has sides of/.test(text)){
    const [s]=grab(/sides of (\d+) cm/,text),[b]=grab(/A rectangle is (\d+) cm wide/,text),length=s*s/b;
    expect((s*s)%b).toBe(0);expect(b).toBeLessThan(s);expect(length).toBeGreaterThan(s);expect(length*b).toBe(s*s);
   }else if(/Rectangle P/.test(text)){
    const [long,wide]=grab(/Rectangle P is (\d+) cm long and (\d+) cm wide/,text),[known]=grab(/Rectangle Q is (\d+) cm wide/,text),other=Number(q.answer);
    expect((long*wide)%known).toBe(0);expect(other*known).toBe(long*wide);expect(other).not.toBe(known);
   }else{
    const [l,b]=grab(/A rectangle is (\d+) cm long and (\d+) cm wide/,text),s=Number(q.answer);
    expect(s*s).toBe(l*b);expect(l).not.toBe(b);
   }
  }
 });
 it('is deterministic and gives distinct keys',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const keys=new Set<string>();
  for(let seed=1;seed<=5;seed++)for(let index=0;index<5;index++)keys.add(makeRagQuestion(seed,index).key);
  expect(keys.size).toBe(25);
 });
 it('has worked steps ending in the answer, a hint, and no source identifiers',()=>{
  for(let seed=1;seed<=30;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.workedSteps?.at(-1)?.text).toContain(q.answer);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(JSON.stringify(q)).not.toMatch(/Jaymie|Rosyth|Nan Hua|Ai Tong|sgexam|ABCD|JKLM/i);
  }
 });
});
