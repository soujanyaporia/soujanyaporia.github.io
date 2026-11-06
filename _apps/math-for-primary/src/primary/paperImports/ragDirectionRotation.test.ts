import {describe,expect,it} from 'vitest';
import {correctAnswer} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragDirectionRotation';

interface Mark{kind:string;text?:string;x?:number;y?:number;x1?:number;y1?:number;x2?:number;y2?:number}
const must=<T>(value:T|undefined|null,message='missing value'):T=>{
 if(value===undefined||value===null)throw new Error(message);
 return value;
};
const group=(m:RegExpExecArray|null,i:number):string=>must(must(m,'no regex match')[i],`no group ${i}`);
const marksOf=(picture:unknown):Mark[]=>must((picture as {marks?:Mark[]}|undefined)?.marks,'no marks');

function placesOf(context:string[]):string[]{
 const row=must(context.find(c=>c.startsWith('Going clockwise from the top')),'no places line');
 return group(/: (.+)\.$/.exec(row),1).split(', ');
}

/** Independent solver: reads only the visible context and prompt. */
function solve(q:ReturnType<typeof makeRagQuestion>):string{
 const context=must(q.context,'no context'),joined=context.join(' ');
 if(q.prompt.startsWith('Through what angle')){
  const places=placesOf(context),n=places.length;
  const from=places.indexOf(group(/is facing the ([A-Za-z]+)\./.exec(joined),1));
  const to=places.indexOf(group(/turns clockwise until facing the ([A-Za-z]+)\./.exec(joined),1));
  return String(((to-from+n)%n)*360/n);
 }
 if(q.prompt.includes('before the turn')){
  const places=placesOf(context),n=places.length,m=/After turning (\d+)° (clockwise|anticlockwise), [A-Za-z]+ is facing the ([A-Za-z]+)\./.exec(joined);
  const steps=Number(group(m,1))/(360/n),now=places.indexOf(group(m,3));
  const before=group(m,2)==='anticlockwise'?now+steps:now-steps;
  return must(places[((before%n)+n)%n]);
 }
 if(q.prompt.startsWith('Which number')){
  const start=Number(group(/points to the (\d+)\./.exec(joined),1));
  const m=/turns (\d+)\/(\d+) of a full turn clockwise/.exec(joined);
  const steps=12*Number(group(m,1))/Number(group(m,2));
  expect(Number.isInteger(steps)).toBe(true);
  return String((start-1+steps)%12+1);
 }
 throw new Error(`Unknown prompt ${q.prompt}`);
}

const variantOf=(q:ReturnType<typeof makeRagQuestion>)=>q.prompt.startsWith('Through')?'angle':q.prompt.includes('before')?'initial':'clock';

describe('ragDirectionRotation',()=>{
 it('declares valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.skillIds).toContain('P5.S.ANGLE.04');
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-direction-and-rotation');
 });

 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   expect(solve(q)).toBe(q.answer);
   expect(correctAnswer(q,q.answer)).toBe(true);
   expect(q.hint.length).toBeGreaterThan(5);
   expect(must(q.workedSteps).length).toBeGreaterThanOrEqual(3);
   if(q.choices){
    expect(q.choices).toContain(q.answer);
    expect(new Set(q.choices).size).toBe(q.choices.length);
   }
  }
 });

 it('uses all three variants and varies the questions',()=>{
  const variants=new Set<string>(),distinct=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   variants.add(variantOf(q));
   distinct.add(JSON.stringify([q.prompt,q.context,q.answer]));
  }
  expect([...variants].sort()).toEqual(['angle','clock','initial']);
  expect(distinct.size).toBeGreaterThan(60);
 });

 it('keeps answers inside the allowed bounds',()=>{
  for(let seed=1;seed<=80;seed++){
   const q=makeRagQuestion(seed,seed);
   const v=variantOf(q);
   if(v==='angle'){
    const degrees=Number(q.answer);
    expect(degrees%45).toBe(0);
    expect(degrees).toBeGreaterThanOrEqual(45);
    expect(degrees).toBeLessThanOrEqual(315);
    expect(correctAnswer(q,String(degrees+45))).toBe(false);
   }
   if(v==='clock'){
    const n=Number(q.answer);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(12);
   }
  }
 });

 it('is deterministic for the same seed and index',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  expect(makeRagQuestion(7,2).key).not.toBe(makeRagQuestion(7,3).key);
 });

 it('draws figures consistent with the stated givens',()=>{
  for(let seed=1;seed<=45;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),marks=marksOf(q.picture),labels=marks.filter(m=>m.kind==='text');
   expect((q.picture as unknown as {type:string}).type).toBe('batch11-upper');
   if(variantOf(q)==='clock'){
    const joined=must(q.context).join(' '),start=Number(group(/points to the (\d+)\./.exec(joined),1));
    expect(labels.map(m=>m.text).sort()).toEqual(Array.from({length:12},(_,i)=>String(i+1)).sort());
    const hand=must(marks.find(m=>m.kind==='line'),'no hand');
    const dx=must(hand.x2)-must(hand.x1),dy=must(hand.y1)-must(hand.y2);
    const angle=(Math.atan2(dx,dy)*180/Math.PI+360)%360;
    expect(Math.abs(angle-(start*30)%360)).toBeLessThan(1);
   }else{
    const places=placesOf(must(q.context));
    expect(places).toHaveLength(8);
    expect(new Set(places).size).toBe(8);
    expect(labels.map(m=>m.text)).toEqual(places);
    const ys=labels.map(m=>must(m.y));
    expect(ys[0]).toBe(Math.min(...ys));
    expect(ys[4]).toBe(Math.max(...ys));
   }
  }
 });
});
