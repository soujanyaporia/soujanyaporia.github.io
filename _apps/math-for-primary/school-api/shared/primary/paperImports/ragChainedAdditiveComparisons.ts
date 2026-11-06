import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original generator: three quantities built by additive comparisons that use a letter. */
export const RAG_PATTERN={
 id:'p6-rag-chained-additive-comparisons',
 level:6,
 title:'Chained additive comparisons with an unknown',
 objective:'Build three amounts from additive comparisons that use a letter, then total and simplify, substitute, solve, or judge a statement.',
 skillIds:['P6.S.ALG.01','P6.S.ALG.02','P6.S.ALG.03','P6.S.ALG.04','P6.S.ALG.05'],
 canonicalPatternId:'p6-chained-additive-comparisons',
};

type Expr={a:number;c:number};
type Ctx={id:'money'|'height'|'count';noun:string;amount:(t:string)=>string;direct:(n:string,t:string)=>string;compare:(n:string,t:string,more:boolean,ref:string)=>string;stated:(n:string,v:number)=>string;stmt:(a:string,b:string)=>string;word:(more:boolean)=>string};
type Derived={name:string;ref:string;more:boolean;d:Expr;prev:Expr;next:Expr};
type Scenario={names:string[];q:Expr[];ctx:Ctx;letter:string;context:string[];derived:Derived[]};
type Step={text:string;equation?:string};

const NAMES=['Aisha','Ben','Chen','Dev','Mei','Ravi','Tom','Wei','Zara','Hana','Jun','Lina'];
const LETTERS=['m','n','p','u','y','k'];
const CONTEXTS:Ctx[]=[
 {id:'money',noun:'amounts of money',amount:t=>'$'+t,direct:(n,t)=>`${n} has $${t}.`,compare:(n,t,more,ref)=>`${n} has $${t} ${more?'more':'less'} than ${ref}.`,stated:(n,v)=>`${n} has $${v}.`,stmt:(a,b)=>`${a} has more money than ${b}.`,word:more=>more?'more':'less'},
 {id:'height',noun:'heights',amount:t=>`${t} cm`,direct:(n,t)=>`${n} is ${t} cm tall.`,compare:(n,t,more,ref)=>`${n} is ${t} cm ${more?'taller':'shorter'} than ${ref}.`,stated:(n,v)=>`${n} is ${v} cm tall.`,stmt:(a,b)=>`${a} is taller than ${b}.`,word:more=>more?'taller':'shorter'},
 {id:'count',noun:'numbers of stickers',amount:t=>`${t} stickers`,direct:(n,t)=>`${n} has ${t} stickers.`,compare:(n,t,more,ref)=>`${n} has ${t} ${more?'more':'fewer'} stickers than ${ref}.`,stated:(n,v)=>`${n} has ${v} stickers.`,stmt:(a,b)=>`${a} has more stickers than ${b}.`,word:more=>more?'more':'fewer'},
];

const term=(a:number,x:string)=>`${a===1?'':a}${x}`;
const show=(e:Expr,x:string)=>e.a===0?String(e.c):e.c===0?term(e.a,x):`${term(e.a,x)} + ${e.c}`;
const token=(e:Expr,x:string)=>e.a>0&&e.c>0?`(${show(e,x)})`:show(e,x);
const signedShow=(a:number,c:number,x:string)=>{
 if(a===0)return `${c<0?'−':''}${Math.abs(c)}`;
 const first=`${a<0?'−':''}${Math.abs(a)===1?'':Math.abs(a)}${x}`;
 return c===0?first:`${first} ${c<0?'−':'+'} ${Math.abs(c)}`;
};
const add=(xs:Expr[]):Expr=>xs.reduce((s,e)=>({a:s.a+e.a,c:s.c+e.c}),{a:0,c:0});
const evalAt=(e:Expr,v:number)=>e.a*v+e.c;

function nextStep(r:Rng,prev:Expr,more:boolean):{more:boolean;d:Expr}{
 for(let i=0;i<60;i++){
  const dv=more?r.int(0,2):r.int(0,prev.a-1),dc=more?r.int(0,8):r.int(0,prev.c);
  if(dv===0&&dc===0)continue;
  return {more,d:{a:dv,c:dc}};
 }
 return {more:true,d:{a:1,c:0}};
}

function build(r:Rng,shape:'direct2'|'chain'|'assess'):Scenario{
 const names=r.shuffle(NAMES).slice(0,3),letter=r.pick(LETTERS),ctx=r.pick(CONTEXTS);
 const q:Expr[]=[],derived:Derived[]=[],context:string[]=[`The letter ${letter} stands for a positive whole number.`];
 const give=(i:number,e:Expr)=>{q[i]=e;context.push(ctx.direct(names[i],token(e,letter)));};
 const derive=(i:number,ref:number,more:boolean,d:Expr)=>{
  const prev=q[ref],next=more?{a:prev.a+d.a,c:prev.c+d.c}:{a:prev.a-d.a,c:prev.c-d.c};
  q[i]=next;derived.push({name:names[i],ref:names[ref],more,d,prev,next});
  context.push(ctx.compare(names[i],token(d,letter),more,names[ref]));
 };
 const drawStep=(i:number,ref:number)=>{const s=nextStep(r,q[ref],r.chance(0.5));derive(i,ref,s.more,s.d);};
 if(shape==='direct2'){give(0,{a:r.int(1,3),c:r.int(2,9)});give(1,{a:r.int(2,4),c:r.int(2,9)});drawStep(2,1);}
 else if(shape==='chain'){give(0,{a:r.int(1,3),c:r.int(2,9)});drawStep(1,0);drawStep(2,1);}
 else{
  give(0,{a:r.int(1,3),c:r.int(6,12)});
  const dv=r.int(1,2),dc=r.int(0,3);
  derive(1,0,true,{a:dv,c:dc});
  derive(2,1,false,{a:0,c:dc+dv+r.int(0,3)});
 }
 return {names,q,ctx,letter,context,derived};
}

const derivedSteps=(s:Scenario):Step[]=>s.derived.map(t=>({
 text:`${t.name} has ${t.d.a>0&&t.d.c>0?'a combined difference':'a difference'} that is ${s.ctx.word(t.more)} than ${t.ref}, so ${t.more?'add it to':'subtract it from'} ${t.ref}’s amount.`,
 equation:`${token(t.prev,s.letter)} ${t.more?'+':'−'} ${token(t.d,s.letter)} = ${show(t.next,s.letter)}`,
}));
const totalStep=(s:Scenario,total:Expr):Step=>({text:'Add the three amounts and collect the like terms.',equation:`${s.q.map(e=>`(${show(e,s.letter)})`).join(' + ')} = ${show(total,s.letter)}`});
const solveSteps=(e:Expr,n:number,y:number,x:string):Step[]=>{
 const out:Step[]=[{text:'Make an equation from the expression and the given amount.',equation:`${show(e,x)} = ${n}`}];
 if(e.c>0)out.push({text:`Take ${e.c} away from both sides.`,equation:`${term(e.a,x)} = ${n-e.c}`});
 out.push({text:e.a>1?`Divide both sides by ${e.a}.`:'The letter now stands alone.',equation:`${x} = ${y}`});
 return out;
};
const fields=(labels:string[])=>({kind:'number-fields' as const,fields:labels.map(label=>({label}))});
const explain=(steps:Step[])=>steps.map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' ');

function wrongTotal(r:Rng,t:Expr):Expr{
 const options:Expr[]=[{a:t.a+1,c:t.c},{a:t.a,c:t.c+2},{a:t.a,c:t.c+1},t.a>1?{a:t.a-1,c:t.c}:{a:t.a+2,c:t.c},t.c>=2?{a:t.a,c:t.c-2}:{a:t.a,c:t.c+3}];
 if(t.a>1)options.push({a:t.a-1,c:t.c+2});
 return r.pick(options);
}

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(((Math.trunc(seed)||0)+index)%4+4)%4;
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const r=new Rng(hashString(key));
 if(variant===0){
  const s=build(r,'direct2'),x=s.letter,total=add(s.q),v=r.int(3,15),value=evalAt(total,v);
  const steps:Step[]=[...derivedSteps(s),totalStep(s,total),{text:`Put ${x} = ${v} into the total.`,equation:`${total.a} × ${v} + ${total.c} = ${value}`}];
  return {key,context:s.context,prompt:`(a) Find the total of the three ${s.ctx.noun} in terms of ${x}. Write it as a number of ${x}’s plus a number. (b) Find the total when ${x} = ${v}.`,answer:JSON.stringify([String(total.a),String(total.c),String(value)]),structuredResponse:fields([`(a) Number in front of ${x}`,'(a) Number added',`(b) Total when ${x} = ${v}`]),hint:`Use the comparison sentence to write the third amount in terms of ${x}. Then add like terms.`,explanation:explain(steps),workedSteps:steps};
 }
 if(variant===1){
  const s=build(r,'chain'),x=s.letter,total=add(s.q),y0=r.int(2,9),t=evalAt(total,y0);
  const steps:Step[]=[...derivedSteps(s),totalStep(s,total),...solveSteps(total,t,y0,x)];
  return {key,context:s.context,prompt:`(a) Find the total of the three ${s.ctx.noun} in terms of ${x}. Write it as a number of ${x}’s plus a number. (b) The total is ${s.ctx.amount(String(t))}. Find the value of ${x}.`,answer:JSON.stringify([String(total.a),String(total.c),String(y0)]),structuredResponse:fields([`(a) Number in front of ${x}`,'(a) Number added',`(b) Value of ${x}`]),hint:'Work down the comparisons one step at a time. Then use the known total to make an equation.',explanation:explain(steps),workedSteps:steps};
 }
 if(variant===2){
  const s=build(r,'chain'),x=s.letter,last=s.q[2],y0=r.int(2,12),n=evalAt(last,y0);
  const steps:Step[]=[...derivedSteps(s),...solveSteps(last,n,y0,x)];
  return {key,context:s.context,prompt:`${s.ctx.stated(s.names[2],n)} Find the value of ${x}.`,answer:String(y0),hint:`Write ${s.names[2]}’s amount in terms of ${x} first, then make it equal to the given number.`,explanation:explain(steps),workedSteps:steps};
 }
 const s=build(r,'assess'),x=s.letter,total=add(s.q),choices=['True','False','Not possible to tell'];
 let statement:string,answer:string,steps:Step[];
 if(r.chance(0.35)){
  const truth=r.chance(0.5),shown=truth?total:wrongTotal(r,total);
  statement=`The total of the three ${s.ctx.noun} is ${show(shown,x)}.`;
  answer=truth?'True':'False';
  steps=[...derivedSteps(s),totalStep(s,total),{text:truth?'This matches the statement, so it is true.':'This is different from the statement, so it is false.',equation:`${show(total,x)} ${truth?'=':'≠'} ${show(shown,x)}`}];
 }else{
  const outcome=(i:number,j:number)=>{const da=s.q[i].a-s.q[j].a,dc=s.q[i].c-s.q[j].c;return da>=0&&da+dc>0?'True':da<=0&&da+dc<=0?'False':'Not possible to tell';};
  const pairs:[number,number][]=[];
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(i!==j)pairs.push([i,j]);
  const target=r.pick(choices),options=pairs.filter(([i,j])=>outcome(i,j)===target),[i,j]=r.pick(options.length?options:pairs);
  answer=outcome(i,j);
  statement=s.ctx.stmt(s.names[i],s.names[j]);
  const da=s.q[i].a-s.q[j].a,dc=s.q[i].c-s.q[j].c,diffAt=(y:number)=>da*y+dc;
  let conclusion:string;
  if(answer==='True')conclusion=`The difference is more than 0 for every positive whole number ${x}, so the statement is true.`;
  else if(answer==='False')conclusion='The difference is never more than 0, so the statement is false.';
  else{
   let up=1,down=1;
   for(let y=1;y<=500;y++){if(diffAt(y)>0){up=y;break;}}
   for(let y=1;y<=500;y++){if(diffAt(y)<=0){down=y;break;}}
   conclusion=`When ${x} = ${up}, the difference is ${diffAt(up)}. When ${x} = ${down}, it is ${diffAt(down)}. The answer changes, so we cannot tell.`;
  }
  steps=[...derivedSteps(s),{text:`Subtract to compare ${s.names[i]} with ${s.names[j]}.`,equation:`(${show(s.q[i],x)}) − (${show(s.q[j],x)}) = ${signedShow(da,dc,x)}`},{text:conclusion}];
 }
 return {key,context:s.context,prompt:`Is this statement true, false or not possible to tell? “${statement}”`,answer,choices,hint:`Write each amount in terms of ${x}. Then compare or add them. Try a small and a large value of ${x} if the comparison seems to change.`,explanation:explain(steps),workedSteps:steps};
}
