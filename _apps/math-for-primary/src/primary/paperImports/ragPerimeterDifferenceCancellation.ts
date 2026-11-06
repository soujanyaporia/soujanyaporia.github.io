import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id: 'p5-perimeter-difference-cancellation',
 level: 5,
 title: 'Perimeter difference by cancellation',
 objective: 'Cancel shared boundaries to compare perimeters, then use the solved lengths to find a missing side or the area of a shaded triangle.',
 skillIds: ['P3.S.AREA.02','P4.S.AREA.01','P4.S.AREA.02','P5.S.AREA.02','P5.S.AREA.03'],
 canonicalPatternId: 'p5-perimeter-difference-cancellation',
};

type Step={text:string;equation?:string};

const finish=(key:string,prompt:string,context:string[],answer:number,unit:string,hint:string,steps:Step[]):Question=>({
 key,prompt,context,answer:String(answer),unit,hint,workedSteps:steps,
 explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
});

/** Three original variants, chosen from seed and index. Figures are described in words because
 * the current picture types cannot draw a curved cut or a labelled joined-rectangle arrangement. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const key=`rag-${RAG_PATTERN.id}:${seed}:${index}`;
 const variant=(((Math.trunc(seed)+index)%3)+3)%3;

 if(variant===0){
  const s=r.int(12,40),rt=r.int(2,Math.floor(s/2)),st=s-rt,far=r.chance(.5);
  const steps:Step[]=[
   {text:'Both parts have the same curved line in their boundary, so it cancels when the two perimeters are compared.'},
   {text:far?'Find how far T is from R.':'Find how far T is from S.',equation:far?`RT = ${s} − ${st} = ${rt}`:`ST = ${s} − ${rt} = ${st}`},
   {text:'Add the straight edges of part X.',equation:`PS + ST = ${s} + ${st} = ${s+st}`},
   {text:'Add the straight edges of part Y.',equation:`PQ + QR + RT = ${s} + ${s} + ${rt} = ${2*s+rt}`},
   {text:'Subtract to compare the perimeters.',equation:`${2*s+rt} − ${s+st} = ${2*rt}`},
  ];
  return finish(key,'How many centimetres longer is the perimeter of Y than the perimeter of X?',[
   `Square PQRS has sides of ${s} cm. P is the top-left corner, Q the top-right, R the bottom-right and S the bottom-left.`,
   'A curved line joins corner P to a point T on side SR. It cuts the square into part X, which touches corner S, and part Y, which touches corners Q and R. The curved line is part of the boundary of both parts.',
   far?`ST = ${st} cm.`:`RT = ${rt} cm.`,
  ],2*rt,'cm','The curved line is in both perimeters. Cancel it, then compare only the straight edges that are left.',steps);
 }

 const s=2*r.int(10,24),w=2*r.int(2,Math.floor(s/4));
 const lo=Math.max(4,Math.floor(s*w/(s+w))+1),h=r.int(lo,s-2),d=4*s-2*(w+h);
 const rectPerimeter=4*s-d,half=rectPerimeter/2;
 const context=[
  `KLMN is a square with sides of ${s} cm. K is the top-left corner, L the top-right, M the bottom-right and N the bottom-left.`,
  `NPQR is a rectangle joined to the left of the square. P is to the left of N on the line MN extended, Q is directly above P, and R is on side NK. NP = ${w} cm.`,
  `The perimeter of square KLMN is ${d} cm longer than the perimeter of rectangle NPQR.`,
 ];
 const sideSteps:Step[]=[
  {text:'Find the perimeter of the square.',equation:`4 × ${s} = ${4*s}`},
  {text:'The rectangle’s perimeter is shorter by the given difference.',equation:`${4*s} − ${d} = ${rectPerimeter}`},
  {text:'Half the rectangle’s perimeter is its length plus its width.',equation:`${rectPerimeter} ÷ 2 = ${half}`},
  {text:'Take away NP to find PQ.',equation:`${half} − ${w} = ${h}`},
 ];
 if(variant===1){
  return finish(key,'What is the length of PQ?',context,h,'cm','Find the rectangle’s perimeter first. Half of it is NP + PQ.',sideSteps);
 }
 const k=s-h,big=s*s/2,t1=k*w/2,t2=s*k/2,area=big-t1-t2;
 const steps:Step[]=[
  ...sideSteps,
  {text:'NR = PQ, so find KR on side NK.',equation:`KR = ${s} − ${h} = ${k}`},
  {text:'Draw PK. Triangle PKL has base KL and its height is the distance from P up to line KL.',equation:`${s} × ${s} ÷ 2 = ${big}`},
  {text:'Cut off triangle PKR. Its base is KR and its height is NP.',equation:`${k} × ${w} ÷ 2 = ${t1}`},
  {text:'Cut off triangle RKL. Its base is KL and its height is KR.',equation:`${s} × ${k} ÷ 2 = ${t2}`},
  {text:'The shaded triangle PRL is what remains.',equation:`${big} − ${t1} − ${t2} = ${area}`},
 ];
 return finish(key,'What is the area of the shaded triangle PRL?',[...context,'The straight lines PR, RL and PL are drawn to make triangle PRL, which is shaded.'],area,'cm²','Find PQ first. Then take the big triangle PKL and cut away the two unshaded triangles.',steps);
}
