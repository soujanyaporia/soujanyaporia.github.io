import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'equal-changes-preserve-difference',
 level:5,
 title:'Equal changes keep the difference',
 objective:'Use an unchanged difference and a final ratio to find the common change or a final quantity',
 skillIds:['P3.S.AS.01','P4.S.MD.03'],
 canonicalPatternId:'p5-equal-changes-preserve-difference',
};

type Step=[string,string];

/** Three variants share one idea: an equal change leaves the difference unchanged. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-equal-change-difference-v1:${seed}:${index}`));
 const variant=(((seed+index)%3)+3)%3;
 const key=`rag-equal-change-difference:${seed}:${index}`;
 const finish=(context:string[],prompt:string,answer:number,unit:string,hint:string,steps:Step[]):Question=>({
  key,context,prompt,answer:String(answer),unit,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),
  explanation:steps.map(([text,equation])=>`${text} ${equation}.`).join(' '),
 });
 const k=r.int(2,6);
 if(variant===0){
  const thing=r.pick(['pens','cards','beads','stickers']);
  const small=r.int(6,50),removed=r.int(5,80);
  let third=r.int(3,120);
  while(third===small||third===k*small)third=r.int(3,120);
  const startSmall=small+removed,startLarge=k*small+removed,startThird=third+removed;
  const [labelSmall,labelLarge,labelThird]=r.shuffle(['A','B','C']);
  const start:Record<string,number>={[labelSmall]:startSmall,[labelLarge]:startLarge,[labelThird]:startThird};
  const diff=startLarge-startSmall;
  return finish(
   ['A','B','C'].map(l=>`Box ${l} had ${start[l]} ${thing}.`).concat([
    `The same number of ${thing} were taken out of each box.`,
    `Then Box ${labelLarge} had ${k} times as many ${thing} as Box ${labelSmall}.`,
   ]),
   `How many ${thing} were left in Box ${labelThird}?`,
   third,thing,
   'Taking out the same number from two boxes does not change the difference between them.',
   [
    ['Find the difference between the two boxes in the ratio.',`${startLarge} − ${startSmall} = ${diff}`],
    [`At the end that difference is ${k-1} equal units, so find the smaller box at the end.`,`${diff} ÷ ${k-1} = ${small}`],
    ['Find how many were taken out of each box.',`${startSmall} − ${small} = ${removed}`],
    ['Take the same number out of the third box.',`${startThird} − ${removed} = ${third}`],
   ],
  );
 }
 const thing=r.pick(['marbles','stickers','stamps']);
 const [a,b]=r.shuffle(['Mira','Noah','Ken','Priya','Zara','Omar']);
 const startSmall=r.int(20,120),gift=r.int(5,60),endSmall=startSmall+gift,startLarge=k*endSmall-gift,diff=startLarge-startSmall;
 const context=[
  `${a} had ${startSmall} ${thing} and ${b} had ${startLarge} ${thing}.`,
  `Their father gave each child the same number of ${thing}.`,
  `Then ${b} had ${k} times as many ${thing} as ${a}.`,
 ];
 const common:Step[]=[
  ['Both children received the same amount, so the difference stays the same.',`${startLarge} − ${startSmall} = ${diff}`],
  [`At the end the difference is ${k-1} equal units, so find the smaller amount at the end.`,`${diff} ÷ ${k-1} = ${endSmall}`],
 ];
 if(variant===1)return finish(context,`How many ${thing} did each child receive from their father?`,gift,thing,
  'The difference between the two amounts does not change when each gets the same number more.',
  [...common,['Subtract what the smaller amount was at the start.',`${endSmall} − ${startSmall} = ${gift}`]]);
 return finish(context,`How many ${thing} did the two children have altogether in the end?`,(k+1)*endSmall,thing,
  'Find the smaller final amount first. Then count all the equal units.',
  [...common,[`Together they have ${k+1} units at the end.`,`${k} + 1 = ${k+1}, and ${k+1} × ${endSmall} = ${(k+1)*endSmall}`]]);
}
