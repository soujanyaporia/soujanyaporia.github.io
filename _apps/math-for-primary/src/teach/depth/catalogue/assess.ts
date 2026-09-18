import type {Rng} from '../../../engine/random';
import {numberValue} from '../../../primary/generate';
import {fmt,isCorrect,rngFor} from '../../gen';
import type {Facet,Gen,Item,Rep,Tool} from '../../model';
import type {Example,TopicSpec} from '../../build/sequence';
import type {PlanEntry} from '../../build/plan';
import {friendly} from '../../build/teachingNotes';
import type {TeachingFocus} from './focus';
import {modelFor,visualQuestion} from './questions';
import {factsOf,nums} from './facts';
import {mistakesFor,type Mistake} from './mistakes';
import {strategiesFor,type Way} from './strategies';
/**
 * Questions for the generated lessons. Each facet asks the child to do something different:
 * calculate, read a model, work backwards, find a missing number, solve a story, use an unfamiliar
 * model, or diagnose a mistake. Every question carries help that fits it: an easier question of the
 * same kind, targeted feedback for real misconceptions, and genuinely different methods.
 */
export type Mode='direct'|'visual'|'word'|'reverse'|'missing'|'unfamiliar'|'reasoning';
const NAMES=['Ravi','Mei','Ali','Siti','Jun','Priya','Hana','Wei'];
const MODEL_CODES=['GRAPH','LINES','SOLID','SHAPE','ANGLE','LENGTH','SYM'];
const INVERSE_KINDS=['add','sub','mul','div','bond-whole','bond-part','dec-add','dec-sub','dec-mul','dec-div','money-add','money-sub','rate-per','rate-total','rate-count'];
const SYMBOL={'+':'+','-':'−','*':'×','/':'÷'} as const;
type Drawn={r:Rng;v:number;e:Example};
/** A wrong answer is shown only if a child could plausibly give it for this question. */
export function plausible(item:Pick<Item,'answer'|'choices'|'exact'|'prompt'>,m:Mistake):boolean{
 const a=m.answer.trim();if(!a||isCorrect(item,a))return false;
 if(item.choices)return item.choices.includes(a);
 const x=numberValue(a),y=numberValue(item.answer);
 if(x===null||y===null)return !!item.exact;
 if(!Number.isFinite(x)||(x<0&&y>=0))return false;
 const context=nums(item.prompt),whole=(n:number)=>Math.abs(n-Math.round(n))<1e-9;
 if(whole(y)&&context.every(whole)&&!whole(x))return false;
 return Math.abs(x)<=Math.max(1,Math.abs(y),...context.map(Math.abs))*1000;
}
/** The two-choice idea check, used only when no easier question of the same kind exists. */
function ideaCheck(key:string,focus:TeachingFocus,tool?:Tool):Item{
 return {key:`support-${key}`,prompt:focus.question,answer:focus.answer,choices:key.length%2?[focus.answer,focus.error]:[focus.error,focus.answer],exact:true,tool,requiresModel:!!tool,hints:[focus.look],steps:[focus.look,focus.why],check:focus.why,wrong:{[focus.error]:focus.why}};
}
function attach(e:Example,item:Item,focus:TeachingFocus,mistakes:Mistake[],ways:Way[],simpler:Item|null|undefined):Item{
 const wrong:Record<string,string>={...item.wrong};
 for(const o of item.choices??[])if(!wrong[o]&&!isCorrect(item,o))wrong[o]=`${focus.look} ${e.hint}`;
 for(const m of mistakes)if(plausible(item,m))wrong[m.answer]=m.why;
 return {...item,wrong,another:ways,...(simpler===null?{}:{simpler:simpler??ideaCheck(item.key,focus,item.tool)})};
}
export function itemFactory(p:PlanEntry,spec:TopicSpec,focus:TeachingFocus){
 const draw=(seed:number,index:number,salt:string,variant?:number):Drawn=>{const r=rngFor(p.id,seed,index,salt),v=variant??index+r.int(0,119),raw=spec.example(r,v);return {r,v,e:{...raw,tool:modelFor(p,raw)}};};
 /** The numbers that set a question's difficulty: those in the prompt, or in the answer when the prompt has none. */
 const sizes=(e:Example)=>{const ns=nums(e.prompt);return ns.length?ns:nums(e.answer);};
 const easierThan=(c:Example,e:Example)=>{const a=sizes(c),b=sizes(e);return a.length===b.length&&a.length>0&&a.every((x,i)=>x<=b[i])&&a.reduce((s,x)=>s+x,0)<b.reduce((s,x)=>s+x,0);};
 const evidence=(e:Example)=>{const f=e.evidence,c=numberValue(e.answer);if(!f||f.op==='round'||c===null)return null;
  const nice=(x:number)=>Number.isFinite(x)&&x>=0&&Math.abs(x-Number(x.toFixed(3)))<1e-9;return nice(f.a)&&nice(f.b)&&nice(c)?{op:f.op,a:f.a,b:f.b,c}:null;};
 const inverseOK=(e:Example)=>INVERSE_KINDS.includes(factsOf(p,e).kind)&&!!evidence(e);
 const unfamiliarOK=(e:Example)=>{const n=evidence(e);if(!n)return false;const k=factsOf(p,e).kind,small=Math.min(n.a,n.b);
  if(['add','sub','dec-add','dec-sub','money-add','money-sub','bond-whole','bond-part'].includes(k))return true;
  if(k==='mul'||k==='rate-total')return Number.isInteger(small)&&small>=2&&small<=10;
  if(k==='dec-mul')return Number.isInteger(n.b)&&n.b>=2&&n.b<=9;
  if(k==='div'||k==='rate-per'||k==='dec-div')return Number.isInteger(n.b)&&n.b>=2&&n.b<=9;
  return false;};
 /** A lesson offers a facet only if every sampled question in it supports that facet. */
 const everywhere=(test:(e:Example)=>boolean)=>Array.from({length:24},(_,s)=>draw(900+s,s%6,'probe')).every(d=>test(d.e));
 const inverseLesson=everywhere(inverseOK),unfamiliarLesson=everywhere(unfamiliarOK);
 const accepts=(mode:Mode)=>mode==='missing'||mode==='reverse'&&inverseLesson?inverseOK:mode==='unfamiliar'?unfamiliarOK:null;
 const hintsFor=(e:Example)=>[...new Set([e.hint,...e.steps.slice(0,-1),focus.look])].filter(h=>h&&h.trim().length>4).slice(0,3);
 const unitOf=(e:Example)=>e.unit&&!e.choices?` ${e.unit}`:'';
 const repFor=(e:Example):Rep=>e.tool.kind==='fractions'?'fraction-wall':e.tool.kind==='bar'?'bar-model':e.tool.kind==='table'?'table':'symbols';
 function inverse(e:Example,which:'first'|'second',key:string,facet:Facet):{item:Item;mistakes:Mistake[]}{
  const {op,a,b,c}=evidence(e)!,s=SYMBOL[op],F=fmt,eq=which==='first'?`□ ${s} ${F(b)} = ${F(c)}`:`${F(a)} ${s} □ = ${F(c)}`,answer=which==='first'?a:b;
  const undo=which==='first'?{'+':`${F(c)} − ${F(b)}`,'-':`${F(c)} + ${F(b)}`,'*':`${F(c)} ÷ ${F(b)}`,'/':`${F(c)} × ${F(b)}`}[op]:{'+':`${F(c)} − ${F(a)}`,'-':`${F(a)} − ${F(c)}`,'*':`${F(c)} ÷ ${F(a)}`,'/':`${F(a)} ÷ ${F(c)}`}[op];
  const meaning=which==='first'?{'+':`The box and ${F(b)} together make ${F(c)}.`,'-':`Taking ${F(b)} from the box leaves ${F(c)}.`,'*':`${F(b)} lots of the box make ${F(c)}.`,'/':`Sharing the box into ${F(b)} equal groups gives ${F(c)} in each.`}[op]
   :{'+':`${F(a)} and the box together make ${F(c)}.`,'-':`Taking the box from ${F(a)} leaves ${F(c)}.`,'*':`${F(a)} lots of the box make ${F(c)}.`,'/':`Sharing ${F(a)} into the box's number of equal groups gives ${F(c)} in each.`}[op];
  const m:Mistake[]=which==='first'?{
   '+':[{answer:F(c+b),why:`That adds again. The box and ${F(b)} make ${F(c)}, so take ${F(b)} away from ${F(c)}.`},{answer:F(c),why:`${F(c)} is the total. The box is only one part of it.`}],
   '-':[{answer:F(c-b),why:`That takes away again. Taking ${F(b)} from the box left ${F(c)}, so the box was bigger than ${F(c)}: add ${F(b)} back.`},{answer:F(c),why:`${F(c)} is what was left. The box held more before ${F(b)} was taken away.`}],
   '*':[{answer:F(c*b),why:`That multiplies again. ${F(b)} lots of the box make ${F(c)}, so divide ${F(c)} by ${F(b)}.`},{answer:F(c-b),why:'Undo multiplying by dividing, not by subtracting.'}],
   '/':[{answer:F(c/b),why:`That divides again. The box was shared to give ${F(c)} each, so the box holds ${F(b)} × ${F(c)}.`},{answer:F(c+b),why:'Undo dividing by multiplying, not by adding.'}]}[op]:{
   '+':[{answer:F(c+a),why:`That adds again. ${F(a)} and the box make ${F(c)}, so the box is ${F(c)} − ${F(a)}.`},{answer:F(c),why:`${F(c)} is the total. The box is only one part of it.`}],
   '-':[{answer:F(a+c),why:`That adds. Taking the box from ${F(a)} left ${F(c)}, so the box is ${F(a)} − ${F(c)}.`},{answer:F(c),why:`${F(c)} is what was left, not what was taken away.`}],
   '*':[{answer:F(c*a),why:`That multiplies again. ${F(a)} lots of the box make ${F(c)}, so divide ${F(c)} by ${F(a)}.`},{answer:F(c-a),why:'Undo multiplying by dividing, not by subtracting.'}],
   '/':[{answer:F(a*c),why:`That multiplies. ${F(a)} shared into equal groups gives ${F(c)} each, so the number of groups is ${F(a)} ÷ ${F(c)}.`},{answer:F(a-c),why:'Undo dividing by dividing again: how many groups of this size fit?'}]}[op];
  return {item:{key,prompt:`Find the missing number: ${eq}.`,answer:F(answer),facet,rep:'symbols',hints:[meaning,`Undo it: ${undo}.`],steps:[meaning,`So the box is ${undo}.`,`Check: put the number back into ${eq}.`],check:`${eq.replace('□',F(answer))} ✓`},mistakes:m};
 }
 function unfamiliar(e:Example,key:string):Item{
  const {a,b,c}=evidence(e)!,k=factsOf(p,e).kind,F=fmt;let tool:Tool,prompt:string,steps:string[];
  if(['add','dec-add','money-add','bond-whole'].includes(k)){if(e.tool.kind==='bar'){tool={kind:'table',headers:['First part','Second part','Whole'],rows:[[F(a),F(b),'?']],caption:'Two parts make one whole'};prompt='Use the table. What is the whole?';}else{tool={kind:'bar',whole:null,parts:[a,b],labels:['part','part']};prompt='The bar model shows two parts. How long is the whole bar?';}steps=['The whole is both parts together.',`${F(a)} + ${F(b)}.`];}
  else if(['sub','dec-sub','money-sub','bond-part'].includes(k)){if(e.tool.kind==='bar'){tool={kind:'table',headers:['Whole','Part taken away','Part left'],rows:[[F(a),F(b),'?']],caption:'One part is taken from the whole'};prompt='Use the table. How much is left?';}else{tool={kind:'bar',whole:a,parts:[null,b],labels:['left','taken away']};prompt='The bar model shows a whole and one of its parts. How long is the missing part?';}steps=['The two parts make the whole.',`The missing part is ${F(a)} − ${F(b)}.`];}
  else if(k==='mul'||k==='rate-total'||k==='dec-mul'){const count=k==='dec-mul'?b:Math.min(a,b),each=k==='dec-mul'?a:Math.max(a,b);tool={kind:'bar',whole:null,parts:Array(count).fill(each)};prompt='The bar is made of equal parts. How long is the whole bar?';steps=[`There are ${count} equal parts of ${F(each)}.`,`${count} × ${F(each)}.`];}
  else{tool={kind:'bar',whole:a,parts:Array(b).fill(null)};prompt='The whole bar is cut into equal parts. How long is each part?';steps=[`The whole is ${F(a)}, cut into ${b} equal parts.`,`${F(a)} ÷ ${b}.`];}
  return {key,prompt,answer:e.answer,unit:e.unit,facet:'unfamiliar',rep:tool.kind==='table'?'table':'bar-model',tool,requiresModel:true,hints:[steps[0],'Read every number in the model before you calculate.'],steps:[...steps,`The answer is ${F(c)}${unitOf(e)}.`],check:e.check};
 }
 function analysis(e:Example,mistakes:Mistake[],r:Rng,key:string):Item|null{
  const usable=mistakes.filter(m=>plausible(e,m));if(!usable.length)return null;
  const m=usable[r.int(0,usable.length-1)],name=r.pick(NAMES),others=usable.filter((o,i)=>o.why!==m.why&&usable.findIndex(x=>x.why===o.why)===i).slice(0,2),shown=`${m.answer}${unitOf(e)}`,q=e.prompt.trim();
  const right=`Nothing is wrong: ${shown} is correct.`;
  const prompt=r.pick([`${name} answers “${q}” with ${shown}. What went wrong?`,`${name} works out “${q}” and gets ${shown}. Which mistake did ${name} make?`,`Look at ${name}’s answer to “${q}”: ${shown}. Why is it not right?`]);
  return {key,prompt,answer:m.why,choices:r.shuffle([m.why,...others.map(o=>o.why),right]),exact:true,facet:'reasoning',rep:'story',tool:e.tool,
   hints:[`Solve “${q}” yourself first, then compare with ${name}’s answer.`,`Which step would give ${shown}?`],
   steps:[`The correct answer is ${e.answer}${unitOf(e)}.`,`${name} got ${shown}.`,m.why],check:e.check,
   wrong:{...Object.fromEntries(others.map(o=>[o.why,`That mistake would give ${o.answer}, not ${m.answer}.`])),[right]:`${shown} is not correct. Check it: ${e.check}`}};
 }
 function idea(e:Example,r:Rng,key:string):Item{
  const name=r.pick(NAMES),q=e.prompt.trim(),answer=friendly(e.why),options=[...new Set([answer,friendly(e.error),focus.error])];
  return {key,prompt:r.pick([`${name} is about to solve “${q}”. Which idea will help?`,`Before solving “${q}”, which idea should ${name} use?`]),answer,choices:r.shuffle(options),exact:true,facet:'reasoning',rep:'story',tool:e.tool,
   hints:[e.hint],steps:[e.why,...e.steps],check:e.check,wrong:Object.fromEntries(options.filter(o=>o!==answer).map(o=>[o,`That idea leads to a mistake here. ${focus.why}`]))};
 }
 function verify(e:Example,mistakes:Mistake[],r:Rng,key:string):Item{
  const name=r.pick(NAMES),shown=`${e.answer}${unitOf(e)}`,yes=`Yes. ${e.check}`,usable=mistakes.filter(m=>plausible(e,m)).slice(0,2);
  const nos=[...new Set(usable.length?usable.map(m=>`No. ${m.why}`):[`No. ${friendly(e.error)}`])];
  return {key,prompt:`${name}’s answer to “${e.prompt.trim()}” is ${shown}. Is ${name} right? Work backwards to check.`,answer:yes,choices:r.shuffle([yes,...nos]),exact:true,facet:'reverse',rep:'symbols',tool:e.tool,
   hints:['Use the answer to rebuild the numbers you started with.',e.hint],steps:[e.why,e.check],check:e.check,
   wrong:Object.fromEntries(nos.map(n=>[n,`Work backwards to test it: ${e.check}`]))};
 }
 function build(mode:Mode,d:Drawn,key:string):{item:Item;mistakes:Mistake[]}{
  const e=d.e,mistakes=mistakesFor(p,e);
  const base:Item={key,prompt:e.prompt,display:e.display,answer:e.answer,unit:e.unit,choices:e.choices,exact:e.exact,facet:mode,rep:repFor(e),tool:e.tool,requiresModel:MODEL_CODES.includes(p.code)&&!/[0-9]/.test(e.prompt),hints:hintsFor(e),steps:[e.why,...e.steps],check:e.check};
  switch(mode){
   case 'direct':return {item:base,mistakes};
   case 'visual':{const reading=visualQuestion(p,e,e.tool);return {item:{...base,prompt:reading.prompt,tool:reading.tool,requiresModel:true},mistakes};}
   case 'word':return {item:{...base,prompt:e.context,rep:'story'},mistakes};
   case 'reverse':return inverseLesson&&inverseOK(e)?inverse(e,'first',key,'reverse'):{item:verify(e,mistakes,d.r,key),mistakes:[]};
   case 'missing':return inverseOK(e)?inverse(e,'second',key,'missing'):{item:{...verify(e,mistakes,d.r,key),facet:'missing'},mistakes:[]};
   case 'unfamiliar':return unfamiliarOK(e)?{item:unfamiliar(e,key),mistakes}:{item:{...base,facet:'unfamiliar',requiresModel:true},mistakes};
   case 'reasoning':return {item:analysis(e,mistakes,d.r,key)??idea(e,d.r,key),mistakes:[]};
  }
 }
 /** Easier questions of the same kind, easiest first. */
 function easierAll(mode:Mode,seed:number,index:number,d:Drawn):Drawn[]{
  const test=accepts(mode),same=`${d.e.prompt}|${d.e.answer}`,total=(e:Example)=>sizes(e).reduce((s,x)=>s+x,0),found:Drawn[]=[];
  for(let k=0;k<16;k++){const c=draw(seed,index,`${mode}-easier-${k}`,d.v);if(`${c.e.prompt}|${c.e.answer}`===same||!!c.e.choices!==!!d.e.choices||(test&&!test(c.e))||!easierThan(c.e,d.e)||found.some(f=>`${f.e.prompt}|${f.e.answer}`===`${c.e.prompt}|${c.e.answer}`))continue;found.push(c);}
  return found.sort((a,b)=>total(a.e)-total(b.e));
 }
 const easier=(mode:Mode,seed:number,index:number,d:Drawn)=>easierAll(mode,seed,index,d)[0]??null;
 function make(mode:Mode,seed:number,index:number,gentle=false):Item{
  const test=accepts(mode);let d=draw(seed,index,mode);
  if(test&&!test(d.e))for(let t=1;t<16;t++){const c=draw(seed,index,`${mode}-${t}`);if(test(c.e)){d=c;break;}}
  // Gentle practice (Foundation) starts with the smaller-number version of the same question.
  if(gentle){const g=easierAll(mode,seed,index,d);if(g.length)d=g[g.length>1?1:0];}
  const key=`${mode}-${index}`,{item,mistakes}=build(mode,d,key),ways=strategiesFor(p,d.e);
  const lighter=easier(mode,seed,index,d);
  let simpler:Item|undefined;
  if(lighter){const s=build(mode,lighter,`${key}-easier`);simpler=attach(lighter.e,s.item,focus,s.mistakes,strategiesFor(p,lighter.e),null);}
  return {...attach(d.e,item,focus,mistakes,ways,simpler),kind:factsOf(p,d.e).kind};
 }
 const facets:Facet[]=['direct','visual','reverse',...(inverseLesson?['missing' as const]:[]),'word',...(unfamiliarLesson?['unfamiliar' as const]:[]),'reasoning'];
 return {gen:(mode:Mode,gentle=false):Gen=>(seed,index)=>make(mode,seed,index,gentle),facets};
}
