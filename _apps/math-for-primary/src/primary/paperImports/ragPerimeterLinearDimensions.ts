import {Rng,hashString} from '../../engine/random';
import type {Picture,Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-rag-linear-dimension-perimeters',
 level:6,
 title:'Linear dimension equations from perimeters',
 objective:'Turn related perimeters into sums and differences of lengths, find a side, then calculate the requested length or area',
 skillIds:['P6.S.ALG.02','P6.S.ALG.05','P6.S.CIRCLE.02','P6.S.CIRCLE.03'],
 canonicalPatternId:'p6-linear-dimension-equations-from-perimeters',
};

const VARIANTS=['two-squares','partition-square','semicircle-stage','rectangle-sum-difference'] as const;
type Mark={kind:'line';x1:number;y1:number;x2:number;y2:number}|{kind:'text';x:number;y:number;text:string}|{kind:'path';d:string;fill?:string};
const line=(x1:number,y1:number,x2:number,y2:number):Mark=>({kind:'line',x1,y1,x2,y2});
const text=(x:number,y:number,t:string):Mark=>({kind:'text',x,y,text:t});
const path=(d:string,fill?:string):Mark=>({kind:'path',d,...(fill?{fill}:{})});
const fig=(label:string,marks:Mark[])=>({type:'batch11-upper',label,marks}) as unknown as Picture;
const r1=(n:number)=>Number(n.toFixed(1));

export function makeRagQuestion(seed:number,index=0):Question{
 const s=Math.abs(Math.trunc(Number.isFinite(seed)?seed:0)),i=Math.abs(Math.trunc(Number.isFinite(index)?index:0));
 const variant=VARIANTS[(s+i)%VARIANTS.length];
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${variant}:${seed}:${index}`));
 const key=`${RAG_PATTERN.id}:${variant}:${seed}:${index}`;

 if(variant==='two-squares'){
  const a=r.int(3,25),e=r.int(1,8),b=a+e,diff=4*e,total=4*(a+b),sa=Math.max(24,Math.round(120*a/b));
  return {key,
   context:['Square A and Square B are drawn side by side. The side of Square A is m cm.',`The perimeter of Square B is ${diff} cm more than the perimeter of Square A.`,`The total perimeter of the two squares is ${total} cm.`],
   prompt:'Find m, the side of Square A, in centimetres.',
   answer:String(a),unit:'cm',
   hint:'Take the difference away from the total. What is left is two copies of the perimeter of Square A.',
   explanation:`Twice the perimeter of A is ${total} − ${diff} = ${total-diff} cm, so A has perimeter ${(total-diff)/2} cm and side ${a} cm.`,
   workedSteps:[
    {text:'If Square B had the same perimeter as A, the total would be smaller by the extra amount, so two equal squares remain.',equation:`${total} − ${diff} = ${total-diff} cm`},
    {text:'Share this equally between the two equal perimeters.',equation:`${total-diff} ÷ 2 = ${(total-diff)/2} cm`},
    {text:'A square has four equal sides.',equation:`m = ${(total-diff)/2} ÷ 4 = ${a} cm`},
   ],
   picture:fig('Two squares, A on the left and B on the right. The side of square A is marked m cm. The diagram is not drawn to scale.',[path(`M 40 ${170-sa} H ${40+sa} V 170 H 40 Z`),path('M 170 50 H 290 V 170 H 170 Z'),text(40,190,'Square A'),text(190,190,'Square B'),text(2,r1(170-sa/2),'m cm')]),
  };
 }

 if(variant==='partition-square'){
  const a=r.int(3,12),d=r.int(2,12),side=a+d,perimeter=4*side,x=r1(80+160*a/side),y=r1(20+160*a/side);
  return {key,
   context:['A square is cut into two smaller squares, A and D, and two rectangles, B and C. A is at the top left and D is at the bottom right.',`The total perimeter of rectangles B and C is ${perimeter} cm.`,`The area of square A is ${a*a} cm².`],
   prompt:'Find the area of square D.',
   answer:String(d*d),unit:'cm²',
   hint:'Each of B and C has a side equal to A and a side equal to D. Together, their perimeter is four times the side of the big square.',
   explanation:`The big square has side ${perimeter} ÷ 4 = ${side} cm. Square A has side ${a} cm, so D has side ${side} − ${a} = ${d} cm and area ${d*d} cm².`,
   workedSteps:[
    {text:'Rectangle B and rectangle C each have perimeter 2 × (side of A + side of D), which is 2 sides of the big square. Together they make 4 sides of the big square.',equation:`${perimeter} ÷ 4 = ${side} cm`},
    {text:'Find the side of square A from its area.',equation:`${a} × ${a} = ${a*a}, so A has side ${a} cm`},
    {text:'The side of D is what is left of the big side.',equation:`${side} − ${a} = ${d} cm`},
    {text:'Find the area of D.',equation:`${d} × ${d} = ${d*d} cm²`},
   ],
   picture:fig('A square cut by one vertical line and one horizontal line into square A (top left), rectangle B (top right), rectangle C (bottom left) and square D (bottom right). The diagram is not drawn to scale.',[path('M 80 20 H 240 V 180 H 80 Z'),line(x,20,x,180),line(80,y,240,y),text(r1((80+x)/2-4),r1((20+y)/2+4),'A'),text(r1((x+240)/2-4),r1((20+y)/2+4),'B'),text(r1((80+x)/2-4),r1((y+180)/2+4),'C'),text(r1((x+240)/2-4),r1((y+180)/2+4),'D')]),
  };
 }

 if(variant==='semicircle-stage'){
  const k=r.int(1,4),side=14*k,radius=7*k,stage=36*k,unshaded=64*k,area=77*k*k;
  return {key,
   context:['The shaded stage in a square hall ABCD is a semicircle. Its diameter is the side DC of the hall.',`The stage has a perimeter of ${stage} m.`,`The unshaded part of the hall has a perimeter of ${unshaded} m.`,'Take π = 22/7. The diagram is not drawn to scale.'],
   prompt:'Find the area of the stage in square metres.',
   answer:String(area),unit:'m²',
   hint:'Both perimeters contain the curved edge. Compare the straight sides that each one has.',
   explanation:`The unshaded perimeter has 3 straight sides and the curve; the stage has 1 straight side and the curve. The difference is 2 sides: ${unshaded} − ${stage} = ${unshaded-stage} m, so a side is ${side} m, the radius is ${radius} m and the area is ${area} m².`,
   workedSteps:[
    {text:'Subtract the perimeters. The curve cancels and two sides of the hall are left.',equation:`${unshaded} − ${stage} = ${unshaded-stage} m`},
    {text:'Find one side of the hall.',equation:`${unshaded-stage} ÷ 2 = ${side} m`},
    {text:'The side of the hall is the diameter of the stage, so halve it.',equation:`${side} ÷ 2 = ${radius} m`},
    {text:'Find the area of a semicircle.',equation:`1/2 × 22/7 × ${radius} × ${radius} = ${area} m²`},
   ],
   picture:fig('Square hall ABCD with A at top left, B at top right, C at bottom right and D at bottom left. A shaded semicircular stage sits on side DC and bulges into the hall. The diagram is not drawn to scale.',[path('M 100 20 H 220 V 140 H 100 Z'),path('M 100 140 A 60 60 0 0 1 220 140 Z','#dcefe6'),text(84,18,'A'),text(224,18,'B'),text(224,158,'C'),text(84,158,'D'),text(144,120,'stage')]),
  };
 }

 const q=r.int(2,9),w=r.int(3,20),len=w+q,perimeter=2*(w+len);
 return {key,
  context:[`A square has area ${q*q} cm².`,`A rectangle has perimeter ${perimeter} cm. Its length is longer than its width by the side of the square.`],
  prompt:'Find the length of the rectangle.',
  answer:String(len),unit:'cm',
  hint:'Half of the perimeter is length + width. The side of the square tells you length − width.',
  explanation:`Length + width = ${perimeter/2} cm and length − width = ${q} cm, so the length is (${perimeter/2} + ${q}) ÷ 2 = ${len} cm.`,
  workedSteps:[
   {text:'Find the side of the square from its area.',equation:`${q} × ${q} = ${q*q}, so the side is ${q} cm`},
   {text:'Half the perimeter is the length plus the width.',equation:`${perimeter} ÷ 2 = ${perimeter/2} cm`},
   {text:'The length is the larger of two numbers with this sum and difference. Add them and halve.',equation:`(${perimeter/2} + ${q}) ÷ 2 = ${len} cm`},
  ],
 };
}
