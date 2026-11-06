import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';

export const RAG_PATTERN={
 id:'p1-extremes-sum-and-range',
 level:1,
 title:'Calculate with the greatest and smallest numbers',
 objective:'Find the greatest and smallest numbers in a set, then add them or find how much greater the largest is than the smallest.',
 skillIds:['P1.S.WN.04','P1.S.AS.05','P1.S.AS.02'],
 canonicalPatternId:'p1-calculate-with-the-extremes',
};

function distinctNumbers(r:Rng,count:number,low:number,high:number,minSpread:number):number[]{
 for(let attempt=0;attempt<500;attempt++){
  const set=new Set<number>();
  while(set.size<count)set.add(r.int(low,high));
  const values=[...set];
  if(Math.max(...values)-Math.min(...values)>=minSpread)return r.shuffle(values);
 }
 // Deterministic fallback with a wide spread.
 return r.shuffle([low,high,...Array.from({length:count-2},(_,i)=>low+2+i)]);
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p1-extremes:${seed}:${index}`));
 const key=`rag-p1-extremes:${seed}:${index}`;
 const sumVariant=(Math.abs(Math.trunc(seed))+index)%2===0;
 const values=sumVariant?distinctNumbers(r,r.int(5,6),1,20,8):distinctNumbers(r,4,10,99,20);
 const greatest=Math.max(...values),smallest=Math.min(...values);
 const picture={type:'pattern' as const,items:values.map(String)};
 if(sumVariant){
  const total=greatest+smallest;
  const proof:Proof={op:'+',a:greatest,b:smallest};
  return {
   key,
   prompt:'Look at the number cards. Add the greatest number and the smallest number. What is the total?',
   answer:String(total),
   picture,
   proof,
   hint:'Find the biggest number and the smallest number first. Then add just those two.',
   workedSteps:[
    {text:'Find the greatest number.',equation:`Greatest: ${greatest}`,picture},
    {text:'Find the smallest number.',equation:`Smallest: ${smallest}`,picture},
    {text:'Add the two numbers.',equation:`${greatest} + ${smallest} = ${total}`},
   ],
   explanation:`The greatest number is ${greatest} and the smallest number is ${smallest}. ${greatest} + ${smallest} = ${total}.`,
  };
 }
 const difference=greatest-smallest;
 const proof:Proof={op:'-',a:greatest,b:smallest};
 return {
  key,
  prompt:'Look at the number cards. How much bigger is the greatest number than the smallest number?',
  answer:String(difference),
  picture,
  proof,
  hint:'Find the biggest number and the smallest number first. Then subtract the smallest from the greatest.',
  workedSteps:[
   {text:'Find the greatest number.',equation:`Greatest: ${greatest}`,picture},
   {text:'Find the smallest number.',equation:`Smallest: ${smallest}`,picture},
   {text:'Subtract the smallest from the greatest.',equation:`${greatest} − ${smallest} = ${difference}`},
  ],
  explanation:`The greatest number is ${greatest} and the smallest number is ${smallest}. ${greatest} − ${smallest} = ${difference}.`,
 };
}
