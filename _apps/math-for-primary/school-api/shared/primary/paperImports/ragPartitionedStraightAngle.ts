import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';

export const RAG_PATTERN={
 id:'p6-partitioned-straight-angle',
 level:6,
 title:'Angles sharing a straight line',
 objective:'Subtract known angles from 180°, sharing the remainder equally when two angles match.',
 skillIds:['P5.S.ANGLE.01','P5.S.ANGLE.04'],
 canonicalPatternId:'p6-partitioned-straight-angle',
};

type Slot=number|'a';
type Step={text:string;equation?:string};
const calc=(op:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op,a,b});
const deg=(n:number)=>`${n}°`;
const total=(values:number[])=>values.reduce((a,b)=>a+b,0);
const sumProof=(values:number[]):Proof=>values.slice(1).reduce<Proof>((a,b)=>calc('+',a,b),values[0]);

function pickKnown(r:Rng,count:number,min:number,max:number,ok:(sum:number)=>boolean,fallback:number[]):number[]{
 for(let attempt=0;attempt<300;attempt++){
  const values=Array.from({length:count},()=>r.int(min,max));
  if(ok(total(values)))return values;
 }
 return fallback;
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-partitioned-straight-angle:${seed}:${index}`));
 const variant=((Math.trunc(seed)+index)%3+3)%3;
 const [left,vertex,right]=r.pick([['X','Y','Z'],['P','O','Q'],['L','M','N']]);
 let seq:Slot[]=[],answer=0,hint='',showRight=false,equal=false,proof:Proof=0;
 const steps:Step[]=[];

 if(variant===0){
  const count=r.int(2,3);
  const known=pickKnown(r,count,12,60,s=>180-s>=20&&180-s<=130,count===2?[40,50]:[30,35,40]);
  const sum=total(known);answer=180-sum;
  const at=r.int(0,count);
  seq=[...known];seq.splice(at,0,'a');
  hint='The angles along a straight line add up to 180°. Add the known angles, then take them away from 180°.';
  steps.push({text:'Add the angles you are given.',equation:`${known.join(' + ')} = ${sum}°`});
  steps.push({text:'All the angles on the straight line make 180°, so subtract the known total.',equation:`a = 180° − ${sum}° = ${answer}°`});
  proof=calc('-',180,sumProof(known));
 }else if(variant===1){
  let given=r.int(20,160);if(given===90)given=70;
  answer=180-given;
  seq=r.chance(.5)?[given,'a']:['a',given];
  hint='Two angles that share a straight line make 180°.';
  steps.push({text:'The two angles on the straight line add up to 180°.',equation:`a + ${given}° = 180°`});
  steps.push({text:'Subtract the given angle from 180°.',equation:`a = 180° − ${given}° = ${answer}°`});
  proof=calc('-',180,given);
 }else{
  equal=true;
  let known:number[];
  if(r.chance(.5)){
   showRight=true;
   known=r.shuffle([90,2*r.int(5,35)]);
  }else{
   const first=r.int(10,60);
   known=[first,first%2+2*r.int(5,30)];
  }
  const sum=total(known),remainder=180-sum;answer=remainder/2;
  seq=r.chance(.5)?['a',known[0],'a',known[1]]:[known[0],'a',known[1],'a'];
  hint='Take the known angles away from 180°. What is left is shared equally by the two angles marked a.';
  steps.push({text:showRight?'Add the right angle and the other given angle.':'Add the two given angles.',equation:`${known.join(' + ')} = ${sum}°`});
  steps.push({text:'The whole straight line is 180°, so find what is left for the two equal angles.',equation:`180° − ${sum}° = ${remainder}°`});
  steps.push({text:'The two angles marked a are equal, so halve the remainder.',equation:`a = ${remainder}° ÷ 2 = ${answer}°`});
  proof=calc('/',calc('-',180,sumProof(known)),2);
 }

 const labels=seq.map(s=>s==='a'?'a':deg(s));
 const picture:PaperPicture={
  type:'paper',layout:'bars',heading:'Angles along the straight line',caption:'Not drawn to scale.',
  rows:[{label:`${left}${vertex}${right}`,parts:seq.map((s,i)=>({size:s==='a'?answer:s,label:labels[i],tone:s==='a'?'orange' as const:'blue' as const}))}],
  totalLabel:'180°',unit:'°',
 };
 const context=[
  `${left}, ${vertex} and ${right} lie on a straight line. Rays from ${vertex} split the straight angle into smaller angles.`,
  `In order from ${left} to ${right}, the angles are ${labels.join(', ')}.`,
  ...(equal?['The two angles marked a are equal.']:[]),
  ...(showRight?['The angle marked 90° is a right angle.']:[]),
 ];
 const explanation=steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' ');
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  prompt:'Find the size of angle a.',
  context,
  answer:String(answer),
  unit:'°',
  hint,
  explanation,
  picture,
  workedSteps:steps.map(s=>({...s,picture})),
  proof,
 };
}
