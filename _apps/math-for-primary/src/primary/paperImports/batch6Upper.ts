import {Rng,hashString} from '../../engine/random';
import {fraction,type Question} from '../generate';
import {BATCH6_UPPER_PARTS,type Batch6UpperPart} from './batch6UpperMeta';
export {BATCH6_UPPER_PARTS,BATCH6_UPPER_SOURCE,type Batch6UpperPart} from './batch6UpperMeta';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const mixed=(n:number,d:number)=>{const g=gcd(n,d),a=n/g,b=d/g,w=Math.floor(a/b),rem=a%b;return rem?`${w} ${rem}/${b}`:String(w);};
const cash=(c:number)=>(c/100).toFixed(2);
/** Each related pair shares its generated data when seed/index are equal. */
export function makeBatch6Upper(part:Batch6UpperPart,seed:number,index=0):Question {
 if(!BATCH6_UPPER_PARTS.some(p=>p.id===part))throw Error(`Unknown P6 response ${part}`);
 const group=part.replace(/[ab]$/,''),r=new Rng(hashString(`b6-upper:${group}:${seed}:${index}`));
 const q=(context:string[],prompt:string,answer:string|number,hint:string,steps:string[],extra:Partial<Question>={}):Question=>({key:`b6-upper:${part}:${seed}:${index}`,context,prompt,answer:String(answer),hint,explanation:steps.join(' '),workedSteps:steps.map(text=>({text})),...extra});
 if(part==='1a'){
  const first=r.int(20,70)*1000+r.int(1,5)*100,step=r.pick([125,150,200,300,350,400]),items=Array.from({length:6},(_,i)=>first+step*i),ans=items[4];
  return q([],`Find the missing number: ${items.slice(0,4).join(', ')}, __, ${items[5]}.`,ans,'Find the change between neighbouring terms.',[`The pattern increases by ${step} each time.`,`${items[3]} + ${step} = ${ans}.`]);
 }
 if(part==='1b'){
  const [a,b]=r.pick([[4,6],[6,8],[8,9],[4,7],[5,8]]),l=a*b/gcd(a,b);
  return q([],`Write the first two positive common multiples of ${a} and ${b}, in order.`,JSON.stringify([String(l),String(2*l)]),'List multiples of each number, then find the first two shared numbers.',[`The smallest positive common multiple is ${l}.`,`The next is ${2*l}.`],{structuredResponse:{kind:'number-pair',firstLabel:'First multiple',secondLabel:'Second multiple'}});
 }
 if(part==='2'){
  const [d1,d2]=r.pick([[3,4],[4,5],[5,6],[4,7]]),drawnWhole=r.int(5,8),first=r.int(1,d1-1),neededWhole=r.int(1,2),needed=r.int(1,d2-1),whole=d1===4&&d2===5&&drawnWhole===5&&first===1&&neededWhole===1&&needed===2?6:drawnWhole,den=d1*d2/gcd(d1,d2),n=(whole-neededWhole)*den+first*den/d1-needed*den/d2;
  const ans=mixed(n,den);
  return q([`A tank holds ${whole} ${first}/${d1} l when full.`,`It needs ${neededWhole} ${needed}/${d2} l more water to fill it.`],'How much water was in the tank at first? Give a mixed number in simplest form.',ans,'Subtract the amount needed from the capacity.',[`${whole} ${first}/${d1} − ${neededWhole} ${needed}/${d2} = ${ans} l.`],{unit:'l',requireMixed:true,requireSimplified:true});
 }
 if(part==='3'){
  const d=r.pick([7,8,9,11]),n=r.int(2,d-1),one=r.int(9,22),given=n*one,answer=d*one;
  return q([],`${n}/${d} of a number is ${given}. What is the number?`,answer,'Find one equal part, then find all the parts.',[`${given} ÷ ${n} = ${one}.`,`${one} × ${d} = ${answer}.`]);
 }
 if(part==='4'){
  const d=r.pick([5,7,8,9]),n=r.int(1,d-2),den=r.pick([3,4,5]),count=r.pick([2,3]),ans=fraction(d-n,d*den*count);
  return q([`A pupil spent ${n}/${d} of her money on a laptop.`,`She spent 1/${den} of the remaining money on ${count} identical headphones.`],'What fraction of her original money was spent on each headphone?',ans,'Find the remaining fraction, then the fraction spent on all headphones, and share equally.',[`Remaining fraction: ${d-n}/${d}.`,`${d-n}/${d} × 1/${den} ÷ ${count} = ${ans}.`],{requireSimplified:true});
 }
 if(part==='5'){
  const moved=r.int(20,80),end=r.int(3,20)*2,start=end+2*moved;
  return q([`Box A had ${start} more beads than Box B.`,`After some beads were moved from A to B, A had ${end} more beads than B.`],'How many beads were moved?',moved,'Moving one bead reduces the difference by two.',[`The difference fell by ${start-end}.`,`${start-end} ÷ 2 = ${moved}.`],{unit:'beads'});
 }
 if(part==='6'){
  const divisor=r.int(6,14),a=r.pick([4,5,7]),b=r.pick([3,6,8].filter(v=>gcd(a,v)===1)),choc=divisor*a,sweets=divisor*b;
  return q([`A pupil packs ${choc} chocolates and ${sweets} sweets into as many identical gift packs as possible.`,`Each pack has the same number of each item and none are left over.`],'How many chocolates are in each pack?',a,'Find the greatest number of identical packs first.',[`The greatest common factor of ${choc} and ${sweets} is ${divisor}.`,`${choc} ÷ ${divisor} = ${a}.`],{unit:'chocolates'});
 }
 if(group==='7'){
  const d1=r.pick([5,6,8,10]),d2=r.pick([2,3,4,5].filter(x=>x!==d1)),bag=r.int(1,d2-1),whole=r.int(4,7),den=d1*d2/gcd(d1,d2),bagUnits=bag*den/d2,rem=r.pick(Array.from({length:d1-1},(_,i)=>i+1).filter(v=>((whole*d1+v)*den/d1)%bagUnits!==0)),total=(whole*d1+rem)*den/d1,count=Math.floor(total/bagUnits),left=total-count*bagUnits,context=[`A cook has ${whole} ${rem}/${d1} kg of minced chicken.`,`Each small bag holds ${bag}/${d2} kg.`];
  if(part==='7a')return q(context,'What is the greatest number of complete bags?',count,'Divide the total mass by the mass per bag; count only complete bags.',[`${fraction(total,den)} ÷ ${bag}/${d2} fills ${count} complete bags, with ${fraction(left,den)} kg left.`],{unit:'bags'});
  return q(context,'What mass remains unpacked? Give your answer in kilograms.',fraction(left,den),'After filling the maximum number of bags, subtract their combined mass.',[`${fraction(total,den)} − ${count} × ${bag}/${d2} = ${fraction(left,den)} kg.`],{unit:'kg',requireSimplified:true});
 }
 if(group==='8'){
  const d=r.pick([24,28,32,35,40]),period=r.pick([5,6,7,8]),days=r.int(10,15),drawnOne=r.int(12,30),one=d===28&&period===8&&days===15&&drawnOne===26?27:drawnOne,saved=one*(d-days),spent=fraction(period,d),context=[`A pupil saved $${saved} of an allowance.`,`The remaining allowance was spent equally over ${days} days.`,`In ${period} days, the pupil spent ${spent} of the allowance.`];
  if(part==='8a')return q(context,'What fraction of the allowance was spent each day?',fraction(1,d),'Divide the stated fraction by the number of days.',[`${spent} ÷ ${period} = ${fraction(1,d)}.`],{requireSimplified:true});
  return q(context,'How much was the allowance?',(one*d).toFixed(2),'Find the fraction saved, then use the saved amount to find the whole.',[`The fraction saved is ${d-days}/${d}.`,`$${saved} ÷ ${d-days} × ${d} = $${(one*d).toFixed(2)}.`],{unit:'dollars'});
 }
 if(part==='9'){
  const [n,d]=r.pick([[2,3],[2,5],[3,4],[3,5]]),round=r.int(2,5),extra=r.int(2,5),star=round+extra,drawnGroups=r.int(14,35),groups=n===3&&d===5&&round===3&&extra===4&&drawnGroups===29?30:drawnGroups,value=groups*(d*round+n*star),ans=groups*(d+n);
  return q([`A round balloon costs $${round}. A star balloon costs $${extra} more.`,`The number of star balloons sold was ${n}/${d} of the number of round balloons sold.`,`The total collected was $${value}.`],'How many balloons were sold altogether?',ans,'Use one group of round and star balloons in the stated ratio.',[`One group has ${d} round and ${n} star balloons and costs $${d*round+n*star}.`,`There were ${value} ÷ ${d*round+n*star} = ${groups} groups.`,`${groups} × ${d+n} = ${ans} balloons.`],{unit:'balloons'});
 }
 if(group==='10'){
  const weeks=r.int(13,19),weekly=2,period=r.pick([4,5]),mother=Math.floor(weeks/period),drawnFives=r.int(5,weeks*2-5),fives=weeks===17&&period===4&&drawnFives===21?20:drawnFives,total=weeks*weekly+mother,value=mother*10+fives*5+(weeks*weekly-fives)*2,context=[`Jia puts ${weekly} notes into a box each week. Each is a $2 or $5 note.`,`Her mother adds one $10 note every ${period} weeks.`,`After ${weeks} weeks, the notes total $${value}.`];
  if(part==='10a')return q(context,'How many notes are in the box?',total,'Count the weekly notes and the mother’s completed intervals.',[`${weeks} × ${weekly} + ${mother} = ${total} notes.`],{unit:'notes'});
  return q(context,'How many of the notes are $5 notes?',fives,'Remove the $10 notes. Compare the remaining value with all $2 notes.',[`The mother added ${mother} notes worth $${mother*10}.`,`If all ${weeks*weekly} other notes were $2, they would be worth $${weeks*weekly*2}.`,`($${value} − $${mother*10} − $${weeks*weekly*2}) ÷ $3 = ${fives}.`],{unit:'notes'});
 }
 const tartCount=r.pick([4,6,8]),cakeCount=r.pick([6,8,10].filter(n=>n>tartCount)),tartPrice=r.int(5,9)*100+50,cakePrice=r.int(2,4)*100+50,common=tartCount*cakeCount/gcd(tartCount,cakeCount),drawnCopies=r.int(2,5),copies=tartCount===6&&cakeCount===8&&tartPrice===550&&cakePrice===350&&drawnCopies===2?3:drawnCopies,items=common*copies,tartBoxes=items/tartCount,extra=(items*(tartPrice-cakePrice))/100,context=[`A box of ${tartCount} tarts costs $${cash(tartCount*tartPrice)}.`,`A box of ${cakeCount} cupcakes costs $${cash(cakeCount*cakePrice)}.`];
 if(part==='11a'){
  context.push(`A shopper buys equal numbers of tarts and cupcakes and spends $${extra} more on tarts.`);
  return q(context,'How many boxes of tarts did the shopper buy?',tartBoxes,'Find the price of each item and compare equal numbers.',[`Each tart costs $${cash(tartPrice)}; each cupcake costs $${cash(cakePrice)}.`,`$${extra} ÷ $${cash(tartPrice-cakePrice)} = ${items} of each item.`,`${items} ÷ ${tartCount} = ${tartBoxes} boxes.`],{unit:'boxes'});
 }
 const delta=r.int(4,12),drawnCaleb=r.int(4,10),caleb=tartCount===6&&cakeCount===8&&tartPrice===550&&cakePrice===350&&delta===12&&drawnCaleb===8?9:drawnCaleb,dan=caleb+delta;
 context.push(`Dan buys ${dan} boxes of cupcakes and Caleb buys ${caleb} boxes of cupcakes.`,`The total number of boxes each buys is the same.`);
 const ans=delta*(cakeCount-tartCount);
 return q(context,`How many more tarts and cupcakes in total does Dan buy than Caleb?`,Math.abs(ans),'Match the total boxes: every extra cupcake box replaces a tart box.',[`Dan buys ${delta} more cupcake boxes and ${delta} fewer tart boxes.`,`${delta} × (${cakeCount} − ${tartCount}) = ${ans} items.`],{unit:'items'});
}
