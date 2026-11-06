import {describe,expect,it} from 'vitest';
import {correctAnswer,numberValue,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {RAG_PATTERN,makeRagQuestion} from './ragFixedQuantityChanges';

type F={n:number;d:number};
const g=(a:number,b:number):number=>b?g(b,a%b):Math.abs(a);
const fr=(n:number,d:number):F=>{const x=g(n,d)||1;return {n:n/x,d:d/x};};
const plus=(a:F,b:F)=>fr(a.n*b.d+b.n*a.d,a.d*b.d);
const minus=(a:F,b:F)=>fr(a.n*b.d-b.n*a.d,a.d*b.d);
const read=(t:string):F=>{const m=/^(?:(\d+) )?(\d+)\/(\d+)$/.exec(t);return m?fr(Number(m[1]??0)*Number(m[3])+Number(m[2]),Number(m[3])):fr(Number(t),1);};
const show=(x:F)=>{const w=Math.floor(x.n/x.d),rest=x.n-w*x.d;return rest===0?String(w):w===0?`${rest}/${x.d}`:`${w} ${rest}/${x.d}`;};
const QTY=/(\d+ \d+\/\d+|\d+\/\d+|\d+) (?:L|kg|m)\b/;
const quantity=(s:string)=>{const m=QTY.exec(s);return m?read(m[1]):null;};

/** Solves only from the visible context sentences; never reads q.answer. */
function solve(q:Question):{kind:'reverse'|'jugs';value:F;validStory:boolean;left?:F}{
 const ctx=q.context??[];
 const each=ctx.find(s=>s.startsWith('Each '));
 if(each){
  const capacity=quantity(ctx.find(s=>/ holds /.test(s)&&!s.startsWith('Each '))!)!;
  const jug=quantity(each)!;
  const jugs=Number(/adds (\d+) jugs/.exec(ctx.join(' '))![1]);
  const value=minus(capacity,fr(jug.n*jugs,jug.d));
  return {kind:'jugs',value,validStory:value.n>0&&jugs>=3};
 }
 const changes:F[]=[];let left:F|null=null;
 for(const s of ctx){
  const v=quantity(s);if(!v)continue;
  if(/\b(used|poured out|cut off|took out)\b/.test(s))changes.push(fr(-v.n,v.d));
  else if(/\b(bought|poured in|tied on|added)\b/.test(s))changes.push(v);
  else if(/\bleft\b/.test(s))left=v;
 }
 expect(changes).toHaveLength(2);expect(left).not.toBeNull();
 const initial=minus(left!,plus(changes[0],changes[1]));
 // Replay the story forward in the order the sentences appear.
 let running=initial,valid=initial.n>0;
 for(const c of changes){running=plus(running,c);if(running.n<0)valid=false;}
 valid=valid&&running.n===left!.n&&running.d===left!.d;
 return {kind:'reverse',value:initial,validStory:valid,left:left!};
}

const questions=(seeds:number,perSeed:number)=>Array.from({length:seeds},(_,s)=>Array.from({length:perSeed},(_,i)=>makeRagQuestion(s+1,i))).flat();

describe('p5 fixed quantity changes generator',()=>{
 it('declares valid metadata and skill ids',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-fixed-quantity-changes');
  const known=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(known.has(id)).toBe(true);
 });

 it('answers match an independent solve of the visible givens',()=>{
  const kinds=new Set<string>();
  for(const q of questions(60,9)){
   const solved=solve(q);
   expect(solved.validStory).toBe(true);
   expect(q.answer).toBe(show(solved.value));
   expect(correctAnswer(q,show(solved.value))).toBe(true);
   expect(numberValue(q.answer)).toBeCloseTo(solved.value.n/solved.value.d,9);
   expect(correctAnswer(q,show(plus(solved.value,fr(1,1))))).toBe(false);
   kinds.add(solved.kind==='jugs'?'jugs':q.requireMixed?'mixed-reverse':'proper-reverse');
  }
  expect([...kinds].sort()).toEqual(['jugs','mixed-reverse','proper-reverse']);
 });

 it('enforces simplest-form response formats',()=>{
  for(const q of questions(40,6)){
   const v=solve(q).value;
   expect(q.requireSimplified).toBe(true);
   if(q.requireMixed){
    expect(v.n).toBeGreaterThan(v.d);
    expect(v.d).toBeGreaterThan(1);
    expect(correctAnswer(q,`${v.n}/${v.d}`)).toBe(false);
   }else{
    expect(v.n).toBeLessThan(v.d);
    expect(correctAnswer(q,`${v.n*2}/${v.d*2}`)).toBe(false);
   }
  }
 });

 it('is deterministic and varied, with worked steps and no broken text',()=>{
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  const all=questions(60,3);
  expect(new Set(all.map(q=>JSON.stringify([q.context,q.prompt]))).size).toBeGreaterThanOrEqual(120);
  for(const q of all){
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(10);
   const all=JSON.stringify(q);
   expect(all).not.toMatch(/undefined|NaN|null/);
   expect(q.picture).toBeUndefined();
  }
 });

 it('does not reproduce the stored source numbers',()=>{
  for(const q of questions(60,6)){
   const flat=(q.context??[]).join(' ');
   expect(/17 1\/4 L/.test(flat)&&/1 3\/4 L/.test(flat)&&/adds 9 jugs/.test(flat)).toBe(false);
  }
 });
});
