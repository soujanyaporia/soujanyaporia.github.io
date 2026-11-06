import {describe,expect,it} from 'vitest';
import {correctAnswer} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragPercentageAdjustedPayments';

const text=(q:{context?:string[]})=>(q.context??[]).join(' ');

// Independent solvers: they read only the visible context text, and use plain dollar arithmetic.
function solveChange(q:{context?:string[]}):number{
 const ctx=text(q);
 const amounts=[...ctx.matchAll(/\$(\d+\.\d{2})/g)].map(m=>Number(m[1]));
 expect(amounts.length).toBe(3);
 const qty=Number(/(\d+) ×/.exec(ctx)![1]);
 const gst=Number(/GST of (\d+)%/.exec(ctx)![1]);
 const paid=Number(/\$(\d+) note/.exec(ctx)![1]);
 const subtotal=amounts[0]+amounts[1]+qty*amounts[2];
 const change=paid-subtotal*(1+gst/100);
 expect(change).toBeGreaterThan(0);
 // The rounding must not sit on an exact tie.
 expect(Math.abs((change*10-Math.floor(change*10+1e-9))-0.5)).toBeGreaterThan(1e-4);
 return Math.round(change*10)/10;
}
function solvePlans(q:{context?:string[]}):number{
 const ctx=text(q);
 const price=Number(/costs \$(\d+)/.exec(ctx)![1]);
 const discount=Number(/(\d+)% discount/.exec(ctx)![1]);
 const downPct=Number(/down payment of ([\d.]+)%/.exec(ctx)![1]);
 const monthly=/\$(\d+) each month for (\d+) months/.exec(ctx)!;
 const cash=price*(1-discount/100);
 const instalment=price*downPct/100+Number(monthly[1])*Number(monthly[2]);
 expect(Math.abs(cash-instalment)).toBeGreaterThan(0.001);
 return Math.abs(cash-instalment);
}
function solveWeeks(q:{context?:string[]}):number{
 const ctx=text(q);
 const price=Number(/costs \$(\d+) before GST/.exec(ctx)![1]);
 const gst=Number(/GST of (\d+)%/.exec(ctx)![1]);
 const saving=Number(/saves \$(\d+) each week/.exec(ctx)![1]);
 const target=price*(1+gst/100);
 let weeks=0;
 while(weeks*saving<target-1e-9)weeks++;
 return weeks;
}
function solve(q:{prompt:string;context?:string[]}):number{
 if(/change/.test(q.prompt))return solveChange(q);
 if(/plan/i.test(q.prompt))return solvePlans(q);
 if(/weeks/.test(q.prompt))return solveWeeks(q);
 throw new Error('Unknown variant: '+q.prompt);
}

describe('percentage-adjusted payments',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-percentage-adjusted-payments');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches an independent solver from the visible givens',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   expect(Number(q.answer)).toBeCloseTo(solve(q),6);
  }
 });

 it('uses all three variants across indices',()=>{
  const seen=new Set<string>();
  for(let index=0;index<3;index++){
   const q=makeRagQuestion(7,index);
   seen.add(/change/.test(q.prompt)?'change':/plan/i.test(q.prompt)?'plan':'weeks');
  }
  expect([...seen].sort()).toEqual(['change','plan','weeks']);
 });

 it('is deterministic and varies with seed',()=>{
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
  const prompts=new Set<string>();
  for(let seed=1;seed<=30;seed++)prompts.add(JSON.stringify(makeRagQuestion(seed,0).context));
  expect(prompts.size).toBeGreaterThan(20);
 });

 it('shows both payment plans winning and weekly answers that need rounding up',()=>{
  let cashWins=0,planWins=0,weekRoundings=0;
  for(let seed=0;seed<90;seed++){
   const plan=makeRagQuestion(seed,1+((3-(seed%3))%3));
   if(/plan/i.test(plan.prompt)){
    const ctx=text(plan);
    const price=Number(/costs \$(\d+)/.exec(ctx)![1]);
    const d=Number(/(\d+)% discount/.exec(ctx)![1]);
    const x=Number(/down payment of ([\d.]+)%/.exec(ctx)![1]);
    const mm=/\$(\d+) each month for (\d+) months/.exec(ctx)!;
    if(price*(1-d/100)<price*x/100+Number(mm[1])*Number(mm[2]))cashWins++;else planWins++;
   }
   const wk=makeRagQuestion(seed,(2-(seed%3)+3)%3);
   if(/weeks/.test(wk.prompt)){
    const ctx=text(wk);
    const price=Number(/costs \$(\d+) before GST/.exec(ctx)![1]);
    const g=Number(/GST of (\d+)%/.exec(ctx)![1]);
    const s=Number(/saves \$(\d+) each week/.exec(ctx)![1]);
    if(Math.abs(price*(1+g/100)/s-Number(wk.answer))>1e-9)weekRoundings++;
   }
  }
  expect(cashWins).toBeGreaterThan(0);
  expect(planWins).toBeGreaterThan(0);
  expect(weekRoundings).toBeGreaterThan(0);
 });

 it('has hints, worked steps and works with the app answer checker',()=>{
  for(let index=0;index<6;index++){
   const q=makeRagQuestion(11,index);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect(q.picture).toBeUndefined();
   expect(correctAnswer(q,q.answer)).toBe(true);
   expect(correctAnswer(q,String(Number(q.answer)+1))).toBe(false);
  }
 });
});
