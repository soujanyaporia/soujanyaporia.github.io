import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {PaperPicture} from '../paperPicture';

export const RAG_PATTERN={
 id:'p6-ratio-displayed-values',
 level:6,
 title:'Ratios from displayed or measured values',
 objective:'Read three displayed quantities, change them to one unit where needed, and write their ratio in simplest form.',
 skillIds:['P6.S.RATIO.01','P6.S.RATIO.02','P5.S.DEC.02'],
 canonicalPatternId:'p6-ratio-displayed-values',
};

type Step={text:string;equation?:string};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const gcdAll=(values:number[])=>values.reduce(gcd,0);
const cap=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
const dollars=(cents:number)=>`$${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`;

/** Three whole numbers with no common factor and not all equal. */
function coprimeTriple(r:Rng,lo:number,hi:number):number[]{
 for(let i=0;i<500;i++){
  const t=[r.int(lo,hi),r.int(lo,hi),r.int(lo,hi)];
  if(gcdAll(t)===1&&new Set(t).size>1)return t;
 }
 return [3,4,5];
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`p6-ratio-displayed-values:${seed}:${index}`));
 const variant=(index+Math.abs(Math.trunc(seed)))%4;
 const key=`p6-ratio-displayed-values:${seed}:${index}`;
 const build=(o:{context:string[];prompt:string;labels:string[];raw:number[];hint:string;steps:Step[];picture?:PaperPicture}):Question=>{
  const g=gcdAll(o.raw),terms=o.raw.map(v=>v/g);
  const steps:Step[]=[...o.steps,{text:`The greatest number that divides all three numbers is ${g}. Divide each number by ${g}.`,equation:`${o.raw.join(' : ')} = ${terms.join(' : ')}`}];
  return {
   key,context:o.context,prompt:o.prompt,answer:JSON.stringify(terms.map(String)),
   structuredResponse:{kind:'number-fields',fields:o.labels.map(label=>({label}))},
   hint:o.hint,
   explanation:steps.map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' '),
   workedSteps:steps,
   ...(o.picture?{picture:o.picture}:{}),
  };
 };

 if(variant===0){
  const names=r.shuffle(['pen','ruler','eraser','notebook','sticker','bookmark','pencil case']).slice(0,3);
  const t=coprimeTriple(r,2,12),k=r.pick([5,10]),cents=t.map(v=>v*k);
  return build({
   context:names.map((n,i)=>`The ${n} costs ${dollars(cents[i])}.`),
   prompt:`Find the ratio of the cost of the ${names[0]} to the cost of the ${names[1]} to the cost of the ${names[2]}. Give your answer in simplest form.`,
   labels:names.map(cap),raw:cents,
   hint:'Change every price to cents first so that all three numbers are whole numbers.',
   steps:[{text:'Change each price to cents.',equation:cents.map(c=>`${dollars(c)} = ${c} cents`).join('; ')}],
  });
 }

 if(variant===1){
  const t=coprimeTriple(r,2,9),k=r.int(2,5);
  const order=r.shuffle(['A','B','C','D']),asked=order.slice(0,3),spare=order[3];
  const heights=new Map<string,number>();
  asked.forEach((l,i)=>heights.set(l,t[i]*k));
  heights.set(spare,r.int(6,50));
  const picture:PaperPicture={type:'paper',layout:'cards',heading:'Plant heights',cards:['A','B','C','D'].map(l=>({label:`Plant ${l}`,value:`${heights.get(l)} cm`}))};
  const raw=asked.map(l=>heights.get(l)!);
  return build({
   context:['The cards show the heights of four plants.'],
   prompt:`Find the ratio of the height of Plant ${asked[0]} to Plant ${asked[1]} to Plant ${asked[2]}. Give your answer in simplest form.`,
   labels:asked.map(l=>`Plant ${l}`),raw,picture,
   hint:'Read only the three plants in the question, in the order they are asked.',
   steps:[{text:'Read the three heights asked for. Ignore the other plant.',equation:asked.map((l,i)=>`Plant ${l} = ${raw[i]} cm`).join('; ')}],
  });
 }

 if(variant===2){
  const t=coprimeTriple(r,2,8),k=r.int(2,4),lens=t.map(v=>v*k),starts=lens.map(()=>r.int(0,15));
  const ids=['A','B','C'];
  return build({
   context:['Three ribbons are laid along a tape measure marked from 0 cm to 50 cm.',...ids.map((l,i)=>`Ribbon ${l} runs from the ${starts[i]} cm mark to the ${starts[i]+lens[i]} cm mark.`)],
   prompt:'Find the ratio of the length of Ribbon A to Ribbon B to Ribbon C. Give your answer in simplest form.',
   labels:ids.map(l=>`Ribbon ${l}`),raw:lens,
   hint:'A length is the end reading minus the start reading.',
   steps:[{text:'Subtract the start reading from the end reading for each ribbon.',equation:ids.map((l,i)=>`Ribbon ${l}: ${starts[i]+lens[i]} − ${starts[i]} = ${lens[i]} cm`).join('; ')}],
  });
 }

 const names=r.shuffle(['rice','flour','sugar','beans','oats']).slice(0,3);
 let grams:number[]=[],texts:string[]=[];
 for(let attempt=0;attempt<50;attempt++){
  grams=[];texts=[];
  for(const form of r.shuffle(['decimal','grams','fraction'])){
   if(form==='decimal'){const g=r.int(3,30)*50;grams.push(g);texts.push(`${(g/1000).toFixed(2).replace(/0$/,'')} kg`);}
   else if(form==='grams'){const g=r.int(2,30)*50;grams.push(g);texts.push(`${g} g`);}
   else{const f=r.pick([[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5]]);grams.push(1000*f[0]/f[1]);texts.push(`${f[0]}/${f[1]} kg`);}
  }
  if(new Set(grams).size>1)break;
 }
 return build({
  context:names.map((n,i)=>`The ${n} weighs ${texts[i]}.`),
  prompt:`Find the ratio of the mass of the ${names[0]} to the mass of the ${names[1]} to the mass of the ${names[2]}. Give your answer in simplest form.`,
  labels:names.map(cap),raw:grams,
  hint:'Write all three masses in grams before you compare them.',
  steps:[{text:'Change each mass to grams. 1 kg = 1000 g.',equation:texts.map((s,i)=>`${s} = ${grams[i]} g`).join('; ')}],
 });
}
