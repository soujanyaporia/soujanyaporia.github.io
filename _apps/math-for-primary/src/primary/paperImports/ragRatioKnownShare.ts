import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-ratio-scaling-known-share',
 level:6,
 title:'Scale a ratio from a known share',
 objective:'Use one known share to value a ratio unit, then find a total, a share or a difference.',
 skillIds:['P6.S.RATIO.01','P6.S.RATIO.03'],
 canonicalPatternId:'p6-ratio-scaling-known-share',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const TWO_TERMS:number[][]=[];
for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)if(a!==b&&gcd(a,b)===1)TWO_TERMS.push([a,b]);
const THREE_TERMS:number[][]=[];
for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(let c=1;c<=9;c++)
 if(a!==b&&b!==c&&a!==c&&gcd(gcd(a,b),c)===1)THREE_TERMS.push([a,b,c]);

const NAMES=['Mei','Raj','Lin','Omar','Hana','Ben','Priya','Zul','Alice','Kai'];
const ITEMS=['stickers','marbles','beads','cards','stamps','coins'];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-ratio-known-share:${seed}:${index}`));
 const variant=(Math.abs(Math.floor(seed))+Math.max(0,Math.floor(index)))%4;
 const threePart=variant===0?r.chance(0.5):variant!==1;
 const terms=r.pick(threePart?THREE_TERMS:TWO_TERMS);
 const n=terms.length;
 const names=r.shuffle(NAMES).slice(0,n);
 const item=r.pick(ITEMS);
 const unit=r.int(2,15);
 const known=r.int(0,n-1);
 const knownAmount=terms[known]*unit;
 const list=n===2?`${names[0]} and ${names[1]}`:`${names[0]}, ${names[1]} and ${names[2]}`;
 const context=[
  `${list} shared some ${item} in the ratio ${terms.join(' : ')}. The ratio follows the order of the names.`,
  `${names[known]} had ${knownAmount} ${item}.`,
 ];
 const oneUnit={text:`${names[known]} has ${terms[known]} units. Divide to find the value of one unit.`,equation:`${knownAmount} ÷ ${terms[known]} = ${unit}`};
 let prompt:string,answer:number,steps:{text:string;equation?:string}[];
 if(variant===0){
  const sum=terms.reduce((a,b)=>a+b,0);
  answer=sum*unit;
  prompt=`How many ${item} were there altogether?`;
  steps=[{text:'Add the ratio terms to find the number of units altogether.',equation:`${terms.join(' + ')} = ${sum} units`},oneUnit,{text:'Multiply the value of one unit by the units altogether.',equation:`${sum} × ${unit} = ${answer}`}];
 }else if(variant===2){
  const others=terms.map((_,i)=>i).filter(i=>i!==known),target=r.pick(others);
  answer=terms[target]*unit;
  prompt=`How many ${item} did ${names[target]} have?`;
  steps=[oneUnit,{text:`${names[target]} has ${terms[target]} units.`,equation:`${terms[target]} × ${unit} = ${answer}`}];
 }else{
  const pair=variant===1
   ?terms.map((_,i)=>i).filter(i=>i!==known||n===2)
   :terms.map((_,i)=>i).filter(i=>i!==known);
  const [i,j]=variant===1?[0,1]:pair;
  const big=terms[i]>terms[j]?i:j,small=big===i?j:i;
  const diff=terms[big]-terms[small];
  answer=diff*unit;
  prompt=`How many more ${item} did ${names[big]} have than ${names[small]}?`;
  steps=[oneUnit,{text:'Find the difference in ratio units.',equation:`${terms[big]} − ${terms[small]} = ${diff} units`},{text:'Multiply the unit difference by the value of one unit.',equation:`${diff} × ${unit} = ${answer}`}];
 }
 return {
  key:`rag-p6-ratio-known-share:${seed}:${index}`,
  context,
  prompt,
  answer:String(answer),
  unit:item,
  hint:'Use the known share to find the value of one ratio unit first.',
  explanation:steps.map(s=>`${s.text} ${s.equation??''}`.trim()).join(' '),
  workedSteps:steps,
 };
}
