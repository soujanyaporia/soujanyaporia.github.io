import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id:'p5-axis-aligned-cube-packing',
 level:5,
 title:'Pack whole cubes into a cuboid',
 objective:'Find the greatest number of whole cubes that fit in a cuboid by dividing each side by the cube edge, rounding down and multiplying',
 skillIds:['P5.S.VOL.01','P5.S.VOL.03'],
 canonicalPatternId:'p5-axis-aligned-cube-packing',
} as const;

type Dims=[number,number,number];
const VARIANTS=3;

function makeDims(r:Rng,edge:number):Dims{
 for(let attempt=0;attempt<200;attempt++){
  const top=Math.min(40,9*edge);
  const dims=[r.int(2*edge,top),r.int(2*edge,top),r.int(2*edge,top)] as Dims;
  const counts=dims.map(d=>Math.floor(d/edge));
  const count=counts[0]*counts[1]*counts[2];
  if(dims.some(d=>d%edge!==0)&&count>=6&&count<=250)return dims;
 }
 return [4*edge+1,3*edge+1,2*edge];
}

/** One family, three deterministic wordings. All givens are stated in the text. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-cube-packing-v1:${seed}:${index}`));
 const variant=(((seed+index)%VARIANTS)+VARIANTS)%VARIANTS;
 const edge=r.pick([2,3,4,5]);
 const dims=makeDims(r,edge);
 const [length,width,height]=dims;
 const counts=dims.map(d=>Math.floor(d/edge)) as Dims;
 const answer=counts[0]*counts[1]*counts[2];
 const name=r.pick(['Mei','Ravi','Aisha','Ben']);
 let context:string[],prompt:string;
 if(variant===0){
  context=[`${name} has a wooden block that is ${length} cm long, ${width} cm wide and ${height} cm high.`,`Each cube has edges of ${edge} cm.`,'The cubes are cut with their edges parallel to the edges of the block. Only whole cubes count.'];
  prompt='What is the greatest number of cubes that can be cut from the block?';
 }else if(variant===1){
  context=[`${name} has a box that is ${length} cm long, ${width} cm wide and ${height} cm high inside.`,`Each cube has edges of ${edge} cm.`,'Every cube must fit completely inside the box, with its edges parallel to the edges of the box.'];
  prompt='What is the greatest number of cubes that can be put into the box?';
 }else{
  context=[`The base of a crate is ${length} cm by ${width} cm. The crate is ${height} cm high.`,`Each cube has edges of ${edge} cm.`,'The cubes are packed in neat rows, with edges parallel to the crate. No cube may stick out.'];
  prompt='What is the greatest number of cubes that can be packed into the crate?';
 }
 const steps:[string,string][]=[
  ['Count how many cubes fit along each side. Round down, because part of a cube does not count.',`${length} ÷ ${edge} → ${counts[0]}, ${width} ÷ ${edge} → ${counts[1]}, ${height} ÷ ${edge} → ${counts[2]}`],
  ['Multiply the three counts to find the layers, rows and cubes.',`${counts[0]} × ${counts[1]} × ${counts[2]} = ${answer}`],
 ];
 return {
  key:`rag-cube-packing:${seed}:${index}`,
  context,
  prompt,
  answer:String(answer),
  unit:'cubes',
  hint:'Divide each side by the cube edge and ignore any leftover part. Then multiply the three whole numbers.',
  workedSteps:steps.map(([text,equation])=>({text,equation})),
  explanation:steps.map(s=>`${s[0]} ${s[1]}.`).join(' '),
  picture:{type:'solid',shape:'cuboid',a:length,b:width,c:height},
 };
}
