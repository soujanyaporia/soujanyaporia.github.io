import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {Batch2EarlyPicture} from './batch2EarlyPicture';
import {BATCH2_EARLY_PARTS,type Batch2EarlyPart} from './batch2EarlyMeta';
export {BATCH2_EARLY_PARTS,type Batch2EarlyPart} from './batch2EarlyMeta';
export type Batch2EarlyQuestion=Omit<Question,'picture'|'workedSteps'>&{
 picture:Picture|Batch2EarlyPicture;
 workedSteps:{text:string;equation?:string;picture?:Picture|Batch2EarlyPicture}[];
};
type Step=[text:string,equation?:string];
const cards=(heading:string,values:number[]):PaperPicture=>({type:'paper',layout:'cards',heading,cards:values.map((value,i)=>({label:`Card ${i+1}`,value:String(value),icon:'number'}))});

/** Five source response structures share four small original generator families. No source text is embedded. */
export function makeBatch2Early(part:Batch2EarlyPart,seed:number,index=0):Batch2EarlyQuestion{
 if(!BATCH2_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown early review task: ${part}`);
 const r=new Rng(hashString(`early-batch2-v1:${part}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,picture:Batch2EarlyQuestion['picture'],context:string[],hint:string,steps:Step[],extra:Partial<Batch2EarlyQuestion>={}):Batch2EarlyQuestion=>({
  key:`batch2-early-${part}:${seed}:${index}`,prompt,answer:String(answer),picture,context,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation,picture})),
  explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra,
 });
 if(part==='greatest-even-three'||part==='smallest-odd-four'){
  const greatest=part==='greatest-even-three',length=greatest?3:4;
  let digits:number[]=[];
  for(let attempt=0;attempt<100;attempt++){
   digits=r.shuffle([0,1,2,3,4,5,6,7,8,9]).slice(0,length);
   if(digits.some(d=>d%2===(greatest?0:1))&&digits.filter(d=>d!==0).length>=2&&
      digits.slice().sort().join(',')!==(greatest?'3,6,8':'0,1,3,6'))break;
  }
  // Reserve each admissible ones digit, then optimize the remaining places in order.
  // The independent solver enumerates every complete permutation instead.
  const candidates=digits.filter(d=>d%2===(greatest?0:1)).map(ones=>{
   const rest=digits.filter(d=>d!==ones).sort((a,b)=>greatest?b-a:a-b);
   if(rest[0]===0){const nonzero=rest.findIndex(d=>d>0);[rest[0],rest[nonzero]]=[rest[nonzero],rest[0]];}
   return Number([...rest,ones].join(''));
  });
  const answer=greatest?Math.max(...candidates):Math.min(...candidates),answerDigits=String(answer).split('');
  return make(`What is the ${greatest?'greatest 3-digit even':'smallest 4-digit odd'} number you can make?`,answer,cards('Use all the digit cards',r.shuffle(digits)),
   ['Use every card exactly once. A number cannot begin with 0.'],
   `The ones digit must be ${greatest?'even':'odd'}. Compare the possible numbers from the left.`,
   [[`Keep an ${greatest?'even':'odd'} digit for the ones place.`,`The ones digit in ${answer} is ${answerDigits.at(-1)}.`],
    [`Compare the allowed arrangements from the greatest place value.`,`${answerDigits.join(' | ')} makes ${answer}`],
    ['Check that each card is used once and the first digit is not zero.']],{});
 }
 if(part==='pair-to-thousand'){
  const target=1000;
  let first=r.int(125,875);if(first===500||first===719||first===281)first=437;
  const second=target-first;
  const decoy=r.pick(Array.from({length:801},(_,i)=>i+100).filter(n=>n!==first&&n!==second&&n+first!==target&&n+second!==target));
  const values=r.shuffle([first,second,decoy]);
  const pairs=values.flatMap((a,i)=>values.slice(i+1).map(b=>({a,b,label:`${a} and ${b}`})));
  const selected=pairs.find(p=>p.a+p.b===target)!;
  return make('Which two cards add up to 1000?',selected.label,cards('Choose two number cards',values),
   ['Choose two different cards. Use each chosen card once.'],
   'Choose a card and work out how much more is needed to make 1000.',
   [['Find the amount needed with one of the cards.',`1000 − ${first} = ${second}`],
    ['Check that the two selected cards make the target.',`${first} + ${second} = 1000`]],
   {choices:r.shuffle(pairs.map(p=>p.label))});
 }
 if(part==='offset-ruler-difference'){
  const longLength=r.int(6,10),shortLength=r.int(2,longLength-2);
  let longStart=r.int(1,Math.min(5,15-longLength));
  let shortStart=r.pick(Array.from({length:Math.min(9,15-shortLength)},(_,i)=>i+1).filter(n=>n!==longStart));
  if(longStart===4&&longLength===8&&shortStart===2&&shortLength===5)longStart=3;
  if(shortStart===longStart)shortStart=shortStart===1?2:1;
  const picture:Batch2EarlyPicture={type:'batch2-early',layout:'offset-rulers',maximum:15,objects:[
   {label:'Blue ribbon',start:longStart,end:longStart+longLength,tone:'blue'},
   {label:'Orange ribbon',start:shortStart,end:shortStart+shortLength,tone:'orange'},
  ]};
  return make('How many centimetres longer is the blue ribbon than the orange ribbon?',longLength-shortLength,picture,
   ['Both rulers use centimetres. The dotted lines show where each ribbon begins and ends.'],
   'Subtract the start reading from the end reading for each ribbon. Then compare the two lengths.',
   [['Find the blue ribbon’s length.',`${longStart+longLength} − ${longStart} = ${longLength} cm`],
    ['Find the orange ribbon’s length.',`${shortStart+shortLength} − ${shortStart} = ${shortLength} cm`],
    ['Subtract the shorter length.',`${longLength} − ${shortLength} = ${longLength-shortLength} cm`]],{unit:'cm'});
 }
 if(part==='chart-sales'){
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday'],values=r.shuffle(Array.from({length:25},(_,i)=>(i+4)*2)).slice(0,5),price=r.int(2,8),day=r.int(0,4);
  // Preserve source difficulty: an unlabelled minor-grid reading, not merely a labelled ten.
  if(values[day]%10===0)values[day]+=2;
  if(values[day]===44&&price===3&&day===2)values[day]=46;
  const picture:Batch2EarlyPicture={type:'batch2-early',layout:'sales-bars',heading:'Bookmarks sold at the school fair',days,values,maximum:60,minorStep:2,labelStep:10};
  const answer=values[day]*price;
  return make(`How much money did the stall collect from selling bookmarks on ${days[day]}?`,answer,picture,
   [`The graph shows the number of bookmarks sold each day. Each bookmark costs $${price}.`],
   'Read the end of the correct bar using the grid scale. Multiply the number sold by the price of one bookmark.',
   [['Each small grid interval represents 2 bookmarks. Read the requested day.',`${days[day]}: ${values[day]} bookmarks`],
    ['Find the total money collected that day.',`${values[day]} × $${price} = $${answer}`]],{unit:'dollars'});
 }
 throw Error(`Unhandled early review task: ${part}`);
}

export function makeBatch2EarlySet(seed:number,index=0){
 return BATCH2_EARLY_PARTS.map(pattern=>({pattern,question:makeBatch2Early(pattern.id,seed,index)}));
}
