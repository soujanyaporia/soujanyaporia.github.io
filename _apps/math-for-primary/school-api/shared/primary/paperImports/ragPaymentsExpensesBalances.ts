import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original money-balance tasks: cost from payments and change, and money left after spending. */
export const RAG_PATTERN={
 id:'payments-expenses-balances',
 level:6,
 title:'Payments, expenses and balances',
 objective:'Find a cost or the money left from payments, change, quantities and spending',
 skillIds:['P3.S.MONEY.01','P2.S.MONEY.03'],
 canonicalPatternId:'p6-payments-expenses-balances',
} as const;

type Step=[string,string];
const dollars=(cents:number)=>`$${(cents/100).toFixed(2)}`;
const amountText=(cents:number)=>cents<100?`${cents} cents`:cents%100===0?`$${cents/100}`:dollars(cents);
const NAMES=['Aisha','Ben','Chen','Devi','Farid','Mei'];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-payments-expenses-balances:${seed}:${index}`));
 const variant=(((Math.trunc(seed)+index)%4)+4)%4;
 const name=r.pick(NAMES);
 const key=`rag-p6-payments-expenses-balances:${seed}:${index}`;
 const finish=(context:string[],prompt:string,cents:number,hint:string,steps:Step[]):Question=>({
  key,context,prompt,answer:(cents/100).toFixed(2),unit:'dollars',hint,
  explanation:steps.map(([text,equation])=>`${text} ${equation}`).join(' '),
  workedSteps:steps.map(([text,equation])=>({text,equation})),
 });
 if(variant===0){
  const [withArticle,noun]=r.pick([['a jacket','jacket'],['a backpack','backpack'],['a haircut','haircut'],['a toy robot','toy robot']]);
  const note=r.pick([20,50]),changeNote=r.pick([5,10]),extra=r.pick([20,30,40,60,70,80,100,200]);
  const paid=note*100+extra,cost=paid-changeNote*100;
  return finish([
   `${name} paid for ${withArticle} with a $${note} note.`,
   `The shop had no small coins for the change, so ${name} handed over ${amountText(extra)} more and was given a $${changeNote} note back.`,
  ],`What was the cost of the ${noun}?`,cost,'Add everything the customer handed over, then take away the change that came back.',[
   ['Find the total amount handed over.',`${dollars(note*100)} + ${dollars(extra)} = ${dollars(paid)}`],
   ['Subtract the change received to find the cost.',`${dollars(paid)} − ${dollars(changeNote*100)} = ${dollars(cost)}`],
  ]);
 }
 if(variant===1){
  const plural=r.pick(['notebooks','pens','rulers','sticker sheets']);
  const price=r.int(12,96)*5,qty=r.int(3,9),cost=price*qty;
  const have=Math.floor(cost/500)*5+5+5*r.int(0,2);
  return finish([
   `${name} has $${have}.`,
   `${name} buys ${qty} ${plural} at ${dollars(price)} each.`,
  ],'How much money is left?',have*100-cost,'Find the cost of all the items first. Then subtract it from the money held.',[
   ['Find the cost of the items.',`${qty} × ${dollars(price)} = ${dollars(cost)}`],
   ['Subtract the cost from the money held.',`${dollars(have*100)} − ${dollars(cost)} = ${dollars(have*100-cost)}`],
  ]);
 }
 if(variant===2){
  const [first,second]=r.pick([['a bun','a drink'],['an apple','some juice'],['a ruler','an eraser']]);
  const have=r.pick([5,10,20]),a=r.int(1,19)*5,b=r.chance(.5)?r.int(1,19)*5:r.int(21,79)*5;
  const left=have*100-a-b;
  return finish([
   `${name} has $${have}.`,
   `${name} buys ${first} for ${amountText(a)} and ${second} for ${amountText(b)}.`,
  ],`How much money does ${name} have left?`,left,'Write every amount in dollars and cents. Add the two expenses, then subtract from the money held.',[
   ['Add the two expenses.',`${dollars(a)} + ${dollars(b)} = ${dollars(a+b)}`],
   ['Subtract the total spent from the money held.',`${dollars(have*100)} − ${dollars(a+b)} = ${dollars(left)}`],
  ]);
 }
 const [d1,d2]=r.pick([[10,5],[5,2],[10,2]]),n1=r.int(2,4),n2=r.int(2,4),item=r.pick(['book','game','kite']);
 const start=r.int(2,39)*10,gift=n1*d1*100+n2*d2*100,total=start+gift;
 const spent=r.int(Math.ceil(total*.4/5),Math.floor(total*.9/5))*5;
 return finish([
  `${name} has ${dollars(start)} in a purse.`,
  `${name}'s aunt gives ${name} ${n1} notes of $${d1} and ${n2} notes of $${d2}.`,
  `Then ${name} spends ${dollars(spent)} on a ${item}.`,
 ],`How much money does ${name} have left?`,total-spent,'Find the value of the notes, add the money already held, then subtract what was spent.',[
  ['Find the value of the notes.',`${n1} × $${d1} + ${n2} × $${d2} = ${dollars(gift)}`],
  ['Add the money already in the purse.',`${dollars(start)} + ${dollars(gift)} = ${dollars(total)}`],
  ['Subtract the spending.',`${dollars(total)} − ${dollars(spent)} = ${dollars(total-spent)}`],
 ]);
}
