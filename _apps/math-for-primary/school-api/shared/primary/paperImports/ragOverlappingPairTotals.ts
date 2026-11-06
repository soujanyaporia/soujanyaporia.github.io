import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={id:'p6-overlapping-pair-totals',level:6,title:'Overlapping pair totals',objective:'Turn pair averages and pair totals into sums, then use the shared quantity to find an unknown amount.',skillIds:['P6.S.AVG.02','P6.S.ALG.01'],canonicalPatternId:'p6-overlapping-pair-totals'};

type Step=[string,string];

/** Four original variants. Every given needed to solve the question is visible in the context. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-overlap-pair-totals:${seed}:${index}`));
 const variant=(((Math.trunc(seed)+index)%4)+4)%4;
 const key=`rag-p6-overlapping-pair-totals:${seed}:${index}`;
 const build=(context:string[],prompt:string,answer:number,unit:string,hint:string,steps:Step[]):Question=>({
  key,context,prompt,answer:String(answer),unit,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),
  explanation:steps.map(([text,equation])=>`${text} ${equation}`).join(' '),
 });

 if(variant===0){
  const x=r.int(5,20),k=r.pick([3,4,5]);
  let y=r.int(6,40);while((x+y+k*x)%3!==0)y++;
  const z=k*x,mean=(x+y+z)/3;
  return build(
   [`The total mass of boxes P and Q is ${x+y} kg.`,`The total mass of boxes Q and R is ${y+z} kg.`,`Box R is ${k} times as heavy as Box P.`],
   'Find the average mass of the 3 boxes.',mean,'kg',
   'Subtract the two pair totals. The box in both pairs cancels.',
   [
    ['Subtract the two pair totals. Box Q is in both pairs, so it cancels.',`${y+z} − ${x+y} = ${z-x} kg`],
    [`Box R is ${k} times Box P, so this difference is ${k-1} units of Box P.`,`${z-x} ÷ ${k-1} = ${x} kg`],
    ['Use the first pair total to find Box Q.',`${x+y} − ${x} = ${y} kg`],
    ['Add the three masses, then divide by 3 for the average.',`(${x} + ${y} + ${z}) ÷ 3 = ${mean} kg`],
   ],
  );
 }

 if(variant===1){
  const w=2*r.int(10,80),k=r.pick([3,4,5,6]),j=2*r.int(10,100),o=k*w,a1=(j+o)/2,a2=(j+w)/2;
  return build(
   [`The average number of stickers Lin and Omar had was ${a1}.`,`The average number of stickers Lin and Pia had was ${a2}.`,`Omar's number is ${k} times Pia's number.`],
   'How many stickers did Omar and Pia have altogether?',o+w,'stickers',
   'Change each average into a pair total first. Then subtract so that Lin cancels.',
   [
    ['Change each average into a pair total by multiplying by 2.',`${a1} × 2 = ${2*a1} and ${a2} × 2 = ${2*a2}`],
    ['Subtract the pair totals. Lin is in both pairs, so the difference is Omar − Pia.',`${2*a1} − ${2*a2} = ${o-w}`],
    [`Omar has ${k} times Pia's number, so the difference is ${k-1} units. Find Pia's number.`,`${o-w} ÷ ${k-1} = ${w}`],
    ['Find Omar\'s number, then add Pia\'s number.',`${k} × ${w} = ${o}, so ${o} + ${w} = ${o+w}`],
   ],
  );
 }

 if(variant===2){
  const names=['Ann','Ben','Cara','Dev','Eli'];
  let v:number[]=[];
  do{
   const base=[0,1,2,3].map(()=>r.int(8,60)),sum=base.reduce((s,n)=>s+n,0);
   const options=Array.from({length:53},(_,i)=>i+8).filter(e=>(sum+e)%5===0&&new Set([...base,e]).size===5);
   v=options.length?[...base,r.pick(options)]:[];
  }while(!v.length);
  const sum=v.reduce((s,n)=>s+n,0),avg=sum/5,ab=v[0]+v[1],cd=v[2]+v[3],e=v[4],d=v[3];
  const rows=[0,1,2,3].map(i=>`${names[i]} and ${names[i+1]}: ${v[i]+v[i+1]} stickers`);
  return build(
   ['Five children each have a different number of stickers. The list shows the total for each pair.',...rows,`The average number of stickers for the five children is ${avg}.`],
   'How many stickers does Dev have?',d,'stickers',
   'Find the total for all five children. Which child is not in the pairs Ann and Ben, and Cara and Dev?',
   [
    ['Use the average to find the total number of stickers for all five children.',`${avg} × 5 = ${sum}`],
    ['Add the pair totals for Ann and Ben, and for Cara and Dev. Only Eli is left out.',`${ab} + ${cd} = ${ab+cd}`],
    ['Subtract from the overall total to find Eli.',`${sum} − ${ab+cd} = ${e}`],
    ['Dev and Eli together are given. Take away Eli to find Dev.',`${v[3]+v[4]} − ${e} = ${d}`],
   ],
  );
 }

 const par=r.int(0,1),c=2*r.int(5,30)+par,a=c+2*r.int(2,25),b=2*r.int(5,60)+par,p=(a+b)/2,q=(b+c)/2;
 return build(
  [`The average number of stickers Ann and Ben have is ${p}.`,`The average number of stickers Ben and Cara have is ${q}.`],
  'How many more stickers does Ann have than Cara?',a-c,'stickers',
  'Change each average into a pair total. Ben is in both pairs, so subtracting removes Ben.',
  [
   ['Find the total for Ann and Ben by doubling their average.',`${p} × 2 = ${a+b}`],
   ['Find the total for Ben and Cara by doubling their average.',`${q} × 2 = ${b+c}`],
   ['Subtract the totals. Ben cancels, so the difference is Ann − Cara.',`${a+b} − ${b+c} = ${a-c}`],
  ],
 );
}
