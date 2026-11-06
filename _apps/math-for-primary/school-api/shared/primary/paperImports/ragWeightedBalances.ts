import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original fraction word problems: solve for a starting amount from retained fractions and one initial constraint. */
export const RAG_PATTERN={
 id:'weighted-balances-initial-constraints',
 level:5,
 title:'Find the starting amount after fractions change',
 objective:'Use fractions of two groups together with an initial total, an initial difference or an equal start to find a starting amount.',
 skillIds:['P5.S.FRAC.05','P4.S.FRAC.03'],
 canonicalPatternId:'p5-weighted-balances-initial-constraints',
};

type Frac=[number,number];
const REMOVED:Frac[]=[[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5]];
const AS_MANY:Frac[]=[[1,2],[1,3],[1,4],[1,5],[2,3],[2,5],[3,4],[3,5]];
const NOUNS=['books','toy cars','pencils','stickers','marbles'];

function search<T>(tries:number,make:()=>T|null,fallback:T):T{
 for(let i=0;i<tries;i++){const value=make();if(value)return value;}
 return fallback;
}

export function makeRagQuestion(seed:number,index=0):Question{
 const s0=Math.abs(Math.trunc(seed))||0,i0=Math.abs(Math.trunc(index))||0;
 const r=new Rng(hashString(`rag-weighted-balances:${seed}:${index}`));
 const noun=r.pick(NOUNS),key=`rag-weighted-balances:${seed}:${index}`,variant=(s0+i0)%3;
 const finish=(context:string[],prompt:string,answer:number,hint:string,steps:[string,string][]):Question=>({
  key,context,prompt,answer:String(answer),unit:noun,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),
  explanation:steps.map(([text,equation])=>`${text} ${equation}`).join(' '),
 });

 if(variant===0){
  // Known total, known difference after fractions leave: find the first group's start.
  const p=search(300,()=>{
   const f1=r.pick(REMOVED),f2=r.pick(REMOVED),s=r.int(2,30)*5,t=r.int(2,30)*5;
   const x=f1[1]*s,y=f2[1]*t,remP=(f1[1]-f1[0])*s,remQ=(f2[1]-f2[0])*t,diff=remQ-remP;
   return diff>=10&&x!==y?{f1,f2,x,y,diff}:null;
  },{f1:[3,4] as Frac,f2:[2,5] as Frac,x:200,y:500,diff:250});
  const [a1,b1]=p.f1,[a2,b2]=p.f2,total=p.x+p.y,rn1=b1-a1,rn2=b2-a2,coef=rn2*b1+rn1*b2,diff=p.diff;
  return finish(
   [`Stall P and Stall Q had ${total} ${noun} altogether.`,`Stall P sold ${a1}/${b1} of its ${noun}. Stall Q sold ${a2}/${b2} of its ${noun}.`,`After that, Stall Q had ${diff} more ${noun} than Stall P.`],
   `How many ${noun} did Stall P have at first?`,p.x,
   'Write what each stall keeps as a fraction. Then use the total and the final difference to find the first number.',
   [
    ['Find the fraction each stall keeps.',`Stall P keeps ${rn1}/${b1}. Stall Q keeps ${rn2}/${b2}.`],
    ['Let □ be the number Stall P had at first. Stall Q had the rest of the total. Use the difference after selling.',`${rn2}/${b2} × (${total} − □) − ${rn1}/${b1} × □ = ${diff}`],
    [`Multiply every part by ${b1*b2} to remove the fractions.`,`${rn2*b1} × (${total} − □) − ${rn1*b2} × □ = ${diff*b1*b2}`],
    ['Multiply out and collect the □ terms.',`${rn2*b1*total} − ${coef} × □ = ${diff*b1*b2}`],
    ['Solve for □.',`□ = (${rn2*b1*total} − ${diff*b1*b2}) ÷ ${coef} = ${p.x}`],
   ]);
 }

 if(variant===1){
  // Known starting difference, known combined remainder: find the larger group's start.
  const p=search(300,()=>{
   const f1=r.pick(REMOVED),f2=r.pick(REMOVED),s=r.int(2,40)*5,t=r.int(2,40)*5;
   const red=f1[1]*s,blue=f2[1]*t,diff=red-blue,left=(f1[1]-f1[0])*s+(f2[1]-f2[0])*t;
   return diff>=10?{f1,f2,red,blue,diff,left}:null;
  },{f1:[1,2] as Frac,f2:[3,5] as Frac,red:700,blue:350,diff:350,left:490});
  const [a1,b1]=p.f1,[a2,b2]=p.f2,rn1=b1-a1,rn2=b2-a2,coef=rn1*b2+rn2*b1,diff=p.diff,left=p.left;
  return finish(
   [`Shop R had ${diff} more ${noun} than Shop S.`,`Shop R sold ${a1}/${b1} of its ${noun}. Shop S sold ${a2}/${b2} of its ${noun}.`,`${left} ${noun} were left in the two shops altogether.`],
   `How many ${noun} did Shop R have at first?`,p.red,
   'Shop S had the difference fewer than Shop R. Write what each shop keeps and add the two remainders.',
   [
    ['Find the fraction each shop keeps.',`Shop R keeps ${rn1}/${b1}. Shop S keeps ${rn2}/${b2}.`],
    ['Let □ be the number Shop R had at first. Shop S had the difference fewer. Add what is left.',`${rn1}/${b1} × □ + ${rn2}/${b2} × (□ − ${diff}) = ${left}`],
    [`Multiply every part by ${b1*b2} to remove the fractions.`,`${rn1*b2} × □ + ${rn2*b1} × (□ − ${diff}) = ${left*b1*b2}`],
    ['Collect the □ terms and move the known amount across.',`${coef} × □ = ${left*b1*b2+rn2*b1*diff}`],
    ['Solve for □.',`□ = ${left*b1*b2+rn2*b1*diff} ÷ ${coef} = ${p.red}`],
   ]);
 }

 // Equal start: one child loses some, the other gains some, then one has a fraction of the other.
 const p=search(300,()=>{
  const f=r.pick(AS_MANY),x=r.int(6,60)*10,lo=Math.floor(x/f[1])+1,hi=Math.ceil(x/f[0])-1;
  if(hi<lo)return null;
  const t=r.int(lo,hi),m=x-f[0]*t,n=f[1]*t-x;
  return m>=5&&n>=5?{a:f[0],b:f[1],x,m,n}:null;
 },{a:1,b:4,x:100,m:70,n:20});
 const {a,b,x,m,n}=p;
 return finish(
  [`Mia and Noah had the same number of ${noun} at first.`,`Mia gave away ${m} ${noun}. Noah was given ${n} more ${noun}.`,`Then Mia had ${a}/${b} as many ${noun} as Noah.`],
  `How many ${noun} did each child have at first?`,x,
  'Both children start with the same number. Write each child’s new amount, then use the fraction relationship.',
  [
   ['Let □ be the number each child had at first. Write each new amount.',`Mia: □ − ${m}. Noah: □ + ${n}.`],
   [`Mia has ${a}/${b} of Noah’s amount, so ${b} times Mia equals ${a} times Noah.`,`${b} × (□ − ${m}) = ${a} × (□ + ${n})`],
   ['Multiply out both sides.',`${b} × □ − ${b*m} = ${a} × □ + ${a*n}`],
   ['Collect the □ terms and move the known amounts across.',`${b-a} × □ = ${b*m+a*n}`],
   ['Solve for □.',`□ = ${b*m+a*n} ÷ ${b-a} = ${x}`],
  ]);
}
