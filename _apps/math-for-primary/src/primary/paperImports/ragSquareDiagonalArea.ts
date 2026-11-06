import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {circleSquareFigure,rectangleHolesFigure,squareDiagonalFigure,triangleEdgeFigure} from './ragSquareDiagonalFigures';

export const RAG_PATTERN={
 id:'p6-square-diagonal-area',
 level:6,
 title:'Square diagonals and right-angled isosceles triangles',
 objective:'Use a square diagonal, or right-angled isosceles triangles, to find the area of a square, a leftover region or a perimeter.',
 skillIds:['P5.S.AREA.02','P5.S.AREA.03','P6.S.CIRCLE.03'],
 canonicalPatternId:'p6-square-diagonal-triangular-area-relationships',
};

const fmt=(n:number)=>Number(n.toFixed(4)).toString();

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-square-diagonal-area:${seed}:${index}`));
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const variant=(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%4;
 const make=(context:string[],prompt:string,answer:number,unit:string,hint:string,steps:{text:string;equation?:string}[],picture:Question['picture']):Question=>({
  key,context,prompt,answer:fmt(answer),unit,hint,
  workedSteps:steps,explanation:steps.map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' '),picture,
 });

 if(variant===0){
  const d=r.pick([6,8,10,12,14,16,18,20,24,30]),area=d*d/2;
  return make(
   [`ABCD is a square. Its diagonal AC is ${d} cm long.`],
   'Find the area of the square.',area,'cm²',
   'Draw the other diagonal. The two diagonals cut the square into equal triangles.',
   [
    {text:`Triangle ABC is half of the square. Its base AC is ${d} cm.`},
    {text:`The other diagonal crosses AC at right angles in the middle, so the height of triangle ABC is ${d} ÷ 2 = ${d/2} cm.`},
    {text:'The square is two such triangles, so half the diagonal squared gives its area.',equation:`2 × ½ × ${d} × ${d/2} = ${area} cm²`},
   ],
   squareDiagonalFigure(d));
 }

 if(variant===1){
  const d=r.pick([8,10,12,14,16,20,24,30]),rad=d/2,circle=314*rad*rad/100,square=d*d/2,answer=(314*rad*rad-50*d*d)/100;
  return make(
   ['A square is drawn inside a circle so that all four corners touch the circle.',`The diagonal of the square is ${d} cm and passes through the centre of the circle. Take π = 3.14.`],
   'Find the area inside the circle but outside the square.',answer,'cm²',
   'The diagonal of the square is also the diameter of the circle.',
   [
    {text:`The diameter is ${d} cm, so the radius is ${rad} cm.`},
    {text:'Find the area of the circle.',equation:`3.14 × ${rad} × ${rad} = ${fmt(circle)} cm²`},
    {text:'Find the area of the square from its diagonal.',equation:`½ × ${d} × ${d} = ${square} cm²`},
    {text:'Subtract the square from the circle.',equation:`${fmt(circle)} − ${square} = ${fmt(answer)} cm²`},
   ],
   circleSquareFigure(d));
 }

 if(variant===2){
  const holes=r.int(2,4),s=r.pick([4,6,8,10]),width=holes*s,height=s+2*r.int(0,3),answer=width*height-holes*s*s/2;
  return make(
   [`A rectangle is ${width} cm long and ${height} cm wide.`,`${holes} identical square holes are cut out. Each square has a diagonal of ${s} cm.`,'The diagonals lie end to end along the length of the rectangle, so the holes fit from one end to the other.'],
   'Find the area of the rectangle that is left after the holes are cut out.',answer,'cm²',
   'Find the area of one square from its diagonal. Then find the area of all the holes.',
   [
    {text:'Find the area of the whole rectangle.',equation:`${width} × ${height} = ${width*height} cm²`},
    {text:'One square hole has area half the diagonal squared.',equation:`½ × ${s} × ${s} = ${s*s/2} cm²`},
    {text:`All ${holes} holes together.`,equation:`${holes} × ${s*s/2} = ${holes*s*s/2} cm²`},
    {text:'Subtract the holes from the rectangle.',equation:`${width*height} − ${holes*s*s/2} = ${answer} cm²`},
   ],
   rectangleHolesFigure(width,height,holes,s));
 }

 const m=r.int(3,9),area=m*m,count=r.int(3,6),hyp=2*m,side=hyp*count,answer=4*side;
 return make(
  [`Right-angled isosceles triangles, each with an area of ${area} cm², are placed side by side along the top edge of a square.`,`Their longest sides lie on the edge. ${count} triangles cover the whole top edge exactly, with no gaps and no overlaps.`],
  'Find the perimeter of the square.',answer,'cm',
  'Four of these triangles fit together to make a square whose side is the triangle’s longest side.',
  [
   {text:`Four triangles make a square with area 4 × ${area} = ${4*area} cm².`},
   {text:`That square has side ${hyp} cm, because ${hyp} × ${hyp} = ${4*area}. This is the longest side of one triangle.`},
   {text:`The top edge of the big square is ${count} longest sides.`,equation:`${count} × ${hyp} = ${side} cm`},
   {text:'A square has four equal sides.',equation:`4 × ${side} = ${answer} cm`},
  ],
  triangleEdgeFigure(area,count));
}
