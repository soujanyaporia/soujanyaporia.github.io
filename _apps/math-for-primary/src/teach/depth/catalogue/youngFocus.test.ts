import {expect,it} from 'vitest';
import {PLAN} from '../../build/plan';
import {youngFocus} from './youngFocus';
import {teachingFocus} from './focus';
it('gives every P1–P2 objective a short actionable prediction with distinct answers',()=>{
 for(const p of PLAN.filter(p=>p.level<=2)){
  const f=youngFocus(p);expect(f,p.id).toBeDefined();
  expect(f!.question.split(/\s+/).length,p.id).toBeLessThanOrEqual(22);
  expect(f!.answer,p.id).not.toBe(f!.error);
  expect(f!.answer.split(/\s+/).length,p.id).toBeLessThanOrEqual(14);
  expect(f!.question,p.id).not.toMatch(/benchmarks|quantities|defining|preserve|subdivision|instant in the day/);
 }
});
it('does not ask a six-year-old about unrelated three- or four-digit examples',()=>{
 for(const p of PLAN.filter(p=>p.level===1)){
  const f=teachingFocus(p);
  for(const n of [...[f.question,f.answer,f.error,f.why].join(' ').matchAll(/\b\d+\b/g)].map(m=>Number(m[0])))expect(n,p.id).toBeLessThanOrEqual(100);
 }
});
it('keeps the queue direction and the unjoined third group explicit',()=>{
 const ordinal=teachingFocus(PLAN.find(p=>p.id==='p1s-wn-06')!);
 expect(ordinal.answer).toBe('At the front.');expect(ordinal.why).toContain('other end changes');
 const three=teachingFocus(PLAN.find(p=>p.id==='p1s-as-06')!);
 expect(three.answer).toContain('still waiting');expect(three.why).toContain('all three');
 expect(youngFocus(PLAN.find(p=>p.id==='p6s-alg-05')!)).toBeUndefined();
});
