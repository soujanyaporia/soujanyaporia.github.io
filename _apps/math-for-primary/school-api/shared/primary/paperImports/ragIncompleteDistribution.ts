import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original configurations: recover a missing start, share or transfer from ratio units and one stated change or difference. */
export const RAG_PATTERN={
 id:'p5-incomplete-distribution-equalization',
 level:5,
 title:'Work out groups from a ratio and a change',
 objective:'Use ratio units, fractions and a stated change or difference to recover a missing starting amount, share or transfer.',
 skillIds:['P5.S.FRAC.05','P4.S.MD.03','P3.S.AS.01'],
 canonicalPatternId:'p5-incomplete-distribution-equalization',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
type Step={text:string;equation?:string};

interface Share{p:number;q:number;ratio:[number,number,number];f:number;S:number}
/** Fractions in simplest form whose remaining part divides the ratio sum, so every quantity is a whole number of ratio parts. */
const SHARES:Share[]=(()=>{
 const out:Share[]=[];
 for(let q=3;q<=9;q++)for(let p=1;p<q;p++){
  if(gcd(p,q)!==1)continue;
  const rest=q-p;
  for(let x=1;x<=9;x++)for(let y=x+1;y<=9;y++)for(let z=y+1;z<=9;z++){
   if(gcd(gcd(x,y),z)!==1)continue;
   const sum=x+y+z;
   if(sum%rest!==0)continue;
   const S=p*sum/rest;
   if(S+sum>60)continue;
   const ratio:[number,number,number]=[x,y,z];
   for(let f=0;f<3;f++){
    if(S<=ratio[f])continue;
    if(p===2&&q===5&&x===4&&y===5&&z===6&&f===1)continue;
    out.push({p,q,ratio,f,S});
   }
  }
 }
 return out;
})();

const FRIENDS=['Farah','Jun','Kavya','Omar','Lily','Ethan','Sara','Tom'];
const OWNERS=['Priya','Lina','Hui Min'];
const THINGS=['stamps','shells','stickers'];
const PAIRS:[string,string,string][]=[['Ana','Ben','stickers'],['Mei','Ravi','coins'],['Hana','Ken','cards']];
const SCENES=[
 {unit:'pupils',intro:(a:number,b:number)=>`At first, the ratio of the number of boys to the number of girls in a hall was ${a}:${b}.`,event:(k:number)=>`${k} boys left the hall.`,after:'Then the number of boys was the same as the number of girls.',prompt:'How many pupils were in the hall at first?'},
 {unit:'beads',intro:(a:number,b:number)=>`A tray held red beads and blue beads in the ratio ${a}:${b}.`,event:(k:number)=>`${k} red beads were taken out.`,after:'Then the tray had equal numbers of red beads and blue beads.',prompt:'How many beads were on the tray at first?'},
 {unit:'people',intro:(a:number,b:number)=>`The ratio of adults to children on a bus was ${a}:${b}.`,event:(k:number)=>`${k} adults got off the bus.`,after:'Then there were as many adults as children on the bus.',prompt:'How many people were on the bus at first?'},
];

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`rag-p5-incomplete-distribution:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=(((Math.trunc(seed)+index)%3)+3)%3;
 const finish=(context:string[],prompt:string,answer:string,hint:string,steps:Step[],extra:Partial<Question>={}):Question=>({
  key,context,prompt,answer,hint,workedSteps:steps,
  explanation:steps.map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' '),
  ...extra,
 });

 if(variant===0){
  // A group leaves and the two groups become equal.
  let a=0,b=0;
  do{b=r.int(1,5);a=b+r.int(1,4);}while(gcd(a,b)!==1||(a===5&&b===1));
  const d=a-b,u=r.int(3,25),k=d*u,total=(a+b)*u,scene=r.pick(SCENES);
  return finish([scene.intro(a,b),scene.event(k),scene.after],scene.prompt,String(total),
   'The smaller group did not change. Compare the units of the larger group before and after.',[
    {text:`Only the larger group changed. It went from ${a} units to ${b} units, so the number that left is the difference in units.`,equation:`${a} − ${b} = ${d} units`},
    {text:'Find the value of one unit.',equation:`${k} ÷ ${d} = ${u}`},
    {text:'Find the number of units at first.',equation:`${a} + ${b} = ${a+b} units`},
    {text:'Find the total at first.',equation:`${a+b} × ${u} = ${total}`},
   ],{unit:scene.unit});
 }

 if(variant===1){
  // Fraction given away; the rest shared in a ratio; a stated difference.
  const sh=r.pick(SHARES),[x,y,z]=sh.ratio,sum=x+y+z,rest=sh.q-sh.p,per=sum/rest,rf=sh.ratio[sh.f];
  const u=r.int(2,30)*10,diff=(sh.S-rf)*u,give=sh.S*u,total=(sh.S+sum)*u;
  const friends=r.shuffle([...FRIENDS]).slice(0,3),owner=r.pick(OWNERS),things=r.pick(THINGS),named=friends[sh.f];
  return finish([
   `${owner} had a collection of ${things}. She gave ${sh.p}/${sh.q} of them to her sister.`,
   `She shared all the rest among ${friends[0]}, ${friends[1]} and ${friends[2]} in the ratio ${x}:${y}:${z}.`,
   `Her sister had ${diff} more ${things} than ${named}.`,
  ],`(a) How many ${things} did ${owner} give to her sister? (b) How many ${things} did ${owner} have at first?`,
  JSON.stringify([String(give),String(total)]),
  'Measure the sister’s share in the same ratio parts as the friends’ shares.',[
   {text:`The friends together have ${rest} out of ${sh.q} equal parts. They share ${sum} ratio parts, so one fraction part is worth ${per} ratio parts.`,equation:`${sum} ÷ ${rest} = ${per}`},
   {text:'Find the sister’s share in ratio parts.',equation:`${sh.p} × ${per} = ${sh.S} parts`},
   {text:`Find how many parts more the sister had than ${named}.`,equation:`${sh.S} − ${rf} = ${sh.S-rf} parts`},
   {text:'Find the value of one part.',equation:`${diff} ÷ ${sh.S-rf} = ${u}`},
   {text:'(a) Find the number given to the sister.',equation:`${sh.S} × ${u} = ${give}`},
   {text:'(b) Add the sister’s parts and the friends’ parts, then find the total.',equation:`(${sh.S} + ${sum}) × ${u} = ${total}`},
  ],{structuredResponse:{kind:'number-fields',fields:[{label:`(a) Given to sister (${things})`},{label:`(b) At the start (${things})`}]}});
 }

 // One person gives to the other; the total, starting ratio and final gap are known.
 let a=0,b=0;
 do{b=r.int(1,5);a=b+r.int(1,4);}while(gcd(a,b)!==1);
 const u=r.int(4,30),gap=(a-b)*u,low=Math.floor(gap/2)+1,t=r.int(low,Math.min(a*u-1,low+u)),D=2*t-gap,T=(a+b)*u;
 const [n1,n2,thing]=r.pick(PAIRS);
 return finish([
  `${n1} and ${n2} had ${T} ${thing} altogether.`,
  `At first, the ratio of ${n1}'s ${thing} to ${n2}'s ${thing} was ${a}:${b}.`,
  `${n1} gave some ${thing} to ${n2}. Then ${n2} had ${D} more ${thing} than ${n1}.`,
 ],`How many ${thing} did ${n1} give to ${n2}?`,String(t),
 'Giving away some changes the gap between the two people by twice the amount given.',[
  {text:'Find the value of one unit.',equation:`${T} ÷ ${a+b} = ${u}`},
  {text:`At first, ${n1} had more than ${n2}.`,equation:`(${a} − ${b}) × ${u} = ${gap}`},
  {text:`The gap went from ${n1} ahead by ${gap} to ${n2} ahead by ${D}. Add the two sizes to find the swing.`,equation:`${gap} + ${D} = ${gap+D}`},
  {text:'The gift is taken from one person and given to the other, so the swing is two gifts.',equation:`${gap+D} ÷ 2 = ${t}`},
 ],{unit:thing});
}
