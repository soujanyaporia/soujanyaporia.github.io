import {Rng,hashString} from '../../engine/random';
import {makeQuestion,type Question,type Proof} from '../generate';
import type {Activity,GameKind} from '../catalog';
import {makeP3Raffles2025} from './p3Raffles2025';
import {makeBatch3Upper} from './batch3Upper';
import {makeBatch4Middle} from './batch4Middle';
import {BATCH5_MIDDLE_P3_PARTS} from './batch5MiddleMeta';
export {BATCH5_MIDDLE_P3_PARTS,BATCH5_TAO_NAN_P3_SOURCE} from './batch5MiddleMeta';
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;
const activity=(kind:GameKind,level:number):Activity=>({id:`batch5-middle-reuse-${kind}-${level}`,kind,level,track:'standard',strand:'Number & Algebra',title:kind,objective:kind,skillIds:[],icon:'✦'});
function existing(kind:GameKind,level:number,seed:number,index:number,predicate:(q:Question)=>boolean=()=>true){for(let a=0;a<512;a++){const q=makeQuestion(activity(kind,level),seed,index*512+a);if(predicate(q))return q;}throw Error(`No matching existing configuration for ${kind}`);}
const cardValues=(q:Question)=>{if(q.picture?.type!=='paper'||q.picture.layout!=='cards')throw Error('Existing card representation changed');return q.picture.cards;};
function buildBatch5MiddleP3(part:string,seed:number,index=0):Question{
 if(!BATCH5_MIDDLE_P3_PARTS.some(p=>p.id===part))throw Error(`Unknown whole-paper P3 part: ${part}`);
 const r=new Rng(hashString(`batch5-middle-p3:${part}:${seed}:${index}`)),key=`batch5-middle-p3:${part}:${seed}:${index}`;
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:NonNullable<Question['workedSteps']>,extra:Partial<Question>={}):Question=>({key,prompt,answer:String(answer),context,hint,workedSteps:steps,explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra});
 if(part==='1'){
  const q=makeP3Raffles2025('11',seed,index),n=Number(cardValues(q)[0].value),value=n-Math.floor(n/100)%10*100,name=q.answer.replace(/ (?:one|two|three|four|five|six|seven|eight|nine) hundred/,'');
  return make('Write the number in words.',name,[],q.hint,[{text:'The hundreds place is zero.',equation:`${value} = ${Math.floor(value/1000)*1000} + ${value%100}`},{text:name}],{display:String(value),answerFormat:'number-words'});
 }
 if(part==='2'){
  const q=existing('order',3,seed,index),first=r.int(2,8),[b,c]=r.shuffle([1,2,3,4,5,6,7,8,9].filter(d=>d!==first)).slice(0,2),values=[first*1000+b*10+c,first*1000+b*100+c,first*1000+b*100+c*10,first*1000+c*100+b],ordered=[...values].sort((a,b)=>a-b);return {...q,key,answer:ordered.join(','),order:r.shuffle(values.map(String)),prompt:'Arrange the numbers from smallest to greatest.',context:['Use every number once.'],workedSteps:[{text:'Compare thousands, then hundreds, tens and ones.',equation:ordered.join(' < ')}]};
 }
 if(part==='3'){
  const q=makeBatch3Upper('three-digit-backward-pattern',seed,index);if(q.picture?.type!=='pattern')throw Error('Existing pattern representation changed');const original=q.picture.items.map(v=>v==='?'?Number(q.answer):Number(v)),step=original[2]-original[3],target=1000-step+r.int(1,step-1),offset=target-original[1],values=original.map(v=>v+offset);
  return make('What is the missing number?',values[1],[],'Use two neighbouring known terms near the end to find the backward step.',[{text:'Find the same backward change from two known neighbours.',equation:`${values[2]} − ${values[3]} = ${step}`},{text:'Subtract that change from the first term.',equation:`${values[0]} − ${step} = ${values[1]}`}],{picture:{type:'pattern',items:values.map((v,i)=>i===1?'?':String(v))},proof:op('-',values[0],step)});
 }
 if(part==='4'||part==='10'){
  const source=cardValues(makeP3Raffles2025('8',seed,index)),values=source.map(c=>Math.round(Number(c.value.replace('$',''))*100));
  if(part==='4'){
   const prices=values.slice(0,3),max=Math.max(...prices),label='ABC'[prices.indexOf(max)];
   return make('Which item is the most expensive?',label,prices.map((v,i)=>`Item ${'ABC'[i]} costs ${money(v)}.`),'Compare whole dollars first, then the cents.',[{text:'Order the three prices.',equation:[...prices].sort((a,b)=>a-b).map(money).join(' < ')},{text:`Item ${label} has the greatest price.`}]);
  }
  const known=r.int(0,3),other=r.pick([0,1,2,3].filter(i=>i!==known)),total=values[known]+values[other],labels=['Notebook','Water bottle','Pencil case','Sketchbook'];
  return make('Which item does Dev buy?',labels[other],[...values.map((v,i)=>`${labels[i]}: ${money(v)}.`),`Cora and Dev buy one item each and spend ${money(total)} altogether. Cora buys the ${labels[known].toLowerCase()}.`],'Subtract the known item’s price, then match the remaining price to the list.',[{text:'Find Dev’s item price.',equation:`${money(total)} − ${money(values[known])} = ${money(values[other])}`},{text:`The ${labels[other].toLowerCase()} has this price.`}]);
 }
 if(part==='5'){
  const q=existing('place',3,seed,index,q=>q.prompt.includes('100 place')&&Number(q.answer)>0),n=Number(q.display!.replaceAll(',','')),thousands=Math.floor(n/1000)*1000,tens=Math.floor(n/10)%10*10,ones=n%10,answer=Number(q.answer)/10;
  return make('What number belongs in the box?',answer,[],'One hundred is ten tens. Express the hundreds part as a number of tens.',[{text:'Remove the already listed places.',equation:`${n} − ${thousands} − ${tens} − ${ones} = ${q.answer}`},{text:'Exchange that value for tens.',equation:`${q.answer} ÷ 10 = ${answer} tens`}],{display:`${n} = ${thousands} + □ tens + ${tens} + ${ones}`,proof:op('/',Number(q.answer),10)});
 }
 if(part==='6'){
  const denominations=[5000,1000,500,50,10],counts=denominations.map(()=>r.int(1,4)),items=denominations.flatMap((d,i)=>Array(counts[i]).fill(d>=100?money(d):`${d}¢`)),total=denominations.reduce((s,d,i)=>s+d*counts[i],0);
  return make('What is the total amount of money?',(total/100).toFixed(2),['Each tile represents one note or coin of the value shown.'],'Count each denomination, multiply by its value, and add the amounts.',[{text:'Combine notes and coins with the same value.',equation:denominations.map((d,i)=>`${counts[i]} × ${d>=100?money(d):`${d}¢`}`).join(' + ')},{text:'Add all denominations.',equation:`${total} cents = ${money(total)}`}],{picture:{type:'pattern',items},unit:'dollars',proof:op('/',total,100)});
 }
 if(part==='7'){
  const q=existing('clock',1,seed,index,q=>q.picture?.type==='clock'&&q.picture.minutes%60===0);return {...q,key,answer:String(Number(q.answer.split(':')[0])),prompt:'What hour does the morning activity start?',context:['The activity starts before noon.'],choices:undefined,unit:'a.m.',workedSteps:[{text:'Read the hour hand and minute hand.',equation:q.explanation}]};
 }
 if(part==='8'){
  const q=existing('duration',2,seed,index,q=>!/h 0 min/.test(q.prompt)),[hours,minutes]=q.prompt.match(/\d+/g)!.map(Number);return {...q,key,prompt:'How many minutes is this?',context:[`The duration is ${hours} h ${minutes} min.`],workedSteps:[{text:'Change each hour to sixty minutes, then add the extra minutes.',equation:q.explanation}]};
 }
 if(part==='9'){
  const q=makeBatch4Middle('boxes-a',seed,index);return {...q,key,prompt:'How many bags are filled?',context:q.context!.map(s=>s.replaceAll('Nora sells','Mina packs').replaceAll('crayons','apples').replaceAll('boxes','bags').replace(' packed in',' into')),unit:'bags',hint:'Divide the total number of apples by the number in each bag.',workedSteps:q.workedSteps!.map(s=>({text:s.text.replaceAll('crayons','apples').replaceAll('box','bag'),equation:s.equation?.replaceAll('boxes','bags')}))};
 }
 if(part==='11'){
  const q=existing('decimalAdd',4,seed,index,q=>q.prompt==='Subtract the decimals.'),[a,b]=q.display!.match(/\d+(?:\.\d+)?/g)!.map(Number);
  return {...q,key,prompt:'How much more does the jacket cost than the cap?',context:[`The jacket costs $${a.toFixed(2)}. The cap costs $${b.toFixed(2)}.`],display:undefined,unit:'dollars',workedSteps:[{text:'Subtract the smaller price from the larger price.',equation:q.explanation}]};
 }
 if(part==='12'){
  const q=existing('duration',3,seed,index,q=>Number(q.answer)>=65&&Number(q.answer)%60!==0),times=q.prompt.match(/\d\d:\d\d/g)!,duration=Number(q.answer),h=Math.floor(duration/60),m=duration%60;
  return make('How long does the activity last? Write hours:minutes.',`${h}:${String(m).padStart(2,'0')}`,[`The activity starts at ${times[0]} and ends at ${times[1]}. Times use the 24-hour clock.`],'Find the time difference, then group every sixty minutes into one hour.',[{text:'Find the elapsed minutes.',equation:q.explanation},{text:'Express complete hours and minutes left over.',equation:`${duration} minutes = ${h} h ${m} min`}],{unit:'h:min'});
 }
 if(part==='13'){
  const q=makeP3Raffles2025('21a',seed,index),[baseFirst,baseGap]=cardValues(q).map(c=>Number(c.value.match(/\d+/)![0])),first=baseFirst*10+r.int(1,9),gap=baseGap*10,second=first-gap,total=first+second;
  return make('How many rolls are prepared altogether?',total,[`A stall prepares ${first} cheese rolls. This is ${gap} more than the number of mushroom rolls.`],'Find the smaller collection first, then add both collections.',[{text:'Find the number of mushroom rolls.',equation:`${first} − ${gap} = ${second}`},{text:'Combine both collections.',equation:`${first} + ${second} = ${total}`}],{unit:'rolls',proof:op('+',first,op('-',first,gap))});
 }
 if(part==='14'){
  const first=r.int(3,12),multiple=r.int(2,7),second=first*multiple,gap=r.int(1,second-1),third=second-gap,total=first+second+third;
  return make('How many cards do the three children collect altogether?',total,[`Asha collects ${first} cards. Ben collects ${multiple} times as many cards as Asha.`,`Chen collects ${gap} fewer cards than Ben.`],'Find Ben’s collection, then Chen’s collection, before adding all three.',[{text:'Find Ben’s collection.',equation:`${first} × ${multiple} = ${second}`},{text:'Find Chen’s collection.',equation:`${second} − ${gap} = ${third}`},{text:'Add all three collections.',equation:`${first} + ${second} + ${third} = ${total}`}],{unit:'cards',proof:op('+',op('+',first,second),third)});
 }
 return {...makeBatch4Middle('age-sum-difference',seed,index),key};
}

/** Derive explanation after every context/number transformation, including reused templates. */
export function makeBatch5MiddleP3(part:string,seed:number,index=0):Question{
 const q=buildBatch5MiddleP3(part,seed,index);
 return {...q,explanation:q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' ')};
}
