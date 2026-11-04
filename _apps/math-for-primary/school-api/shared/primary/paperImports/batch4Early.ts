import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch4EarlyPicture} from './batch4EarlyPicture';
import {BATCH4_EARLY_PARTS,type Batch4EarlyPart} from './batch4EarlyMeta';
export {BATCH4_EARLY_PARTS,type Batch4EarlyPart} from './batch4EarlyMeta';
export type Batch4EarlyQuestion=Omit<Question,'picture'|'workedSteps'>&{picture?:Picture|Batch4EarlyPicture;workedSteps:{text:string;equation?:string;picture?:Picture|Batch4EarlyPicture}[]};
type Step=[text:string,equation?:string];
const pairPool=(sum:number)=>Array.from({length:9},(_,i)=>i+1).filter(a=>sum-a>=1&&sum-a<=9).map(a=>[a,sum-a]);
const clock=(minutes:number)=>`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')} am`;

/** Small reusable configurations; only fractional pictographs require a new mathematical renderer. */
export function makeBatch4Early(part:Batch4EarlyPart,seed:number,index=0):Batch4EarlyQuestion{
 if(!BATCH4_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown early batch4 task: ${part}`);
 const r=new Rng(hashString(`early-batch4-v1:${part}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:Step[],extra:Partial<Batch4EarlyQuestion>={}):Batch4EarlyQuestion=>({key:`batch4-early-${part}:${seed}:${index}`,prompt,answer:String(answer),context,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra});
 if(part==='three-addend-choice'){
  const target=r.int(12,20),triple=(sum:number)=>{
   const options=Array.from({length:9},(_,i)=>i+1).flatMap(a=>pairPool(sum-a).map(([b,c])=>[a,b,c]));return r.pick(options);
  };
  const correct=triple(target).join(' + '),choices=r.shuffle([correct,...[1,2,3].map(n=>triple(target-n).join(' + '))]);
  return make(`Which addition has a total of ${target}?`,correct,[],'Add all three numbers in each choice.',
   [['Add the first two numbers, then include the third.',`${correct} = ${target}`],['Check that the other expressions have different totals.']],{choices});
 }
 if(part==='equivalent-sum-choice'){
  const total=r.int(8,16),given=r.pick(pairPool(total)),correct=r.pick(pairPool(total).filter(p=>[...p].sort().join(',')!==[...given].sort().join(','))).join(' + '),target=given.join(' + ');
  return make(`Which addition has the same answer as ${target}?`,correct,[],'Find the target sum, then compare the other sums.',
   [['Find the target value.',`${target} = ${total}`],['Choose the expression with that same value.',`${correct} = ${total}`]],
   {choices:r.shuffle([correct,r.pick(pairPool(total-1)).join(' + '),r.pick(pairPool(total+1)).join(' + ')])});
 }
 if(part==='total-difference-smaller'){
  const smaller=r.int(3,8),difference=r.int(1,3),total=2*smaller+difference;
  return make('How many blue counters are there?',smaller,
   [`There are ${total} red and blue counters altogether.`,`There are ${difference} more red counters than blue counters.`],
   'Set aside the extra red counters. Share the remaining counters into two equal groups.',
   [['Remove the extra red counters.',`${total} − ${difference} = ${2*smaller}`],['Split the remaining counters equally between the two colours.',`${2*smaller} ÷ 2 = ${smaller}`],['Check both the total and the difference.',`${smaller+difference} + ${smaller} = ${total}`]],{unit:'counters'});
 }
 if(part==='half-symbol-pair-total'||part==='pictograph-difference'){
  const total=part==='half-symbol-pair-total',scale=total?4:3,labels=['Toy cars','Teddy bears','Puzzles','Balls'];
  const counts=total?[r.int(2,6),r.int(1,6),r.int(1,5),r.int(1,6)]:[r.int(4,7),r.int(2,6),r.int(1,5),r.int(1,3)];
  const picture:Batch4EarlyPicture={type:'batch4-early',layout:'pictograph',heading:'Toys in the activity room',scale,rows:labels.map((label,i)=>({label,wholeSymbols:counts[i],halfSymbol:total&&(i===1||i===2)}))};
  const first=picture.rows[0].wholeSymbols*scale,second=picture.rows[total?2:3].wholeSymbols*scale+(total?scale/2:0),answer=total?first+second:first-second;
  return make(total?'How many toy cars and puzzles are there altogether?':'How many fewer balls than toy cars are there?',answer,
   ['Use the value of each symbol shown in the key.'],
   total?'Count the whole and half symbols in the two requested rows. Use the key, then add.':'Use the key to find both requested amounts, then subtract the smaller amount.',
   [['Read the Toy cars row.',`${counts[0]} × ${scale} = ${first}`],[total?'Read the Puzzles row, including its half symbol.':'Read the Balls row.',total?`${counts[2]} × ${scale} + ${scale/2} = ${second}`:`${counts[3]} × ${scale} = ${second}`],[total?'Combine the two amounts.':'Find the difference.',`${first} ${total?'+':'−'} ${second} = ${answer}`]],{picture,unit:'toys'});
 }
 const start=r.int(6,10)*60+r.int(4,11)*5,journey=r.pick(Array.from({length:12},(_,i)=>(i+1)*5).filter(n=>start%60+n>=60&&start+n<720)),end=start+journey;
 return make(`Noor leaves home at ${clock(start)}. The journey takes ${journey} minutes. What time does Noor arrive?`,clock(end),[],
  'Count forward to the next whole hour, then add the remaining minutes.',
  [['Find the minutes to the next whole hour.',`60 − ${start%60} = ${60-start%60} minutes`],['Add the journey time to the start time.',`${clock(start)} + ${journey} minutes = ${clock(end)}`]]);
}
export function makeBatch4EarlySet(seed:number,index=0){return BATCH4_EARLY_PARTS.map(pattern=>({pattern,question:makeBatch4Early(pattern.id,seed,index)}));}
