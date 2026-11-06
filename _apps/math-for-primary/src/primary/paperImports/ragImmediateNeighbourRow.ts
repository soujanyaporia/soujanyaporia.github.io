import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p1-immediate-neighbour-in-row',
 level:1,
 title:'Who is next to them in the row?',
 objective:'Use an ordinal position or a named reference to find the neighbour just after or just before it in a row.',
 skillIds:['P1.S.WN.06'],
 canonicalPatternId:'p1-immediate-neighbour-in-row',
} as const;

const NAMES=['Ava','Ben','Chen','Dina','Eli','Farah','Gus','Hana','Ivan','Jia','Kai','Lena'];
const SHAPES=['●','▲','■','★','◆','♥','✚','☾'];
const VARIANTS=['after-ordinal','after-named','before-named','after-shape'] as const;
const ORDINALS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
const suffix=(n:number)=>n===1?'st':n===2?'nd':n===3?'rd':'th';
const ordinal=(n:number)=>`${n}${suffix(n)}`;

/** Original Primary 1 neighbour-in-a-row questions. Four variants chosen from seed and index. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p1-immediate-neighbour:${seed}:${index}`));
 const variant=VARIANTS[(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%VARIANTS.length];
 const shapeRow=variant==='after-shape';
 const n=shapeRow?r.int(5,8):r.int(5,9);
 const row:string[]=[...r.shuffle(shapeRow?[...SHAPES]:[...NAMES])].slice(0,n);
 const dir=variant==='before-named'?-1:1;
 const ref=dir===1?r.int(0,n-2):r.int(1,n-1);
 const target=ref+dir,answer=row[target],refItem=row[ref];

 const near=[row[ref],row[ref-1],row[ref+1],row[target+dir]].filter((v,i,a):v is string=>v!==undefined&&v!==answer&&a.indexOf(v)===i);
 const others=[...r.shuffle(row.filter(v=>v!==answer&&!near.includes(v)))];
 const wrong=[...near,...others].slice(0,3);
 const choices=[...r.shuffle([answer,...wrong])];

 let prompt:string,context:string[],hint:string;
 const who=shapeRow?'shape':'child';
 if(variant==='after-ordinal'){
  prompt=`Who is just after the ${ordinal(ref+1)} child in the queue?`;
  context=['The picture shows a queue of children. The front of the queue is at the left.','Count from the front. “Just after” means the child right behind.'];
  hint=`Count ${ORDINALS[ref]} from the front, then move one place to the right.`;
 }else if(variant==='after-named'){
  prompt=`Who is just after ${refItem} in the queue?`;
  context=['The picture shows a queue of children. The front of the queue is at the left.','“Just after” means the child right behind.'];
  hint=`Find ${refItem} in the queue, then move one place to the right.`;
 }else if(variant==='before-named'){
  prompt=`Who is just before ${refItem} in the queue?`;
  context=['The picture shows a queue of children. The front of the queue is at the left.','“Just before” means the child right in front.'];
  hint=`Find ${refItem} in the queue, then move one place to the left.`;
 }else{
  prompt=`Which shape is just after the ${refItem} in the row?`;
  context=['Read the row from left to right.','“Just after” means the next shape on the right.'];
  hint=`Find the ${refItem}, then move one place to the right.`;
 }
 const side=dir===1?'right':'left';
 const steps=[
  {text:variant==='after-ordinal'?`Count to the ${ORDINALS[ref]} ${who} from the left.`:`Find ${shapeRow?'the ':''}${refItem} in the row.`,equation:`position ${ref+1}: ${refItem}`},
  {text:`Move one place to the ${side}.`,equation:`${ref+1} ${dir===1?'+':'−'} 1 = ${target+1}: ${answer}`},
 ];
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  prompt,context,
  answer,choices,hint,
  picture:{type:'pattern',items:row},
  workedSteps:steps,
  explanation:`${steps.map(s=>`${s.text} ${s.equation}`).join(' ')} The answer is ${answer}.`,
 };
}
