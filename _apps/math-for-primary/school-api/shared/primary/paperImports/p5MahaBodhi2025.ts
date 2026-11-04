import {Rng,hashString} from '../../engine/random';
import type {Picture,Question} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {P5MahaBodhiPicture} from './p5MahaBodhiPicture';
import {P5_MAHA_BODHI_2025_PARTS} from './p5MahaBodhi2025Meta';
export {P5_MAHA_BODHI_2025_PARTS,P5_MAHA_BODHI_2025_SOURCE,type MahaBodhiPart} from './p5MahaBodhi2025Meta';
export type MahaBodhiQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:Picture|P5MahaBodhiPicture;workedSteps:{text:string;equation?:string;picture?:Picture|P5MahaBodhiPicture}[]};
const cards=(heading:string,c:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:c});
const money=(c:number)=>(c/100).toFixed(2);
/** All 12 PDF pages visually reviewed. Original words, variable quantities and SVG art.
 * Complete coverage: 10 numbered questions / 13 response units. Private provenance
 * is .generated/paper-imports/p5-maha-bodhi-2025-review.json. Source Q3 key divisor
 * is misprinted as 5, not 50; its final $3.40 is correct. No source scans shipped. */
export function makeP5MahaBodhi2025(part:string,seed:number,index=0):MahaBodhiQuestion{
 if(!P5_MAHA_BODHI_2025_PARTS.some(p=>p.id===part))throw Error(`Unknown P5 Maha Bodhi part: ${part}`);
 const group=part.replace(/[ab]$/,''),r=new Rng(hashString(`p5-maha-bodhi-original-v1:${group}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,picture:MahaBodhiQuestion['picture'],hint:string,steps:MahaBodhiQuestion['workedSteps'],extra:Partial<MahaBodhiQuestion>={}):MahaBodhiQuestion=>({key:`p5-maha-bodhi-${part}:${seed}:${index}`,prompt,answer:String(answer),picture,hint,workedSteps:steps,explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra});
 if(group==='1'){
  const rate=r.pick([4,5,7,8,9,11,12,14,15]),total=rate*60;
  return make('How many litres flow into the pond each minute?',rate,cards('A pump runs steadily',[{label:'Time',value:'1 hour',icon:'clock'},{label:'Water pumped',value:`${total} litres`,icon:'water'}]),'Change one hour to minutes, then divide the water equally between the minutes.',[{text:'There are 60 minutes in an hour.',equation:'1 hour = 60 minutes'},{text:'Divide the total volume by the number of minutes.',equation:`${total} ÷ 60 = ${rate}`}],{unit:'litres per minute'});
 }
 if(group==='2'){
  const a=r.pick(Array.from({length:3601},(_,i)=>i+1200).filter(v=>v!==2579)),b=r.pick(Array.from({length:861},(_,i)=>i+120).filter(v=>v!==231)),raw=r.int(110001,890999),n=raw===173896?173897:raw;
  if(part==='2a')return make(`Calculate ${(a/100).toFixed(2)} + ${(b/100).toFixed(2)}.`,(a+b)/100,cards('Line up the decimal points',[{label:'First number',value:(a/100).toFixed(2)},{label:'Second number',value:(b/100).toFixed(2)}]),'Add the hundredths, tenths and whole-number places in columns.',[{text:'Treat both numbers as hundredths.',equation:`${a} + ${b} = ${a+b} hundredths`},{text:'Write the sum as a decimal.',equation:`${(a/100).toFixed(2)} + ${(b/100).toFixed(2)} = ${((a+b)/100).toFixed(2)}`}]);
  const answer=Math.floor((n+50)/100)/10;
  return make(`Round ${(n/1000).toFixed(3)} to the nearest tenth.`,answer,cards('Round a decimal',[{label:'Number',value:(n/1000).toFixed(3)}]),'Look at the hundredths digit to decide whether to increase the tenths digit.',[{text:'Find the digit in the hundredths place.',equation:`Hundredths digit: ${Math.floor(n/10)%10}`},{text:'A digit of 5 or more rounds up; otherwise keep the tenths digit.',equation:`${(n/1000).toFixed(3)} ≈ ${answer.toFixed(1)}`}]);
 }
 if(group==='3'){
  const firstMass=r.pick([200,250,400,500]),baseCents=r.pick([150,180,220,250,300]),blockMass=r.pick([25,40,75,100]),blockCents=r.pick([20,25,30,40,45]),blocks=r.int(2,7),extra=(blocks-1)*blockMass+r.int(1,blockMass-1),mass=firstMass+extra;
  return make(`What is the charge for delivering a ${mass} g parcel?`,money(baseCents+blocks*blockCents),{type:'maha-bodhi-p5',layout:'parcel',firstMass,baseCents,blockMass,blockCents},'The last partly used mass block is charged as one full block.',[{text:'Remove the mass covered by the first charge.',equation:`${mass} − ${firstMass} = ${extra} g`},{text:'Count every started additional block.',equation:`${extra} ÷ ${blockMass} gives ${blocks-1} full blocks and a remainder, so charge ${blocks} blocks.`},{text:'Add the initial and additional charges.',equation:`$${money(baseCents)} + ${blocks} × $${money(blockCents)} = $${money(baseCents+blocks*blockCents)}`}],{unit:'dollars'});
 }
 if(group==='4'){
  const ratio=r.pick([2,3]),small=r.pick([8,10,12,14,16,20,22].filter(n=>n*ratio!==36)),side=ratio*small,base=side+small,answer=base*side/2;
  return make('What is the area of shaded triangle AGD?',answer,{type:'maha-bodhi-p5',layout:'two-squares',side,ratio},'Use both squares to find DG. The perpendicular height is AD.',[{text:'Find the side of the smaller square.',equation:`${side} ÷ ${ratio} = ${small} cm`},{text:'Find the complete base DG.',equation:`${side} + ${small} = ${base} cm`},{text:'Use half of base times perpendicular height.',equation:`${base} × ${side} ÷ 2 = ${answer} cm²`}],{context:[`ABCD and EFGC are squares. AB is ${ratio} times EF. D, C and G are on a straight line.`],unit:'cm²'});
 }
 if(group==='5'){
  const width=r.pick([60,80,90,110,120]),height=r.pick([40,50,60,80]),extension=r.pick([20,30,50]),tipHeight=r.pick([10,20,30].filter(n=>n<height)),whole=width*height+extension*height/2,removed=width*tipHeight/2,answer=whole-removed;
  return make('Find the shaded area PQRT.',answer,{type:'maha-bodhi-p5',layout:'composite',width,height,extension,tipHeight},'Add the rectangle and triangle QRS, then subtract the unshaded triangle TSR.',[{text:'Find the area of rectangle PQST.',equation:`${width} × ${height} = ${width*height} m²`},{text:'Add triangle QRS using QS as its base.',equation:`${width*height} + ${height} × ${extension} ÷ 2 = ${whole} m²`},{text:'Triangle TSR has base TS and perpendicular height from R to line TS.',equation:`${width} × ${tipHeight} ÷ 2 = ${removed} m²`},{text:'Subtract the unshaded triangle.',equation:`${whole} − ${removed} = ${answer} m²`}],{context:['PQST is a rectangle. The dashed lines show perpendicular distances.'],unit:'m²'});
 }
 if(group==='6'){
  const side=r.pick([12,14,16,18,20]),height=r.pick([45,50,55,60,65]),multiple=r.pick([2,3,4,6]),waterHeight=r.int(8,25),water=side*side*waterHeight,capacity=side*side*height*multiple,picture:P5MahaBodhiPicture={type:'maha-bodhi-p5',layout:'containers',side,height,water,multiple};
  const steps=[{text:'Find the capacity of A from its square base and height.',equation:`${side} × ${side} × ${height} = ${side*side*height} cm³`},{text:`B holds ${multiple} times as much as A.`,equation:`${side*side*height} × ${multiple} = ${capacity} cm³`}];
  return make(part==='6a'?'What is the capacity of Container B?':'All the water in A is poured into empty Container B. How much more water fills B?',part==='6a'?capacity:capacity-water,picture,'Find A’s full capacity, then multiply to find B’s full capacity.',part==='6a'?steps:[...steps,{text:'Subtract only the water that was actually poured into B.',equation:`${capacity} − ${water} = ${capacity-water} cm³`}],{context:[`Container A has a square base with side ${side} cm and height ${height} cm. It contains ${water} cm³ of water. Empty Container B has ${multiple} times the capacity of A.`],unit:'cm³'});
 }
 if(group==='7'){
  const middle=r.pick([3,4]),large=r.pick([2,3,5]),units=r.int(25,90),bundle=10+middle*20+middle*large*50,total=bundle*units,answer=middle*large*units*50;
  return make('What is the total value of Priya’s 50-cent coins?',money(answer),cards('Priya’s coin collection',[{label:'Total value',value:`$${money(total)}`,icon:'coin'},{label:'20-cent coin count',value:`${middle} times the 10-cent coin count`},{label:'50-cent coin count',value:`${large} times the 20-cent coin count`}]),'Use one 10-cent coin as one count unit. Build a matching group of all three coins.',[{text:'One matching group has these counts.',equation:`10-cent: 1; 20-cent: ${middle}; 50-cent: ${middle*large}`},{text:'Find the value of one matching group.',equation:`10 + ${middle} × 20 + ${middle*large} × 50 = ${bundle} cents`},{text:'Find the number of groups.',equation:`${total} ÷ ${bundle} = ${units}`},{text:'Find the value of the 50-cent coins.',equation:`${units} × ${middle*large} × $0.50 = $${money(answer)}`}],{unit:'dollars'});
 }
 if(group==='8'){
  const h=r.pick([4,5]),heights=[h-1,h,h,1],target=r.pick([5,6,8,9]),layer=heights.reduce((a,b)=>a+b,0),cubes=layer*target,side=Math.max(heights.length,h,target),picture:P5MahaBodhiPicture={type:'maha-bodhi-p5',layout:'cube-growth',heights,depths:[1,2,3]};
  const steps=[{text:'Count the cubes in one stepped layer.',equation:`${heights.join(' + ')} = ${layer}`},{text:`Solid ${target} has ${target} identical layers.`,equation:`${layer} × ${target} = ${cubes}`}];
  return make(part==='8a'?`How many unit cubes make Solid ${target}?`:`What is the fewest unit cubes to add to Solid ${target} to make one complete cube?`,part==='8a'?cubes:side**3-cubes,picture,'The front shape stays the same. Each next solid adds one layer behind it.',part==='8a'?steps:[...steps,{text:'Keep all cubes in position. The smallest complete cube must cover the largest dimension.',equation:`Width ${heights.length}, height ${h}, depth ${target}: side ${side}`},{text:'Subtract the cubes already present.',equation:`${side} × ${side} × ${side} − ${cubes} = ${side**3-cubes}`}],{context:['The solids grow by adding one identical stepped layer behind the previous solid. Keep the existing cubes in place.'],unit:'unit cubes'});
 }
 if(group==='9'){
  const low=r.pick([3,5,6]),high=low+r.pick([4,6,10].filter(n=>low+n!==12)),pear=r.pick([120,140,160,200,240]),gap=r.pick([180,220,260,320,400]),melon=pear+gap,difference=(high-low)*gap;
  return make('What is the price of one mango?',money(melon),cards('Two purchases at one stall',[{label:'Asha buys',value:`${high} mangoes and ${low} pears`,icon:'fruit'},{label:'Ben buys',value:`${low} mangoes and ${high} pears`,icon:'fruit'},{label:'Ben pays less by',value:`$${money(difference)}`},{label:'One pear',value:`$${money(pear)}`}]),'Remove the common items. The remaining difference compares equal numbers of mangoes and pears.',[{text:'Cancel the same number of each fruit from both purchases.',equation:`${high} − ${low} = ${high-low} extra fruits of each kind`},{text:'Find how much more one mango costs than one pear.',equation:`$${money(difference)} ÷ ${high-low} = $${money(gap)}`},{text:'Add the price of one pear.',equation:`$${money(gap)} + $${money(pear)} = $${money(melon)}`}],{unit:'dollars'});
 }
 const side=r.pick([12,16,18,20,22,24,26]),area=side*side,extensionRatio=r.pick([.25,.375,.5]),triangle=area/4,answer=area-triangle;
 return make('Find the difference between areas X and Y.',answer,{type:'maha-bodhi-p5',layout:'overlap',area,extensionRatio},'Add the common overlap to both X and Y. Their difference becomes the square’s area minus triangle EBF’s area.',[{text:'Recover the side of the square.',equation:`${side} × ${side} = ${area}, so AB = ${side} cm`},{text:'E is the midpoint of AB.',equation:`EB = ${side} ÷ 2 = ${side/2} cm`},{text:'Triangle EBF has base EB and perpendicular height equal to the square side.',equation:`${side/2} × ${side} ÷ 2 = ${triangle} cm²`},{text:'The common overlap cancels in the difference.',equation:`X − Y = ${area} − ${triangle} = ${answer} cm²`}],{context:[`ABCD is a square with area ${area} cm². AE = EB. D, C and F lie on one straight line.`],unit:'cm²'});
}
