import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original pattern: a constant whole, a fixed extra amount, and a larger final share of the whole. */
export const RAG_PATTERN={
 id:'whole-from-share-increase',
 level:5,
 title:'Find the whole from a growing share',
 objective:'Divide a fixed extra amount by the increase in the fraction of a constant whole to recover the whole',
 skillIds:['P4.S.FRAC.04','P5.S.FRAC.05'],
 canonicalPatternId:'p5-whole-from-share-increase',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const ft=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};

const NAMES=['Priya','Hao','Lina','Kai','Sara','Dev','Mei','Omar'];
const INITIAL:[number,number][]=[[1,4],[1,3],[1,5],[2,5],[1,6],[3,8],[1,8],[3,10],[1,10],[2,7],[1,2],[1,12]];
/** read : not read */
const RATIOS:[number,number][]=[[2,1],[3,1],[4,1],[3,2],[4,3],[5,3],[2,3],[3,5],[5,2]];
/** fraction still needed */
const UNMET:[number,number][]=[[1,2],[1,3],[2,3],[1,4],[3,4],[5,12],[1,6],[5,6],[3,8],[1,5],[2,5],[3,5],[7,12],[3,10]];
/** spent : total, in simplest form */
const SPENT:[number,number][]=[[11,20],[3,4],[2,3],[5,8],[7,10],[3,5],[4,5],[7,12],[5,6],[9,10],[13,20]];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-whole-from-share-increase:${seed}:${index}`));
 const variant=(((Math.trunc(seed)+index)%3)+3)%3;
 const name=r.pick(NAMES);
 for(let attempt=0;attempt<2000;attempt++){
  const [a,b]=r.pick(INITIAL);
  let fp=0,fq=1,m=0,n=0,c=0,d=0;
  if(variant===0){const pair=r.pick(RATIOS);m=pair[0];n=pair[1];fp=m;fq=m+n;}
  else if(variant===1){const pair=r.pick(UNMET);c=pair[0];d=pair[1];fp=d-c;fq=d;}
  else{const pair=r.pick(SPENT);m=pair[0];n=pair[1];fp=m;fq=n;}
  if(fp*b<=a*fq||fp>=fq)continue;
  const L=lcm(b,fq),incNum=fp*(L/fq)-a*(L/b);
  if(incNum<=0)continue;
  const mults:number[]=[];
  for(let k=1;k<=60;k++){const whole=L*k,extra=incNum*k;if(whole>=40&&whole<=600&&extra>=5&&extra<=300)mults.push(k);}
  if(!mults.length)continue;
  const k=r.pick(mults),whole=L*k,extra=incNum*k,inc=ft(incNum,L);
  const key=`rag-whole-from-share-increase:${seed}:${index}`;
  const hint='The extra amount is exactly how much the share of the whole grew. Find that growth first.';
  const finish=(context:string[],prompt:string,unit:string,first:[string,string],money:boolean):Question=>{
   const p=(v:number)=>money?`$${v}`:String(v);
   const workedSteps=[
    {text:first[0],equation:first[1]},
    {text:'Find how much the share of the whole grew.',equation:`${ft(fp,fq)} − ${ft(a,b)} = ${inc}`},
    {text:'The extra amount is that part of the whole, so divide by the growth.',equation:`${p(extra)} ÷ ${inc} = ${p(whole)}`},
   ];
   return {key,context,prompt,answer:String(whole),unit,hint,workedSteps,explanation:workedSteps.map(s=>`${s.text} ${s.equation}.`).join(' ')};
  };
  if(variant===0){
   const timesStyle=n===1&&r.chance(.5);
   const last=timesStyle?`After that, the number of pages ${name} had read was ${m===2?'twice':m+' times'} the number of pages not yet read.`:`After that, the ratio of pages read to pages not yet read was ${m} : ${n}.`;
   return finish([`On Monday, ${name} read ${a}/${b} of the pages in a storybook.`,`On Tuesday, ${name} read another ${extra} pages.`,last],'How many pages are in the storybook?','pages',['Turn the read : not read comparison into the share of the book that has been read.',`${m} + ${n} = ${m+n} equal parts, so read = ${m}/${m+n}`],false);
  }
  if(variant===1){
   return finish([`${name} needs some tokens to claim a prize. At first, ${name} had only ${a}/${b} of the tokens needed.`,`Then a friend gave ${name} ${extra} more tokens.`,`${name} still needed ${c}/${d} of the total number of tokens.`],'How many tokens are needed to claim the prize?','tokens',[`Take the share still needed away from the whole to find the share ${name} has now.`,`1 − ${c}/${d} = ${ft(fp,fq)}`],false);
  }
  return finish([`${name} spent ${a}/${b} of the pocket money on snacks.`,`After spending another $${extra} on snacks, the ratio of the money spent on snacks to all the pocket money was ${m} : ${n}.`],`How much pocket money did ${name} have at the start?`,'dollars',['The ratio spent : total gives the share of the pocket money that has now been spent.',`${m} : ${n} means ${m}/${n} of the total`],true);
 }
 throw new Error('Could not build a whole-from-share-increase question');
}
