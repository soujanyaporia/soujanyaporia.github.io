import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'percentage-adjusted-payments',
 level:5,
 title:'Percentage-adjusted payments',
 objective:'Apply GST or a discount to a price, then find change, compare two payment plans or count the weeks needed to save',
 skillIds:['P5.S.PCT.04','P5.S.PCT.03'],
 canonicalPatternId:'p5-percentage-adjusted-payments'
};

const fmt=(n:number)=>Number(n.toFixed(6)).toString();
const dollars=(n:number)=>'$'+fmt(n);
const cents=(c:number)=>'$'+(c/100).toFixed(2);
const PEOPLE=['Rasyid','Mia','Ben','Aisha','Chen','Priya'];

function roundedChange(r:Rng,key:string):Question{
 const foods=r.shuffle(['chicken noodles','fried rice','fish soup','curry puffs','fruit salad','dumplings','iced tea','soya milk']);
 const person=r.pick(PEOPLE);
 for(let tries=0;tries<1000;tries++){
  const p1=r.int(25,65)*10,p2=r.int(25,65)*10,p3=r.int(8,20)*10,q=r.int(2,3),g=r.pick([7,9]);
  const subtotal=p1+p2+q*p3;
  const needCents=Math.ceil(subtotal*(100+g)/100)+100;
  const paid=[10,20,50,100].find(v=>v*100>=needCents);
  if(paid===undefined)continue;
  // Exact change in hundredths of a cent, so the rounding is exact.
  const units=paid*10000-subtotal*(100+g);
  if(units<=0||units%1000===500)continue;
  const answer=Math.round(units/1000)/10;
  const gstAmount=subtotal*g/10000,total=subtotal*(100+g)/10000,exactChange=paid-total;
  return {
   key,
   context:[
    `${person} orders ${foods[0]} at ${cents(p1)}, ${foods[1]} at ${cents(p2)}, and ${q} × ${foods[2]} at ${cents(p3)} each.`,
    `The bill adds GST of ${g}% to the sub-total. ${person} pays with a $${paid} note.`
   ],
   prompt:`How much change should ${person} get? Round the change to the nearest 10 cents.`,
   answer:fmt(answer),
   unit:'dollars',
   hint:'Find the sub-total first. Add the GST, subtract the total from the note, then round the change.',
   workedSteps:[
    {text:`Sub-total = ${cents(p1)} + ${cents(p2)} + ${q} × ${cents(p3)} = ${cents(subtotal)}.`},
    {text:`GST = ${g}% of ${cents(subtotal)} = ${dollars(gstAmount)}, so the total is ${dollars(total)}.`},
    {text:`Change = $${paid} − ${dollars(total)} = ${dollars(exactChange)}.`},
    {text:`To the nearest 10 cents, the change is ${dollars(answer)}.`}
   ],
   explanation:`The sub-total is ${cents(subtotal)}. With ${g}% GST the total is ${dollars(total)}. The change from $${paid} is ${dollars(exactChange)}, which rounds to ${dollars(answer)}.`
  };
 }
 throw new Error('No valid rounded-change case');
}

function planSaving(r:Rng,key:string):Question{
 const item=r.pick(['tablet','laptop','washing machine','television','sofa']);
 for(let tries=0;tries<1000;tries++){
  const price=r.int(6,24)*200,d=r.pick([5,10,12,15,20,25]),downTenths=r.pick([50,75,100,125,150]),n=r.pick([6,10,12,18,24]);
  const cash=price*(100-d)/100,down=price*downTenths/1000;
  const base=Math.round((cash-down)/n),m=Math.max(10,base+r.int(-15,15));
  const instalment=down+m*n,diff=Math.abs(cash-instalment);
  if(diff===0||diff>1500)continue;
  const cheaper=cash<instalment?'Plan A':'Plan B';
  const downPct=fmt(downTenths/10);
  return {
   key,
   context:[
    `A ${item} costs $${price} at the shop. There are two ways to pay.`,
    `Plan A: pay cash and get a ${d}% discount.`,
    `Plan B: pay a down payment of ${downPct}% of the original price, then $${m} each month for ${n} months.`
   ],
   prompt:'Compare the two plans. How much money is saved by choosing the plan that costs less?',
   answer:fmt(diff),
   unit:'dollars',
   hint:'Find the total paid for each plan. Plan B is the down payment plus all the monthly payments.',
   workedSteps:[
    {text:`Plan A: ${d}% of $${price} = ${dollars(price*d/100)}, so the cash price is $${price} − ${dollars(price*d/100)} = ${dollars(cash)}.`},
    {text:`Plan B down payment: ${downPct}% of $${price} = ${dollars(down)}.`},
    {text:`Plan B monthly payments: ${n} × $${m} = ${dollars(n*m)}.`},
    {text:`Plan B total = ${dollars(down)} + ${dollars(n*m)} = ${dollars(instalment)}.`},
    {text:`${cheaper} costs less. The saving is ${dollars(Math.max(cash,instalment))} − ${dollars(Math.min(cash,instalment))} = ${dollars(diff)}.`}
   ],
   explanation:`Plan A costs ${dollars(cash)} and Plan B costs ${dollars(instalment)}. ${cheaper} is cheaper, and the saving is ${dollars(diff)}.`
  };
 }
 throw new Error('No valid plan-comparison case');
}

function savingWeeks(r:Rng,key:string):Question{
 const person=r.pick(PEOPLE);
 const item=r.pick(['necklace','bicycle','tablet','school bag','guitar','camera']);
 for(let tries=0;tries<1000;tries++){
  const price=r.int(24,96)*5,g=r.pick([7,9]),saving=r.int(2,10)*5;
  const num=price*(100+g),den=100*saving;
  if(num%den===0)continue;
  const weeks=Math.floor((num+den-1)/den);
  if(weeks<3||weeks>20)continue;
  const gst=price*g/100,total=price*(100+g)/100;
  return {
   key,
   context:[
    `${person} wants a ${item} that costs $${price} before GST.`,
    `GST of ${g}% is added to the price. ${person} saves $${saving} each week and has no savings now.`
   ],
   prompt:`How many whole weeks must ${person} save to have enough for the full price with GST?`,
   answer:String(weeks),
   unit:'weeks',
   hint:'Find the price with GST first. Divide by the weekly saving. A part-week still needs another whole week.',
   workedSteps:[
    {text:`GST = ${g}% of $${price} = ${dollars(gst)}.`},
    {text:`Price with GST = $${price} + ${dollars(gst)} = ${dollars(total)}.`},
    {text:`${dollars(total)} ÷ $${saving} = ${fmt(total/saving)}, which is more than ${weeks-1} weeks but not more than ${weeks} weeks.`},
    {text:`Round up to ${weeks} whole weeks.`}
   ],
   explanation:`The price with GST is ${dollars(total)}. After ${weeks-1} weeks the savings are $${(weeks-1)*saving}, which is not enough. After ${weeks} weeks they are $${weeks*saving}, which is enough.`
  };
 }
 throw new Error('No valid saving-weeks case');
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-percentage-adjusted-payments:${seed}:${index}`));
 const key=`rag-percentage-adjusted-payments:${seed}:${index}`;
 const variant=((Math.floor(Math.abs(seed))%3)+Math.abs(Math.floor(index)))%3;
 return variant===0?roundedChange(r,key):variant===1?planSaving(r,key):savingWeeks(r,key);
}
