import type { Gen,Lesson } from '../model';
import { choicesOf,rngFor,simplest } from '../gen';
/**
 * P6 exemplars: ratio built on units and bar models, and algebra as the same missing-number thinking
 * from P1 with a letter and a balance (MOE p. 43). The “move it across and change the sign” shortcut is
 * only mentioned as a consequence of doing the same to both sides.
 */
const A='p6-ratio-meaning',B='p6-ratio-share',C='p6-algebra-equations';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const bars=(names:string[],units:number[],unitValue:number|null=null,total:number|null=null):{kind:'ratio';names:string[];units:number[];unitValue:number|null;total:number|null}=>({kind:'ratio',names,units,unitValue,total});
function simplifyRatio(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(1,6),b=r.int(1,7),k=r.int(2,5),g=gcd(a,b),answer=`${a/g}:${b/g}`;
 return {key:`${salt}-${i}`,prompt:`Write the ratio ${a*k} : ${b*k} in its simplest form.`,answer,exact:true,facet:'direct',rep:'ratio-bars',tool:bars(['First','Second'],[a*k,b*k]),
  hints:['Both numbers can be divided by the same factor.',`Try dividing both by ${k*g}.`,`${a*k} ÷ ${k*g} and ${b*k} ÷ ${k*g}`],
  steps:[`${a*k} and ${b*k} share the factor ${k*g}.`,`${a*k} ÷ ${k*g} = ${a/g} and ${b*k} ÷ ${k*g} = ${b/g}.`,`Simplest form: ${answer}`],
  another:[{title:'Look at the bars',steps:[`Group the units: ${a*k} units and ${b*k} units make the same comparison as ${a/g} to ${b/g}.`],tool:bars(['First','Second'],[a/g,b/g])}],
  check:`${a/g}:${b/g} and ${a*k}:${b*k} compare the same amounts ✓`};
};}
function equivalentRatio(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(1,6),b=r.int(1,7),k=r.int(2,6);
 return {key:`${salt}-${i}`,prompt:'Find the missing number in the equivalent ratio.',display:`${a} : ${b} = ${a*k} : □`,answer:String(b*k),facet:'missing',rep:'ratio-bars',tool:bars(['First','Second'],[a,b]),
  hints:[`The first part went from ${a} to ${a*k}: that is × ${k}.`,'Do the same to the second part.',`${b} × ${k}`],
  steps:[`${a} × ${k} = ${a*k}.`,`${b} × ${k} = ?`],wrong:{...(b+k!==b*k?{[String(b+k)]:`We multiplied the first part by ${k}, so the second part is multiplied too, not increased by ${k}.`}:{})},
  check:`${a*k}:${b*k} simplifies back to ${a/gcd(a,b)}:${b/gcd(a,b)} ✓`};
};}
function ratioFraction(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(1,5),b=r.int(1,5),total=a+b,answer=simplest(a,total);
 return {key:`${salt}-${i}`,prompt:`Red and blue counters are in the ratio ${a} : ${b}. What fraction of the counters are red?`,answer,exact:true,facet:'reverse',rep:'ratio-bars',tool:bars(['Red','Blue'],[a,b]),
  hints:[`There are ${a} + ${b} = ${total} units altogether.`,`Red takes ${a} of those ${total} units.`],
  steps:[`Total units: ${a} + ${b} = ${total}.`,`Red is ${a} of ${total}, so ${a}/${total}.`,`Simplest form: ${answer}`],check:`${answer} of the counters are red, the rest are blue ✓`};
};}
function ratioRead(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,6),b=r.int(1,5),answer=`${a/gcd(a,b)}:${b/gcd(a,b)}`;
 return {key:`${salt}-${i}`,prompt:'Write the ratio shown by the bars, in its simplest form.',answer,exact:true,facet:'visual',rep:'ratio-bars',tool:bars(['Ali','Ben'],[a,b]),
  hints:['Count the units in each bar.',`Ali has ${a} units and Ben has ${b}.`],steps:[`${a} units to ${b} units.`,`Simplest form: ${answer}`]};
};}
function recipeStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,5),b=r.int(1,4),k=r.int(2,5);
 return {key:`${salt}-${i}`,prompt:`A drink mixes syrup and water in the ratio ${a} : ${b}. If ${a*k} cups of syrup are used, how many cups of water are needed?`,answer:String(b*k),unit:'cups',facet:'word',rep:'ratio-bars',tool:bars(['Syrup','Water'],[a,b]),
  hints:['How many times bigger is the new amount of syrup?',`${a} × ${k} = ${a*k}.`,`Multiply the water by ${k} as well.`],
  steps:[`Syrup went from ${a} to ${a*k}: × ${k}.`,`Water: ${b} × ${k} = ${b*k} cups.`],check:`${a*k} : ${b*k} simplifies to ${a/gcd(a,b)} : ${b/gcd(a,b)} ✓`};
};}
function ratioNotDifference(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(3,6),b=r.int(1,a-1),answer=`No: it means for every ${a} of the first there are ${b} of the second`;
 return {key:`${salt}-${i}`,prompt:`Does the ratio ${a} : ${b} mean the first amount is ${a-b} more than the second?`,answer,choices:choicesOf(r,answer,[`Yes: the difference is always ${a-b}`,'Yes, ratios always show a difference','Only when the numbers are small']),facet:'reasoning',rep:'ratio-bars',tool:bars(['First','Second'],[a,b],4),
  hints:['If one unit were 4, what would the two amounts be?'],steps:[`With 1 unit = 4: the first is ${a*4} and the second is ${b*4}, a difference of ${(a-b)*4}.`,`The difference changes with the unit, but the ratio ${a} : ${b} stays the same.`]};
};}
function shareInRatio(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(1,5),b=r.int(1,5),unit=r.int(3,15),total=(a+b)*unit,askFirst=r.chance(.5);
 return {key:`${salt}-${i}`,prompt:`${total} stickers are shared between Ali and Ben in the ratio ${a} : ${b}. How many does ${askFirst?'Ali':'Ben'} get?`,answer:String((askFirst?a:b)*unit),unit:'stickers',facet:'direct',rep:'ratio-bars',tool:bars(['Ali','Ben'],[a,b],null,total),
  hints:[`Count the units: ${a} + ${b} = ${a+b}.`,`${a+b} units = ${total}, so 1 unit = ${total} ÷ ${a+b}.`,`${askFirst?a:b} units × ${unit}`],
  steps:[`Total units: ${a} + ${b} = ${a+b}.`,`1 unit = ${total} ÷ ${a+b} = ${unit}.`,`${askFirst?'Ali':'Ben'} has ${askFirst?a:b} units = ${askFirst?a:b} × ${unit}.`],
  another:[{title:'See the units',steps:[`Each box is worth ${unit}.`,`Ali: ${a} boxes = ${a*unit}. Ben: ${b} boxes = ${b*unit}.`],tool:bars(['Ali','Ben'],[a,b],unit,total)}],
  wrong:{...(total-((askFirst?a:b)*unit)!==(askFirst?a:b)*unit?{[String(total-((askFirst?a:b)*unit))]:`That is the other share. ${askFirst?'Ali':'Ben'} has ${askFirst?a:b} of the ${a+b} units.`}:{})},
  check:`${a*unit} + ${b*unit} = ${total} ✓`};
};}
function oneUnit(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(1,5),b=r.int(1,5),unit=r.int(3,12),total=(a+b)*unit;
 return {key:`${salt}-${i}`,prompt:`${total} is shared in the ratio ${a} : ${b}. What is one unit worth?`,answer:String(unit),facet:'missing',rep:'ratio-bars',tool:bars(['First','Second'],[a,b],null,total),
  hints:[`How many units altogether? ${a} + ${b}.`,`${total} ÷ ${a+b}`],steps:[`${a+b} units make ${total}.`,`1 unit = ${total} ÷ ${a+b} = ${unit}.`],check:`${a+b} × ${unit} = ${total} ✓`};
};}
function differenceShare(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(3,6),b=r.int(1,a-1),unit=r.int(3,12),diff=(a-b)*unit;
 return {key:`${salt}-${i}`,prompt:`Ali and Ben share money in the ratio ${a} : ${b}. Ali gets $${diff} more than Ben. How much does Ben get?`,answer:String(b*unit),unit:'dollars',facet:'unfamiliar',rep:'ratio-bars',tool:bars(['Ali','Ben'],[a,b]),
  hints:['Draw the bars. How many more units does Ali have?',`${a} − ${b} = ${a-b} units are the extra.`,`${a-b} units = $${diff}, so 1 unit = $${unit}.`],
  steps:[`Ali has ${a-b} more units than Ben.`,`${a-b} units = $${diff}, so 1 unit = $${unit}.`,`Ben has ${b} units = $${b*unit}.`],check:`Ali $${a*unit} − Ben $${b*unit} = $${diff} ✓`};
};}
const scale=(x:number,n:number,right:number,letter='x'):{kind:'balance';left:{x:number;n:number};right:{x:number;n:number};xValue:number;letter:string}=>({kind:'balance',left:{x,n},right:{x:0,n:right},xValue:(right-n)/x,letter});
function oneStep(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),x=r.int(2,12),a=r.int(1,9),plus=r.chance(.6),b=plus?x+a:x*a;
 return {key:`${salt}-${i}`,prompt:'Solve for x.',display:plus?`x + ${a} = ${b}`:`${a}x = ${b}`,answer:String(x),facet:'direct',rep:'balance',tool:plus?scale(1,a,b):scale(a,0,b),
  hints:[plus?`Both sides balance. Take ${a} off both sides.`:`${a} groups of x weigh ${b}.`,plus?`${b} − ${a}`:`Split both sides into ${a} equal groups: ${b} ÷ ${a}.`],
  steps:[plus?`Take ${a} from both sides: x = ${b} − ${a}.`:`Divide both sides by ${a}: x = ${b} ÷ ${a}.`,'What is x?'],
  wrong:{...(plus&&b+a!==x?{[String(b+a)]:`That adds ${a}. The ${a} is already on the left, so we take it off both sides.`}:{}),...(!plus&&b*a!==x?{[String(b*a)]:`That multiplies. There are ${a} lots of x, so we share ${b} into ${a} equal groups.`}:{})},
  check:plus?`${x} + ${a} = ${b} ✓`:`${a} × ${x} = ${b} ✓`};
};}
function twoStep(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),x=r.int(2,9),a=r.int(2,5),b=r.int(1,9),c=a*x+b;
 return {key:`${salt}-${i}`,prompt:'Solve for x.',display:`${a}x + ${b} = ${c}`,answer:String(x),facet:'missing',rep:'balance',tool:scale(a,b,c),
  hints:[`Take ${b} off both sides first.`,`${a}x = ${c} − ${b} = ${a*x}.`,`Split both sides into ${a} equal groups.`],
  steps:[`Take ${b} from both sides: ${a}x = ${c-b}.`,`Divide both sides by ${a}: x = ${c-b} ÷ ${a}.`,'What is x?'],
  another:[{title:'Work backwards',steps:[`x was multiplied by ${a}, then ${b} was added, giving ${c}.`,`Undo in reverse: ${c} − ${b} = ${c-b}, then ${c-b} ÷ ${a} = ${x}.`]}],
  check:`${a} × ${x} + ${b} = ${c} ✓`};
};}
function substitute(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,9),b=r.int(1,12),x=r.int(2,9);
 return {key:`${salt}-${i}`,prompt:`Find the value of ${a}x + ${b} when x = ${x}.`,answer:String(a*x+b),facet:'reverse',rep:'symbols',
  hints:[`${a}x means ${a} × x.`,`${a} × ${x} = ${a*x}.`,`Then add ${b}.`],steps:[`${a} × ${x} = ${a*x}.`,`${a*x} + ${b} = ?`],
  wrong:{...((a+x+b)!==(a*x+b)?{[String(a+x+b)]:`${a}x means ${a} multiplied by x, not ${a} added to x.`}:{})},check:`When x = ${x}, ${a}x + ${b} = ${a*x+b} ✓`};
};}
function algebraStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),x=r.int(3,15),a=r.int(2,9),total=x+a;
 return {key:`${salt}-${i}`,prompt:`Mei has x stickers. She buys ${a} more and now has ${total}. How many did she start with?`,answer:String(x),unit:'stickers',facet:'word',rep:'balance',tool:scale(1,a,total),
  hints:['Write the story as an equation.',`x + ${a} = ${total}.`,`Take ${a} off both sides.`],steps:[`x + ${a} = ${total}.`,`x = ${total} − ${a}.`],check:`${x} + ${a} = ${total} ✓`};
};}
function balanceRead(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),x=r.int(2,9),a=r.int(2,4),c=a*x;
 return {key:`${salt}-${i}`,prompt:'The scales balance. What is the value of x?',answer:String(x),facet:'visual',rep:'balance',tool:scale(a,0,c),
  hints:[`${a} equal boxes weigh ${c}.`,`${c} ÷ ${a}`],steps:[`${a}x = ${c}.`,`Split both sides into ${a} equal groups: x = ${c} ÷ ${a}.`],check:`${a} × ${x} = ${c} ✓`};
};}
function moveMistake(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),x=r.int(3,12),a=r.int(2,9),b=x+a,answer=`No: ${a} is added on the left, so take ${a} off both sides to get x = ${b-a}`;
 return {key:`${salt}-${i}`,prompt:`For x + ${a} = ${b}, Sam says x = ${b+a}. What went wrong?`,answer,choices:choicesOf(r,answer,['Nothing: Sam is right',`x = ${b}`,`Sam should have multiplied by ${a}`]),facet:'reasoning',rep:'balance',tool:scale(1,a,b),
  hints:['Try Sam\'s answer in the equation.',`Does ${b+a} + ${a} equal ${b}?`],steps:[`${b+a} + ${a} = ${b+2*a}, which is not ${b}.`,`Take ${a} off both sides: x = ${b} − ${a} = ${b-a}.`,`Check: ${b-a} + ${a} = ${b} ✓`]};
};}
export const P6_LESSONS:Lesson[]=[{
 id:A,level:6,track:'standard',world:'ratio-realm',title:'What a ratio compares',minutes:12,skillIds:['P6.S.RATIO.01','P6.S.RATIO.02'],activityId:'p6s-ratio-n3',
 objectives:['Read a ratio as a comparison in equal units','Find equivalent ratios and the simplest form','Connect a ratio to the fraction of the total'],
 canDo:['read 3 : 2 as three units to two units','simplify 12 : 18 to 2 : 3','find the missing term in 3 : 2 = 12 : □','say what fraction of the whole each part is'],
 prerequisites:['P3.S.FRAC.02','P6.S.RATIO.01'],representations:['ratio-bars','bar-model','fraction-wall','story'],
 misconceptions:[{name:'Reading a ratio as a difference',fix:'3 : 2 does not mean “one more”. It means three units to two units, whatever one unit is worth.'},{name:'Treating ratio numbers as the actual amounts',fix:'3 : 2 could be 3 and 2, or 30 and 20. The units keep the comparison the same.'}],
 grows:['P3: equivalent fractions','P5: percentage as a comparison with 100','P6: 3 : 2 and dividing a quantity in a ratio','Later: proportion and scale'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'Write 6/8 in its simplest form.',answer:'3/4',exact:true,hints:['Divide both numbers by 2.'],steps:['6 ÷ 2 = 3 and 8 ÷ 2 = 4.'],tool:{kind:'fractions',denominators:[8,4],shaded:[6,3]}},
   {key:'warm-2',prompt:'Which number divides both 12 and 18 exactly?',answer:'6',choices:['6','4','5'],hints:['Try dividing each number.'],steps:['12 ÷ 6 = 2 and 18 ÷ 6 = 3.']}],
   booster:[{text:'A common factor divides both numbers exactly.',math:'12 = 6 × 2   18 = 6 × 3'},{text:'Equal units make comparing easy.',tool:bars(['A','B'],[3,2])}]},
  {kind:'hook',title:'Mixing the drink',text:'A drink is made with 3 parts syrup to 2 parts water. The cups can be any size, as long as every part is the same size. What stays the same when you make a bigger jug?',tool:bars(['Syrup','Water'],[3,2])},
  {kind:'explore',title:'Build the mix',text:'Set the bars to 3 units of syrup and 2 units of water.',tool:bars(['Syrup','Water'],[1,1]),goal:t=>t.kind==='ratio'&&t.units[0]===3&&t.units[1]===2,goalHint:'Syrup needs 3 units and water needs 2.',success:'3 units to 2 units: the ratio 3 : 2. Each unit is the same size, so the mix tastes the same at any scale.'},
  {kind:'notice',title:'What stays the same?',text:'With 1 unit = 100 ml, the jug holds 300 ml of syrup and 200 ml of water.',tool:bars(['Syrup','Water'],[3,2],100),options:[
   {text:'The comparison 3 : 2 stays the same, even though the amounts change',correct:true,reply:'Yes. A ratio compares in units; the unit can be any size.'},
   {text:'The difference of 1 unit is what matters',correct:false,reply:'With 1 unit = 100 ml the difference is 100 ml, not 1. The comparison 3 to 2 is what stays fixed.'},
   {text:'It only works if there are exactly 3 and 2 cups',correct:false,reply:'6 : 4 and 30 : 20 are the same mix. They all simplify to 3 : 2.'}]},
  {kind:'connect',title:'Ratios, units and fractions',rows:[
   {text:'Three units of syrup to two units of water.',tool:bars(['Syrup','Water'],[3,2])},
   {text:'Double every unit and the mix is unchanged.',tool:bars(['Syrup','Water'],[6,4]),math:'3 : 2 = 6 : 4'},
   {text:'Dividing both by the common factor gives the simplest form.',math:'12 : 18 = 2 : 3'},
   {text:'Altogether there are 5 units, so syrup is 3/5 of the drink.',math:'3 : 2 → syrup = 3/5 of the total'}]},
  {kind:'explain',title:'A ratio is a comparison in equal units',text:'Every part of a ratio counts the same sized unit. Multiplying or dividing every part by the same number gives an equivalent ratio, exactly as with equivalent fractions. The simplest form divides by the largest common factor.',math:'12 : 18 = (12 ÷ 6) : (18 ÷ 6) = 2 : 3',tool:bars(['First','Second'],[2,3]),
   why:{question:'Why is a ratio not a difference?',answer:'A difference depends on the size of the unit: 3 : 2 with a unit of 10 gives amounts 30 and 20, a difference of 10. Change the unit and the difference changes, but the comparison “three units to two” does not. That is what a ratio records.',tool:bars(['First','Second'],[3,2],10)}},
  {kind:'worked',title:'Worked example',problem:'Simplify 12 : 18',steps:[
   {text:'Find the largest number that divides both.',ask:{prompt:'What is the largest common factor of 12 and 18?',choices:['6','3','12'],answer:'6'}},
   {text:'Divide both parts by 6.',math:'12 ÷ 6 = 2   and   18 ÷ 6 = 3',ask:{prompt:'What is 12 : 18 in its simplest form?',answer:'2:3'}},
   {text:'So 12 : 18 = 2 : 3.',tool:bars(['First','Second'],[2,3])},
   {text:'Check: multiplying 2 : 3 by 6 gives back 12 : 18.',math:'2 : 3 = 12 : 18 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:simplifyRatio(A,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:equivalentRatio(A,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:recipeStory(A,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[ratioNotDifference(A,'detective')(0,0),{key:'same-mix',prompt:'Which mix tastes the same as 3 parts syrup to 2 parts water?',answer:'9 parts syrup to 6 parts water',choices:['9 parts syrup to 6 parts water','4 parts syrup to 3 parts water','6 parts syrup to 3 parts water'],facet:'reasoning',rep:'ratio-bars',tool:bars(['Syrup','Water'],[3,2]),hints:['Simplify each option.'],steps:['9 : 6 divides by 3 to give 3 : 2.','4 : 3 and 6 : 3 do not simplify to 3 : 2.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:simplifyRatio(A,'m-direct')},{facet:'visual',gen:ratioRead(A,'m-visual')},{facet:'reverse',gen:ratioFraction(A,'m-reverse')},
   {facet:'missing',gen:equivalentRatio(A,'m-missing')},{facet:'word',gen:recipeStory(A,'m-word')},{facet:'unfamiliar',gen:oneUnit(A,'m-unit')},{facet:'reasoning',gen:ratioNotDifference(A,'m-reason')}]},
  {kind:'discovery',title:'You discovered: units keep the comparison',text:'A ratio counts equal units. Scale every part by the same number and the comparison is unchanged, which is why 3 : 2, 6 : 4 and 30 : 20 all describe the same mix.',math:'3 : 2 = 6 : 4 = 30 : 20',tool:bars(['Syrup','Water'],[3,2],10)},
 ]},{
 id:B,level:6,track:'standard',world:'ratio-realm',title:'Dividing a quantity in a ratio',minutes:12,skillIds:['P6.S.RATIO.03','P6.S.RATIO.04'],activityId:'p6s-ratioShare-n5',
 objectives:['Find the value of one unit from a total','Divide a quantity in a given ratio','Use the difference in units to find a total'],
 canDo:['share $40 between two people in the ratio 3 : 2','find one unit when the total or the difference is known','draw a bar model for a ratio problem'],
 prerequisites:[A],representations:['ratio-bars','bar-model','story'],
 misconceptions:[{name:'Dividing the total by one part of the ratio',fix:'For 3 : 2 and a total of 40, divide by the number of units (5), not by 3 or 2.'},{name:'Using the total when only the difference is known',fix:'If one person gets $12 more, that $12 matches the difference in units, not the whole amount.'}],
 grows:['P6: 5 units = 40','Later: proportion, scale drawings and rates'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'Simplify the ratio 10 : 15.',answer:'2:3',exact:true,hints:['Divide both by 5.'],steps:['10 ÷ 5 = 2 and 15 ÷ 5 = 3.'],tool:bars(['First','Second'],[2,3])},
   {key:'warm-2',prompt:'What is 45 ÷ 5?',answer:'9',hints:['How many fives make 45?'],steps:['5 × 9 = 45.']}],
   booster:[{text:'The units in a ratio are all the same size.',tool:bars(['Ali','Ben'],[3,2],5)},{text:'Total ÷ number of units = the value of one unit.',math:'40 ÷ 5 = 8'}]},
  {kind:'hook',title:'Sharing the prize',text:'Ali and Ben win $40 and agree to share it in the ratio 3 : 2, because Ali sold more tickets. How much should each get?',tool:bars(['Ali','Ben'],[3,2],null,40)},
  {kind:'explore',title:'Count the units',text:'Set the bars to 3 units for Ali and 2 units for Ben, then look at how many units there are altogether.',tool:bars(['Ali','Ben'],[1,1],null,40),goal:t=>t.kind==='ratio'&&t.units[0]===3&&t.units[1]===2,goalHint:'Ali needs 3 units and Ben 2 units.',success:'5 units altogether. If 5 units are $40, then one unit is $8.'},
  {kind:'notice',title:'What do we divide by?',text:'The total is $40 and the ratio is 3 : 2.',tool:bars(['Ali','Ben'],[3,2],8,40),options:[
   {text:'Divide by 5, the total number of units',correct:true,reply:'Yes: 40 ÷ 5 = 8, so one unit is $8.'},
   {text:'Divide by 3, because Ali has 3 parts',correct:false,reply:'That would only work if Ali had all the money. The $40 covers all 5 units.'},
   {text:'Divide by 2, the number of people',correct:false,reply:'Sharing equally would ignore the ratio. The units are what must be shared.'}]},
  {kind:'connect',title:'From bars to amounts',rows:[
   {text:'Ali has 3 units, Ben has 2 units.',tool:bars(['Ali','Ben'],[3,2],null,40)},
   {text:'5 units make the whole $40.',math:'5 units = 40'},
   {text:'One unit is 40 ÷ 5 = 8.',math:'1 unit = 8',tool:bars(['Ali','Ben'],[3,2],8,40)},
   {text:'Ali gets 3 × 8 and Ben gets 2 × 8.',math:'Ali = 24   Ben = 16   (24 + 16 = 40)'}]},
  {kind:'explain',title:'One unit is the key',text:'Every ratio problem turns on the value of one unit. Count the units, use what you are told to find one unit, then multiply for each share. The same idea works when you are told the difference instead of the total.',math:'5 units = 40 → 1 unit = 8 → 3 units = 24',tool:bars(['Ali','Ben'],[3,2],8,40),
   why:{question:'Why does the difference method work?',answer:'If Ali has 3 units and Ben has 2, Ali has exactly 1 unit more. So an extra $12 means one unit is $12, and every share can be worked out from that. The bars make the extra unit easy to see.',tool:bars(['Ali','Ben'],[3,2],12)}},
  {kind:'worked',title:'Worked example',problem:'$63 is shared in the ratio 4 : 3. How much is the larger share?',steps:[
   {text:'Count the units.',math:'4 + 3 = 7 units',ask:{prompt:'How many units altogether?',answer:'7'}},
   {text:'Find one unit.',math:'63 ÷ 7 = 9',ask:{prompt:'What is one unit worth?',answer:'9'}},
   {text:'The larger share has 4 units.',math:'4 × 9 = 36',tool:bars(['Larger','Smaller'],[4,3],9,63)},
   {text:'So the larger share is $36.',math:'36 + 27 = 63 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:shareInRatio(B,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:shareInRatio(B,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:differenceShare(B,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[{key:'divide-by-three',prompt:'To share $40 in the ratio 3 : 2, Sara divides 40 by 3. What has she missed?',answer:'The $40 covers all 5 units, so she should divide by 5',choices:['The $40 covers all 5 units, so she should divide by 5','Nothing: dividing by 3 is right','She should divide by 2'],facet:'reasoning',rep:'ratio-bars',tool:bars(['Ali','Ben'],[3,2],null,40),hints:['How many units make up the $40?'],steps:['3 + 2 = 5 units in total.','40 ÷ 5 = 8 per unit.','Ali gets 24 and Ben gets 16.']},ratioFraction(B,'fraction')(0,0)]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:shareInRatio(B,'m-direct')},{facet:'visual',gen:ratioRead(B,'m-visual')},{facet:'reverse',gen:ratioFraction(B,'m-reverse')},
   {facet:'missing',gen:oneUnit(B,'m-missing')},{facet:'word',gen:recipeStory(B,'m-word')},{facet:'unfamiliar',gen:differenceShare(B,'m-diff')},{facet:'reasoning',gen:ratioNotDifference(B,'m-reason')}]},
  {kind:'discovery',title:'You discovered: find one unit first',text:'Count the units, find what one unit is worth, then multiply. Totals, shares and differences all come from that single step.',math:'5 units = 40 → 1 unit = 8',tool:bars(['Ali','Ben'],[3,2],8,40)},
 ]},{
 id:C,level:6,track:'standard',world:'algebra-academy',title:'Letters and balanced equations',minutes:14,skillIds:['P6.S.ALG.01','P6.S.ALG.04','P6.S.ALG.05'],activityId:'p6s-equation-n8',
 objectives:['Use a letter for an unknown number','Substitute a value into a simple expression','Solve equations by keeping both sides equal'],
 canDo:['read 3x as three lots of x','work out 3x + 4 when x = 5','solve x + 3 = 8 and 2x + 3 = 11','explain why the same must be done to both sides'],
 prerequisites:['p1-missing-parts','P6.S.ALG.01'],representations:['balance','bar-model','symbols','story'],
 misconceptions:[{name:'Reading 3x as 3 + x',fix:'3x means 3 lots of x. When x = 5, 3x is 15, not 8.'},{name:'Moving a term across without doing the same to both sides',fix:'The equals sign means both sides weigh the same. Taking 3 from one side only tips the balance; take it from both.'}],
 grows:['P1: □ + 3 = 8','P3: missing quantities in stories','P6: x + 3 = 8 and 2x + 3 = 11','Later: equations with brackets and two unknowns'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'Find the missing number.',display:'□ + 3 = 8',answer:'5',hints:['The whole is 8 and one part is 3.'],steps:['8 − 3 = ?'],tool:{kind:'bond',whole:8,parts:[5,3],hide:'a',locked:true}},
   {key:'warm-2',prompt:'What is 4 × 6 + 2?',answer:'26',hints:['Multiply before adding.'],steps:['4 × 6 = 24.','24 + 2 = ?']}],
   booster:[{text:'A box, or a letter, stands for a number we do not know yet.',math:'□ + 3 = 8   is the same as   x + 3 = 8'},{text:'The equals sign means both sides have the same value.',tool:scale(1,3,8)}]},
  {kind:'hook',title:'The mystery box',text:'A balance holds a mystery box and 3 unit weights on the left, and 8 unit weights on the right. It balances perfectly. What must the box weigh?',tool:scale(1,3,8)},
  {kind:'explore',title:'Keep it balanced',text:'Take one weight off both sides at a time. Keep the scales level until the box stands alone.',tool:scale(1,3,8),goal:t=>t.kind==='balance'&&t.left.x===1&&t.left.n===0&&t.right.n===5,goalHint:'Use “Take 1 off both sides” three times, so only the box is left.',success:'The box balances 5 weights, so x = 5. Doing the same to both sides kept the scales level all the way.'},
  {kind:'notice',title:'What happens if you take from one side only?',text:'Try “Take 1 off the left only” in the explore step, and watch the beam.',tool:scale(1,3,8),options:[
   {text:'The balance tips: the sides are no longer equal',correct:true,reply:'Exactly. An equation is only true while both sides stay equal.'},
   {text:'Nothing changes',correct:false,reply:'The left side becomes lighter, so the beam tips and the equation is no longer true.'},
   {text:'The box changes weight',correct:false,reply:'The box always weighs the same. Only what is around it changes.'}]},
  {kind:'connect',title:'From box to letter',rows:[
   {text:'In P1 you found the missing part in a box.',math:'□ + 3 = 8'},
   {text:'A letter does the same job as the box.',math:'x + 3 = 8'},
   {text:'The balance shows why we take 3 from both sides.',tool:scale(1,3,8)},
   {text:'Both sides stay equal, and the answer appears.',math:'x = 5'}]},
  {kind:'explain',title:'Do the same to both sides',text:'An equation is a balance. Add, subtract, multiply or divide, as long as you do exactly the same to both sides. To undo “+ 3” take 3 off both sides; to undo “× 2” split both sides into 2 equal groups.',math:'2x + 3 = 11 → 2x = 8 → x = 4',tool:scale(2,3,11),
   why:{question:'Isn’t there a shortcut where the sign changes?',answer:'Some people write “+ 3 moves across and becomes − 3”. That shortcut is only a description of what happens when you take 3 from both sides. If you learn it as a rule on its own, it is easy to misuse; the balance always tells you what is really allowed.',tool:scale(1,3,8)}},
  {kind:'worked',title:'Worked example',problem:'2x + 3 = 11',steps:[
   {text:'What does 2x mean?',ask:{prompt:'2x means…',choices:['2 lots of x','2 add x','x lots of 2 added to 2'],answer:'2 lots of x'}},
   {text:'Take 3 off both sides.',math:'2x = 11 − 3',tool:scale(2,0,8),ask:{prompt:'What is 11 − 3?',answer:'8'}},
   {text:'Two boxes balance 8, so split both sides into 2 equal groups.',math:'x = 8 ÷ 2',ask:{prompt:'What is x?',answer:'4'}},
   {text:'So x = 4.',math:'2 × 4 + 3 = 11 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:oneStep(C,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:twoStep(C,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:algebraStory(C,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[moveMistake(C,'detective')(0,0),{key:'three-x',prompt:'When x = 4, what is 3x?',answer:'12',choices:['12','7','34'],facet:'reasoning',rep:'symbols',hints:['3x means 3 lots of x.'],steps:['3x = 3 × x.','3 × 4 = 12.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:oneStep(C,'m-direct')},{facet:'visual',gen:balanceRead(C,'m-visual')},{facet:'reverse',gen:substitute(C,'m-reverse')},
   {facet:'missing',gen:twoStep(C,'m-missing')},{facet:'word',gen:algebraStory(C,'m-word')},
   {facet:'unfamiliar',gen:(seed,i)=>{const r=rngFor(C,seed,i,'m-bar'),x=r.int(3,12),a=r.int(2,4),total=a*x;return {key:`m-bar-${i}`,prompt:`The bar model shows ${a} equal parts making ${total}. What is the value of one part, x?`,answer:String(x),facet:'unfamiliar',rep:'bar-model',tool:{kind:'bar',parts:Array.from({length:a},()=>x),whole:total,labels:Array.from({length:a},()=>'x')},hints:[`${a} equal parts make ${total}.`,`${total} ÷ ${a}`],steps:[`${a}x = ${total}.`,`x = ${total} ÷ ${a}.`],check:`${a} × ${x} = ${total} ✓`};}},
   {facet:'reasoning',gen:moveMistake(C,'m-reason')}]},
  {kind:'discovery',title:'You discovered: algebra is the box, grown up',text:'The missing number you found in P1 is the x you solve for now. The balance keeps both sides equal, and that single rule solves every equation here.',math:'□ + 3 = 8    ⟷    x + 3 = 8',tool:scale(1,3,8)},
 ]}];
