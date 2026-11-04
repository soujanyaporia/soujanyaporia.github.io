import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import {BATCH3_EARLY_PARTS,type Batch3EarlyPart} from './batch3EarlyMeta';
export {BATCH3_EARLY_PARTS,type Batch3EarlyPart} from './batch3EarlyMeta';
export type Batch3EarlyQuestion=Question&{workedSteps:NonNullable<Question['workedSteps']>};
type Step=[text:string,equation?:string];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;

/** Existing representations/controls; the variants specify the missing range, direction or response. */
export function makeBatch3Early(part:Batch3EarlyPart,seed:number,index=0):Batch3EarlyQuestion{
 if(!BATCH3_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown early configuration: ${part}`);
 const r=new Rng(hashString(`early-batch3-v1:${part}:${seed}:${index}`));
 const make=(prompt:string,answer:number|string,context:string[],hint:string,steps:Step[],extra:Partial<Batch3EarlyQuestion>={}):Batch3EarlyQuestion=>({
  key:`batch3-early-${part}:${seed}:${index}`,prompt,answer:String(answer),context,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra,
 });
 if(part==='increasing-gap'){
  const step=r.int(2,9),start=r.int(110,900-step*5),gap=r.pick([2,3,4]),values=Array.from({length:6},(_,i)=>start+i*step);
  const picture:Picture={type:'pattern',items:values.map((value,i)=>i===gap?'?':String(value))};
  return make('What number belongs in the empty box?',values[gap],['The same number is added at every step.'],
   'Find the change between two neighbouring known numbers. Use that change at the empty box.',
   [['Find one step.',`${values[1]} − ${values[0]} = ${step}`],
    ['Add the step to the number just before the gap.',`${values[gap-1]} + ${step} = ${values[gap]}`],
    ['Check the next step.',`${values[gap]} + ${step} = ${values[gap+1]}`]],{picture});
 }
 if(part==='three-card-subtraction'){
  const aDigits=[r.int(1,4),r.int(1,4),r.int(1,4)],bDigits=aDigits.map(d=>r.int(1,9-d));
  const a=Number(aDigits.join(''));let b=Number(bDigits.join(''));
  if(a===b){bDigits[2]=bDigits[2]===1?2:1;b=Number(bDigits.join(''));}
  const whole=a+b,values=r.shuffle([whole,a,b]),sentence=`${whole} - ${a} = ${b}`;
  return make('Use all three number cards to write a true subtraction equation.',sentence,
   ['Use each card exactly once.'],'Find the largest number. The other two cards are its parts.',
   [['Check which two cards join to make the whole.',`${a} + ${b} = ${whole}`],
    ['Subtract either part from the whole.',`${whole} − ${a} = ${b}`],
    ['The other related subtraction is also correct.',`${whole} − ${b} = ${a}`]],
   {picture:{type:'pattern',items:values.map(String)},numberSentence:{numbers:values,operation:'-'}});
 }
 if(part==='order-related-fractions'){
  const denominators=r.shuffle([3,4,6,12]).slice(0,3),fractions=denominators.map(d=>({n:r.pick(Array.from({length:d-1},(_,i)=>i+1).filter(n=>gcd(n,d)===1)),d}));
  if(fractions.map(f=>`${f.n}/${f.d}`).sort().join(',')==='2/3,3/4,7/12')fractions.find(f=>f.d===12)!.n=5;
  const shown=r.shuffle(fractions),ordered=[...fractions].sort((a,b)=>a.n/a.d-b.n/b.d),labels=shown.map(f=>`${f.n}/${f.d}`),answer=ordered.map(f=>`${f.n}/${f.d}`).join(',');
  return make('Arrange the fractions from smallest to greatest.',answer,
   ['Use every fraction once. Keep each fraction as it is written.'],
   'Make equivalent fractions with denominator 12, then compare their numerators.',
   [['Express all three amounts in twelfths.',shown.map(f=>`${f.n}/${f.d} = ${f.n*12/f.d}/12`).join('; ')],
    ['Order the values, then use the original fraction cards.',ordered.map(f=>`${f.n}/${f.d}`).join(' < ')]],
   {picture:{type:'pattern',items:labels},order:labels});
 }
 const divisor=r.pick([4,5,6,7,8,9]),quotient=r.int(8,65),remainder=r.int(1,divisor-1),dividend=divisor*quotient+remainder;
 return make('What starting number belongs in the empty box?',dividend,
  ['The division leaves the quotient and remainder shown.'],
  'Rebuild the complete groups first. Then put back the objects left over.',
  [['Find how many objects are in the complete groups.',`${divisor} × ${quotient} = ${divisor*quotient}`],
   ['Add the remainder to recover the starting number.',`${divisor*quotient} + ${remainder} = ${dividend}`],
   ['Check the remainder is smaller than one complete group.',`${remainder} < ${divisor}`]],
  {display:`□ ÷ ${divisor} = ${quotient} remainder ${remainder}`});
}

export function makeBatch3EarlySet(seed:number,index=0){return BATCH3_EARLY_PARTS.map(pattern=>({pattern,question:makeBatch3Early(pattern.id,seed,index)}));}
