import {describe,it,expect} from 'vitest';
import {Rng} from '../../../engine/random';
import {PLAN} from '../../build/plan';
import {arithmeticSpec} from '../../build/families/numbers';
import {lessonById} from '../../catalog';
import type {Example} from '../../build/sequence';
import type {Item,Stage} from '../../model';
import {plausible} from './assess';
import {factsOf} from './facts';
import {mistakesFor} from './mistakes';
import {strategiesFor} from './strategies';

const plan=(code:string,level:number,match?:RegExp)=>PLAN.find(p=>p.code===code&&p.level===level&&(!match||match.test(p.objective.toLowerCase())))!;
const ex=(prompt:string,answer:string,extra:Partial<Example>={}):Example=>({prompt,answer,steps:['First step.','Second step.'],hint:'First step.',tool:{kind:'table',headers:['Given'],rows:[['?']],caption:'Given information'},context:prompt,why:'Because of the relationship.',error:'A tempting mistake.',check:'Check it backwards.',...extra});
const shown=(p:ReturnType<typeof plan>,e:Example)=>mistakesFor(p,e).filter(m=>plausible(e,m));
const answers=(p:ReturnType<typeof plan>,e:Example)=>shown(p,e).map(m=>m.answer);
const why=(p:ReturnType<typeof plan>,e:Example,answer:string)=>mistakesFor(p,e).find(m=>m.answer===answer)?.why??'';
const itemsOf=(s:Stage,seed:number,i:number):Item[]=>s.kind==='reason'?s.items:s.kind==='practice'||s.kind==='apply'?Array.from({length:s.count},(_,k)=>s.gen(seed+i*1009,k)):s.kind==='mastery'?s.gens.map((g,k)=>g.gen(seed+i*1009,k)):[];

describe('Targeted feedback for real misconceptions',()=>{
 it('names the mistakes children actually make, computed from the question',()=>{
  expect(answers(plan('MD',3),ex('Calculate 570 × 3.','1710',{evidence:{op:'*',a:570,b:3}}))).toEqual(expect.arrayContaining(['573','1570','171']));
  expect(answers(plan('AS',2),ex('What is 52 − 27?','25',{evidence:{op:'-',a:52,b:27}}))).toContain('35');
  expect(answers(plan('AS',2),ex('What is 47 + 38?','85',{evidence:{op:'+',a:47,b:38}}))).toContain('75');
  expect(answers(plan('DEC',4,/add and subtract/),ex('Calculate 5.4 + 3.47.','8.87',{evidence:{op:'+',a:5.4,b:3.47}}))).toContain('8.51');
  expect(answers(plan('PCT',5,/quantity/),ex('Find 50% of 120.','60',{evidence:{op:'*',a:120,b:.5}}))).toEqual(expect.arrayContaining(['50','70','6000']));
  expect(answers(plan('FRAC',3,/add/),ex('Calculate 1/2 + 1/4.','3/4',{evidence:{op:'+',a:.5,b:.25}}))).toContain('2/6');
  expect(answers(plan('ALG',6,/substitut/),ex('Find 3x + 2 when x = 4.','14'))).toEqual(expect.arrayContaining(['36','9']));
 });
 it('explains each mistake in terms of the situation, not the arithmetic operation',()=>{
  const ratio=ex('Share 21 counters in the ratio 1:2:4. How many belong to the first share?','3',{evidence:{op:'*',a:1,b:3}});
  expect(why(plan('RATIO',6,/divide a quantity/),ratio,'7')).toMatch(/units/);
  const time=ex('An activity starts at 09:45 and ends at 10:15. How many minutes does it last?','30');
  const duration=plan('TIME',3,/start times|duration/);
  expect(answers(duration,time)).toContain('70');
  expect(why(duration,time,'70')).toMatch(/60 minutes/);
  const pct=ex('Find 50% of 120.','60',{evidence:{op:'*',a:120,b:.5}});
  expect(why(plan('PCT',5,/quantity/),pct,'70')).toMatch(/percentage number/);
 });
 it('never shows a wrong answer no child would give',()=>{
  expect(answers(plan('PCT',5,/quantity/),ex('Find 50% of 120.','60',{evidence:{op:'*',a:120,b:.5}}))).not.toContain('120.5');
  for(const p of PLAN.filter(p=>['AS','MD','PCT','RATIO','RATE','DEC','FRAC'].includes(p.code)))for(const seed of [1,2,3]){
   const l=lessonById(p.id)!;
   l.stages.forEach((s,i)=>{for(const item of itemsOf(s,seed,i))for(const w of Object.keys(item.wrong??{}))expect(w,`${p.id}: ${item.prompt}`).not.toMatch(/NaN|Infinity|undefined/);});
  }
 });
});

describe('Help that fits the question',()=>{
 const generated=PLAN.filter(p=>p.code!=='AVG'&&!['p1s-as-07','p2s-frac-01','p5s-area-02'].includes(p.id));
 const sample=()=>generated.flatMap(p=>{const l=lessonById(p.id)!;return l.stages.flatMap((s,i)=>[3,11].flatMap(seed=>itemsOf(s,seed,i).map(item=>({p,item}))));});
 it('offers another method that actually differs, never a generic placeholder',()=>{
  for(const {p,item} of sample()){
   expect(item.another?.length,`${p.id}: ${item.prompt}`).toBeGreaterThan(0);
   for(const way of item.another??[]){expect(way.title,p.id).not.toBe('Start from what the picture means');expect(way.steps.length,p.id).toBeGreaterThan(0);}
   const titles=(item.another??[]).map(w=>w.title);expect(new Set(titles).size,`${p.id}: repeated method`).toBe(titles.length);
  }
 });
 it('makes “I still don’t get it” an easier question of the same kind wherever one exists',()=>{
  let same=0,total=0;
  for(const {p,item} of sample()){
   if(!item.simpler)continue;total++;
   if(item.simpler.key.startsWith('support-'))continue;same++;
   expect(item.simpler.facet,`${p.id}: ${item.prompt}`).toBe(item.facet);
   expect(`${item.simpler.prompt}|${item.simpler.answer}|${JSON.stringify(item.simpler.tool)}`,p.id).not.toBe(`${item.prompt}|${item.answer}|${JSON.stringify(item.tool)}`);
  }
  expect(same/total).toBeGreaterThan(0.6);
 });
 it('asks reasoning questions as error analysis, with at least three options, and no stock stems',()=>{
  let three=0,total=0;
  for(const {p,item} of sample()){
   expect(item.prompt,p.id).not.toMatch(/A learner is solving this|^Check this result/);
   if(item.facet!=='reasoning'||!item.choices)continue;total++;if(item.choices.length>=3)three++;
  }
  expect(three/total).toBeGreaterThan(0.8);
 });
 it('writes missing-number questions whose answers satisfy the equation',()=>{
  const value=(s:string)=>Number(s.replace(/,/g,''));
  let checked=0;
  for(const {p,item} of sample()){
   const m=item.prompt.match(/^Find the missing number: (.+) = ([\d.,]+)\.$/);if(!m)continue;
   const expr=m[1].replace('□',item.answer).replace('−','-').replace('×','*').replace('÷','/');
   const [x,op,y]=expr.split(' ');
   const got={'+':value(x)+value(y),'-':value(x)-value(y),'*':value(x)*value(y),'/':value(x)/value(y)}[op as '+'];
   expect(got,`${p.id}: ${item.prompt} → ${item.answer}`).toBeCloseTo(value(m[2]),6);checked++;
  }
  expect(checked).toBeGreaterThan(100);
 });
});

describe('Worked methods',()=>{
 it('splits multiplication and division by place value without empty parts',()=>{
  for(const p of PLAN.filter(p=>p.code==='MD'||p.code==='WN'&&/multiply and divide by/.test(p.objective.toLowerCase()))){
   const spec=arithmeticSpec(p);
   for(let seed=0;seed<150;seed++){const e=spec.example(new Rng(seed),seed%12),steps=e.steps.join(' ');
    expect(steps,`${p.id}: ${e.prompt}`).not.toMatch(/ \+ 0\b|\b0 \+ /);
    const split=steps.match(/Split (\d+) (?:by place value|into)[^:]*: ([\d ]+(?:\+ [\d ]+)*)\./);if(split)expect(split[2].trim(),p.id).not.toBe(split[1]);
   }
  }
 });
 it('offers alternative strategies worked with the question’s own numbers',()=>{
  const sub=plan('AS',2),e=ex('What is 52 − 27?','25',{evidence:{op:'-',a:52,b:27}});
  const ways=strategiesFor(sub,e);
  expect(ways.map(w=>w.title)).toEqual(expect.arrayContaining(['Count up to find the difference','Round and adjust']));
  expect(ways.find(w=>w.title==='Count up to find the difference')!.steps.join(' ')).toContain('27 → 30');
  const pct=strategiesFor(plan('PCT',5,/quantity/),ex('Find 25% of 80.','20',{evidence:{op:'*',a:80,b:.25}}));
  expect(pct.map(w=>w.title)).toEqual(expect.arrayContaining(['Use a fraction','Find 1% first']));
  expect(factsOf(plan('PCT',5,/discount/),ex('An item costs $400 before a 20% discount. What is the sale price?','320')).kind).toBe('discount');
  expect(strategiesFor(plan('PCT',5,/discount/),ex('An item costs $400 before a 20% discount. What is the sale price?','320'))[0].steps.join(' ')).toContain('80%');
 });
});

describe('Grade-wide content round two',()=>{
 const generated=PLAN.filter(p=>p.code!=='AVG'&&!['p1s-as-07','p2s-frac-01','p5s-area-02'].includes(p.id));
 const all=()=>generated.flatMap(p=>{const l=lessonById(p.id)!;return l.stages.flatMap((s,i)=>[5,13].flatMap(seed=>itemsOf(s,seed,i).map(item=>({p,item}))));});
 it('makes “read the picture” questions need the picture',()=>{
  const MODEL_KINDS=['round','dec-round','dec-quotient','dec-place','frac-div','frac-of','frac-simplify','gcf','lcm','nth-multiple','remainder','conv','vol-conv','time-sec','time-24','rect-area','rect-perim','square-side','pct-read','pct-fraction','discount','gst','interest','angle-point','angle-straight','tri-third','isosceles','mirror','ratio-share','ratio-fraction','ratio-simplify','alg-solve','vol-height','vol-base','vol-layers','cube-root','square-root','table-missing'];
  let checked=0;
  for(const {p,item} of all()){if(item.facet!=='visual'||!MODEL_KINDS.includes(item.kind??''))continue;checked++;
   // Format names (“24-hour”) and the stated value of π are instructions, not quantities to read.
   expect(item.prompt.replace('22/7','').replace('24-hour',''),`${p.id} (${item.kind}): ${item.prompt}`).not.toMatch(/\d/);
   expect(item.tool,p.id).toBeDefined();expect(item.requiresModel,p.id).toBe(true);
  }
  expect(checked).toBeGreaterThan(150);
 });
 it('tells word problems as situations, not calculations with a label',()=>{
  for(const {p,item} of all())if(item.facet==='word')expect(item.prompt,`${p.id}: ${item.prompt}`).not.toMatch(/science notebook records this measurement\. (Round|Calculate|Compare|Write|What is the value)|Complete the comparison|A fraction strip has \d+ of \d+ equal parts coloured\. |Compare their fractions|A journey lasts [\d a-z]+\. (Write|How many minutes are)/);
 });
 it('adds hands-on explores in every grade where the model matches the objective',()=>{
  const grades=new Map<number,number>();for(const p of generated)if(lessonById(p.id)!.stages.some(s=>s.kind==='explore'))grades.set(p.level,(grades.get(p.level)??0)+1);
  for(const level of [1,2,3,4,5,6])expect(grades.get(level)??0,`P${level} explores`).toBeGreaterThanOrEqual(6);
 });
 it('names the next group of classic mistakes by value',()=>{
  const time24=plan('TIME',3,/24-hour/);
  expect(answers(time24,ex('Write 1:41 pm in 24-hour time.','13:41',{exact:true}))).toContain('01:41');
  expect(answers(time24,ex('Write 9:05 am in 24-hour time.','09:05',{exact:true}))).toEqual(expect.arrayContaining(['21:05','9:05']));
  const clock=plan('TIME',3,/start times|duration/);
  expect(answers(clock,ex('An activity ends at 12:05 after 65 minutes. When did it start?','11:00',{exact:true}))).toContain('11:40');
  expect(answers(clock,ex('An activity starts at 10:55 and lasts 20 minutes. When does it end?','11:15',{exact:true}))).toContain('10:75');
  expect(answers(plan('FRAC',2,/add and subtract/),ex('Calculate 5/12 − 1/12.','1/3',{evidence:{op:'-',a:5/12,b:1/12}}))).toContain('4');
  expect(answers(plan('FRAC',5,/mixed/),ex('Calculate 3 1/4 − 1 3/4.','3/2',{evidence:{op:'-',a:3.25,b:1.75}}))).toContain('2 2/4');
  expect(answers(plan('DEC',4,/add and subtract/),ex('Calculate 2.18 + 0.24.','2.42',{evidence:{op:'+',a:2.18,b:.24}}))).toContain('2.32');
  expect(answers(plan('MONEY',2,/count|decimal/),ex('Count $4 and coins of 50, 20, 10, 10 cents. Give the total in dollars.','4.90',{unit:'dollars'}))).toEqual(expect.arrayContaining(['0.9','94']));
 });
});
