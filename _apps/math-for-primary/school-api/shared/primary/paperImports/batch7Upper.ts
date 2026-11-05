import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH7_UPPER_PARTS} from './batch7UpperMeta';
export {BATCH7_UPPER_PARTS} from './batch7UpperMeta';
/** Original configurations informed by unreviewed local OCR, not source coverage claims. */
export function makeBatch7Upper(part:string,seed:number,index=0):Question{
 if(!BATCH7_UPPER_PARTS.some(p=>p.id===part))throw Error(`Unknown upper task: ${part}`);
 const r=new Rng(hashString(`batch7-upper:${part}:${seed}:${index}`));
 const make=(context:string[],prompt:string,answer:number,unit:string,hint:string,steps:string[]):Question=>({key:`batch7-upper:${part}:${seed}:${index}`,context,prompt,answer:unit==='dollars'?answer.toFixed(2):String(Number(answer.toFixed(4))),unit,hint,explanation:steps.join(' '),workedSteps:steps.map(text=>({text}))});
 if(part==='remaining-percent'){
  const total=r.pick([40,80,100,200]),pct=r.pick([20,30,40,45,60,75]),used=total*pct/100,left=total-used;
  return make([`A box contains ${total} buttons. ${used} are red; the rest are blue.`],'What percentage of the buttons are blue?',100-pct,'%','Find the number of blue buttons, then compare it with the total.',[`${total} − ${used} = ${left} blue buttons.`,`${left} ÷ ${total} × 100% = ${100-pct}%.`]);
 }
 if(part==='mass-share'){
  const packs=r.pick([3,4,5]),drawnEach=r.int(8,25)*10,used=r.int(15,70)*10,each=packs===3&&used===450&&drawnEach===190?200:drawnEach,left=each*packs,total=left+used;
  return make([`There are ${(total/1000).toFixed(2)} kg of flour. A baker uses ${used} g.`,`The rest is shared equally among ${packs} containers.`],'What mass is in each container?',each/1000,'kg','Convert kilograms to grams before subtracting and sharing.',[`${(total/1000).toFixed(2)} kg = ${total} g.`,`${total} − ${used} = ${left} g.`,`${left} ÷ ${packs} = ${each} g = ${each/1000} kg.`]);
 }
 if(part==='rate-minute'){
  const rate=r.int(3,18),minutes=r.pick([2,3,4,5]);
  return make([`A tap drips ${rate} ml of water every second at a steady rate.`],`How much water drips in ${minutes} minutes?`,rate*minutes*60,'ml','Change minutes to seconds first.',[`${minutes} minutes = ${minutes*60} seconds.`,`${rate} × ${minutes*60} = ${rate*minutes*60} ml.`]);
 }
 if(part==='ratio-transfer'){
  const a=r.pick([1,2,3]),b=a+r.pick([2,4,6]),one=r.int(5,25)*2,first=a*one,second=b*one,transfer=(second-first)/2;
  return make([`Mira and Ken have stickers in the ratio ${a} : ${b}.`,`Ken has ${second} stickers.`],'How many stickers must Ken give Mira so they have the same number?',transfer,'stickers','Find Mira’s number, then halve the difference.',[`One ratio unit is ${second} ÷ ${b} = ${one}.`,`Mira has ${a} × ${one} = ${first} stickers.`,`Half the difference is (${second} − ${first}) ÷ 2 = ${transfer}.`]);
 }
 if(part==='sharing-cost'){
  const initial=r.pick([6,8,10]),drop=r.pick([2,3]),remaining=initial-drop,unit=r.int(5,22)*remaining,total=unit*initial,extra=total/remaining-unit;
  return make([`A bill is to be shared equally among ${initial} friends.`,`When ${drop} friends cannot pay, each remaining friend pays $${extra} more.`],'How much was each original share?',unit,'dollars','The total bill is unchanged. Compare the two equal shares.',[`The extra cost per person corresponds to the shares of ${drop} friends.`,`Original share = $${extra} × ${remaining} ÷ ${drop} = $${unit}.`]);
 }
 if(part==='recipe-capacity'){
  const big=r.pick([24,32,36,40]),small=big*r.pick([2,3]),used=big*r.pick([1/4,1/2,3/4]);
  return make([`A supply of ingredients can make ${big} large rolls or ${small} small rolls.`,`A baker makes ${used} large rolls first.`],'How many small rolls can the remaining ingredients make?',small*(big-used)/big,'rolls','Find the fraction of the ingredients left.',[`The fraction left is (${big} − ${used}) ÷ ${big}.`,`${small} × ${big-used} ÷ ${big} = ${small*(big-used)/big} small rolls.`]);
 }
 if(part==='average-added'){
  const drawnN=r.int(3,9),avg=r.int(10,24),increase=r.int(2,8),n=drawnN===4&&avg===12&&increase===6?5:drawnN,added=avg+increase*(n+1),newAvg=avg+increase;
  return make([`A set of books has an average price of $${avg}.`,`A book costing $${added} is added, and the average becomes $${newAvg}.`],'How many books were in the set at first?',n,'books','The extra amount above the old average is shared across the new total.',[`The new book is $${added-avg} above the old average.`,`There are ${added-avg} ÷ ${increase} = ${n+1} books after adding it.`,`${n+1} − 1 = ${n} books at first.`]);
 }
 if(part==='successive-percent'){
  const total=r.int(10,40)*100,p=r.pick([20,25,40,50]),q=r.pick([20,25,40,50]),after=total*(100-p)/100,left=after*(100-q)/100;
  return make([`Ari has $${total}. Ari spends ${p}% of it on a desk, then ${q}% of the remainder on a chair.`],'How much money is left?',left,'dollars','Apply the second percentage to the remainder.',[`After the first purchase: $${total} × ${100-p}% = $${after}.`,`After the second: $${after} × ${100-q}% = $${left}.`]);
 }
 if(part==='percent-growth'){
  const initial=r.int(4,20)*20,pct=r.pick([10,20,25,50,75]),newCount=initial*(100+pct)/100;
  return make([`A shop sold ${initial} plants last week and ${newCount} plants this week.`],'What was the percentage increase?',pct,'%','Divide the increase by last week’s number.',[`The increase is ${newCount} − ${initial} = ${newCount-initial}.`,`${newCount-initial} ÷ ${initial} × 100% = ${pct}%.`]);
 }
 if(part==='average-missing'){
  const avg=r.int(20,50),a=avg-r.int(3,10),b=avg+r.int(1,9),c=3*avg-a-b;
  return make([`The average score for three games is ${avg} points.`,`The first two scores are ${a} and ${b} points.`],'What was the third score?',c,'points','Use average × number of games to find the total.',[`The total score is ${avg} × 3 = ${3*avg}.`,`${3*avg} − ${a} − ${b} = ${c} points.`]);
 }
 if(part==='two-stage-ratio'){
  const one=r.pick([5,...Array.from({length:16},(_,i)=>i+7)]),shortest=3*one;
  return make([`A ribbon is cut into two pieces in the ratio 2 : 3.`,`The longer piece is then cut in the ratio 1 : 3.`,`The shortest of the three pieces is ${shortest} cm.`],'What was the length of the original ribbon?',one*20,'cm','Express all three final pieces in common ratio units.',[`The final pieces are in the ratio 8 : 3 : 9.`,`Three units are ${shortest} cm, so one unit is ${one} cm.`,`The original ribbon is 20 units: ${one*20} cm.`]);
 }
 const speed=r.int(12,28)*4,diff=r.pick([8,12,16]),slow=speed-diff,distance=(speed+slow)*3/4;
 return make([`Two cyclists start ${distance} km apart and ride towards each other.`,`The slower cyclist travels ${diff} km/h slower. They meet after 45 minutes.`],'What is the faster cyclist’s speed?',speed,'km/h','Find their combined speed, then use the difference.',[`45 minutes is 3/4 hour. Combined speed = ${distance} ÷ 3/4 = ${speed+slow} km/h.`,`Faster speed = (${speed+slow} + ${diff}) ÷ 2 = ${speed} km/h.`]);
}
