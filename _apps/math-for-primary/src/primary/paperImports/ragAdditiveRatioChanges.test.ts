import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragAdditiveRatioChanges';
import type {Question} from '../generate';

const must=(re:RegExp,text:string|undefined):RegExpExecArray=>{
 const m=re.exec(text??'');
 if(!m)throw new Error(`Unexpected wording: ${text}`);
 return m;
};
const ints=(m:RegExpExecArray)=>m.slice(1).map(Number);
const whole=(n:number)=>Number.isInteger(n)&&n>0;

/** Solves from the visible context sentences only; never reads the stored answer. */
function solve(q:Question):{kind:string;answer:number}{
 const c=q.context??[];
 if(c[0].startsWith('The ratio of')){
  const [a,b]=ints(must(/is (\d+):(\d+) at first\.$/,c[0]));
  const [p,add]=ints(must(/^Then \S+ gets (\d+) more \w+, and \S+ gets (\d+) more \w+\.$/,c[1]));
  const [cc,d]=ints(must(/is (\d+):(\d+)\.$/,c[2]));
  expect(q.prompt).toMatch(/at first\?$/);
  const u=(cc*add-d*p)/(d*a-cc*b);
  expect(whole(u)).toBe(true);
  expect(d*(a*u+p)).toBe(cc*(b*u+add));
  return {kind:'initial',answer:a*u};
 }
 if(c[0].startsWith('At a fruit stall')){
  const [a,b,cc]=ints(must(/is (\d+):(\d+):(\d+) at first\.$/,c[0]));
  const [r1,r2,r3]=ints(must(/^The owner sells (\d+) \w+, (\d+) \w+ and (\d+) \w+\.$/,c[1]));
  const [e,f]=ints(must(/is (\d+):(\d+)\.$/,c[2]));
  const u=(f*r2-e*r3)/(f*b-e*cc);
  expect(whole(u)).toBe(true);
  expect(f*(b*u-r2)).toBe(e*(cc*u-r3));
  expect(a*u-r1).toBeGreaterThan(0);
  expect(b*u-r2).toBeGreaterThan(0);
  expect(cc*u-r3).toBeGreaterThan(0);
  return {kind:'three-share',answer:(a+b+cc)*u-r1-r2-r3};
 }
 if(c[0].startsWith('In Week 1')){
  const [k]=ints(must(/^In Week 1, \S+ saved (\d+) times as much money as \S+\.$/,c[0]));
  const [p,add]=ints(must(/^In Week 2, \S+ saved another \$(\d+) and \S+ saved another \$(\d+)\.$/,c[1]));
  const [m]=ints(must(/had saved (\d+) times as much money as \S+\.$/,c[2]));
  const u=(m*add-p)/(k-m);
  expect(whole(u)).toBe(true);
  expect(k*u+p).toBe(m*(u+add));
  return {kind:'times-as-much',answer:(m+1)*(u+add)};
 }
 const [x,y,z,w]=ints(must(/^(\d+)\/(\d+) of the \w+ in Box P is the same as (\d+)\/(\d+) of the \w+ in Box Q\.$/,c[0]));
 const [p,take]=ints(must(/^(\d+) \w+ are added to Box P, and (\d+) \w+ are taken out of Box Q\.$/,c[1]));
 const [cc,d]=ints(must(/is (\d+):(\d+)\.$/,c[2]));
 // P : Q = (z/w) : (x/y) = z*y : w*x; let P = z*y*s and Q = w*x*s.
 const s=(d*p+cc*take)/(cc*w*x-d*z*y);
 expect(s).toBeGreaterThan(0);
 const startP=z*y*s,startQ=w*x*s;
 expect(Math.abs(startP-Math.round(startP))).toBeLessThan(1e-9);
 expect(Math.abs(startQ-Math.round(startQ))).toBeLessThan(1e-9);
 expect(startQ-take).toBeGreaterThan(0);
 expect(d*(startP+p)).toBeCloseTo(cc*(startQ-take),6);
 return {kind:'fraction-equality',answer:Math.round(startP)+p};
}

describe('additive changes between two ratios',()=>{
 it('has the required pattern metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-additive-changes-between-two-ratios');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P6\.S\.RATIO\.0[1-5]$/);
 });

 it('matches an independent solution of the visible givens across many seeds',()=>{
  for(let seed=1;seed<=150;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   const solved=solve(q);
   expect(Number(q.answer)).toBe(solved.answer);
   expect(whole(solved.answer)).toBe(true);
  }
 });

 it('uses all four variants and is deterministic',()=>{
  const kinds=new Set([0,1,2,3].map(i=>solve(makeRagQuestion(7,i)).kind));
  expect(kinds.size).toBe(4);
  expect(JSON.stringify(makeRagQuestion(11,2))).toBe(JSON.stringify(makeRagQuestion(11,2)));
  const kindsLater=new Set([4,5,6,7].map(i=>solve(makeRagQuestion(7,i)).kind));
  expect(kindsLater.size).toBe(4);
 });

 it('varies the givens between seeds',()=>{
  const contexts=new Set(Array.from({length:120},(_,i)=>JSON.stringify(makeRagQuestion(i,0).context)));
  expect(contexts.size).toBeGreaterThan(60);
 });

 it('provides hints, worked steps and clean text',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps?.length??0).toBeGreaterThanOrEqual(5);
   expect(q.context?.length).toBe(3);
   expect(q.choices).toBeUndefined();
   const all=[q.prompt,q.explanation,...(q.context??[]),...(q.workedSteps??[]).flatMap(s=>[s.text,s.equation??''])].join(' ');
   expect(all).not.toMatch(/NaN|undefined|Infinity/);
   expect(q.key).toContain(`:${seed}:${index}`);
  }
 });
});
