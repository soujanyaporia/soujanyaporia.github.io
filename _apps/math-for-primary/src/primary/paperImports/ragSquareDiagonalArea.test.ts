import {describe,expect,it} from 'vitest';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {RAG_PATTERN,makeRagQuestion} from './ragSquareDiagonalArea';

const textOf=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const grab=(re:RegExp,text:string):number[]=>{const m=re.exec(text);if(!m)throw new Error(`No match for ${re} in: ${text}`);return m.slice(1).map(Number);};

/** Independent solver: reads only the visible context and prompt. */
function solve(q:Question):number{
 const t=textOf(q);
 if(/diagonal AC is \d+ cm/.test(t)){const [d]=grab(/diagonal AC is (\d+) cm/,t);return d*d/2;}
 if(/corners touch the circle/.test(t)){
  const [d]=grab(/diagonal of the square is (\d+) cm/,t),[pi]=grab(/π = (\d+\.\d+)/,t);
  return pi*(d/2)*(d/2)-d*d/2;
 }
 if(/square holes/.test(t)){
  const [w,h]=grab(/rectangle is (\d+) cm long and (\d+) cm wide/,t),[k]=grab(/(\d+) identical square holes/,t),[s]=grab(/diagonal of (\d+) cm/,t);
  return w*h-k*(s*s/2);
 }
 if(/Right-angled isosceles triangles/.test(t)){
  const [area]=grab(/area of (\d+) cm²/,t),[n]=grab(/(\d+) triangles cover/,t),hyp=2*Math.sqrt(area);
  return 4*n*hyp;
 }
 throw new Error(`Unrecognised question: ${t}`);
}

const seeds=Array.from({length:40},(_,i)=>i+1);
const indexes=[0,1,2,3,4,5,6,7];

describe('square diagonal and triangular area relationships',()=>{
 it('matches an independent solution of the visible givens across seeds and indexes',()=>{
  for(const seed of seeds)for(const index of indexes){
   const q=makeRagQuestion(seed,index);
   expect(Math.abs(solve(q)-Number(q.answer)),textOf(q)).toBeLessThan(1e-6);
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(correctAnswer(q,q.answer)).toBe(true);
  }
 });

 it('rejects wrong numeric answers and common misconceptions',()=>{
  for(const seed of seeds)for(const index of indexes){
   const q=makeRagQuestion(seed,index),a=Number(q.answer),t=textOf(q);
   const wrong=[a+1,a-1,a*2,a/2,a+10];
   if(/diagonal AC is/.test(t)){wrong.push(grab(/diagonal AC is (\d+) cm/,t)[0]**2);}
   if(/Right-angled isosceles/.test(t)){wrong.push(a/4);wrong.push(a*2);}
   for(const w of wrong)expect(correctAnswer(q,String(Number(w.toFixed(4)))),`${t} wrong ${w}`).toBe(false);
   expect(correctAnswer(q,'')).toBe(false);
   expect(correctAnswer(q,'abc')).toBe(false);
  }
 });

 it('uses all four variants and keeps givens consistent',()=>{
  for(const seed of seeds){
   const kinds=new Set<string>();
   for(const index of [0,1,2,3]){
    const q=makeRagQuestion(seed,index),t=textOf(q);
    if(/diagonal AC is/.test(t))kinds.add('square');
    else if(/corners touch the circle/.test(t)){
     kinds.add('circle');
     const [d]=grab(/diagonal of the square is (\d+) cm/,t);
     expect(d%2).toBe(0);
    }else if(/square holes/.test(t)){
     kinds.add('holes');
     const [w,h]=grab(/rectangle is (\d+) cm long and (\d+) cm wide/,t),[k]=grab(/(\d+) identical square holes/,t),[s]=grab(/diagonal of (\d+) cm/,t);
     expect(w).toBe(k*s);
     expect(h).toBeGreaterThanOrEqual(s);
    }else if(/Right-angled isosceles/.test(t)){
     kinds.add('triangles');
     const [area]=grab(/area of (\d+) cm²/,t);
     expect(Number.isInteger(Math.sqrt(area))).toBe(true);
    }
   }
   expect([...kinds].sort()).toEqual(['circle','holes','square','triangles']);
  }
 });

 it('provides a hint, worked steps, units and a diagram that names the givens',()=>{
  for(const seed of seeds.slice(0,10))for(const index of indexes){
   const q=makeRagQuestion(seed,index);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(['cm','cm²']).toContain(q.unit);
   const pic=q.picture as unknown as {type:string;label:string};
   expect(pic.type).toBe('batch11-upper');
   const given=grab(/(\d+)/,textOf(q).replace(/^[^\d]*/,''))[0];
   expect(pic.label).toContain(String(given));
   expect(q.explanation.length).toBeGreaterThan(20);
  }
 });

 it('is deterministic and varies numbers across seeds',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(seeds.map(seed=>JSON.stringify(makeRagQuestion(seed,0).context)));
  expect(prompts.size).toBeGreaterThan(5);
  expect(new Set(seeds.map(seed=>makeRagQuestion(seed,1).key)).size).toBe(seeds.length);
 });

 it('declares valid metadata',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p6-')).toBe(true);
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id),id).toBe(true);
 });
});
