import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragClassifyTrianglesEquality';

type Q=ReturnType<typeof makeRagQuestion>;
const ctx=(q:Q)=>q.context??[];

function isoMatches(q:Q):string[]{
 const found:string[]=[];
 for(const line of ctx(q)){
  const m=/^Triangle ([A-D]) has angles of (\d+)° and (\d+)°\.$/.exec(line);
  if(!m)continue;
  const a=Number(m[2]),b=Number(m[3]),c=180-a-b;
  if(c<=0)throw new Error('impossible triangle');
  if(a===b||a===c||b===c)found.push(`Triangle ${m[1]}`);
 }
 return found;
}

function equiMatches(q:Q):string[]{
 const found:string[]=[];
 for(const line of ctx(q)){
  const m=/^Triangle ([A-D]) has (.+)\.$/.exec(line);
  if(!m)continue;
  const rest=m[2];
  let angles:number[]|null=null;
  let t=/^two equal sides, and the angle between those two sides is (\d+)°$/.exec(rest);
  if(t){const x=Number(t[1]),y=(180-x)/2;angles=[x,y,y];}
  t=/^angles of (\d+)° and (\d+)°$/.exec(rest);
  if(t){const a=Number(t[1]),b=Number(t[2]);angles=[a,b,180-a-b];}
  t=/^a right angle and a (\d+)° angle$/.exec(rest);
  if(t){const a=Number(t[1]);angles=[90,a,90-a];}
  if(!angles)throw new Error(`unparsed line: ${line}`);
  if(angles.every(a=>a>0&&a===angles![0]))found.push(`Triangle ${m[1]}`);
 }
 return found;
}

function sidesSolve(q:Q):string{
 const name=/triangle ([A-Z]{3}) are equal/.exec(q.prompt)![1];
 const names=name.split('');
 const known=new Map<string,number>();
 for(const line of ctx(q)){const m=/^Angle ([A-Z]) = (\d+)°\.$/.exec(line);if(m)known.set(m[1],Number(m[2]));}
 expect(known.size).toBe(2);
 const total=[...known.values()].reduce((a,b)=>a+b,0);
 const all=new Map(known);
 for(const n of names)if(!all.has(n))all.set(n,180-total);
 expect(all.get(names.find(n=>!known.has(n))!)!).toBeGreaterThan(0);
 const equalVertices:string[]=[];
 for(const a of names)for(const b of names)if(a<b&&all.get(a)===all.get(b))equalVertices.push(a,b);
 expect(equalVertices.length).toBe(2);
 const opposite=(v:string)=>names.filter(n=>n!==v).sort().join('');
 return equalVertices.map(opposite).join(' and ');
}

const sideOrder=(answer:string)=>answer.split(' and ').slice().sort().join(' and ');

function check(q:Q){
 if(q.prompt.includes('isosceles')){
  const hits=isoMatches(q);
  expect(ctx(q).filter(l=>l.startsWith('Triangle ')).length).toBe(4);
  expect(hits).toEqual([q.answer]);
  expect(q.choices).toContain(q.answer);
  return 'iso';
 }
 if(q.prompt.includes('equilateral')){
  const hits=equiMatches(q);
  expect(ctx(q).filter(l=>l.startsWith('Triangle ')&&l.includes(' has ')).length).toBe(4);
  expect(hits).toEqual([q.answer]);
  expect(q.choices).toContain(q.answer);
  return 'equi';
 }
 expect(q.prompt).toMatch(/^Which two sides of triangle/);
 expect(q.choices?.length).toBe(3);
 expect(q.choices).toContain(q.answer);
 const expected=sidesSolve(q);
 expect(sideOrder(q.answer)).toBe(sideOrder(expected));
 const matching=(q.choices??[]).filter(c=>sideOrder(c)===sideOrder(expected));
 expect(matching).toEqual([q.answer]);
 return 'sides';
}

describe('p5 classify triangles by equality',()=>{
 it('answers match an independent solver reading only visible givens',()=>{
  const seen=new Set<string>();
  for(let seed=0;seed<80;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   seen.add(check(q));
   expect(q.workedSteps?.length).toBeGreaterThan(0);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.explanation.length).toBeGreaterThan(0);
  }
  expect([...seen].sort()).toEqual(['equi','iso','sides']);
 });
 it('is deterministic and varies across seeds',()=>{
  expect(makeRagQuestion(7,1)).toEqual(makeRagQuestion(7,1));
  const distinct=new Set<string>();
  for(let seed=0;seed<60;seed++){const q=makeRagQuestion(seed,0);distinct.add(JSON.stringify([q.prompt,q.context,q.answer]));}
  expect(distinct.size).toBeGreaterThan(30);
 });
 it('declares matching metadata',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-classify-triangles-by-equality');
  expect(RAG_PATTERN.skillIds.every(id=>/^P5\.S\.(SHAPE|ANGLE)\.0\d$/.test(id))).toBe(true);
  expect(makeRagQuestion(3,0).key).toContain(RAG_PATTERN.id);
 });
});
