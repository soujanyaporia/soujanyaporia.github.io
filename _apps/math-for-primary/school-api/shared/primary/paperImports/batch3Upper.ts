import {Rng,hashString} from '../../engine/random';
import {makeQuestion,type Question} from '../generate';
import type {Activity,GameKind} from '../catalog';
import {makeP1HenryPark2025Question} from './p1HenryPark2025';
import {P1_HENRY_PARK_2025_PATTERNS} from './p1HenryPark2025Meta';
import {makeP6Catholic2025Question} from './p6Catholic2025';
import {P6_CATHOLIC_2025_PATTERNS} from './p6Catholic2025Meta';
import {BATCH3_UPPER_PATTERNS,type Batch3UpperId} from './batch3UpperMeta';
export {BATCH3_UPPER_PATTERNS,type Batch3UpperId} from './batch3UpperMeta';
const activity=(id:string,kind:GameKind,level:number):Activity=>({id:`batch3-upper-base-${id}`,kind,level,track:'standard',strand:kind==='volume'?'Measurement & Geometry':'Number & Algebra',title:id,objective:id,skillIds:[],icon:'✦'});
/** Deterministic selection narrows existing generator configurations, preserving their
 * arithmetic. Only representation/response is adapted; no renderer is introduced. */
function selectExisting(id:string,kind:GameKind,level:number,seed:number,index:number,predicate:(q:Question)=>boolean):Question{
 for(let attempt=0;attempt<512;attempt++){const q=makeQuestion(activity(id,kind,level),seed,index*512+attempt);if(predicate(q))return q;}
 throw Error(`Existing generator did not provide a valid configuration: ${id}`);
}
export function makeBatch3Upper(id:Batch3UpperId,seed:number,index=0):Question{
 if(!BATCH3_UPPER_PATTERNS.some(p=>p.id===id))throw Error(`Unknown upper reuse configuration: ${id}`);
 const r=new Rng(hashString(`batch3-upper-v1:${id}:${seed}:${index}`)),key=`batch3-upper:${id}:${seed}:${index}`;
 const choose=(answer:number,others:number[])=>r.shuffle([...new Set([answer,...others,answer+1,answer+2,answer+3].map(String))].slice(0,4));
 if(id==='seven-digit-place-digit'){
  const q=selectExisting(id,'place',6,seed,index,q=>q.prompt.includes('10,000 place')&&q.display?.replaceAll(',','')!=='9402517'),digit=Number(q.answer)/10000;
  const steps=[{text:'Read the fifth digit from the right: ones, tens, hundreds, thousands, ten thousands.',equation:`Ten-thousands digit = ${digit}`}];
  return {...q,key,prompt:`Which digit is in the ten thousands place in ${q.display}?`,display:undefined,picture:undefined,answer:String(digit),hint:'Read from the right. The ten-thousands place is fifth.',explanation:steps.map(s=>s.text+' '+s.equation).join(' '),workedSteps:steps,proof:digit,choices:choose(digit,r.shuffle(Array.from({length:10},(_,i)=>i)).filter(n=>n!==digit))};
 }
 if(id==='centimetres-to-metres'){
  const q=selectExisting(id,'unitConvert',6,seed,index,q=>q.unit==='m'&&/ cm to m\.$/.test(q.prompt)&&!Number.isInteger(Number(q.answer))),cm=Number(q.prompt.match(/^Convert ([\d.]+) cm/)![1]),answer=Number(q.answer);
  const steps=[{text:'One metre contains 100 centimetres.',equation:'100 cm = 1 m'},{text:'Use the existing conversion by dividing centimetres by 100.',equation:`${cm} ÷ 100 = ${answer} m`}];
  return {...q,key,prompt:`Express ${cm} cm in metres.`,picture:undefined,workedSteps:steps,hint:'Divide by 100 because one metre contains 100 centimetres.',explanation:steps.map(s=>s.text+' '+s.equation).join(' '),choices:choose(answer,[cm/10,cm/1000,cm*100])};
 }
 if(id==='three-digit-backward-pattern'){
  const meta=P1_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter==='hp25-10')!;
  let q=makeP1HenryPark2025Question({...meta,id:'batch3-upper-backward-base',kind:'paper',track:'standard'},seed,index*512);
  for(let attempt=1;attempt<512;attempt++){if(q.picture.type==='pattern'&&q.picture.items.filter(v=>v!=='?').every(v=>Number(v)>=10)&&Number(q.answer)>=10)break;q=makeP1HenryPark2025Question({...meta,id:'batch3-upper-backward-base',kind:'paper',track:'standard'},seed,index*512+attempt);}
  if(q.picture.type!=='pattern')throw Error('Existing backward template changed representation');
  // Affine scaling preserves every equal backward gap; offset makes nonzero ones.
  const scale=10,offset=r.pick([1,3,7,9]),items=q.picture.items.slice(0,5).map(v=>v==='?'?v:String(Number(v)*scale+offset)),answer=Number(q.answer)*scale+offset,missing=items.indexOf('?'),first=Number(items[0]),second=Number(items[1]),step=first-second,before=Number(items[missing-1]);
  const steps=[{text:q.workedSteps[0].text,equation:`${first} − ${second} = ${step}`},{text:q.workedSteps[1].text,equation:`${before} − ${step} = ${answer}`}];
  return {...q,key,picture:{...q.picture,items},answer:String(answer),workedSteps:steps,explanation:steps.map(s=>s.text+' '+s.equation).join(' '),proof:{op:'-',a:before,b:step}};
 }
 if(id==='square-base-volume'){
  const q=selectExisting(id,'volume',5,seed,index,q=>q.picture?.type==='solid'&&q.picture.a===q.picture.b&&q.picture.a!==q.picture.c),m=q.picture;
  if(m?.type!=='solid'||m.a===undefined||m.c===undefined)throw Error('Existing volume template changed representation');
  const side=m.a,height=m.c,steps=[{text:'The square base has two equal sides.',equation:`${side} × ${side} = ${side*side} cm²`},{text:'Multiply the base area by the height.',equation:`${side*side} × ${height} = ${q.answer} cm³`}];
  return {...q,key,prompt:`A solid cuboid has a square base with side ${side} cm and height ${height} cm. What is its volume?`,workedSteps:steps,explanation:steps.map(s=>s.text+' '+s.equation).join(' '),choices:choose(Number(q.answer),[side*height,side**3,Number(q.answer)*2,Number(q.answer)+side**2])};
 }
 const meta=P6_CATHOLIC_2025_PATTERNS.find(p=>p.parameter==='ch6a2-11-a')!,q=makeP6Catholic2025Question({...meta,id:'batch3-upper-complement-base',kind:'paper',track:'standard'},seed,index);
 if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Existing complement template changed representation');
 const [total,pct]=q.picture.cards,totalValue=Number(total.value),percent=Number(pct.value.replace('%','')),answer=Number(q.answer);
 const steps=q.workedSteps.map(s=>({text:s.text.replaceAll('boys','unsold caps'),equation:s.equation}));
 return {...q,key,prompt:`There were ${totalValue} caps at a stall. ${percent}% were sold. How many caps remain?`,picture:undefined,context:undefined,answer:String(answer),unit:'caps',hint:'Find the percentage that is unsold, then find that percentage of the starting number.',workedSteps:steps,explanation:steps.map(s=>s.text+' '+s.equation).join(' '),choices:choose(answer,[totalValue-answer,100-percent,answer+totalValue,totalValue])};
}
