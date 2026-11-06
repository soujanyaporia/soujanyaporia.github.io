import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'proportional-purchase-cost',
 level:6,
 title:'Find the cost or equivalent quantity from priced bundles',
 objective:'Scale prices across containers and bundles: find a total cost from groups, or find how many items cost the same as another quantity priced in a different bundle.',
 skillIds:['P5.S.RATE.01','P5.S.RATE.02'],
 canonicalPatternId:'p6-proportional-purchase-cost',
};

const dollars=(cents:number)=>(cents/100).toFixed(2);
const cap=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
const NAMES=['Mei','Ravi','Aisha','Ben','Chen','Farah'];
/** [single item, container] */
const GOODS:[string,string][]=[['sticker','packet'],['bead','bag'],['marble','pack'],['sweet','tin']];
const PAIRS:[string,string][]=[['erasers','markers'],['stickers','badges'],['rulers','notebooks'],['pencils','crayons']];

function groupCost(r:Rng,key:string):Question{
 const [item,pack]=r.pick(GOODS),name=r.pick(NAMES);
 const price=r.pick([25,30,35,40,45,50,60,65,70,75,80,90]);
 const size=r.pick([20,25,40,50,60,80,100]);
 const packs=r.int(3,12);
 const items=size*packs,totalCents=price*items;
 return {
  key,
  context:[`Each ${pack} holds ${size} ${item}s.`,`One ${item} costs $${dollars(price)}.`,`${name} buys ${packs} ${pack}s for a class activity.`],
  prompt:`How much do all the ${item}s cost?`,
  answer:dollars(totalCents),
  unit:'dollars',
  hint:'Find how many items there are altogether, then multiply by the price of one item.',
  workedSteps:[
   {text:`Find the number of ${item}s in all the ${pack}s.`,equation:`${size} × ${packs} = ${items}`},
   {text:'Multiply by the price of one item.',equation:`${items} × $${dollars(price)} = $${dollars(totalCents)}`},
  ],
  explanation:`There are ${size} × ${packs} = ${items} ${item}s. The cost is ${items} × $${dollars(price)} = $${dollars(totalCents)}.`,
 };
}

function bundleEquivalent(r:Rng,key:string):Question{
 let [first,second]=r.pick(PAIRS);
 if(r.chance(.5))[first,second]=[second,first];
 let a=4,p1=3,b=6,p2=5,k=3;
 for(let t=0;t<300;t++){
  const ta=r.pick([2,3,4,5,6,8,10]),tb=r.pick([2,3,4,5,6,8,10]),tp1=r.int(2,9),tp2=r.int(2,15),tk=r.int(2,10);
  const cost=tk*tp2;
  if(cost%tp1!==0||tp1*tb===tp2*ta)continue;
  const ans=cost/tp1*ta;
  if(ans===tk*tb||ans>120)continue;
  a=ta;b=tb;p1=tp1;p2=tp2;k=tk;break;
 }
 const q2=k*b,cost2=k*p2,bundles1=cost2/p1,answer=bundles1*a;
 return {
  key,
  context:[`${cap(first)} are sold ${a} for $${p1}.`,`${cap(second)} are sold ${b} for $${p2}.`],
  prompt:`How many ${first} cost the same as ${q2} ${second}?`,
  answer:String(answer),
  unit:first,
  hint:`Find the cost of the ${second}. Then see how many bundles of ${first} that money buys.`,
  workedSteps:[
   {text:`Find how many bundles of ${second} there are.`,equation:`${q2} ÷ ${b} = ${k}`},
   {text:`Find the cost of the ${second}.`,equation:`${k} × $${p2} = $${cost2}`},
   {text:`Find how many bundles of ${first} cost this much.`,equation:`$${cost2} ÷ $${p1} = ${bundles1}`},
   {text:`Find the number of ${first}.`,equation:`${bundles1} × ${a} = ${answer}`},
  ],
  explanation:`${q2} ${second} are ${k} bundles, costing $${cost2}. That buys ${bundles1} bundles of ${first}, which is ${bundles1} × ${a} = ${answer} ${first}.`,
 };
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-proportional-purchase-cost-v1:${seed}:${index}`));
 const key=`rag-proportional-purchase-cost:${seed}:${index}`;
 const variant=(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%2;
 return variant===0?groupCost(r,key):bundleEquivalent(r,key);
}
