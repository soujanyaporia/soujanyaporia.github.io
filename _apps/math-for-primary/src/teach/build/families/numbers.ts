import {numberBondSpec} from './numberBonds';
import {joinCounters,takeAwayCounters} from '../../../engine/explain/visuals';
import {fmt,choicesOf} from '../../gen';
import {words} from './wn';
import type {PlanEntry} from '../plan';
import {sequence,table,diagram,exploreArray,type Example,type TopicSpec} from '../sequence';
const cap=(p:PlanEntry)=>[0,100,1000,10000,100000,10000000,10000000][p.level];
const PLACE_NAMES=['ones','tens','hundreds','thousands','ten thousands'];
const placeParts=(n:number)=>String(n).split('').map((d,j,s)=>Number(d)*10**(s.length-j-1)).filter(Boolean);
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
/** Split by place value, never into an empty part: 570 × 3 = 500 × 3 + 70 × 3. */
function multiplySteps(a:number,b:number,answer:number){
 const parts=placeParts(a);
 if(parts.length>1)return [`Split ${a} by place value: ${parts.join(' + ')}.`,`${parts.map(v=>`${v} × ${b} = ${v*b}`).join('; ')}.`,`Join the products: ${parts.map(v=>v*b).join(' + ')} = ${answer}.`];
 if(a>=10){const k=String(a).length-1,lead=a/10**k;return [`${a} is ${lead} ${PLACE_NAMES[k]}.`,`${lead} × ${b} = ${lead*b}, so ${a} × ${b} is ${lead*b} ${PLACE_NAMES[k]}.`,`${lead*b} ${PLACE_NAMES[k]} = ${answer}.`];}
 return [`${a} × ${b} means ${a} groups of ${b}.`,`Count in ${b}s, ${a} times.`,`${a} × ${b} = ${answer}.`];
}
function divideSteps(a:number,b:number,q:number){
 const parts=placeParts(q);
 if(parts.length>1)return [`Split ${a} into parts that divide easily by ${b}: ${parts.map(v=>v*b).join(' + ')}.`,`${parts.map(v=>`${v*b} ÷ ${b} = ${v}`).join('; ')}.`,`Join the answers: ${parts.join(' + ')} = ${q}.`];
 if(q>=10){const k=String(q).length-1,lead=q/10**k;return [`Think of ${a} as ${a/10**k} ${PLACE_NAMES[k]}.`,`${a/10**k} ÷ ${b} = ${lead}, so the answer is ${lead} ${PLACE_NAMES[k]}.`,`${lead} ${PLACE_NAMES[k]} = ${q}.`];}
 return [`${a} ÷ ${b} asks how many ${b}s make ${a}.`,`${b} × ${q} = ${a}.`,`So ${a} ÷ ${b} = ${q}.`];
}
export function numberSpec(p:PlanEntry):TopicSpec{
 const text=p.objective.toLowerCase(),g=p.level,f=p.track==='foundation';
 const spec:TopicSpec={concept:'A digit records how many units of a particular size there are. Ten of one unit make one unit in the next column. Compare corresponding columns and keep zeroes where a column is empty.',vocabulary:['digit','place value','ones','tens'],misconception:'A digit and its value are different. In 52 the digit 5 represents five tens, which is 50.',explore:{kind:'explore',title:'Make tens and ones',text:'Shade 24 squares: two complete rows of ten, then four more.',tool:{kind:'hundred',shaded:20},goal:t=>t.kind==='hundred'&&t.shaded===24,goalHint:'Tap square 24.',success:'Two tens and four ones make 24. A ten is a group, not a single square.'},example:(r,i)=>{
  const max=f&&/compare|pattern/.test(text)?100000:cap(p),n=r.int(Math.max(12,Math.floor(max/10)),max),digits=String(n),place=r.int(0,digits.length-1),value=Number(digits[place])*10**(digits.length-place-1),labels=['ones','tens','hundreds','thousands','ten thousands','hundred thousands','millions','ten millions'],column=labels[digits.length-place-1];
  const grid=table(['Place','Digit','Value'],digits.split('').map((d,j)=>[labels[digits.length-j-1],d,Number(d)*10**(digits.length-j-1)]),'Read one place at a time');
  let prompt=`What is the value in the ${column} column of ${n.toLocaleString('en-SG')}?`,answer=String(value),steps=[`Locate the ${column} column.`,`The digit is ${digits[place]}.`,`${digits[place]} × ${10**(digits.length-place-1)} = ${value}.`],context=`A counter records ${n.toLocaleString('en-SG')} visitors. How many does its ${column} digit represent?`,tool=grid,choices:string[]|undefined,exact=false;
  let why='A digit counts units of its place value.',error='The value of a digit is always the digit itself.',check=`Adding the place values rebuilds ${n}.`;
  if(/read and write|number names/.test(text)){
   const name=words(n);const toWords=i%2===1;prompt=toWords?`Write ${n.toLocaleString('en-SG')} in words.`:`Write “${name}” in numerals.`;answer=toWords?name:String(n);exact=toWords;
   if(toWords)choices=choicesOf(r,name,[words(n+1),words(n-1),words(Math.max(1,n-10))]);
   steps=[`Read the largest place-value group first, then each smaller group.`,`Empty columns still need zeroes in the numeral.`,`${n.toLocaleString('en-SG')} is ${name}.`];context=`A museum label shows ${toWords?n.toLocaleString('en-SG'):name} objects. Rewrite the count ${toWords?'in words':'in numerals'}.`;why='Number words and numerals describe the same groups of place-value units.';error='Omit a zero whenever no word names its column.';check=`Read the result back: ${name} = ${n}.`;
  }else if(/ordinal/.test(text)){
   const names=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'],position=r.int(1,10);prompt=`Which word describes position ${position} from the front?`;answer=names[position-1];choices=choicesOf(r,answer,names);tool=table(['Place from front','Runner'],Array.from({length:10},(_,j)=>[j+1,String.fromCharCode(65+j)]),'Finish order');steps=['Start counting at the stated end.','Count each position once.',`Position ${position} is ${answer}.`];context=`Runners finish in the order shown. What is runner ${String.fromCharCode(64+position)}’s position?`;why='Ordinal words name a position in an order, not the size of a group.';error='Count from either end; the position will be the same.';check=`There are ${position-1} positions before the ${answer} position.`;
  }else if(/odd/.test(text)){
   const odd=n%2===1;prompt=`Is ${n} odd or even?`;answer=odd?'Odd':'Even';choices=['Odd','Even'];steps=['Every complete ten can be paired.','Check the ones digit.',`${n} ${odd?'leaves one over':'pairs exactly'}, so it is ${answer.toLowerCase()}.`];context=`${n} pupils form pairs. Does the count represent an odd or even number?`;why='Even numbers form complete pairs; odd numbers leave one over.';error='The first digit determines whether a number is odd.';check=`${n} = 2 × ${Math.floor(n/2)}${odd?' + 1':''}.`;
  }else if(/round|estimate/.test(text)){
   const unit=r.pick([10,100,1000]),v=r.int(unit+1,Math.max(unit+2,Math.min(max-1,unit*20))),rounded=Math.round(v/unit)*unit;prompt=`Round ${v} to the nearest ${unit}.`;answer=String(rounded);tool=diagram({type:'pattern',items:[String(Math.floor(v/unit)*unit),String(v),String((Math.floor(v/unit)+1)*unit)]},'The number lies between neighbouring multiples.');steps=[`Neighbouring multiples: ${Math.floor(v/unit)*unit} and ${(Math.floor(v/unit)+1)*unit}.`,`The halfway point is ${Math.floor(v/unit)*unit+unit/2}.`,`Choose the nearer multiple; a halfway value rounds up: ${rounded}.`];context=`About how many tickets is ${v} tickets, to the nearest ${unit}?`;why='Rounding chooses a nearby benchmark, so the result is approximate.';error='Use = to claim the rounded number is always the exact original number.';check=`${v} ≈ ${rounded}; the distance is no more than ${unit/2}.`;
  }else if(/compare|order|pattern/.test(text)){
   if(/order/.test(text)&&i%3===2){const values=[n,r.int(1,max),r.int(1,max)].sort((a,b)=>a-b);answer=values.join(', ');prompt=`Put ${r.shuffle(values).join(', ')} in increasing order.`;choices=choicesOf(r,answer,[values.slice().reverse().join(', '),[values[1],values[2],values[0]].join(', ')]);tool=table(['Numbers'],(prompt.match(/\d+/g)??[]).map(v=>[v]),'Compare place values');steps=['Compare the greatest place first.','Continue through smaller places when digits match.',`Smallest to greatest: ${answer}.`];context=prompt;why='Increasing order lists each value from smallest to greatest.';error='Order numbers using only their last digit.';check='Each next number is at least as large as the previous number.';}else if(/pattern/.test(text)&&(!/compare/.test(text)||i%2)){
    const step=g===1?r.pick([1,2,5,10]):r.pick([10,100,g>=3?1000:10]),start=r.int(1,Math.max(1,max-4*step));const vals=[0,1,2,3].map(j=>start+j*step);prompt=`Continue the sequence: ${vals.join(', ')}, …`;answer=String(start+4*step);tool=table(['Position','Value'],vals.map((v,j)=>[j+1,v]),'Equal changes');steps=[`Compare neighbours: ${vals[1]} − ${vals[0]} = ${step}.`,`Check the same change at the next pairs.`,`${vals[3]} + ${step} = ${answer}.`];context=`A counter increases by the same amount each time: ${vals.join(', ')}. What count comes next?`;why='A constant-step pattern repeats the same change between neighbours.';error='Choose any larger number; all increasing patterns use the same rule.';check=`${answer} − ${vals[3]} = ${step}.`;
   }else{const other=r.int(1,max),sign=n<other?'<':n>other?'>':'=';prompt=`Choose the correct relation: ${n} □ ${other}.`;answer=sign;choices=['<','>','='];tool=table(['First number','Second number'],[[n,other]],'Compare largest place first');steps=['Line up equal place-value columns.','Compare from the greatest place; the first different digits decide.',`${n} ${sign} ${other}.`];context=`One library has ${n} books and another has ${other}. Which symbol makes ${n} □ ${other} true: <, > or =?`;why='Comparing the largest differing place decides the order.';error='Only compare the ones digits.';check=`The greater number comes later when counting forward.`;}
  }
  return {prompt,answer,steps,hint:steps[0],tool,context,why,error,check,choices,exact};
 }};
 if(/round|estimate/.test(text)){spec.concept='Rounding replaces a number by a nearby multiple of ten, a hundred or a thousand. Locate both neighbouring multiples and their midpoint. Choose the nearer one; at halfway choose the greater. Use ≈ for an estimate, and check an exact calculation against a sensible estimate.';spec.vocabulary=['nearest','midpoint','approximately ≈'];}
 if(/ordinal/.test(text))spec.concept='First, second, third and the other ordinal words describe positions. Always name the end you count from. The third child is one child; three children is a quantity.';
 if(/odd/.test(text))spec.concept='An even number splits into two equal whole groups with nothing left. An odd number leaves one over. Every ten pairs up, so the ones digit decides.';
 return spec;
}
export function arithmeticSpec(p:PlanEntry):TopicSpec{
 if(p.code==='AS'&&/number bonds/.test(p.objective.toLowerCase()))return numberBondSpec();
 const o=p.objective.toLowerCase(),g=p.level,f=p.track==='foundation',mul=p.code==='MD',fact=p.code==='FACT';
 const concept=fact?'A factor divides a number exactly. Multiplying that factor by another whole number gives a multiple. List factor pairs to avoid missing factors; common factors or multiples must belong to both lists.':mul?'Equal groups connect multiplication and division. Number of groups × amount in each group = total. Division finds a missing group count or group size. For larger numbers, split by place value; remainders are smaller than the divisor.':'Addition joins parts to make a whole; subtraction finds a remaining part or a difference. Align ones with ones, tens with tens and hundreds with hundreds. Exchange ten units for one of the next place when needed. Mental strategies split a number into useful parts.';
 return {concept,vocabulary:fact?['factor','multiple','common']:mul?['equal groups','product','quotient','remainder']:['part','whole','difference','exchange'],misconception:fact?'A factor fits exactly into the number; a multiple is made by multiplying. They are not interchangeable.':mul?'Dividing a total by the number of groups gives the amount in each group, not a new total.':'Align place values rather than the left edges of numbers. An exchange changes the representation, not the quantity.',explore:mul||fact?exploreArray():{kind:'explore',title:'Join two parts',text:'Start with 5 counters and add 3 more.',tool:{kind:'counters',count:5,frame:10},goal:t=>t.kind==='counters'&&t.count===8,goalHint:'Add counters until there are 8.',success:'5 and 3 join to make 8.'},example:(r,i)=>{
  if(fact){const a=r.pick([2,3,4,5,6,8]),b=r.pick([2,3,4,5]),n=a*b;const common=/common/.test(o),multiple=/multiple/.test(o)&&(!/factor/.test(o)||i%2===1);const other=a*r.int(2,8);let answer:string,prompt:string,check='';
   if(multiple){const count=r.int(2,8);prompt=common?`What is the smallest positive common multiple of ${a} and ${b}?`:`What is the ${ordinal(count)} positive multiple of ${a}?`;let l=a;while(l%b)l+=a;answer=String(common?l:a*count);check=common?`${answer} ÷ ${a} and ${answer} ÷ ${b} are whole numbers.`:`${count} × ${a} = ${answer}.`;
   }else if(common){let d=Math.min(n,other);while(n%d||other%d)d--;prompt=`Find the greatest common factor of ${n} and ${other}.`;answer=String(d);check=`${n} ÷ ${d} = ${n/d} and ${other} ÷ ${d} = ${other/d}.`;}else{prompt=`Which number is a factor of ${n}?`;answer=String(a);}
   const options=!multiple&&!common?choicesOf(r,answer,[String(n+1),String(n+2)]):undefined;
   const steps=multiple?['Write successive multiples of each given number.','For common multiples, keep numbers in both lists.',check!]:['List factor pairs by testing exact division.','A common factor must divide both given numbers.',check!||`${n} ÷ ${a} = ${b}, with no remainder.`];
   return {prompt,answer,choices:options,steps,hint:steps[0],tool:table(['Number','Some factor pairs'],[[n,`1 × ${n}; ${a} × ${b}`]],'A product links factors and multiples'),context:`A club is arranging equal rows. ${prompt}`,why:multiple?'Multiples are found by counting equal groups; common multiples occur in both lists.':'A factor divides a quantity into complete equal groups.',error:'A common factor or multiple only needs to belong to one list.',check:check!||`${a} × ${b} = ${n}.`};
  }
  const powers=/10 100|powers/.test(o),order=/order of operations|brackets/.test(o),mental=/mental|facts/.test(o),tables=/table|facts|symbol|connect/.test(o),rem=/remainder/.test(o);
  let a=0,b=0,answer=0,op:'+'|'-'|'*'|'/'='+',prompt='',steps:string[]=[],why='',error='',check='',tool:Example['tool'],context='';
  if(order){a=r.int(3,9);b=r.int(2,8);const c=r.int(2,6);answer=a+b*c;prompt=`Work out ${a} + ${b} × ${c}.`;steps=[`Do multiplication before addition: ${b} × ${c} = ${b*c}.`,`${a} + ${b*c} = ${answer}.`,`Brackets would change the grouping: (${a} + ${b}) × ${c} is different.`];why='Multiplication forms one grouped amount before it is added.';error='Always add first, regardless of brackets or multiplication.';check=`${answer} − ${a} = ${b*c}.`;tool=table(['Loose objects','Packets','In each packet'],[[a,b,c]],'Separate amount and equal groups');context=`There are ${a} loose pencils and ${b} packets of ${c} pencils. How many pencils are there?`;return {prompt,answer:String(answer),steps,hint:steps[0],tool,context,why,error,check};}
  if(mul||powers){b=powers?r.pick([10,100,1000])*(/multiples/.test(o)?r.int(1,3):1):tables?r.pick(g===2?[2,3,4,5,10]:g===3?[6,7,8,9]:[2,3,4,5,6,7,8,9]):r.int(2,9);a=tables?r.int(2,10):r.int(2,f?Math.floor(99/b):g===3?Math.floor(999/b):g>=4?Math.floor(9999/b):8);if(g===1){b=r.int(2,5);a=r.int(2,Math.floor((/share|group equally|divid/.test(o)?20:40)/b));}if(/three digits by two/.test(o)){a=r.int(100,999);b=r.int(11,99);}else if(/four digits by one/.test(o))a=r.int(1000,9999);
   const division=/share|group equally/.test(o)||/divide/.test(o)&&(!/multiply/.test(o)||i%2===1)||/division symbol|connect/.test(o)&&i%2===1;
   if(rem){const remainder=r.int(1,b-1),total=a*b+remainder;prompt=`What is the remainder in ${total} ÷ ${b}?`;answer=remainder;steps=[`${b} × ${a} = ${a*b} fits into ${total}.`,`${total} − ${a*b} = ${remainder}.`,`The remainder ${remainder} is smaller than ${b}.`];tool=table(['Total','Equal groups','Left over'],[[total,`${a} groups of ${b}`,'?']],'Count complete groups first');why='The remainder is what is left after making as many full groups as possible.';error='A remainder may be as large as the divisor.';check=`${a} × ${b} + ${answer} = ${total}.`;context=`Pack ${total} counters in bags of ${b}. How many counters cannot fill a bag?`;return {prompt,answer:String(answer),steps,hint:steps[0],tool,why,error,check,context};}
   if(!division&&g===3&&!tables&&!powers)a=r.int(100,999);
   if(division){const total=a*b;answer=a;a=total;op='/';}else{answer=a*b;op='*';}
   const sign=op==='*'?'×':'÷';prompt=g<=2?`What is ${a} ${sign} ${b}?`:`Calculate ${a} ${sign} ${b}.`;
   steps=op==='*'?multiplySteps(a,b,answer):divideSteps(a,b,answer);
   why=op==='*'?'Multiplying each part of a quantity and joining the products preserves the total.':'Division finds how many equal-sized units make the total.';error='Keep only the first place-value part and ignore the remainder of the number.';check=op==='*'?`${answer} ÷ ${b} = ${a}.`:`${answer} × ${b} = ${a}.`;context=op==='*'?`There are ${a} trays with ${b} seeds in each. How many seeds are there?`:`Share ${a} seeds equally between ${b} trays. How many are in each?`;
  }else{
   const max=g===1?(/within 100|ones and tens/.test(o)?100:20):g===2||f?999:9999;
   let total=r.int(8,max);b=r.int(1,total-1);a=total-b;
   if(mental){const place=g===1?r.pick([1,10]):r.pick([1,10,100]);a=g===1?(/facts/.test(o)?r.int(4,15):r.int(2,6)*10+r.int(3,6)):g===3?r.int(20,69):r.int(2,7)*100+r.int(1,3)*10+r.int(1,4);b=g===3?r.int(11,29):r.int(1,3)*place;if(a+b>max)b=1;total=a+b;}
   op=/taking away/.test(o)?'-':/combining/.test(o)?'+':i%2===0?'+':'-';if(op==='-'){a=total;answer=a-b;}else answer=total;
   if(/three one-digit/.test(o)){a=r.int(1,9);b=r.int(1,9);const c=r.int(1,9);answer=a+b+c;prompt=`Add ${a} + ${b} + ${c}.`;steps=[`Choose two parts first: ${a} + ${b} = ${a+b}.`,`Join the third part: ${a+b} + ${c} = ${answer}.`,'The order of joining these parts does not change their total.'];tool=table(['First part','Second part','Third part'],[[a,b,c]],'Three parts form one whole');context=`Mei collects ${a}, ${b} and ${c} shells on three walks. How many shells does she collect?`;why='Addition joins all three parts into a whole.';error='Stop after adding just the first two parts.';check=`${answer} − ${c} = ${a+b}.`;return {prompt,answer:String(answer),steps,hint:steps[0],tool,context,why,error,check};}
   prompt=g<=2?`What is ${a} ${op==='+'?'+':'−'} ${b}?`:`Calculate ${a} ${op==='+'?'+':'−'} ${b}.`;
   const parts=String(b).split('').map((d,j)=>Number(d)*10**(String(b).length-j-1)).filter(Boolean);let running=a;
   steps=['Line up the place values. Split the second number into place-value parts.',...parts.map(v=>{const old=running;running=op==='+'?running+v:running-v;return `${old} ${op==='+'?'+':'−'} ${v} = ${running}.`;}),`The result is ${answer}. Check with the inverse operation.`];
   why=op==='+'?'Joining place-value parts one at a time gives the same whole.':'Removing place-value parts one at a time gives the same difference.';error='Add or subtract digits in different columns as if they had the same value.';check=op==='+'?`${answer} − ${b} = ${a}.`:`${answer} + ${b} = ${a}.`;context=op==='+'?`The library receives ${a} books, then ${b} more. How many arrive?`:`The library has ${a} books; ${b} ${b===1?'is':'are'} borrowed. How many remain?`;
  }
  tool=table(['First quantity','Operation','Second quantity'],[[a,op,b]],'Keep the units and place values aligned');
  if(p.code==='AS')tool=Math.max(a,b,answer)<=20?{kind:'foundation-visual',visual:op==='+'?joinCounters(a,b):takeAwayCounters(a,b)}:{kind:'bar',whole:op==='+'?null:a,parts:op==='+'?[a,b]:[null,b]};
  if(p.code==='AS'&&Math.max(a,b,answer)<=20){
   if(op==='-'){
    tool={kind:'foundation-visual',visual:{type:'counters',groups:[{count:a,color:'blue',crossed:b}]}};
    steps=[`Start with ${a} counters. Take away ${b}.`,`Count only the counters that remain: ${answer}.`,`Put back the ${b} to check: ${answer} + ${b} = ${a}.`];
    why='Taking away removes one part of the starting whole. Count what remains.';
    error='Add the amount taken away to the starting whole.';
   }else{
    steps=[`The two starting groups contain ${a} and ${b} counters.`,`Join them and count each counter once: ${a} + ${b} = ${answer}.`,`Take the ${b} counters back out to check that ${a} remain.`];
    why='Addition joins both parts to make a whole. Count every counter once.';
    error='Count just one group and leave the other group out.';
   }
  }
  if(p.code==='MD'&&a*b<=100&&op==='*')tool={kind:'foundation-visual',visual:{type:'counters',groups:Array.from({length:a},()=>({count:b,color:'blue' as const}))}};

  return {prompt,answer:fmt(answer),steps,hint:steps[0],tool,context,why,error,check,evidence:{op,a,b}};
 }};
}
export const numberLesson=(p:PlanEntry)=>sequence(p,numberSpec(p));
export const arithmeticLesson=(p:PlanEntry)=>sequence(p,arithmeticSpec(p));
