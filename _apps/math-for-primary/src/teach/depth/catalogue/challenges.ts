import type {Rng} from '../../../engine/random';
import {fmt,rngFor} from '../../gen';
import {numberValue} from '../../../primary/generate';
import type {Item,Stage} from '../../model';

/**
 * Challenge problems: the step beyond the lesson.
 *
 * The lesson and its learning check practise one idea at a time. These problems combine it with
 * earlier ideas and need more than one step, in the way Singapore problem solving is taught: draw
 * the bars, find a unit, work backwards, keep what does not change constant, make a supposition.
 * Each problem names its strategy, offers staged clues and a complete worked solution, and answers
 * the classic trap — the amount after a transfer instead of before, a percentage of the whole
 * instead of the remainder — with an explanation rather than a bare "try again".
 *
 * Every answer is computed from the same numbers that build the prompt and the solution, so the
 * three always agree. Difficulty follows the year: Foundation paths draw one year down.
 */
export interface ChallengeContext {level:number;foundation:boolean;objective:string}
interface Ctx extends ChallengeContext {eff:number}
interface Problem {name:string;prompt:string;answer:string;unit?:string;strategy:string;hints:string[];steps:string[];check:string;wrong?:Record<string,string>;choices?:string[]}
type Make=(r:Rng,c:Ctx)=>Problem;

const NAMES=['Ali','Mei','Siti','Ravi','Wei','Hana','Priya','Ben','Kumar','Aisha','Jun','Farah','Nadia','Daniel'];
function people(r:Rng,n:number){const out:string[]=[];while(out.length<n){const x=r.pick(NAMES);if(!out.includes(x))out.push(x);}return out;}
const cash=(n:number)=>{const c=Math.round(n*100);return c%100===0?`$${c/100}`:`$${(c/100).toFixed(2)}`;};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
const times=(k:number)=>k===2?'twice':k===3?'three times':k===4?'four times':`${k} times`;
const clock12=(m:number)=>{const h=Math.floor(m/60)%24,mm=m%60;return `${h%12||12}:${String(mm).padStart(2,'0')} ${h<12?'am':'pm'}`;};
const clock24=(m:number)=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const units=(n:number)=>`${n} unit${n===1?'':'s'}`;
/** Feedback for the answers a pupil is likely to give, never for the correct one. */
function trap(answer:string,entries:[number|string,string][]):Record<string,string>{
 const out:Record<string,string>={},own=answer.replace(/\s+/g,''),value=numberValue(answer),taken:number[]=[];
 for(const [v,why] of entries){
  if(typeof v==='number'&&(!Number.isFinite(v)||v<0))continue;
  const k=typeof v==='number'?fmt(Math.round(v*1e6)/1e6):v,kv=numberValue(k);
  // A trap equal in value to the answer (2/4 against 1/2) would mark a right answer wrong, and two
  // traps of equal value (2/6 and 4/12) cannot be told apart, so the pupil would hear the wrong reason.
  if(k.replace(/\s+/g,'')===own||out[k])continue;
  if(kv!==null&&((value!==null&&Math.abs(value-kv)<1e-9)||taken.some(t=>Math.abs(t-kv)<1e-9)))continue;
  out[k]=why;if(kv!==null)taken.push(kv);
 }
 return out;
}

// ------------------------------------------------------------- whole numbers

const birdsTwoChanges:Make=r=>{
 const start=r.int(11,18),away=r.int(3,start-4),back=r.int(2,Math.min(9,20-(start-away))),mid=start-away,ans=mid+back;
 return {name:'two-changes',prompt:`There were ${start} birds on a tree. ${away} birds flew away. Then ${back} more birds came. How many birds are on the tree now?`,answer:fmt(ans),strategy:'Act it out, one change at a time',
  hints:['Two changes happen. Deal with them in the order they happen.',`First find how many birds were left after ${away} flew away.`,`${start} − ${away} = ${mid}. Now add the birds that came.`],
  steps:[`Start with ${start} birds.`,`${away} fly away: ${start} − ${away} = ${mid}.`,`${back} more come: ${mid} + ${back} = ${ans}.`,`There are ${ans} birds on the tree now.`],
  check:`Undo both changes: ${ans} − ${back} + ${away} = ${start}, the number we started with.`,
  wrong:trap(fmt(ans),[[mid,'That is how many were left before the new birds came. Add the birds that came.'],[mid-back,'The second group came to the tree, so add them rather than take them away.'],[start+away+back,'The first group flew away, so take them away.']])};
};
const moreThenTotal:Make=(r,c)=>{
 const [x,y]=people(r,2),a=c.eff<=1?r.int(5,9):r.int(24,180),more=c.eff<=1?r.int(2,6):r.int(12,90),b=a+more,ans=a+b;
 return {name:'more-then-total',prompt:`${x} has ${a} stickers. ${y} has ${more} more stickers than ${x}. How many stickers do they have altogether?`,answer:fmt(ans),strategy:'Draw a bar for each person',
  hints:[`Before you can find the total, you need to know how many ${y} has.`,`${y} has the same as ${x} and ${more} more.`,`${y} has ${a} + ${more} = ${b}. Now join both amounts.`],
  steps:[`${y}: ${a} + ${more} = ${b} stickers.`,`Altogether: ${a} + ${b} = ${ans} stickers.`],
  check:`${ans} − ${a} = ${b}, and ${b} is ${more} more than ${a}.`,
  wrong:trap(fmt(ans),[[b,`That is how many ${y} has. The question asks for both of them together.`],[a+more,`That adds the difference to ${x}'s stickers. Find ${y}'s stickers, then add both amounts.`],[2*a,`${y} has more than ${x}, so their amounts are not equal.`]])};
};
const digitPuzzle:Make=r=>{
 const o=r.int(1,4),d=r.int(1,4),t=o+d,sum=t+o,ans=10*t+o;
 const pairs=Array.from({length:sum+1},(_,i)=>[sum-i,i]).filter(([p,q])=>p>=1&&p<=9&&q<=9).map(([p,q])=>`${p} and ${q}`).join(', ');
 return {name:'digit-puzzle',prompt:`I am a 2-digit number. My tens digit is ${d} more than my ones digit. My two digits add up to ${sum}. What number am I?`,answer:fmt(ans),strategy:'List the possibilities, then check each condition',
  hints:[`List pairs of digits that add up to ${sum}.`,`Now look for the pair where the tens digit is ${d} more than the ones digit.`,`Try a ones digit of ${o}.`],
  steps:[`Pairs of digits that add up to ${sum}: ${pairs}.`,`Only tens ${t} and ones ${o} also have the tens digit ${d} more: ${t} − ${o} = ${d}.`,`The number is ${ans}.`],
  check:`${t} + ${o} = ${sum}, and ${t} is ${d} more than ${o}.`,
  wrong:trap(fmt(ans),[[10*o+t,'That swaps the digits. The tens digit is the larger one.']])};
};
const workBackwards:Make=(r,c)=>{
 const [x]=people(r,1),big=c.eff>=3;
 const start=big?r.int(20,60)*100+r.int(0,9)*10:r.int(15,60)*10,spent=big?r.int(8,start/100-6)*100:r.int(4,start/10-5)*10,got=big?r.int(2,9)*100:r.int(1,6)*10,end=start-spent+got;
 return {name:'work-backwards',prompt:`${x} spent ${cash(spent)} on a bicycle. Then ${x} was given ${cash(got)} as a birthday present, and now has ${cash(end)}. How much money did ${x} have at first?`,answer:fmt(start),strategy:'Work backwards from the end',
  hints:['Start from the money at the end and undo each step, last step first.',`Undo the present: it added ${cash(got)}, so take ${cash(got)} away.`,`${cash(end)} − ${cash(got)} = ${cash(end-got)}. Now undo the spending.`],
  steps:[`Now: ${cash(end)}.`,`Before the present: ${cash(end)} − ${cash(got)} = ${cash(end-got)}.`,`Before buying the bicycle: ${cash(end-got)} + ${cash(spent)} = ${cash(start)}.`,`${x} had ${cash(start)} at first.`],
  check:`Go forwards: ${cash(start)} − ${cash(spent)} + ${cash(got)} = ${cash(end)}.`,
  wrong:trap(fmt(start),[[end+got-spent,'Undo each step with the opposite operation: the present was added, so take it away; the spending was taken away, so add it back.'],[end-got-spent,'Spending took money away, so to undo it, add the money back.'],[end+got+spent,'The present added money. To undo it, take it away.']])};
};
const chainComparison:Make=r=>{
 const A=r.int(12,35)*100+r.int(0,9)*10,fewer=r.int(20,90)*10,more=r.int(15,80)*10,B=A+fewer,C=B+more,ans=A+C;
 return {name:'chain-comparison',prompt:`School A collected ${A} cans for recycling. That was ${fewer} fewer cans than School B. School C collected ${more} more cans than School B. How many cans did Schools A and C collect altogether?`,answer:fmt(ans),strategy:'Draw comparison bars',
  hints:['Both other schools are compared with School B, so find School B first.',`"${fewer} fewer than School B" means School B collected ${fewer} more than School A.`,`School B: ${A} + ${fewer} = ${B}. Now find School C.`],
  steps:[`School B: ${A} + ${fewer} = ${B} cans.`,`School C: ${B} + ${more} = ${C} cans.`,`A and C together: ${A} + ${C} = ${ans} cans.`],
  check:`Work back: ${C} − ${more} − ${fewer} = ${A}.`,
  wrong:trap(fmt(ans),[[A+(A-fewer+more),'School A has fewer than School B, so find School B by adding, not subtracting.'],[A+B,'The question asks for Schools A and C, not A and B.'],[A+B+C,'Only Schools A and C are asked for.']])};
};
const largestEven:Make=(r,c)=>{
 const n=c.eff>=5?5:c.eff>=3?4:3;let digits:number[]=[];
 while(true){digits=[];while(digits.length<n){const d=r.int(0,9);if(!digits.includes(d))digits.push(d);}if(digits.some(d=>d%2===0)&&digits.some(d=>d%2===1)&&digits.some(d=>d>0))break;}
 const desc=[...digits].sort((a,b)=>b-a),evens=digits.filter(d=>d%2===0).sort((a,b)=>a-b),e=evens[0],rest=desc.filter(d=>d!==e),ans=Number([...rest,e].join(''));
 const descNum=Number(desc.join('')),biggestEven=evens.at(-1)!,alt=Number([...desc.filter(d=>d!==biggestEven),biggestEven].join(''));
 return {name:'largest-even',prompt:`Use each of the digits ${digits.join(', ')} exactly once to make the largest possible even number.`,answer:fmt(ans),strategy:'Meet the condition first, then make the rest as large as possible',
  hints:['An even number ends in 0, 2, 4, 6 or 8.','To make a number large, put the largest digits in the highest places.','Which even digit should go in the ones place so that the larger digits stay at the front?'],
  steps:[`The ones digit must be even: ${evens.join(', ')}.`,`Put the smallest even digit, ${e}, in the ones place, so the larger digits can go at the front.`,`Arrange the other digits from largest to smallest: ${rest.join(', ')}.`,`The number is ${ans}.`],
  check:`${ans} ends in ${e}, so it is even, and every larger arrangement either ends in an odd digit or uses a smaller digit at the front.`,
  wrong:trap(fmt(ans),[[descNum%2===1?descNum:-1,'That is the largest number, but it ends in an odd digit, so it is not even.'],[alt!==ans?alt:-1,`That is even, but putting ${biggestEven} at the end moves a larger digit out of the front. Use the smallest even digit at the end.`]])};
};
const roundingRange:Make=(r,c)=>{
 const unit=c.eff>=4?r.pick([10,100]):10,target=r.int(12,98)*unit,greatest=r.chance(.5),half=unit/2,ans=greatest?target+half-1:target-half;
 return {name:'rounding-range',prompt:`A whole number rounded to the nearest ${unit} is ${target}. What is the ${greatest?'greatest':'smallest'} the number could be?`,answer:fmt(ans),strategy:'Find the halfway points',
  hints:[`A number rounds to ${target} when it is closer to ${target} than to ${target-unit} or ${target+unit}.`,`The halfway points are ${target-half} and ${target+half}.`,'A number exactly halfway rounds up.'],
  steps:greatest?[`Halfway between ${target} and ${target+unit} is ${target+half}.`,`${target+half} rounds up to ${target+unit}, so it is too big.`,`The greatest whole number that rounds to ${target} is ${ans}.`]:[`Halfway between ${target-unit} and ${target} is ${target-half}.`,`A number exactly halfway rounds up, so ${target-half} rounds to ${target}.`,`The smallest whole number that rounds to ${target} is ${ans}.`],
  check:greatest?`${ans} rounds to ${target}; ${ans+1} rounds to ${target+unit}.`:`${ans} rounds to ${target}; ${ans-1} rounds to ${target-unit}.`,
  wrong:trap(fmt(ans),greatest?[[target+half,`A number exactly halfway rounds up, so ${target+half} rounds to ${target+unit}.`],[target+unit-1,`That is closer to ${target+unit}.`]]:[[target-half-1,`That rounds down to ${target-unit}.`],[target-half+1,'A smaller whole number also rounds to it.']])};
};
const patternTerm:Make=(r,c)=>{
 const a=r.int(3,15),d=r.int(3,9),n=c.eff>=4?r.int(15,30):r.int(8,12),ans=a+(n-1)*d,seq=[0,1,2,3].map(i=>a+i*d).join(', ');
 return {name:'pattern-term',prompt:`The pattern is ${seq}, … The same amount is added each time. What is the ${ordinal(n)} number in the pattern?`,answer:fmt(ans),strategy:'Find the rule, then count the jumps',
  hints:['How much is added each time?',`The ${ordinal(n)} number is ${n-1} jumps after the 1st number, not ${n}.`,`${n-1} jumps of ${d} is ${(n-1)*d}.`],
  steps:[`Each number is ${d} more than the one before.`,`From the 1st to the ${ordinal(n)} number there are ${n-1} jumps.`,`${a} + ${n-1} × ${d} = ${a} + ${(n-1)*d} = ${ans}.`],
  check:`Count on from the 4th number, ${a+3*d}: ${n-4} more jumps of ${d} reach ${ans}.`,
  wrong:trap(fmt(ans),[[a+n*d,`From the 1st to the ${ordinal(n)} number there are ${n-1} jumps, not ${n}.`],[n*d,'Start from the first number in the pattern, not from 0.']])};
};

// ------------------------------------------------------- multiply and divide

const bagsLessSome:Make=(r,c)=>{
 const bags=r.int(3,6),each=c.eff<=1?r.int(2,5):r.int(4,10),total=bags*each,rotten=r.int(2,Math.min(9,total-3)),ans=total-rotten;
 return {name:'groups-then-remove',prompt:`There are ${bags} bags with ${each} oranges in each bag. ${rotten} of the oranges are rotten and thrown away. How many good oranges are left?`,answer:fmt(ans),strategy:'Find the total first',
  hints:['How many oranges were there before any were thrown away?',`${bags} equal bags of ${each} is ${bags} × ${each}.`,`${bags} × ${each} = ${total}. Now take away the rotten ones.`],
  steps:[`Total: ${bags} × ${each} = ${total} oranges.`,`Take away the rotten ones: ${total} − ${rotten} = ${ans}.`,`${ans} good oranges are left.`],
  check:`${ans} + ${rotten} = ${total} = ${bags} × ${each}.`,
  wrong:trap(fmt(ans),[[total,'That counts every orange, including the rotten ones.'],[bags+each-rotten,`${bags} bags of ${each} means ${bags} equal groups, so multiply rather than add.`]])};
};
const roundUpRemainder:Make=r=>{
 const cap=r.int(4,8),full=r.int(4,9),extra=r.int(1,cap-1),people=cap*full+extra,ans=full+1;
 return {name:'remainder-round-up',prompt:`${people} pupils are going on a trip. Each van can carry ${cap} pupils. What is the smallest number of vans needed so that every pupil can go?`,answer:fmt(ans),strategy:'Decide what the remainder means',
  hints:[`Divide: how many vans of ${cap} can be filled completely?`,`${people} ÷ ${cap} = ${full} remainder ${extra}.`,`The ${extra} pupil${extra===1?'':'s'} left over still need${extra===1?'s':''} a van.`],
  steps:[`${people} ÷ ${cap} = ${full} remainder ${extra}.`,`${full} vans are full, and ${extra} pupil${extra===1?' is':'s are'} left.`,`One more van is needed: ${full} + 1 = ${ans} vans.`],
  check:`${full} vans carry only ${full*cap} pupils, fewer than ${people}; ${ans} vans carry up to ${ans*cap}.`,
  wrong:trap(fmt(ans),[[full,`That leaves ${extra} pupil${extra===1?'':'s'} behind. Every pupil must go, so the remainder needs a van too.`],[extra,'That is the number of pupils left over, not the number of vans.']])};
};
const bestBuy:Make=r=>{
 const pa=r.int(3,6),unitA=r.int(4,9),pb=pa+r.int(1,4),unitB=unitA-r.int(1,2),priceA=pa*unitA,priceB=pb*unitB,ans=unitA-unitB;
 return {name:'best-buy',prompt:`Shop A sells ${pa} pens for ${cash(priceA)}. Shop B sells ${pb} of the same pens for ${cash(priceB)}. How much cheaper is one pen at Shop B, in dollars?`,answer:fmt(ans),strategy:'Compare the price of one',
  hints:['The packs are different sizes, so compare the price of one pen at each shop.',`Shop A: ${cash(priceA)} ÷ ${pa}.`,`One pen at Shop A costs ${cash(unitA)}. Now find the price of one pen at Shop B.`],
  steps:[`Shop A: ${cash(priceA)} ÷ ${pa} = ${cash(unitA)} per pen.`,`Shop B: ${cash(priceB)} ÷ ${pb} = ${cash(unitB)} per pen.`,`Difference: ${cash(unitA)} − ${cash(unitB)} = ${cash(ans)}.`],
  check:`${pa} × ${cash(unitA)} = ${cash(priceA)}, and ${pb} × ${cash(unitB)} = ${cash(priceB)}.`,
  wrong:trap(fmt(ans),[[Math.abs(priceB-priceA),'That compares packs of different sizes. Compare the price of one pen.']])};
};
const packBoxes:Make=r=>{
 const trays=r.int(3,8),per=r.int(6,12),box=r.int(4,9);const total=trays*per,ans=Math.floor(total/box),left=total%box;
 return {name:'pack-boxes',prompt:`A baker makes ${trays} trays of muffins with ${per} muffins on each tray. She packs them into boxes of ${box}. How many boxes can she fill completely?`,answer:fmt(ans),strategy:'Find the total, then share it into groups',
  hints:['First find how many muffins there are altogether.',`${trays} × ${per} = ${total} muffins.`,`Now find how many groups of ${box} fit into ${total}.`],
  steps:[`Muffins: ${trays} × ${per} = ${total}.`,`Boxes: ${total} ÷ ${box} = ${ans}${left?` remainder ${left}`:''}.`,`She can fill ${ans} boxes completely${left?`, with ${left} muffin${left===1?'':'s'} left over`:''}.`],
  check:`${ans} × ${box}${left?` + ${left}`:''} = ${total}.`,
  wrong:trap(fmt(ans),[[left?ans+1:-1,`The last box would not be full. The question asks for boxes filled completely.`],[total,`That is the number of muffins. Share them into boxes of ${box}.`]])};
};
const hallSeats:Make=r=>{
 const rows=r.int(18,45),seats=r.int(24,38),total=rows*seats,empty=r.int(40,Math.floor(total/3)),ans=total-empty;
 return {name:'hall-seats',prompt:`A hall has ${rows} rows of ${seats} seats. At a concert, ${empty} seats are empty. How many seats are taken?`,answer:fmt(ans),strategy:'Find the whole, then the part you need',
  hints:['How many seats are there altogether?',`${rows} rows of ${seats}: ${rows} × ${seats}.`,`There are ${total} seats. Take away the empty ones.`],
  steps:[`Seats altogether: ${rows} × ${seats} = ${total}.`,`Seats taken: ${total} − ${empty} = ${ans}.`],
  check:`${ans} + ${empty} = ${total}.`,
  wrong:trap(fmt(ans),[[total,'That is every seat, including the empty ones.'],[rows*seats+empty,'The empty seats are part of the hall, so take them away.']])};
};

// ---------------------------------------------------------- factors, multiples

const greatestBags:Make=r=>{
 const g=r.pick([4,6,8,9,12]);let m1=r.int(2,6),m2=r.int(2,6);while(m1===m2||gcd(m1,m2)!==1){m1=r.int(2,6);m2=r.int(2,6);}
 const [x]=people(r,1),a=g*m1,b=g*m2,smaller=[2,3,4,6].filter(k=>k<g&&g%k===0).at(-1)??1;
 return {name:'greatest-common-factor',prompt:`${x} has ${a} red beads and ${b} blue beads. She shares them into identical bags, with the same number of red beads in each bag, the same number of blue beads in each bag, and none left over. What is the greatest number of bags she can make?`,answer:fmt(g),strategy:'Find a common factor',
  hints:[`The number of bags must divide both ${a} and ${b} exactly.`,'List the factors of each number, then look for the factors they share.',`Of the common factors, choose the greatest.`],
  steps:[`The number of bags must be a factor of ${a} and a factor of ${b}.`,`${a} = ${g} × ${m1} and ${b} = ${g} × ${m2}, and ${m1} and ${m2} share no factor except 1.`,`The greatest common factor is ${g}, so she can make ${g} bags, each with ${m1} red and ${m2} blue beads.`],
  check:`${g} × ${m1} = ${a} and ${g} × ${m2} = ${b}, with nothing left over.`,
  wrong:trap(fmt(g),[[smaller,`${smaller} bags would work, but a larger number of bags is possible.`],[a+b,'That is the number of beads altogether, not the number of bags.']])};
};
const busesTogether:Make=r=>{
 let a=r.int(4,9),b=r.int(4,12);while(a===b||lcm(a,b)===a*b&&a*b>72){a=r.int(4,9);b=r.int(4,12);}
 const ans=lcm(a,b),start=7*60+r.pick([0,15,30]);
 return {name:'common-multiple',prompt:`Bus A leaves the interchange every ${a} minutes. Bus B leaves every ${b} minutes. Both buses leave together at ${clock12(start)}. After how many minutes will they next leave together?`,answer:fmt(ans),strategy:'List the multiples of each',
  hints:[`Bus A leaves after ${a}, ${2*a}, ${3*a}, … minutes.`,`Bus B leaves after ${b}, ${2*b}, ${3*b}, … minutes.`,'Look for the first number that appears in both lists.'],
  steps:[`Multiples of ${a}: ${Array.from({length:Math.min(8,ans/a)},(_,i)=>(i+1)*a).join(', ')}.`,`Multiples of ${b}: ${Array.from({length:Math.min(8,ans/b)},(_,i)=>(i+1)*b).join(', ')}.`,`The first common multiple is ${ans}, so they leave together again after ${ans} minutes.`],
  check:`${ans} ÷ ${a} = ${ans/a} and ${ans} ÷ ${b} = ${ans/b}: both buses arrive at the same moment.`,
  wrong:trap(fmt(ans),[[a*b!==ans?a*b:-1,`${a*b} is a common multiple, but not the first one.`],[a+b,'Adding the times does not find when both leave together. Look for a common multiple.']])};
};

// ------------------------------------------------------------------ fractions

const fractionLeftOfWhole:Make=r=>{
 const d=r.pick([4,5,6,8]),a=r.int(1,d-3),b=r.int(1,d-a-1),left=d-a-b,[x,y]=people(r,2),g=gcd(left,d),ans=`${left/g}/${d/g}`;
 return {name:'fraction-left',prompt:`A pizza is cut into ${d} equal slices. ${x} eats ${a}/${d} of the pizza and ${y} eats ${b}/${d} of it. What fraction of the pizza is left? Give your answer in simplest form.`,answer:ans,strategy:'Count the equal parts',
  hints:[`The whole pizza is ${d}/${d}.`,`Together they eat ${a}/${d} + ${b}/${d} = ${a+b}/${d}.`,`Take ${a+b}/${d} away from ${d}/${d}.`],
  steps:[`Eaten: ${a}/${d} + ${b}/${d} = ${a+b}/${d}.`,`Left: ${d}/${d} − ${a+b}/${d} = ${left}/${d}.`,g>1?`Simplify: ${left}/${d} = ${ans}.`:`${left}/${d} is already in simplest form.`],
  check:`${a}/${d} + ${b}/${d} + ${left}/${d} = ${d}/${d}, the whole pizza.`,
  wrong:trap(ans,[[`${a+b}/${d}`,'That is the part that was eaten. The question asks what is left.'],[`${left}/${2*d}`,'The slices stay the same size, so the denominator stays the same.']])};
};
const remainderForward:Make=r=>{
 const a=r.pick([2,3,4,5]),b=r.pick([2,3,4]),m=r.int(2,5),total=a*b*m,gave1=b*m,rem=total-gave1,gave2=rem/b,left=rem-gave2,[x,y,z]=people(r,3);
 const whole=total-total/a-total/b;
 return {name:'fraction-of-remainder',prompt:`${x} had ${total} stickers. She gave 1/${a} of them to ${y}, then gave 1/${b} of the remaining stickers to ${z}. How many stickers did ${x} have left?`,answer:fmt(left),strategy:'Treat the remainder as a new whole',
  hints:[`First find 1/${a} of ${total}.`,`After the first gift, ${rem} stickers remain. That remainder is the new whole for the second fraction.`,`1/${b} of ${rem} is ${gave2}.`],
  steps:[`1/${a} of ${total} = ${total} ÷ ${a} = ${gave1}.`,`Remaining: ${total} − ${gave1} = ${rem}.`,`1/${b} of the remainder: ${rem} ÷ ${b} = ${gave2}.`,`Left: ${rem} − ${gave2} = ${left}.`],
  check:`${gave1} + ${gave2} + ${left} = ${total}.`,
  wrong:trap(fmt(left),[[Number.isInteger(whole)?whole:-1,`The second fraction is of the remaining stickers, not of all ${total}.`],[rem,`That is what was left after the first gift. She also gave some to ${z}.`]])};
};
const remainderBackward:Make=r=>{
 const q=r.pick([3,4,5]),p=r.int(1,q-1),s=r.pick([2,3,4]),k=r.int(2,8),T=q*s*k,rem=(q-p)*s*k,left=(q-p)*(s-1)*k,[x]=people(r,1);
 const naive=1-p/q-1/s,wrongT=naive>0?left/naive:-1;
 return {name:'remainder-backwards',prompt:`${x} spent ${p}/${q} of her money on a bag and 1/${s} of the remainder on a book. She had ${cash(left)} left. How much money did she have at first?`,answer:fmt(T),strategy:'Work backwards with units',
  hints:['Work backwards from the money that was left.',`After the bag, ${q-p}/${q} of her money remained. She spent 1/${s} of that remainder on the book, so ${s-1}/${s} of the remainder was left.`,`${cash(left)} is ${s-1}/${s} of the remainder.`],
  steps:[`${cash(left)} is ${s-1}/${s} of the remainder, so 1/${s} of the remainder is ${cash(left)} ÷ ${s-1} = ${cash(left/(s-1))}, and the remainder was ${cash(rem)}.`,`${cash(rem)} is ${q-p}/${q} of her money, so 1/${q} of her money is ${cash(rem)} ÷ ${q-p} = ${cash(s*k)}.`,`At first: ${cash(s*k)} × ${q} = ${cash(T)}.`],
  check:`${p}/${q} of ${cash(T)} is ${cash(T*p/q)}; 1/${s} of the remaining ${cash(rem)} is ${cash(rem/s)}; ${cash(T)} − ${cash(T*p/q)} − ${cash(rem/s)} = ${cash(left)}.`,
  wrong:trap(fmt(T),[[Number.isInteger(wrongT)?wrongT:-1,`The 1/${s} is a fraction of the remainder, not of all her money.`],[rem,'That is the money she had after buying the bag, not her money at first.']])};
};
const equalParts:Make=r=>{
 const fr=[[1,2],[2,3],[3,4],[2,5],[3,5],[1,3],[1,4]];let A=r.pick(fr),B=r.pick(fr);while(A[0]*B[1]===B[0]*A[1])B=r.pick(fr);
 const [a,b]=A,[c,d]=B,k=r.int(1,4),v=a*c*k,X=c*b*k,Y=a*d*k,[x,y]=people(r,2);
 return {name:'equal-parts',prompt:`${a}/${b} of ${x}'s marbles is equal to ${c}/${d} of ${y}'s marbles. ${x} has ${X} marbles. How many marbles does ${y} have?`,answer:fmt(Y),strategy:'Find the equal amount first',
  hints:[`Start with what you know: ${a}/${b} of ${X}.`,`That same amount is ${c}/${d} of ${y}'s marbles.`,`If ${c}/${d} of ${y}'s marbles is ${v}, find 1/${d} first.`],
  steps:[`${a}/${b} of ${X} = ${X} ÷ ${b} × ${a} = ${v}.`,`So ${c}/${d} of ${y}'s marbles is ${v}.`,`1/${d} of ${y}'s marbles is ${v} ÷ ${c} = ${v/c}.`,`${y} has ${v/c} × ${d} = ${Y} marbles.`],
  check:`${c}/${d} of ${Y} = ${v}, which is ${a}/${b} of ${X}.`,
  wrong:trap(fmt(Y),[[v,`That is the equal amount, which is only ${c}/${d} of ${y}'s marbles.`],[X,`The fractions are different, so ${y} does not have the same number as ${x}.`]])};
};
const ribbonPieces:Make=r=>{
 const [p,q]=r.pick([[1,4],[3,4],[2,5],[1,3],[2,3],[3,5]]),W=r.int(2,6),n=Math.floor(W*q/p),rem=W*q-n*p,[x]=people(r,1);
 return {name:'divide-by-fraction',prompt:`A ribbon is ${W} m long. ${x} cuts it into pieces that are each ${p}/${q} m long. How many complete pieces can she cut?`,answer:fmt(n),strategy:'Change to the same-sized parts',
  hints:[`Write ${W} m as a number of ${q}ths: ${W} = ${W*q}/${q}.`,`Each piece uses ${p} of those ${q}ths.`,`How many groups of ${p} fit into ${W*q}?`],
  steps:[`${W} m = ${W*q}/${q} m.`,`Each piece is ${p}/${q} m, so count the groups of ${p} in ${W*q}: ${W*q} ÷ ${p} = ${n}${rem?` remainder ${rem}`:''}.`,`She can cut ${n} complete pieces${rem?`, with ${rem}/${q} m left over`:''}.`],
  check:`${n} × ${p}/${q} m = ${n*p}/${q} m${rem?`, and ${rem}/${q} m is too short for another piece`:''}.`,
  wrong:trap(fmt(n),[[Math.round(W*p/q*100)/100,`Dividing by a fraction asks how many pieces fit, so the answer is larger than ${W}.`],[rem?n+1:-1,'The last piece would be too short. Count only complete pieces.']])};
};

// ------------------------------------------------------- decimals and money

const pensAndRuler:Make=r=>{
 const pen=r.int(85,245),extra=r.int(35,180),ruler=pen+extra,n=r.int(2,4),ans=n*pen+ruler,[x]=people(r,1);
 return {name:'decimal-two-items',prompt:`A pen costs ${cash(pen/100)}. A ruler costs ${cash(extra/100)} more than the pen. ${x} buys ${n} pens and 1 ruler. How much does ${x} pay altogether, in dollars?`,answer:fmt(ans/100),strategy:'Find each price, then the total',
  hints:['First find the price of the ruler.',`The ruler costs ${cash(pen/100)} + ${cash(extra/100)}.`,`Now find the cost of ${n} pens and add the ruler.`],
  steps:[`Ruler: ${cash(pen/100)} + ${cash(extra/100)} = ${cash(ruler/100)}.`,`${n} pens: ${n} × ${cash(pen/100)} = ${cash(n*pen/100)}.`,`Total: ${cash(n*pen/100)} + ${cash(ruler/100)} = ${cash(ans/100)}.`],
  check:`${cash(ans/100)} − ${cash(ruler/100)} = ${cash(n*pen/100)}, which is ${n} pens.`,
  wrong:trap(fmt(ans/100),[[(n*pen+extra)/100,`The ruler costs ${cash(extra/100)} more than the pen, not ${cash(extra/100)} altogether.`],[(n+1)*pen/100,'The ruler costs more than a pen.']])};
};
const jugGlasses:Make=r=>{
 const jug=r.int(15,30)*100,g=r.pick([150,200,250,300,350]),n=r.int(2,Math.max(2,Math.floor(jug/g)-1)),left=jug-n*g,[x]=people(r,1);
 return {name:'decimal-litres',prompt:`A jug holds ${fmt(jug/1000)} litres of juice. ${x} pours out ${n} glasses of ${fmt(g/1000)} litres each. How many litres of juice are left in the jug?`,answer:fmt(left/1000),unit:'litres',strategy:'Work in one unit',
  hints:[`Find how much was poured out: ${n} × ${fmt(g/1000)} litres.`,`It may help to think in millilitres: ${g} ml per glass.`,`Take the juice poured out away from ${fmt(jug/1000)} litres.`],
  steps:[`Poured out: ${n} × ${fmt(g/1000)} = ${fmt(n*g/1000)} litres.`,`Left: ${fmt(jug/1000)} − ${fmt(n*g/1000)} = ${fmt(left/1000)} litres.`],
  check:`${fmt(left/1000)} + ${fmt(n*g/1000)} = ${fmt(jug/1000)} litres.`,
  wrong:trap(fmt(left/1000),[[(jug-g)/1000,`${x} poured ${n} glasses, so take away ${n} lots of ${fmt(g/1000)} litres.`]])};
};
const decimalRoundRange:Make=r=>{
 const x10=r.int(11,98),smallest=r.chance(.5),ans=smallest?(x10*10-5)/100:(x10*10+4)/100;
 return {name:'decimal-rounding-range',prompt:`A number has 2 decimal places. Rounded to 1 decimal place, it is ${fmt(x10/10)}. What is the ${smallest?'smallest':'greatest'} the number could be?`,answer:fmt(ans),strategy:'Find the halfway points',
  hints:[`Numbers with 2 decimal places near ${fmt(x10/10)} go up in steps of 0.01.`,`The halfway points are ${fmt((x10*10-5)/100)} and ${fmt((x10*10+5)/100)}.`,'A number exactly halfway rounds up.'],
  steps:smallest?[`Halfway between ${fmt((x10-1)/10)} and ${fmt(x10/10)} is ${fmt(ans)}.`,`A number exactly halfway rounds up, so ${fmt(ans)} rounds to ${fmt(x10/10)}.`,`The smallest is ${fmt(ans)}.`]:[`Halfway between ${fmt(x10/10)} and ${fmt((x10+1)/10)} is ${fmt((x10*10+5)/100)}, which rounds up to ${fmt((x10+1)/10)}.`,`The 2-decimal-place number just below it is ${fmt(ans)}.`,`The greatest is ${fmt(ans)}.`],
  check:smallest?`${fmt(ans)} rounds to ${fmt(x10/10)}, but ${fmt(ans-0.01)} rounds to ${fmt((x10-1)/10)}.`:`${fmt(ans)} rounds to ${fmt(x10/10)}, but ${fmt(ans+0.01)} rounds to ${fmt((x10+1)/10)}.`,
  wrong:trap(fmt(ans),smallest?[[(x10*10-4)/100,`A smaller number also rounds to ${fmt(x10/10)}.`],[(x10*10-6)/100,`That rounds down to ${fmt((x10-1)/10)}.`]]:[[(x10*10+5)/100,`A 5 in the second decimal place rounds up to ${fmt((x10+1)/10)}.`],[(x10*10+3)/100,`A larger number also rounds to ${fmt(x10/10)}.`]])};
};
const changeFromNote:Make=(r,c)=>{
 const [x]=people(r,1),cents=c.eff>=2,note=r.pick(cents?[10,20,50]:[20,50]);
 let a=0,b=0;while(true){a=cents?r.int(150,note*100*0.55):r.int(3,Math.floor(note*0.5))*100;b=cents?r.int(80,note*100*0.4):r.int(2,Math.floor(note*0.4))*100;if(a+b<note*100-50)break;}
 const ans=note*100-a-b;
 return {name:'change',prompt:`${x} bought a book for ${cash(a/100)} and a pen for ${cash(b/100)}, and paid with a $${note} note. How much change did ${x} get, in dollars?`,answer:fmt(ans/100),strategy:'Find the total cost, then the change',
  hints:['Both things were paid for with the same note. What did they cost altogether?',`${cash(a/100)} + ${cash(b/100)} = ${cash((a+b)/100)}.`,`Change is what is left from $${note}.`],
  steps:[`Total cost: ${cash(a/100)} + ${cash(b/100)} = ${cash((a+b)/100)}.`,`Change: $${note} − ${cash((a+b)/100)} = ${cash(ans/100)}.`],
  check:`${cash(ans/100)} + ${cash((a+b)/100)} = $${note}.`,
  wrong:trap(fmt(ans/100),[[(note*100-a)/100,'The pen was paid for with the same note, so take it away as well.'],[(a+b)/100,'That is the total cost. Change is what is left from the note.']])};
};
const savingWeeks:Make=r=>{
 const [x]=people(r,1),weekly=r.int(3,9),has=r.int(2,15),price=has+weekly*r.int(4,9)+r.int(1,weekly-1),need=price-has,ans=Math.ceil(need/weekly);
 return {name:'saving-weeks',prompt:`${x} wants a toy that costs $${price}. ${x} already has $${has} and saves $${weekly} every week. What is the smallest number of weeks ${x} must save to buy the toy?`,answer:fmt(ans),strategy:'Find what is still needed, then think about the remainder',
  hints:[`How much more money is needed? $${price} − $${has}.`,`$${need} ÷ $${weekly} = ${Math.floor(need/weekly)} remainder ${need%weekly}.`,'After the full weeks there is still some money missing. Is one more week needed?'],
  steps:[`Still needed: $${price} − $${has} = $${need}.`,`$${need} ÷ $${weekly} = ${Math.floor(need/weekly)} remainder ${need%weekly}.`,`After ${Math.floor(need/weekly)} weeks, $${need%weekly} is still missing, so ${x} needs ${ans} weeks.`],
  check:`After ${ans-1} weeks ${x} has $${has+(ans-1)*weekly}, which is not enough; after ${ans} weeks, $${has+ans*weekly}.`,
  wrong:trap(fmt(ans),[[Math.floor(need/weekly),`After ${Math.floor(need/weekly)} weeks, $${need%weekly} is still missing. One more week is needed.`],[Math.ceil(price/weekly),`${x} already has $${has}, so only $${need} more is needed.`]])};
};
const unitScale:Make=r=>{
 const n1=r.int(2,5),unit=r.int(3,12)*5,n2=r.int(6,10),ans=n2*unit;
 return {name:'unit-price',prompt:`${n1} pencils cost ${cash(n1*unit/100)}. How much do ${n2} pencils cost, in dollars?`,answer:fmt(ans/100),strategy:'Find the cost of one first',
  hints:[`Find the price of 1 pencil: ${cash(n1*unit/100)} ÷ ${n1}.`,`One pencil costs ${unit} cents.`,`Now find ${n2} × ${unit} cents.`],
  steps:[`1 pencil: ${cash(n1*unit/100)} ÷ ${n1} = ${cash(unit/100)}.`,`${n2} pencils: ${n2} × ${cash(unit/100)} = ${cash(ans/100)}.`],
  check:`${cash(ans/100)} ÷ ${n2} = ${cash(unit/100)}, the same price for one pencil.`,
  wrong:trap(fmt(ans/100),[[n2*n1*unit/100,`${cash(n1*unit/100)} is the cost of ${n1} pencils, not 1. Find the cost of one pencil first.`]])};
};

// --------------------------------------------------------------- percentage

const percentOfRest:Make=r=>{
 let total=0,p1=0,p2=0,rest=0;while(true){total=r.pick([40,80,120,160,200,240]);p1=r.pick([10,20,25,40,50]);p2=r.pick([20,25,40,50]);rest=total*(100-p1)/100;if(Number.isInteger(rest)&&Number.isInteger(rest*p2/100))break;}
 const ans=rest*p2/100;
 return {name:'percent-of-rest',prompt:`${total} pupils took part in a survey. ${p1}% of them chose swimming. ${p2}% of the rest chose football. How many pupils chose football?`,answer:fmt(ans),strategy:'Find the rest first, then take its percentage',
  hints:[`Find how many chose swimming: ${p1}% of ${total}.`,`The rest is the new whole for the second percentage.`,`${p2}% of ${rest}.`],
  steps:[`Swimming: ${p1}% of ${total} = ${total*p1/100}.`,`The rest: ${total} − ${total*p1/100} = ${rest}.`,`Football: ${p2}% of ${rest} = ${ans}.`],
  check:`${total*p1/100} + ${ans} + ${rest-ans} = ${total} pupils altogether.`,
  wrong:trap(fmt(ans),[[total*p2/100,`The ${p2}% is of the rest, not of all ${total} pupils.`],[rest,'That is everyone who did not choose swimming.']])};
};
const discountThenGst:Make=r=>{
 const price=r.pick([40,60,80,120,160,200,240]),disc=r.pick([10,20,25,50]),dc=price*(100-disc),gst=dc*9/100,final=dc+gst,[x]=people(r,1);
 return {name:'discount-gst',prompt:`A watch costs $${price} before a ${disc}% discount. After the discount, 9% GST is added to the discounted price. How much does ${x} pay, in dollars?`,answer:fmt(final/100),strategy:'One percentage at a time, each of its own whole',
  hints:[`First find the discounted price: ${disc}% off $${price}.`,`The discounted price is ${cash(dc/100)}. GST is 9% of this new price.`,'You cannot combine the two percentages into one, because they are percentages of different amounts.'],
  steps:[`Discount: ${disc}% of $${price} = ${cash(price*disc/100)}.`,`Discounted price: $${price} − ${cash(price*disc/100)} = ${cash(dc/100)}.`,`GST: 9% of ${cash(dc/100)} = ${cash(gst/100)}.`,`${x} pays ${cash(dc/100)} + ${cash(gst/100)} = ${cash(final/100)}.`],
  check:`${cash(final/100)} is 109% of ${cash(dc/100)}, and ${cash(dc/100)} is ${100-disc}% of $${price}.`,
  wrong:trap(fmt(final/100),[[price*(100-disc+9)/100,'GST is 9% of the discounted price, not of the original price, so the percentages cannot simply be combined.'],[dc/100,'GST must still be added to the discounted price.']])};
};
const originalFromChange:Make=r=>{
 const orig=r.int(2,12)*20,pct=r.pick([10,20,25,50]),up=r.chance(.5),now=orig*(up?100+pct:100-pct)/100,share=up?100+pct:100-pct;
 return {name:'percent-original',prompt:`After a ${pct}% ${up?'increase':'decrease'}, the price of a book is $${now}. What was the price before the change?`,answer:fmt(orig),strategy:'Let the original be 100%',
  hints:['The price before the change is 100%.',`After a ${pct}% ${up?'increase':'decrease'}, the price is ${share}% of the original.`,`${share}% is $${now}. Find 1%, then 100%.`],
  steps:[`The original price is 100%.`,`After the change, the price is ${share}% of the original.`,`${share}% → $${now}, so 1% → $${now} ÷ ${share} = ${cash(now/share)}.`,`100% → ${cash(now/share)} × 100 = $${orig}.`],
  check:`${pct}% of $${orig} is $${orig*pct/100}, and $${orig} ${up?'+':'−'} $${orig*pct/100} = $${now}.`,
  wrong:trap(fmt(orig),[[now*(up?100-pct:100+pct)/100,`The ${pct}% is a percentage of the original price, not of $${now}. Taking ${pct}% of the new price does not undo the change.`],[now,'That is the price after the change.']])};
};
const percentRemainderBackward:Make=r=>{
 const p1=r.pick([20,25,40,50]),p2=r.pick([20,25,50]);
 const options=Array.from({length:30},(_,i)=>(i+2)*20).filter(T=>Number.isInteger(T*(100-p1)/100)&&Number.isInteger(T*(100-p1)*(100-p2)/10000));
 const T=r.pick(options),rem=T*(100-p1)/100,left=rem*(100-p2)/100,[x]=people(r,1);
 return {name:'percent-backwards',prompt:`${x} spent ${p1}% of his money on a game and ${p2}% of the remainder on a book. He had $${left} left. How much money did he have at first?`,answer:fmt(T),strategy:'Work backwards, one whole at a time',
  hints:['Work backwards from the money left.',`After the book, ${100-p2}% of the remainder was left. So $${left} is ${100-p2}% of the remainder.`,`Find the remainder, then remember it was ${100-p1}% of his money at first.`],
  steps:[`$${left} is ${100-p2}% of the remainder, so the remainder was $${left} ÷ ${100-p2} × 100 = $${rem}.`,`$${rem} is ${100-p1}% of his money, so he had $${rem} ÷ ${100-p1} × 100 = $${T} at first.`],
  check:`${p1}% of $${T} is $${T*p1/100}, leaving $${rem}; ${p2}% of $${rem} is $${rem*p2/100}, leaving $${left}.`,
  wrong:trap(fmt(T),[[left/(1-p1/100-p2/100),`The ${p2}% is of the remainder, not of all his money.`],[rem,'That is the money after buying the game, not his money at first.']])};
};

// --------------------------------------------------------------------- ratio

const transferEqual:Make=r=>{
 const [a,b]=r.pick([[1,3],[3,5],[1,5],[3,7],[5,7],[5,9],[7,9]]),t=(b-a)/2,u=r.int(4,12)*(t===1?2:1),[x,y]=people(r,2),half=(a+b)/2;
 return {name:'ratio-transfer-equal',prompt:`The ratio of ${x}'s money to ${y}'s money is ${a} : ${b}. After ${y} gives ${x} $${t*u}, they have the same amount of money. How much money did ${x} have at first?`,answer:fmt(a*u),strategy:'Units and parts: before and after',
  hints:['When money passes between them, the total does not change.',`Altogether there are ${a} + ${b} = ${units(a+b)}. After the gift, each has half: ${units(half)}.`,`${y} gave ${b} − ${half} = ${units(t)}, which is $${t*u}.`],
  steps:[`Before: ${x} has ${units(a)} and ${y} has ${units(b)}, ${units(a+b)} altogether.`,`After: they have equal shares of ${units(half)} each, so ${y} gave ${units(t)}.`,`${units(t)} = $${t*u}, so 1 unit = $${u}.`,`${x} had ${a} × $${u} = $${a*u} at first.`],
  check:`${x}: $${a*u} + $${t*u} = $${(a+t)*u}. ${y}: $${b*u} − $${t*u} = $${(b-t)*u}. The amounts are equal.`,
  wrong:trap(fmt(a*u),[[t*u,`That is the money ${y} gave, not ${x}'s money at first.`],[(a+t)*u,`That is how much ${x} had after the gift. The question asks for the amount at first.`],[b*u,`That is ${y}'s money at first.`],[u,'That is the value of one unit.']])};
};
const addedKeepsOther:Make=r=>{
 const [a,b,c]=r.pick([[1,2,3],[2,3,4],[1,3,2],[3,4,5],[2,5,3],[3,5,4],[1,4,3],[3,7,5]]),u=r.int(3,12),added=(c-a)*u;
 return {name:'ratio-one-unchanged',prompt:`The ratio of red beads to blue beads in a box is ${a} : ${b}. After ${added} red beads are added, the ratio becomes ${c} : ${b}. How many blue beads are there?`,answer:fmt(b*u),strategy:'Keep what does not change constant',
  hints:['Only red beads are added, so the number of blue beads stays the same.',`Blue is ${units(b)} in both ratios, so the units already match.`,`Red goes from ${units(a)} to ${units(c)}: an increase of ${units(c-a)}, which is ${added} beads.`],
  steps:[`The blue beads do not change: ${units(b)} before and after.`,`Red beads go from ${units(a)} to ${units(c)}, an increase of ${units(c-a)}.`,`${units(c-a)} = ${added}, so 1 unit = ${u}.`,`Blue beads: ${b} × ${u} = ${b*u}.`],
  check:`Before: ${a*u} red and ${b*u} blue, ${a} : ${b}. After: ${c*u} red and ${b*u} blue, ${c} : ${b}.`,
  wrong:trap(fmt(b*u),[[u,`That is one unit. The blue beads are ${units(b)}.`],[a*u,'That is the number of red beads at first.'],[c*u,'That is the number of red beads after.']])};
};
const combineRatios:Make=r=>{
 let a=1,b=1,p=1,q=1;while(true){a=r.int(1,5);b=r.int(2,6);p=r.int(2,6);q=r.int(1,6);if(gcd(a,b)===1&&gcd(p,q)===1&&b!==p)break;}
 const L=lcm(b,p),A=a*L/b,C=q*L/p,g=gcd(A,C),m=A/g,n=C/g,[x,y,z]=people(r,3),ans=`${m}:${n}`;
 return {name:'ratio-combine',prompt:`The ratio of ${x}'s stamps to ${y}'s stamps is ${a} : ${b}. The ratio of ${y}'s stamps to ${z}'s stamps is ${p} : ${q}. What is the ratio of ${x}'s stamps to ${z}'s stamps? Give it in simplest form, for example 2:3.`,answer:ans,strategy:'Make the shared quantity match',
  hints:[`${y} appears in both ratios, as ${units(b)} in one and ${units(p)} in the other.`,`Make ${y}'s units equal in both: use ${L}, a common multiple of ${b} and ${p}.`,`${x} : ${y} = ${A} : ${L} and ${y} : ${z} = ${L} : ${C}.`],
  steps:[`${y} is ${b} units in the first ratio and ${p} units in the second. Make both ${L}.`,`${x} : ${y} = ${a} × ${L/b} : ${b} × ${L/b} = ${A} : ${L}.`,`${y} : ${z} = ${p} × ${L/p} : ${q} × ${L/p} = ${L} : ${C}.`,`So ${x} : ${z} = ${A} : ${C}${g>1?` = ${m} : ${n}`:''}.`],
  check:`${x} : ${y} : ${z} = ${A} : ${L} : ${C}, which matches both given ratios.`,
  wrong:trap(ans,[[`${a}:${q}`,`${y} is ${b} units in one ratio and ${p} units in the other. Make ${y}'s units equal before comparing ${x} with ${z}.`],...(g>1?[[`${A}:${C}`,'That ratio is correct but not in simplest form. Divide both numbers by their greatest common factor.'] as [string,string]]:[])])};
};
const shareDifference:Make=r=>{
 let a=1,b=2;while(true){a=r.int(1,5);b=r.int(a+1,9);if(gcd(a,b)===1)break;}
 const u=r.int(5,30),total=(a+b)*u,[x,y]=people(r,2);
 return {name:'ratio-share-difference',prompt:`${x} and ${y} share $${total} in the ratio ${a} : ${b}. How much more money does ${y} get than ${x}?`,answer:fmt((b-a)*u),strategy:'Find one unit',
  hints:[`Altogether there are ${a} + ${b} = ${units(a+b)}.`,`${units(a+b)} = $${total}, so find 1 unit.`,`${y} gets ${b - a} more unit${b-a===1?'':'s'} than ${x}.`],
  steps:[`Total units: ${a} + ${b} = ${a+b}.`,`1 unit = $${total} ÷ ${a+b} = $${u}.`,`${y} gets ${units(b-a)} more: ${b-a} × $${u} = $${(b-a)*u}.`],
  check:`${x} gets $${a*u}, ${y} gets $${b*u}; together $${total}, and the difference is $${(b-a)*u}.`,
  wrong:trap(fmt((b-a)*u),[[b*u,`That is ${y}'s share. The question asks how much more.`],[total/(b-a),'Divide the total by the total number of units, not by the difference.']])};
};

// ---------------------------------------------------------------------- rate

const twoTaps:Make=r=>{
 const r1=r.int(5,15),r2=r.int(4,12),both=r1+r2,minutes=r.int(6,20),tank=both*minutes;
 return {name:'rate-combined',prompt:`Tap A fills a tank at ${r1} litres per minute. Tap B fills it at ${r2} litres per minute. Both taps are turned on together. How many minutes do they take to fill a ${tank}-litre tank?`,answer:fmt(minutes),unit:'minutes',strategy:'Combine the rates',
  hints:['Both taps pour at the same time. How much do they pour together in one minute?',`${r1} + ${r2} = ${both} litres every minute.`,`How many minutes of ${both} litres make ${tank} litres?`],
  steps:[`Together: ${r1} + ${r2} = ${both} litres per minute.`,`Minutes: ${tank} ÷ ${both} = ${minutes}.`],
  check:`In ${minutes} minutes, Tap A pours ${r1*minutes} litres and Tap B pours ${r2*minutes} litres: ${tank} litres.`,
  wrong:trap(fmt(minutes),[[tank/r1,'That uses Tap A alone. Both taps are pouring.'],[tank/r2,'That uses Tap B alone. Both taps are pouring.']])};
};
const printerRate:Make=r=>{
 const pr=r.int(6,25),t1=r.int(2,6),pages1=pr*t1,t2=r.int(8,30),ans=pr*t2;
 return {name:'rate-scale',prompt:`A printer prints ${pages1} pages in ${t1} minutes. At the same rate, how many pages does it print in ${t2} minutes?`,answer:fmt(ans),strategy:'Find the rate for one unit',
  hints:['Find how many pages are printed in 1 minute.',`${pages1} ÷ ${t1} = ${pr} pages per minute.`,`Now find the pages in ${t2} minutes.`],
  steps:[`Rate: ${pages1} ÷ ${t1} = ${pr} pages per minute.`,`In ${t2} minutes: ${pr} × ${t2} = ${ans} pages.`],
  check:`${ans} ÷ ${t2} = ${pr}, the same rate as ${pages1} ÷ ${t1}.`,
  wrong:trap(fmt(ans),[[pages1*t2,`${pages1} pages take ${t1} minutes, not 1 minute. Find the pages per minute first.`],[pages1+t2,'Adding does not keep the rate the same. Find the pages printed in one minute.']])};
};
const eggsCents:Make=r=>{
 const nA=r.pick([6,10,12]),nB=r.pick([6,10,12].filter(n=>n!==nA)),cA=r.int(30,55),cB=cA-r.int(2,8),priceA=nA*cA,priceB=nB*cB;
 return {name:'rate-best-buy',prompt:`Pack A has ${nA} eggs for ${cash(priceA/100)}. Pack B has ${nB} eggs for ${cash(priceB/100)}. How many cents cheaper is one egg in Pack B?`,answer:fmt(cA-cB),unit:'cents',strategy:'Compare the price of one',
  hints:['The packs hold different numbers of eggs, so compare the price of one egg.',`Pack A: ${priceA} cents ÷ ${nA}.`,`One egg in Pack A costs ${cA} cents. Now find Pack B.`],
  steps:[`Pack A: ${priceA} ÷ ${nA} = ${cA} cents per egg.`,`Pack B: ${priceB} ÷ ${nB} = ${cB} cents per egg.`,`Difference: ${cA} − ${cB} = ${cA-cB} cents.`],
  check:`${nA} × ${cA} cents = ${cash(priceA/100)} and ${nB} × ${cB} cents = ${cash(priceB/100)}.`,
  wrong:trap(fmt(cA-cB),[[Math.abs(priceA-priceB),'That compares the packs, which hold different numbers of eggs. Compare one egg.']])};
};

// ------------------------------------------------------------------- algebra

const agesSum:Make=r=>{
 const [y]=people(r,1),x=r.int(6,14),k=r.int(3,5),n=r.int(2,8),sum=(k+1)*x+2*n,once=(sum-n)/(k+1);
 return {name:'algebra-ages',prompt:`${y}'s father is ${k} times as old as ${y}. In ${n} years' time, the sum of their ages will be ${sum}. How old is ${y} now?`,answer:fmt(x),unit:'years',strategy:'Let a letter stand for the unknown',
  hints:[`Let ${y}'s age now be x years. Then the father is ${k}x years old.`,`In ${n} years, both are ${n} years older: x + ${n} and ${k}x + ${n}.`,`Their sum is ${k+1}x + ${2*n}.`],
  steps:[`Now: ${y} is x years old and the father is ${k}x years old.`,`In ${n} years: x + ${n} and ${k}x + ${n}.`,`Sum: x + ${n} + ${k}x + ${n} = ${k+1}x + ${2*n} = ${sum}.`,`${k+1}x = ${sum-2*n}, so x = ${x}. ${y} is ${x} years old now.`],
  check:`Now ${x} and ${k*x}; in ${n} years ${x+n} and ${k*x+n}, which add to ${sum}.`,
  wrong:trap(fmt(x),[[x+n,`That is ${y}'s age in ${n} years. The question asks for the age now.`],[Number.isInteger(once)?once:-1,`Both people get ${n} years older, so take ${n} away twice.`]])};
};
const penAndBook:Make=r=>{
 const y=r.int(2,9),m=r.int(2,3),d=r.int(1,6),total=y+m*y+d;
 return {name:'algebra-equation',prompt:`A pen costs $y. A book costs $${d} more than ${m} pens. A pen and a book cost $${total} altogether. Find the value of y.`,answer:fmt(y),strategy:'Write the relationship, then keep both sides equal',
  hints:[`Write the book's price using y: ${m} pens cost ${m}y dollars.`,`The book costs ${m}y + ${d} dollars.`,`A pen and a book: y + ${m}y + ${d} = ${total}.`],
  steps:[`Book: ${m}y + ${d} dollars.`,`Pen and book: y + ${m}y + ${d} = ${m+1}y + ${d}.`,`${m+1}y + ${d} = ${total}, so ${m+1}y = ${total-d}.`,`y = ${total-d} ÷ ${m+1} = ${y}.`],
  check:`Pen $${y}, book $${m*y+d}: together $${total}.`,
  wrong:trap(fmt(y),[[total-d,`That is the value of ${m+1}y. Divide by ${m+1} to find y.`],[(total-d)/m,`The pen is part of the total too, so there are ${m+1} lots of y, not ${m}.`]])};
};
const substituteTwo:Make=r=>{
 const x=r.int(2,9),y=r.int(2,9),a=r.int(2,5),b=r.int(2,5),total=a*x+b*y;
 return {name:'algebra-substitute',prompt:`When x = ${x}, ${a}x + ${b}y = ${total}. Find the value of y.`,answer:fmt(y),strategy:'Substitute, then solve',
  hints:[`Replace x with ${x}: ${a}x means ${a} × ${x}.`,`${a} × ${x} = ${a*x}, so ${a*x} + ${b}y = ${total}.`,`Find ${b}y first, then y.`],
  steps:[`Substitute x = ${x}: ${a} × ${x} = ${a*x}.`,`${a*x} + ${b}y = ${total}, so ${b}y = ${total-a*x}.`,`y = ${total-a*x} ÷ ${b} = ${y}.`],
  check:`${a} × ${x} + ${b} × ${y} = ${a*x} + ${b*y} = ${total}.`,
  wrong:trap(fmt(y),[[total-a*x,`That is the value of ${b}y. Divide by ${b}.`]])};
};

// ------------------------------------------------------------------- average

const averageAddOne:Make=r=>{
 const n=r.int(3,6),avg1=r.int(10,40),inc=r.int(1,5),avg2=avg1+inc,added=(n+1)*avg2-n*avg1;
 return {name:'average-added',prompt:`The average of ${n} numbers is ${avg1}. When one more number is added, the average of all ${n+1} numbers becomes ${avg2}. What number was added?`,answer:fmt(added),strategy:'Work with totals, not averages',
  hints:['Averages cannot be added or taken away directly. Find the totals.',`Total of the ${n} numbers: ${n} × ${avg1}.`,`Total of all ${n+1} numbers: ${n+1} × ${avg2}.`],
  steps:[`Total of ${n} numbers: ${n} × ${avg1} = ${n*avg1}.`,`Total of ${n+1} numbers: ${n+1} × ${avg2} = ${(n+1)*avg2}.`,`Added number: ${(n+1)*avg2} − ${n*avg1} = ${added}.`],
  check:`(${n*avg1} + ${added}) ÷ ${n+1} = ${(n+1)*avg2} ÷ ${n+1} = ${avg2}.`,
  wrong:trap(fmt(added),[[avg2,'The new number must also lift the average of the others, so it is more than the new average.'],[inc,'That is how much the average went up, not the number added.'],[(n+1)*avg2,'That is the new total.']])};
};
const averageTarget:Make=r=>{
 const [x]=people(r,1),n=4;let avg1=0,target=0,needed=999;while(needed>100){avg1=r.int(60,80);target=avg1+r.int(2,6);needed=(n+1)*target-n*avg1;}
 return {name:'average-target',prompt:`${x}'s average score in ${n} tests is ${avg1}. What score does ${x} need in the next test so that the average of all ${n+1} tests is ${target}?`,answer:fmt(needed),strategy:'Work with totals, not averages',
  hints:[`Total so far: ${n} × ${avg1}.`,`Total needed for an average of ${target} over ${n+1} tests: ${n+1} × ${target}.`,'The next score is the difference between the two totals.'],
  steps:[`Total so far: ${n} × ${avg1} = ${n*avg1}.`,`Total needed: ${n+1} × ${target} = ${(n+1)*target}.`,`Score needed: ${(n+1)*target} − ${n*avg1} = ${needed}.`],
  check:`(${n*avg1} + ${needed}) ÷ ${n+1} = ${target}.`,
  wrong:trap(fmt(needed),[[target,`A score of ${target} would keep the average below ${target}, because the earlier tests average only ${avg1}.`],[target+(target-avg1),'The extra must make up the shortfall on all the earlier tests, not just one.']])};
};
const graphMissingForAverage:Make=r=>{
 const days=['Monday','Tuesday','Wednesday','Thursday'],vals=days.map(()=>r.int(8,20)),sum=vals.reduce((a,b)=>a+b,0);let target=0,fri=-1;while(fri<4||fri>30){target=r.int(10,20);fri=5*target-sum;}
 return {name:'data-average-missing',prompt:`A class read ${vals.map((v,i)=>`${v} books on ${days[i]}`).join(', ')}. How many books must they read on Friday for the average over the five days to be ${target}?`,answer:fmt(fri),strategy:'Work with totals',
  hints:[`For an average of ${target} over 5 days, the total must be 5 × ${target}.`,`The total for Monday to Thursday is ${vals.join(' + ')}.`,'Friday makes up the difference.'],
  steps:[`Total needed: 5 × ${target} = ${5*target}.`,`Monday to Thursday: ${vals.join(' + ')} = ${sum}.`,`Friday: ${5*target} − ${sum} = ${fri}.`],
  check:`(${sum} + ${fri}) ÷ 5 = ${target}.`,
  wrong:trap(fmt(fri),[[target,'Friday must also make up for the other days, so it need not equal the average.'],[4*target-sum,'There are five days in the average, not four.']])};
};
const graphMissingTotal:Make=r=>{
 const days=['Monday','Tuesday','Wednesday','Thursday'],vals=days.map(()=>r.int(12,45)),sum=vals.reduce((a,b)=>a+b,0),fri=r.int(10,40),total=sum+fri;
 return {name:'data-missing-total',prompt:`A table shows the number of cans collected: ${vals.map((v,i)=>`${days[i]} ${v}`).join(', ')}. The total for Monday to Friday was ${total}. How many cans were collected on Friday?`,answer:fmt(fri),strategy:'Use the total',
  hints:['Add the four days you know.',`${vals.join(' + ')} = ${sum}.`,'Friday is what is missing from the total.'],
  steps:[`Monday to Thursday: ${vals.join(' + ')} = ${sum}.`,`Friday: ${total} − ${sum} = ${fri}.`],
  check:`${sum} + ${fri} = ${total}.`,
  wrong:trap(fmt(fri),[[sum,'That is Monday to Thursday. Friday is what is left of the total.']])};
};
const pictureKey:Make=r=>{
 const k=r.pick([2,5,10]),f=r.int(4,9),g=r.int(2,f-1);
 return {name:'data-picture-key',prompt:`In a picture graph, each ★ stands for ${k} children. Football has ${f} ★ and netball has ${g} ★. How many more children chose football than netball?`,answer:fmt((f-g)*k),strategy:'Read the key before counting',
  hints:[`Each ★ is ${k} children, not 1.`,`Football has ${f-g} more ★ than netball.`,`${f-g} ★ stand for ${f-g} × ${k} children.`],
  steps:[`Football has ${f} − ${g} = ${f-g} more ★.`,`Each ★ is ${k} children: ${f-g} × ${k} = ${(f-g)*k}.`],
  check:`Football ${f*k} children, netball ${g*k} children: ${f*k} − ${g*k} = ${(f-g)*k}.`,
  wrong:trap(fmt((f-g)*k),[[f-g,`That counts stars. Each ★ stands for ${k} children.`],[(f+g)*k,'That is both groups together. The question asks how many more.']])};
};
const pieFractionPercent:Make=r=>{
 let total=0,pct=0;while(true){total=r.pick([80,120,160,200,240]);pct=r.pick([30,35,40,45]);if(Number.isInteger(total*pct/100)&&total%4===0)break;}
 const bad=total*pct/100,foot=total/4;
 return {name:'data-pie',prompt:`In a survey of ${total} pupils, 1/4 chose football and ${pct}% chose badminton. How many more pupils chose badminton than football?`,answer:fmt(bad-foot),strategy:'Change both shares into numbers of pupils',
  hints:['A fraction and a percentage cannot be compared until both are numbers of pupils.',`Football: 1/4 of ${total}.`,`Badminton: ${pct}% of ${total}.`],
  steps:[`Football: 1/4 of ${total} = ${foot}.`,`Badminton: ${pct}% of ${total} = ${bad}.`,`Difference: ${bad} − ${foot} = ${bad-foot}.`],
  check:`1/4 is 25%, and ${pct}% − 25% = ${pct-25}% of ${total} = ${bad-foot}.`,
  wrong:trap(fmt(bad-foot),[[pct-25,`That is the difference as a percentage. Find it as a number of pupils: ${pct-25}% of ${total}.`]])};
};

// ------------------------------------------------------------------- time

const homeworkMinutes:Make=r=>{
 const [x]=people(r,1),start=19*60+5*r.int(0,11),dur=5*r.int(12,30),end=start+dur,brk=r.pick([10,15,20,25]),ans=dur-brk;
 return {name:'time-net-duration',prompt:`${x} started homework at ${clock12(start)} and finished at ${clock12(end)}, with a ${brk}-minute break in between. For how many minutes did ${x} actually work?`,answer:fmt(ans),unit:'minutes',strategy:'Find the whole time, then remove the break',
  hints:[`Find the time from ${clock12(start)} to ${clock12(end)}.`,'Count on to the next hour first, then to the finish.',`The time from start to finish is ${dur} minutes. The break was not working time.`],
  steps:[`From ${clock12(start)} to ${clock12(end)} is ${dur} minutes.`,`Take away the break: ${dur} − ${brk} = ${ans} minutes.`],
  check:`${ans} minutes of work and a ${brk}-minute break make ${dur} minutes, from ${clock12(start)} to ${clock12(end)}.`,
  wrong:trap(fmt(ans),[[dur,'That includes the break. Take the break away.'],[dur+brk,'The break was time spent not working, so take it away rather than add it.']])};
};
const overnightFlight:Make=r=>{
 const dep=21*60+5*r.int(0,35),arr=5*r.int(3,40),ans=24*60-dep+arr;
 return {name:'time-overnight',prompt:`A flight leaves at ${clock24(dep)} and lands at ${clock24(arr)} the next day. How long is the flight, in minutes?`,answer:fmt(ans),unit:'minutes',strategy:'Split the time at midnight',
  hints:[`Count from ${clock24(dep)} up to midnight, 24:00.`,`From ${clock24(dep)} to 24:00 is ${24*60-dep} minutes.`,`Then count from 00:00 to ${clock24(arr)}.`],
  steps:[`${clock24(dep)} to midnight: ${24*60-dep} minutes.`,`Midnight to ${clock24(arr)}: ${arr} minutes.`,`Flight: ${24*60-dep} + ${arr} = ${ans} minutes.`],
  check:`${ans} minutes is ${Math.floor(ans/60)} h ${ans%60} min; ${clock24(dep)} plus that is ${clock24(arr)} the next day.`,
  wrong:trap(fmt(ans),[[Math.abs(dep-arr),'Subtracting the clock times does not work across midnight. Count up to midnight, then on from midnight.']])};
};
const lessonsWithBreaks:Make=r=>{
 const n=r.int(3,5),len=5*r.int(6,9),brk=5*r.int(1,3),ans=n*len+(n-1)*brk;
 return {name:'time-fence-post',prompt:`A school morning has ${n} lessons of ${len} minutes each, with a ${brk}-minute break between one lesson and the next. How many minutes are there from the start of the first lesson to the end of the last lesson?`,answer:fmt(ans),unit:'minutes',strategy:'Draw it out and count the gaps',
  hints:['Sketch the morning: lesson, break, lesson, break, …',`With ${n} lessons, how many breaks come between them?`,`There are ${n-1} breaks, one fewer than the number of lessons.`],
  steps:[`Lessons: ${n} × ${len} = ${n*len} minutes.`,`Breaks between lessons: ${n-1} × ${brk} = ${(n-1)*brk} minutes.`,`Total: ${n*len} + ${(n-1)*brk} = ${ans} minutes.`],
  check:`Lesson, break, lesson… shows ${n} lessons and ${n-1} breaks.`,
  wrong:trap(fmt(ans),[[n*(len+brk),`There are breaks only between lessons, so ${n-1} breaks, not ${n}.`],[n*len,'The breaks happen between the first and last lesson, so include them.']])};
};
const twoShows:Make=r=>{
 const shows=[['A puppet show',30],['A magic show',60],['A sing-along',30],['A science show',60]] as const;let i=r.int(0,3),j=r.int(0,3);while(i===j)j=r.int(0,3);
 const [a,da]=shows[i],[b,db]=shows[j],ans=da+db,word=(m:number)=>m===30?'half an hour':'1 hour';
 return {name:'time-hours-minutes',prompt:`${a} lasts ${word(da)}. ${b} lasts ${word(db)} and starts as soon as the first show ends. How many minutes do the two shows last altogether?`,answer:fmt(ans),unit:'minutes',strategy:'Change hours into minutes',
  hints:['Change each length of time into minutes.','1 hour is 60 minutes, and half an hour is 30 minutes.',`Add ${da} and ${db} minutes.`],
  steps:[`${a}: ${word(da)} = ${da} minutes.`,`${b}: ${word(db)} = ${db} minutes.`,`Together: ${da} + ${db} = ${ans} minutes.`],
  check:`${ans} minutes is ${ans>=60?`${Math.floor(ans/60)} hour${ans>=120?'s':''}${ans%60?` and ${ans%60} minutes`:''}`:`${ans} minutes`}.`,
  wrong:trap(fmt(ans),[[ans/60,'Give the answer in minutes: 1 hour is 60 minutes.'],[(da===60?1:30)+(db===60?1:30),'Hours and minutes are different units. Change the hours into minutes before adding.']])};
};

// ------------------------------------------------------- length, mass, volume

const lengthChain:Make=r=>{
 const pencil=r.int(10,15),shorter=r.int(3,6),crayon=pencil-shorter,longer=r.int(4,9),straw=crayon+longer;
 return {name:'length-chain',prompt:`A pencil is ${pencil} cm long. A crayon is ${shorter} cm shorter than the pencil. A straw is ${longer} cm longer than the crayon. How long is the straw?`,answer:fmt(straw),unit:'cm',strategy:'Find the middle length first',
  hints:['The straw is compared with the crayon, so find the crayon first.',`The crayon is ${pencil} − ${shorter} cm.`,`The crayon is ${crayon} cm. Now add ${longer} cm.`],
  steps:[`Crayon: ${pencil} − ${shorter} = ${crayon} cm.`,`Straw: ${crayon} + ${longer} = ${straw} cm.`],
  check:`${straw} − ${longer} = ${crayon}, and ${crayon} + ${shorter} = ${pencil}.`,
  wrong:trap(fmt(straw),[[pencil+longer,'The straw is compared with the crayon, not the pencil. Find the crayon first.'],[pencil-shorter-longer,'The straw is longer than the crayon, so add.']])};
};
const endToEnd:Make=r=>{
 const a=r.int(8,15),b=r.int(5,12),d=r.int(2,6),R=a+b-d;
 return {name:'length-end-to-end',prompt:`Two sticks are ${a} cm and ${b} cm long. They are placed end to end. How much longer is the joined stick than a ${R} cm ruler?`,answer:fmt(d),unit:'cm',strategy:'Join, then compare',
  hints:['First find the length of the joined stick.',`${a} + ${b} = ${a+b} cm.`,`Compare ${a+b} cm with ${R} cm.`],
  steps:[`Joined stick: ${a} + ${b} = ${a+b} cm.`,`Difference: ${a+b} − ${R} = ${d} cm.`],
  check:`${R} + ${d} = ${a+b}.`,
  wrong:trap(fmt(d),[[a+b,'That is the length of the joined stick. Compare it with the ruler.']])};
};
const ribbonCm:Make=r=>{
 const piece=r.pick([20,25,40,50]);let total=r.int(2,6);if(piece===40&&total%2===1)total++;const ans=total*100/piece,[x]=people(r,1);
 return {name:'measure-convert-share',prompt:`A ribbon is ${total} m long. ${x} cuts it into pieces that are each ${piece} cm long. How many pieces does ${x} get?`,answer:fmt(ans),strategy:'Use the same unit',
  hints:['Metres and centimetres must be the same unit before dividing.',`1 m = 100 cm, so ${total} m = ${total*100} cm.`,`How many ${piece} cm pieces are in ${total*100} cm?`],
  steps:[`${total} m = ${total*100} cm.`,`${total*100} ÷ ${piece} = ${ans} pieces.`],
  check:`${ans} × ${piece} cm = ${total*100} cm = ${total} m.`,
  wrong:trap(fmt(ans),[[total*10/piece,'1 m is 100 cm, not 10 cm.']])};
};
const tinsInBox:Make=r=>{
 const n=r.int(4,8),tin=r.int(3,9)*50,box=r.pick([200,250,300,400,500]),total=n*tin+box,kg=Math.floor(total/1000),g=total%1000;
 return {name:'measure-mass-unit',prompt:`A box holds ${n} identical tins. The box and tins together have a mass of ${kg?`${kg} kg ${g} g`:`${g} g`}. The empty box has a mass of ${box} g. What is the mass of one tin, in grams?`,answer:fmt(tin),unit:'g',strategy:'Remove what is not part of the equal groups',
  hints:[`Change the total into grams: ${kg?`${kg} kg = ${kg*1000} g`:'it is already in grams'}.`,`Take away the empty box: ${total} − ${box}.`,`Share the tins' mass equally among ${n} tins.`],
  steps:[`Total: ${total} g.`,`Tins only: ${total} − ${box} = ${total-box} g.`,`One tin: ${total-box} ÷ ${n} = ${tin} g.`],
  check:`${n} × ${tin} g + ${box} g = ${total} g.`,
  wrong:trap(fmt(tin),[[total/n,'The box is not a tin. Take its mass away before sharing.']])};
};
const jugPour:Make=r=>{
 const L=r.int(1,3),m=r.int(1,9)*100,total=L*1000+m,pour=50*r.int(4,16),left=total-pour,[x]=people(r,1);
 return {name:'measure-compound',prompt:`A jug contains ${L} litre${L>1?'s':''} ${m} ml of water. ${x} pours out ${pour} ml. How many millilitres of water are left?`,answer:fmt(left),unit:'ml',strategy:'Change to one unit first',
  hints:[`1 litre = 1000 ml, so ${L} litre${L>1?'s':''} ${m} ml = ${total} ml.`,`Now take away ${pour} ml.`,`${total} − ${pour}.`],
  steps:[`${L} litre${L>1?'s':''} ${m} ml = ${L*1000} ml + ${m} ml = ${total} ml.`,`Left: ${total} − ${pour} = ${left} ml.`],
  check:`${left} + ${pour} = ${total} ml.`,
  wrong:trap(fmt(left),[[L*100+m-pour,'1 litre is 1000 ml, not 100 ml.']])};
};

// ------------------------------------------------------------ area and volume

const squareFromPerimeter:Make=r=>{
 const side=r.int(4,15),perim=4*side,ans=side*side;
 return {name:'area-from-perimeter',prompt:`A square has a perimeter of ${perim} cm. What is its area?`,answer:fmt(ans),unit:'cm²',strategy:'Use the perimeter to find the side',
  hints:['All four sides of a square are equal.',`One side is ${perim} ÷ 4 = ${side} cm.`,'Area of a square = side × side.'],
  steps:[`One side: ${perim} ÷ 4 = ${side} cm.`,`Area: ${side} × ${side} = ${ans} cm².`],
  check:`Perimeter 4 × ${side} = ${perim} cm; area ${side} × ${side} = ${ans} cm².`,
  wrong:trap(fmt(ans),[[perim,'That is the perimeter. Find one side, then multiply it by itself.'],[side,'That is the length of one side. Area is side × side.']])};
};
const lengthTimesWidth:Make=r=>{
 const w=r.int(3,12),k=r.pick([2,3]),l=k*w,perim=2*(l+w),ans=l*w;
 return {name:'area-units-perimeter',prompt:`The length of a rectangle is ${times(k)} its width. Its perimeter is ${perim} cm. Find its area.`,answer:fmt(ans),unit:'cm²',strategy:'Units and parts',
  hints:[`Let the width be 1 unit, so the length is ${units(k)}.`,`The perimeter has 2 widths and 2 lengths: ${units(2+2*k)}.`,`${units(2+2*k)} = ${perim} cm.`],
  steps:[`Width = 1 unit, length = ${units(k)}.`,`Perimeter = 2 × (1 + ${k}) = ${units(2+2*k)} = ${perim} cm, so 1 unit = ${w} cm.`,`Width ${w} cm, length ${l} cm.`,`Area: ${l} × ${w} = ${ans} cm².`],
  check:`2 × (${l} + ${w}) = ${perim} cm, and ${l} is ${times(k)} ${w}.`,
  wrong:trap(fmt(ans),[[perim,'That is the perimeter. Find the length and width, then multiply.'],[(perim/4)**2,'That treats the rectangle as a square. Its length is '+times(k)+' its width, so use units for the two sides.']])};
};
const pathAround:Make=r=>{
 const L=r.int(8,20),W=r.int(5,L-2),p=r.pick([1,2]),outer=(L+2*p)*(W+2*p),ans=outer-L*W;
 return {name:'area-path',prompt:`A rectangular garden measures ${L} m by ${W} m. A path ${p} m wide runs all the way round the outside of the garden. What is the area of the path?`,answer:fmt(ans),unit:'m²',strategy:'Outer area minus inner area',
  hints:['The garden and the path together make a bigger rectangle.',`The path adds ${p} m on both sides, so the big rectangle is ${L+2*p} m by ${W+2*p} m.`,'Take the garden away from the big rectangle.'],
  steps:[`Big rectangle: ${L+2*p} m by ${W+2*p} m, area ${outer} m².`,`Garden: ${L} × ${W} = ${L*W} m².`,`Path: ${outer} − ${L*W} = ${ans} m².`],
  check:`The path is two long strips of ${L+2*p} × ${p} and two short strips of ${W} × ${p}: ${2*(L+2*p)*p} + ${2*W*p} = ${ans} m².`,
  wrong:trap(fmt(ans),[[(L+p)*(W+p)-L*W,`The path is on both sides, so each length grows by ${2*p} m, not ${p} m.`],[2*(L+W)*p,'That misses the four corner squares of the path.']])};
};
const triangleInRectangle:Make=r=>{
 const L=2*r.int(3,8),H=r.int(4,12),ans=L*H/2;
 return {name:'area-half',prompt:`A rectangle is ${L} cm by ${H} cm. A triangle is drawn inside it: its base is one long side of the rectangle, and its top corner touches the opposite side. What area of the rectangle is not covered by the triangle?`,answer:fmt(ans),unit:'cm²',strategy:'Look for a half',
  hints:[`The triangle's base is ${L} cm and its height is the rectangle's height, ${H} cm.`,'A triangle with the same base and height as a rectangle covers half of it.',`So the uncovered part is the other half.`],
  steps:[`Rectangle: ${L} × ${H} = ${L*H} cm².`,`Triangle: 1/2 × ${L} × ${H} = ${ans} cm².`,`Not covered: ${L*H} − ${ans} = ${ans} cm².`],
  check:'The uncovered pieces fit together to make a triangle identical to the shaded one.',
  wrong:trap(fmt(ans),[[L*H,'That is the whole rectangle. Take the triangle away.']])};
};
const squareMatchesRectangle:Make=r=>{
 let l=r.int(6,15),w=r.int(3,l-1);if((l+w)%2)w++;if(w>=l)l+=2;const side=(l+w)/2;
 return {name:'shape-same-perimeter',prompt:`A rectangle measures ${l} cm by ${w} cm. A square has the same perimeter as the rectangle. How long is one side of the square?`,answer:fmt(side),unit:'cm',strategy:'Find the perimeter, then share it equally',
  hints:['Find the rectangle\'s perimeter first.',`2 × (${l} + ${w}) = ${2*(l+w)} cm.`,'A square\'s four sides are equal.'],
  steps:[`Rectangle perimeter: 2 × (${l} + ${w}) = ${2*(l+w)} cm.`,`Square side: ${2*(l+w)} ÷ 4 = ${side} cm.`],
  check:`4 × ${side} = ${4*side} cm, the same as the rectangle.`,
  wrong:trap(fmt(side),[[l*w,'That is the rectangle\'s area. The square has the same perimeter.'],[2*(l+w),'That is the whole perimeter. Share it among the four equal sides.']])};
};
const netArea:Make=r=>{
 const a=r.int(2,6),b=r.int(2,5),c=r.int(1,4),ans=2*(a*b+b*c+a*c);
 return {name:'solid-net-area',prompt:`A cuboid measures ${a} cm by ${b} cm by ${c} cm. Its net is cut out of card. What is the area of the net?`,answer:fmt(ans),unit:'cm²',strategy:'Count the faces in matching pairs',
  hints:['A cuboid has 6 faces, which come in 3 matching pairs.',`The pairs measure ${a} by ${b}, ${b} by ${c}, and ${a} by ${c}.`,'Find the area of each pair, then add.'],
  steps:[`${a} × ${b} faces: 2 × ${a*b} = ${2*a*b} cm².`,`${b} × ${c} faces: 2 × ${b*c} = ${2*b*c} cm².`,`${a} × ${c} faces: 2 × ${a*c} = ${2*a*c} cm².`,`Net: ${2*a*b} + ${2*b*c} + ${2*a*c} = ${ans} cm².`],
  check:`Six faces: two of each kind, ${ans} cm² in all.`,
  wrong:trap(fmt(ans),[[a*b*c,'That is the volume. The net is the area of all six faces.'],[a*b+b*c+a*c,'That counts only one face from each pair. A cuboid has 6 faces.']])};
};
const stoneRise:Make=r=>{
 const l=r.int(10,30),w=r.int(8,20),h=r.int(4,10),rise=r.int(1,4),ans=l*w*rise;
 return {name:'volume-displacement',prompt:`A rectangular tank is ${l} cm long and ${w} cm wide, and contains water ${h} cm deep. When a stone is put in, the water level rises to ${h+rise} cm. What is the volume of the stone?`,answer:fmt(ans),unit:'cm³',strategy:'The rise in water is the volume of the stone',
  hints:['The stone pushes the water up. The extra volume is the stone.',`The water rises by ${h+rise} − ${h} = ${rise} cm.`,`Volume of the rise: ${l} × ${w} × ${rise}.`],
  steps:[`Rise in water level: ${h+rise} − ${h} = ${rise} cm.`,`Volume of the stone: ${l} × ${w} × ${rise} = ${ans} cm³.`],
  check:`Water and stone ${l*w*(h+rise)} cm³ − water ${l*w*h} cm³ = ${ans} cm³.`,
  wrong:trap(fmt(ans),[[l*w*(h+rise),`That is the water and stone together. The stone accounts only for the ${rise} cm rise.`],[l*w*h,'That is the water before the stone went in.']])};
};
const pourIntoWider:Make=r=>{
 const a=r.int(8,15),b=r.int(8,15),c=2*r.int(5,10);
 return {name:'volume-transfer',prompt:`Tank A is ${a} cm by ${b} cm by ${c} cm and is full of water. All the water is poured into an empty Tank B whose base measures ${2*a} cm by ${b} cm. How deep is the water in Tank B?`,answer:fmt(c/2),unit:'cm',strategy:'The volume stays the same',
  hints:['Pouring does not change the volume of water.',`Volume: ${a} × ${b} × ${c} = ${a*b*c} cm³.`,`Depth in Tank B = volume ÷ base area (${2*a} × ${b}).`],
  steps:[`Water: ${a} × ${b} × ${c} = ${a*b*c} cm³.`,`Base of Tank B: ${2*a} × ${b} = ${2*a*b} cm².`,`Depth: ${a*b*c} ÷ ${2*a*b} = ${c/2} cm.`],
  check:`Tank B's base is twice Tank A's, so the same water is half as deep: ${c} ÷ 2 = ${c/2} cm.`,
  wrong:trap(fmt(c/2),[[c,'Tank B has a larger base, so the same water is shallower.'],[2*c,'A larger base spreads the water out, so it is shallower, not deeper.']])};
};
const cubesInBox:Make=r=>{
 const s=r.pick([2,3]),L=s*r.int(2,6),W=s*r.int(2,5),H=s*r.int(2,4),ans=(L/s)*(W/s)*(H/s);
 return {name:'volume-small-cubes',prompt:`How many ${s}-cm cubes fit exactly into a box measuring ${L} cm by ${W} cm by ${H} cm?`,answer:fmt(ans),strategy:'Count along each edge',
  hints:[`How many ${s}-cm cubes fit along each edge?`,`${L} ÷ ${s} = ${L/s}, ${W} ÷ ${s} = ${W/s}, ${H} ÷ ${s} = ${H/s}.`,'Multiply the three counts.'],
  steps:[`Along the length: ${L} ÷ ${s} = ${L/s}.`,`Along the width: ${W} ÷ ${s} = ${W/s}.`,`Along the height: ${H} ÷ ${s} = ${H/s}.`,`Cubes: ${L/s} × ${W/s} × ${H/s} = ${ans}.`],
  check:`${ans} cubes of ${s**3} cm³ each make ${ans*s**3} cm³ = ${L} × ${W} × ${H}.`,
  wrong:trap(fmt(ans),[[L*W*H/s,`A ${s}-cm cube has a volume of ${s**3} cm³, not ${s} cm³.`],[L*W*H,'That is the number of 1-cm cubes.']])};
};
const litresInTank:Make=r=>{
 // Whole or one-decimal litres: a primary pupil should not meet 13.125 litres here.
 const l=r.pick([20,25,40,50]),w=r.pick([10,20,25]);let h=r.int(4,30);while((l*w*h)%100)h++;const cm3=l*w*h;
 return {name:'volume-litres',prompt:`A tank is ${l} cm long and ${w} cm wide. It is filled with water to a depth of ${h} cm. How many litres of water are in the tank?`,answer:fmt(cm3/1000),unit:'litres',strategy:'Find the volume, then convert',
  hints:[`Volume of water: ${l} × ${w} × ${h} cm³.`,'1 litre = 1000 cm³.',`Divide the volume in cm³ by 1000.`],
  steps:[`Volume: ${l} × ${w} × ${h} = ${cm3} cm³.`,`Litres: ${cm3} ÷ 1000 = ${fmt(cm3/1000)} litres.`],
  check:`${fmt(cm3/1000)} litres × 1000 = ${cm3} cm³.`,
  wrong:trap(fmt(cm3/1000),[[cm3,'That is the volume in cm³. 1 litre is 1000 cm³.'],[cm3/100,'1 litre is 1000 cm³, not 100 cm³.']])};
};
const paintedCube:Make=r=>{
 const n=r.pick([3,4,5]),kind=r.pick(['three','two','one'] as const),ans=kind==='three'?8:kind==='two'?12*(n-2):6*(n-2)**2;
 return {name:'solid-painted-cube',prompt:`A large cube is built from ${n**3} small cubes, ${n} along each edge. The outside of the large cube is painted. How many small cubes have paint on exactly ${kind} face${kind==='one'?'':'s'}?`,answer:fmt(ans),strategy:'Sort the cubes by where they sit',
  hints:['Corner cubes, edge cubes and face cubes are painted differently.',kind==='three'?'A corner cube touches three faces. How many corners does a cube have?':kind==='two'?`A cube with exactly two painted faces sits on an edge, but not at a corner. Each edge has ${n} cubes, two of them corners.`:`A cube with exactly one painted face sits in the middle of a face. Each face has ${n} × ${n} cubes; take away the outside ring.`,kind==='three'?'Count the corners.':kind==='two'?`Each edge has ${n-2} such cubes, and a cube has 12 edges.`:`Each face has ${n-2} × ${n-2} = ${(n-2)**2} such cubes, and a cube has 6 faces.`],
  steps:kind==='three'?['Only the corner cubes have three painted faces.','A cube has 8 corners.','So 8 small cubes have exactly three painted faces.']:kind==='two'?[`Each edge has ${n} cubes; the 2 at the ends are corners, leaving ${n-2}.`,`A cube has 12 edges.`,`12 × ${n-2} = ${ans} small cubes have exactly two painted faces.`]:[`Each face has ${n} × ${n} cubes; the middle ${n-2} × ${n-2} = ${(n-2)**2} have only that face painted.`,'A cube has 6 faces.',`6 × ${(n-2)**2} = ${ans} small cubes have exactly one painted face.`],
  check:`Corners 8, edges ${12*(n-2)}, faces ${6*(n-2)**2}, hidden ${(n-2)**3}: ${8+12*(n-2)+6*(n-2)**2+(n-2)**3} = ${n**3}.`,
  wrong:trap(fmt(ans),kind==='three'?[[6,'A cube has 6 faces but 8 corners. The corner cubes have three painted faces.']]:kind==='two'?[[12*n,`The two cubes at the end of each edge are corners with three painted faces, so each edge has only ${n-2}.`]]:[[6*n*n,'Only cubes in the middle of each face have exactly one painted face; the outside ring touches other faces too.']])};
};

// ------------------------------------------------------------------- circles

const quarterInSquare:Make=r=>{
 const side=r.pick([7,14,21,28]),quarter=22*side*side/28,ans=side*side-quarter;
 return {name:'circle-outside-quarter',prompt:`A square has sides of ${side} cm. A quarter circle is drawn inside it, centred at one corner of the square with a radius of ${side} cm. Find the area of the square that is outside the quarter circle. Use π = 22/7.`,answer:fmt(ans),unit:'cm²',strategy:'Whole minus part',
  hints:['Find the area of the square and the area of the quarter circle.',`The quarter circle has radius ${side} cm: 1/4 × 22/7 × ${side} × ${side}.`,'Take the quarter circle away from the square.'],
  steps:[`Square: ${side} × ${side} = ${side*side} cm².`,`Quarter circle: 1/4 × 22/7 × ${side} × ${side} = ${fmt(quarter)} cm².`,`Outside: ${side*side} − ${fmt(quarter)} = ${fmt(ans)} cm².`],
  check:`${fmt(quarter)} + ${fmt(ans)} = ${side*side} cm², the whole square.`,
  wrong:trap(fmt(ans),[[quarter,'That is the quarter circle itself. Find the part of the square outside it.'],[side*side-22*side*side/7,'Only a quarter of the circle is inside the square.']])};
};
const squareTwoSemicircles:Make=r=>{
 const side=r.pick([7,14,21,28]),arcs=22*side/7,ans=arcs+2*side;
 return {name:'circle-composite-perimeter',prompt:`A figure is made of a square of side ${side} cm with a semicircle drawn on the outside of two opposite sides. Find the perimeter of the figure. Use π = 22/7.`,answer:fmt(ans),unit:'cm',strategy:'Trace the outside edge only',
  hints:['Trace around the outside of the figure. Which lines are inside?',`The two semicircles together make one full circle of diameter ${side} cm.`,'The two sides of the square covered by the semicircles are inside the figure.'],
  steps:[`Two semicircles = one circle: 22/7 × ${side} = ${fmt(arcs)} cm.`,`Straight sides on the outside: 2 × ${side} = ${2*side} cm.`,`Perimeter: ${fmt(arcs)} + ${2*side} = ${fmt(ans)} cm.`],
  check:`Only the arcs and the two uncovered sides of the square lie on the outside edge.`,
  wrong:trap(fmt(ans),[[arcs+4*side,'The two sides under the semicircles are inside the figure, so they are not part of the perimeter.'],[arcs/2+2*side,'There are two semicircles, which together make a whole circle.']])};
};
const areaFromCircumference:Make=r=>{
 const d=r.pick([14,28,42]),C=22*d/7,rad=d/2,ans=22*rad*rad/7;
 return {name:'circle-work-back',prompt:`The circumference of a circle is ${C} cm. Find its area. Use π = 22/7.`,answer:fmt(ans),unit:'cm²',strategy:'Work back to the radius',
  hints:['Circumference = π × diameter, so find the diameter first.',`Diameter = ${C} ÷ 22/7 = ${d} cm.`,'Area uses the radius, half the diameter.'],
  steps:[`Diameter: ${C} ÷ 22/7 = ${C} × 7/22 = ${d} cm.`,`Radius: ${d} ÷ 2 = ${rad} cm.`,`Area: 22/7 × ${rad} × ${rad} = ${fmt(ans)} cm².`],
  check:`A radius of ${rad} cm gives circumference 22/7 × ${d} = ${C} cm.`,
  wrong:trap(fmt(ans),[[22*d*d/7,'Area uses the radius, not the diameter.'],[d,'That is the diameter. Use it to find the radius, then the area.']])};
};

// ------------------------------------------------------------ angles, shapes

const straightLineUnits:Make=r=>{
 const k=r.pick([2,3,4]),choices=[30,40,50,60,70,80].filter(c=>(180-c)%(k+1)===0),fixed=r.pick(choices.length?choices:[30]),rest=180-fixed,b=rest/(k+1),a=k*b;
 return {name:'angle-units',prompt:`Angles a, b and ${fixed}° lie together on a straight line. Angle a is ${times(k)} angle b. Find angle a.`,answer:fmt(a),unit:'°',strategy:'Units and parts',
  hints:['Angles on a straight line add up to 180°.',`So a + b = 180° − ${fixed}° = ${rest}°.`,`a is ${units(k)} and b is 1 unit: ${units(k+1)} = ${rest}°.`],
  steps:[`a + b = 180° − ${fixed}° = ${rest}°.`,`${units(k+1)} = ${rest}°, so 1 unit = ${b}°.`,`a = ${k} × ${b}° = ${a}°.`],
  check:`${a}° + ${b}° + ${fixed}° = 180°, and ${a}° is ${times(k)} ${b}°.`,
  wrong:trap(fmt(a),[[b,'That is angle b. Angle a is the larger one.'],[rest,'That is a and b together.']])};
};
const triangleUnits:Make=r=>{
 const k=r.pick([2,3,4]),opts=[40,50,60,70,80].filter(t=>(180-t)%(k+1)===0),third=r.pick(opts.length?opts:[60]),small=(180-third)/(k+1),big=k*small,largest=Math.max(big,third);
 return {name:'triangle-units',prompt:`In a triangle, one angle is ${times(k)} another angle. The third angle is ${third}°. Find the largest angle of the triangle.`,answer:fmt(largest),unit:'°',strategy:'Units and parts',
  hints:['The angles of a triangle add up to 180°.',`The two unknown angles add up to 180° − ${third}° = ${180-third}°.`,`They are ${units(1)} and ${units(k)}: ${units(k+1)} = ${180-third}°.`],
  steps:[`Unknown angles: 180° − ${third}° = ${180-third}°.`,`${units(k+1)} = ${180-third}°, so 1 unit = ${small}°.`,`The angles are ${small}°, ${big}° and ${third}°.`,`The largest is ${largest}°.`],
  check:`${small}° + ${big}° + ${third}° = 180°.`,
  wrong:trap(fmt(largest),[[small,'That is the smallest angle.'],[big!==largest?big:-1,'Compare all three angles, including the third one.'],[third!==largest?third:-1,'Compare all three angles to find the largest.']])};
};
const isoscelesObtuse:Make=r=>{
 const v=r.pick([100,110,120,130,140]),base=(180-v)/2;
 return {name:'isosceles-reasoning',prompt:`One angle of an isosceles triangle is ${v}°. Find the size of each of the other two angles.`,answer:fmt(base),unit:'°',strategy:'Decide which angle is which',
  hints:[`Could there be two angles of ${v}°? Add them and see.`,`${v}° + ${v}° is more than 180°, so ${v}° must be the angle between the two equal sides.`,`The other two angles are equal and share 180° − ${v}°.`],
  steps:[`Two angles of ${v}° would add up to more than 180°, so there is only one.`,`The other two angles are equal.`,`Each is (180° − ${v}°) ÷ 2 = ${base}°.`],
  check:`${v}° + ${base}° + ${base}° = 180°.`,
  wrong:trap(fmt(base),[[v,`Two angles of ${v}° would add up to more than 180°.`],[180-v,'That is both angles together. They are equal, so halve it.']])};
};
const parallelogramDiff:Make=r=>{
 const diff=r.pick([20,30,40,50,60,80]),small=(180-diff)/2,large=small+diff;
 return {name:'parallelogram-units',prompt:`In a parallelogram, one angle is ${diff}° larger than a neighbouring angle. Find the larger angle.`,answer:fmt(large),unit:'°',strategy:'Use the angle property, then compare',
  hints:['Neighbouring angles in a parallelogram add up to 180°.',`Take away the extra ${diff}°: two equal small angles make 180° − ${diff}°.`,`The smaller angle is ${small}°.`],
  steps:['Neighbouring angles add up to 180°.',`Two smaller angles: 180° − ${diff}° = ${180-diff}°, so the smaller angle is ${small}°.`,`The larger angle: ${small}° + ${diff}° = ${large}°.`],
  check:`${small}° + ${large}° = 180°, and ${large}° − ${small}° = ${diff}°.`,
  wrong:trap(fmt(large),[[small,'That is the smaller angle.'],[180-diff,'That is two smaller angles together.']])};
};
const clockTurns:Make=r=>{
 const h=r.int(1,11),startQ=r.int(0,3),turns=r.int(1,3),start=h*60+startQ*15,end=start+turns*15;
 const show=(m:number)=>`${Math.floor(m/60)%12||12}:${String(m%60).padStart(2,'0')}`;
 return {name:'angle-clock',prompt:`The minute hand of a clock moves from ${show(start)} to ${show(end)}. Through how many right angles does it turn?`,answer:fmt(turns),strategy:'Picture the clock face in quarters',
  hints:['A full turn of the minute hand is 4 right angles.','Each quarter of an hour, 15 minutes, is one right angle.',`From ${show(start)} to ${show(end)} is ${turns*15} minutes.`],
  steps:[`${show(start)} to ${show(end)} is ${turns*15} minutes.`,'Each 15 minutes is a quarter turn, which is one right angle.',`${turns*15} ÷ 15 = ${turns} right angle${turns>1?'s':''}.`],
  check:`${turns} quarter turn${turns>1?'s':''} of the minute hand cover${turns>1?'':'s'} ${turns*15} minutes.`,
  wrong:trap(fmt(turns),[[turns*15,'That is the number of minutes. Each 15 minutes is one right angle.']])};
};
const roadAcrossRails:Make=r=>{
 const n=r.int(2,4),ans=4*n;
 return {name:'lines-right-angles',prompt:`A straight road crosses ${n} parallel railway lines, meeting each one at a right angle. How many right angles are formed altogether?`,answer:fmt(ans),strategy:'Look at one crossing first',
  hints:['Sketch one crossing: a road meeting one railway line at a right angle.','How many right angles are at that one crossing?',`There are 4 at each crossing, and ${n} crossings.`],
  steps:['Where two perpendicular lines cross, they make 4 right angles.',`The road crosses ${n} railway lines.`,`4 × ${n} = ${ans} right angles.`],
  check:'Every crossing looks the same, because the railway lines are parallel.',
  wrong:trap(fmt(ans),[[n,'Each crossing makes four right angles, one in each corner.'],[2*n,'Look at all four corners of each crossing.']])};
};
const symmetryCount:Make=r=>{
 const [shape,lines]=r.pick([['a square',4],['a rectangle that is not a square',2],['an equilateral triangle',3],['a regular hexagon',6],['an isosceles triangle that is not equilateral',1]] as const);
 return {name:'symmetry-count',prompt:`How many lines of symmetry does ${shape} have?`,answer:String(lines),choices:['1','2','3','4','6'],strategy:'Test each possible fold',
  hints:['A line of symmetry folds the shape into two halves that match exactly.','Try folds through corners and through the middles of sides.','Count only the folds that match exactly.'],
  steps:[`Try folding ${shape} along each possible line.`,`Exactly ${lines} fold${lines>1?'s':''} make${lines>1?'':'s'} the two halves match.`,`So ${shape} has ${lines} line${lines>1?'s':''} of symmetry.`],
  check:'Each line of symmetry makes the two halves match when folded.',
  wrong:trap(String(lines),lines===2?[['4','A rectangle\'s diagonals do not fold it into matching halves. Only the two lines through the middles of opposite sides do.']]:[])};
};
const shapePattern:Make=r=>{
 const seq=r.pick([['circle','square','triangle'],['square','circle'],['triangle','triangle','square'],['circle','circle','square','triangle']]),n=r.int(10,20),ans=seq[(n-1)%seq.length],len=seq.length,uniq=[...new Set(seq)];
 return {name:'pattern-nth',prompt:`A pattern repeats: ${seq.join(', ')}, ${seq.join(', ')}, … What is the ${ordinal(n)} shape?`,answer:ans,choices:uniq,strategy:'Find the repeating part, then use division',
  hints:[`The repeating part has ${len} shapes.`,`After every ${len} shapes, the pattern starts again.`,`${n} ÷ ${len} = ${Math.floor(n/len)} remainder ${n%len}.`],
  steps:[`The pattern repeats every ${len} shapes: ${seq.join(', ')}.`,`${n} ÷ ${len} = ${Math.floor(n/len)} remainder ${n%len}.`,n%len===0?`A remainder of 0 means the ${ordinal(n)} shape is the last in the repeating part: ${ans}.`:`A remainder of ${n%len} means the ${ordinal(n)} shape is shape number ${n%len} in the repeating part: ${ans}.`],
  check:`Count on from the ${ordinal(Math.floor(n/len)*len)} shape, which ends a repeat.`,
  wrong:{}};
};

// ---------------------------------------------------------------- the bank

type Bank=(c:Ctx)=>Make[];
const BANK:Record<string,Bank>={
 WN:c=>c.eff<=1?[moreThenTotal,digitPuzzle,birdsTwoChanges]:c.eff===2?[digitPuzzle,largestEven,patternTerm]:[largestEven,roundingRange,patternTerm,chainComparison],
 AS:c=>c.eff<=1?[birdsTwoChanges,moreThenTotal,digitPuzzle]:c.eff===2?[moreThenTotal,workBackwards,digitPuzzle]:[chainComparison,workBackwards,digitPuzzle],
 MD:c=>c.eff<=1?[bagsLessSome,birdsTwoChanges,moreThenTotal]:c.eff===2?[bagsLessSome,roundUpRemainder,packBoxes]:c.eff<=4?[roundUpRemainder,packBoxes,bestBuy,hallSeats]:[bestBuy,hallSeats,printerRate],
 FACT:()=>[greatestBags,busesTogether,patternTerm],
 FRAC:c=>c.eff<=2?[fractionLeftOfWhole,birdsTwoChanges,moreThenTotal]:c.eff===3?[fractionLeftOfWhole,remainderForward,equalParts]:c.eff===4?[remainderForward,equalParts,fractionLeftOfWhole]:/divide|division/.test(c.objective)?[ribbonPieces,remainderBackward,equalParts]:[remainderBackward,equalParts,ribbonPieces],
 DEC:c=>c.eff<=4?[pensAndRuler,decimalRoundRange,jugGlasses]:[pensAndRuler,jugGlasses,decimalRoundRange],
 MONEY:c=>c.eff<=1?[changeFromNote,moreThenTotal,birdsTwoChanges]:c.eff===2?[changeFromNote,savingWeeks,unitScale]:[unitScale,savingWeeks,pensAndRuler],
 PCT:c=>c.eff<=5?[percentOfRest,discountThenGst,originalFromChange]:[originalFromChange,percentRemainderBackward,discountThenGst],
 RATE:()=>[printerRate,eggsCents,twoTaps],
 RATIO:c=>/divide/.test(c.objective)?[shareDifference,transferEqual,addedKeepsOther]:/equivalent|simplif|interpret/.test(c.objective)?[combineRatios,shareDifference,addedKeepsOther]:[transferEqual,addedKeepsOther,combineRatios],
 ALG:()=>[penAndBook,agesSum,substituteTwo],
 AVG:()=>[averageAddOne,averageTarget,graphMissingForAverage],
 TIME:c=>c.eff<=1?[twoShows,birdsTwoChanges,moreThenTotal]:c.eff===2?[twoShows,homeworkMinutes,lessonsWithBreaks]:[homeworkMinutes,lessonsWithBreaks,overnightFlight],
 LENGTH:()=>[lengthChain,endToEnd,birdsTwoChanges],
 MEASURE:c=>c.eff<=2?[ribbonCm,lengthChain,endToEnd]:[jugPour,tinsInBox,ribbonCm],
 AREA:c=>c.eff<=3?[squareFromPerimeter,squareMatchesRectangle,lengthTimesWidth]:c.eff===4?[lengthTimesWidth,pathAround,squareFromPerimeter]:[triangleInRectangle,pathAround,lengthTimesWidth],
 VOL:c=>/convert|litre/.test(c.objective)?[litresInTank,stoneRise,pourIntoWider]:[stoneRise,pourIntoWider,cubesInBox,paintedCube],
 CIRCLE:()=>[quarterInSquare,squareTwoSemicircles,areaFromCircumference],
 ANGLE:c=>c.eff<=3?[clockTurns,roadAcrossRails,symmetryCount]:c.eff===4?[straightLineUnits,clockTurns,roadAcrossRails]:[straightLineUnits,triangleUnits,parallelogramDiff],
 SHAPE:c=>c.eff<=2?[shapePattern,symmetryCount,twoShows]:c.eff<=4?[squareMatchesRectangle,symmetryCount,shapePattern]:[triangleUnits,isoscelesObtuse,parallelogramDiff],
 LINES:()=>[roadAcrossRails,clockTurns,symmetryCount],
 SYM:()=>[symmetryCount,shapePattern,roadAcrossRails],
 SOLID:()=>[paintedCube,netArea,cubesInBox],
 GRAPH:c=>c.eff<=2?[pictureKey,birdsTwoChanges,moreThenTotal]:c.eff<=5?[pictureKey,graphMissingTotal,averageAddOne]:[graphMissingForAverage,pieFractionPercent,pictureKey],
};
/** The problems a lesson draws from, easiest year-appropriate set when a topic has none of its own. */
export function challengeMakers(code:string,context:ChallengeContext):Make[]{
 const c:Ctx={...context,objective:context.objective.toLowerCase(),eff:context.foundation?context.level-1:context.level};
 return (BANK[code]??(()=>c.eff<=2?[birdsTwoChanges,moreThenTotal,digitPuzzle]:[workBackwards,chainComparison,patternTerm]))(c);
}
export const CHALLENGE_COUNT=3;

/** Item `index` of a lesson's challenge set: each index draws a different kind of problem. */
export function challengeItem(lessonId:string,code:string,context:ChallengeContext,seed:number,index:number):Item{
 const makers=challengeMakers(code,context),c:Ctx={...context,objective:context.objective.toLowerCase(),eff:context.foundation?context.level-1:context.level};
 const r=rngFor(lessonId,seed,index,'challenge-v1'),offset=rngFor(lessonId,seed,0,'challenge-order').int(0,makers.length-1);
 const p=makers[(offset+index)%makers.length](r,c);
 return {key:`challenge-${index}`,prompt:p.prompt,answer:p.answer,unit:p.unit,choices:p.choices,exact:/^\d+:\d+$/.test(p.answer)||undefined,
  hints:[`Strategy: ${p.strategy}.`,...p.hints],steps:p.steps,check:p.check,wrong:p.wrong&&Object.keys(p.wrong).length?p.wrong:undefined,rep:'story',kind:`challenge:${p.name}`};
}
/** A lesson's challenge stage, offered after the lesson rather than inside it. */
export function challengeStage(lessonId:string,code:string,context:ChallengeContext):Stage{
 return {kind:'practice',mode:'independent',challenge:true,title:'Challenge problems',
  text:'Each problem needs more than one step. Read it twice, decide what you need to find, then plan before you calculate. The strategy and clues are there when you want them.',
  gen:(seed,index)=>challengeItem(lessonId,code,context,seed,index),count:CHALLENGE_COUNT,
  flow:{phase:'check',label:'Stretch your thinking',transition:'These problems take the idea further. Each one combines it with something you already know and needs more than one step.'}};
}
