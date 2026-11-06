import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragPartitionedStraightAngle';

type Bars={type:string;layout?:string;rows?:{parts:{label:string;size:number}[]}[]};

function tokens(list:string[]){
 return list.map(t=>t==='a'?'a' as const:Number(/^(\d+)°$/.exec(t)?.[1]));
}
// Solves only from the visible context sentences (the ordered angle list).
function solveFromContext(context:string[]):number{
 const line=context.find(c=>c.startsWith('In order from'));
 const m=/the angles are (.+)\.$/.exec(line??'');
 if(!m)throw new Error('angle list missing');
 const t=tokens(m[1].split(', '));
 const unknowns=t.filter(x=>x==='a').length;
 const known=t.filter((x):x is number=>typeof x==='number');
 if(known.some(n=>!Number.isFinite(n)))throw new Error('bad token');
 if(unknowns===2&&!context.some(c=>c.includes('are equal')))throw new Error('equal statement missing');
 return (180-known.reduce((a,b)=>a+b,0))/unknowns;
}
// Solves again from the drawn bar labels.
function solveFromPicture(picture:unknown):number{
 const p=picture as Bars;
 expect(p.type).toBe('paper');expect(p.layout).toBe('bars');
 const t=tokens(p.rows![0].parts.map(x=>x.label));
 const unknowns=t.filter(x=>x==='a').length;
 return (180-t.filter((x):x is number=>typeof x==='number').reduce((a,b)=>a+b,0))/unknowns;
}

describe('partitioned straight angle generator',()=>{
 it('has the required pattern metadata',()=>{
  expect(RAG_PATTERN.id).toBe('p6-partitioned-straight-angle');
  expect(RAG_PATTERN.canonicalPatternId).toBe(RAG_PATTERN.id);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('matches an independent solution of the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   const expected=solveFromContext(q.context??[]);
   expect(Number.isInteger(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(expected).toBeLessThan(180);
   expect(Number(q.answer)).toBe(expected);
   expect(solveFromPicture(q.picture)).toBe(expected);
   expect(q.unit).toBe('°');
   expect(q.prompt).toMatch(/angle a/);
  }
 });
 it('uses all three variants and keeps the final worked step consistent',()=>{
  const shapes=new Set<string>();
  for(let index=0;index<9;index++){
   const q=makeRagQuestion(7,index);
   const t=tokens((/the angles are (.+)\.$/.exec(q.context![1])![1]).split(', '));
   shapes.add(`${t.length}:${t.filter(x=>x==='a').length}`);
   const last=q.workedSteps![q.workedSteps!.length-1];
   expect(last.equation).toContain(`${q.answer}°`);
   expect(q.hint.length).toBeGreaterThan(10);
  }
  expect(shapes.has('2:1')).toBe(true);
  expect(shapes.has('4:2')).toBe(true);
  expect([...shapes].some(s=>s.endsWith(':1')&&s!=='2:1')).toBe(true);
 });
 it('is deterministic and gives distinct keys',()=>{
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
  expect(makeRagQuestion(5,2).key).not.toBe(makeRagQuestion(5,3).key);
 });
 it('states a right angle only when 90° is shown',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   const mentions=q.context!.some(c=>c.includes('right angle'));
   expect(mentions).toBe(q.context![1].includes('90°'));
  }
 });
});
