import {Rng} from '../../engine/random';
import {joinCounters} from '../../engine/explain/visuals';
import type {Facet,Item,Tool} from '../model';

const selected=(n:number)=>Array.from({length:n},(_,i)=>i);
export const removal=(a:number,b:number):Tool=>({kind:'take-away',start:a,removed:selected(b)});
export const fraction=(n:number,d:number):Tool=>({kind:'fractions',denominators:[d],shaded:[n],hideValue:true});
export const triangle=(b:number,h:number):Tool=>({kind:'triangle-pair',base:b,height:h,joined:false});
function finish(item:Item,wrong:Record<string,string>,simpler?:Item):Item{
 return {...item,requiresModel:item.facet==='visual'||item.facet==='unfamiliar'||item.key.startsWith('fraction-')&&['missing','reasoning'].includes(item.facet??''),wrong:Object.fromEntries(Object.entries(wrong).filter(([a])=>a!==item.answer)),simpler};
}

/** Each facet changes what the child has to do, not only the random numbers. */
export function subtractionItem(seed:number,index:number,facet:Facet='direct',support=true):Item{
 const r=new Rng(seed+index*971),a=support?r.int(11,18):6,b=support?r.int(4,9):2,c=a-b,plus=facet==='direct'&&index%2===1;
 const tool=plus?{kind:'foundation-visual' as const,visual:joinCounters(c,b)}:removal(a,b);
 const check=`${c} + ${b} = ${a}. Putting the removed counters back restores the start.`;
 let item:Item={key:`subtract-${facet}-${index}`,facet,rep:'counters',prompt:plus?`What is ${c} + ${b}?`:`What is ${a} − ${b}?`,answer:String(plus?a:c),tool,
  hints:plus?[`Join the group of ${c} and the group of ${b}.`]:[`Start with ${a}. Take away ${b}.`,'Count only the blue counters without a cross.'],
  steps:plus?[`Start with ${c}.`, `Count on ${b} more.`,`The two parts make ${a} altogether.`]:[`Start with ${a} counters.`,`Cross out ${b}. Those counters are gone.`,`Count the ${c} counters without a cross.`],check,
  another:[{title:plus?'Use the subtraction fact':'Count back one at a time',steps:plus?[`${a} − ${b} = ${c}.`,`So joining ${c} and ${b} makes ${a}.`]:[`Start at ${a}.`,`Make ${b} backward jumps. Do not count the starting number as a jump.`,`You land on ${c}.`],tool:plus?removal(a,b):{kind:'line',min:0,max:20,start:a,jumps:Array(b).fill(-1)}}]};
 const wrong:Record<string,string>=plus?{[c]:'That is only the first group. Add the other group too.',[b]:'That is only the second group. Count both groups.',[a+1]:'Count each counter once. Check that you did not count the starting counter twice.'}:{[b]:`You counted the ${b} taken away. We need the counters that stay.`,[a]:`That is how many we started with. ${b} have been taken away.`,[a+b]:'That joins more counters. Here we are taking some away.',[c+1]:'A backward jump starts after the starting number. Count the jumps, not both endpoints.'};
 if(facet==='visual')item={...item,prompt:'How many blue counters are left?',answer:String(c)};
 if(facet==='word')item={...item,prompt:`There are ${a} books. ${b} are borrowed. How many books stay on the shelf?`,answer:String(c),rep:'story'};
 if(facet==='missing'){
  item={...item,prompt:`${c} + □ = ${a}. How many counters go in the box?`,answer:String(b),tool:{kind:'bond',whole:a,parts:[c,b],hide:'b',locked:true},rep:'number-bond',hints:[`The whole is ${a}. One part is ${c}. Find the other part.`],steps:[`Keep the known part ${c}.`,`Count from ${c} up to ${a}.`,`${b} more complete the whole.`],check:`${c} + ${b} = ${a}. Both parts make the whole.`};
  return finish(item,{[a]:`The box is one part, not the whole ${a}.`,[c]:'That part is already known. Find the other part.',[a+c]:'The whole is already given. Find what must be added to the known part.'},support?subtractionItem(0,0,'missing',false):undefined);
 }
 if(facet==='reasoning'||facet==='reverse'){
  const correct=`${c} + ${b} = ${a}`,back=`${c} + 1 = ${c+1}`,add=`${a} − ${b} = ${c}`;
  item={...item,prompt:`We found ${a} − ${b} = ${c}. Which check puts the counters back?`,answer:correct,choices:r.shuffle([correct,back,add]),exact:true,steps:[`We kept ${c} counters.`, `Put the ${b} removed counters back.`,`The whole must be ${a} again.`]};
  return finish(item,{[back]:`That puts back only one counter. Put back all ${b} that were removed.`,[add]:`That repeats the subtraction. Put the ${b} counters back with the ${c} that stayed.`},support?subtractionItem(0,0,'reasoning',false):undefined);
 }
 return finish(item,wrong,support?subtractionItem(0,plus?1:0,'direct',false):undefined);
}

export function fractionItem(seed:number,index:number,facet:Facet='visual',support=true):Item{
 const r=new Rng(seed+index*971),d=support?r.pick([3,4,5,6]):2,n=support?r.int(1,d-1):1,answer=`${n}/${d}`,tool=fraction(n,d);
 let item:Item={key:`fraction-${facet}-${index}`,facet,rep:'fraction-wall',prompt:'What fraction of this whole strip is blue?',answer,tool,
  hints:['Count all the equal parts, including the white parts.','Put that count at the bottom. Count the blue parts for the top.'],
  steps:[`The whole has ${d} equal parts.`,`${n} of those parts ${n===1?'is':'are'} blue.`,`Write ${n}/${d}: ${n} chosen ${n===1?'part':'parts'} out of ${d} equal parts.`],check:`${n} blue ${n===1?'part':'parts'} and ${d-n} white ${d-n===1?'part':'parts'} make all ${d} equal parts.`,
  another:[{title:'Say the fraction before writing it',steps:[`Say “${n} out of ${d} equal parts”.`,`The first number counts the blue parts. The second counts all the parts.`],tool:{kind:'fraction-pieces',widths:Array(d).fill(1),selected:selected(n),shape:'circle'}}]};
 let wrong:Record<string,string>={[`${d}/${n}`]:'The numbers are swapped. The top counts blue parts; the bottom counts all equal parts.',[`${n}/${d-n}`]:'The bottom includes blue and white parts. It does not count only white parts.',[`${d-n}/${d}`]:'You counted the white parts. We are naming the blue part.'};
 if(facet==='word')item={...item,prompt:`A sandwich is cut into ${d} equal pieces. Mei eats ${n} ${n===1?'piece':'pieces'}. What fraction of the sandwich does she eat?`,rep:'story'};
 if(facet==='unfamiliar')item={...item,prompt:'This time the whole is a circle. What fraction is blue?',tool:{kind:'fraction-pieces',widths:Array(d).fill(1),selected:selected(n),shape:'circle'},rep:'diagram'};
 if(facet==='missing'){
  item={...item,prompt:`The fraction is ${n}/□. What number belongs at the bottom?`,answer:String(d),steps:[`Count every equal part of the whole.`,`There are ${d} parts, including the white parts.`,`Write ${d} in the box.`]};
  wrong={[n]:'That counts the blue parts only. The bottom must count all equal parts.',[d-n]:'That counts only the white parts. Include the blue parts too.',[d+1]:'Count the spaces, not the dividing lines.'};
 }
 if(facet==='reasoning'){
  const correct='The two parts must be equal.',a='There are two parts, so yes.',b='The blue part is bigger, so yes.';
  item={...item,prompt:'Ali calls the blue part one half. What should we check?',answer:correct,choices:r.shuffle([correct,a,b]),exact:true,tool:{kind:'fraction-pieces',widths:[3,1],selected:[0]},rep:'diagram',hints:['A half is one of two equal parts. Compare the sizes.'],steps:['There are two parts, but they have different sizes.','We cannot call either piece one half.','For halves, cut the whole into two equal parts.'],check:'Two equal halves must cover the whole without gaps or overlaps.',another:[{title:'Compare with real halves',steps:['Here the whole has two equal pieces.','One chosen piece is one half. Compare it with the uneven cut above.'],tool:fraction(1,2)}]};
  wrong={[a]:'Counting two parts is not enough. They must have the same size.',[b]:'A larger piece is not a half just because it is blue. Both halves must be equal.'};
 }
 return finish(item,wrong,support?fractionItem(0,0,facet==='reasoning'?'visual':facet,false):undefined);
}

export function triangleItem(seed:number,index:number,facet:Facet='direct',support=true):Item{
 const r=new Rng(seed+index*971),b=support?r.pick([4,6,8,10]):4,h=support?r.int(2,7):2,rectangle=b*h,area=rectangle/2;
 let item:Item={key:`triangle-${facet}-${index}`,facet,rep:'diagram',prompt:`A triangle has base ${b} units and perpendicular height ${h} units. What is its area?`,answer:String(area),unit:'square units',tool:triangle(b,h),
  hints:['Imagine a matching triangle filling the other half of a rectangle.',`The rectangle has ${b} × ${h} square units. How much belongs to one triangle?`],
  steps:[`Two matching triangles make a ${b} by ${h} rectangle.`,`The rectangle covers ${rectangle} square units.`,`One triangle covers half: ${rectangle} ÷ 2 = ${area}.`],check:`${area} × 2 = ${rectangle}. Two triangle areas restore the rectangle area.`,
  another:[{title:'Find the rectangle first',steps:[`Find ${b} × ${h} = ${rectangle}.`,'Share this area equally between the two matching triangles.',`Each gets ${area} square units.`],tool:{kind:'triangle-pair',base:b,height:h,joined:true}}]};
 let wrong:Record<string,string>={[rectangle]:'That is the area of both triangles together. Share it equally between the two.',[b+h]:'Adding lengths does not count the surface. Find rows × columns, then take half.',[rectangle*2]:'The rectangle already contains two triangles. Divide its area by two; do not double it.'};
 if(facet==='visual')item={...item,prompt:'Read the base and perpendicular height from the picture. What is the blue triangle’s area?'};
 if(facet==='word')item={...item,prompt:`A triangular garden has a base of ${b} m. Its perpendicular height is ${h} m. How many square metres of grass cover it?`,unit:'m²',rep:'story',tool:{kind:'triangle-pair',base:b,height:h,joined:false,lengthUnit:'m'},hints:item.hints.map(s=>s.replaceAll('square units','square metres')),steps:item.steps.map(s=>s.replaceAll('square units','square metres')),another:item.another?.map(a=>({...a,steps:a.steps.map(s=>s.replaceAll('square units','square metres')),tool:{kind:'triangle-pair',base:b,height:h,joined:true,lengthUnit:'m'}}))};
 if(facet==='reasoning'){
  const correct='Divide by 2: the rectangle holds two matching triangles.',a='Keep the rectangle area: the base and height match.',c='Multiply by 2: there are two matching triangles.';
  item={...item,prompt:`Sam writes ${b} × ${h} = ${rectangle} for one triangle’s area. What should Sam do next?`,answer:correct,choices:r.shuffle([correct,a,c]),unit:undefined,exact:true};
  wrong={[a]:'Matching dimensions give the enclosing rectangle area. Our triangle covers only half of it.',[c]:'The two triangles already fill the rectangle. Share that area between them.'};
 }
 if(facet==='reverse'){
  const correct=`${area} × 2 = ${rectangle}`,a=`${area} ÷ 2 = ${area/2}`,c=`${area} + 2 = ${area+2}`;
  item={...item,prompt:`The blue triangle has area ${area} square units. Which check rebuilds the rectangle area?`,answer:correct,choices:r.shuffle([correct,a,c]),unit:undefined,exact:true};
  wrong={[a]:'Halving again makes a smaller piece. Put two matching triangles together.',[c]:'Two means two equal triangle areas, not two extra square units.'};
 }
 return finish(item,wrong,support?triangleItem(0,0,'direct',false):undefined);
}
