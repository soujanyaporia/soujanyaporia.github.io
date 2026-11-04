import {describe,it,expect} from 'vitest';
import {Rng} from '../../engine/random';
import {PLAN} from './plan';
import {arithmeticSpec} from './families/numbers';
import {fractionSpec} from './families/fractions';
import {factsOf} from '../depth/catalogue/facts';
import {modelFor} from '../depth/catalogue/questions';

// Independent operator-stack evaluator: reads only the displayed expression.
function evaluate(expression:string){
 const tokens=expression.match(/\d+|[()+×]/g)!,values:number[]=[],ops:string[]=[];
 const apply=()=>{const op=ops.pop(),b=values.pop()!,a=values.pop()!;values.push(op==='+'?a+b:a*b);};
 const priority=(op:string)=>op==='×'?2:op==='+'?1:0;
 for(const token of tokens){if(/^\d+$/.test(token))values.push(Number(token));else if(token==='(')ops.push(token);else if(token===')'){while(ops.at(-1)!=='(')apply();ops.pop();}else{while(ops.length&&priority(ops.at(-1)!)>=priority(token))apply();ops.push(token);}}
 while(ops.length)apply();return values[0];
}
function fraction(text:string){const [n,d=1]=text.split('/').map(Number);return [n,d];}

describe('Official syllabus subpoint regressions',()=>{
 it('keeps long-division dividends in their syllabus range and teaches both related operations',()=>{
  for(const [id,max] of [['p3s-md-04',999],['p4s-md-03',9999]] as const){
   const p=PLAN.find(p=>p.id===id)!,spec=arithmeticSpec(p);
   for(let seed=0;seed<2000;seed++){
    const e=spec.example(new Rng(seed),seed%4),m=e.prompt.match(/^Calculate (\d+) ÷ (\d+)\.$/)!;
    expect(m,e.prompt).not.toBeNull();const dividend=Number(m[1]),divisor=Number(m[2]);
    expect(dividend).toBeLessThanOrEqual(max);expect(divisor).toBeGreaterThanOrEqual(2);expect(divisor).toBeLessThanOrEqual(9);
    expect(Number(e.answer)*divisor).toBe(dividend);
   }
  }
  for(const id of ['p2s-md-02','p2s-md-04','p5f-md-04']){
   const spec=arithmeticSpec(PLAN.find(p=>p.id===id)!),seen=new Set<string>();
   for(let seed=0;seed<100;seed++){const e=spec.example(new Rng(seed),seed%4),m=e.prompt.match(/(\d+) ([×÷]) (\d+)/)!;seen.add(m[2]);expect(Number(e.answer)).toBe(m[2]==='×'?Number(m[1])*Number(m[3]):Number(m[1])/Number(m[3]));}
   expect([...seen].sort()).toEqual(['×','÷']);
  }
 });
 it('actually asks bracketed expressions in both Standard and Foundation lessons',()=>{
  for(const id of ['p5s-wn-03','p5f-md-03']){
   const p=PLAN.find(p=>p.id===id)!,spec=arithmeticSpec(p),seen=new Set<string>();
   for(let seed=0;seed<200;seed++)for(let variant=0;variant<3;variant++){
    const e=spec.example(new Rng(seed),variant),expression=e.prompt.slice('Work out '.length,-1);
    expect(Number(e.answer),e.prompt).toBe(evaluate(expression));seen.add(factsOf(p,e).kind);
    if(expression.includes('(')){
     expect(e.steps[0]).toContain('inside the brackets');
     expect(e.tool.kind).toBe('table');
     expect(JSON.stringify(e.tool)).toContain(expression);
     expect(factsOf(p,e).kind).toBe('order-brackets');
    }
   }
   expect([...seen].sort()).toEqual(['order-brackets','order-ops']);
  }
 });
 it('covers every proper/improper multiplication combination required for each track',()=>{
  for(const id of ['p5s-frac-06','p5f-frac-08']){
   const p=PLAN.find(p=>p.id===id)!,spec=fractionSpec(p),seen=new Set<string>();
   for(let seed=0;seed<200;seed++)for(let variant=0;variant<12;variant++){
    const e=spec.example(new Rng(seed),variant),m=e.prompt.match(/^Find (\d+)\/(\d+) × (\d+)\/(\d+)\.$/)!;
    expect(m,e.prompt).not.toBeNull();const [a,b,c,d]=m.slice(1).map(Number),[n,den]=fraction(e.answer);
    expect(n*b*d,e.prompt).toBe(a*c*den);seen.add(`${a<b?'proper':'improper'}×${c<d?'proper':'improper'}`);
    const tool=modelFor(p,e);
    if(a>=b||c>=d){expect(tool.kind).toBe('table');expect(JSON.stringify(tool)).toContain(`${a}/${b}`);expect(JSON.stringify(tool)).toContain(`${c}/${d}`);}
   }
   expect(seen.has('proper×proper')).toBe(true);expect(seen.has('proper×improper')).toBe(true);
   expect(seen.has('improper×improper')).toBe(p.track!=='foundation');
  }
 });
});
