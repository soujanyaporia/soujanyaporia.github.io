import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';

/** Original cube-counting questions. The plan view states each column height, so hidden cubes are explicit. */
export const RAG_PATTERN={
 id:'rag-count-cubes-assembly',
 level:6,
 title:'Count cubes in a stacked solid',
 objective:'Count every cube in a stacked solid, including hidden ones, then find its volume or compare two solids.',
 skillIds:['P5.S.VOL.01','P5.S.VOL.03'],
 canonicalPatternId:'p6-count-cubes-in-assembly',
};

type Mark={kind:'path';d:string;fill?:string}|{kind:'text';x:number;y:number;text:string};
const mod=(a:number,n:number)=>((a%n)+n)%n;
const sum=(g:number[][])=>g.reduce((a,row)=>a+row.reduce((b,n)=>b+n,0),0);

function plan(heights:number[][],ox:number,oy:number,size:number,title:string):Mark[]{
 const marks:Mark[]=[{kind:'text',x:ox,y:oy-12,text:title}];
 heights.forEach((row,i)=>row.forEach((n,j)=>{
  const x=ox+j*size,y=oy+i*size;
  marks.push({kind:'path',d:`M ${x} ${y} h ${size} v ${size} h ${-size} Z`,fill:n?'#dcefe6':'#f3f3f3'});
  marks.push({kind:'text',x:x+size/2-4,y:y+size/2+5,text:String(n)});
 }));
 return marks;
}

const figure=(label:string,marks:Mark[])=>({type:'batch11-upper',label,marks}) as unknown as Picture;
const describe=(g:number[][])=>g.map((row,i)=>`row ${i+1}: ${row.join(', ')}`).join('; ');

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-count-cubes:${seed}:${index}`));
 const variant=(mod(seed,4)+mod(index,4))%4;
 const rows=r.int(2,3),cols=r.int(3,4);
 const grid=()=>Array.from({length:rows},()=>Array.from({length:cols},()=>r.int(1,5)));
 const rowSteps=(g:number[][])=>g.map((row,i)=>({text:`Row ${i+1}: ${row.join(' + ')} = ${sum([row])} cubes.`}));
 const key=`rag-count-cubes:${seed}:${index}`;
 const intro='A solid is built by stacking cubes in columns on a table. The plan shows how many cubes are in each column, including the cubes you cannot see under the top ones.';

 if(variant===2){
  const x=grid();
  let y=x.map(row=>row.map(n=>r.int(0,n)));
  for(let tries=0;tries<200&&(sum(y)===sum(x)||sum(y)===0);tries++)y=x.map(row=>row.map(n=>r.int(0,n)));
  if(sum(y)===sum(x))y[0][0]=x[0][0]-1;
  if(sum(y)===0)y[0][0]=1;
  const a=sum(x),b=sum(y),answer=a-b;
  return {key,context:['Figure X and Figure Y are built from 1-cm cubes stacked in columns. Each plan shows how many cubes are in each column. A 0 means that column is empty.'],prompt:'How many cubes must be removed from Figure X to form Figure Y?',answer:String(answer),unit:'cubes',
   hint:'Count all the cubes in each figure first. Then find how many fewer cubes Figure Y has.',
   explanation:`Figure X has ${a} cubes and Figure Y has ${b} cubes. ${a} − ${b} = ${answer}.`,
   picture:figure(`Two plan views. Figure X columns: ${describe(x)}. Figure Y columns: ${describe(y)}.`,[...plan(x,14,50,28,'Figure X'),...plan(y,174,50,28,'Figure Y')]),
   workedSteps:[...rowSteps(x).map(s=>({text:`Figure X, ${s.text}`})),{text:`Figure X has ${a} cubes.`},...rowSteps(y).map(s=>({text:`Figure Y, ${s.text}`})),{text:`Figure Y has ${b} cubes.`},{text:`Cubes removed: ${a} − ${b} = ${answer}.`}]};
 }

 const g=grid(),count=sum(g);
 const picture=figure(`Plan view of a stacked solid. Cubes in each column: ${describe(g)}.`,plan(g,70,50,36,'Top view'));
 const steps=[...rowSteps(g),{text:`Total number of cubes: ${count}.`}];
 if(variant===0){
  const v=r.pick([2,3,4,5,6,10]),answer=count*v;
  return {key,context:[intro,`Each small cube has a volume of ${v} cm³.`],prompt:'What is the volume of the whole solid?',answer:String(answer),unit:'cm³',
   hint:'Count every cube first. Then multiply by the volume of one cube.',
   explanation:`There are ${count} cubes. ${count} × ${v} = ${answer} cm³.`,picture,workedSteps:[...steps,{text:`Volume = ${count} × ${v} = ${answer} cm³.`}]};
 }
 if(variant===1){
  const e=r.pick([2,3,4,5]),one=e*e*e,answer=count*one;
  return {key,context:[intro,`Each small cube has edges of ${e} cm.`],prompt:'What is the volume of the whole solid?',answer:String(answer),unit:'cm³',
   hint:'Find the volume of one cube from its edge. Then multiply by the number of cubes.',
   explanation:`One cube has volume ${e} × ${e} × ${e} = ${one} cm³. ${count} × ${one} = ${answer} cm³.`,picture,workedSteps:[...steps,{text:`One cube: ${e} × ${e} × ${e} = ${one} cm³.`},{text:`Volume = ${count} × ${one} = ${answer} cm³.`}]};
 }
 return {key,context:[intro,'Each small cube is a 1-cm cube.'],prompt:'Find the volume of the solid.',answer:String(count),unit:'cm³',
  hint:'Each 1-cm cube has volume 1 cm³. Count all the cubes, including hidden ones.',
  explanation:`There are ${count} cubes, so the volume is ${count} cm³.`,picture,workedSteps:[...steps,{text:`Each cube is 1 cm³, so the volume is ${count} cm³.`}]};
}
