import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p5-shifted-divisibility',
 level:5,
 title:'Shifted divisibility constraints',
 objective:'Find the one number or age that satisfies two multiple conditions within stated bounds.',
 skillIds:['P4.S.FACT.03'],
 canonicalPatternId:'p5-shifted-divisibility-constraints',
};

const NAMES=['Mr Tan','Mrs Lim','Mr Ravi','Mrs Aziz','Mr Chen','Mrs Devi'];
const FIRST_DIVISORS=[4,6,7,8,9,12];
const SECOND_DIVISORS=[5,7,8,9,11,12];

interface ShiftConfig {a:number;c:number;s:number;lo:number;hi:number;x:number}
interface PairConfig {a:number;b:number;d:number;limit:number;x:number}

function shiftSolutions(a:number,c:number,s:number,lo:number,hi:number):number[]{
 const out:number[]=[];
 for(let x=lo+1;x<hi;x++)if(x%a===0&&(x+s)%c===0)out.push(x);
 return out;
}

function pairSolutions(a:number,b:number,d:number,limit:number):number[]{
 const out:number[]=[];
 for(let x=a;x<limit;x+=a){const y=x-d;if(y>=1&&y%b===0)out.push(x);}
 return out;
}

function shiftConfig(r:Rng,ageMode:boolean):ShiftConfig{
 for(let t=0;t<500;t++){
  const a=r.pick(FIRST_DIVISORS),c=r.pick(SECOND_DIVISORS),s=ageMode?r.int(1,4):r.int(2,9);
  const lo=ageMode?r.int(15,45):r.int(10,60),hi=lo+(ageMode?r.int(25,50):r.int(30,70));
  if(a===c||s%c===0)continue;
  const sols=shiftSolutions(a,c,s,lo,hi);
  if(sols.length===1)return {a,c,s,lo,hi,x:sols[0]};
 }
 return ageMode?{a:6,c:5,s:1,lo:30,hi:70,x:54}:{a:9,c:4,s:3,lo:20,hi:60,x:45};
}

function pairConfig(r:Rng):PairConfig{
 for(let t=0;t<500;t++){
  const a=r.pick([6,7,8,9]),b=r.pick([5,11,12,13,14,15]),limit=r.int(60,100),d=r.int(4,40);
  if(a===b)continue;
  const sols=pairSolutions(a,b,d,limit);
  if(sols.length===1)return {a,b,d,limit,x:sols[0]};
 }
 return {a:9,b:7,d:11,limit:60,x:18};
}

function shiftSteps(c:ShiftConfig,what:string){
 const multiples:number[]=[];
 for(let m=c.lo+1;m<c.hi;m++)if(m%c.a===0)multiples.push(m);
 const tests=multiples.map(m=>`${m} + ${c.s} = ${m+c.s} (${(m+c.s)%c.c===0?'yes':'no'})`).join('; ');
 return [
  {text:`List the multiples of ${c.a} that fit the bounds.`,equation:multiples.join(', ')},
  {text:`Add ${c.s} to each one. Check whether the result is a multiple of ${c.c}.`,equation:tests},
  {text:`Only one ${what} works.`,equation:`${c.x} + ${c.s} = ${c.x+c.s} = ${c.c} × ${(c.x+c.s)/c.c}`},
 ];
}

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(((Math.floor(seed)+index)%3)+3)%3;
 const key=`p5-shifted-divisibility:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const finish=(prompt:string,context:string[],answer:number,hint:string,steps:{text:string;equation?:string}[],unit?:string):Question=>({
  key,prompt,context,answer:String(answer),hint,workedSteps:steps,
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
  ...(unit?{unit}:{}),
 });
 if(variant===0){
  const c=shiftConfig(r,false);
  return finish('What is the number?',[
   `A number is a multiple of ${c.a}.`,
   `When ${c.s} is added, the new number is a multiple of ${c.c}.`,
   `The number is greater than ${c.lo} and less than ${c.hi}.`,
  ],c.x,`List the multiples of ${c.a} between the bounds. Add ${c.s} to each and test.`,shiftSteps(c,'number'));
 }
 if(variant===1){
  const c=shiftConfig(r,true),name=r.pick(NAMES);
  const when=c.s===1?'Next year':`In ${c.s} years' time`;
  return finish(`How old is ${name}?`,[
   `${name}'s age this year is a multiple of ${c.a}.`,
   `${when}, ${name}'s age will be a multiple of ${c.c}.`,
   `${name} is older than ${c.lo} and younger than ${c.hi}.`,
  ],c.x,`List the possible ages that are multiples of ${c.a}. Then add ${c.s} for the later age and test it.`,shiftSteps(c,'age'),'years');
 }
 const p=pairConfig(r),n1=r.pick(NAMES),n2=r.pick(NAMES.filter(n=>n!==n1));
 const multiples:number[]=[];
 for(let m=p.a;m<p.limit;m+=p.a)multiples.push(m);
 const tests=multiples.map(m=>m>p.d?`${m} − ${p.d} = ${m-p.d} (${(m-p.d)%p.b===0?'yes':'no'})`:`${m} − ${p.d} is not a positive age`).join('; ');
 return finish(`How old is ${n1}?`,[
  `${n1}'s age is a multiple of ${p.a}.`,
  `${n2}'s age is a multiple of ${p.b}.`,
  `Both ages are less than ${p.limit}.`,
  `${n1} is ${p.d} years older than ${n2}.`,
 ],p.x,`List the possible ages for ${n1}. Subtract ${p.d} to get the younger age and test it.`,[
  {text:`List the ages below ${p.limit} that are multiples of ${p.a}.`,equation:multiples.join(', ')},
  {text:`Subtract ${p.d} from each. The younger age must be a multiple of ${p.b}.`,equation:tests},
  {text:`Only one pair works.`,equation:`${p.x} − ${p.d} = ${p.x-p.d} = ${p.b} × ${(p.x-p.d)/p.b}`},
 ],'years');
}
