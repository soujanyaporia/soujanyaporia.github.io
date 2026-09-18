import type {Tool} from '../../model';
import type {Example} from '../../build/sequence';
import type {PlanEntry} from '../../build/plan';
import {factsOf} from './facts';
import {fmt} from '../../gen';
import {removal} from '../items';

const table=(headers:string[],rows:(string|number)[][],caption:string):Tool=>({kind:'table',headers,rows:rows.map(row=>row.map(String)),caption});
const numbers=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];

/** Fix model/question mismatches before any teaching or assessment uses the example. */
export function modelFor(p:PlanEntry,e:Example):Tool{
 const q=e.prompt,ns=numbers(q),f=e.evidence;
 if(e.tool.kind==='bond')return e.tool;
 if(p.code==='WN'&&e.tool.kind==='table'&&e.tool.headers.includes('Place')){const n=Number(q.match(/of ([\d,]+)/)?.[1]?.replaceAll(',',''));if(Number.isFinite(n))return {kind:'scene',scene:'place',values:[n,0,0],phase:0,labels:[`Place-value groups for ${n}. The value of each column is shown above its counters.`]};}

 if(p.code==='FRAC'&&/improper fraction|mixed number/.test(q)&&e.tool.kind==='table'){const w=Number(e.tool.rows[0][0]),[n,d]=e.tool.rows[0][1].split('/').map(Number);if(w<=4&&d<=12)return {kind:'fractions',denominators:Array(w+1).fill(d),shaded:[...Array(w).fill(d),n],hideValue:true};}
 if(p.code==='FRAC'&&/×/.test(q)){const fs=[...q.matchAll(/(\d+)\/(\d+)/g)].map(m=>[Number(m[1]),Number(m[2])]);if(fs.length===2&&fs.every(([n,d])=>n<d)&&!/[0-9] [0-9]+\//.test(q))return {kind:'scene',scene:'fraction-product',values:[...fs[0],...fs[1]],phase:1,labels:[`The whole is a rectangle. Blue is ${fs[0][0]} of ${fs[0][1]} rows within ${fs[1][0]} of ${fs[1][1]} columns.`]};}
 if(p.code==='MONEY'&&p.level===1)return {kind:'scene',scene:'money',values:ns,phase:e.unit==='dollars'?3:0,labels:[`Money values: ${ns.join(', ')} ${e.unit}. Count the values, not just the pieces.`]};
 if(p.code==='ANGLE'&&/form a straight angle/.test(q))return {kind:'scene',scene:'angles',values:[ns[0]],phase:0,labels:[`${ns[0]} degrees and the unknown share one straight turn.`]};
 if(p.code==='SHAPE'&&/^A triangle has angles/.test(q))return {kind:'scene',scene:'triangle-angles',values:[ns[0],ns[1]],phase:0,labels:[`Triangle with given angles ${ns[0]} and ${ns[1]} degrees; the third angle is unknown.`]};
 if(p.code==='AREA'&&/^Find the triangle area/.test(q))return {kind:'scene',scene:'triangle',values:[ns[0],ns[1]],phase:0,lengthUnit:'cm',labels:[`Base ${ns[0]} cm. Perpendicular height ${ns[1]} cm. The right angle marks their relationship.`]};
 if(p.code==='AREA'&&/Which measurement is the height/.test(q))return {kind:'scene',scene:'triangle',values:[1,1],phase:0,labels:['The vertical edge is perpendicular to the horizontal base. The diagonal edge slopes.']};
 if(p.code==='VOL'&&/^Find the volume of a cuboid/.test(q))return {kind:'diagram',picture:{type:'solid',shape:'cuboid',a:ns[0],b:ns[1],c:ns[2]},caption:'Each dimension is in centimetres. Count the cubes in one layer, then the equal layers.'};
 if(p.code==='AS'&&f&&(f.op==='+'||f.op==='-')){
  if(Math.max(f.a,f.b,Number(e.answer))<=20)return f.op==='-'?removal(f.a,f.b):{kind:'foundation-visual',visual:{type:'counters',groups:[{count:f.a,color:'blue'},{count:f.b,color:'orange'}]}};
  return {kind:'bar',whole:f.op==='+'?null:f.a,parts:f.op==='+'?[f.a,f.b]:[null,f.b],labels:f.op==='+'?['first part','part joining']:['part remaining','part removed']};
 }
 if(p.code==='MD'&&f){
  if(f.op==='*'&&f.a*f.b<=100&&f.a<=12&&f.b<=12)return {kind:'array',rows:f.a,cols:f.b};
  if(f.op==='*')return table(['Equal groups','Amount in each'],[[f.a,f.b]],'Each group contains the same amount. The total is not shown.');
  if(f.op==='/')return table(['Total to share','Number of equal shares'],[[f.a,f.b]],'The unknown is the amount in one share.');
 }
 if(p.code==='RATE'){
  if(/price per/.test(q))return table(['Notebooks','Total cost ($)'],[[ns[0],ns[1]]],'Find the cost for one notebook.');
  if(/What do/.test(q))return table(['Cost per notebook ($)','Notebooks'],[[ns[0],ns[1]]],'Repeat the same price for each notebook.');
  return table(['Cost per notebook ($)','Money available ($)'],[[ns[0],ns[1]]],'Count how many equal prices fit in the available money.');
 }
 if(p.code==='MONEY'){
  if(/Compare/.test(q))return table(['First amount ($)','Second amount ($)'],[[ns[0],ns[1]]],'Compare dollars first, then cents when the dollars match.');
  if(/Count \$/.test(q))return table(['Notes ($)','Coins (cents)'],[[ns[0],ns.slice(1).join(', ')]],'The coins and notes use different units; include every stated value.');
  if(f&&(f.op==='+'||f.op==='-'))return {kind:'bar',whole:f.op==='+'?null:f.a,parts:f.op==='+'?[f.a,f.b]:[null,f.b],labels:['dollars','dollars']};
 }
 if(p.code==='DEC'){
  if(/Compare/.test(q))return table(['First decimal','Second decimal'],[[ns[0],ns[1]]],'Compare matching place values. A trailing zero does not change the value.');
  if(/as a decimal/.test(q))return {kind:'fractions',denominators:[ns[1]],shaded:[ns[0]],hideValue:true};
  if(/as a fraction/.test(q)){const digits=String(ns[0]).split('.')[1]??'';return {kind:'place',wholes:Math.floor(ns[0]),digits:[...digits].map(Number)};}
  if(f&&/Calculate/.test(q))return table(['Starting amount',f.op==='+'?'Amount added':f.op==='-'?'Amount removed':f.op==='*'?'Scale factor':'Equal divisor'],[[fmt(f.a),fmt(f.b)]],'Track the value of the units, not just the digit strings.');
 }
 if(p.code==='PCT'){
  if(/whole quantity/.test(q))return table(['Known share (%)','Amount in that share'],[[ns[0],ns[1]]],'The whole is unknown and represents 100%.');
  if(/changes from/.test(q))return table(['Original amount','New amount'],[[ns[0],ns[1]]],'The original amount is the reference whole. The change is the gap between these values.');
  if(/discount|GST|interest/i.test(q))return table(['Original amount ($)','Stated rate (%)'],[[ns[0],ns[1]]],'First find the percentage amount. Then decide whether the question needs that part or a final balance.');
  if(/Find .*% of/.test(q))return table(['Whole (100%)','Share required (%)'],[[ns[1],ns[0]]],'The share amount is unknown.');
 }
 if(p.code==='ALG'&&/when x =/.test(q))return table(['Expression','Given value'],[[`${ns[0]}x + ${ns[1]}`,`x = ${ns[2]}`]],'Replace x by the given number before calculating.');
 if(p.code==='RATIO'&&/Complete/.test(q))return table(['First quantity','Second quantity'],[[ns[0],ns[1]],[ns[2],'?']],'Both quantities must grow by the same factor.');
 if(e.tool.kind==='fractions')return {...e.tool,hideValue:true};
 return e.tool;
}

const UNIT_WORD:Record<number,string>={10:'ten',100:'hundred',1000:'thousand'};
const ORDINAL=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
/**
 * “Read a picture or model” questions for question types whose default prompt already states every
 * number. The quantities move into the model, which never prints the answer, so the picture carries
 * information the child needs rather than decorating a calculation.
 */
function modelReading(p:PlanEntry,e:Example,tool:Tool):{prompt:string;tool:Tool}|null{
 const k=factsOf(p,e),v=k.v,T=(headers:string[],row:(string|number)[],caption:string)=>table(headers,[row],caption),strip=(ds:number[],ns:number[]):Tool=>({kind:'fractions',denominators:ds,shaded:ns,hideValue:true});
 switch(k.kind){
  case 'round':return tool.kind==='diagram'&&UNIT_WORD[v.unit]?{tool,prompt:`Round the middle number to the nearest ${UNIT_WORD[v.unit]}.`}:null;
  case 'dec-round':return {tool:T(['Number','Decimal places to keep'],[fmt(v.x),v.places],'Round only at the end'),prompt:'Round the number in the table to the number of decimal places shown.'};
  case 'dec-quotient':return {tool:T(['Divide','By','Decimal places to keep'],[v.a,v.b,v.places],'Divide first, then round'),prompt:'Divide the first number by the second, then round to the number of decimal places shown.'};
  case 'dec-place':{const digits=k.s.text.split('.')[1]?.split('').map(Number)??[];return digits.length&&digits.length<=3?{tool:{kind:'place',wholes:Math.floor(v.x),digits,hideValue:true},prompt:`What is the value of the ${k.s.place} digit in the chart?`}:null;}
  case 'frac-div':{const m=e.prompt.match(/^Calculate (.+) ÷ (.+)\.$/);return m?{tool:T(['Amount','Divide by'],[m[1],m[2]],'Division compares or shares the amount'),prompt:'Divide the amount in the table by the number beside it.'}:null;}
  case 'frac-times':return tool.kind==='scene'?null:{tool:T(['Amount','Multiply by'],[k.s.left,k.s.right],'Multiplication scales the amount'),prompt:'Multiply the amount in the table by the number beside it.'};
  case 'frac-of':return {tool:T(['Whole amount','Fraction to find'],[v.whole,`${v.a}/${v.d}`],'The fraction is a share of the whole amount'),prompt:'Find the fraction shown of the whole amount in the table.'};
  case 'frac-simplify':return v.b<=24?{tool:strip([v.b],[v.a]),prompt:'Write the shaded part of the strip as a fraction in simplest form.'}:{tool:T(['Fraction'],[`${v.a}/${v.b}`],'Divide the top and the bottom by the same number'),prompt:'Write the fraction in the table in simplest form.'};
  case 'frac-missing':{const bottom=k.s.missing==='bottom',big=Number(e.answer);if(bottom&&big<=24)return {tool:strip([v.d,big],[v.n,v.given]),prompt:'The two strips show the same amount. Into how many equal parts is the bottom strip cut?'};if(!bottom&&v.given<=24)return {tool:strip([v.d,v.given],[v.n,big]),prompt:'The two strips show the same amount. How many parts of the bottom strip are shaded?'};return null;}
  case 'frac-share':return {tool:T(['Cakes','Children sharing'],[v.w,v.d],'Every child gets an equal share'),prompt:'The cakes in the table are shared equally. What fraction of a cake does each child get?'};
  case 'gcf':return {tool:T(['First number','Second number'],[v.x,v.y],'Look for factors of both numbers'),prompt:'Find the greatest common factor of the two numbers in the table.'};
  case 'lcm':return {tool:T(['First number','Second number'],[v.a,v.b],'Look for multiples of both numbers'),prompt:'Find the smallest common multiple of the two numbers in the table.'};
  case 'nth-multiple':return {tool:T(['Number','Which multiple'],[v.a,ORDINAL(v.count)],'Count in equal steps'),prompt:'Find the multiple described in the table.'};
  case 'factor-choice':return {tool:T(['Number'],[v.n],'A factor divides it exactly'),prompt:'Which choice is a factor of the number in the table?'};
  case 'remainder':return {tool:T(['Total','Size of each group'],[v.total,v.b],'Make as many full groups as possible'),prompt:'How many are left over after making full groups?'};
  case 'order-ops':return tool.kind==='table'?{tool,prompt:'How many objects are there altogether?'}:null;
  case 'add3':return tool.kind==='table'?{tool,prompt:'What is the total of the three parts in the table?'}:null;
  case 'measure-diff':return tool.kind==='table'?{tool,prompt:'What is the difference between the two readings in the table?'}:null;
  case 'conv':return {tool:T(['Amount','Change it into'],[k.s.text,k.s.to],'The amount stays the same; only the unit changes'),prompt:'Change the amount in the table into the unit shown.'};
  case 'vol-conv':return {tool:T(['Litres'],[fmt(v.litres)],'1 litre = 1000 millilitres'),prompt:'How many cubic centimetres is the amount in the table?'};
  case 'time-sec':return {tool:T(['Minutes','Seconds'],[v.m,v.s],'Change the minutes into seconds, then add'),prompt:'How many seconds is the time in the table altogether?'};
  case 'hm-to-min':return tool.kind==='table'?{tool,prompt:'Use the table. How many minutes is that altogether?'}:null;
  case 'min-to-hm':return tool.kind==='table'?{tool,prompt:'Write the duration in the table in hours and minutes.'}:null;
  case 'time-24':return tool.kind==='diagram'?{tool,prompt:`The clock shows a time in the ${v.pm?'afternoon':'morning'}. Write it in 24-hour time.`}:null;
  case 'duration':return tool.kind==='table'?{tool,prompt:'Use the table. How many minutes does the activity last?'}:null;
  case 'end-time':return tool.kind==='table'?{tool,prompt:'Use the table. When does the activity end?'}:null;
  case 'start-time':return tool.kind==='table'?{tool,prompt:'Use the table. When did the activity start?'}:null;
  case 'rect-area':case 'rect-perim':case 'L-area':case 'L-perim':return tool.kind==='diagram'?{tool,prompt:`Find the ${/perim/.test(k.kind)?'perimeter':'area'} of the ${k.kind.startsWith('L')?'L-shape':'rectangle'} shown.`}:null;
  case 'square-side':return {tool:T(['Area of the square'],[`${v.area} cm²`],'All four sides are equal'),prompt:'Find the side length of the square in the table.'};
  case 'len-from-area':case 'len-from-perim':return tool.kind==='table'?{tool,prompt:'Use the table to find the missing length.'}:null;
  case 'pct-read':return {tool:{kind:'hundred',shaded:v.pct,hideValue:true},prompt:'What percentage of the grid is shaded?'};
  case 'pct-fraction':return {tool:{kind:'hundred',shaded:v.pct,hideValue:true},prompt:'Write the shaded part of the grid as a fraction in simplest form.'};
  case 'discount':return {tool:T(['Price before discount ($)','Discount (%)'],[v.base,v.rate],'The discount is a share of the price before it'),prompt:'What is the sale price of the item in the table?'};
  case 'gst':return {tool:T(['Price before GST ($)','GST rate (%)'],[v.base,v.rate],'GST is a share of the pre-tax price'),prompt:'What is the price including GST for the item in the table?'};
  case 'interest':return {tool:T(['Principal ($)','Interest rate per year (%)'],[v.base,v.rate],'One year of simple interest'),prompt:'How much interest does the principal in the table earn in one year?'};
  case 'angle-point':case 'angle-straight':case 'angle-opposite':case 'tri-third':case 'isosceles':case 'para-angle':case 'corner-split':return tool.kind==='table'?{tool,prompt:'Use the table to find the unknown angle.'}:null;
  case 'mirror':return {tool:T(['Squares from the mirror line'],[v.d],'Reflection keeps the distance from the mirror'),prompt:'How many squares from the mirror line is the reflected point?'};
  case 'ratio-share':return tool.kind==='ratio'?{tool,prompt:'Use the ratio model. How many belong to the first share?'}:null;
  case 'ratio-fraction':return tool.kind==='ratio'?{tool,prompt:'Use the ratio model. What fraction of all the counters is red?'}:null;
  case 'ratio-missing':return tool.kind==='table'?{tool,prompt:'Complete the table so that the ratio stays the same.'}:null;
  case 'ratio-simplify':return {tool:T(['Ratio'],[k.s.terms],'Divide every term by the same number'),prompt:'Write the ratio in the table in simplest form.'};
  case 'alg-sub':return tool.kind==='table'?{tool,prompt:'Find the value of the expression in the table.'}:null;
  case 'alg-expr':return {tool:T(['Packets of x stickers','Loose stickers'],[v.a,v.b],'Each packet holds the same unknown number, x'),prompt:'Write an expression for all the stickers in the table.'};
  case 'alg-simplify':return {tool:T(['First term','Second term'],[`${v.a}x`,`${v.b}x`],'Both terms count the same unknown, x'),prompt:'Simplify the sum of the two terms in the table.'};
  case 'ratio-write':{const m=e.prompt.match(/For every (\d+) red counters there are (\d+) blue(?: and (\d+) green)?/);if(!m)return null;return {tool:m[3]?T(['Red','Blue','Green'],[m[1],m[2],m[3]],'Counts in each group'):T(['Red','Blue'],[m[1],m[2]],'Counts in each group'),prompt:`Write the ratio of the counters in the table, in the order ${m[3]?'red : blue : green':'red : blue'}.`};}
  case 'alg-solve':return tool.kind==='balance'?{tool:{...tool,hideValue:true},prompt:'The balance is level. What is x?'}:null;
  case 'circle':return tool.kind==='diagram'?{tool,prompt:`Find the ${v.perimeter?'perimeter':'area'} of the shape shown. Use π = 22/7.`}:null;
  case 'circle-composite':return tool.kind==='table'?{tool,prompt:`Find the ${v.perimeter?'outer perimeter':'total area'} of the figure in the table: a rectangle with a semicircle on top. Use π = 22/7.`}:null;
  case 'vol-box':return tool.kind==='table'?{tool,prompt:/tank/.test(e.prompt)?'Find the volume of water in the tank described in the table.':'Find the volume of the cuboid in the table.'}:null;
  case 'vol-height':return {tool:T(['Volume','Base'],[`${v.v} cm³`,`${v.a} cm by ${v.b} cm`],'Volume = base area × height'),prompt:'Find the height of the cuboid in the table.'};
  case 'vol-base':return {tool:T(['Volume','Height'],[`${v.v} cm³`,`${v.h} cm`],'Volume = base area × height'),prompt:'Find the base area of the cuboid in the table.'};
  case 'vol-layers':return {tool:T(['Cubes in each layer','Layers'],[v.each,v.layers],'Count one layer, then every layer'),prompt:'How many unit cubes make the solid?'};
  case 'cube-root':return {tool:T(['Volume of the cube'],[`${v.v} cm³`],'All edges of a cube are equal'),prompt:'Find the edge length of the cube in the table.'};
  case 'square-root':return {tool:T(['Area of the square face'],[`${v.area} cm²`],'All sides of a square are equal'),prompt:'Find the edge length of the square face in the table.'};
  case 'table-missing':return tool.kind==='table'?{tool,prompt:'Use the table and its total. What is the missing value?'}:null;
  case 'pie-count':return tool.kind==='diagram'?{tool,prompt:`Use the pie chart. How many voted for ${k.s.label}?`}:null;
 }
 return null;
}
/** Ask for a model reading. The quantities must live in the model, not a repeated equation. */
export function visualQuestion(p:PlanEntry,e:Example,tool:Tool):{prompt:string;tool:Tool}{
 const reading=modelReading(p,e,tool);if(reading)return reading;
 const q=e.prompt,f=e.evidence;
 if(p.code==='WN'&&/value in the/.test(q))return {tool,prompt:`What value is represented in the ${q.match(/value in the (.+?) column/)?.[1]} column of this model?`};
 if(p.code==='AS'&&tool.kind==='bond')return {tool,prompt:'Find the missing value in this number bond.'};
 if(p.code==='AS'&&f)return {tool,prompt:f.op==='+'?'What total do the two parts make?':'How much of the starting whole remains after the shown part is removed?'};
 if(p.code==='MD'&&f)return {tool,prompt:f.op==='*'?'How many objects do these equal groups contain altogether?':'Use the total and the number of equal shares shown. How much belongs in one share?'};
 if(p.code==='WN'){
  if(/Choose the correct relation/.test(q))return {tool,prompt:'Compare the first number with the second number shown. Use <, > or =.'};
  if(/Continue the sequence/.test(q))return {tool,prompt:'Read the table in position order. What value follows the last entry if the same change continues?'};
  if(/in words/.test(q))return {tool,prompt:'Read the place-value groups in the model. Which number name describes their complete value?'};
  if(/in numerals/.test(q))return {tool,prompt:'Read the place-value groups in the model. Write the complete number in numerals.'};
 }
 if(p.code==='FRAC'){
  if(tool.kind==='scene'&&tool.scene==='fraction-product')return {tool,prompt:'What fraction of the whole rectangle is blue? The blue region is the chosen rows within the chosen columns.'};
  if(/as a decimal/.test(q))return {tool,prompt:'Read the chosen share in the model. Write its value as a decimal.'};
  if(/Calculate/.test(q)&&e.evidence&&(e.evidence.op==='+'||e.evidence.op==='-'))return {tool,prompt:e.evidence.op==='+'?'Join the two fractional amounts shown. What is their total?':'Take the second fractional amount shown away from the first. How much remains?'};
  if(/improper fraction/.test(q))return {tool,prompt:'Name the complete amount in the model as an improper fraction.'};
  if(/mixed number/.test(q))return {tool,prompt:'Name the complete amount in the model as a mixed number in simplest form.'};
  if(/Compare/.test(q)&&tool.kind==='fractions')return {tool,prompt:'Compare the chosen amount in the top strip with the chosen amount in the bottom strip. Use <, > or =.'};
  if(/What fraction/.test(q))return {tool,prompt:'What fraction of the whole is chosen in this picture?'};
  if(/Rename/.test(q)&&tool.kind==='fractions')return {tool,prompt:'Use the smaller parts in the bottom strip to name the same chosen amount. Write its numerator and denominator.'};
 }
 if(p.code==='DEC'){
  if(/as a decimal/.test(q))return {tool,prompt:'The strip represents one whole. Write its shaded amount as a decimal.'};
  if(/as a fraction/.test(q))return {tool,prompt:'Read the amount in the place-value chart. Write it as a fraction in simplest form.'};
  if(f&&/Calculate/.test(q))return {tool,prompt:f.op==='+'?'Use the two amounts in the table. What is their sum?':f.op==='-'?'Remove the second amount from the starting amount shown. What remains?':f.op==='*'?'Multiply the starting amount by the scale factor shown. What is the new amount?':'Divide the starting amount by the equal divisor shown. What is one share?'};
 }
 if(p.code==='DEC'&&/Compare/.test(q)||p.code==='MONEY'&&/Compare/.test(q))return {tool,prompt:'Compare the first amount with the second amount in the model. Use <, > or =.'};
 if(p.code==='MONEY'&&/Count/.test(q))return {tool,prompt:`Read every money value shown. What is the total in ${e.unit??'the stated unit'}?`};
 if(p.code==='RATE')return {tool,prompt:/price per/.test(q)?'Use the displayed purchase to find the cost of one notebook.':/What do/.test(q)?'Use the price and number of notebooks in the table. What is the total cost?':'Use the price and money available in the table. How many notebooks can be bought?'};
 if(p.code==='PCT'&&/whole quantity/.test(q))return {tool,prompt:'The table gives a percentage share and its amount. What amount represents the whole 100%?'};
 if(p.code==='PCT'&&/Find .*% of/.test(q))return {tool,prompt:'Read the whole and required percentage from the table. What is the share amount?'};
 if(p.code==='PCT'&&/changes from/.test(q))return {tool,prompt:`Read the original and new amounts. What is the percentage ${q.includes('increase')?'increase':'decrease'}?`};
 if(p.code==='SHAPE'&&tool.kind==='scene'&&tool.scene==='triangle-angles')return {tool,prompt:'Use the two marked angles to find the unknown third angle.'};
 if(p.code==='ANGLE'&&tool.kind==='scene'&&tool.scene==='angles')return {tool,prompt:'Find the unknown angle in the marked straight turn.'};
 if(p.code==='AREA'&&tool.kind==='scene'&&tool.scene==='triangle'&&/Find the triangle area/.test(q))return {tool,prompt:'Read the base and perpendicular height from the picture. Find the triangle area.'};
 if(p.code==='VOL'&&/^Find the volume of a cuboid/.test(q))return {tool,prompt:'Use the three labelled dimensions to find the cuboid volume.'};
 if(p.code==='TIME'&&/Read the clock/.test(q))return {tool,prompt:q};
 if(['GRAPH','SHAPE','SOLID','ANGLE','LINES','LENGTH','SYM'].includes(p.code)&&!/\d/.test(q))return {tool,prompt:q};
 // For a question that already needs a diagram (including named dimensions or unknowns),
 // preserve the exact target. Other questions get an explicit data display so all inputs
 // are visible and the requested quantity remains unambiguous.
 if(tool.kind==='table'||tool.kind==='diagram'||tool.kind==='fractions'||tool.kind==='ratio'||tool.kind==='balance'||tool.kind==='place')return {tool,prompt:q};
 return {tool,prompt:q};
}
