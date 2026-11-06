import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original equal-area tasks: recover a side of a square or rectangle, or a rectangle's perimeter. */
export const RAG_PATTERN={
 id:'p4-equal-area-rectangle-square',
 level:4,
 title:'Equal-area rectangles and squares',
 objective:'Use an equal-area statement to find a missing side or the perimeter of a rectangle or square.',
 skillIds:['P4.S.AREA.01','P3.S.AREA.03','P3.S.AREA.02'],
 canonicalPatternId:'p4-equal-area-rectangle-square-missing-dimension',
};

// Square side s and a whole-number breadth b with 2 <= b < s that divides s x s exactly.
const squarePairs:{s:number;b:number}[]=[];
for(const s of [4,6,8,9,10,12])for(let b=2;b<s;b++)if((s*s)%b===0)squarePairs.push({s,b});

// Two rectangles: P is p by q. Q has known side r that is neither of P's sides and divides the area exactly.
const rectanglePairs:{p:number;q:number;r:number}[]=[];
for(let p=3;p<=15;p++)for(let q=p+1;q<=15;q++)for(let r=2;r<=12;r++){
 const area=p*q;
 if(r!==p&&r!==q&&area%r===0&&area/r!==r&&area/r<=60)rectanglePairs.push({p,q,r});
}

const note='The shapes are not drawn to scale.';

function build(key:string,context:string[],prompt:string,answer:number,hint:string,steps:string[]):Question{
 return {key,context,prompt,answer:String(answer),unit:'cm',hint,explanation:steps.join(' '),workedSteps:steps.map(text=>({text}))};
}

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(((seed+index)%4)+4)%4;
 const key=`rag-p4-equal-area-rectangle-square:${seed}:${index}`;
 const r=new Rng(hashString(`${key}:numbers`));
 if(variant===0){
  const {s,b}=r.pick(squarePairs),l=s*s/b,area=l*b;
  return build(key,[`A rectangle is ${l} cm long and ${b} cm wide.`,`A square has the same area as the rectangle. ${note}`],'What is the side length of the square?',s,
   'Find the area of the rectangle first. Then think: which number multiplied by itself gives that area?',
   [`Area of the rectangle = ${l} × ${b} = ${area} cm².`,`The square also has an area of ${area} cm², so side × side = ${area}.`,`${s} × ${s} = ${area}, so the side of the square is ${s} cm.`]);
 }
 if(variant===1||variant===2){
  const {s,b}=r.pick(squarePairs),l=s*s/b,area=s*s,context=[`A square has sides of ${s} cm.`,`A rectangle is ${b} cm wide and has the same area as the square. ${note}`];
  if(variant===1)return build(key,context,'What is the perimeter of the rectangle?',2*(l+b),
   'First find the area of the square, then use it to find the rectangle’s length.',
   [`Area of the square = ${s} × ${s} = ${area} cm².`,`Length of the rectangle = ${area} ÷ ${b} = ${l} cm.`,`Perimeter = 2 × (${l} + ${b}) = ${2*(l+b)} cm.`]);
  return build(key,context,'What is the length of the rectangle?',l,
   'Find the area of the square. The rectangle has the same area, so divide it by the width.',
   [`Area of the square = ${s} × ${s} = ${area} cm².`,`The rectangle’s area is also ${area} cm², and its width is ${b} cm.`,`Length = ${area} ÷ ${b} = ${l} cm.`]);
 }
 const {p,q,r:known}=r.pick(rectanglePairs),area=p*q,missing=area/known;
 return build(key,[`Rectangle P is ${q} cm long and ${p} cm wide.`,`Rectangle Q has the same area as rectangle P. Rectangle Q is ${known} cm wide. ${note}`],'What is the length of rectangle Q?',missing,
  'Find the area of rectangle P. Rectangle Q has this area too, so divide by its known width.',
  [`Area of rectangle P = ${q} × ${p} = ${area} cm².`,`Rectangle Q also has an area of ${area} cm² and a width of ${known} cm.`,`Length of Q = ${area} ÷ ${known} = ${missing} cm.`]);
}
