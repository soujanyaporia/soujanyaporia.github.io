import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';

/** Original money word problems: a difference and a multiple fix two amounts. */
export const RAG_PATTERN={
 id:'p3-money-difference-multiple-two-amounts',
 level:3,
 title:'Find money from a difference and a multiple',
 objective:'Use the number of extra equal parts to share a money difference, then rebuild a starting amount or a combined total.',
 skillIds:['P3.S.AS.01','P3.S.MD.04','P3.S.MONEY.01'],
 canonicalPatternId:'p3-money-difference-multiple-two-amounts',
};

const NAMES=['Rui','Shan','Mei','Ravi','Aisha','Ben','Chen','Devi','Farah','Jun'];
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const [first,second]=r.shuffle(NAMES).slice(0,2);
 const m=r.pick([3,4,5]);
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const finish=(q:Omit<Question,'key'|'explanation'|'unit'> & {workedSteps:{text:string;equation?:string}[]}):Question=>({
  key,unit:'dollars',...q,
  explanation:q.workedSteps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
 });
 if(r.int(0,1)===0){
  let part=r.int(12,60);if(m===4&&part===49)part++;
  const spent=(m-1)*part,start=m*part;
  return finish({
   prompt:`How much money did ${first} have at first?`,
   context:[`${first} and ${second} had the same amount of money each.`,`${first} spent $${spent}. After that, ${second} had ${m} times as much money as ${first} had left.`],
   answer:String(start),
   hint:`${first}'s money left is 1 equal part and ${second}'s money is ${m} equal parts. What does the $${spent} spent match?`,
   proof:op('+',op('/',spent,m-1),spent),
   workedSteps:[
    {text:`${second}'s money is ${m} parts. ${first}'s money left is 1 part. The amount spent is the difference between them.`,equation:`${m} − 1 = ${m-1} parts`},
    {text:`Share the amount spent equally to find one part, which is ${first}'s money left.`,equation:`$${spent} ÷ ${m-1} = $${part}`},
    {text:`Add the amount spent back to find ${first}'s money at first.`,equation:`$${part} + $${spent} = $${start}`},
    {text:`Check: they began with equal amounts, and ${second} has ${m} × $${part}.`,equation:`${m} × $${part} = $${start}`},
   ],
  });
 }
 let part=r.int(6,48);if(m===4&&part===12)part++;
 const diff=(m-1)*part,big=m*part,total=big+part;
 return finish({
  prompt:'How much money do they have altogether?',
  context:[`${first} has ${m} times as much money as ${second}.`,`${second} has $${diff} less than ${first}.`],
  answer:String(total),
  hint:`Draw ${second}'s money as 1 part. ${first}'s money is ${m} parts. How many parts is the difference?`,
  proof:op('*',op('/',diff,m-1),m+1),
  workedSteps:[
   {text:`${second} has 1 part and ${first} has ${m} parts. The difference is the extra parts.`,equation:`${m} − 1 = ${m-1} parts`},
   {text:`Share the difference equally to find one part, which is ${second}'s money.`,equation:`$${diff} ÷ ${m-1} = $${part}`},
   {text:`${first} has ${m} parts.`,equation:`${m} × $${part} = $${big}`},
   {text:'Add both amounts.',equation:`$${part} + $${big} = $${total}`},
   {text:'Check the difference.',equation:`$${big} − $${part} = $${diff}`},
  ],
 });
}
