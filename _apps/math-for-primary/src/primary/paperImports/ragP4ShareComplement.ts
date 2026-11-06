import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';

export const RAG_PATTERN={
 id:'p4-two-share-complement',
 level:4,
 title:'What is left after two shares of the same whole?',
 objective:'Add two fractions that are shares of the same whole, subtract the combined share from one whole, and find the amount that is left.',
 skillIds:['P4.S.FRAC.03','P4.S.FRAC.04'],
 canonicalPatternId:'p4-complement-of-two-shares-of-whole',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const frac=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};

interface SharePair{a:number;d1:number;b:number;d2:number;D:number;used:number;rem:number}
const DENOMINATORS=[2,3,4,5,6,8,9,10,12];
/** Two proper, simplest-form shares with different denominators, lowest common denominator at most 36, sum below one whole. */
const PAIRS:SharePair[]=[];
for(const d1 of DENOMINATORS)for(const d2 of DENOMINATORS){
 if(d1===d2)continue;
 const D=lcm(d1,d2);if(D>36)continue;
 for(let a=1;a<d1;a++){
  if(gcd(a,d1)!==1)continue;
  for(let b=1;b<d2;b++){
   if(gcd(b,d2)!==1)continue;
   const used=a*D/d1+b*D/d2;
   if(used>=D)continue;
   PAIRS.push({a,d1,b,d2,D,used,rem:D-used});
  }
 }
}

const COUNT_SCENES=[
 {name:'Ming',things:'stamps',r1:'a friend',r2:'a cousin'},
 {name:'Hana',things:'beads',r1:'her sister',r2:'a neighbour'},
 {name:'Arun',things:'stickers',r1:'a classmate',r2:'his brother'},
 {name:'Lee',things:'marbles',r1:'a teammate',r2:'a cousin'},
];
const MONEY_SCENES=[
 {name:'Mei',u1:'a school trip',u2:'snacks'},
 {name:'Daniel',u1:'books',u2:'a birthday gift'},
 {name:'Priya',u1:'art supplies',u2:'bus rides'},
];
const GROUP_SCENES=[
 {cont:'boxes',one:'box',things:'marbles',colours:['red','blue','green']},
 {cont:'bags',one:'bag',things:'buttons',colours:['white','black','grey']},
 {cont:'trays',one:'tray',things:'muffins',colours:['plain','chocolate','raisin']},
];

/** Variant (count, money or equal groups) is chosen deterministically from seed and index. */
export function makeRagQuestion(seed:number,index=0):Question{
 const base=`rag-p4-two-share-complement:${seed}:${index}`,r=new Rng(hashString(base));
 const variant=((hashString(`rag-p4-two-share-complement:variant:${seed}`)>>>0)+index)%3;
 const p=r.pick(PAIRS),f1=`${p.a}/${p.d1}`,f2=`${p.b}/${p.d2}`;
 const usedText=frac(p.used,p.D),remText=frac(p.rem,p.D),g0=gcd(p.rem,p.D),rn=p.rem/g0,rd=p.D/g0;
 const pickTotal=(min:number,max:number)=>p.D*r.int(Math.ceil(min/p.D),Math.floor(max/p.D));
 const money=variant===1;
 let total=0,groups=0,size=0,prompt='',unit='',context:string[]=[];
 if(variant===0){
  const s=r.pick(COUNT_SCENES);total=pickTotal(48,480);unit=s.things;
  context=[`${s.name} has ${total} ${s.things}.`,`${s.name} gives ${f1} of the ${s.things} to ${s.r1} and ${f2} of the ${s.things} to ${s.r2}.`];
  prompt=`How many ${s.things} does ${s.name} have left?`;
 }else if(variant===1){
  const s=r.pick(MONEY_SCENES);total=pickTotal(100,960);unit='dollars';
  context=[`${s.name} received $${total} as an allowance in one month.`,`${s.name} spent ${f1} of the allowance on ${s.u1} and ${f2} of the allowance on ${s.u2}. The rest was saved.`];
  prompt=`How much money did ${s.name} save?`;
 }else{
  const s=r.pick(GROUP_SCENES);total=pickTotal(60,720);
  const options=[3,4,5,6,8,9,10,12].filter(g=>total%g===0);
  if(!options.length)throw Error('No equal-group arrangement');
  groups=r.pick(options);size=total/groups;unit=s.things;
  context=[`There are ${groups} ${s.cont}. Each ${s.one} holds ${size} ${s.things}.`,`${f1} of all the ${s.things} are ${s.colours[0]} and ${f2} of all the ${s.things} are ${s.colours[1]}. The rest are ${s.colours[2]}.`];
  prompt=`How many ${s.colours[2]} ${s.things} are there?`;
 }
 const answer=total/p.D*p.rem,t=(n:number)=>money?`$${n}`:String(n);
 const steps:NonNullable<Question['workedSteps']>=[
  ...(variant===2?[{text:'Find how many there are altogether.',equation:`${groups} × ${size} = ${total}`}]:[]),
  {text:'Add the two shares of the same whole.',equation:`${f1} + ${f2} = ${p.a*p.D/p.d1}/${p.D} + ${p.b*p.D/p.d2}/${p.D} = ${p.used}/${p.D}${usedText!==`${p.used}/${p.D}`?` = ${usedText}`:''}`},
  {text:'Subtract the combined share from one whole.',equation:`1 − ${usedText} = ${remText}`},
  {text:'Find the left-over share of the whole amount.',equation:`${t(total)} ÷ ${rd} × ${rn} = ${t(answer)}`},
 ];
 const proof:Proof={op:'*',a:total,b:{op:'-',a:1,b:{op:'+',a:{op:'/',a:p.a,b:p.d1},b:{op:'/',a:p.b,b:p.d2}}}};
 return {
  key:`rag-p4-two-share-complement:${variant}:${seed}:${index}`,
  prompt,context,answer:String(answer),unit,
  hint:'Add the two shares first. Take that combined share away from 1 whole, then find the left-over fraction of the whole amount.',
  explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),
  workedSteps:steps,proof,
 };
}
