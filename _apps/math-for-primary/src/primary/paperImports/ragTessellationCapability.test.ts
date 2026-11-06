import {describe,expect,it} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragTessellationCapability';

type Pt=[number,number];
const key=(p:Pt)=>p.join(',');
const cross=(o:Pt,a:Pt,b:Pt)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);

/** Rebuild each drawn polygon from the visible segments only. */
function polygons(q:Question):Pt[][]{
 const pic=q.picture as unknown as {type:string;segments:[Pt,Pt][]};
 expect(pic.type).toBe('grid-drawing');
 const adjacent=new Map<string,Pt[]>();
 for(const [a,b] of pic.segments){
  adjacent.set(key(a),[...(adjacent.get(key(a))??[]),b]);
  adjacent.set(key(b),[...(adjacent.get(key(b))??[]),a]);
 }
 const seen=new Set<string>(),result:Pt[][]=[];
 for(const k of adjacent.keys()){
  if(seen.has(k))continue;
  const start=k.split(',').map(Number) as Pt,points:Pt[]=[start];seen.add(k);
  let previous=k,current=adjacent.get(k)![0];
  while(key(current)!==k){
   points.push(current);seen.add(key(current));
   const next=adjacent.get(key(current))!.find(p=>key(p)!==previous)!;
   previous=key(current);current=next;
  }
  const corners=points.filter((p,i)=>cross(points[(i+points.length-1)%points.length],p,points[(i+1)%points.length])!==0);
  result.push(corners);
 }
 return result.sort((a,b)=>Math.min(...a.map(p=>p[0]))-Math.min(...b.map(p=>p[0])));
}

/** Independent rule-based classification from the drawn corners. */
function canTessellate(points:Pt[]):boolean{
 const n=points.length;
 const turns=points.map((p,i)=>cross(p,points[(i+1)%n],points[(i+2)%n]));
 const convex=turns.every(t=>t>0)||turns.every(t=>t<0);
 if(n===3||n===4)return true;
 if(n===6&&convex){
  const sums=points.slice(0,3).map((p,i)=>[p[0]+points[i+3][0],p[1]+points[i+3][1]]);
  if(sums.every(s=>s[0]===sums[0][0]&&s[1]===sums[0][1]))return true;
 }
 if(n>=7&&convex)return false;
 throw new Error(`Cannot classify a ${n}-sided shape`);
}

const parseGroup=(label:string):string[]=>label.startsWith('None')?[]:label.startsWith('All')?['A','B','C','D']:label.split(' and ');

function solve(q:Question):string{
 const letters=['A','B','C','D'],shapes=polygons(q);
 expect(shapes).toHaveLength(4);
 const yes=letters.filter((_,i)=>canTessellate(shapes[i]));
 const no=letters.filter(l=>!yes.includes(l));
 if(q.prompt.includes('cannot')){expect(no).toHaveLength(1);return no[0];}
 if(q.choices!.every(c=>c.length===1)){expect(yes).toHaveLength(1);return yes[0];}
 const matches=q.choices!.filter(c=>{const g=parseGroup(c);return g.length===yes.length&&g.every(l=>yes.includes(l));});
 expect(matches).toHaveLength(1);
 return matches[0];
}

describe('tessellation capability generator',()=>{
 it('declares valid metadata and curriculum skills',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p5-')).toBe(true);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });
 it('has an answer that matches an independent solution from the drawn shapes',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.choices!.filter(c=>c===q.answer)).toHaveLength(1);
   expect(new Set(q.choices).size).toBe(q.choices!.length);
   expect(solve(q)).toBe(q.answer);
  }
 });
 it('uses all three question styles and shows different shapes',()=>{
  const styles=new Set<string>(),counts=new Set<number>();
  for(let seed=1;seed<=40;seed++){
   const q=makeRagQuestion(seed,0);
   styles.add(q.prompt.includes('cannot')?'cannot':q.choices!.every(c=>c.length===1)?'one':'group');
   polygons(q).forEach(p=>counts.add(p.length));
  }
  expect([...styles].sort()).toEqual(['cannot','group','one']);
  expect(counts.has(3)||counts.has(4)).toBe(true);
  expect([...counts].some(n=>n>=7)).toBe(true);
 });
 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
  const prompts=new Set(Array.from({length:30},(_,i)=>JSON.stringify([makeRagQuestion(i,0).prompt,makeRagQuestion(i,0).picture])));
  expect(prompts.size).toBeGreaterThan(10);
 });
 it('gives explanations and avoids source text',()=>{
  for(let seed=1;seed<=20;seed++){
   const q=makeRagQuestion(seed,1);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
   expect(JSON.stringify(q)).not.toMatch(/Rosyth|Raffles|sgexam/i);
  }
 });
});
