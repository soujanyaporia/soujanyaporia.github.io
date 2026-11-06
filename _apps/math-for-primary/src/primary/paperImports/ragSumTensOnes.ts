import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id:'p1s-rag-sum-tens-ones',
 level:1,
 title:'Write a sum as tens and ones',
 objective:'Add within 100 with regrouping, then report the tens and ones of the sum.',
 skillIds:['P1.S.WN.02','P1.S.AS.05'],
 canonicalPatternId:'p1-sum-in-tens-and-ones',
};

/**
 * Four deterministic variants, all with sums below 100 where the ones make ten or more:
 * 0 two-digit + one-digit, 1 one-digit + two-digit, 2 two-digit + two-digit, 3 ones make exactly ten.
 */
export function makeRagQuestion(seed:number,index=0):Question{
 const s=Math.trunc(seed)||0,i=Math.trunc(index)||0;
 const variant=(((s+i)%4)+4)%4;
 const r=new Rng(hashString(`p1-sum-in-tens-and-ones:${s}:${i}`));
 let first:number,second:number;
 if(variant===2){
  const t1=r.int(1,7),t2=r.int(1,8-t1),o1=r.int(2,9),o2=r.int(10-o1,9);
  first=10*t1+o1;second=10*t2+o2;
 } else {
  const t=r.int(1,8),o=r.int(2,9),small=variant===3?10-o:r.int(10-o,9),big=10*t+o;
  if(variant===1){first=small;second=big;}else{first=big;second=small;}
 }
 const sum=first+second,tens=Math.floor(sum/10),ones=sum%10;
 const onesFirst=first%10,onesSecond=second%10,onesTotal=onesFirst+onesSecond;
 const tensFirst=Math.floor(first/10),tensSecond=Math.floor(second/10);
 return {
  key:`p1-sum-tens-ones:${s}:${i}`,
  prompt:`Add ${first} and ${second}. How many tens and how many ones make the sum?`,
  display:`${first} + ${second}`,
  context:['Write one number in each box: first the tens, then the ones.'],
  answer:JSON.stringify([String(tens),String(ones)]),
  structuredResponse:{kind:'number-fields',fields:[{label:'Tens'},{label:'Ones'}]},
  hint:'Add the ones first. If you get ten or more ones, swap ten ones for one new ten.',
  explanation:`${first} + ${second} = ${sum}. The sum is ${tens} tens and ${ones} ones.`,
  workedSteps:[
   {text:'Add the ones of the two numbers.',equation:`${onesFirst} + ${onesSecond} = ${onesTotal}`},
   {text:'Ten ones make one new ten. Keep the leftover ones.',equation:`${onesTotal} ones = 1 ten and ${onesTotal-10} ones`},
   {text:'Add the tens, including the new ten.',equation:`${tensFirst} tens + ${tensSecond} tens + 1 ten = ${tens} tens`},
   {text:'Write the sum as tens and ones.',equation:`${first} + ${second} = ${sum} = ${tens} tens ${ones} ones`},
  ],
 };
}
