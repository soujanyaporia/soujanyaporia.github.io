import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p5-fixed-quantity-changes',
 level:5,
 title:'Find an amount before fixed fraction changes',
 objective:'Undo a fixed removal and addition, or repeated equal additions, to recover an unknown starting amount given as a fraction or mixed number.',
 skillIds:['P5.S.FRAC.04','P4.S.FRAC.04'],
 canonicalPatternId:'p5-fixed-quantity-changes',
};

type Frac={n:number;d:number};
const gcd=(a:number,b:number):number=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const frac=(n:number,d:number):Frac=>{const g=gcd(n,d);return {n:n/g,d:d/g};};
const whole=(n:number):Frac=>({n,d:1});
const add=(a:Frac,b:Frac)=>frac(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a:Frac,b:Frac)=>frac(a.n*b.d-b.n*a.d,a.d*b.d);
const times=(a:Frac,k:number)=>frac(a.n*k,a.d);
const same=(a:Frac,b:Frac)=>a.n===b.n&&a.d===b.d;
const less=(a:Frac,b:Frac)=>a.n*b.d<b.n*a.d;
/** Positive amounts only: whole number, proper fraction or mixed number in simplest form. */
const text=(x:Frac)=>{const w=Math.floor(x.n/x.d),rest=x.n-w*x.d;return rest===0?String(w):w===0?`${rest}/${x.d}`:`${w} ${rest}/${x.d}`;};
const proper=(dens:number[]):Frac[]=>dens.flatMap(d=>Array.from({length:d-1},(_,k)=>k+1).filter(n=>gcd(n,d)===1).map(n=>({n,d})));

// Variant 1: removed fraction and the fractional part of the added mixed number.
const DEN_A=[2,3,4,5,6,8,10];
const PAIRS_A:{rm:Frac;ad:Frac}[]=proper(DEN_A).flatMap(rm=>proper(DEN_A).filter(ad=>lcm(rm.d,ad.d)<=40&&!same(rm,ad)).map(ad=>({rm,ad})));

// Variant 2: all-proper-fraction givens, start larger than the removal, final below one.
const DEN_B=[2,3,4,5,6,8,10,12];
const CASES_B:{i:Frac;rm:Frac;ad:Frac;f:Frac}[]=(()=>{
 const out:{i:Frac;rm:Frac;ad:Frac;f:Frac}[]=[],all=proper(DEN_B);
 for(const i of all)for(const rm of all){if(!less(rm,i))continue;for(const ad of all){
  if(same(ad,rm)||lcm(lcm(i.d,rm.d),ad.d)>24)continue;
  const f=add(sub(i,rm),ad);if(f.n>=f.d)continue;out.push({i,rm,ad,f});
 }}
 return out;
})();

// Variant 3: fractional parts of the syrup and jug amounts.
const DEN_C=[2,3,4,5,6,8];
const CASES_C:{s:Frac;j:Frac}[]=proper(DEN_C).flatMap(s=>proper(DEN_C).filter(j=>lcm(s.d,j.d)<=24).map(j=>({s,j})));

const NAMES=['Mei','Ravi','Aisha','Ben','Chen','Nora'];
const STORIES=[
 {thing:'paint',container:'tin',unit:'L',unitName:'litres',remove:(q:string)=>`used ${q} of the paint`,add:(q:string)=>`bought ${q} more paint`},
 {thing:'milk',container:'jug',unit:'L',unitName:'litres',remove:(q:string)=>`poured out ${q} of the milk`,add:(q:string)=>`poured in ${q} more milk`},
 {thing:'rice',container:'bin',unit:'kg',unitName:'kilograms',remove:(q:string)=>`used ${q} of the rice`,add:(q:string)=>`added ${q} more rice`},
 {thing:'ribbon',container:'box',unit:'m',unitName:'metres',remove:(q:string)=>`cut off ${q} of the ribbon`,add:(q:string)=>`tied on ${q} more ribbon`},
];
const MIXES=[
 {additive:'orange syrup',fill:'water',container:'cooler'},
 {additive:'liquid soap',fill:'water',container:'bucket'},
 {additive:'green dye',fill:'water',container:'tub'},
];

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`rag-fixed-quantity-changes:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=(((hashString(`rag-fixed-quantity-changes:variant:${seed}`)+index)%3)+3)%3;
 const name=r.pick(NAMES);

 if(variant===2){
  const c=r.pick(CASES_C),mix=r.pick(MIXES);
  const sw=r.int(1,4),jw=r.int(1,3);let k=r.int(3,9);
  if(sw===1&&same(c.s,{n:1,d:2})&&jw===1&&same(c.j,{n:3,d:4})&&k===9)k=8;
  const syrup=add(whole(sw),c.s),jug=add(whole(jw),c.j),poured=times(jug,k),capacity=add(syrup,poured);
  const q=(x:Frac)=>`${text(x)} L`;
  const steps=[
   {text:`The ${k} jugs of ${mix.fill} hold ${k} jugs of the same size altogether.`,equation:`${k} × ${q(jug)} = ${q(poured)}`},
   {text:`The ${mix.additive} filled the rest of the ${mix.container}, so subtract the ${mix.fill} from the capacity.`,equation:`${q(capacity)} − ${q(poured)} = ${q(syrup)}`},
  ];
  return {
   key,
   context:[
    `${name} is filling a ${mix.container} that holds ${q(capacity)}.`,
    `First ${name} pours in some ${mix.additive}.`,
    `Then ${name} adds ${k} jugs of ${mix.fill} to fill the ${mix.container} to the brim.`,
    `Each jug holds ${q(jug)}.`,
   ],
   prompt:`How many litres of ${mix.additive} did ${name} pour in first? Give your answer as a mixed number in simplest form.`,
   answer:text(syrup),unit:'L',requireSimplified:true,requireMixed:true,
   hint:'Find how much all the equal jugs hold. The rest of the capacity must be the first liquid.',
   explanation:steps.map(s=>`${s.text} ${s.equation}.`).join(' '),
   workedSteps:steps,
  };
 }

 const story=r.pick(STORIES),removeFirst=r.chance(.5),u=story.unit;
 const qty=(x:Frac)=>`${text(x)} ${u}`;
 let initial:Frac,removed:Frac,added:Frac,left:Frac;
 if(variant===0){
  const {rm,ad}=r.pick(PAIRS_A),w=r.int(1,3),gap=r.int(2,6);
  removed=rm;added=add(whole(w),ad);left=whole(w+gap);initial=sub(add(left,removed),added);
 }else{
  const c=r.pick(CASES_B);
  initial=c.i;removed=c.rm;added=c.ad;left=c.f;
 }
 const removeSentence=(then:boolean)=>`${then?'Then ':''}${name} ${story.remove(qty(removed))}.`;
 const addSentence=(then:boolean)=>`${then?'Then ':''}${name} ${story.add(qty(added))}.`;
 const context=[
  `${name} had some ${story.thing} in a ${story.container}.`,
  ...(removeFirst?[removeSentence(false),addSentence(true)]:[addSentence(false),removeSentence(true)]),
  `Now ${qty(left)} of ${story.thing} is left in the ${story.container}.`,
 ];
 const middle=removeFirst?sub(left,added):add(left,removed);
 const steps=removeFirst?[
  {text:'The last change was adding, so undo it by subtracting.',equation:`${qty(left)} − ${qty(added)} = ${qty(middle)}`},
  {text:'Before that, some was taken out, so put it back by adding.',equation:`${qty(middle)} + ${qty(removed)} = ${qty(initial)}`},
 ]:[
  {text:'The last change was taking some out, so undo it by adding it back.',equation:`${qty(left)} + ${qty(removed)} = ${qty(middle)}`},
  {text:'Before that, some was added, so undo it by subtracting.',equation:`${qty(middle)} − ${qty(added)} = ${qty(initial)}`},
 ];
 const mixedAnswer=variant===0;
 return {
  key,context,
  prompt:`How much ${story.thing} was in the ${story.container} at first? Give your answer in ${story.unitName} as ${mixedAnswer?'a mixed number':'a fraction'} in simplest form.`,
  answer:text(initial),unit:u,requireSimplified:true,requireMixed:mixedAnswer,
  hint:'Work backwards from the end. Do the opposite of each change, starting with the last one.',
  explanation:steps.map(s=>`${s.text} ${s.equation}.`).join(' '),
  workedSteps:steps,
 };
}
