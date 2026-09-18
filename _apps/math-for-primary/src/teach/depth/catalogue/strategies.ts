import {fmt} from '../../gen';
import type {Example} from '../../build/sequence';
import type {PlanEntry} from '../../build/plan';
import {factsOf,minutesOf,type Facts} from './facts';
import {placeParts} from './mistakes';
/**
 * “Show me another way”: genuinely different methods for the same question, worked with its own
 * numbers — counting up instead of taking away, 10% blocks instead of 1%, the percentage you pay
 * instead of the discount. A method is offered only when it fits the numbers, so a child is never
 * shown a strategy that does not work here.
 */
export interface Way {title:string;steps:string[]}
const W=(title:string,...steps:string[]):Way=>({title,steps:steps.filter(Boolean)});
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const factors=(n:number)=>Array.from({length:n},(_,i)=>i+1).filter(d=>n%d===0);
const sg=(n:number)=>n.toLocaleString('en-SG');
const decimals=(x:number)=>{const s=fmt(x);return s.includes('.')?s.split('.')[1].length:0;};
const PLACE_NAME:Record<number,string>={1:'ones',10:'tens',100:'hundreds',1000:'thousands',10000:'ten thousands',100000:'hundred thousands',1000000:'millions',10000000:'ten millions'};
const clock=(t:number)=>`${Math.floor(t/60)%12||12}:${String(t%60).padStart(2,'0')}${Math.floor(t/60)%24<12?' am':' pm'}`;
const FRACTION:Record<number,string>={50:'1/2',25:'1/4',75:'3/4',20:'1/5',40:'2/5',10:'1/10'};
const TIMES:Record<number,number>={50:2,25:4,20:5,10:10};
export function strategiesFor(p:PlanEntry,e:Example,f:Facts=factsOf(p,e)):Way[]{
 const v=f.v,ans=Number(e.answer),out:Way[]=[];
 switch(f.kind){
  case 'place':out.push(W('Write it in expanded form',`${sg(v.n)} = ${placeParts(v.n).map(sg).join(' + ')}.`,`Pick out the part that belongs to the ${f.s.column} column.`),W('Read the column name first',`Find the ${f.s.column} column, then read its digit.`,`The digit tells how many ${f.s.column} there are.`));break;
  case 'numeral':out.push(W('Build it column by column',`Name each part: ${placeParts(v.n).map(x=>`${String(x)[0]} ${PLACE_NAME[10**(String(x).length-1)]}`).join(', ')}.`,'Write a digit for every column, using 0 for any column the words skip.'));break;
  case 'words':out.push(W('Read it in groups of three',`Split the digits from the right: ${sg(v.n)}.`,'Read each group, then say its name, such as “thousand”.'));break;
  case 'ordinal':out.push(W('Count along the line',`Start at the front: first, second, third … and stop at position ${v.pos}.`));break;
  case 'odd-even':out.push(W('Share into pairs',`${v.n} = 2 × ${Math.floor(v.n/2)}${v.n%2?' + 1':''}.`,v.n%2?'One is left without a partner.':'Every one has a partner.'),W('Check the ones digit','Tens always pair up exactly, so look only at the ones digit.'));break;
  case 'round':{const u=v.unit,lo=Math.floor(v.x/u)*u,next=Math.floor(v.x/(u/10))%10;out.push(W('Look at the next digit',`To round to the nearest ${u}, look at the ${PLACE_NAME[u/10]??'next'} digit: ${next}.`,next>=5?'It is 5 or more, so round up.':'It is less than 5, so round down.'),W('Use a number line',`${fmt(v.x)} lies between ${lo} and ${lo+u}.`,`Halfway is ${lo+u/2}. Which end is ${fmt(v.x)} nearer to?`));break;}
  case 'pattern':out.push(W('Use the position',`The first number is ${v.first}, and each step adds ${v.step}.`,`Number ${v.count+1} is ${v.first} + ${v.count} × ${v.step}.`),W('Count on in steps',`Keep adding ${v.step}: ${v.last} + ${v.step}.`));break;
  case 'compare':out.push(W('Place them on a number line','The larger number is further along when you count on.'),W('Compare column by column','Line the numbers up by place value.','Start at the largest place and find the first digits that differ.'));break;
  case 'order':out.push(W('Find the smallest first','Compare the largest place of every number.','Take out the smallest, then compare the rest again.'));break;
  case 'lcm':{const big=Math.max(v.a,v.b),small=Math.min(v.a,v.b),list:number[]=[];for(let k=big;k<=ans&&list.length<12;k+=big)list.push(k);out.push(W(`List multiples of ${big}`,`${list.join(', ')} …`,`Stop at the first one that ${small} also divides exactly.`),W('Use both lists',`Multiples of ${v.a}: ${[1,2,3,4,5].map(k=>k*v.a).join(', ')} …`,`Multiples of ${v.b}: ${[1,2,3,4,5].map(k=>k*v.b).join(', ')} …`,'The first number in both lists is the smallest common multiple.'));break;}
  case 'nth-multiple':out.push(W('Skip count',`Count in ${v.a}s: ${Array.from({length:Math.min(v.count,8)},(_,k)=>(k+1)*v.a).join(', ')}.`),W('Multiply',`${v.count} lots of ${v.a} is ${v.count} × ${v.a}.`));break;
  case 'gcf':out.push(W('List the factors',`Factors of ${v.x}: ${factors(v.x).join(', ')}.`,`Factors of ${v.y}: ${factors(v.y).join(', ')}.`,'Find the greatest number in both lists.'),W('Test from the smaller number down',`Try ${Math.min(v.x,v.y)}, then smaller numbers, until one divides both exactly.`));break;
  case 'factor-choice':out.push(W('Test each option',...(e.choices??[]).map(o=>`${v.n} ÷ ${o} ${v.n%Number(o)===0?`= ${v.n/Number(o)} exactly`:'leaves a remainder'}.`)));break;
  case 'order-ops':out.push(W('Draw the groups first',`${v.b} groups of ${v.c} make ${v.b*v.c}.`,`Then add the ${v.a} extra: ${v.a} + ${v.b*v.c}.`),W('Write the hidden brackets',`${v.a} + ${v.b} × ${v.c} means ${v.a} + (${v.b} × ${v.c}).`));break;
  case 'remainder':{const q=Math.floor(v.total/v.b);out.push(W('Use the times table',`The largest multiple of ${v.b} that is not more than ${v.total} is ${q*v.b}.`,`${v.total} − ${q*v.b} is left over.`),W('Make groups',`Take groups of ${v.b} away from ${v.total} until fewer than ${v.b} are left.`));break;}
  case 'add3':{const [x,y,z]=[v.a,v.b,v.c],pair=[[x,y,z],[x,z,y],[y,z,x]].find(([s,t])=>s+t===10);out.push(pair?W('Look for a pair that makes ten',`${pair[0]} + ${pair[1]} = 10.`,`Then add ${pair[2]}: 10 + ${pair[2]}.`):W('Change the order',`${y} + ${z} = ${y+z} first.`,`Then add ${x}.`));break;}
  case 'bond-whole':out.push(W('Count on from the bigger part',`Start at ${Math.max(v.a,v.b)} and count on ${Math.min(v.a,v.b)}.`),W('Use a number bond','The two parts join to make the whole at the top.'));break;
  case 'bond-part':out.push(W('Count on from the part you know',`Start at ${v.part} and count on to ${v.whole}. How many did you count?`),W('Use the related fact',`${v.part} + ? = ${v.whole}.`));break;
  case 'add':{const {a,b}=v;if(!Number.isInteger(a)||!Number.isInteger(b))break;const big=Math.max(a,b),small=Math.min(a,b),need=(10-big%10)%10;
   if(small<=5&&big<=100)out.push(W('Count on',`Start at ${big}. Count on ${small}: ${Array.from({length:small},(_,k)=>big+k+1).join(', ')}.`));
   if(need&&small>need)out.push(W('Make a ten',`${big} + ${need} = ${big+need}, a whole number of tens.`,`${small} − ${need} = ${small-need} is still to add.`,`${big+need} + ${small-need}.`));
   if(a>=10&&b>=10)out.push(W('Split by place value',`${a} = ${placeParts(a).join(' + ')} and ${b} = ${placeParts(b).join(' + ')}.`,'Add the matching places: ones with ones, tens with tens, hundreds with hundreds.','Join the totals.'));
   if(small>=10&&small%10>=7){const up=Math.ceil(small/10)*10;out.push(W('Round and adjust',`${small} is ${up} − ${up-small}.`,`${big} + ${up} = ${big+up}.`,`Take the extra ${up-small} back off.`));}
   break;}
  case 'sub':{const {a,b}=v;if(!Number.isInteger(a)||!Number.isInteger(b))break;
   const jumps:string[]=[];let x=b;const next=Math.ceil(x/10)*10;if(next>x&&next<=a){jumps.push(`${x} → ${next} is ${next-x}`);x=next;}const tens=Math.floor((a-x)/10)*10;if(tens>0){jumps.push(`${x} → ${x+tens} is ${tens}`);x+=tens;}if(a>x)jumps.push(`${x} → ${a} is ${a-x}`);
   if(jumps.length>1)out.push(W('Count up to find the difference',`Start at ${b} and count up to ${a}.`,`${jumps.join('; ')}.`,'Add the jumps together.'));
   if(b>=10&&b%10>=7){const up=Math.ceil(b/10)*10;if(up<=a)out.push(W('Round and adjust',`${b} is ${up} − ${up-b}.`,`${a} − ${up} = ${a-up}.`,`That took away ${up-b} too many, so add ${up-b} back.`));}
   if(b>=10)out.push(W('Take away one place at a time',...placeParts(b).reduce<[number,string[]]>(([y,s],part)=>[y-part,[...s,`${y} − ${part} = ${y-part}.`]],[a,[]])[1]));
   else if(b>0&&b<=5)out.push(W('Count back',`Start at ${a}. Count back ${b}: ${Array.from({length:b},(_,k)=>a-k-1).join(', ')}.`));
   break;}
  case 'mul':{const {a,b}=v;if(!Number.isInteger(a)||!Number.isInteger(b))break;const big=Math.max(a,b),small=Math.min(a,b),parts=placeParts(big);
   if(parts.length>1&&small<=12)out.push(W('Split by place value',`${big} = ${parts.join(' + ')}.`,`${parts.map(x=>`${x} × ${small} = ${x*small}`).join('; ')}.`,'Join the products.'));
   if(big>=10&&big%10===0&&small<=12)out.push(W('Think in tens',`${big} is ${big/10} tens.`,`${big/10} × ${small} = ${big/10*small}, so the answer is ${big/10*small} tens.`));
   if(big<=12&&small>=2)out.push(small%2===0&&small>2?W('Double a fact you know',`${big} × ${small/2} = ${big*small/2}.`,`Double it for ${big} × ${small}.`):W('Use the fact one before',`${big} × ${small-1} = ${big*(small-1)}.`,`One more group of ${big}: add ${big}.`));
   if(big*small<=60&&small<=6)out.push(W('Skip count',`Count in ${big}s, ${small} times: ${Array.from({length:small},(_,k)=>(k+1)*big).join(', ')}.`));
   if(small>=11&&small<=99){const t=Math.floor(small/10)*10,o=small%10;out.push(W('Use a grid',`Split ${small} into ${t}${o?` + ${o}`:''}.`,`${big} × ${t} = ${big*t}${o?`; ${big} × ${o} = ${big*o}`:''}.`,'Add the parts.'));}
   break;}
  case 'div':{const {a,b}=v;if(!Number.isInteger(a)||!Number.isInteger(b)||!Number.isInteger(ans))break;
   out.push(W('Think multiplication',`${b} × ? = ${a}.`,`Which number of ${b}s makes ${a}?`));
   const parts=placeParts(ans);if(parts.length>1)out.push(W('Chunk it',`Split ${a} into ${parts.map(x=>x*b).join(' + ')}; each part divides easily by ${b}.`,`${parts.map(x=>`${x*b} ÷ ${b} = ${x}`).join('; ')}.`,'Add the answers.'));
   if(ans<=6)out.push(W('Take away equal groups',`Take ${b} away from ${a} again and again: ${Array.from({length:ans},(_,k)=>a-(k+1)*b).join(', ')}.`,'Count how many times you took it away.'));
   break;}
  case 'frac-dec':{const {n,d}=v;if(100%d===0)out.push(W('Make hundredths',`${d} × ${100/d} = 100, so multiply the top by ${100/d} too.`,`${n}/${d} = ${n*100/d}/100.`,'Hundredths go two places after the point.'));else if(1000%d===0)out.push(W('Make thousandths',`${d} × ${1000/d} = 1000.`,`${n}/${d} = ${n*1000/d}/1000.`));out.push(W('Divide the top by the bottom',`The fraction ${n}/${d} means ${n} ÷ ${d}.`,'Divide, writing zeros after the decimal point as needed.'));break;}
  case 'frac-compare':{const {n1,d1,n2,d2}=v,L=d1*d2/gcd(d1,d2),h1=2*n1-d1,h2=2*n2-d2;out.push(W('Use a common denominator',`${n1}/${d1} = ${n1*L/d1}/${L} and ${n2}/${d2} = ${n2*L/d2}/${L}.`,'Now compare the numerators.'));
   if(h1&&h2&&Math.sign(h1)!==Math.sign(h2))out.push(W('Compare with one half',`${n1}/${d1} is ${h1>0?'more':'less'} than 1/2.`,`${n2}/${d2} is ${h2>0?'more':'less'} than 1/2.`));
   if(n1===n2&&d1!==d2)out.push(W('Same numerators, different part sizes',`Both fractions have ${n1} parts.`,'The larger denominator makes smaller parts.'));break;}
  case 'frac-missing':{const k=f.s.missing==='bottom'?v.given/v.n:v.given/v.d;out.push(W('Find the scale factor',f.s.missing==='bottom'?`${v.n} × ${fmt(k)} = ${v.given}.`:`${v.d} × ${fmt(k)} = ${v.given}.`,`Multiply the ${f.s.missing==='bottom'?'bottom':'top'} by the same number.`),W('Use a fraction wall',`Line up ${v.n}/${v.d} with strips of smaller equal parts.`,'Count the parts that cover the same length.'));break;}
  case 'frac-rename':out.push(W('Find the scale factor',`${v.d} × ${v.b/v.d} = ${v.b}.`,`Multiply the top by ${v.b/v.d} too: ${v.n} × ${v.b/v.d}.`));break;
  case 'frac-simplify':{const {a,b}=v,g=gcd(a,b),chain:string[]=[];let x=a,y=b;for(const q of [2,3,5,7])while(x%q===0&&y%q===0){chain.push(`÷ ${q} gives ${x/q}/${y/q}`);x/=q;y/=q;}
   out.push(W('Divide by the greatest common factor',`The greatest number that divides both ${a} and ${b} is ${g}.`,`Divide the top and the bottom by ${g}.`));if(chain.length>1)out.push(W('Divide in small steps',`Start with ${a}/${b}.`,`${chain.join('; ')}.`,'Stop when no number except 1 divides both.'));break;}
  case 'to-mixed':out.push(W('Count out whole groups',`${v.total} ÷ ${v.d} = ${Math.floor(v.total/v.d)} remainder ${v.total%v.d}.`,'The quotient is the whole number; the remainder goes on top of the fraction.'));break;
  case 'to-improper':out.push(W('Count every part',`Each whole has ${v.d} parts: ${v.w} × ${v.d} = ${v.w*v.d}.`,`Add the ${v.n} extra parts.`));break;
  case 'frac-add':case 'frac-sub':{const {w1,n1,d1,w2,n2,d2}=v,L=d1*d2/gcd(d1,d2),A=(w1*d1+n1)*L/d1,B=(w2*d2+n2)*L/d2,plus=f.kind==='frac-add',show=(w:number,n:number,d:number)=>w?`${w} ${n}/${d}`:`${n}/${d}`;
   out.push(W('Rename to a common denominator',`Use ${L} as the denominator: ${show(w1,n1,d1)} = ${A}/${L} and ${show(w2,n2,d2)} = ${B}/${L}.`,`${plus?'Add':'Subtract'} the numerators: ${A} ${plus?'+':'−'} ${B}.`,'Simplify if you can.'));
   if(!w1&&!w2&&100%d1===0&&100%d2===0)out.push(W('Use decimals',`${n1}/${d1} = ${fmt(n1/d1)} and ${n2}/${d2} = ${fmt(n2/d2)}.`,`Work out ${fmt(n1/d1)} ${plus?'+':'−'} ${fmt(n2/d2)}, then write the answer as a fraction.`));
   if(w1||w2)out.push(W('Wholes and parts separately',`Whole numbers: ${w1} ${plus?'+':'−'} ${w2}.`,`Fractions: ${n1}/${d1} ${plus?'+':'−'} ${n2}/${d2}, renamed with denominator ${L}.`,plus?'Join them, exchanging parts for a whole if they make one.':'If the first fraction is too small, exchange one whole for parts first.'));
   break;}
  case 'frac-of':out.push(W('Find one part first',`${v.whole} ÷ ${v.d} = ${v.whole/v.d}.`,`Take ${v.a} of those parts: ${v.a} × ${v.whole/v.d}.`),W('Multiply first, then divide',`${v.a} × ${v.whole} = ${v.a*v.whole}.`,`${v.a*v.whole} ÷ ${v.d}.`));break;
  case 'frac-times':{const k=/^\d+$/.test(f.s.right)?Number(f.s.right):null;out.push(W('Multiply tops, multiply bottoms',`Multiply the numerators together and the denominators together: ${f.s.left} × ${k??f.s.right}.`,'Simplify if you can.'));if(k&&k<=5)out.push(W('Add it repeatedly',`${k} lots of ${f.s.left}: ${Array(k).fill(f.s.left).join(' + ')}.`));break;}
  case 'frac-div':{const {n1,d1,n2,d2,w1,w2}=v;if(w1||w2)break;
   if(d2===1)out.push(W('Split every part',`Sharing ${n1}/${d1} into ${n2} equal parts makes each part ${n2} times smaller.`,`Each share is ${n1} parts of size 1/${d1*n2}.`),W('Take a unit fraction of it',`Dividing by ${n2} is the same as taking 1/${n2} of it.`,`1/${n2} × ${n1}/${d1}.`));
   else{const L=d1*d2/gcd(d1,d2);out.push(W('Use a common denominator',`${n1}/${d1} = ${n1*L/d1}/${L} and ${n2}/${d2} = ${n2*L/d2}/${L}.`,`How many groups of ${n2*L/d2} parts fit into ${n1*L/d1} parts? ${n1*L/d1} ÷ ${n2*L/d2}.`),W('Multiply by the reciprocal',`Dividing by ${n2}/${d2} is the same as multiplying by ${d2}/${n2}.`,`${n1}/${d1} × ${d2}/${n2}.`));}
   break;}
  case 'frac-share':out.push(W('Share one cake at a time',`Cut each cake into ${v.d} pieces; every child takes one piece from every cake.`,`So each child gets ${v.w} pieces of size 1/${v.d}.`));break;
  case 'frac-name':out.push(W('Say it in words',`Say: “${v.n} out of ${v.d} equal parts”.`,'The first number is the shaded count; the second is the number of equal parts.'),W('Count the unshaded parts too',`Shaded ${v.n} + unshaded ${v.d-v.n} = ${v.d} parts in the whole.`));break;
  case 'money-count':out.push(W('Group the coins','Put coins together to make easy amounts, such as 10s or 100s.','Then add the groups.'));break;
  case 'money-count2':out.push(W('Count the coins first',`The coins make ${v.cents} cents, which is $${fmt(v.cents/100)}.`,`Add the $${v.dollars} in notes.`),W('Make whole dollars','Group the coins into sets worth 100 cents; each set is $1.','Add those dollars to the notes, then the cents left over.'));break;
  case 'money-add':case 'money-sub':out.push(W('Work in cents',`$${v.a.toFixed(2)} is ${Math.round(v.a*100)} cents and $${v.b.toFixed(2)} is ${Math.round(v.b*100)} cents.`,`${f.kind==='money-add'?'Add':'Subtract'}, then change back to dollars.`),W('Dollars first, then cents',`Work with the dollars: ${Math.floor(v.a)} and ${Math.floor(v.b)}.`,`Then the cents: ${Math.round(v.a*100)%100} and ${Math.round(v.b*100)%100}, exchanging 100 cents for $1 when needed.`));break;
  case 'to-cents':out.push(W('Use 100 cents = $1',`Each dollar is 100 cents: ${Math.floor(v.dollars)} dollars is ${Math.floor(v.dollars)*100} cents.`,`Add the ${Math.round(v.dollars*100)%100} cents.`));break;
  case 'to-dollars':out.push(W('Use 100 cents = $1',`Take out groups of 100 cents: each makes $1.`,`The cents left over go after the point.`));break;
  case 'rate-per':out.push(W('Find one unit',`Share $${v.total} equally between ${v.count} notebooks.`,`$${v.total} ÷ ${v.count}.`),W('Try a price',`Test a price: does ${v.count} × that price make $${v.total}?`));break;
  case 'rate-total':out.push(W('Build a rate table',`1 notebook: $${v.rate}; 2 notebooks: $${2*v.rate}; 3 notebooks: $${3*v.rate} …`,`Continue to ${v.count} notebooks.`));if(v.count<=6)out.push(W('Add the prices',`${Array(v.count).fill(`$${v.rate}`).join(' + ')}.`));break;
  case 'rate-count':out.push(W('Count up in prices',`$${v.rate}, $${2*v.rate}, $${3*v.rate} … up to $${v.total}.`,'Count how many prices you said.'),W('Divide',`How many $${v.rate} amounts fit into $${v.total}? $${v.total} ÷ $${v.rate}.`));break;
  case 'pct-of':{const {pct,whole}=v;if(pct%10===0)out.push(W('Use 10%',`10% of ${whole} is ${fmt(whole/10)}.`,`${pct}% is ${pct/10} lots of 10%: ${pct/10} × ${fmt(whole/10)}.`));if(FRACTION[pct])out.push(W('Use a fraction',`${pct}% is ${FRACTION[pct]}.`,`Find ${FRACTION[pct]} of ${whole}.`));out.push(W('Find 1% first',`1% of ${whole} is ${fmt(whole/100)}.`,`${pct}% is ${pct} × ${fmt(whole/100)}.`));break;}
  case 'pct-original':{const {pct,part}=v;if(TIMES[pct])out.push(W('Use the fraction',`${pct}% is 1/${TIMES[pct]} of the whole.`,`The whole is ${TIMES[pct]} times as much: ${TIMES[pct]} × ${fmt(part)}.`));out.push(W('Find 1%, then 100%',`${pct}% is ${fmt(part)}, so 1% is ${fmt(part)} ÷ ${pct}.`,'Multiply by 100 to find the whole.'));if(pct%10===0)out.push(W('Find 10% first',`${pct}% is ${fmt(part)}, so 10% is ${fmt(part)} ÷ ${pct/10}.`,'The whole is 10 lots of 10%.'));break;}
  case 'pct-change':{const change=Math.abs(v.to-v.from);out.push(W('Compare the change with the start',`Change: ${change}. Original amount: ${v.from}.`,`Write ${change}/${v.from} as a percentage: multiply by 100.`),W('Use 10% of the start',`10% of ${v.from} is ${fmt(v.from/10)}.`,`How many lots of ${fmt(v.from/10)} make ${change}? Each lot is 10%.`));break;}
  case 'discount':out.push(W('Find the percentage you pay',`With ${v.rate}% off, you pay ${100-v.rate}% of the price.`,`${100-v.rate}% of $${v.base}.`),W('Find the discount, then subtract',`${v.rate}% of $${v.base} is the discount.`,'Take it away from the price.'));break;
  case 'gst':out.push(W('Find the percentage you pay',`With ${v.rate}% GST, you pay ${100+v.rate}% of the pre-tax price.`,`${100+v.rate}% of $${v.base}.`),W('Find the GST, then add',`${v.rate}% of $${v.base} is the GST.`,'Add it to the pre-tax price.'));break;
  case 'interest':out.push(W('Find 1% first',`1% of $${v.base} is $${fmt(v.base/100)}.`,`Multiply by ${v.rate}.`));break;
  case 'pct-fraction':out.push(W('Write it over 100, then simplify',`${v.pct}% = ${v.pct}/100.`,'Divide the top and the bottom by common factors until you cannot any more.'));break;
  case 'pct-read':out.push(W('Count rows of ten','Each full row is 10 squares, or 10%.','Count the full rows, then the extra squares.'));break;
  case 'ratio-share':out.push(W('Find one unit',`There are ${v.sum} units altogether.`,`One unit is ${v.total} ÷ ${v.sum}.`,`The first share has ${v.first} unit${v.first===1?'':'s'}.`),W('Use a fraction of the total',`The first share is ${v.first}/${v.sum} of all the counters.`,`Find ${v.first}/${v.sum} of ${v.total}.`));break;
  case 'ratio-missing':{const k=v.scaled/v.a;out.push(W('Find the scale factor',`${v.a} × ${fmt(k)} = ${v.scaled}.`,`Multiply ${v.b} by the same number.`));if(k<=8)out.push(W('Use a ratio table',`${[1,2,3].map(m=>`${v.a*m}:${v.b*m}`).join(', ')} …`,`Continue until the first number is ${v.scaled}.`));break;}
  case 'ratio-fraction':out.push(W('Count every unit',`All the units together: ${v.sum}.`,`Red has ${v.first} of them.`));break;
  case 'ratio-simplify':{let t=f.s.terms.split(':').map(Number);const chain:string[]=[];for(const q of [2,3,5,7])while(t.every(x=>x%q===0)){t=t.map(x=>x/q);chain.push(`÷ ${q} gives ${t.join(':')}`);}if(chain.length)out.push(W('Divide in small steps',`Start with ${f.s.terms}.`,`${chain.join('; ')}.`));out.push(W('Divide by the greatest common factor','Find the largest number that divides every term.','Divide each term by it.'));break;}
  case 'ratio-write':out.push(W('Match each number to its name','Write the numbers in the same order as the colours are named.'));break;
  case 'alg-expr':out.push(W('Test with a number',`Suppose x = 2. Then ${v.a} packets hold ${2*v.a} stickers, and ${v.b} are loose: ${2*v.a+v.b} altogether.`,'The right expression also gives this total when x = 2.'));break;
  case 'alg-simplify':out.push(W('Count the x’s',`${v.a} x's and ${v.b} more x's make ${v.a} + ${v.b} x's.`),W('Test with a number',`Try x = 2: ${v.a} × 2 + ${v.b} × 2 = ${2*(v.a+v.b)}.`,'The simplified expression must give the same value.'));break;
  case 'alg-sub':out.push(W('Replace x first',`Write it as ${v.a} × ${v.x} + ${v.b}.`,'Multiply before adding.'));break;
  case 'alg-solve':out.push(W('Undo in reverse order',`First undo + ${v.b}: subtract ${v.b} from both sides.`,`Then undo × ${v.a}: divide both sides by ${v.a}.`),W('Try values of x',`Try x = 1, 2, 3 … in ${v.a}x + ${v.b} until it makes ${v.c}.`),W('Use a balance',`${v.a} bags and ${v.b} counters balance ${v.c} counters.`,`Take ${v.b} counters off both sides, then share into ${v.a} equal groups.`));break;
  case 'dec-place':{const digit=Number(f.s.text.split('.')[1]?.[v.places-1]??0);out.push(W('Write it as a fraction',`The ${f.s.place} place is 1/${10**v.places} of a one.`,`So the digit ${digit} stands for ${digit}/${10**v.places}.`));break;}
  case 'dec-to-frac':{const dp=(f.s.text.split('.')[1]??'').length,num=Math.round(v.x*10**dp);out.push(W('Read the decimal aloud',`${f.s.text} is ${num} ${['tenths','hundredths','thousandths'][dp-1]??'parts'}.`,`Write ${num}/${10**dp}, then simplify.`));break;}
  case 'dec-round':case 'dec-quotient':out.push(W('Use a number line',`Find the two neighbours with ${v.places} decimal place${v.places===1?'':'s'} on either side of the number.`,'Halfway between them decides which one is nearer.'));break;
  case 'dec-add':case 'dec-sub':{const {a,b}=v,dp=Math.max(decimals(a),decimals(b)),plus=f.kind==='dec-add';if(dp<1||dp>3)break;const s=10**dp,unit=['tenths','hundredths','thousandths'][dp-1],A=Math.round(a*s),B=Math.round(b*s);
   out.push(W(`Work in ${unit}`,`${fmt(a)} is ${A} ${unit} and ${fmt(b)} is ${B} ${unit}.`,`${A} ${plus?'+':'−'} ${B} = ${plus?A+B:A-B} ${unit}.`,'Change back to a decimal.'));
   if(plus)out.push(W('Add the wholes, then the parts',`Wholes: ${Math.floor(a)} + ${Math.floor(b)} = ${Math.floor(a)+Math.floor(b)}.`,`Parts: ${fmt(a-Math.floor(a))} + ${fmt(b-Math.floor(b))}.`,'Join them, exchanging if the parts make a whole.'));break;}
  case 'dec-mul':case 'dec-div':{const {a,b}=v,times=f.kind==='dec-mul';
   if([10,100,1000].includes(b)){const k=Math.log10(b);out.push(W('Move the digits, not the point',`${times?'×':'÷'} ${b} moves every digit ${k} place${k>1?'s':''} to the ${times?'left':'right'}.`,'Write zeros to hold any empty places.'),W('Use a place-value chart','Write the digits in a place-value chart.',`Shift every digit ${k} column${k>1?'s':''} ${times?'left':'right'}.`));}
   else if(Number.isInteger(b)){const da=decimals(a),s=10**da,unit=['','tenths','hundredths','thousandths'][da];if(da&&unit&&(times||Math.round(a*s)%b===0))out.push(W(`Work in ${unit}`,`${fmt(a)} is ${Math.round(a*s)} ${unit}.`,`${Math.round(a*s)} ${times?'×':'÷'} ${b} = ${times?Math.round(a*s)*b:Math.round(a*s)/b} ${unit}.`,'Change back to a decimal.'));out.push(W('Estimate first',`${fmt(a)} is about ${Math.round(a)}.`,`${Math.round(a)} ${times?'×':'÷'} ${b} is about ${fmt(Math.round(times?Math.round(a)*b:Math.round(a)/b))}, so the answer should be close to that.`));}
   break;}
  case 'measure-diff':out.push(W('Count up from the smaller',`Start at ${v.a} ${f.s.unit} and count up to ${v.b} ${f.s.unit}.`));break;
  case 'conv':out.push(W('Use the unit relationship','Write down how many of the smaller unit make one of the larger unit.','Multiply to change into the smaller unit; divide to change into the larger unit.'),W('Think in the smaller unit','Change every part into the smaller unit first.','Then regroup if the question asks for the larger unit.'));break;
  case 'vol-conv':out.push(W('Go through millilitres','1 litre = 1000 millilitres, and 1 millilitre fills 1 cubic centimetre.',`So ${fmt(v.litres)} litres is ${fmt(v.litres)} × 1000.`));break;
  case 'time-sec':out.push(W('Count in 60s',`${v.m} minute${v.m===1?'':'s'}: ${Array.from({length:v.m},(_,k)=>60*(k+1)).join(', ')} seconds.`,`Then add the ${v.s} extra seconds.`));break;
  case 'hm-to-min':out.push(W('Count in 60s',`${v.h} hour${v.h===1?'':'s'}: ${Array.from({length:v.h},(_,k)=>60*(k+1)).join(', ')} minutes.`,`Then add the ${v.m} extra minutes.`));break;
  case 'min-to-hm':out.push(W('Take out whole hours',`Take 60 minutes away from ${v.total} again and again, until fewer than 60 are left.`,'Count the hours you took out; the rest are minutes.'));break;
  case 'duration':{const gap=(60-v.start%60)%60;if(gap)out.push(W('Count on to the next hour',`From ${f.s.start} to the next o’clock is ${gap} minutes.`,`Then count on to ${f.s.end}.`,'Add the jumps.'));out.push(W('Change both times into minutes','Count the minutes after midnight for each time.','Subtract the start from the end.'));break;}
  case 'end-time':case 'start-time':{const t=minutesOf(f.kind==='end-time'?f.s.start:f.s.end);if(t===null)break;const forward=f.kind==='end-time',gap=forward?(60-t%60)%60:t%60;
   if(gap&&gap<v.duration)out.push(W(forward?'Jump to the next hour first':'Jump back to the hour first',`${forward?'Forward':'Back'} ${gap} minutes reaches ${clock(forward?t+gap:t-gap)}.`,`${v.duration-gap} minutes are still to ${forward?'add':'take away'}.`));
   out.push(W('Change it into minutes',`Write ${forward?f.s.start:f.s.end} as minutes after midnight.`,`${forward?'Add':'Subtract'} ${v.duration}, then change back into a time.`));break;}
  case 'time-24':out.push(W(v.pm?'Add 12 to afternoon hours':'Morning hours stay the same',v.pm?`${v.h} pm is hour ${v.h+12} of the day.`:`Write the hour with two digits: ${String(v.h).padStart(2,'0')}.`,'The minutes do not change.'));break;
  case 'clock':out.push(W('Short hand, then long hand','The short hand points to, or just past, the hour.','Count the long hand in fives from the 12.'));break;
  case 'length':out.push(W('Count the spaces','Start at the 0 mark.','Count each one-centimetre space up to the far end.'));break;
  case 'area-tri':out.push(W('Halve the rectangle',`A ${v.b} by ${v.h} rectangle has area ${v.b*v.h}.`,'The triangle covers half of it.'));if(v.b%2===0)out.push(W('Halve the base first',`Half the base is ${v.b/2}.`,`${v.b/2} × ${v.h}.`));else if(v.h%2===0)out.push(W('Halve the height first',`Half the height is ${v.h/2}.`,`${v.b} × ${v.h/2}.`));break;
  case 'area-house':out.push(W('Split into two shapes',`Rectangle: ${v.a} × ${v.b}.`,`Triangle: ${v.base} × ${v.h} ÷ 2.`,'Add the two areas.'));break;
  case 'perim-house':out.push(W('Trace the outline',`Bottom ${v.bottom}, wall ${v.wall}, slope ${v.slope}, slope ${v.slope}, wall ${v.wall}.`,'Add the five outside edges.'));break;
  case 'square-side':out.push(W('Try whole numbers',`${[1,2,3,4,5].map(k=>`${k} × ${k} = ${k*k}`).join('; ')} …`,`Keep going until the product is ${v.area}.`));break;
  case 'len-from-perim':out.push(W('Halve the perimeter first',`Length + width = ${v.perim} ÷ 2 = ${v.perim/2}.`,`Take away the width, ${v.w}.`));break;
  case 'len-from-area':out.push(W('Use the related multiplication',`${v.w} × ? = ${v.area}.`));break;
  case 'rect-area':out.push(W('Count rows of squares',`Each row has ${v.a} squares, and there are ${v.b} rows.`,`${v.b} rows of ${v.a}.`));break;
  case 'rect-perim':out.push(W('Add the four sides',`${v.a} + ${v.b} + ${v.a} + ${v.b}.`),W('Double one length and one width',`${v.a} + ${v.b} = ${v.a+v.b}.`,'Double it.'));break;
  case 'L-area':out.push(W('Split into two rectangles',`Cut the L into a ${v.a} by ${v.b-v.c} rectangle and a ${v.a-v.c} by ${v.c} rectangle.`,`${v.a*(v.b-v.c)} + ${(v.a-v.c)*v.c}.`),W('Subtract the missing corner',`The full rectangle is ${v.a} × ${v.b} = ${v.a*v.b}.`,`Take away the ${v.c} × ${v.c} corner.`));break;
  case 'L-perim':out.push(W('Push the corner out','The two inside edges can be pushed out to fill the missing corner.',`The outline becomes the full ${v.a} by ${v.b} rectangle: 2 × (${v.a} + ${v.b}).`));break;
  case 'cube-root':out.push(W('Try whole numbers',`${[2,3,4,5].map(k=>`${k} × ${k} × ${k} = ${k**3}`).join('; ')} …`,`Keep going until the product is ${v.v}.`));break;
  case 'square-root':out.push(W('Try whole numbers',`${[2,3,4,5].map(k=>`${k} × ${k} = ${k*k}`).join('; ')} …`,`Keep going until the product is ${v.area}.`));break;
  case 'vol-base':out.push(W('Use the related multiplication',`Base area × ${v.h} = ${v.v}.`,`So base area = ${v.v} ÷ ${v.h}.`));break;
  case 'vol-height':out.push(W('Find the base area first',`${v.a} × ${v.b} = ${v.a*v.b}.`,`Then ${v.v} ÷ ${v.a*v.b}.`));break;
  case 'vol-layers':out.push(W('Count layer by layer',`${[1,2,3].map(k=>k*v.each).join(', ')} … one layer at a time.`,`Stop after ${v.layers} layers.`));break;
  case 'vol-box':out.push(W('Count layers',`One layer: ${v.a} × ${v.b} = ${v.a*v.b} cubes.`,`${v.c} layers: ${v.a*v.b} × ${v.c}.`),W('Start from a different face',`${v.b} × ${v.c} = ${v.b*v.c}.`,`${v.a} of those: ${v.b*v.c} × ${v.a}.`));break;
  case 'circle':out.push(W('Work out the full circle first',v.perimeter?`Full circumference: 2 × 22/7 × ${v.r}.`:`Full area: 22/7 × ${v.r} × ${v.r}.`,v.part>1?`Take 1/${v.part} of it.`:'',v.perimeter&&v.part>1?`Add the straight edges: ${v.part===2?'the diameter':'two radii'}, ${2*v.r} cm.`:''));break;
  case 'circle-composite':out.push(W('Deal with each part separately',v.perimeter?`Straight edges: ${v.h} + ${v.w} + ${v.h}.`:`Rectangle: ${v.w} × ${v.h}.`,v.perimeter?`Curved edge: half of 2 × 22/7 × ${v.r}.`:`Semicircle: half of 22/7 × ${v.r} × ${v.r}.`,'Add the parts.'));break;
  case 'angle-straight':out.push(W('Count on to 180°',`From ${v.k}°, count on to 180°.`),W('Subtract from a half-turn',`A straight line is 180°: 180 − ${v.k}.`));break;
  case 'angle-point':out.push(W('Subtract from a full turn',`A full turn is 360°: 360 − ${v.k}.`),W('Use two straight lines',`Two half-turns make a full turn. First 180 − ${v.k} if the angle is under 180°, then add 180.`));break;
  case 'angle-opposite':out.push(W('Use the straight line twice',`The angle next to ${v.k}° is 180 − ${v.k} = ${180-v.k}°.`,`The angle across is 180 − ${180-v.k}.`));break;
  case 'tri-third':out.push(W('Add the known angles first',`${v.k} + 60 = ${v.k+60}.`,`180 − ${v.k+60}.`));break;
  case 'isosceles':out.push(W('Halve what is left',`180 − ${v.k} = ${180-v.k}.`,'The two equal angles share it equally.'));break;
  case 'para-angle':out.push(W('Use the straight line','Extend one side: the two angles sit on a straight line.',`180 − ${v.k}.`));break;
  case 'corner-split':out.push(W('Subtract from a right angle',`A square corner is 90°: 90 − ${v.k}.`));break;
  case 'protractor':out.push(W('Estimate first','Decide whether the angle is smaller or larger than a right angle.','Use that to choose the correct scale.'));break;
  case 'mirror':out.push(W('Count squares',`Count ${v.d} squares from the point to the mirror.`,'Count the same number of squares beyond it.'));break;
  case 'sym-count':out.push(W('Fold one line at a time','Try a fold down the middle, then across, then along each diagonal.','Count only the folds where the halves match exactly.'));break;
  case 'lines':out.push(W('Check with a set square','Place a set square where the lines meet: a square corner means perpendicular.'),W('Measure the gap twice','If the gap between the lines is the same at both ends, they are parallel.'));break;
  case 'net':case 'solid-name':out.push(W('Count the faces','Count the flat faces and any curved surfaces.','Match the count to a solid you know.'));break;
  case 'shape-name':out.push(W('Count sides and corners','Count the straight sides and the corners.','Look for curved edges too.'));break;
  case 'shape-pattern':out.push(W('Say the pattern aloud','Say each item in turn and listen for where the pattern starts again.'));break;
  case 'rect-property':case 'quad-property':out.push(W('Test each property','Check the sides with a ruler and the corners with a set square.','Keep only the properties every one of these shapes must have.'));break;
  case 'height-choice':out.push(W('Look for the right angle','Find the side you are calling the base.','The height meets that base line at a right angle.'));break;
  case 'unit-choice':out.push(W('Name the kind of amount','Is it a length, a mass or a liquid volume?','Choose a unit for that kind, and a sensible size.'));break;
  case 'copy':out.push(W('Count grid steps','Pick a corner and count the steps across and up to the next corner.','Repeat for every edge on the new grid.'));break;
  case 'compose':out.push(W('Put the pieces together','Two quarter-circles make a semicircle.','Two semicircles make a whole circle.'));break;
  case 'table-missing':out.push(W('Add the known entries first','Add every value you know.',`Take that away from the total, ${v.total}.`));break;
  case 'graph-read':case 'graph-total':case 'graph-diff':case 'graph-range':case 'pie-count':out.push(W('Use the scale','Find what one symbol or one grid line stands for.','Count, then multiply by that value.'));break;
  case 'graph-max':out.push(W('Compare the sizes','The longest bar, tallest column or largest slice has the greatest value.'));break;
 }
 const seen=new Set<string>(),ways=out.filter(w=>w.steps.length&&!seen.has(w.title)&&seen.add(w.title));
 return ways.length?ways:[W('Check by working backwards',e.check)];
}
