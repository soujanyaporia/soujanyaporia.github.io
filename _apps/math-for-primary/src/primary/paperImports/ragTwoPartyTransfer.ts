import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';

export const RAG_PATTERN={
 id:'p6-two-party-transfer-comparison',
 level:6,
 title:'Fraction transfer between two people',
 objective:'Use a fractional transfer with the before and after comparisons to find an original amount',
 skillIds:['P4.S.FRAC.03','P6.S.RATIO.05'],
 canonicalPatternId:'p6-two-party-fraction-transfer-comparison',
};

const op=(o:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:o,a,b});
const NAMES:[string,string][]=[['Mia','Noel'],['Farah','Ethan'],['Priya','Jun'],['Hana','Leon'],['Zara','Kai'],['Ravi','Tessa'],['Wei','Alma']];
const ITEMS=['stickers','marbles','cards','beads','stamps'];
type Step={text:string;equation?:string};
const mod3=(n:number)=>((Math.trunc(n)%3)+3)%3;

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`${RAG_PATTERN.id}:${seed}:${index}`,r=new Rng(hashString(key));
 const variant=mod3(mod3(seed)+mod3(index));
 const [first,second]=r.pick(NAMES);
 const item=r.pick(ITEMS);
 const finish=(prompt:string,answer:number,unit:string,hint:string,steps:Step[],proof:Proof):Question=>({key,prompt,answer:String(answer),unit,hint,workedSteps:steps,explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),proof});

 if(variant===0){
  // The smaller holder starts d behind and ends e ahead after the larger holder gives 1/k.
  const k=r.pick([3,4,5,6]),t=r.int(8,45),d=r.int(5,2*t-5),e=2*t-d,x=k*t;
  return finish(
   `${first} and ${second} had some ${item}. ${first} had ${d} fewer ${item} than ${second}. After ${second} gave 1/${k} of ${second}'s ${item} to ${first}, ${first} had ${e} more ${item} than ${second}. How many ${item} did ${second} have at first?`,
   x,item,
   'One person loses what the other gains. Think about how much the gap between them changes.',
   [
    {text:`The gap went from ${d} behind to ${e} ahead, so it changed by both amounts together. That change is two transfers.`,equation:`${d} + ${e} = ${2*t}`},
    {text:'Half of that change is one transfer.',equation:`${2*t} ÷ 2 = ${t}`},
    {text:`The transfer is 1/${k} of ${second}'s ${item}, so ${second} started with ${k} times as many.`,equation:`${k} × ${t} = ${x}`}
   ],
   op('*',op('/',op('+',d,e),2),k));
 }
 if(variant===1){
  // The giver starts D ahead and gives m/k of the money so that both are equal.
  const [m,k]=r.pick([[1,3],[1,4],[1,5],[2,5],[2,7],[2,9],[3,8],[3,10]]),u=r.int(5,40),D=2*m*u,t=m*u,a=k*u,b=a-D;
  return finish(
   `${first} had $${D} more than ${second}. After ${first} gave ${m}/${k} of ${first}'s money to ${second}, they had the same amount of money. How much money did ${second} have at first?`,
   b,'dollars',
   'When they end equal, the transfer closed the gap from both sides. How much of the gap does one transfer close?',
   [
    {text:'Giving money lowers one amount and raises the other by the same transfer, so the gap is two transfers.',equation:`$${D} ÷ 2 = $${t}`},
    {text:`The transfer is ${m}/${k} of ${first}'s money. Find one part, then all ${k} parts.`,equation:`$${t} ÷ ${m} × ${k} = $${a}`},
    {text:`${second} had $${D} less than ${first}.`,equation:`$${a} − $${D} = $${b}`}
   ],
   op('-',op('*',op('/',op('/',D,2),m),k),D));
 }
 // variant 2: two transfers, with a ratio in between and a final equality.
 const [k,rr]=r.pick([[3,3],[5,2],[4,2],[3,4],[5,3],[6,2]]);
 const choices=Array.from({length:14},(_,i)=>i+2).filter(u=>((rr-1)*(k-1)*u)%2===0);
 const u=r.pick(choices),g=(rr-1)*(k-1)*u/2,seconds=(rr*(k-1)-1)*u;
 return finish(
  `${first} and ${second} each had some ${item} at first. After ${first} gave 1/${k} of ${first}'s ${item} to ${second}, ${second} had ${rr} times as many ${item} as ${first}. Then ${second} gave ${first} ${g} ${item}. Now they both had the same number of ${item}. How many ${item} did ${second} have at first?`,
  seconds,item,
  `Let one part be 1/${k} of ${first}'s first amount. Show both amounts in parts after the first gift.`,
  [
   {text:`${first} started with ${k} parts and gave 1 part away, leaving ${k-1} parts. Then ${second} had ${rr} times that.`,equation:`${rr} × ${k-1} = ${rr*(k-1)} parts`},
   {text:`${second} gained 1 part from ${first}, so ${second} started with one part fewer.`,equation:`${rr*(k-1)} − 1 = ${rr*(k-1)-1} parts`},
   {text:`Before the second gift ${second} was ahead by ${(rr-1)*(k-1)} parts. Passing ${g} across closes a gap of 2 × ${g}.`,equation:`${(rr-1)*(k-1)} parts = ${2*g}`},
   {text:'Find one part, then the starting amount.',equation:`${2*g} ÷ ${(rr-1)*(k-1)} = ${u}; ${rr*(k-1)-1} × ${u} = ${seconds}`}
  ],
  op('*',op('/',op('*',2,g),(rr-1)*(k-1)),rr*(k-1)-1));
}
