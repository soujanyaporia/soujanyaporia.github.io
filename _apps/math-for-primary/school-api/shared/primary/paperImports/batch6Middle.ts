import {Rng,hashString} from '../../engine/random';
import {makeQuestion,type Question,type Proof} from '../generate';
import type {Activity,GameKind} from '../catalog';
import {makeP3Raffles2025} from './p3Raffles2025';
import {makeP4Nanyang2025} from './p4Nanyang2025';
import {makeBatch3Early} from './batch3Early';
import {makeBatch4Middle} from './batch4Middle';
import {makeBatch5MiddleP3} from './batch5Middle';
import {BATCH6_MIDDLE_P4_PARTS} from './batch6MiddleMeta';
import type {Batch6MiddleResponseSpec} from './batch6MiddleResponse';
export {BATCH6_MIDDLE_P4_PARTS} from './batch6MiddleMeta';
export type Batch6MiddleQuestion=Question&{structuredResponse?:Batch6MiddleResponseSpec};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const fraction=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
const rat=(s:string):[number,number]=>{const [n,d]=s.split('/').map(Number);return [n,d??1];};
const op=(symbol:'+'|'-'|'*'|'/'|'round',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
function existing(kind:GameKind,level:number,seed:number,index:number,predicate:(q:Question)=>boolean=()=>true){
 const a:Activity={id:`batch6-middle-base-${kind}-${level}`,kind,level,track:'standard',strand:'Number & Algebra',title:kind,objective:kind,skillIds:[],icon:'✦'};
 for(let attempt=0;attempt<512;attempt++){const q=makeQuestion(a,seed,index*512+attempt);if(predicate(q))return q;}throw Error(`No existing configuration for ${kind}`);
}
function build(part:string,seed:number,index:number):Batch6MiddleQuestion{
 const meta=BATCH6_MIDDLE_P4_PARTS.find(p=>p.id===part);if(!meta)throw Error(`Unknown P4 source part ${part}`);
 const group=part.replace(/[ab]$/,''),r=new Rng(hashString(`batch6-middle:${group}:${seed}:${index}`)),key=`batch6-middle:${part}:${seed}:${index}`;
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:NonNullable<Question['workedSteps']>,extra:Partial<Batch6MiddleQuestion>={}):Batch6MiddleQuestion=>({key,prompt,answer:String(answer),context,hint,workedSteps:steps,explanation:'',...extra});
 if(part==='1'){
  const q=makeBatch3Early('increasing-gap',seed,index);if(q.picture?.type!=='pattern')throw Error('Pattern base changed');const values=q.picture.items.map(v=>v==='?'?Number(q.answer):Number(v)).slice(0,5).map(v=>v*10+r.seed%9+1),step=values[1]-values[0];
  return make('What is the missing number?',values[3],[],'Find the equal forward change, then add it at the gap.',[{text:'Find one step.',equation:`${values[1]} − ${values[0]} = ${step}`},{text:'Use the same step at the gap.',equation:`${values[2]} + ${step} = ${values[3]}`}],{picture:{type:'pattern',items:values.map((n,i)=>i===3?'?':String(n))},proof:op('+',values[2],step)});
 }
 if(part==='2'){
  const q=existing('mixedFraction',4,seed,index);return {...q,key,workedSteps:[{text:'Multiply the whole part by the denominator, then add the numerator.',equation:q.explanation}]};
 }
 if(part==='3'){
  const q=existing('round',4,seed,index,q=>q.prompt.endsWith('nearest 100.')),original=nums(q.prompt.replaceAll(',',''))[0],n=10000+original,answer=10000+Number(q.answer);
  return make('Round the number to the nearest hundred.',answer,[],'Check the tens digit. Five or more rounds the hundreds up.',[{text:'Round the last three digits while keeping the larger place values.',equation:`${n} → ${answer}`}],{display:String(n),proof:op('round',n,100)});
 }
 if(part==='4'){
  const q=makeBatch5MiddleP3('1',seed,index),tail=Number(q.display)%100,thousands=r.int(11,19),words=['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],suffix=q.answer.split(' thousand')[1],answer=words[thousands-10]+' thousand'+suffix;
  return make('Write the number in words.',answer,[],'Read the thousands group, then skip the zero hundreds place and read the last two digits.',[{text:'Separate the thousands from the remaining amount.',equation:`${thousands*1000+tail} = ${thousands*1000} + ${tail}`},{text:answer}],{display:String(thousands*1000+tail),answerFormat:'number-words'});
 }
 if(part==='5'){
  const q=existing('multiple',4,seed,index,q=>{const [a,b]=nums(q.prompt);return a!==b&&a%b!==0&&b%a!==0&&Number(q.answer)===a*b/gcd(a,b);}),[a,b]=nums(q.prompt);
  return make('What is the least common multiple?',q.answer,[`Find the first common positive multiple of ${a} and ${b}.`],'List multiples of both numbers and stop at the first positive match.',[{text:'The least common positive multiple appears in both tables.',equation:`${a} × ${Number(q.answer)/a} = ${b} × ${Number(q.answer)/b} = ${q.answer}`}],{proof:Number(q.answer)});
 }
 if(part==='6'){
  let base=makeP3Raffles2025('18',seed,index*512),divisor=0,quotient=0,rem=0,total=0;
  for(let a=0;a<512;a++){base=makeP3Raffles2025('18',seed,index*512+a);const [old,div]=nums(base.display!);divisor=div;rem=Number(base.answer);quotient=(old-rem)/div*10+r.seed%10;total=div*quotient+rem;if(total>=1000&&total<=9999)break;}
  if(total<1000||total>9999)throw Error('No four-digit division configuration');
  return make('What is the remainder?',rem,[],'Find the greatest complete multiple not larger than the dividend.',[{text:'Remove the complete groups.',equation:`${quotient} × ${divisor} = ${quotient*divisor}`},{text:'Find the amount left over.',equation:`${total} − ${quotient*divisor} = ${rem}`}],{display:`${total} ÷ ${divisor}`,proof:op('-',total,op('*',quotient,divisor))});
 }
 if(part==='7'){
  const q=existing('multiply',3,seed,index),[a,b]=nums(q.display!),ones=r.int(0,9),n=a*10+ones,answer=Number(q.answer)*10+ones*b;
  return make('Find the product.',answer,[],'Multiply each place value by the one-digit factor and add.',[{text:'Multiply the part ending in zero.',equation:`${a*10} × ${b} = ${Number(q.answer)*10}`},{text:'Multiply the ones and combine.',equation:`${Number(q.answer)*10} + ${ones} × ${b} = ${answer}`}],{display:`${n} × ${b}`,proof:op('*',n,b)});
 }
 if(part==='8'){
  const q=makeBatch4Middle('fraction-left-two',seed,index),fs=q.context![0].match(/\d+\/\d+/g)!;
  const [a,b]=fs.map(rat),sum=fraction(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);return {...q,key,prompt:'Find the value. Give your answer in simplest form.',context:undefined,display:`1 − ${fs[0]} − ${fs[1]}`,hint:'Use a common denominator, combine the two subtracted fractions, then subtract their sum from one.',workedSteps:[{text:'Add the two fractions to be subtracted.',equation:`${fs[0]} + ${fs[1]} = ${sum}`},{text:'Subtract their sum from one and simplify.',equation:`1 − ${sum} = ${q.answer}`}],requireSimplified:true};
 }
 if(part==='9'){
  const [n,d]=r.pick([[1,2],[1,3],[2,3],[1,4],[3,4]]),multipliers=r.shuffle(Array.from({length:Math.floor(12/d)-1},(_,i)=>i+2)).slice(0,2),pair=multipliers.map(k=>`${n*k}/${d*k}`),pool=[] as string[];
  for(let den=2;den<=12;den++)for(let num=1;num<den;num++)if(num*d!==n*den&&gcd(num,den)===1)pool.push(`${num}/${den}`);
  const wrong=r.shuffle(pool).slice(0,2),options=r.shuffle([...pair,...wrong]);
  return make('Which two fractions are equivalent?',JSON.stringify(pair),[],'Simplify each fraction or compare equal-sized parts. Select the pair with the same value.',[{text:'The two selected fractions simplify to the same fraction.',equation:`${pair[0]} = ${pair[1]} = ${fraction(n,d)}`}],{structuredResponse:{kind:'fraction-pair',options}});
 }
 if(part==='10'){
  const q=makeP4Nanyang2025('5',seed,index);if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Quantity base changed');const [money,spent]=q.picture.cards,total=nums(money.value)[0],f=spent.value;
  return make('How many oranges are there?',q.answer,[`There are ${total} fruits. ${f} of them are apples and the rest are oranges.`],'Find the fraction that is oranges, then find that fraction of the total.',[{text:'Subtract the apple fraction from one whole.',equation:`Orange fraction = 1 − ${f}`},{text:'Find this fraction of the fruits.',equation:`${total} × (1 − ${f}) = ${q.answer}`}],{unit:'oranges',proof:q.proof});
 }
 if(part==='11'){
  const girls=r.int(12,55),multiple=r.int(3,7),difference=(multiple-1)*girls;
  return make('How many girls are there?',girls,[`There are ${multiple} times as many boys as girls. There are ${difference} more boys than girls.`],'The difference represents the extra boy units beyond one girl unit.',[{text:'Find how many equal units make the difference.',equation:`${multiple} − 1 = ${multiple-1} units`},{text:'One unit is the number of girls.',equation:`${difference} ÷ ${multiple-1} = ${girls}`}],{unit:'girls',proof:op('/',difference,multiple-1)});
 }
 if(part==='12a'||part==='12b'){
  const a=makeP4Nanyang2025('2',seed,index),b=makeP4Nanyang2025('3',seed,index),p=a.picture;if(p.type!=='nanyang-p4'||p.layout!=='table')throw Error('Table base changed');const [monday,tuesday]=p.rows,multiplier=nums(b.context![0])[0],first=Number(a.answer),unit=Number(b.answer),known=monday.values[1]!,last=monday.values[2]!,total=monday.values[3]!,other=tuesday.values[1]!,secondTotal=tuesday.values[3]!;
  const picture:Question['picture']={type:'nanyang-p4',layout:'table',caption:'Crafts sold at the fair',columns:['Badges','Bookmarks','Cards','Total'],rows:[{label:'Monday',values:[known,null,last,total]},{label:'Tuesday',values:[multiplier*unit,other,unit,null]}]};
  return part==='12a'?make('How many bookmarks were sold on Monday?',first,[],'Use the total and the two known counts in Monday’s row.',[{text:'Remove badges and cards from the row total.',equation:`${total} − ${known} − ${last} = ${first}`}],{picture,unit:'bookmarks',proof:op('-',op('-',total,known),last)}):make('How many crafts were sold on Tuesday altogether?',secondTotal,[],'Add all three entries in Tuesday’s row.',[{text:'Combine badges, bookmarks and cards.',equation:`${multiplier*unit} + ${other} + ${unit} = ${secondTotal}`}],{picture,unit:'crafts',proof:op('+',op('+',multiplier*unit,other),unit)});
 }
 if(part==='13'){
  const total=r.pick([18,24,30,36,40,42,48,54,60]),pairs=Array.from({length:total-2},(_,i)=>i+2).filter(g=>total%g===0).map(g=>[String(g),String(total/g)]),example=pairs.slice(0,3);
  return make('Give three different ways to make equal groups.',JSON.stringify(example),[`There are ${total} students. Each group must have more than one student, and there must be more than one group.`],'Use factor pairs. Every grouping must use all the students and differ from the other groupings.',[{text:'Choose three distinct ordered factor pairs; each product equals the total.',equation:example.map(([a,b])=>`${a} × ${b} = ${total}`).join('; ')},{text:'Other sets of three valid distinct groupings are also correct.'}],{structuredResponse:{kind:'factor-pairs',total,rows:3}});
 }
 if(part==='14')return {...makeBatch4Middle('three-offset-total',seed,index),key};
 if(part==='15'){
  const q=makeP4Nanyang2025('9b',seed,index);if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Fraction-unit base changed');const [[pn,pd],[bn,bd]]=q.picture.cards.slice(0,2).map(c=>rat(c.value)),small=fraction(pd*bd-pn*bd-bn*pd,pd*bd),large=fraction(bn,bd),[sn,sd]=rat(small),difference=nums(q.context![1])[0],diff=fraction(bn*sd-sn*bd,bd*sd);
  return make('How much money did Zara have at first?',q.answer,[`Zara spends ${small} of her money on food and ${large} on books. She spends $${difference} more on books than on food.`],'Find the difference between the two fractions. Use the known money difference to recover the whole.',[{text:'Find the fraction represented by the money difference.',equation:`${large} − ${small} = ${diff}`},{text:'Divide by that fraction to recover the original money.',equation:`$${difference} ÷ ${diff} = $${q.answer}`}],{unit:'dollars',proof:op('/',difference,op('-',op('/',bn,bd),op('/',sn,sd)))});
 }
 if(part==='16a'||part==='16b'){
  const start=r.pick([480,510,540]),labels=Array.from({length:6},(_,i)=>`${Math.floor((start+30*i)/60)}:${String((start+30*i)%60).padStart(2,'0')}`);let values:number[]=[],changes:number[]=[];
  for(let attempt=0;attempt<128;attempt++){const rises=r.shuffle([5,10,15]).slice(0,2);changes=r.shuffle([...rises,-5,-10,-5]);values=[r.pick([25,30,35])];for(const delta of changes)values.push(values.at(-1)!+delta);if(values.every(v=>v>0)&&values[2]>values[5])break;}
  if(values[2]<=values[5])throw Error('No valid line-graph decrease');const max=Math.max(...changes),at=changes.indexOf(max),answer=[labels[at],labels[at+1]],picture:Question['picture']={type:'bars',line:true,labels,values,scale:5};
  return part==='16a'?make('During which 30-minute period is the increase greatest?',JSON.stringify(answer),['The graph shows the number of students in the library. Times use the 24-hour clock.'],'Compare consecutive point differences. Find the greatest positive change.',[{text:'Find the change during each consecutive period.',equation:changes.map((n,i)=>`${labels[i]} to ${labels[i+1]}: ${n>0?'+':''}${n}`).join('; ')},{text:'Choose the interval with the greatest positive change.',equation:`${answer[0]} to ${answer[1]}: increase ${max}`}],{picture,structuredResponse:{kind:'interval',labels}}):make(`What is the decrease from ${labels[2]} to ${labels[5]}?`,values[2]-values[5],['The graph shows the number of students in the library. Times use the 24-hour clock.'],'Read both named points, then subtract the later count from the earlier count.',[{text:'Find the decrease between the two points.',equation:`${values[2]} − ${values[5]} = ${values[2]-values[5]}`}],{picture,unit:'students',proof:op('-',values[2],values[5])});
 }
 return {...makeBatch4Middle('equal-remainders',seed,index),key};
}
/** Recompute explanations after every reused template transformation. */
export function makeBatch6MiddleP4(part:string,seed:number,index=0):Batch6MiddleQuestion{
 const q=build(part,seed,index);return {...q,explanation:q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' ')};
}
