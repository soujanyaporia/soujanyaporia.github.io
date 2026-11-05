import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH7_EARLY_PARTS} from './batch7EarlyMeta';
export {BATCH7_EARLY_PARTS,BATCH7_EARLY_MAPPING_STATUS,type Batch7EarlyPart} from './batch7EarlyMeta';
type Step=[text:string,equation?:string];
const clock=(minutes:number)=>`${Math.floor(minutes/60)%12||12}:${String(minutes%60).padStart(2,'0')} am`;
const notePayments=(amount:number)=>{
 const plans:{twos:number;fives:number;tens:number;count:number}[]=[];
 for(let tens=0;tens*10<=amount;tens++)for(let fives=0;tens*10+fives*5<=amount;fives++){
  const rest=amount-tens*10-fives*5;
  if(rest%2===0)plans.push({twos:rest/2,fives,tens,count:rest/2+fives+tens});
 }
 return plans.sort((a,b)=>a.count-b.count)[0];
};

/** Original complete practice questions. Source links identify unaudited OCR inspirations only. */
export function makeBatch7Early(part:string,seed:number,index=0):Question{
 if(!BATCH7_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown batch7 early configuration: ${part}`);
 const r=new Rng(hashString(`batch7-early-original-v1:${part}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:Step[],extra:Partial<Question>={}):Question=>({key:`batch7-early-${part}:${seed}:${index}`,prompt,answer:String(answer),context,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra});
 const numberChoices=(answer:number)=>r.shuffle([answer,answer-1,answer+1,answer+2].map(String));
 if(part==='race-first'){
  const [a,b,c,d]=r.shuffle(['Nila','Omar','Hana','Ravi','Mei','Zoya','Finn','Ari']).slice(0,4);
  return make('Who is first in the race?',a,[`Four children are running a race. No one is tied.`,`${a} is ahead of ${b}. ${c} is behind ${b}. ${d} is last.`],
   'Use each clue to place the children from first to last.',[['The first two clues put three runners in order.',`${a} → ${b} → ${c}`],['Put the last runner after them.',`${a} → ${b} → ${c} → ${d}`]],{choices:r.shuffle([a,b,c,d])});
 }
 if(part==='queue-total'){
  const before=r.int(2,5),between=r.int(1,3),total=before+between+2;
  return make('How many children are in the queue?',total,[`There are ${before} children in front of Nila. There are ${between} children between Nila and Omar. Omar is behind Nila and is last.`],
   'Count Nila and Omar as well as the children before and between them.',[['Count everyone up to Nila.',`${before} + 1 = ${before+1}`],['Include the children between them and Omar.',`${before+1} + ${between} + 1 = ${total}`]],{unit:'children',choices:numberChoices(total)});
 }
 if(part==='transfer-equal'){
  const smaller=r.int(3,9),moved=r.int(1,4),larger=smaller+2*moved,equal=smaller+moved;
  return make('How many toy cars must Zoya give Finn so they have the same number?',moved,[`Zoya has ${larger} toy cars. Finn has ${smaller} toy cars.`],
   'Each car moved makes one collection smaller and the other larger.',[['Find the difference.',`${larger} − ${smaller} = ${2*moved}`],['Move half the difference and check both collections.',`${larger} − ${moved} = ${equal}; ${smaller} + ${moved} = ${equal}`]],{unit:'toy cars'});
 }
 if(part==='fewest-notes'){
  const amount=r.pick([13,14,16,18,19,21,22,23,24,26,27,28,29,31,32,33,34,36,37,38,39]),plan=notePayments(amount),pieces=([[plan.tens,10],[plan.fives,5],[plan.twos,2]] as const).filter(([count])=>count>0);
  return make(`What is the fewest number of notes needed to pay exactly $${amount}?`,plan.count,['Use only $2, $5 and $10 notes. You may use as many of each note as you need.'],
   'Try larger notes first, but check that the remaining dollars can be made exactly.',[['An exact payment using the fewest notes is:',pieces.map(([count,value])=>`${count} × $${value}`).join(' + ')+` = $${amount}`],['Count the notes in this payment.',pieces.map(([count])=>count).join(' + ')+` = ${plan.count} notes`]],{unit:'notes'});
 }
 if(part==='digit-riddle'){
  const tens=r.int(2,5),difference=r.int(1,3),ones=tens+difference,sum=tens+ones;
  return make('What is my two-digit number?',10*tens+ones,[`The sum of my two digits is ${sum}. My ones digit is ${difference} more than my tens digit.`],
   'Remove the extra ones from the digit sum. The two parts are then equal.',[['Find the tens digit.',`(${sum} − ${difference}) ÷ 2 = ${tens}`],['Find the ones digit and build the number.',`${tens} + ${difference} = ${ones}; ${tens} tens and ${ones} ones make ${10*tens+ones}`]]);
 }
 if(part==='animal-legs'){
  const cows=r.int(1,4),ducks=r.pick([1,2,4,5]),answer=4*cows+2*ducks;
  return make('How many legs do the animals have altogether?',answer,[`There are ${cows} cows and ${ducks} ducks. Each cow has 4 legs. Each duck has 2 legs.`],
   'Count the legs of each kind of animal, then join the two totals.',[['Count the cows’ legs.',`${cows} × 4 = ${4*cows}`],['Count the ducks’ legs.',`${ducks} × 2 = ${2*ducks}`],['Combine both totals.',`${4*cows} + ${2*ducks} = ${answer}`]],{unit:'legs'});
 }
 if(part==='alternating-pattern'){
  const first=r.int(110,780),up=r.pick([3,5,6]),down=r.pick([1,2]),values=[first];
  for(let i=1;i<7;i++)values.push(values.at(-1)!+(i%2?up:-down));
  return make('What is the missing number in this alternating pattern?',values[4],[],
   'The pattern uses a forward step, then a backward step, again and again.',[['Find the two alternating changes.',`Add ${up}, then subtract ${down}.`],['Use the backward step at the gap.',`${values[3]} − ${down} = ${values[4]}`]],{display:values.map((n,i)=>i===4?'?':String(n)).join(', ')});
 }
 if(part==='purchase-bonus'){
  const per=r.pick([2,4,5]),bonus=r.pick([2,3]),groups=r.int(2,8),bought=per*groups,answer=groups*bonus;
  return make('How many free pencils does Hana receive?',answer,[`For every ${per} notebooks bought, a shop gives ${bonus} free pencils. Hana buys ${bought} notebooks.`],
   'Find how many complete offer groups she buys. Count the free pencils for all those groups.',[['Find the number of offer groups.',`${bought} ÷ ${per} = ${groups}`],['Count all the free pencils.',`${groups} × ${bonus} = ${answer}`]],{unit:'pencils'});
 }
 if(part==='equal-after-giving'){
  const remaining=r.int(25,190),given=r.int(15,180),start=remaining+given,answer=remaining+remaining;
  return make('How many marbles do Ishan and Mei have altogether now?',answer,[`Ishan has ${start} marbles. He gives ${given} marbles to a charity. He then has the same number of marbles as Mei.`],
   'Find Ishan’s remaining marbles. Mei has that same number.',[['Find how many Ishan has left.',`${start} − ${given} = ${remaining}`],['Combine the two equal amounts.',`${remaining} + ${remaining} = ${answer}`]],{unit:'marbles'});
 }
 if(part==='repack-share'){
  const options:{boxes:number;size:number;friends:number}[]=[];
  for(let boxes=2;boxes<=9;boxes++)for(const size of [2,3,4,5])for(const friends of [2,3,4,5,10])if(boxes!==friends&&boxes*size%friends===0)options.push({boxes,size,friends});
  const {boxes,size,friends}=r.pick(options),total=boxes*size,answer=total/friends;
  return make('How many toys does each child receive?',answer,[`There are ${boxes} boxes with ${size} toys in each box. All the toys are shared equally among ${friends} children.`],
   'Count the toys in all the boxes before sharing them.',[['Find the total number of toys.',`${boxes} × ${size} = ${total}`],['Share all the toys equally.',`${total} ÷ ${friends} = ${answer}`]],{unit:'toys'});
 }
 if(part==='fraction-given-away'){
  const parts=r.pick([3,4,5,6,8,9,12]),left=r.int(1,parts-1),given=parts-left;
  return make('What fraction of the whole cake was given away?',`${given}/${parts}`,[`A cake is cut into ${parts} equal pieces. Some pieces are given away and ${left} pieces are left.`],
   'Find the pieces given away. Keep the original number of equal pieces as the denominator.',[['Find how many pieces were given away.',`${parts} − ${left} = ${given}`],['Express these pieces as a fraction of the original cake.',`${given} out of ${parts} equal pieces = ${given}/${parts}`]]);
 }
 const finish=r.int(9,11)*60+r.int(0,59),duration=r.pick([25,35,45]),start=finish-duration;
 return make('What time did Noor start reading?',clock(start),[`The clock shows when Noor finishes reading in the morning. She reads for ${duration} minutes.`],
  'Read the finish time, then count backwards by the reading time.',[['Read the finish time.',clock(finish)],['Count backwards to the start.',`${clock(finish)} − ${duration} minutes = ${clock(start)}`]],{picture:{type:'clock',minutes:finish},choices:r.shuffle([clock(start),clock(start-10),clock(start+10),clock(finish)])});
}
