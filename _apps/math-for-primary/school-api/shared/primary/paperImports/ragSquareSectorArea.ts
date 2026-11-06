import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN={
 id:'p6-square-and-sector-area',
 level:6,
 title:'Shaded area from a square and a circle or sector',
 objective:'Use the area of a square to find a radius, then add or subtract square, circle and sector areas',
 skillIds:['P6.S.CIRCLE.02','P6.S.CIRCLE.03'],
 canonicalPatternId:'p6-square-and-sector-area',
};

const line=(x1:number,y1:number,x2:number,y2:number):Batch11UpperMark=>({kind:'line',x1,y1,x2,y2});
const text=(x:number,y:number,t:string):Batch11UpperMark=>({kind:'text',x,y,text:t});
const path=(d:string,fill?:string):Batch11UpperMark=>({kind:'path',d,fill});
const circle=(cx:number,cy:number,r:number,fill:string):Batch11UpperMark=>({kind:'circle',cx,cy,r,fill});
const fig=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;
/** Whole cents to a decimal string. */
const fmt=(cents:number)=>String(cents/100);
const GREEN='#dcefe6';

/**
 * Variants (chosen from seed and index):
 * 0 square inscribed in a circle: shaded = circle - square
 * 1 circle inscribed in a square: shaded = square - circle
 * 2 square plus three-quarter circle: total area
 * 3 square OABC with centre O and A, C on the circle: shaded = square - quarter circle
 * All use pi = 3.14. Integer-cent arithmetic keeps the answers exact.
 */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+index)%4;
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const make=(context:string[],prompt:string,answerCents:number,hint:string,steps:string[],picture:Picture):Question=>({
  key,context,prompt,answer:fmt(answerCents),unit:'cm²',hint,workedSteps:steps.map(t=>({text:t})),explanation:steps.join(' '),picture,
 });
 if(variant===0){
  const radius=r.int(4,14),area=2*radius*radius,half=radius*radius,circleCents=314*half,ans=circleCents-100*area;
  return make(
   ['A square is drawn inside a circle so that all four corners of the square touch the circle.',`The area of the square is ${area} cm². Take π = 3.14.`],
   'Find the area of the shaded part, between the circle and the square.',ans,
   'The diagonals of the square meet at the centre. They split the square into 4 triangles, each with two sides equal to the radius.',
   [`Each of the 4 triangles has area ½ × r × r, so ${area} = 2 × r × r and r × r = ${area} ÷ 2 = ${half}.`,`Circle area = 3.14 × r × r = 3.14 × ${half} = ${fmt(circleCents)} cm².`,`Shaded area = ${fmt(circleCents)} − ${area} = ${fmt(ans)} cm².`],
   fig(`A circle with a square inside it. The four corners of the square touch the circle. The area between the circle and the square is shaded. The square has area ${area} square centimetres.`,[circle(160,100,80,GREEN),path('M 160 20 L 240 100 L 160 180 L 80 100 Z','white'),text(135,106,`${area} cm²`)]),
  );
 }
 if(variant===1){
  const side=r.pick([6,8,10,12,14,16,18,20]),area=side*side,radius=side/2,circleCents=314*radius*radius,ans=100*area-circleCents;
  return make(
   ['A circle fits exactly inside a square and touches all four sides of the square.',`The area of the square is ${area} cm². Take π = 3.14.`],
   'Find the area of the shaded part, inside the square but outside the circle.',ans,
   'Find the side of the square from its area. The circle touches opposite sides, so its diameter is the side.',
   [`The side of the square is √${area} = ${side} cm.`,`The diameter of the circle is ${side} cm, so its radius is ${radius} cm. Circle area = 3.14 × ${radius} × ${radius} = ${fmt(circleCents)} cm².`,`Shaded area = ${area} − ${fmt(circleCents)} = ${fmt(ans)} cm².`],
   fig(`A circle inside a square, touching all four sides. The corners of the square outside the circle are shaded. The square has area ${area} square centimetres.`,[path('M 80 20 H 240 V 180 H 80 Z',GREEN),circle(160,100,80,'white'),text(120,194,`${area} cm²`)]),
  );
 }
 if(variant===2){
  const side=r.pick([4,6,8,10,12,14]),area=side*side,sectorCents=area*2355/10,total=100*area+sectorCents;
  return make(
   ['A shape is made of a square and a three-quarter circle. The square fills the missing quarter of the circle exactly, so one corner of the square is the centre of the circle.',`The area of the square is ${area} cm². Take π = 3.14.`],
   'Find the area of the whole shape.',total,
   'The side of the square is the same as the radius of the circle, so r × r equals the area of the square.',
   [`The side of the square equals the radius, so r × r = ${area}.`,`Three-quarter circle = ¾ × 3.14 × ${area} = ${fmt(sectorCents)} cm².`,`Total area = ${area} + ${fmt(sectorCents)} = ${fmt(total)} cm².`],
   fig(`A square joined to a three-quarter circle. The centre of the circle is the top right corner of the square, and the square fills the missing quarter. The square has area ${area} square centimetres.`,[path('M 120 100 A 60 60 0 1 1 180 160 L 120 160 Z',GREEN),line(120,100,180,100),line(180,100,180,160),text(184,96,'O'),text(124,134,`${area} cm²`)]),
  );
 }
 const side=r.pick([4,6,8,10,12,14,16]),area=side*side,quarterCents=area*785/10,ans=100*area-quarterCents;
 return make(
  ['OABC is a square. O is the centre of a circle, and the corners A and C lie on the circle.',`The area of the square is ${area} cm². Take π = 3.14.`],
  'Find the area of the shaded part, inside the square but outside the circle.',ans,
  'OA and OC are radii of the circle, and they are also two sides of the square.',
  [`OA is a radius and a side of the square, so r × r = ${area}.`,`The part of the circle inside the square is a quarter circle: ¼ × 3.14 × ${area} = ${fmt(quarterCents)} cm².`,`Shaded area = ${area} − ${fmt(quarterCents)} = ${fmt(ans)} cm².`],
  fig(`Square OABC with O at the top left corner and the centre of a circle. A and C are on the circle. The region between the arc AC and corner B is shaded. The square has area ${area} square centimetres.`,[path('M 200 40 L 200 140 L 100 140 A 100 100 0 0 0 200 40 Z',GREEN),line(100,40,200,40),line(100,40,100,140),line(100,40,200,40),text(86,36,'O'),text(204,36,'A'),text(204,152,'B'),text(86,152,'C'),text(120,100,`${area} cm²`)]),
 );
}
