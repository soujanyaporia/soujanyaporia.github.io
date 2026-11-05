import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH12_MIDDLE_PARTS} from './batch12MiddleMeta';
export {BATCH12_MIDDLE_PARTS,type Batch12MiddlePart} from './batch12MiddleMeta';
type Step=[text:string,equation?:string];
const dollars=(cents:number)=>(cents/100).toFixed(2);
const decimal=(scaled:number,scale=10)=>String(Number((scaled/scale).toFixed(3)));
const clock=(hour:number)=>`${String(hour).padStart(2,'0')}:00`;
/** Eight complete linked tasks, with all shared givens visible before the two response parts. */
export function makeBatch12Middle(part:string,seed:number,index=0):Question{
 if(!BATCH12_MIDDLE_PARTS.some(p=>p.id===part))throw Error(`Unknown batch12 middle pattern ${part}`);
 const r=new Rng(hashString(`batch12-middle-original-v1:${part}:${seed}:${index}`));
 const pair=(context:string[],prompt:string,answers:[string,string],labels:[string,string],hint:string,steps:Step[],useDecimal=true):Question=>({
  key:`batch12-middle-${part}:${seed}:${index}`,context,prompt,answer:JSON.stringify(answers),structuredResponse:{kind:'number-pair',firstLabel:labels[0],secondLabel:labels[1],...(useDecimal?{decimal:true}:{})},hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),
 });
 if(part==='coin-shortfall'){
  const fifty=r.int(2,7),twenty=r.int(3,9),have=fifty*50+twenty*20,short=r.int(55,195),price=have+short;
  return pair([`Nora has ${fifty} fifty-cent coins and ${twenty} twenty-cent coins. She has no other money.`,`She needs another $${dollars(short)} to buy a storybook.`],
   '(a) How much money does Nora have? (b) How much does the storybook cost?',
   [dollars(have),dollars(price)],['(a) Money Nora has ($)','(b) Storybook price ($)'],
   'Count both kinds of coins. A shortfall must be added to the money she already has.',
   [['(a) Count the two coin values in cents.',`${fifty} × 50 + ${twenty} × 20 = ${have} cents = $${dollars(have)}`],['(b) Add the missing money to recover the price.',`$${dollars(have)} + $${dollars(short)} = $${dollars(price)}`]]);
 }
 if(part==='compare-shortfall'){
  const file=r.int(135,285),pen=r.int(45,95),total=file+pen,coins=r.int(1,Math.min(3,Math.floor((total-1)/100))),cash=coins*100,difference=file-pen,short=total-cash;
  return pair([`A folder costs $${dollars(file)}. A pen costs ${pen} cents.`,`Ben has ${coins} $1 ${coins===1?'coin':'coins'} and no other money. He wants to buy one folder and one pen.`],
   '(a) How much more does the folder cost than the pen? (b) How much more money does Ben need to buy both?',
   [dollars(difference),dollars(short)],['(a) Price difference ($)','(b) Extra money needed ($)'],
   'The difference compares two prices. The shortfall compares their combined price with Ben’s money.',
   [['Write the pen price in dollars.',`${pen} cents = $${dollars(pen)}`],['(a) Compare the two prices.',`$${dollars(file)} − $${dollars(pen)} = $${dollars(difference)}`],['(b) Find the cost of buying both items.',`$${dollars(file)} + $${dollars(pen)} = $${dollars(total)}`],['Subtract the money Ben has.',`$${dollars(total)} − $${dollars(cash)} = $${dollars(short)}`]]);
 }
 if(part==='compound-mass-share'){
  const count=r.int(4,8),each=r.int(125,295),box=r.int(85,245),contents=count*each,total=contents+box,kg=Math.floor(total/1000),grams=total%1000;
  return pair([`A box containing ${count} identical metal parts has a total mass of ${kg} kg ${grams} g.`,`The empty box has a mass of ${box} g.`],
   '(a) What is the total mass of the metal parts? (b) What is the mass of one metal part? Give both answers in grams.',
   [String(contents),String(each)],['(a) All metal parts (g)','(b) One metal part (g)'],
   'Change the total to grams before removing the box. Then share the remaining mass equally.',
   [['Express the combined mass in grams.',`${kg} kg ${grams} g = ${total} g`],['(a) Remove the empty box.',`${total} − ${box} = ${contents} g`],['(b) Share the contents mass between identical parts.',`${contents} ÷ ${count} = ${each} g`]],false);
 }
 if(part==='working-hours'){
  const start=r.int(7,10),daily=r.int(6,9),finish=start+daily,days=r.pick([4,5,6]),weeks=r.int(3,6),total=daily*days*weeks;
  return pair([`Asha works from ${clock(start)} to ${clock(finish)} on each working day. This entire interval is working time.`,`She works ${days} days each week and follows this schedule for ${weeks} weeks.`],
   '(a) How many hours does Asha work each day? (b) How many hours does she work during all these weeks?',
   [String(daily),String(total)],['(a) Hours each working day','(b) Hours over all the weeks'],
   'Find the length of one working day. Then count the working days in all the weeks.',
   [['(a) Find the time from start to finish.',`${clock(start)} to ${clock(finish)} = ${daily} hours`],['Count the working days.',`${days} × ${weeks} = ${days*weeks} days`],['(b) Repeat the daily hours over those days.',`${days*weeks} × ${daily} = ${total} hours`]],false);
 }
 if(part==='shared-mass-totals'){
  const first=r.int(151,295),common=r.int(83,185),last=r.int(116,247),pair1=first+common,pair2=common+last,total=first+common+last;
  return pair([`The combined mass of Case A and Case B is ${decimal(pair1)} kg.`,`The combined mass of Case B and Case C is ${decimal(pair2)} kg.`,`The combined mass of all three cases is ${decimal(total)} kg.`],
   '(a) What is the mass of Case B? (b) What is the mass of Case A?',
   [decimal(common),decimal(first)],['(a) Case B mass (kg)','(b) Case A mass (kg)'],
   'Adding the pair totals counts Case B twice. Compare this sum with the total of all three cases.',
   [['Add the two pair totals.',`${decimal(pair1)} + ${decimal(pair2)} = ${decimal(pair1+pair2)} kg`],['(a) Remove one copy of each of the three cases.',`${decimal(pair1+pair2)} − ${decimal(total)} = ${decimal(common)} kg`],['(b) Remove Case B from its pair with Case A.',`${decimal(pair1)} − ${decimal(common)} = ${decimal(first)} kg`]]);
 }
 if(part==='ribbon-change'){
  const initialMultiple=r.pick([2,3]),changeFactor=r.pick([2,3,4]),finalMultiple=initialMultiple*changeFactor,finalShort=r.int(55,235),originalShort=changeFactor*finalShort,long=initialMultiple*originalShort,removed=originalShort-finalShort,total=long+originalShort;
  return pair([`At first, Ribbon A was ${initialMultiple} times as long as Ribbon B.`,`${decimal(removed)} cm was cut from Ribbon B. Ribbon A was not changed. Ribbon A is now ${finalMultiple} times as long as Ribbon B.`],
   '(a) How long is Ribbon B now? (b) What was the total length of both ribbons at first?',
   [decimal(finalShort),decimal(total)],['(a) Ribbon B now (cm)','(b) Original combined length (cm)'],
   'Compare both descriptions of unchanged Ribbon A using equal parts of the final Ribbon B.',
   [['Relate the original and final length of Ribbon B.',`${finalMultiple} ÷ ${initialMultiple} = ${changeFactor}; the original Ribbon B had ${changeFactor} final-length parts.`],['(a) The cut piece accounts for the extra parts.',`${decimal(removed)} ÷ ${changeFactor-1} = ${decimal(finalShort)} cm`],['Recover the original Ribbon B.',`${decimal(finalShort)} + ${decimal(removed)} = ${decimal(originalShort)} cm`],['(b) Combine the original ribbon lengths.',`${decimal(originalShort)} × (${initialMultiple} + 1) = ${decimal(total)} cm`]]);
 }
 if(part==='bakery-bills'){
  const group=r.pick([3,4,5]),extraGroups=r.pick([1,2]),unit=r.int(55,145),cake=r.int(465,985),first=cake+group*unit,second=cake+group*(1+extraGroups)*unit,groupPrice=group*unit,twocakes=2*cake;
  return pair([`One cake and ${group} identical buns cost $${dollars(first)}.`,`One cake of the same kind and ${group*(1+extraGroups)} of these buns cost $${dollars(second)}. All cakes have the same price and all buns have the same price.`],
   `(a) How much do ${group} buns cost? (b) How much do two cakes cost?`,
   [dollars(groupPrice),dollars(twocakes)],['(a) Buns in the smaller group ($)','(b) Two cakes ($)'],
   'Both bills include one cake. The difference pays only for the extra buns.',
   [['Cancel the common cake and compare the extra buns.',`${group*(1+extraGroups)} − ${group} = ${group*extraGroups} extra buns; $${dollars(second)} − $${dollars(first)} = $${dollars(groupPrice*extraGroups)}`],['(a) Find the price of the smaller bun group.',`$${dollars(groupPrice*extraGroups)} ÷ ${extraGroups} = $${dollars(groupPrice)}`],['Remove that group from the first bill.',`$${dollars(first)} − $${dollars(groupPrice)} = $${dollars(cake)} per cake`],['(b) Find the price of two cakes.',`2 × $${dollars(cake)} = $${dollars(twocakes)}`]]);
 }
 if(part==='fraction-repack'){
  const denominator=r.pick([3,4,5]),used=denominator-1,packets=r.pick([3,4,6]),eachThousand=r.pick(Array.from({length:69},(_,i)=>(i+21)*5).filter(value=>value*packets*denominator%10===0)),remaining=eachThousand*packets,total=remaining*denominator;
  // Initial mass is a two-place decimal; each packet may require three places.
  const initial=decimal(total,1000),left=decimal(remaining,1000),each=decimal(eachThousand,1000);
  return pair([`A baker has ${initial} kg of flour and uses ${used}/${denominator} of it.`,`The baker puts all the remaining flour into ${packets} packets of equal mass.`],
   '(a) What mass of flour remains after baking? (b) What is the mass of flour in each packet? Give both answers in kilograms.',
   [left,each],['(a) Flour remaining (kg)','(b) Flour per packet (kg)'],
   'Find the fraction left. Use this remaining mass, rather than the original mass, when filling the packets.',
   [['Find the fraction left.',`1 − ${used}/${denominator} = 1/${denominator}`],['(a) Find the remaining flour.',`${initial} ÷ ${denominator} = ${left} kg`],['(b) Share this flour equally.',`${left} ÷ ${packets} = ${each} kg`]]);
 }
 throw Error(`Unhandled batch12 middle pattern ${part}`);
}
