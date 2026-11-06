import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragRhombusIsosceles';
import {structuredResponseCorrect,structuredResponseReady} from './batch6MiddleResponse';

const rad=Math.PI/180;
type V=[number,number];
const angleAt=(v:V,p:V,q:V)=>{const a=[p[0]-v[0],p[1]-v[1]],b=[q[0]-v[0],q[1]-v[1]];return Math.acos((a[0]*b[0]+a[1]*b[1])/(Math.hypot(a[0],a[1])*Math.hypot(b[0],b[1])))/rad;};

// Independent solver 1: build the extension figure with coordinates from the visible apex angle.
function solveExtension(apex:number){
 const A:V=[0,0],D:V=[1,0],E:V=[Math.cos(apex*rad),Math.sin(apex*rad)];
 const len=Math.hypot(D[0]-E[0],D[1]-E[1]),C:V=[D[0]+(D[0]-E[0])/len,D[1]+(D[1]-E[1])/len];
 return Math.round(angleAt(A,C,E));
}
// Independent solver 2: triangle DEF from the apex angle, DC parallel to EF.
function solveParallel(c:number,e:number){
 const E:V=[0,0],F:V=[1,0],D:V=[Math.cos(e*rad),Math.sin(e*rad)];
 const edf=angleAt(D,E,F),edc=angleAt(D,E,[D[0]+1,D[1]]);
 return [Math.round(edf),Math.round(180-c-edc)];
}
// Independent solver 3: test the statement for every possible base angle x of the isosceles triangle.
function classify(g:number,statement:string){
 const names=[...statement.matchAll(/∠([A-Z]{3})/g)].map(m=>m[1]);
 const target=Number(/=\s*(\d+)°/.exec(statement)![1]);
 const value=(n:string,x:number)=>n==='BAD'?g-x:n==='ABC'?180-g+x:n==='DEC'?x:NaN;
 let hold=0,total=0;
 for(let x=1;x<=89;x++){total++;if(Math.abs(names.reduce((s,n)=>s+value(n,x),0)-target)<1e-9)hold++;}
 return hold===total?'True':hold===0?'False':'Not possible to tell';
}

const all=()=>{const out=[];for(let seed=1;seed<=30;seed++)for(let index=0;index<15;index++)out.push(makeRagQuestion(seed,index));return out;};

describe('rhombus with an isosceles construction',()=>{
 it('exports consistent metadata',()=>{
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-rhombus-isosceles-construction');
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('is deterministic and gives distinct keys',()=>{
  expect(JSON.stringify(makeRagQuestion(7,4))).toBe(JSON.stringify(makeRagQuestion(7,4)));
  const keys=all().map(q=>q.key);
  expect(new Set(keys).size).toBe(keys.length);
 });
 it('solves the extension variant from the visible apex angle',()=>{
  let seen=0;
  for(const q of all().filter(q=>q.prompt==='Find angle CAE.')){
   const apex=Number(/Angle EAD = (\d+)°/.exec(q.context!.join(' '))![1]);
   expect(Number(q.answer)).toBe(solveExtension(apex));
   expect(apex).not.toBe(40);
   expect(q.picture).toBeTruthy();seen++;
  }
  expect(seen).toBeGreaterThan(20);
 });
 it('solves both linked parts of the parallel variant and accepts only the right pair',()=>{
  let seen=0;
  for(const q of all().filter(q=>q.prompt==='Find angle EDF and angle ADE.')){
   const text=q.context!.join(' ');
   const c=Number(/Angle BCD = (\d+)°/.exec(text)![1]),e=Number(/angle DEF = (\d+)°/.exec(text)![1]);
   expect(e%2).toBe(0);expect(e).toBeGreaterThan(c+15);
   const [edf,ade]=solveParallel(c,e);
   expect(JSON.parse(q.answer)).toEqual([String(edf),String(ade)]);
   const spec=q.structuredResponse!;
   expect(spec.kind).toBe('number-fields');
   expect(structuredResponseReady(spec,q.answer)).toBe(true);
   expect(structuredResponseCorrect(spec,q.answer,JSON.stringify([String(edf),String(ade)]))).toBe(true);
   expect(structuredResponseCorrect(spec,q.answer,JSON.stringify([String(edf+1),String(ade)]))).toBe(false);
   const labels=(q.picture as unknown as {marks:{kind:string;text?:string}[]}).marks.filter(m=>m.kind==='text').map(m=>m.text);
   expect(labels).toContain(`${c}°`);expect(labels).toContain(`${e}°`);
   seen++;
  }
  expect(seen).toBeGreaterThan(20);
 });
 it('classifies each statement by testing all possible base angles',()=>{
  const answers=new Set<string>();let seen=0;
  for(const q of all().filter(q=>q.prompt.startsWith('Is this statement true'))){
   const g=Number(/Angle BCE = (\d+)°/.exec(q.context!.join(' '))![1]);
   expect(q.choices).toEqual(['True','False','Not possible to tell']);
   expect(q.answer).toBe(classify(g,q.display!));
   answers.add(q.answer);seen++;
  }
  expect(seen).toBeGreaterThan(20);
  expect(answers.size).toBe(3);
 });
 it('uses all three variants and includes worked steps and hints',()=>{
  const prompts=new Set(all().map(q=>q.prompt.slice(0,12)));
  expect(prompts.size).toBe(3);
  for(const q of all()){expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);expect(q.hint.length).toBeGreaterThan(10);expect(q.explanation.length).toBeGreaterThan(20);}
 });
});
