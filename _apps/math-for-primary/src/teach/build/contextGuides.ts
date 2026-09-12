import type {PlanEntry} from './plan';
import type {VisualGuide} from './guides';
import type {RevealStep,Tool} from '../model';
const f=(text:string,tool:Tool,math?:string,caption?:string):RevealStep=>({text,tool,math,caption});
const table=(headers:string[],rows:string[][],caption:string):Tool=>({kind:'table',headers,rows,caption});
const picture=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
const ratio=(units:number[],value:number|null,names=['Red','Blue']):Tool=>({kind:'ratio',names,units,unitValue:value,total:value===null?null:units.reduce((a,b)=>a+b,0)*value});
const drawing=(scene:'shape-join'|'copy-grid'|'angle-name',phase:number):Tool=>({kind:'scene',scene,values:[3,2],phase});

export function contextGuide(p:PlanEntry):VisualGuide|null{
 const c=p.code,o=p.objective.toLowerCase();
 if(c==='MONEY'&&p.level>=2){
  if(/add|subtract/.test(o))return {title:'Keep dollars with dollars and cents with cents',setup:'A drink costs $1.75 and a sandwich costs $2.50. What is the total cost?',frames:[
   f('Read each amount as dollars and cents. The two digits after the decimal point count cents.',table(['Item','Dollars','Cents'],[['Drink','1','75'],['Sandwich','2','50']],'Our two prices'),'$1.75 + $2.50'),
   f('Add the cents: 75 + 50 = 125 cents. Exchange 100 of them for one extra dollar; 25 cents remain.',table(['Cents altogether','Exchange','Cents left'],[['125 cents','100 cents = $1','25 cents']],'An exchange keeps the value the same'),'125 cents = $1.25'),
   f('Add the dollars, including that extra dollar. One plus two plus one is four dollars, with 25 cents left.',table(['Dollars','Cents','Total'],[['4','25','$4.25']],'The combined cost'),'$1.75 + $2.50 = $4.25'),
   f('Check by taking the sandwich price back out. The money left must equal the drink price.',{kind:'bar',whole:425,parts:[175,250],labels:['drink: 175 cents','sandwich: 250 cents']},'$4.25 − $2.50 = $1.75','The bar is measured in cents. It shows the same prices without a decimal point.')
  ]};
  if(/compare/.test(o))return {title:'Compare dollars first, then cents',setup:'Which amount is greater: $2.35 or $2.50?',frames:[
   f('Both amounts contain two whole dollars. The dollar parts are equal, so they cannot decide which is greater.',table(['Amount','Dollars','Cents'],[['$2.35','2','35'],['$2.50','2','50']],'Compare the same units')),
   f('Compare the cents next. Fifty cents is greater than thirty-five cents.',{kind:'bar',whole:null,parts:[],compare:{top:35,bottom:50,names:['35 cents','50 cents']}},'35 < 50'),
   f('The second amount has the same dollars and more cents, so $2.50 is greater. Writing $2.5 means the same as $2.50.',table(['Smaller amount','Greater amount'],[['$2.35','$2.50']],'Money uses two decimal places'),'$2.35 < $2.50')
  ]};
  return {title:'The decimal point separates dollars from cents',setup:'We have one dollar, twenty cents and five cents. How do we write their total as an amount of money?',frames:[
   f('One dollar is worth one hundred cents. These model coins show 100, 20 and 5 cents.',{kind:'scene',scene:'money',values:[100,20,5],phase:0},'100 + 20 + 5 = 125 cents'),
   f('Keep 100 cents as one dollar. The 25 cents left go after the decimal point.',table(['Dollars','Cents','Money notation'],[['1','25','$1.25']],'One amount, three ways to read it'),'125 cents = $1.25'),
   f('There must be two cents digits. One dollar and five cents is $1.05; $1.50 would mean fifty cents after the dollar.',table(['Words','Correct notation'],[['1 dollar 5 cents','$1.05'],['1 dollar 50 cents','$1.50']],'The zero holds the tens-of-cents place')),
   f('To count or convert an amount, group each hundred cents into a dollar and keep the remaining cents.',table(['Dollars and cents','Cents altogether'],[['$2.35','235 cents']],'Two hundreds and thirty-five more'),'2 × 100 + 35 = 235 cents')
  ]};
 }
 if(c==='MEASURE'&&/choose suitable/.test(o))return {title:'Choose a unit that fits what you measure',setup:'Would you measure the length of a pencil in centimetres, kilograms or litres?',frames:[
  f('First decide what you are measuring. A pencil’s length is a distance, so use a length unit.',picture({type:'ruler',length:12},'A pencil measured in centimetres'),'Length → centimetres or metres'),
  f('Mass tells us how heavy something is. Use grams for a light object and kilograms for a heavier one.',table(['What we measure','Suitable unit'],[['Mass of an apple','grams'],['Mass of a child','kilograms']],'Choose a mass unit')),
  f('Liquid volume tells us how much liquid a container holds. Litres suit a bottle or jug.',table(['What we measure','Suitable unit'],[['Liquid in a jug','litres'],['Length of a classroom','metres'],['Length of a pencil','centimetres']],'Match the kind of measurement first')),
  f('Our pencil question asks for length, so centimetres fit. Kilograms measure mass and litres measure liquid volume.',picture({type:'ruler',length:12},'Centimetres answer a length question'),'Pencil length: 12 cm')
 ]};
 if(c==='MEASURE'&&/compound/.test(o))return {title:'One length can use two units',setup:'A ribbon is 2 metres and 35 centimetres long. What do the two parts mean?',frames:[
  f('One metre contains 100 centimetres. Two complete metres therefore contain 200 centimetres.',{kind:'bar',whole:200,parts:[100,100],labels:['1 metre','1 metre']},'2 m = 200 cm'),
  f('The ribbon has those two metres and another 35 centimetres. The second number counts the smaller-unit part.',{kind:'bar',whole:235,parts:[100,100,35],labels:['100 cm','100 cm','35 cm']},'2 m 35 cm = 200 cm + 35 cm'),
  f('Together the parts are 235 centimetres. The ribbon did not change; we described all of it using one unit.',{kind:'bar',whole:235,parts:[200,35],labels:['two metres','extra centimetres']},'2 m 35 cm = 235 cm')
 ]};
 if(c==='MEASURE'&&p.level===2&&!/convert/.test(o)){
  const mass=/mass/.test(o),liquid=/liquid/.test(o),unit=mass?'g':liquid?'litres':'m';
  const subject=mass?'Two packets have masses of 300 g and 500 g. Which is heavier?':liquid?'Two jugs hold 2 litres and 3 litres. Which holds more?':'Two ribbons are 2 metres and 3 metres long. Which is longer?';
  const a=mass?300:2,b=mass?500:3;
  const model:Tool={kind:'bar',whole:null,parts:[],compare:{top:a,bottom:b,names:[`${a} ${unit}`,`${b} ${unit}`]}};
  return {title:mass?'Compare masses in the same unit':liquid?'Compare how much liquid containers hold':'Compare lengths in metres',setup:subject,frames:[
   f('Read the unit with each number. Both measurements use the same unit, so their numbers can be compared.',model),
   f(`${b} ${unit} is the greater measurement. The longer bar represents the larger amount, not a drawing of the object’s shape.`,model,`${b} > ${a}`),
   f(mass?'Grams suit light objects; kilograms suit heavier ones. Keep the unit beside the reading.':liquid?'A litre measures liquid volume. It tells us how much liquid is in the container, not how tall the container looks.':'A metre is a length unit. Use a metre rule or tape; measure from zero to the other end.',model,`${b} − ${a} = ${b-a} ${unit}`)
  ]};
 }
 if(c==='SHAPE'&&/compose|decompose/.test(o))return {title:'Two triangles can make one rectangle',setup:'Can we fit two matching triangles together to make a rectangle?',frames:[
  f('Here is one triangle. The pale outline shows the rectangle we want to fill.',drawing('shape-join',0)),
  f('Turn a matching triangle to fill the space. Its long edge meets the first triangle’s long edge.',drawing('shape-join',1)),
  f('Together the triangles cover the rectangle exactly. There is no gap or overlap.',drawing('shape-join',2),'2 matching triangles → 1 rectangle'),
  f('We can reverse this: cut the rectangle along that diagonal to get the two triangles back.',drawing('shape-join',1))
 ]};
 if(c==='SHAPE'&&/copy figures/.test(o))return {title:'Copy the moves on the grid',setup:'We want to copy the rectangle on the left onto the empty grid on the right.',frames:[
  f('Choose the starting dot marked in blue. Count spaces between dots, not the dots themselves.',drawing('copy-grid',0),'Start at the blue dot'),
  f('The top edge goes three spaces to the right. Make the same move from the starting dot on the empty grid.',drawing('copy-grid',1),'3 spaces right'),
  f('Go two spaces down, three left, then two up to close the rectangle. The copied edges have the same lengths.',drawing('copy-grid',2),'3 right → 2 down → 3 left → 2 up')
 ]};
 if(c==='SHAPE'&&/pattern/.test(o))return {title:'Find the group of shapes that repeats',setup:'A pattern goes circle, triangle, triangle, then repeats. What comes after the second circle?',frames:[
  f('Look for the shortest group that repeats in the same order: one circle followed by two triangles.',picture({type:'pattern',items:['●','▲','▲','●','▲','▲']},'Circle, triangle, triangle repeats.')),
  f('Start a new copy of that group at the second circle. It must be followed by a triangle, then another triangle.',picture({type:'pattern',items:['●','▲','▲','●','?','?']},'Keep the order inside each repeated group.')),
  f('A pattern may repeat colour, size or direction as well as shape. Name what changes and what repeats before choosing the next item.',picture({type:'pattern',items:['●','▲','▲','●','▲','▲']},'The completed pattern follows the same rule.'))
 ]};
 if(c==='ANGLE'&&/notation/.test(o))return {title:'The middle letter names the corner',setup:'The two rays BA and BC meet at B. How do we name the angle between them?',frames:[
  f('Find the meeting point of the two rays. That point is B, the vertex of the angle.',drawing('angle-name',0)),
  f('Read from A along a ray to B, then along the other ray to C. Write ∠ABC; the vertex B stays in the middle.',drawing('angle-name',1),'∠ABC'),
  f('Reading the other way gives ∠CBA. This names the same opening because B is still the middle letter.',drawing('angle-name',1),'∠ABC = ∠CBA')
 ]};
 if(c==='RATIO'&&/interpret/.test(o))return {title:'Keep the quantities in the named order',setup:'There are 2 red counters, 3 blue counters and 1 green counter. How do we write their ratio?',frames:[
  f('Count the red and blue groups first. In the order red to blue, their ratio is 2 to 3.',ratio([2,3],1),'Red : blue = 2 : 3'),
  f('Include the green group as the third quantity. Keep red first, blue second and green third.',ratio([2,3,1],1,['Red','Blue','Green']),'Red : blue : green = 2 : 3 : 1'),
  f('The order matters. If we name blue before red, the first two numbers must change places too.',ratio([3,2,1],1,['Blue','Red','Green']),'Blue : red : green = 3 : 2 : 1')
 ]};
 if(c==='RATIO'&&/equivalent|simplify/.test(o))return {title:'Resize every ratio unit together',setup:'Four red counters and six blue counters have ratio 4 : 6. Can we describe the same comparison with smaller numbers?',frames:[
  f('Start with four red counters and six blue counters. At first, each box stands for one counter.',ratio([4,6],1),'4 : 6'),
  f('Bundle counters in twos in both groups. Red has two bundles and blue has three; no counters have been lost.',ratio([2,3],2),'4 : 6 = 2 : 3','Each box now represents two counters. The total amounts stay four and six.'),
  f('Both ratio terms were divided by the same number. Multiplying every term by the same number reverses the change.',ratio([2,3],2),'4 ÷ 2 : 6 ÷ 2 = 2 : 3')
 ]};
 if(c==='RATIO'&&/missing term/.test(o))return {title:'Find the value of one ratio unit',setup:'Red : blue is 2 : 3. If there are 4 red counters, how many blue counters are there?',frames:[
  f('Red has two equal units and blue has three. We know the two red units together are worth four counters.',ratio([2,3],null),'2 red units = 4 counters'),
  f('Share the four red counters between its two units. Each unit is worth two counters in both colours.',ratio([2,3],2),'4 ÷ 2 = 2 counters per unit'),
  f('Blue has three of those same-sized units, so it has six counters. Fill the missing ratio term with six.',ratio([2,3],2),'3 × 2 = 6; 2 : 3 = 4 : 6')
 ]};
 return null;
}
