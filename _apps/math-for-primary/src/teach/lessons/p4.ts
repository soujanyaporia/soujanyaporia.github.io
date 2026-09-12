import type { Gen,Lesson } from '../model';
import { choicesOf,fmt,rngFor } from '../gen';
/**
 * P4 exemplar: decimals as place value. Tenths, hundredths and thousandths are built from the
 * place-value chart and the hundred grid, then compared and added by matching place values —
 * never by “lining up the dots” alone (MOE p. 38).
 */
const A='p4-decimal-place-value',B='p4-decimal-add-subtract';
const PLACES=['tenths','hundredths','thousandths'];
const chart=(wholes:number,digits:number[]):{kind:'place';digits:number[];wholes:number}=>({kind:'place',digits,wholes});
const value=(wholes:number,digits:number[])=>Math.round((wholes+digits.reduce((s,d,i)=>s+d/10**(i+1),0))*1000)/1000;
function digitValue(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),wholes=r.int(1,9),digits=[r.int(1,9),r.int(1,9),r.int(1,9)],place=r.int(0,2),digit=digits[place],answer=digit/10**(place+1);
 return {key:`${salt}-${i}`,prompt:`What is the value of the ${digit} in the ${PLACES[place]} column?`,display:fmt(value(wholes,digits)),answer:fmt(answer),facet:'direct',rep:'place-value',tool:chart(wholes,digits),
  hints:[`Find which column the ${digit} sits in.`,`It is in the ${PLACES[place]} column.`,`${digit} ${PLACES[place]} = ${digit} ÷ ${10**(place+1)}.`],
  steps:[`The digit ${digit} is in the ${PLACES[place]} column.`,`${digit} ${PLACES[place]} means ${digit} ÷ ${10**(place+1)}.`,'What is its value?'],
  wrong:{...(digit!==answer?{[String(digit)]:`${digit} is the digit. Its value depends on the column it sits in: here it means ${digit} ${PLACES[place]}.`}:{})},
  check:`${digit} ${PLACES[place]} = ${fmt(answer)} ✓`};
};}
function buildDecimal(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),wholes=r.int(0,4),digits=[r.int(0,9),r.int(0,9),0],answer=value(wholes,digits);
 const words=[wholes?`${wholes} ones`:'',digits[0]?`${digits[0]} tenths`:'',digits[1]?`${digits[1]} hundredths`:''].filter(Boolean).join(' + ')||'0';
 return {key:`${salt}-${i}`,prompt:`Write this as a decimal: ${words}.`,answer:fmt(answer),facet:'missing',rep:'place-value',tool:chart(wholes,digits),
  hints:['Put each digit in its own column.','Tenths come first after the point, then hundredths.'],steps:[`Ones: ${wholes}. Tenths: ${digits[0]}. Hundredths: ${digits[1]}.`,`That is ${fmt(answer)}.`],
  check:`${words} = ${fmt(answer)} ✓`};
};}
function fractionToDecimal(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),d=r.pick([10,100]),n=r.int(1,d===10?9:99),answer=n/d;
 return {key:`${salt}-${i}`,prompt:'Write this fraction as a decimal.',display:`${n}/${d}`,answer:fmt(answer),facet:'reverse',rep:'hundred-grid',tool:d===100?{kind:'hundred',shaded:n}:chart(0,[n,0,0]),
  hints:[`${n}/${d} means ${n} ${d===10?'tenths':'hundredths'}.`,`Put ${n} into the ${d===10?'tenths':'hundredths'} column${d===100&&n>9?'s':''}.`],
  steps:[`${n}/${d} = ${n} ${d===10?'tenths':'hundredths'}.`,`As a decimal that is ${fmt(answer)}.`],check:`${fmt(answer)} × ${d} = ${n} ✓`};
};}
function compareDecimals(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(1,9)/10,b=r.int(11,99)/100,answer=a>b?'>':a<b?'<':'=';
 return {key:`${salt}-${i}`,prompt:'Choose the sign that makes this true.',display:`${fmt(a)}  □  ${fmt(b)}`,answer,choices:['<','>','='],facet:'reasoning',rep:'place-value',tool:{kind:'fractions',denominators:[100,100],shaded:[Math.round(a*100),Math.round(b*100)],hideValue:true},
  hints:['Compare the tenths first, then the hundredths.',`${fmt(a)} has ${Math.round(a*10)} tenths; ${fmt(b)} has ${Math.floor(b*10)} tenths.`,'More digits does not mean a bigger number.'],
  steps:[`${fmt(a)} is ${Math.round(a*100)} hundredths.`,`${fmt(b)} is ${Math.round(b*100)} hundredths.`,`So ${fmt(a)} ${answer} ${fmt(b)}.`]};
};}
function gridRead(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),n=r.int(5,95);
 return {key:`${salt}-${i}`,prompt:'The whole square is 1. What decimal is shaded?',answer:fmt(n/100),facet:'visual',rep:'hundred-grid',tool:{kind:'hundred',shaded:n},
  hints:['The square has 100 small parts.',`${n} of 100 is ${n}/100.`],steps:[`${n} out of 100 squares are shaded.`,`${n}/100 = ${fmt(n/100)}.`],check:`${fmt(n/100)} × 100 = ${n} squares ✓`};
};}
function measureStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),cm=r.int(11,199),m=cm/100,askCm=r.chance(.5);
 return {key:`${salt}-${i}`,prompt:askCm?`A ribbon is ${fmt(m)} m long. How many centimetres is that?`:`A ribbon is ${cm} cm long. Write its length in metres.`,answer:askCm?String(cm):fmt(m),unit:askCm?'cm':'m',facet:'word',rep:'story',
  hints:['1 metre is 100 centimetres.',askCm?`${fmt(m)} × 100`:`${cm} ÷ 100`],steps:[`1 m = 100 cm.`,askCm?`${fmt(m)} m = ${fmt(m)} × 100 = ${cm} cm.`:`${cm} cm = ${cm} ÷ 100 = ${fmt(m)} m.`],check:`${cm} cm and ${fmt(m)} m are the same length ✓`};
};}
function longerLooksBigger(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),tenths=r.int(6,9),hundredths=r.int(11,tenths*10-1),answer=`0.${tenths} is larger: it has ${tenths} tenths, and 0.${hundredths} has only ${Math.floor(hundredths/10)}`;
 return {key:`${salt}-${i}`,prompt:`Ravi says 0.${hundredths} is larger than 0.${tenths} because ${hundredths} is larger than ${tenths}. What would you tell Ravi?`,answer,choices:choicesOf(r,answer,['Ravi is right: more digits means a larger number','They are equal','You cannot compare tenths with hundredths']),facet:'reasoning',rep:'hundred-grid',tool:{kind:'hundred',shaded:tenths*10},
  hints:['Compare the tenths column first.',`0.${tenths} is ${tenths*10} hundredths.`],steps:[`0.${tenths} = ${tenths*10} hundredths.`,`0.${hundredths} = ${hundredths} hundredths.`,`${tenths*10} > ${hundredths}, so 0.${tenths} is larger.`]};
};}
/** Addition and subtraction of two-place decimals, worked in whole hundredths so the values are exact. */
function addSubtract(id:string,salt:string,op?:'+'|'-'):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),plus=op?op==='+':r.chance(.5),x=r.int(105,899),y=r.int(15,Math.min(x-5,499));
 const a=x/100,b=y/100,answer=(plus?x+y:x-y)/100;
 return {key:`${salt}-${i}`,prompt:plus?'Add the decimals.':'Subtract the decimals.',display:`${fmt(a)} ${plus?'+':'−'} ${fmt(b)}`,answer:fmt(answer),facet:plus?'direct':'missing',rep:'place-value',tool:{kind:'bar',whole:plus?null:a,parts:plus?[a,b]:[null,b],labels:plus?['first amount','second amount']:['remaining','removed']},
  hints:['Match the columns: ones with ones, tenths with tenths, hundredths with hundredths.','Write both numbers with the same number of decimal places if it helps.',`${x} hundredths ${plus?'+':'−'} ${y} hundredths`],
  steps:[`${fmt(a)} is ${x} hundredths and ${fmt(b)} is ${y} hundredths.`,`${x} ${plus?'+':'−'} ${y} = ${plus?x+y:x-y} hundredths.`,`That is ${fmt(answer)}.`],
  another:[{title:'Count in hundredths',steps:[`Work entirely in hundredths: ${x} ${plus?'+':'−'} ${y} = ${plus?x+y:x-y}.`,`Then put the point back: ${fmt(answer)}.`]}],
  check:plus?`${fmt(answer)} − ${fmt(b)} = ${fmt(a)} ✓`:`${fmt(answer)} + ${fmt(b)} = ${fmt(a)} ✓`};
};}
function missingAddend(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(105,499),b=r.int(15,399),total=a+b;
 return {key:`${salt}-${i}`,prompt:'Find the missing amount that completes this addition.',display:`${fmt(a/100)} + □ = ${fmt(total/100)}`,answer:fmt(b/100),facet:'missing',rep:'bar-model',tool:{kind:'bar',whole:total/100,parts:[a/100,null]},
 hints:['The total contains the known part and the missing part.','Remove the known part from the total.'],steps:[`The whole is ${total} hundredths.`,`Remove ${a} hundredths: ${total} − ${a} = ${b}.`,`The missing part is ${fmt(b/100)}.`],check:`${fmt(a/100)} + ${fmt(b/100)} = ${fmt(total/100)}.`};
};}
function moneyStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),cost=r.int(125,899),paid=r.pick([1000,2000]),change=(paid-cost)/100;
 return {key:`${salt}-${i}`,prompt:`A book costs $${(cost/100).toFixed(2)}. Kai pays with a $${paid/100} note. How much change should he get?`,answer:fmt(change),unit:'dollars',facet:'word',rep:'story',tool:{kind:'bar',whole:paid/100,parts:[cost/100,null],labels:['price ($)','change ($)']},
  hints:['Change is what is left after paying.',`$${paid/100} − $${(cost/100).toFixed(2)}`,'Match the columns: dollars with dollars, cents with cents.'],
  steps:[`${paid} cents − ${cost} cents = ${paid-cost} cents.`,`That is $${change.toFixed(2)}.`],check:`$${(cost/100).toFixed(2)} + $${change.toFixed(2)} = $${(paid/100).toFixed(2)} ✓`};
};}
function alignmentMistake(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),whole=r.int(2,8),dec=r.int(11,89),answer=`No: the ${dec%10} is hundredths, so it cannot be added to the ones`;
 return {key:`${salt}-${i}`,prompt:`To work out ${whole} + 0.${dec}, Mei writes the ${dec} under the ${whole}. Is that right?`,answer,choices:choicesOf(r,answer,['Yes: just write the digits underneath each other','Yes, because both are numbers',`No: 0.${dec} should be rounded first`]),facet:'reasoning',rep:'place-value',tool:chart(whole,[Math.floor(dec/10),dec%10,0]),
  hints:['Which column does each digit belong to?'],steps:[`${whole} is ${whole} ones.`,`0.${dec} is ${Math.floor(dec/10)} tenths and ${dec%10} hundredths.`,'Digits must be written under the same place value, so the ones stay with the ones.']};
};}
export const P4_LESSONS:Lesson[]=[{
 id:A,level:4,track:'both',world:'decimal-depths',title:'Tenths, hundredths and thousandths',minutes:12,skillIds:['P4.S.DEC.01','P4.S.DEC.02','P4.S.DEC.03'],activityId:'p4s-decimalPlace-n10',
 objectives:['Read the value of each digit in a decimal','Write a decimal from its place-value parts','Convert tenths and hundredths between fractions and decimals','Compare decimals by place value'],
 canDo:['say what the 4 is worth in 3.427','write 4 tenths and 3 hundredths as 0.43','change 7/10 and 35/100 into decimals','explain why 0.8 is bigger than 0.75'],
 prerequisites:['P3.S.WN.01','P2.S.FRAC.01'],representations:['place-value','hundred-grid','symbols','story'],
 misconceptions:[{name:'Reading decimals as whole numbers',fix:'0.75 is not bigger than 0.8 because 75 > 8. Compare tenths first: 0.8 has 8 tenths, 0.75 has 7.'},{name:'Confusing a digit with its value',fix:'The 4 in 3.427 is worth 4 tenths, not 4. Its column decides its value.'}],
 grows:['P2: money written as dollars and cents','P4: 0.437 as tenths, hundredths and thousandths','P5: multiplying and dividing decimals by 10, 100 and 1000','P6: decimals, fractions and percentages as one idea'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'What is the value of the 6 in 460?',answer:'60',hints:['Which column is the 6 in?'],steps:['The 6 is in the tens column.','6 tens = 60.']},
   {key:'warm-2',prompt:'What fraction of the hundred square is shaded?',answer:'30/100',exact:true,choices:['30/100','3/100','30/10'],hints:['Count the shaded small squares out of 100.'],steps:['30 of the 100 squares are shaded.'],tool:{kind:'hundred',shaded:30}}],
   booster:[{text:'Each place is ten times the one to its right: 100, 10, 1.',math:'400 + 60 = 460'},{text:'A hundred square shows hundredths: each small square is 1/100 of the whole.',tool:{kind:'hundred',shaded:25}}]},
  {kind:'hook',title:'Cutting one metre',text:'A one-metre ribbon is cut into 10 equal pieces. Each piece is one tenth of a metre, written 0.1 m. Cut each of those into 10 again and you get hundredths: 0.01 m, which is 1 cm.',tool:chart(1,[0,0,0])},
  {kind:'explore',title:'Build a decimal',text:'Use the columns to build the number 2.45: two ones, four tenths and five hundredths.',tool:chart(2,[0,0,0]),goal:t=>t.kind==='place'&&(t.wholes??0)===2&&t.digits[0]===4&&t.digits[1]===5&&t.digits[2]===0,goalHint:'You need 4 in the tenths column and 5 in the hundredths column.',success:'2.45 is 2 ones + 4 tenths + 5 hundredths.'},
  {kind:'notice',title:'What do you notice?',text:'Compare the same-sized strips: 0.8 is shaded above, and 0.75 below. Both wholes contain 100 equal parts.',tool:{kind:'fractions',denominators:[100,100],shaded:[80,75],hideValue:true},options:[
   {text:'0.8 covers more of the square: 80 hundredths against 75',correct:true,reply:'Yes. 0.8 is 8 tenths, which is 80 hundredths.'},
   {text:'0.75 is bigger because 75 is bigger than 8',correct:false,reply:'That compares the digits, not their value. 0.75 is 75 hundredths and 0.8 is 80 hundredths.'},
   {text:'They are the same',correct:false,reply:'80 hundredths and 75 hundredths differ by 5 hundredths.'}]},
  {kind:'connect',title:'One amount, three ways to write it',rows:[
   {text:'Sixty small squares of a hundred are shaded.',tool:{kind:'hundred',shaded:60}},
   {text:'As a fraction that is 60/100, which is the same as 6/10.',math:'60/100 = 6/10'},
   {text:'In the place-value chart, 6 sits in the tenths column.',tool:chart(0,[6,0,0])},
   {text:'As a decimal we write it 0.6.',math:'6/10 = 0.6'}]},
  {kind:'explain',title:'Every place is ten times smaller',text:'Moving right along the chart divides the value by ten each time: ones, tenths, hundredths, thousandths. A digit’s value is the digit multiplied by the value of its column.',math:'0.437 = 4 tenths + 3 hundredths + 7 thousandths',tool:chart(0,[4,3,7]),
   why:{question:'Why does 0.8 equal 0.80?',answer:'8 tenths and 80 hundredths shade exactly the same part of the square: each tenth is ten hundredths. Writing an extra zero on the right adds no value, it only says the amount to a finer level of detail.',tool:{kind:'hundred',shaded:80}}},
  {kind:'worked',title:'Worked example',problem:'What is the value of the 4 in 3.427?',steps:[
   {text:'Put the number into the chart.',tool:chart(3,[4,2,7])},
   {text:'Which column is the 4 in?',ask:{prompt:'The 4 is in the…',choices:['tenths column','hundredths column','ones column'],answer:'tenths column'}},
   {text:'A digit in the tenths column is worth that many tenths.',math:'4 tenths = 4 ÷ 10',ask:{prompt:'What is the value of the 4?',answer:'0.4'}},
   {text:'So the 4 is worth 0.4, not 4.',math:'3.427 = 3 + 0.4 + 0.02 + 0.007'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:digitValue(A,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:buildDecimal(A,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:measureStory(A,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[longerLooksBigger(A,'detective')(0,0),{key:'zero-place',prompt:'Which number is the largest?',answer:'0.5',choices:['0.5','0.45','0.09'],facet:'reasoning',rep:'place-value',tool:{kind:'hundred',shaded:50},hints:['Compare the tenths column first.'],steps:['0.5 has 5 tenths; 0.45 has 4 tenths; 0.09 has 0 tenths.','So 0.5 is the largest.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:digitValue(A,'m-direct')},{facet:'visual',gen:gridRead(A,'m-visual')},{facet:'reverse',gen:fractionToDecimal(A,'m-reverse')},
   {facet:'missing',gen:buildDecimal(A,'m-missing')},{facet:'word',gen:measureStory(A,'m-word')},{facet:'unfamiliar',gen:compareDecimals(A,'m-compare')},{facet:'reasoning',gen:longerLooksBigger(A,'m-reason')}]},
  {kind:'discovery',title:'You discovered: place value keeps going',text:'The pattern of ones, tens and hundreds carries on past the point, getting ten times smaller each step. That is all a decimal is.',math:'1  ·  0.1  ·  0.01  ·  0.001',tool:chart(1,[1,1,1])},
 ]},{
 id:B,level:4,track:'both',world:'decimal-depths',title:'Adding and subtracting decimals',minutes:12,skillIds:['P4.S.DEC.05'],activityId:'p4s-decimalAdd-n14',
 objectives:['Add and subtract decimals with up to two decimal places','Match digits by place value before calculating','Check an answer using the inverse operation'],
 canDo:['work out 3.40 + 2.75 and 6.15 − 2.75','explain why digits must sit under the same column','check a decimal answer by adding back'],
 prerequisites:[A],representations:['place-value','hundred-grid','symbols','story'],
 misconceptions:[{name:'Lining the numbers up on the right',fix:'3 + 0.45 is not 3.45 written as 348. Ones go under ones and hundredths under hundredths, whatever the length.'},{name:'Forgetting to regroup ten hundredths as one tenth',fix:'0.07 + 0.05 is 12 hundredths, which is 1 tenth and 2 hundredths: 0.12.'}],
 grows:['P3: adding money in dollars and cents','P4: 3.4 + 2.75','P5: decimals in measurement conversions','P6: decimal answers in multi-step problems'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'What is the value of the 5 in 0.35?',answer:'0.05',hints:['Which column is the 5 in?'],steps:['The 5 is in the hundredths column.','5 hundredths = 0.05.'],tool:chart(0,[3,5,0])},
   {key:'warm-2',prompt:'How many hundredths are the same as 3 tenths?',answer:'30',hints:['Each tenth is ten hundredths.'],steps:['1 tenth = 10 hundredths.','3 tenths = 30 hundredths.'],tool:{kind:'hundred',shaded:30}}],
   booster:[{text:'Ten hundredths make one tenth, just as ten ones make one ten.',tool:{kind:'hundred',shaded:10}},{text:'Every digit keeps the value of its column.',tool:chart(2,[4,5,0])}]},
  {kind:'hook',title:'Two ribbons',text:'One ribbon is 3.4 m long and another is 2.75 m. Laid end to end, how long are they? The tricky part is that one length has tenths only and the other has hundredths.',tool:chart(3,[4,0,0])},
  {kind:'explore',title:'Same length, finer units',text:'3.4 and 3.40 are the same length. Build 3 ones, 4 tenths and 0 hundredths, and see the value stay at 3.4.',tool:chart(3,[0,0,0]),goal:t=>t.kind==='place'&&(t.wholes??0)===3&&t.digits[0]===4&&t.digits[1]===0,goalHint:'Put 4 in the tenths column and leave hundredths at 0.',success:'3.4 = 3.40. Writing the extra zero does not change the value, and it makes the columns easy to match.'},
  {kind:'notice',title:'Which columns pair up?',text:'We want to add 3.4 and 2.75.',tool:chart(2,[7,5,0]),options:[
   {text:'Tenths add to tenths, and hundredths add to hundredths',correct:true,reply:'Yes. Only digits with the same place value can be added.'},
   {text:'The last digits add together: 4 + 5',correct:false,reply:'The 4 is 4 tenths and the 5 is 5 hundredths. They are different sizes, so they cannot be added directly.'},
   {text:'Add the whole numbers and put the decimals side by side',correct:false,reply:'That would give the wrong amount. Each column must be added separately, with regrouping when needed.'}]},
  {kind:'connect',title:'From columns to a number sentence',rows:[
   {text:'3.4 is 3 ones and 4 tenths, or 340 hundredths.',tool:chart(3,[4,0,0])},
   {text:'2.75 is 2 ones, 7 tenths and 5 hundredths, or 275 hundredths.',tool:chart(2,[7,5,0])},
   {text:'Add the hundredths: 340 + 275 = 615 hundredths.',math:'340 + 275 = 615'},
   {text:'615 hundredths is 6 ones, 1 tenth and 5 hundredths.',math:'3.4 + 2.75 = 6.15',tool:chart(6,[1,5,0])}]},
  {kind:'explain',title:'Match the place values',text:'Write the numbers so that each column lines up with the same column: ones under ones, tenths under tenths, hundredths under hundredths. The decimal points then line up as a result, not as the rule.',math:'3.40 + 2.75 = 6.15',
   why:{question:'Why must the columns match?',answer:'Adding means combining amounts of the same size. Four tenths and five hundredths are different sizes, so they cannot be combined until they are written in the same units: 0.40 and 0.05 are 40 and 5 hundredths.',tool:{kind:'hundred',shaded:40}}},
  {kind:'worked',title:'Worked example',problem:'6.15 − 2.75',steps:[
   {text:'Write both to the same number of decimal places.',math:'6.15 − 2.75'},
   {text:'Think in hundredths.',math:'615 hundredths − 275 hundredths',ask:{prompt:'615 − 275 = ?',answer:'340'}},
   {text:'340 hundredths is 3 ones and 4 tenths.',tool:chart(3,[4,0,0])},
   {text:'So the answer is 3.4.',math:'6.15 − 2.75 = 3.4'},
   {text:'Check by adding back.',math:'3.4 + 2.75 = 6.15 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:addSubtract(B,'guided','+'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:addSubtract(B,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:moneyStory(B,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[alignmentMistake(B,'detective')(0,0),{key:'estimate-check',prompt:'Without calculating exactly: about how much is 4.85 + 3.2?',answer:'About 8',choices:['About 8','About 5','About 80'],facet:'reasoning',rep:'symbols',hints:['Round each number to the nearest whole one.'],steps:['4.85 is nearly 5 and 3.2 is about 3.','5 + 3 = 8, so the answer should be close to 8.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:addSubtract(B,'m-direct','+')},{facet:'visual',gen:(seed,i)=>({...addSubtract(B,'m-visual','+')(seed,i),prompt:'The bar shows two lengths in metres. What total length do they make?',display:undefined,unit:'m'})},{facet:'reverse',gen:addSubtract(B,'m-reverse','-')},
   {facet:'missing',gen:missingAddend(B,'m-missing')},{facet:'word',gen:moneyStory(B,'m-word')},{facet:'unfamiliar',gen:(seed,i)=>({...moneyStory(B,'m-change')(seed,i),prompt:'The bar shows the payment and the book price in dollars. How much change is due?'})},{facet:'reasoning',gen:alignmentMistake(B,'m-reason')}]},
  {kind:'discovery',title:'You discovered: columns rule, not the dot',text:'Adding decimals is the same as adding whole numbers, as long as each digit stays in its own column. The decimal point simply marks where the ones end.',math:'3.40 + 2.75 = 6.15',tool:chart(6,[1,5,0])},
 ]}];
