import {describe,it,expect} from 'vitest';
import {PLAN} from './plan';
import {LESSONS} from '../catalog';
import {lessonExample} from './sequence';
import {numberSpec,arithmeticSpec} from './families/numbers';
import {fractionSpec} from './families/fractions';
import {measureSpec} from './families/measure';
import {modelFor,visualQuestion} from '../depth/catalogue/questions';

const plan=(id:string)=>PLAN.find(p=>p.id===id)!;
const NUMBERS=['p1s-wn-03','p1s-wn-04','p1s-wn-05','p2s-wn-03','p2s-wn-04','p2s-wn-05','p2s-wn-06'];

describe('Pictures for early primary questions',()=>{
 it('keeps number names, comparisons and patterns grounded in the actual given numbers',()=>{
  for(const id of NUMBERS)for(let seed=0;seed<80;seed++){
   const p=plan(id),e=lessonExample(p,numberSpec(p),seed,seed%6),t=modelFor(p,e),where=`${id}: ${e.prompt}`;
   expect(t.kind,where).not.toBe('table');
   if(t.kind==='scene'){
    expect(t.scene,where).toBe('place');
    const n=t.values[0];
    if(/in numerals/.test(e.prompt))expect(n,where).toBe(Number(e.answer));
    else expect(e.prompt,where).toContain(String(n));
    if(/odd or even/.test(e.prompt)){
     expect(e.answer,where).toBe(n%2?'Odd':'Even');
     expect(t.values[2],where).toBe(String(n).length-1);
    }
   }else if(t.kind==='diagram'&&t.picture.type==='pattern'){
    const values=t.picture.items.filter(x=>/^\d+$/.test(x)).map(Number);
    expect(values,where).toEqual(e.prompt.match(/\d+/g)!.map(Number));
    if(/Continue/.test(e.prompt)){
     const jumps=values.slice(1).map((v,i)=>v-values[i]);
     expect(new Set(jumps).size,where).toBe(1);
     expect(Number(e.answer),where).toBe(values.at(-1)!+jumps[0]);
     expect(t.picture.items.at(-1),where).toBe('?');
     expect(visualQuestion(p,e,t).prompt,where).not.toContain('table');
    }
   }
  }
 });
 it('shows actual equal shares, without a table or a printed answer',()=>{
  for(const p of PLAN.filter(p=>p.level<=2&&p.code==='MD'))for(let seed=0;seed<80;seed++){
   const e=lessonExample(p,arithmeticSpec(p),seed,seed%6),f=e.evidence;if(f?.op!=='/')continue;
   const t=modelFor(p,e);expect(t.kind,e.prompt).toBe('share');if(t.kind!=='share')continue;
   expect(t.total).toBe(f.a);expect(t.people).toBe(f.b);expect(t.given).toHaveLength(f.b);
   expect(t.given.reduce((a,b)=>a+b,0)).toBe(t.total);
   expect(t.given.every(n=>n===Number(e.answer))).toBe(true);
   expect(t.hideValue).toBe(true);
  }
 });
 it('shows both like fractions with equal-sized wholes and the original quantities',()=>{
  const p=plan('p2s-frac-05');
  for(let seed=0;seed<80;seed++){
   const e=lessonExample(p,fractionSpec(p),seed,seed%6),t=modelFor(p,e),f=e.evidence!;
   expect(t.kind).toBe('fractions');if(t.kind!=='fractions')continue;
   expect(t.denominators[0]).toBe(t.denominators[1]);
   expect(t.shaded[0]/t.denominators[0]).toBeCloseTo(f.a);
   expect(t.shaded[1]/t.denominators[1]).toBeCloseTo(f.b);
   expect(t.shaded.every((n,i)=>n>=0&&n<=t.denominators[i])).toBe(true);
   expect(t.hideValue).toBe(true);
  }
 });
 it('uses measurement bars on a common scale, with the right units and no answer label',()=>{
  for(const id of ['p2s-measure-01','p2s-measure-02','p2s-measure-03'])for(let seed=0;seed<40;seed++){
   const p=plan(id),e=lessonExample(p,measureSpec(p),seed,seed%6),t=e.tool;
   expect(t.kind).toBe('bar');if(t.kind!=='bar'||!t.compare)continue;
   expect(Math.abs(t.compare.top!-t.compare.bottom!)).toBe(Number(e.answer));
   expect(t.compare.names.every(n=>n.includes(`(${e.unit})`))).toBe(true);
   expect(t.hideValue).toBe(true);
   expect(visualQuestion(p,e,t).prompt).not.toContain('table');
  }
 });
 it('shows the object being measured when choosing units, without unrelated sample readings',()=>{
  const p=plan('p2s-measure-04');
  for(let seed=0;seed<30;seed++){
   const e=lessonExample(p,measureSpec(p),seed,seed%6),t=e.tool;
   expect(t.kind).toBe('diagram');if(t.kind!=='diagram')continue;
   expect(t.picture.type).toBe('pattern');if(t.picture.type!=='pattern')continue;
   const icon=e.prompt.includes('classroom')?'🏫':e.prompt.includes('pencil')?'✏️':e.prompt.includes('child')?'🧒':'🪣';
   expect(t.picture.items).toEqual([icon]);
   expect(t.caption).not.toMatch(/\d/);
  }
 });
 it('starts duration questions with the actual start clock, leaving the finish to the child',()=>{
  const p=plan('p1s-time-03');
  for(let seed=0;seed<40;seed++){
   const e=lessonExample(p,measureSpec(p),seed,seed%6),t=e.tool;
   expect(t.kind).toBe('diagram');if(t.kind!=='diagram'||t.picture.type!=='clock')continue;
   const [_,h,m,half]=e.prompt.match(/starts at (\d+):(\d+) (am|pm)/)!;
   const start=(Number(h)%12+(half==='pm'?12:0))*60+Number(m);
   expect(t.picture.minutes).toBe(start);expect(t.caption).not.toContain(e.answer);
  }
 });
 it('uses the revised pictures in the real worked examples, not only raw question builders',()=>{
  const ids=[...NUMBERS,'p1s-md-02','p2s-md-03','p2s-frac-05','p2s-measure-01','p2s-measure-02','p2s-measure-03','p2s-measure-04','p1s-time-03'];
  for(const id of ids){const worked=LESSONS.find(l=>l.id===id)!.stages.find(s=>s.kind==='worked')!;expect(worked.kind==='worked'&&worked.tool?.kind,id).not.toBe('table');}
 });
});
