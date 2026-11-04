import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH5_UPPER_PATTERNS,type Batch5UpperId} from './batch5UpperMeta';
export {BATCH5_UPPER_PATTERNS,type Batch5UpperId} from './batch5UpperMeta';

/** Original numerical variants. Each card is independently answerable from its visible givens. */
export function makeBatch5Upper(id:Batch5UpperId,seed:number,index=0):Question {
 if(!BATCH5_UPPER_PATTERNS.some(p=>p.id===id)) throw Error(`Unknown batch 5 upper task: ${id}`);
 const group=id.startsWith('tank-')&&id!=='tank-to-fill'?'tank-scenarios':id.startsWith('pail-')?'pail-scenarios':id;
 const r=new Rng(hashString(`batch5-upper-v1:${group}:${seed}:${index}`));
 const make=(context:string[],prompt:string,answer:number,unit:string|undefined,hint:string,equation:string,choices?:number[],picture?:Question['picture']):Question=>{
  const fmt=(n:number)=>unit==='dollars'?n.toFixed(2):String(Number(n.toFixed(4)));
  const ans=fmt(answer), opts=choices ? r.shuffle([...new Set([answer,...choices,answer+1,answer+2,answer+3].map(fmt))].slice(0,4)):undefined;
  return {key:`batch5-upper:${id}:${seed}:${index}`,context,prompt,answer:ans,unit,hint,explanation:equation,workedSteps:[{text:hint,equation}],choices:opts,picture};
 };
 if(id==='divide-hundreds'){
  const divisor=r.pick([200,400,500]), quotient=r.int(1201,1999)/100, dividend=Math.round(divisor*quotient);
  return make([],`Find ${dividend} ÷ ${divisor}.`,quotient,undefined,'Divide both numbers by 100 first.',`${dividend} ÷ ${divisor} = ${quotient}`,[quotient/10,quotient*10,quotient+1]);
 }
 if(id==='reading-rate'){
  const rate=r.int(12,24)*5,minutes=r.int(2,4),target=r.int(5,8),words=rate*minutes,answer=rate*target;
  return make([`A pupil reads ${words} words in ${minutes} minutes at a constant rate.`],`How many words can the pupil read in ${target} minutes?`,answer,'words','Find the number of words read in one minute.',`${words} ÷ ${minutes} × ${target} = ${answer}`,[rate,words,words*target]);
 }
 if(id==='cuboid-volume'){
  const a=r.int(4,9),b=r.int(2,5),c=r.int(3,7),answer=a*b*c;
  return make([],`What is the volume of the cuboid?`,answer,'cm³','Multiply its length, width and height.',`${a} × ${b} × ${c} = ${answer}`,[a+b+c,a*b,answer*2],{type:'solid',shape:'cuboid',a,b,c});
 }
 if(id==='tank-to-fill'){
  const a=r.pick([30,50,60]),b=10,c=r.pick([20,30]),capacity=a*b*c,litres=r.int(2,capacity/1000-1),answer=capacity-litres*1000;
  return make([`A rectangular tank measures ${a} cm by ${b} cm by ${c} cm.`,`It contains ${litres} l of water.`],'How much more water is needed to fill it?',answer,'cm³','Find the tank capacity in cubic centimetres and subtract the water already in it.',`${a} × ${b} × ${c} − ${litres} × 1000 = ${answer}`,undefined,{type:'solid',shape:'cuboid',a,b,c});
 }
 if(id==='book-mass'){
  const n=r.pick([4,6,8]),empty=r.int(50,120)*0.01,each=r.int(5,25)*0.01,full=Number((empty+n*each).toFixed(2));
  return make([`An empty box has mass ${empty.toFixed(2)} kg.`,`The same box with ${n} identical books has mass ${full.toFixed(2)} kg.`],'What is the mass of each book?',each,'kg','Subtract the mass of the box, then divide equally.',`(${full.toFixed(2)} − ${empty.toFixed(2)}) ÷ ${n} = ${each.toFixed(2)}`);
 }
 if(id==='packing-time'){
  const base=r.int(3,9)*10,mins=r.int(8,22),factor=r.int(3,7),target=base*factor,answer=mins*factor;
  return make([`A machine packs ${base} packets in ${mins} minutes at a constant rate.`],`How long does it take to pack ${target} packets?`,answer,'min','Find how many times as many packets are needed.',`${target} ÷ ${base} = ${factor}; ${mins} × ${factor} = ${answer}`);
 }
 if(id==='parking-charge'){
  const first=r.int(20,48)*10,extra=r.int(4,12)*10,over=r.int(46,110),start=2,endHour=start+1+Math.floor(over/60),endMin=over%60,blocks=Math.ceil(over/15),ans=(first+blocks*extra)/100;
  return make([`Parking costs $${(first/100).toFixed(2)} for the first hour and $${(extra/100).toFixed(2)} for every additional 15 minutes or part thereof.`,`A car is parked from ${start}:00 pm to ${endHour}:${String(endMin).padStart(2,'0')} pm.`],'How much is the parking charge?',ans,'dollars','After the first hour, count every additional block of 15 minutes, including any part.',`$${(first/100).toFixed(2)} + ${blocks} × $${(extra/100).toFixed(2)} = $${ans.toFixed(2)}`);
 }
 if(id==='pail-difference'||id==='pail-bottles'){
  const initial=r.int(28,49)*100,poured=r.int(Math.floor(initial/200)+1,Math.floor(initial/100)-5)*100,left=initial-poured,bottle=r.pick([225,275,325,375,425]),answer=id==='pail-difference'?(poured-left)/1000:Math.floor(left/bottle);
  const context=[`Pail A contained ${(initial/1000).toFixed(1)} l of water.`,`${(poured/1000).toFixed(1)} l was poured from A into empty Pail B.`];
  if(id==='pail-difference')return make(context,'What is the difference between their volumes now?',answer,'l','Find the volume left in A, then compare it with B.',`${(poured/1000).toFixed(1)} − (${(initial/1000).toFixed(1)} − ${(poured/1000).toFixed(1)}) = ${answer}`);
  context.push(`The water left in A is poured into bottles of ${bottle} ml each.`);
  return make(context,'How many bottles can be filled completely?',answer,'bottles','Convert the water left in A to millilitres and count only complete bottles.',`${initial} − ${poured} = ${answer} × ${bottle} + ${(initial-poured)%bottle} ml; ${answer} complete bottles`);
 }
 const length=r.pick([25,29,33,37]),width=r.pick([15,19,25]),height=r.pick([9,15,21,27]),low=r.int(2,5),useLength=id==='tank-shorter'?length-8:length,n=id==='tank-fraction'?3:2,d=id==='tank-fraction'?4:3;
 const answer=useLength*width*(height*n/d-low);
 const context=[`A rectangular tank is ${length} cm long, ${width} cm wide and ${height} cm high.`,`It was 2/3 full of water. Water was poured out until the depth became ${low} cm.`];
 if(id==='tank-shorter')context.push(`Instead, suppose its length was ${useLength} cm, with everything else unchanged.`);
 if(id==='tank-fraction')context.push('Instead, suppose it was 3/4 full at first, with everything else unchanged.');
 return make(context,'What volume of water was poured out?',answer,'cm³','Find the starting water depth, subtract the final depth, then multiply by the base area.',`${useLength} × ${width} × (${height} × ${n}/${d} − ${low}) = ${Number(answer.toFixed(4))}`);
}
