import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'reverse-fractional-fixed-removals',
 level:6,
 title:'Work backwards through fraction and fixed removals',
 objective:'Undo fractional and fixed removals in reverse order to find an original amount or the first share.',
 skillIds:['P4.S.FRAC.03','P5.S.FRAC.05'],
 canonicalPatternId:'p6-reverse-fractional-and-fixed-removals',
} as const;

type Stage=
 |{kind:'frac';n:number;d:number}
 |{kind:'fixed';a:number}
 |{kind:'both';n:number;d:number;a:number};
type Found={stages:Stage[];last:number;before:number[]};

const FR:[number,number][]=[[1,3],[1,4],[1,5],[2,5],[3,4],[2,3],[1,2],[2,7],[3,5],[1,6],[3,8],[1,7]];
const NAMES=[['Noor','Kai','Zoe'],['Mei','Raj','Sam'],['Lia','Omar','Tess'],['Hana','Ben','Yara']];
const ITEMS=['beads','stickers','marbles','stamps','buttons'];
const range=(a:number,b:number)=>Array.from({length:b-a+1},(_,i)=>a+i);

/** Returns the amount before every stage, or null if some step is not a whole number. */
function unwind(stages:Stage[],last:number):number[]|null{
 const before:number[]=[];
 let now=last;
 for(let i=stages.length-1;i>=0;i--){
  const s=stages[i];
  if(s.kind==='fixed')now+=s.a;
  else{
   const k=s.d-s.n,x=now+(s.kind==='both'?s.a:0);
   if(x%k!==0)return null;
   now=x/k*s.d;
  }
  before[i]=now;
 }
 return before;
}

function search(make:(a:number[])=>Stage[],fixedCount:number,maxTotal=700):Found[]{
 const tuples:number[][]=fixedCount===0?[[]]:fixedCount===1?range(2,12).map(a=>[a]):range(2,12).flatMap(a=>range(2,12).map(b=>[a,b]));
 const found:Found[]=[];
 for(const t of tuples){
  const stages=make(t);
  for(let last=6;last<=90;last++){
   const before=unwind(stages,last);
   if(before&&before[0]<=maxTotal)found.push({stages,last,before});
  }
 }
 return found;
}

/** Text and equation for undoing one stage: add the fixed part, divide by the retained numerator, multiply by the denominator. */
function back(x:number,a:number,k:number,d:number){
 const base=a?`(${x} + ${a})`:`${x}`;
 return k===1?`${base} × ${d}`:`${base} ÷ ${k} × ${d}`;
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-reverse-fractional-fixed-removals:${seed}:${index}`));
 const variant=(((seed+index)%4)+4)%4;
 const key=`rag-reverse-fractional-fixed-removals:${seed}:${index}`;
 const hint='Work backwards from the end. Add back any fixed amount, then use the fraction that was left.';
 const finish=(context:string[],prompt:string,answer:number,unit:string,steps:{text:string;equation:string}[]):Question=>({
  key,context,prompt,answer:String(answer),unit,hint,
  explanation:steps.map(s=>`${s.text} ${s.equation}.`).join(' '),
  workedSteps:steps,
 });

 if(variant===0||variant===3){
  const f1=r.pick(FR),f2=r.pick(FR.filter(f=>f!==f1));
  const found=search(([a,b])=>[{kind:'both',n:f1[0],d:f1[1],a},{kind:'both',n:f2[0],d:f2[1],a:b}],2);
  if(!found.length)throw new Error('No valid reverse-removal data');
  const c=r.pick(found),names=r.pick(NAMES),item=r.pick(ITEMS),box=r.pick(['bag','jar','box']);
  const [s1,s2]=c.stages as Extract<Stage,{kind:'both'}>[];
  const k1=s1.d-s1.n,k2=s2.d-s2.n,R1=c.before[1],T=c.before[0];
  const context=[
   `${names[0]}, ${names[1]} and ${names[2]} shared a ${box} of ${item}.`,
   `${names[0]} took ${s1.n}/${s1.d} of all the ${item} and ${s1.a} more.`,
   `${names[1]} then took ${s2.n}/${s2.d} of the ${item} left in the ${box} and ${s2.a} more.`,
   `${names[2]} took the last ${c.last} ${item}.`,
  ];
  const steps=[
   {text:`Undo ${names[1]}'s turn: add back the ${s2.a} extra ${item}, then use the ${k2}/${s2.d} that stayed in the ${box}.`,equation:`${back(c.last,s2.a,k2,s2.d)} = ${R1}`},
   {text:`Undo ${names[0]}'s turn the same way, using the ${k1}/${s1.d} that stayed.`,equation:`${back(R1,s1.a,k1,s1.d)} = ${T}`},
  ];
  if(variant===0)return finish(context,`How many ${item} were in the ${box} at first?`,T,item,steps);
  steps.push({text:`${names[0]}'s share is the amount that left the ${box} at the first turn.`,equation:`${T} − ${R1} = ${T-R1}`});
  return finish(context,`How many ${item} did ${names[0]} take?`,T-R1,item,steps);
 }

 if(variant===1){
  const f=r.pick(FR);
  const found=search(([a])=>[{kind:'fixed',a},{kind:'frac',n:f[0],d:f[1]}],1);
  if(!found.length)throw new Error('No valid reverse-removal data');
  const c=r.pick(found),name=r.pick(['Ana','Dev','Mina','Jun']),item=r.pick(ITEMS),box=r.pick(['bag','jar','box']);
  const [s0,s1]=c.stages as [Extract<Stage,{kind:'fixed'}>,Extract<Stage,{kind:'frac'}>];
  const k=s1.d-s1.n,mid=c.before[1],T=c.before[0];
  const context=[
   `${name} had a ${box} of ${item}.`,
   `${name} gave away ${s0.a} ${item}.`,
   `Then ${name} gave away ${s1.n}/${s1.d} of the ${item} that were left.`,
   `${c.last} ${item} were left in the ${box}.`,
  ];
  return finish(context,`How many ${item} were in the ${box} at first?`,T,item,[
   {text:`After the fraction was given away, ${k}/${s1.d} of the remaining ${item} were left.`,equation:`${back(c.last,0,k,s1.d)} = ${mid}`},
   {text:`Add back the ${s0.a} given away first.`,equation:`${mid} + ${s0.a} = ${T}`},
  ]);
 }

 const f1=r.pick(FR),f2=r.pick(FR.filter(f=>f!==f1)),pos=r.int(0,2),item=r.pick(['pencils','tickets','cards','coins','erasers']);
 const found=search(([a])=>{
  const out:Stage[]=[];
  const fr=[f1,f2];
  let used=0;
  for(let i=0;i<3;i++){
   if(i===pos)out.push({kind:'fixed',a});
   else{const [n,d]=fr[used];used+=1;out.push({kind:'frac',n,d});}
  }
  return out;
 },1);
 if(!found.length)throw new Error('No valid reverse-removal data');
 const c=r.pick(found);
 const context=[`A club had a stock of ${item}.`];
 c.stages.forEach((s,i)=>{
  const word=i===0?'First':'Then';
  if(s.kind==='fixed')context.push(`${word}, ${s.a} ${item} were used.`);
  else if(s.kind==='frac')context.push(i===0?`${word}, ${s.n}/${s.d} of all the ${item} were used.`:`${word}, ${s.n}/${s.d} of the ${item} that were left were used.`);
 });
 context.push(`${c.last} ${item} were left.`);
 const steps:{text:string;equation:string}[]=[];
 let now=c.last;
 for(let i=2;i>=0;i--){
  const s=c.stages[i];
  if(s.kind==='fixed')steps.push({text:`Undo the ${s.a} ${item} that were used: add them back.`,equation:`${now} + ${s.a} = ${c.before[i]}`});
  else if(s.kind==='frac')steps.push({text:`Undo the fraction used: ${s.d-s.n}/${s.d} of the ${item} stayed.`,equation:`${back(now,0,s.d-s.n,s.d)} = ${c.before[i]}`});
  now=c.before[i];
 }
 return finish(context,`How many ${item} were in the stock at first?`,c.before[0],item,steps);
}
