import {describe,it,expect} from 'vitest';
import {LESSONS,lessonById} from './catalog';
import {nextStageLabel} from './flow';
import {PLAN} from './build/plan';
import {visualGuide} from './build/guides';
import {arithmeticWorked} from './build/arithmeticSteps';
import {measureSpec} from './build/families/measure';
import {Rng} from '../engine/random';

describe('Connected teaching sequence',()=>{
 it('introduces the actual visual example instead of an unrelated calculation',()=>{
  const l=lessonById('p1s-as-07')!;
  const hook=l.stages.find(s=>s.kind==='hook')!,explain=l.stages.find(s=>s.kind==='explain')!,worked=l.stages.find(s=>s.kind==='worked')!;
  expect(hook.kind).toBe('hook');expect(explain.kind).toBe('explain');expect(worked.kind).toBe('worked');
  if(hook.kind!=='hook'||explain.kind!=='explain'||worked.kind!=='worked')return;
  expect(hook.text).toContain('13');expect(hook.text.toLowerCase()).toContain('take away 5');
  expect(explain.example).toBe(hook.text);
  expect(explain.frames![0].text).toContain('13');
  expect(worked.problem).toContain('17 counters. Take away 3');
  expect(worked.flow!.transition).toContain('changing the example');
  expect(worked.steps[0].text).toContain('17');
  expect(worked.steps.some(s=>s.ask?.answer==='14')).toBe(true);
 });

 it('keeps intermediate equations and inverse checks attached to their method',()=>{
  const g=visualGuide(PLAN.find(p=>p.id==='p1s-as-07')!);
  const throughTen=g.alternatives!.find(a=>a.label==='Go through 10')!;
  expect(throughTen.intro).toContain('first reach 10');
  expect(throughTen.frames.some(f=>f.math?.includes('13 − 3 = 10')&&f.math.includes('10 − 2 = 8'))).toBe(true);
  expect(throughTen.frames.at(-1)!.math).toBe('8 + 5 = 13');
  expect(g.method!.label).toBe('Take away');
  const pictures=g.frames.flatMap(f=>f.tool?.kind==='foundation-visual'&&f.tool.visual.type==='counters'?[f.tool.visual]:[]);
  expect(pictures.every(v=>v.groups.reduce((n,g)=>n+g.count,0)===13)).toBe(true);
  expect(pictures[0].groups).toHaveLength(1);
  expect(pictures.some(v=>v.groups.reduce((n,g)=>n+(g.crossed??0),0)===5)).toBe(true);
  expect(pictures.at(-1)!.groups.reduce((n,g)=>n+(g.crossed??0),0)).toBe(0);
  expect(g.frames.at(-1)!.caption).toContain('put back');
  const frames=arithmeticWorked({a:17,b:3,c:14,op:'-'},'Calculate 17 − 3.');
  expect(frames.at(-1)!.math).toBe('14 + 3 = 17');
 });

 it('provides a purpose and a descriptive next action throughout every Learn lesson',()=>{
  for(const l of LESSONS){
   expect(l.revision,l.id).toMatch(/^(connected-flow-2026-09-12|depth-2026-09-12-v1|catalogue-depth-2026-09-12-v1|catalogue-depth-2026-09-18-v2)$/);
   for(const [i,s] of l.stages.entries()){
    expect(s.flow?.transition.length,`${l.id}:${i}`).toBeGreaterThan(25);
    expect(s.flow?.label.length,`${l.id}:${i}`).toBeGreaterThan(5);
    expect(nextStageLabel(l.stages[i+1])).not.toBe('Next →');
    if(s.kind==='explain'&&s.frames)expect(s.example?.length,l.id).toBeGreaterThan(10);
   }
  }
 });

 it('keeps prerequisite booster pictures on the same values',()=>{
  for(const l of LESSONS.filter(l=>l.mission)){
   const s=l.stages.find(s=>s.kind==='readiness')!;
   if(s.kind!=='readiness')continue;
   expect(s.booster.filter(b=>b.tool).every(b=>JSON.stringify(b.tool)===JSON.stringify(s.items[0].tool)),l.id).toBe(true);
  }
 });

 it('keeps seconds questions, pictures and reasoning about minutes and seconds',()=>{
  const p=PLAN.find(p=>p.id==='p3s-time-01')!;
  const g=visualGuide(p);
  expect(g.setup).toContain('2 minutes and 15 seconds');
  expect(g.frames.at(-1)?.math).toBe('135 s = 2 min 15 s');
  for(let seed=0;seed<20;seed++){
   const e=measureSpec(p).example(new Rng(seed),0);
   expect(e.why).toContain('60 seconds');expect(e.why).not.toContain('hour');
   expect(e.tool.kind).toBe('table');
   if(e.tool.kind==='table'){
    const [m,s]=e.tool.rows[0].map(Number);
    expect(Number(e.answer)).toBe(m*60+s);
   }
  }
 });

 it('uses topic-specific pictures instead of neighbouring syllabus topics',()=>{
  const guide=(id:string)=>visualGuide(PLAN.find(p=>p.id===id)!);
  expect(guide('p6s-ratio-01').frames.some(f=>f.tool?.kind==='ratio'&&f.tool.names.length===3)).toBe(true);
  expect(guide('p4s-dec-01').frames.some(f=>f.tool?.kind==='place'&&f.tool.digits.length===3)).toBe(true);
  for(const p of PLAN.filter(p=>p.code==='GRAPH'&&/table/.test(p.objective)))expect(visualGuide(p).frames[0].tool?.kind,p.id).toBe('table');
  for(const p of PLAN.filter(p=>p.code==='FACT'&&/multiple/.test(p.objective)))expect(visualGuide(p).frames[0].tool?.kind,p.id).toBe('line');
 });
});
