import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

/** Original generator: perimeters of figures built from quarter-circles and exposed straight sides. */
export const RAG_PATTERN={
 id:'p6-rag-quadrant-composite-boundaries',
 level:6,
 title:'Perimeter of figures made with quarter-circles',
 objective:'Find the perimeter of a composite figure by adding quarter-circle arcs and exposed straight sides, deriving radii from the given lengths.',
 skillIds:['P6.S.CIRCLE.02','P6.S.CIRCLE.03'],
 canonicalPatternId:'p6-quadrant-composite-boundaries',
};

const line=(x1:number,y1:number,x2:number,y2:number):Batch11UpperMark=>({kind:'line',x1,y1,x2,y2});
const text=(x:number,y:number,t:string):Batch11UpperMark=>({kind:'text',x,y,text:t});
const path=(d:string,fill?:string):Batch11UpperMark=>({kind:'path',d,fill});
const fig=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;

type Step={text:string;equation:string};

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-quadrant-composite-boundaries:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%3;
 const k=r.int(1,6),unit=r.pick(['cm','m']);
 const key=`rag-p6-quadrant-composite-boundaries:${seed}:${index}`;
 const make=(context:string[],prompt:string,answer:number,hint:string,steps:Step[],picture:Picture):Question=>({
  key,context,prompt,answer:String(answer),unit,hint,
  explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),
  workedSteps:steps,picture,
 });
 if(variant===0){
  const rad=7*k;
  return make(
   [`Three identical quarter-circles are joined to make the figure shown. Each quarter-circle has radius ${rad} ${unit}.`,'The lines inside the figure are not part of its perimeter. Take π = 22/7.'],
   'Find the perimeter of the whole figure.',
   47*k,
   'Walk round the outside. Count the curved arcs and the straight edges that are not shared.',
   [
    {text:'There are three curved arcs. Each is one quarter of a circle.',equation:`3 × ¼ × 2 × 22/7 × ${rad} = ${33*k} ${unit}`},
    {text:'Two straight edges on the outside are each as long as the radius.',equation:`2 × ${rad} = ${14*k} ${unit}`},
    {text:'Add the curves and the straight edges.',equation:`${33*k} + ${14*k} = ${47*k} ${unit}`},
   ],
   fig(`Three identical quarter-circles of radius ${rad} ${unit}: two side by side on top and one below the left one, meeting at straight edges.`,[
    path('M 90 100 A 70 70 0 0 1 160 30 L 230 30 A 70 70 0 0 1 160 100 A 70 70 0 0 1 90 170 Z','#dcefe6'),
    line(160,30,160,100),line(90,100,160,100),
    text(172,24,`${rad} ${unit}`),text(28,140,`${rad} ${unit}`),
   ]),
  );
 }
 if(variant===1){
  const s=14*k,rad=7*k;
  return make(
   [`A square has side ${s} ${unit}. A quarter-circle of radius half the side is cut out of two opposite corners, with each centre at its corner.`,'The shaded part is what is left. Take π = 22/7.'],
   'Find the perimeter of the shaded part.',
   50*k,
   'Find the radius first. Then see how much straight edge is left on each side of the square.',
   [
    {text:`The radius is half of ${s} ${unit}.`,equation:`${s} ÷ 2 = ${rad} ${unit}`},
    {text:'Two quarter-circle arcs make half a circle.',equation:`2 × ¼ × 2 × 22/7 × ${rad} = ${22*k} ${unit}`},
    {text:`Each side of the square keeps a straight part equal to the radius, so there are 4 straight parts.`,equation:`4 × ${rad} = ${28*k} ${unit}`},
    {text:'Add the curves and the straight parts.',equation:`${22*k} + ${28*k} = ${50*k} ${unit}`},
   ],
   fig(`A square of side ${s} ${unit} with a quarter-circle of half that radius removed from the top left and bottom right corners. The rest is shaded.`,[
    path('M 160 20 L 240 20 L 240 100 A 80 80 0 0 0 160 180 L 80 180 L 80 100 A 80 80 0 0 0 160 20 Z','#dcefe6'),
    path('M 80 20 H 240 V 180 H 80 Z'),
    text(144,15,`${s} ${unit}`),
   ]),
  );
 }
 const side=7*k,width=14*k;
 return make(
  ['A square and a quarter-circle are joined along one side of the square. The quarter-circle has its centre at the bottom right corner of the square, and its radius is equal to the side of the square.',`The whole figure is ${width} ${unit} wide along its bottom edge. Take π = 22/7.`],
  'Find the perimeter of the whole figure.',
  39*k,
  'The bottom edge covers the square and the radius. Do not count the side where the two shapes join.',
  [
   {text:`The bottom edge is the side plus the radius, so the side and radius are each half of ${width} ${unit}.`,equation:`${width} ÷ 2 = ${side} ${unit}`},
   {text:'The curved arc is one quarter of a circle.',equation:`¼ × 2 × 22/7 × ${side} = ${11*k} ${unit}`},
   {text:'The straight boundary is the top side, the left side and the whole bottom edge.',equation:`${side} + ${side} + ${width} = ${28*k} ${unit}`},
   {text:'Add the curve and the straight boundary.',equation:`${11*k} + ${28*k} = ${39*k} ${unit}`},
  ],
  fig(`A square with a quarter-circle attached on its right side. The whole bottom edge measures ${width} ${unit}.`,[
   path('M 60 60 L 140 60 A 80 80 0 0 1 220 140 L 60 140 Z','#dcefe6'),
   line(140,60,140,140),
   text(112,165,`${width} ${unit}`),
  ]),
 );
}
