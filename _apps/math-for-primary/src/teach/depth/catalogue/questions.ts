import type {Item,Tool} from '../../model';
import type {Example} from '../../build/sequence';
import type {PlanEntry} from '../../build/plan';
import type {TeachingFocus} from './focus';
import {isCorrect,fmt} from '../../gen';
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

/** Ask for a model reading. The quantities must live in the model, not a repeated equation. */
export function visualQuestion(p:PlanEntry,e:Example,tool:Tool):{prompt:string;tool:Tool}{
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

export function supportFor(_p:PlanEntry,e:Example,base:Item,focus:TeachingFocus):Item{
 const wrong:Record<string,string>={};
 if(base.choices)for(const option of base.choices)if(!isCorrect(base,option))wrong[option]=`${focus.look} ${e.hint}`;
 const f=e.evidence,put=(n:number,text:string)=>{if(Number.isFinite(n)&&!isCorrect(base,fmt(n)))wrong[fmt(n)]=text;};
 if(f&&!base.choices){
  if(f.op==='+'){put(f.a,'That is only one starting part. Include the other part too.');put(f.b,'That is only the other starting part. Include both parts.');put(Math.abs(f.a-f.b),'That finds a difference. The question asks us to join the amounts.');}
  if(f.op==='-'){put(f.a,'That is the starting amount. Account for the part being removed.');put(f.b,'That is the part removed. The question asks for what remains or for the difference.');put(f.a+f.b,'That adds the amounts. Track the subtraction described by this question.');}
  if(f.op==='*'){put(f.a+f.b,'Adding these two numbers does not repeat the equal group or scale the amount. Identify what each factor means.');put(f.a,'That leaves the starting amount unchanged. Account for the stated groups or scale.');}
  if(f.op==='/'){put(f.a*f.b,'That multiplies the quantities. Decide whether the division is sharing an amount or counting how many groups fit.');put(f.a,'That is the entire starting amount. Find the requested share or group count.');}
 }
 const simpler:Item={key:`support-${base.key}`,prompt:focus.question,answer:focus.answer,choices:[focus.answer,focus.error],exact:true,tool:base.tool,requiresModel:true,hints:[focus.look],steps:[focus.look,focus.why],check:focus.why,wrong:{[focus.error]:focus.why}};
 return {...base,wrong,simpler,another:[{title:'Start from what the picture means',steps:[focus.look,e.why,e.check],tool:base.tool}],hints:[focus.look,e.hint],steps:[e.why,...e.steps]};
}
