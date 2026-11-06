import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'simple-purchase-equation',
 level:6,
 title:'Solve a simple purchase problem',
 objective:'Use cost = quantity × unit price with money paid, change or a shortfall to find a missing amount, price or quantity.',
 skillIds:['P6.S.ALG.04','P6.S.ALG.05','P5.S.RATE.02'],
 canonicalPatternId:'p6-simple-purchase-equation',
};

const NAMES=['Mina','Ravi','Aisha','Chen','Dee','Kai'];
/** Whole dollars are shown without decimals; other amounts use two decimal places. */
const dollars=(cents:number)=>cents%100===0?`$${cents/100}`:`$${(cents/100).toFixed(2)}`;
type Step={text:string;equation:string};

/** Four original purchase configurations. All givens are stated in the context. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-purchase-equation-v2:${seed}:${index}`));
 const key=`rag-purchase-equation:${seed}:${index}`;
 const name=r.pick(NAMES);
 const variant=r.int(0,3);
 const build=(context:string[],prompt:string,answer:string,unit:string,hint:string,steps:Step[]):Question=>({
  key,context,prompt,answer,unit,hint,
  workedSteps:steps,
  explanation:steps.map(s=>`${s.text} ${s.equation}.`).join(' '),
 });

 if(variant===0){
  const item=r.pick(['ribbon','rope','cloth']);
  const price=r.pick([250,300,350,400,450,600]);
  const tenths=r.int(35,140);
  const cost=price*tenths/10;
  const haveDollars=r.int(5,Math.floor(cost/100)-1);
  const have=haveDollars*100;
  const short=cost-have;
  const len=(tenths/10).toFixed(1);
  return build(
   [`${item[0].toUpperCase()+item.slice(1)} is sold at ${dollars(price)} per metre.`,`${name} has ${dollars(have)}.`,`${name} wants to buy ${len} m of the ${item}.`],
   `How much more money does ${name} need?`,
   (short/100).toFixed(2),'dollars',
   'First find the cost of all the metres. Then compare it with the money in hand.',
   [{text:'Find the cost of the length wanted.',equation:`${len} × ${dollars(price)} = ${dollars(cost)}`},
    {text:'Subtract the money already held.',equation:`${dollars(cost)} − ${dollars(have)} = ${dollars(short)}`}],
  );
 }
 if(variant===1){
  const unit=r.pick([2,4,5,8,12,15,20,25,30,40,60]);
  const n=r.pick([20,25,40,50,60,80]);
  const total=unit*n;
  const thing=r.pick(['stickers','erasers','beads','buttons']);
  return build(
   [`${name} paid ${dollars(total)} for ${n} ${thing}.`,'Every one costs the same.'],
   'How many cents does one of them cost?',
   String(unit),'cents',
   'Change the dollars to cents, then share the total equally.',
   [{text:'Write the total in cents.',equation:`${dollars(total)} = ${total} cents`},
    {text:'Divide by the number bought.',equation:`${total} ÷ ${n} = ${unit} cents`}],
  );
 }
 if(variant===2){
  const item=r.pick(['apples','oranges','mangoes','pears']);
  const bundle=r.pick([2,3,4,5,6]);
  const paid=r.pick([20,50]);
  const p=r.int(3,9);
  const k=r.int(2,Math.min(8,Math.floor((paid-1)/p)));
  const spent=k*p,change=paid-spent;
  return build(
   [`A stall sells ${item} ${bundle} for ${dollars(p*100)}.`,`${name} gave the seller ${dollars(paid*100)} and got ${dollars(change*100)} change.`],
   `How many ${item} did ${name} buy?`,
   String(k*bundle),item,
   'Money paid minus change is the money spent. Then count how many equal bundles that buys.',
   [{text:'Find the money spent.',equation:`${dollars(paid*100)} − ${dollars(change*100)} = ${dollars(spent*100)}`},
    {text:'Find how many bundles were bought.',equation:`${dollars(spent*100)} ÷ ${dollars(p*100)} = ${k}`},
    {text:'Multiply by the number in each bundle.',equation:`${k} × ${bundle} = ${k*bundle}`}],
  );
 }
 const n=r.int(2,6),a=r.int(1,4),m=r.int(2,6),f=r.int(2,7);
 const fileCost=n+a,total=m*n+f*fileCost;
 return build(
  ['A pen costs n dollars.',`A file costs (n + ${a}) dollars.`,`In this shop, n = ${n}.`,`${name} buys ${m} pens and some files, and pays ${dollars(total*100)}.`],
  `How many files does ${name} buy?`,
  String(f),'files',
  'Substitute the value of n. Take away the cost of the pens, then divide by the price of one file.',
  [{text:'Find the price of one file.',equation:`${n} + ${a} = ${fileCost}`},
   {text:'Find the cost of the pens.',equation:`${m} × ${n} = ${m*n}`},
   {text:'Find the money left for files.',equation:`${total} − ${m*n} = ${total-m*n}`},
   {text:'Divide by the price of one file.',equation:`${total-m*n} ÷ ${fileCost} = ${f}`}],
 );
}
