import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id:'equal-additions-to-target-fill',
 level:5,
 title:'Equal bottles to reach a target fill',
 objective:'Find the volume gap in a rectangular tank, then divide by the volume of one bottle, or find the volume of one bottle from the gap.',
 skillIds:['P5.S.VOL.03','P5.S.VOL.04','P5.S.VOL.05'],
 canonicalPatternId:'p5-equal-additions-target-fill',
} as const;

type Built={context:string[];prompt:string;answer:number;unit:string;hint:string;steps:{text:string;equation:string}[]};

function depthVariant(r:Rng):Built{
 let L=40,W=30,d=5,n=1,H=50,h=25,v=1500;
 for(let i=0;i<400;i++){
  const l=r.pick([30,40,50]),w=r.pick([20,25,30,40]),dd=r.pick([4,5]),nn=r.int(1,dd-1),hh=dd*r.int(8,12),h0=hh*nn/dd,target=r.int(h0+2,hh),vv=r.pick([500,750,1000,1500,2000]);
  const vol=l*w*(target-h0);
  if(vol%vv===0&&vol/vv>=2&&vol/vv<=20){L=l;W=w;d=dd;n=nn;H=hh;h=target;v=vv;break;}
 }
 const h0=H*n/d,vol=L*W*(h-h0);
 return {
  context:[`An empty rectangular tank is ${L} cm long, ${W} cm wide and ${H} cm high.`,`Syrup is poured in until the tank is ${n}/${d} full.`,`Then bottles of water are poured in until the liquid in the tank is ${h} cm deep. Each bottle holds ${v} ml.`],
  prompt:'How many bottles of water are poured in?',answer:vol/v,unit:'bottles',
  hint:'Find how much deeper the liquid gets. Turn that depth into cm³, then divide by the volume of one bottle (1 cm³ = 1 ml).',
  steps:[
   {text:'Find the depth of the syrup.',equation:`${H} × ${n}/${d} = ${h0} cm`},
   {text:'Find how much deeper the liquid becomes.',equation:`${h} − ${h0} = ${h-h0} cm`},
   {text:'Find the volume of water added. 1 cm³ is 1 ml.',equation:`${L} × ${W} × ${h-h0} = ${vol} cm³ = ${vol} ml`},
   {text:'Divide by the volume of one bottle.',equation:`${vol} ÷ ${v} = ${vol/v}`},
  ]};
}

function restVariant(r:Rng):Built{
 let L=60,W=40,H=30,d=5,n=3,v=1200;
 for(let i=0;i<400;i++){
  const l=r.pick([30,40,50,60]),w=r.pick([20,30,40]),dd=r.pick([3,4,5]),nn=r.int(1,dd-1),hh=dd*r.int(4,12),vv=r.pick([250,400,500,600,800,1000]);
  const rest=l*w*hh*(dd-nn)/dd;
  if(rest%vv===0&&rest/vv>=3&&rest/vv<=60){L=l;W=w;H=hh;d=dd;n=nn;v=vv;break;}
 }
 const cap=L*W*H,rest=cap*(d-n)/d;
 return {
  context:[`A rectangular tank is ${L} cm long, ${W} cm wide and ${H} cm high.`,`It is ${n}/${d} full of water.`,`Each bottle holds ${v} ml of water.`],
  prompt:'How many bottles of water are needed to fill the tank to the brim?',answer:rest/v,unit:'bottles',
  hint:'Find the empty fraction of the tank, take that part of the capacity, then divide by the volume of one bottle.',
  steps:[
   {text:'Find the capacity of the tank.',equation:`${L} × ${W} × ${H} = ${cap} cm³`},
   {text:'Find the empty fraction.',equation:`1 − ${n}/${d} = ${d-n}/${d}`},
   {text:'Find the volume still needed. 1 cm³ is 1 ml.',equation:`${cap} ÷ ${d} × ${d-n} = ${rest} cm³ = ${rest} ml`},
   {text:'Divide by the volume of one bottle.',equation:`${rest} ÷ ${v} = ${rest/v}`},
  ]};
}

function perBottleVariant(r:Rng):Built{
 let L=20,W=4,H=15,h0=8,k=5;
 for(let i=0;i<400;i++){
  const l=r.pick([10,12,15,20,25]),w=r.pick([4,5,6,8,10]),hh=r.int(12,30),d0=r.int(3,hh-4),kk=r.int(2,8),vol=l*w*(hh-d0);
  if(vol%kk===0&&vol/kk>=50){L=l;W=w;H=hh;h0=d0;k=kk;break;}
 }
 const vol=L*W*(H-h0);
 return {
  context:[`A rectangular tank is ${L} cm long, ${W} cm wide and ${H} cm high.`,`Water in the tank is ${h0} cm deep.`,`${k} identical bottles of water are poured in. The tank is then filled exactly to the brim.`],
  prompt:'How much water is in each bottle? Give your answer in millilitres.',answer:vol/k,unit:'ml',
  hint:'Find the volume of the empty space in the tank, then share it equally among the bottles.',
  steps:[
   {text:'Find the height of the empty space.',equation:`${H} − ${h0} = ${H-h0} cm`},
   {text:'Find the volume of water added. 1 cm³ is 1 ml.',equation:`${L} × ${W} × ${H-h0} = ${vol} cm³ = ${vol} ml`},
   {text:'Share it equally among the bottles.',equation:`${vol} ÷ ${k} = ${vol/k} ml`},
  ]};
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-equal-additions-fill:${seed}:${index}`));
 const variant=(Math.abs(Math.floor(seed))+Math.abs(Math.floor(index)))%3;
 const b=variant===0?depthVariant(r):variant===1?restVariant(r):perBottleVariant(r);
 const last=b.steps[b.steps.length-1];
 return {
  key:`rag-equal-additions-fill:${seed}:${index}`,
  context:b.context,prompt:b.prompt,answer:String(b.answer),unit:b.unit,hint:b.hint,
  explanation:`${last.equation}.`,
  workedSteps:b.steps,
 };
}
