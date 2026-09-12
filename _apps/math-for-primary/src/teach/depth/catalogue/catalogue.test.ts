import {describe,it,expect} from 'vitest';
import {PLAN} from '../../build/plan';
import {LESSONS,lessonById} from '../../catalog';
import {Rng} from '../../../engine/random';
import {numberSpec} from '../../build/families/numbers';
import {proportionSpec} from '../../build/families/proportion';
import {fractionSpec} from '../../build/families/fractions';
import {modelFor,visualQuestion} from './questions';
import {teachingFocus} from './focus';
import {visualGuide} from '../../build/guides';
import {goalReachable} from '../../tools/moves';

const plan=(id:string)=>PLAN.find(p=>p.id===id)!;
describe('Catalogue teaching quality safeguards',()=>{
 it('gives every catalogue lesson a depth revision and recovery for every assessment question',()=>{
  expect(LESSONS).toHaveLength(265);
  for(const lesson of LESSONS){
   expect(lesson.revision,lesson.id).toMatch(/^(catalogue-depth|depth)-/);
   const check=lesson.stages.find(s=>s.kind==='mastery');expect(check,lesson.id).toBeDefined();
   if(check?.kind==='mastery')for(const g of check.gens)for(const seed of [7,31,129]){
    const q=g.gen(seed,0);expect(q.simpler,`${lesson.id}:${g.facet}`).toBeDefined();expect(q.another?.length,lesson.id).toBeGreaterThan(0);
    if(g.facet==='visual'||g.facet==='unfamiliar'){expect(q.tool,lesson.id).toBeDefined();expect(q.requiresModel,lesson.id).toBe(true);}
   }
  }
 });
 it('teaches a building block before new content in every focused sequence',()=>{
  for(const p of PLAN.filter(p=>p.code!=='AVG')){
   const l=lessonById(p.id)!;expect(l.stages[0].kind,p.id).toBe('readiness');
   expect(l.stages.findIndex(s=>s.kind==='hook'),p.id).toBeLessThan(l.stages.findIndex(s=>s.kind==='explain'));
   const f=teachingFocus(p);expect(f.answer,p.id).not.toBe(f.error);expect(f.why.length,p.id).toBeGreaterThan(45);
  }
 });
 it('keeps every newly added exploration achievable through actual model controls',()=>{
  for(const p of PLAN)for(const s of lessonById(p.id)!.stages)if(s.kind==='explore'){
   expect(s.goal(s.tool),p.id).toBe(false);expect(goalReachable(s.tool,s.goal),p.id).toBe(true);
  }
 });
 it('uses the actual price, quantity and requested unknown in rate models',()=>{
  const p=plan('p5s-rate-02');
  for(let seed=0;seed<70;seed++)for(let variant=0;variant<3;variant++){
   const e=proportionSpec(p).example(new Rng(seed),variant),t=modelFor(p,e);expect(t.kind).toBe('table');if(t.kind!=='table')continue;
   const [a,b]=t.rows[0].map(Number);expect(Number(e.answer)).toBe(variant===0?b/a:variant===1?a*b:b/a);
   expect(t.rows.flat()).not.toContain('?');
   expect(visualQuestion(p,e,t).prompt.replace('100%','')).not.toMatch(/\d/);
  }
 });
 it('keeps unknown original percentages out of the model and preserves the known share',()=>{
  const p=plan('p6s-pct-01');
  for(let seed=0;seed<80;seed++){
   const e=proportionSpec(p).example(new Rng(seed),0),t=modelFor(p,e);expect(t.kind).toBe('table');if(t.kind!=='table')continue;
   const [percent,part]=t.rows[0].map(Number);expect(Number(e.answer)).toBeCloseTo(part/percent*100,8);
   expect(t.headers).toEqual(['Known share (%)','Amount in that share']);expect(t.rows[0]).toHaveLength(2);expect(visualQuestion(p,e,t).prompt.replace('100%','')).not.toMatch(/\d/); 
  }
 });
 it('matches both money comparison amounts, rather than displaying an unrelated single amount',()=>{
  const p=plan('p2s-money-02');
  for(let seed=0;seed<70;seed++){
   const e=proportionSpec(p).example(new Rng(seed),0),t=modelFor(p,e);expect(t.kind).toBe('table');if(t.kind!=='table')continue;
   const amounts=[...e.prompt.matchAll(/\$(\d+\.\d+)/g)].map(m=>Number(m[1]));expect(t.rows[0].map(Number)).toEqual(amounts);
   const [a,b]=amounts;expect(e.answer).toBe(a<b?'<':a>b?'>':'=');
  }
 });
 it('represents fraction multiplication as an overlap of the two selected dimensions',()=>{
  const p=PLAN.find(p=>p.code==='FRAC'&&/fractions by fractions/.test(p.objective.toLowerCase()))??plan('p5s-frac-05');
  let checked=0;
  for(let seed=0;seed<80;seed++){
   const e=fractionSpec(p).example(new Rng(seed),0),t=modelFor(p,e);
   if(t.kind==='scene'&&t.scene==='fraction-product'){
    const [a,b,c,d]=t.values;expect(a).toBeLessThan(b);expect(c).toBeLessThan(d);
    const [n,den=1]=e.answer.split('/').map(Number);expect(n/den).toBeCloseTo(a*c/(b*d),8);checked++;
   }
  }
  expect(checked).toBeGreaterThan(0);
 });
 it('teaches simplifying by reducing part counts while preserving the chosen share',()=>{
  for(const p of PLAN.filter(p=>p.code==='FRAC'&&/simplif/.test(p.objective.toLowerCase()))){
   const guide=visualGuide(p),first=guide.frames[0].tool,last=guide.frames.at(-1)?.tool;
   expect(first?.kind,p.id).toBe('fractions');expect(last?.kind,p.id).toBe('fractions');
   if(first?.kind==='fractions'&&last?.kind==='fractions'){
    expect(last.denominators.at(-1)).toBeLessThan(first.denominators[0]);
    expect(last.shaded.at(-1)!/last.denominators.at(-1)!).toBe(first.shaded[0]/first.denominators[0]);
   }
   expect(teachingFocus(p).question).toContain('regroup');
  }
 });
 it('shows place-value groups without printing the requested digit value',()=>{
  const p=plan('p3s-wn-01');
  for(let seed=0;seed<60;seed++){
   const e=numberSpec(p).example(new Rng(seed),0),t=modelFor(p,e);expect(t.kind).toBe('scene');if(t.kind!=='scene')continue;
   expect(t.scene).toBe('place');expect(t.phase).toBe(0);
   expect(visualQuestion(p,e,t).prompt).not.toContain(t.values[0].toString());
  }
 });
});
