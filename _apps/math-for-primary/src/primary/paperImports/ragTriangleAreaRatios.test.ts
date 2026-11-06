import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragTriangleAreaRatios';

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const visible=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
function must(re:RegExp,text:string):RegExpExecArray{
 const m=re.exec(text);
 expect(m,`pattern ${re} should match visible text: ${text}`).not.toBeNull();
 return m as RegExpExecArray;
}
function kind(q:Question):string{
 const t=visible(q);
 if(/ratio of the area of Triangle A/.test(t))return 'ratio';
 if(/area of triangle ABC/.test(t))return 'regions';
 if(/not in triangle BED/.test(t))return 'rectangle';
 if(/same area as Triangle X/.test(t))return 'equal';
 return 'unknown';
}
const numberOf=(m:RegExpExecArray,i:number)=>Number(m[i]);

/** Solves only from visible context, prompt and choices. */
function solve(q:Question):string{
 const t=visible(q);
 const k=kind(q);
 if(k==='ratio'){
  const a=must(/Its base is (\d+) cm, its two equal sloping sides are (\d+) cm each, and its perpendicular height is (\d+) cm/,t);
  const b=must(/straight line: (\d+) cm and (\d+) cm\. Its perpendicular height is (\d+) cm/,t);
  const baseA=numberOf(a,1),slant=numberOf(a,2),heightA=numberOf(a,3);
  expect((baseA/2)**2+heightA**2).toBe(slant**2);
  const productA=baseA*heightA,productB=(numberOf(b,1)+numberOf(b,2))*numberOf(b,3),g=gcd(productA,productB);
  return JSON.stringify([String(productA/g),String(productB/g)]);
 }
 if(k==='regions'){
  const ratio=must(/BD : DC = (\d+) : (\d+)/,t),area=must(/area of triangle ABD is (\d+) cm²/,t);
  const m=numberOf(ratio,1),n=numberOf(ratio,2),abd=numberOf(area,1);
  return String(abd+abd*n/m);
 }
 if(k==='rectangle'){
  const midpoint=/midpoint of AD/.test(t);
  const ratio=midpoint?null:must(/DE : EA = (\d+) : (\d+)/,t);
  const m=ratio?numberOf(ratio,1):1,n=ratio?numberOf(ratio,2):1;
  const triangle=numberOf(must(/triangle BED is (\d+) cm²/,t),1);
  // Let AD be m + n units, so DE is m units. Then triangle = 1/2 × m × AB.
  const sideAB=2*triangle/m,rectangle=(m+n)*sideAB;
  return String(rectangle-triangle);
 }
 if(k==='equal'){
  const ref=must(/Triangle X has base (\d+) cm and perpendicular height (\d+) cm/,t);
  const target=numberOf(ref,1)*numberOf(ref,2);
  const matches=(q.choices??[]).filter(c=>{
   const m=must(/^base (\d+) cm and perpendicular height (\d+) cm$/,c);
   return numberOf(m,1)*numberOf(m,2)===target;
  });
  expect(matches).toHaveLength(1);
  return matches[0];
 }
 throw new Error(`Unrecognised question: ${t}`);
}

describe('triangle area ratios generator',()=>{
 it('exports the expected pattern metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-triangle-area-ratios');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.answer).toBe(solve(q));
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.explanation.length).toBeGreaterThan(0);
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(3);
   expect(JSON.stringify(q)).not.toMatch(/undefined|NaN/);
  }
 });

 it('uses all four variants and is deterministic',()=>{
  const kinds=new Set([0,1,2,3].map(i=>kind(makeRagQuestion(5,i))));
  expect([...kinds].sort()).toEqual(['equal','ratio','rectangle','regions']);
  expect(makeRagQuestion(9,2)).toEqual(makeRagQuestion(9,2));
  expect(makeRagQuestion(9,2).key).not.toBe(makeRagQuestion(9,3).key);
 });

 it('keeps ratio answers in simplest form and choices well formed',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   if(kind(q)==='ratio'){
    const [a,b]=JSON.parse(q.answer) as string[];
    expect(gcd(Number(a),Number(b))).toBe(1);
    expect(a).not.toBe(b);
    expect(q.structuredResponse?.kind).toBe('number-pair');
   }
   if(kind(q)==='equal'){
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain(q.answer);
   }
   if(kind(q)==='regions'||kind(q)==='rectangle'){
    expect(Number.isInteger(Number(q.answer))).toBe(true);
    expect(Number(q.answer)).toBeGreaterThan(0);
    expect(q.unit).toBe('cm²');
   }
  }
 });
});
