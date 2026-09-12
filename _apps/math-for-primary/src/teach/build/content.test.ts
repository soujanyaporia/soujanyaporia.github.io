import {modelCaption} from './teachingNotes';
import {numberBondGuide,numberBondSpec,numberBondExample} from './families/numberBonds';
import {Rng} from '../../engine/random';
import {visualGuide} from './guides';
import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {PLAN} from './plan';
import {LESSONS} from '../catalog';
import {lessonExample,type TopicSpec} from './sequence';
import {numberSpec,arithmeticSpec} from './families/numbers';
import {fractionSpec} from './families/fractions';
import {proportionSpec} from './families/proportion';
import {measureSpec} from './families/measure';
import {spaceSpec} from './families/space';
import {dataSpec} from './families/data';
import {numberValue} from '../../primary/generate';
import {geometryMoves} from '../tools/GeometryWorkbench';
function spec(p:typeof PLAN[number]):TopicSpec|null{
 if(p.code==='AVG')return null;
 if(p.code==='WN')return /order of operations|brackets|multiply and divide by/.test(p.objective.toLowerCase())?arithmeticSpec(p):numberSpec(p);
 if(['AS','MD','FACT'].includes(p.code))return arithmeticSpec(p);
 if(p.code==='FRAC')return fractionSpec(p);
 if(['LENGTH','MEASURE','TIME','AREA','VOL'].includes(p.code)||p.code==='DEC'&&/measurement/.test(p.objective))return measureSpec(p);
 if(['ANGLE','LINES','SYM','SHAPE','SOLID','CIRCLE'].includes(p.code))return spaceSpec(p);
 if(p.code==='GRAPH')return dataSpec(p);
 return proportionSpec(p);
}
describe('Expanded syllabus content',()=>{
 it('explains removed and repeated groups without revealing a ghost quantity',()=>{
  const picture=(groups:import('../../engine/types').CountersSpec['groups'])=>modelCaption({kind:'foundation-visual',visual:{type:'counters',groups}});
  expect(picture([{count:7,color:'blue'},{count:13,color:'blue',crossed:13}])).toContain('starts with 20 counters');
  expect(picture([{count:7,color:'blue'},{count:13,color:'blue',crossed:13}])).toContain('13 taken away');
  expect(picture(Array.from({length:8},()=>({count:10,color:'blue'})))).toContain('8 equal groups, with 10 counters in each');
  expect(picture([{count:3,color:'blue'},{count:7,color:'green',ghost:true}])).not.toMatch(/7|10/);
 });

 it('keeps eight objects and their colours consistent across the number-bond story',()=>{
  const s=numberBondSpec();
  expect(s.anchor!.answer).toBe('3');
  expect(s.anchor!.evidence).toEqual({op:'-',a:8,b:5});
  const tools=[s.anchor!.tool,...numberBondGuide.frames.map(f=>f.tool),...s.worked!.map(f=>f.tool)];
  for(const tool of tools){
   expect(tool).toBeDefined();
   if(tool?.kind==='foundation-visual'){
    expect(tool.visual.type).toBe('counters');
    if(tool.visual.type==='counters'){
     const groups=tool.visual.groups;
     expect(groups.map(g=>[g.count,g.color])).toEqual([[5,'blue'],[3,'orange']]);
     expect(groups.reduce((n,g)=>n+g.count,0)).toBe(8);
     if(groups.some(g=>g.crossed)){
      expect(groups.reduce((n,g)=>n+(g.crossed??0),0)).toBe(5);
      expect(groups.filter(g=>!g.crossed).map(g=>g.color)).toEqual(['orange']);
     }
    }
   }else{expect(tool?.kind).toBe('bond');if(tool?.kind==='bond'){expect(tool.whole).toBe(8);expect(tool.parts).toEqual([5,3]);}}
  }
 });
 it('asks for the hidden quantity in each number-bond practice variant',()=>{
  for(let seed=0;seed<80;seed++)for(let mode=0;mode<3;mode++){
   const e=numberBondExample(new Rng(seed),mode),t=e.tool;
   expect(t.kind).toBe('bond');if(t.kind!=='bond')continue;
   expect(t.whole).toBe(t.parts[0]+t.parts[1]);
   expect(t.hide).toBe(['whole','b','a'][mode]);
   expect(Number(e.answer)).toBe(mode===0?t.whole:mode===1?t.parts[1]:t.parts[0]);
   const {a,b,op}=e.evidence!;
   expect(Number(e.answer)).toBe(op==='+'?a+b:a-b);
  }
 });

 it('keeps the opening question, coached example, response and takeaway connected',()=>{
  for(const l of LESSONS.filter(l=>l.mission)){
   const hook=l.stages.find(s=>s.kind==='hook')!,worked=l.stages.find(s=>s.kind==='worked')!,end=l.stages.at(-1)!;
   expect(hook.kind==='hook'&&hook.text,l.id).toBe(l.mission!.question);
   expect(worked.kind==='worked'&&worked.problem,l.id).toContain(l.mission!.question);
   expect(worked.kind==='worked'&&worked.steps.some(s=>s.ask?.prompt===l.mission!.question),l.id).toBe(true);
   expect(end.kind==='discovery'&&end.text,l.id).toContain(l.mission!.question);
   expect(l.stages.some(s=>s.kind==='notice'),l.id).toBe(true);
  }
 });
 it('explains the triangle-area model and distinguishes it from the height objective',()=>{
  const area=visualGuide(PLAN.find(p=>p.id==='p5s-area-02')!);
  expect(area.frames.every(f=>f.because&&f.because.length>30)).toBe(true);
  expect(area.frames.some(f=>f.wonder?.answer.includes('Both triangles'))).toBe(true);
  const height=visualGuide(PLAN.find(p=>p.code==='AREA'&&/Identify/.test(p.objective))!);
  expect(height.title).toContain('height');expect(height.frames.at(-1)?.text).toContain('sloping');
 });

 it('offers a dedicated lesson for every mapped objective in the correct class and course',()=>{
  expect(PLAN).toHaveLength(CURRICULUM_SKILLS.length);
  for(const skill of CURRICULUM_SKILLS){const l=LESSONS.find(l=>l.skillIds.length===1&&l.skillIds[0]===skill.id);expect(l,skill.id).toBeDefined();expect(l!.level).toBe(skill.level);expect(l!.track).toBe(skill.level<5?'both':skill.track);}
 });
 it('independently recomputes sampled numeric operations and rejects malformed question content',()=>{
  let checked=0;
  for(const p of PLAN){const s=spec(p);if(!s)continue;
   for(let seed=0;seed<120;seed++){const e=lessonExample(p,s,seed,seed%12),where=`${p.id} seed ${seed}: ${e.prompt}`;
    expect(JSON.stringify(e),where).not.toMatch(/undefined|NaN|Infinity/);
    expect(e.check.length,where).toBeGreaterThan(5);
    if(e.evidence){const {a,b,op}=e.evidence,expected=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:Math.round(a/b)*b;expect(numberValue(e.answer),where).toBeCloseTo(expected,5);checked++;}
    if(p.level===1&&p.code==='AS'){const values=e.prompt.match(/\d+/g)?.map(Number)??[];expect(values.every(n=>n<=100),where).toBe(true);expect(Number(e.answer),where).toBeLessThanOrEqual(100);if(/facts within 20/.test(p.objective))expect(Number(e.answer),where).toBeLessThanOrEqual(20);}
    if(p.level===1&&p.code==='TIME'&&/duration/.test(p.objective)){expect(e.prompt,where).toMatch(/am|pm/);expect(e.answer,where).toMatch(/am|pm/);}
   }
  }
  expect(checked).toBeGreaterThan(5000);
 },30000);
 it('reaches all six P1 shape variants across seeds',()=>{
  const p=PLAN.find(p=>p.skillIds.includes('P1.S.SHAPE.01'))!,s=spaceSpec(p);
  const names=new Set(Array.from({length:120},(_,i)=>lessonExample(p,s,i,0).answer));
  expect([...names].sort()).toEqual(['rectangle','square','triangle','circle','semicircle','quarter-circle'].sort());
 });
 it('keeps the P1 introductions inside their intended prerequisites',()=>{
  for(const p of PLAN.filter(p=>p.level===1&&p.code==='MONEY'))expect(proportionSpec(p).explore.tool.kind).toBe('counters');
  const clock=PLAN.find(p=>p.skillIds.includes('P1.S.TIME.01'))!;expect(measureSpec(clock).explore.goalHint).not.toContain('450');
  const graph=PLAN.find(p=>p.skillIds.includes('P1.S.GRAPH.01'))!;
  for(const frame of visualGuide(graph).frames)if(frame.tool?.kind==='diagram'&&frame.tool.picture.type==='bars')expect(frame.tool.picture.scale).toBe(1);
 });
 it('introduces protractor measurement after P3 right-angle comparison',()=>{
  for(const p of PLAN.filter(p=>p.level===3&&p.code==='ANGLE')){
   const tool=spaceSpec(p).explore.tool;expect(tool.kind).toBe('geometry');if(tool.kind==='geometry')expect(tool.showProtractor).toBe(false);
   expect(visualGuide(p).frames.map(f=>f.text).join(' ')).not.toMatch(/protractor|degrees/);
  }
 });
 it('keeps solid and rectangle dimensions positive and mirror points in the visible grid',()=>{
  for(const mode of ['solid','rectangle'] as const)expect(geometryMoves({kind:'geometry',mode,a:1,b:1}).every(t=>t.a>=1&&t.b>=1)).toBe(true);
  expect(geometryMoves({kind:'geometry',mode:'mirror',a:6,b:6}).every(t=>t.a<=6&&t.b<=6)).toBe(true);
 });
});
