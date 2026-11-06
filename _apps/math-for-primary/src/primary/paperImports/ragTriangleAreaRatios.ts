import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'rag-p6-triangle-area-ratios',
 level:6,
 title:'Compare triangle areas using bases, heights and ratios',
 objective:'Compare triangles with base-times-height products or shared heights, then use the ratio to find a simplest-form ratio, a total area or an unshaded area.',
 skillIds:['P5.S.AREA.02','P6.S.RATIO.02','P6.S.RATIO.05'],
 canonicalPatternId:'p6-triangle-area-ratios',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const num=(v:number)=>String(Number(v.toFixed(4)));

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=(((Math.trunc(seed)+index)%4)+4)%4;
 const step=(text:string,equation?:string)=>equation?{text,equation}:{text};
 const finish=(q:Omit<Question,'key'|'explanation'>):Question=>({
  key,
  ...q,
  explanation:(q.workedSteps??[]).map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' '),
 });

 if(variant===0){
  const triples:[number,number,number][]=[[3,4,5],[5,12,13],[8,15,17]];
  const [half,rise,slope]=r.pick(triples);
  const k=r.int(1,3);
  const baseA=2*half*k,heightA=rise*k,slantA=slope*k;
  const x=r.int(2,12),y=r.int(2,12),baseB=x+y;
  let heightB=r.int(4,20);
  if(baseB*heightB===baseA*heightA)heightB+=1;
  const productA=baseA*heightA,productB=baseB*heightB,g=gcd(productA,productB);
  const a=productA/g,b=productB/g;
  return finish({
   context:[
    `Triangle A is isosceles. Its base is ${baseA} cm, its two equal sloping sides are ${slantA} cm each, and its perpendicular height is ${heightA} cm.`,
    `Triangle B has a base made of two parts in a straight line: ${x} cm and ${y} cm. Its perpendicular height is ${heightB} cm.`,
   ],
   prompt:'What is the ratio of the area of Triangle A to the area of Triangle B? Give it in simplest form as two whole numbers.',
   answer:JSON.stringify([String(a),String(b)]),
   structuredResponse:{kind:'number-pair',firstLabel:'Triangle A',secondLabel:'Triangle B'},
   hint:'Area of a triangle = ½ × base × perpendicular height. Sloping sides are not used.',
   workedSteps:[
    step('Use area = ½ × base × perpendicular height. Use the perpendicular heights, not the sloping sides.'),
    step('Triangle B has one whole base made by joining its two parts.',`Base of B = ${x} + ${y} = ${baseB} cm`),
    step('Compare the base × height products. Both areas use the same ½, so it cancels.',`${baseA} × ${heightA} = ${productA} and ${baseB} × ${heightB} = ${productB}`),
    step('Divide both numbers by their greatest common factor to simplify.',`${productA} : ${productB} = ${a} : ${b}`),
   ],
  });
 }

 if(variant===1){
  const pairs:[number,number][]=[[1,2],[2,1],[1,3],[3,1],[2,3],[3,2],[1,4],[4,1],[3,4],[4,3],[2,5],[5,2],[3,5],[5,3]];
  const [m,n]=r.pick(pairs);
  const t=r.int(2,9);
  const known=m*t,other=n*t,total=known+other;
  return finish({
   context:[
    'In triangle ABC, point D lies on side BC.',
    `BD : DC = ${m} : ${n}. The area of triangle ABD is ${known} cm².`,
   ],
   prompt:'Find the area of triangle ABC.',
   answer:num(total),
   unit:'cm²',
   hint:'Triangles ABD and ADC have the same height from A. Their areas are in the same ratio as their bases.',
   workedSteps:[
    step('Triangles ABD and ADC both have their top corner at A, so they share the same perpendicular height.'),
    step('With equal heights, the areas are in the same ratio as the bases.',`ABD : ADC = BD : DC = ${m} : ${n}`),
    step(`Triangle ABD is ${m} parts. Find the area of one part.`,`${known} ÷ ${m} = ${t} cm²`),
    step(`Triangle ADC is ${n} parts, so the whole triangle ABC is ${m+n} parts.`,`${m+n} × ${t} = ${total} cm²`),
   ],
  });
 }

 if(variant===2){
  const pairs:[number,number][]=[[1,1],[1,2],[2,1],[1,3],[3,1],[2,3],[3,2]];
  const [m,n]=r.pick(pairs);
  const t=r.int(2,9);
  const triangle=m*t,rectangle=2*(m+n)*t,unshaded=rectangle-triangle;
  return finish({
   context:[
    'ABCD is a rectangle and E is a point on side AD.',
    m===n?'E is the midpoint of AD, so DE = EA.':`DE : EA = ${m} : ${n}.`,
    `The area of triangle BED is ${triangle} cm².`,
   ],
   prompt:'Find the area of the part of the rectangle that is not in triangle BED.',
   answer:num(unshaded),
   unit:'cm²',
   hint:'Triangle BED has base DE on side AD, and its height is the side AB. Compare it with the whole rectangle.',
   workedSteps:[
    step('Triangle BED has base DE on side AD. The perpendicular distance from B to AD is the rectangle side AB.'),
    step(`DE is ${m} out of ${m+n} equal parts of AD. A triangle uses half of base × height, so its area is a fraction of the rectangle.`,`Triangle BED = ${m}/${2*(m+n)} of the rectangle`),
    step(`The triangle is ${m} parts and the rectangle is ${2*(m+n)} parts. Find one part, then the rectangle.`,`${triangle} ÷ ${m} = ${t}; ${2*(m+n)} × ${t} = ${rectangle} cm²`),
    step('Subtract the triangle from the rectangle to find the part outside the triangle.',`${rectangle} − ${triangle} = ${unshaded} cm²`),
   ],
  });
 }

 const products=[48,60,72,84,90,96,120,144,180];
 const M=r.pick(products);
 const divisors=Array.from({length:38},(_,i)=>i+3).filter(d=>M%d===0&&M/d>=3&&M/d<=40);
 const d1=r.pick(divisors);
 const others=divisors.filter(d=>d!==d1&&d!==M/d1);
 const d2=r.pick(others);
 const opt=(a:number,b:number)=>`base ${a} cm and perpendicular height ${b} cm`;
 const answer=opt(d2,M/d2);
 const options=new Set<string>([answer]);
 for(let tries=0;options.size<4&&tries<60;tries++){
  const d=r.pick(divisors),k=r.int(1,3),type=r.int(0,2);
  const pair:[number,number]=type===0?[d,M/d+k]:type===1?[d+k,M/d]:[d,Math.max(2,M/d-k)];
  if(pair[0]*pair[1]!==M)options.add(opt(pair[0],pair[1]));
 }
 for(let k=1;options.size<4;k++)options.add(opt(d1,M/d1+k));
 return finish({
  context:[`Triangle X has base ${d1} cm and perpendicular height ${M/d1} cm.`],
  prompt:'Which triangle has the same area as Triangle X?',
  answer,
  choices:r.shuffle([...options]),
  hint:'Equal triangle areas need equal base × perpendicular height products.',
  workedSteps:[
   step('Area = ½ × base × perpendicular height. Two triangles have equal areas when their base × height products are equal.'),
   step('Find the product for Triangle X.',`${d1} × ${M/d1} = ${M}`),
   step('Check each option. Only one has the same product.',`${d2} × ${M/d2} = ${M}`),
  ],
 });
}
