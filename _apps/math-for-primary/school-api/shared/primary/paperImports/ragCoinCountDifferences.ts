import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p5-coin-counts-subtotal-differences',
 level:5,
 title:'Find coin counts from differences',
 objective:'Use a difference in coin counts and a difference in coin values to find how many coins there are, then use the total for a purchase.',
 skillIds:['P3.S.MONEY.01','P4.S.MD.03'],
 canonicalPatternId:'p5-coin-counts-from-count-and-value-differences',
};

// [smaller coin, larger coin] in cents.
const PAIRS:[number,number][]=[[5,20],[10,20],[10,50],[20,50],[20,100],[50,100]];
const NAMES:[string,string][]=[['Mei','Dev'],['Aina','Ravi'],['Jia','Ben'],['Nadia','Chen'],['Hana','Omar']];
const ITEMS=['shirt','book','toy','cap'];
const label=(cents:number)=>cents===100?'$1':`${cents}-cent`;
const dollars=(cents:number)=>(cents/100).toFixed(2);
type Step=[string,string];

/** Three variants are rotated by seed + index so every variant is reachable from nearby seeds. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-coin-count-differences-v2:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+index)%3;
 const [small,large]=r.pick(PAIRS),gap=large-small;
 const extraCoins=r.int(6,40);
 const largeCount=Math.floor(small*extraCoins/gap)+1+r.int(2,25);
 const smallCount=largeCount+extraCoins;
 const valueDifference=gap*largeCount-small*extraCoins;
 const extraValue=small*extraCoins,paired=valueDifference+extraValue;
 const steps:Step[]=[
  ['Write the value difference in cents.',`$${dollars(valueDifference)} = ${valueDifference} cents`],
  [`Match each ${label(large)} coin with one ${label(small)} coin. The ${extraCoins} extra ${label(small)} coins have no partner. Find their value.`,`${extraCoins} × ${small} = ${extraValue} cents`],
  [`Without the extra coins, the ${label(large)} coins are worth even more than the matched ${label(small)} coins.`,`${valueDifference} + ${extraValue} = ${paired} cents`],
  ['Find how much more one larger coin is worth than one smaller coin.',`${large} − ${small} = ${gap} cents`],
  [`Each pair has one ${label(large)} coin, so the number of pairs is the number of ${label(large)} coins.`,`${paired} ÷ ${gap} = ${largeCount}`],
 ];
 const [first,second]=r.pick(NAMES);
 if(variant===0){
  const all:Step[]=steps;
  return {key:`rag-coin-count-differences:${seed}:${index}`,
   context:[`${first} has only ${label(small)} coins and ${second} has only ${label(large)} coins.`,`${first} has ${extraCoins} more coins than ${second}.`,`${second}'s money is $${dollars(valueDifference)} more than ${first}'s money.`],
   prompt:`How many ${label(large)} coins does ${second} have?`,answer:String(largeCount),unit:'coins',
   hint:'Match each larger coin with a smaller coin. The extra smaller coins are left over.',
   workedSteps:all.map(([text,equation])=>({text,equation})),explanation:all.map(s=>s.join(' ')).join(' ')};
 }
 if(variant===1){
  const all:Step[]=[...steps,[`There are ${extraCoins} more ${label(small)} coins than ${label(large)} coins.`,`${largeCount} + ${extraCoins} = ${smallCount}`]];
  return {key:`rag-coin-count-differences:${seed}:${index}`,
   context:[`A box has only ${label(small)} coins and ${label(large)} coins.`,`There are ${extraCoins} more ${label(small)} coins than ${label(large)} coins.`,`The value of all the ${label(large)} coins is $${dollars(valueDifference)} more than the value of all the ${label(small)} coins.`],
   prompt:`How many ${label(small)} coins are in the box?`,answer:String(smallCount),unit:'coins',
   hint:'First find the number of larger coins. Then add the extra smaller coins.',
   workedSteps:all.map(([text,equation])=>({text,equation})),explanation:all.map(s=>s.join(' ')).join(' ')};
 }
 const item=r.pick(ITEMS),shortfall=r.int(4,90)*5;
 const total=large*largeCount+small*smallCount,price=total+shortfall;
 const all:Step[]=[...steps,
  [`(a) There are ${extraCoins} more ${label(small)} coins than ${label(large)} coins.`,`${largeCount} + ${extraCoins} = ${smallCount}`],
  ['Find the total value of all the coins in cents.',`${largeCount} × ${large} + ${smallCount} × ${small} = ${total} cents`],
  ['Write the price in cents.',`$${dollars(price)} = ${price} cents`],
  ['(b) Subtract the coin total from the price.',`${price} − ${total} = ${shortfall} cents = $${dollars(shortfall)}`],
 ];
 return {key:`rag-coin-count-differences:${seed}:${index}`,
  context:[`${first} has a bag with only ${label(small)} coins and ${label(large)} coins.`,`There are ${extraCoins} more ${label(small)} coins than ${label(large)} coins.`,`The value of all the ${label(large)} coins is $${dollars(valueDifference)} more than the value of all the ${label(small)} coins.`,`${first} wants to buy a ${item} that costs $${dollars(price)}.`],
  prompt:`(a) How many ${label(small)} coins are in the bag? (b) How much more money does ${first} need to buy the ${item}? Give (b) in dollars.`,
  structuredResponse:{kind:'number-fields',fields:[{label:`(a) Number of ${label(small)} coins (coins)`},{label:'(b) More money needed ($)',decimal:true}]},
  answer:JSON.stringify([String(smallCount),dollars(shortfall)]),
  hint:'Find both coin counts first. Then add up all the coins and compare with the price.',
  workedSteps:all.map(([text,equation])=>({text,equation})),explanation:all.map(s=>s.join(' ')).join(' ')};
}
