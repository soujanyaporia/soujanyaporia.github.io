import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch6MiddleResponseSpec} from './batch6MiddleResponse';

/** Original configurations for finding capacity or height when water is described as a fraction of a container. */
export const RAG_PATTERN={
 id:'p6-capacity-fractional-occupancy',
 level:6,
 title:'Capacity from fractional occupancy',
 objective:'Write a known amount of water as a fraction of a container, then find the capacity, a height or the space left.',
 skillIds:['P5.S.VOL.04','P5.S.VOL.05','P6.S.VOL.02','P5.S.FRAC.05'],
 canonicalPatternId:'p6-capacity-from-fractional-occupancy',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const frac=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?`${n/g}`:`${n/g}/${d/g}`;};

interface Removal{L:number;W:number;d0:number;removed:number;n:number;m:number;H:number}
const REMOVALS:Removal[]=[];
const SMALL_FRACTIONS:[number,number][]=[[1,4],[1,3],[2,5],[3,5],[2,3],[3,4]];
for(const L of [80,100,125,150,200,250])for(const W of [40,50,60,80])for(const [n,m] of SMALL_FRACTIONS)for(let k=4;k<=20;k++){
 const H=m*k;if(H<20||H>60)continue;
 const d1=n*k;
 for(let d0=d1+2;d0<H;d0++){
  const removedCm3=L*W*(d0-d1),capCm3=L*W*H;
  if(removedCm3%1000!==0||capCm3%1000!==0)continue;
  if(L===125&&W===60&&d0===14&&n===2&&m===5)continue;
  REMOVALS.push({L,W,d0,removed:removedCm3/1000,n,m,H});
 }
}

/** [start numerator, start denominator, end numerator, end denominator] */
const POURS:[number,number,number,number][]=[[3,5,7,10],[1,4,5,8],[2,3,5,6],[1,2,4,5],[1,3,3,4],[1,5,1,2],[3,8,3,4],[2,5,9,10],[1,6,1,2],[1,4,3,4]];
const FILLS:[number,number][]=[[1,2],[3,4],[5,8],[2,5],[3,5],[5,6],[2,3],[1,4]];

interface TwoTanks{a:number;b:number;c:number;p:number;q:number;pour:[number,number,number,number];A:number;volume:number;capacity:number;height:number}
const TWO_TANKS:TwoTanks[]=[];
for(const a of [20,25,30,40,50])for(const b of [20,24,30,40])for(const c of [10,12,15,16,20,24])for(const [p,q] of FILLS)for(const pour of POURS)for(const A of [1000,1200,1500,2000,2400,2500,3000,4000,5000,6000]){
 const full=a*b*c;if((full*p)%q!==0)continue;
 const volume=full*p/q,[s,t,s2,t2]=pour,num=s2*t-s*t2,den=t*t2;
 if((volume*den)%num!==0)continue;
 const capacity=volume*den/num;
 if(capacity%A!==0)continue;
 const height=capacity/A;if(height<10||height>80)continue;
 TWO_TANKS.push({a,b,c,p,q,pour,A,volume,capacity,height});
}

interface OneTank{pour:[number,number,number,number];capacity:number;added:number}
const ONE_TANKS:OneTank[]=[];
for(const pour of POURS)for(let capacity=20;capacity<=500;capacity++){
 const [s,t,s2,t2]=pour,num=s2*t-s*t2,den=t*t2;
 if((capacity*num)%den!==0)continue;
 const added=capacity*num/den;if(added>=2)ONE_TANKS.push({pour,capacity,added});
}

const CONTAINER_PAIRS:[string,string][]=[['cup','jug'],['glass','bottle'],['bowl','bucket']];
const CUP_FRACTIONS:[number,number][]=[[1,3],[1,4],[2,5],[3,4],[1,5],[3,5],[2,3],[5,6]];

const twoTankSpec:Batch6MiddleResponseSpec={kind:'number-fields',fields:[{label:'(a) Water in Tank M (cm³)'},{label:'(b) Height of Tank N (cm)'}]};

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const variant=((Math.abs(Math.trunc(seed))+index)%4+4)%4;
 const finish=(context:string[],prompt:string,answer:string,hint:string,steps:{text:string;equation:string}[],extra:Partial<Question>={}):Question=>({key,context,prompt,answer,hint,workedSteps:steps,explanation:steps.map(s=>s.equation).join('. ')+'.',...extra});

 if(variant===0){
  const o=r.pick(REMOVALS),area=o.L*o.W,v0=area*o.d0,removedCm3=o.removed*1000,left=v0-removedCm3,d1=left/area,capCm3=area*o.H,cap=capCm3/1000;
  return finish(
   [`A rectangular tank has a base ${o.L} cm by ${o.W} cm.`,`It holds water to a depth of ${o.d0} cm.`,`Then ${o.removed} litres of water are taken out. The water level drops to ${o.n}/${o.m} of the height of the tank.`],
   'What is the capacity of the tank, in litres?',String(cap),
   'Find the water left after taking some out. 1 litre = 1000 cm³. Use the base area to find the new depth.',
   [
    {text:'Find the area of the base.',equation:`${o.L} × ${o.W} = ${area} cm²`},
    {text:'Find the volume of water at the start.',equation:`${area} × ${o.d0} = ${v0} cm³`},
    {text:'Change the litres removed into cm³.',equation:`${o.removed} × 1000 = ${removedCm3} cm³`},
    {text:'Find the water that is left.',equation:`${v0} − ${removedCm3} = ${left} cm³`},
    {text:'Divide by the base area to find the new depth.',equation:`${left} ÷ ${area} = ${d1} cm`},
    {text:`This depth is ${o.n}/${o.m} of the height of the tank. Find the whole height.`,equation:`${d1} ÷ ${o.n} × ${o.m} = ${o.H} cm`},
    {text:'Multiply the base area by the height, then change to litres.',equation:`${area} × ${o.H} = ${capCm3} cm³ = ${cap} litres`},
   ],{unit:'litres'});
 }

 if(variant===1){
  const o=r.pick(TWO_TANKS),[s,t,s2,t2]=o.pour,full=o.a*o.b*o.c,num=s2*t-s*t2,den=t*t2;
  return finish(
   [`Tank M is a rectangular tank ${o.a} cm long, ${o.b} cm wide and ${o.c} cm high. It is ${o.p}/${o.q} full of water.`,`Tank N is ${s}/${t} full of water. All the water from Tank M is poured into Tank N, and none is spilled. Tank N is then ${s2}/${t2} full.`,`The base area of Tank N is ${o.A} cm².`],
   '(a) What is the volume of water in Tank M, in cm³? (b) Find the height of Tank N, in cm.',
   JSON.stringify([String(o.volume),String(o.height)]),
   'The water from Tank M fills the gap between the two fractions of Tank N. Find that part of Tank N first.',
   [
    {text:'Find the volume of Tank M when it is full.',equation:`${o.a} × ${o.b} × ${o.c} = ${full} cm³`},
    {text:`(a) Tank M is ${o.p}/${o.q} full.`,equation:`${full} ÷ ${o.q} × ${o.p} = ${o.volume} cm³`},
    {text:'Find how much of Tank N the poured water fills.',equation:`${s2}/${t2} − ${s}/${t} = ${frac(num,den)}`},
    {text:'That fraction of Tank N holds the water from Tank M. Find the whole capacity.',equation:`${o.volume} ÷ ${frac(num,den).split('/')[0]} × ${frac(num,den).split('/')[1]??'1'} = ${o.capacity} cm³`},
    {text:'(b) Divide the capacity by the base area to find the height.',equation:`${o.capacity} ÷ ${o.A} = ${o.height} cm`},
   ],{structuredResponse:twoTankSpec});
 }

 if(variant===2){
  const o=r.pick(ONE_TANKS),[s,t,s2,t2]=o.pour,num=s2*t-s*t2,den=t*t2,diff=frac(num,den),[dn,dd]=diff.includes('/')?diff.split('/'):[diff,'1'];
  return finish(
   [`A tank is ${s}/${t} full of water. Then ${o.added} litres of water are poured in. The tank is now ${s2}/${t2} full.`],
   'What is the capacity of the tank, in litres?',String(o.capacity),
   'The litres poured in match the extra fraction of the tank that has been filled.',
   [
    {text:'Find the fraction of the tank that the poured water fills.',equation:`${s2}/${t2} − ${s}/${t} = ${diff}`},
    {text:'This fraction of the tank is the water that was added. Find the whole tank.',equation:`${o.added} ÷ ${dn} × ${dd} = ${o.capacity} litres`},
   ],{unit:'litres'});
 }

 const [small,big]=r.pick(CONTAINER_PAIRS);
 let p=1,q=3,k=4,u=10;
 do{[p,q]=r.pick(CUP_FRACTIONS);k=r.int(3,6);u=r.int(2,30)*5;}while(p===1&&q===3&&k===4&&u===10);
 const water=p*u,smallCap=q*u,bigCap=k*smallCap,more=bigCap-water;
 return finish(
  [`A ${small} is ${p}/${q} full of water.`,`All the water in the ${small} is poured into an empty ${big}. The capacity of the ${big} is ${k} times the capacity of the ${small}.`,`There are ${water} ml of water in the ${big} now.`],
  `How much more water, in ml, is needed to fill the ${big} to the brim?`,String(more),
  `The water in the ${big} is the water that was in the ${small}. Use its fraction to find the capacity of the ${small}.`,
  [
   {text:`The ${water} ml is ${p}/${q} of the ${small}. Find the capacity of the ${small}.`,equation:`${water} ÷ ${p} × ${q} = ${smallCap} ml`},
   {text:`Find the capacity of the ${big}.`,equation:`${smallCap} × ${k} = ${bigCap} ml`},
   {text:`Subtract the water already in the ${big}.`,equation:`${bigCap} − ${water} = ${more} ml`},
  ],{unit:'ml'});
}
