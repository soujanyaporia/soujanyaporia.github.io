import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p4-candidate-multiples-divisibility-selection',
 level:4,
 title:'Pick the numbers that divide exactly',
 objective:'Test candidate numbers for exact divisibility by a given or calculated factor, then choose or list the matches.',
 skillIds:['P4.S.FACT.03','P4.S.FACT.01'],
 canonicalPatternId:'p4-candidate-multiples-divisibility-selection',
};

/** Numbers close to a multiple of k, none of which is itself a multiple (k is at least 3). */
function nearMisses(r:Rng,correct:number,k:number):number[]{
 const pool=[1,-1,2,-2,k+1,-(k+1)].map(d=>correct+d).filter(n=>n>9&&n%k!==0);
 return r.shuffle([...new Set(pool)]).slice(0,3);
}

const remainderText=(n:number,k:number)=>n%k===0?`${n} ÷ ${k} = ${n/k}, exact`:`${n} ÷ ${k} leaves remainder ${n%k}`;

function singleChoice(r:Rng,key:string,expression:boolean):Question{
 const b=r.int(4,9),k=r.int(3,9),a=b*k;
 const correct=k*r.int(Math.ceil(100/k),Math.floor(999/k));
 const choices=r.shuffle([correct,...nearMisses(r,correct,k)]).map(String);
 const prompt=expression?`Which one of these numbers is a multiple of ${a} ÷ ${b}?`:`Which one of these numbers has ${k} as a factor?`;
 return {
  key,prompt,answer:String(correct),choices,
  hint:expression?'Work out the division first. Then test each choice for an exact division by that value.':'A number with this factor divides by it with no remainder.',
  workedSteps:[
   expression?{text:'Work out the number inside the expression first.',equation:`${a} ÷ ${b} = ${k}`}:{text:'The number to test is the given factor.',equation:`Factor = ${k}`},
   {text:'Divide each choice by it. Only an exact division leaves no remainder.',equation:choices.map(c=>remainderText(Number(c),k)).join('; ')},
   {text:'Choose the number with no remainder.',equation:`${correct} ÷ ${k} = ${correct/k}`},
  ],
  explanation:`${expression?`${a} ÷ ${b} = ${k}. `:''}${correct} ÷ ${k} = ${correct/k} with no remainder, so ${correct} is the only choice that works.`,
 };
}

function listQuestion(r:Rng,key:string):Question{
 const k=r.pick([3,4,6,7,8,9]);
 const multiples=Array.from({length:Math.floor(99/k)-1},(_,i)=>(i+2)*k).filter(n=>n>=10);
 const count=r.int(3,4);
 const matches=r.shuffle(multiples).slice(0,count).sort((x,y)=>x-y);
 const near=matches.flatMap(m=>[m-1,m+1]).filter(n=>n>=10&&n<=99&&n%k!==0);
 const first=r.pick(near);
 const rest=r.shuffle(Array.from({length:90},(_,i)=>i+10).filter(n=>n%k!==0&&n!==first)).slice(0,6-count);
 const numbers=[...matches,first,...rest].sort((x,y)=>x-y);
 return {
  key,
  prompt:`Which of these numbers have ${k} as a factor? Type the matching numbers from smallest to greatest, one in each box.`,
  context:[`Exactly ${count} of the numbers are correct.`],
  display:numbers.join(', '),
  answer:JSON.stringify(matches.map(String)),
  structuredResponse:{kind:'number-fields',fields:matches.map((_,i)=>({label:`Number ${i+1}`}))},
  hint:`Divide each number by ${k}. Keep only the numbers with no remainder.`,
  workedSteps:[
   {text:`Divide every number by ${k}.`,equation:numbers.map(n=>remainderText(n,k)).join('; ')},
   {text:'Keep the exact divisions, in order from smallest to greatest.',equation:matches.join(', ')},
  ],
  explanation:`The numbers that divide exactly by ${k} are ${matches.join(', ')}.`,
 };
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`ragP4CandidateMultiples:${seed}:${index}`));
 const key=`ragP4CandidateMultiples:${seed}:${index}`;
 const variant=(((Math.trunc(seed)+Math.trunc(index))%3)+3)%3;
 return variant===0?singleChoice(r,key,false):variant===1?singleChoice(r,key,true):listQuestion(r,key);
}
