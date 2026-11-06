import {Rng,hashString} from '../../engine/random';
import {fraction,type Question} from '../generate';

export const RAG_PATTERN={
 id:'rag-p6-complement-of-whole-based-allocations',
 level:6,
 title:'Find what is left after fractions of a whole are taken away',
 objective:'Subtract fractions of one whole from 1, then find the remaining fraction, the remaining quantity, or an equal share of the remainder',
 skillIds:['P4.S.FRAC.03','P4.S.FRAC.04','P6.S.FRAC.01'],
 canonicalPatternId:'p6-complement-of-whole-based-allocations',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const frac=(n:number,d:number)=>`${n}/${d}`;
const DENOMS=[3,4,5,6,8,9,10,12];
type Variant='remaining-fraction'|'remaining-quantity'|'share-after-one'|'share-after-two';
const VARIANTS:Variant[]=['remaining-fraction','remaining-quantity','share-after-one','share-after-two'];

const COUNT_THEMES=[
 {intro:'A craft box holds some buttons.',noun:'buttons',a:'round',b:'square',rest:'star-shaped'},
 {intro:'A jar contains some marbles.',noun:'marbles',a:'red',b:'blue',rest:'green'},
 {intro:'A tray holds some biscuits.',noun:'biscuits',a:'plain',b:'chocolate',rest:'raisin'},
 {intro:'A class set has some pencils.',noun:'pencils',a:'yellow',b:'orange',rest:'purple'},
];
const STOCK_THEMES=[
 {place:'A toy stall',noun:'kites'},
 {place:'A plant nursery',noun:'plants'},
 {place:'A school fair booth',noun:'tickets'},
 {place:'A fruit stand',noun:'oranges'},
];
const SHARE_THEMES=[
 {whole:'loaf of bread',piece:'slice',pieces:'slices'},
 {whole:'cake',piece:'slice',pieces:'slices'},
 {whole:'tray of lasagne',piece:'portion',pieces:'portions'},
];
const NAMES=['Mina','Hakim','Priya','Jun','Salma','Wei'];

interface Pair {n1:number;d1:number;n2:number;d2:number;L:number;rem:number}
function pickPair(r:Rng):Pair{
 for(let t=0;t<300;t++){
  const d1=r.pick(DENOMS),d2=r.pick(DENOMS);if(d1===d2)continue;
  const n1=r.int(1,d1-1),n2=r.int(1,d2-1);
  if(gcd(n1,d1)!==1||gcd(n2,d2)!==1)continue;
  const L=lcm(d1,d2),s=n1*(L/d1)+n2*(L/d2);
  if(s<L)return {n1,d1,n2,d2,L,rem:L-s};
 }
 return {n1:1,d1:3,n2:1,d2:4,L:12,rem:5};
}
function pickOne(r:Rng):{n:number;d:number}{
 for(let t=0;t<300;t++){
  const d=r.int(3,9),n=r.int(1,d-1);
  if(gcd(n,d)===1)return {n,d};
 }
 return {n:1,d:8};
}
const pairSteps=(p:Pair)=>[
 `Write both fractions with denominator ${p.L}: ${frac(p.n1,p.d1)} = ${frac(p.n1*p.L/p.d1,p.L)} and ${frac(p.n2,p.d2)} = ${frac(p.n2*p.L/p.d2,p.L)}.`,
 `Taken away together: ${frac(p.n1*p.L/p.d1,p.L)} + ${frac(p.n2*p.L/p.d2,p.L)} = ${frac(p.L-p.rem,p.L)}.`,
 `The whole is 1 = ${frac(p.L,p.L)}, so what is left is ${frac(p.L,p.L)} − ${frac(p.L-p.rem,p.L)} = ${frac(p.rem,p.L)}.`,
];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-complement:${seed}:${index}`));
 const variant=VARIANTS[(((Math.trunc(seed)+index)%4)+4)%4];
 const key=`rag-p6-complement:${seed}:${index}`;
 switch(variant){
 case 'remaining-fraction':{
  const t=r.pick(COUNT_THEMES),p=pickPair(r),answer=fraction(p.rem,p.L),steps=pairSteps(p);
  if(frac(p.rem,p.L)!==answer)steps.push(`Simplify ${frac(p.rem,p.L)} to ${answer}.`);
  return {key,context:[t.intro,`${frac(p.n1,p.d1)} of the ${t.noun} are ${t.a}.`,`${frac(p.n2,p.d2)} of the ${t.noun} are ${t.b}.`,`All the other ${t.noun} are ${t.rest}.`],prompt:`What fraction of the ${t.noun} are ${t.rest}?`,answer,requireSimplified:true,hint:'The whole is 1. Add the two named fractions, then take the total away from 1.',workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
 }
 case 'remaining-quantity':{
  const t=r.pick(STOCK_THEMES),p=pickPair(r),k=r.int(1,Math.max(1,Math.floor(480/p.L))),total=p.L*k,left=p.rem*k;
  const steps=[...pairSteps(p),`${frac(p.rem,p.L)} of ${total} = ${total} ÷ ${p.L} × ${p.rem} = ${left}.`];
  return {key,context:[`${t.place} had ${total} ${t.noun} at the start of the day.`,`${frac(p.n1,p.d1)} of all the ${t.noun} were sold in the morning.`,`${frac(p.n2,p.d2)} of all the ${t.noun} were sold in the afternoon.`],prompt:`How many ${t.noun} were left unsold at the end of the day?`,answer:String(left),unit:t.noun,hint:'Find the fraction that is left after both sales. Then find that fraction of the starting number.',workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
 }
 case 'share-after-one':{
  const t=r.pick(SHARE_THEMES),name=r.pick(NAMES),{n,d}=pickOne(r),m=r.int(2,9),answer=fraction(d-n,d*m);
  const steps=[`After giving away ${frac(n,d)}, what is left is 1 − ${frac(n,d)} = ${frac(d-n,d)} of the whole.`,`Share it into ${m} equal parts: ${frac(d-n,d)} ÷ ${m} = ${frac(d-n,d*m)}.`];
  if(frac(d-n,d*m)!==answer)steps.push(`Simplify ${frac(d-n,d*m)} to ${answer}.`);
  return {key,context:[`${name} gave ${frac(n,d)} of a ${t.whole} to a neighbour.`,`${name} cut the rest into ${m} equal ${t.pieces}.`],prompt:`What fraction of the whole ${t.whole} is each ${t.piece}? Give your answer in simplest form.`,answer,requireSimplified:true,hint:'First find what fraction of the whole is left. Then divide that fraction by the number of equal parts.',workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
 }
 case 'share-after-two':{
  const t=r.pick(SHARE_THEMES),name=r.pick(NAMES),p=pickPair(r),m=r.int(2,8),answer=fraction(p.rem,p.L*m);
  const steps=[...pairSteps(p),`Share ${frac(p.rem,p.L)} into ${m} equal parts: ${frac(p.rem,p.L)} ÷ ${m} = ${frac(p.rem,p.L*m)}.`];
  if(frac(p.rem,p.L*m)!==answer)steps.push(`Simplify ${frac(p.rem,p.L*m)} to ${answer}.`);
  return {key,context:[`${name} gave ${frac(p.n1,p.d1)} of a ${t.whole} to a neighbour and ${frac(p.n2,p.d2)} of the whole ${t.whole} to a friend.`,`${name} cut what was left into ${m} equal ${t.pieces}.`],prompt:`What fraction of the whole ${t.whole} is each ${t.piece}? Give your answer in simplest form.`,answer,requireSimplified:true,hint:'Subtract both given fractions from 1 to find what is left. Then divide that fraction by the number of equal parts.',workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
 }
 }
}
