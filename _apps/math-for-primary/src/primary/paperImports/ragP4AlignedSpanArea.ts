import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p4-aligned-span-rectangle-area',
 level:4,
 title:'Find a rectangle from aligned edges',
 objective:'Use aligned edges, a square side and a marked span to find both sides of a rectangle, then find its area.',
 skillIds:['P4.S.AREA.01','P4.S.AREA.02','P3.S.AREA.03'],
 canonicalPatternId:'p4-rectangle-area-from-aligned-spans',
};

/** Three text-described figure variants; the variant is chosen from seed and index. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const variant=(((Math.trunc(seed)+Math.trunc(index))%3)+3)%3;
 if(variant===0){
  const side=r.int(3,9),above=r.int(2,10),width=r.int(3,12)===side+above?13:r.int(3,12);
  const height=side+above,w=width===height?width+1:width,area=w*height;
  return {key,
   context:[
    'A figure is made from square A and rectangle B. They stand on the same flat bottom line, with A touching the right side of B.',
    `Square A has side ${side} cm. Rectangle B is ${w} cm wide.`,
    `The top of A meets the right side of B, leaving ${above} cm of B's right side above A.`,
   ],
   prompt:'What is the area of rectangle B?',answer:String(area),unit:'cm²',
   hint:'Find how tall rectangle B is. Its right side is made of the part above A and the side of A.',
   explanation:`B is ${above} + ${side} = ${height} cm tall. Area = ${w} × ${height} = ${area} cm².`,
   workedSteps:[
    {text:`Height of B = part above A + side of A = ${above} + ${side} = ${height} cm.`},
    {text:`Area of B = width × height = ${w} × ${height} = ${area} cm².`},
   ]};
 }
 if(variant===1){
  const total=r.int(8,20),top=r.int(2,total-3),width=r.int(10,30)+(total===r.int(0,0)?1:0);
  const shadedHeight=total-top,area=width*shadedHeight;
  return {key,
   context:[
    `A rectangle is ${width} cm wide and ${total} cm tall.`,
    `One straight line across the whole width cuts it into a top part and a bottom part. The top rectangle is ${top} cm tall.`,
    'The bottom rectangle is shaded.',
   ],
   prompt:'What is the area of the shaded rectangle?',answer:String(area),unit:'cm²',
   hint:'The shaded rectangle is as wide as the whole figure. Take the top part away from the total height.',
   explanation:`The shaded height is ${total} − ${top} = ${shadedHeight} cm. Area = ${width} × ${shadedHeight} = ${area} cm².`,
   workedSteps:[
    {text:`Shaded height = ${total} − ${top} = ${shadedHeight} cm.`},
    {text:`The shaded rectangle is ${width} cm wide.`},
    {text:`Area = ${width} × ${shadedHeight} = ${area} cm².`},
   ]};
 }
 const n=r.int(2,3),side=r.int(4,15),span=(n+1)*side,length=n*side,area=length*side;
 return {key,
  context:[
   `${n} identical squares are stacked in one column. A shaded rectangle is joined to the right of the top square. The rectangle's top and bottom edges line up with the top and bottom edges of the top square.`,
   'The rectangle is as long as the whole column is tall.',
   `The top edge of the whole figure, from the far left to the far right, is ${span} cm long.`,
  ],
  prompt:'What is the area of the shaded rectangle?',answer:String(area),unit:'cm²',
  hint:`The top edge is one square side plus the rectangle's length. The rectangle's length equals ${n} square sides.`,
  explanation:`The top edge is 1 + ${n} = ${n+1} square sides, so one side is ${span} ÷ ${n+1} = ${side} cm. The rectangle is ${length} cm by ${side} cm, so its area is ${area} cm².`,
  workedSteps:[
   {text:`Top edge = 1 square side + ${n} square sides = ${n+1} sides.`},
   {text:`One square side = ${span} ÷ ${n+1} = ${side} cm.`},
   {text:`Rectangle length = ${n} × ${side} = ${length} cm; its height is ${side} cm.`},
   {text:`Area = ${length} × ${side} = ${area} cm².`},
  ]};
}
