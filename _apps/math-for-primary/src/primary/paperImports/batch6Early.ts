import {Rng,hashString} from '../../engine/random';
import {makeQuestion,type Question} from '../generate';
import type {Activity} from '../catalog';
import type {PaperPicture} from '../paperPicture';
import {makeP2HenryPark2025Question} from './p2HenryPark2025';
import {P2_HENRY_PARK_2025_PATTERNS} from './p2HenryPark2025Meta';
import {makeBatch3Early} from './batch3Early';
import {makeBatch4Early} from './batch4Early';
import {BATCH6_EARLY_PARTS,type Batch6EarlyPart} from './batch6EarlyMeta';
export {BATCH6_EARLY_PARTS,BATCH6_EARLY_SOURCE,type Batch6EarlyPart} from './batch6EarlyMeta';
export type Batch6EarlyQuestion=Question&{workedSteps:NonNullable<Question['workedSteps']>};
type Step=[text:string,equation?:string];
const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;
const clock=(minutes:number,period=false)=>`${Math.floor(minutes/60)%12||12}:${String(minutes%60).padStart(2,'0')}${period?minutes>=720?' pm':' am':''}`;
const facts=(heading:string,items:{label:string;value:string}[]):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});
const p2=(parameter:string,seed:number,index:number)=>{const meta=P2_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter===parameter)!;return makeP2HenryPark2025Question({...meta,id:`batch6-reused-${parameter}`,kind:'paper',track:'standard'},seed,index);};
const schedules:{saturday:number;friday:number;total:number}[]=[];
for(let saturday=115;saturday<=299;saturday++)for(let gap=16;gap<=95;gap++){
 const friday=saturday+gap,total=friday+saturday;
 if(total<=999&&Math.floor(total/10)%10>0&&total%10<saturday%10&&Math.floor(total/10)%10-1<Math.floor(saturday/10)%10&&friday%10<saturday%10&&Math.floor(friday/10)%10-1>=Math.floor(saturday/10)%10)schedules.push({saturday,friday,total});
}

const spending:{larger:number;difference:number;smaller:number;total:number}[]=[];
for(let h=3;h<=5;h++)for(let t=1;t<=7;t++)for(let o=0;o<=7;o++)for(let dh=1;dh<=h-2;dh++)for(let dt=t;dt<=9;dt++)for(let d=o+1;d<=9;d++){
 const larger=100*h+10*t+o,difference=100*dh+10*dt+d,smaller=larger-difference,total=larger+smaller;
 if(total<=999&&[1,10,100].every(place=>Math.floor(larger/place)%10+Math.floor(smaller/place)%10<10))spending.push({larger,difference,smaller,total});
}

/** Reused generators supply clocks, equal groups, sharing, finish times and no-carry facts.
 * Remaining configurations share constrained three-digit arithmetic and source-compatible responses. */
export function makeBatch6Early(part:Batch6EarlyPart,seed:number,index=0):Batch6EarlyQuestion{
 if(!BATCH6_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown complete P2 response ${part}`);
 const group=part.replace(/[ab]$/,''),r=new Rng(hashString(`mahabodhi-p2-review2-original-v1:${group}:${seed}:${index}`)),key=`batch6-early-${part}:${seed}:${index}`;
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:Step[],extra:Partial<Batch6EarlyQuestion>={}):Batch6EarlyQuestion=>({key,prompt,answer:String(answer),context,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra});
 const choices=(answer:string|number,wrong:(string|number)[])=>r.shuffle([...new Set([String(answer),...wrong.map(String),...Array.from({length:5},(_,i)=>String(Number(answer)+i+1))])].slice(0,4));
 if(part==='1'){
  const activity:Activity={id:'batch6-clock-base',kind:'clock',level:2,track:'standard',strand:'Measurement & Geometry',title:'Clock',objective:'Read the clock',skillIds:['P2.S.TIME.01'],icon:'✦'},q=makeQuestion(activity,seed,index);
  if(q.picture?.type!=='clock')throw Error('Existing clock representation changed');
  const hour=Math.floor(q.picture.minutes/60)%12||12,minute=q.picture.minutes%60;
  const workedSteps=[{text:'Read the short hand to find the hour.',equation:`Hour: ${hour}`},{text:'Count minute marks from 12 using the long hand.',equation:`Minute: ${minute}; time: ${clock(q.picture.minutes)}`}];
  return {...q,key,workedSteps,explanation:workedSteps.map(s=>s.text+' '+s.equation).join(' ')};
 }
 if(part==='6'){
  const q=makeBatch4Early('finish-time',seed,index);
  return {...q,key,workedSteps:q.workedSteps.map(({text,equation})=>({text,equation}))};
 }
 if(part==='7'||part==='11'){
  const q=p2(part==='7'?'hp2q2-11':'hp2q2-03',seed,index);
  return {...q,key,choices:undefined,workedSteps:q.workedSteps};
 }
 if(part==='2'){
  const hours=r.int(1,3),minutes=r.pick([15,25,35,45,55]),answer=60*hours+minutes;
  return make(`How many minutes are ${hours} h ${minutes} min?`,answer,[],'Change every hour to 60 minutes, then include the extra minutes.',
   [['Convert the whole hours.',`${hours} × 60 = ${hours*60} minutes`],['Add the remaining minutes.',`${hours*60} + ${minutes} = ${answer} minutes`]],
   {unit:'minutes',choices:choices(answer,[hours*10+minutes,answer-10,hours*100+minutes])});
 }
 if(part==='3'){
  const count=r.pick([2,3,4,5]),size=r.pick([2,3,4,5,6,7,8,9].filter(n=>n!==count)),answer=count;
  return make('What number belongs in the empty box?',answer,[],'The missing factor tells how many equal addends there are.',
   [['Count the repeated addends.',`${count} copies of ${size}`],['The number of copies is the missing factor.',`${Array(count).fill(size).join(' + ')} = ${count} × ${size}`]],
   {display:`${Array(count).fill(size).join('+')} = ? × ${size}`,choices:choices(answer,[size,count*size,count+1,count-1])});
 }
 if(part==='4'){
  const notes=r.shuffle([2,5,10,50]).slice(0,2),coinValues=r.pick([[50,20,10,10,10],[50,20,20,5,5]]),base=notes.reduce((a,b)=>a+b,0),answer=money((base+1)*100);
  return make('What is the total amount in dollars and cents?',answer,['Each token shows the value of one note or one coin.'],
   'Add the note values. Count every coin, including coins with the same value.',
   [['Add the notes.',notes.map(n=>`$${n}`).join(' + ')+` = $${base}`],['Add all five coins.',`${coinValues.join(' + ')} = 100 cents = $1`],['Include both notes and coins.',`$${base} + $1 = ${answer}`]],
   {picture:{type:'pattern',items:r.shuffle([...notes.map(n=>`$${n}`),...coinValues.map(n=>`${n}¢`)])},choices:r.shuffle([answer,money(base*100),money(base*100+70),money(base*100+180)])});
 }
 if(part==='5'){
  const start=r.int(13,16)*60+r.pick([5,10,15,20,25]),duration=r.int(13,23)*5,end=start+duration,toHour=60-start%60,remaining=duration-toHour;
  return make(`A music lesson starts at ${clock(start,true)} and ends at ${clock(end,true)}. How many minutes does it last?`,duration,[],
   'Count to the next whole hour, then count the rest of the time.',
   [['Find the time to the next whole hour.',`60 − ${start%60} = ${toHour} minutes`],['Count the minutes from that hour to the finishing time.',`${remaining} minutes`],['Combine both parts of the interval.',`${toHour} + ${remaining} = ${duration} minutes`]],
   {unit:'minutes',choices:choices(duration,[duration-60,duration-10,duration+10])});
 }
 if(part==='8'){
  const dollars=r.int(10,95),cents=r.pick([5,15,25,35,45,55,65,75,85,95]),all=dollars*100+cents,answer=(all/100).toFixed(2);
  return make(`Write ${all} cents in dollars.`,answer,[],'Make groups of 100 cents. Write the remaining cents using two decimal places.',
   [['Separate the full dollars and remaining cents.',`${all} = ${dollars} × 100 + ${cents}`],['Write dollars and cents together.',`${all} cents = $${answer}`]],{unit:'dollars'});
 }
 if(part==='9'){
  const hundreds=r.int(2,9),ones=r.int(1,7),whole=hundreds*100+ones,removed=r.int(1,9)*10+r.int(ones+1,9),answer=whole-removed;
  return make(`Sana has ${whole} cards. She gives ${removed} cards to a friend. How many cards does she have left?`,answer,[],
   'Exchange through the zero tens before subtracting the ones.',
   [['Exchange one hundred into tens, then one ten into ones.',`${whole} = ${hundreds-1} hundreds + 9 tens + ${10+ones} ones`],['Subtract the cards given away.',`${whole} − ${removed} = ${answer}`],['Check by putting them back.',`${answer} + ${removed} = ${whole}`]],{unit:'cards'});
 }
 if(part==='10'){
  const base=makeBatch3Early('three-card-subtraction',seed,index);
  if(base.picture?.type!=='pattern')throw Error('Existing no-carry sampler changed');
  const pool=base.picture.items.map(Number),whole=Math.max(...pool),[a,b]=pool.filter(n=>n!==whole);
  return make(`A stall sells ${a} bookmarks on Saturday and ${b} bookmarks on Sunday. How many bookmarks are sold over the weekend?`,whole,[],
   'Include the sales from both days. Add by place value.',
   [['Add the two daily amounts.',`${a} + ${b} = ${whole}`],['Check that neither day was left out.',`${whole} − ${a} = ${b}`]],{unit:'bookmarks'});
 }
 if(part==='12'){
  const low=r.int(10,20),gap=r.int(2,4),prices=r.shuffle([low,low+gap,low+3*gap,low+7*gap]),labels=['Notebook','Paintbox','Board game','Backpack'],selected=r.shuffle([0,1,2,3]).slice(0,2).sort((a,b)=>a-b),spent=prices[selected[0]]+prices[selected[1]],change=100-spent,answerNames=selected.map(i=>labels[i]);
  return make('Which two different items did Noor buy?',JSON.stringify(answerNames),[`Noor had $100. She bought exactly two different items and had $${change} left.`],
   'Find how much was spent, then check pairs of item prices.',
   [['Subtract the money left from the starting amount.',`$100 − $${change} = $${spent}`],['Find the two prices with that total.',`$${prices[selected[0]]} + $${prices[selected[1]]} = $${spent}`],['Name both items.',answerNames.join(' and ')]],
   {picture:facts('School fair prices',labels.map((label,i)=>({label,value:`$${prices[i]}`}))),structuredResponse:{kind:'named-pair',options:labels}});
 }
 if(group==='13'){
  const {larger,difference,smaller,total}=r.pick(spending),both=part==='13b';
  return make(both?'How much did Lina and Noor spend altogether?':'How much did Noor spend?',both?total:smaller,
   [`Lina spent $${larger} on a trip.`,`She spent $${difference} more than Noor.`],
   'Find Noor’s smaller amount first. Add both amounts only when the question asks for their total.',
   [['Remove Lina’s extra spending to find Noor’s amount.',`$${larger} − $${difference} = $${smaller}`],both?['Combine the two people’s spending.',`$${larger} + $${smaller} = $${total}`]:['Check the comparison.',`$${smaller} + $${difference} = $${larger}`]],{unit:'dollars'});
 }
 const {saturday,friday,total}=r.pick(schedules),compare=part==='14b',answer=compare?friday-saturday:friday;
 return make(compare?'How many fewer flowers were planted on Saturday than on Friday?':'How many flowers were planted on Friday?',answer,
  [`A gardener planted ${total} flowers over Friday and Saturday.`,`${saturday} flowers were planted on Saturday.`],
  'Find Friday’s missing amount first. Then compare Friday and Saturday if needed.',
  [['Subtract Saturday from the two-day total.',`${total} − ${saturday} = ${friday}`],compare?['Find the gap between the two days.',`${friday} − ${saturday} = ${answer}`]:['Check both days make the given total.',`${friday} + ${saturday} = ${total}`]],{unit:'flowers'});
}
export function makeBatch6EarlySet(seed:number,index=0){return BATCH6_EARLY_PARTS.map(pattern=>({pattern,question:makeBatch6Early(pattern.id,seed,index)}));}
