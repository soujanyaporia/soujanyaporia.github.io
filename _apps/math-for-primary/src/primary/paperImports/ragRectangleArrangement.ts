import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'rectangle-arrangement-equations',
 level:5,
 title:'Rectangle arrangements and matching spans',
 objective:'Use matching lengths in two arrangements of identical rectangles to find a width, length, gap or height.',
 skillIds:['P4.S.DEC.05','P4.S.DEC.06'],
 canonicalPatternId:'p5-rectangle-arrangement-equations',
};

/** Lengths are held in half-centimetres so every value is exact; this shows them in cm. */
const cm=(half:number)=>Number((half/2).toFixed(1)).toString();

/**
 * Four text-only variants, chosen from seed and index. Every given is stated in words,
 * including which side of a tile or book lies along an edge.
 */
export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(((Math.floor(seed)+index)%4)+4)%4;
 const key=`rag-rectangle-arrangement:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const build=(context:string[],prompt:string,answerHalf:number,hint:string,steps:[string,string?][]):Question=>({
  key,context,prompt,answer:cm(answerHalf),unit:'cm',hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),
  explanation:steps.map(s=>s.join(' ')).join(' '),
 });

 if(variant===0){
  // Same edge length written two ways: a lengths = b lengths + c widths.
  const d=r.int(1,3),c=r.int(d+1,d+3),b=r.int(1,3),a=b+d,q=r.int(2,9);
  const widthHalf=d*q,lengthHalf=c*q;
  return build([
   `All the tiles are the same size. Each tile is ${cm(lengthHalf)} cm long.`,
   'A flat tile shows its length along an edge. A standing tile shows its width along an edge.',
   `The top edge of a frame is covered by ${a} flat tiles, end to end.`,
   `The bottom edge of the frame has the same length. It is covered by ${b} flat ${b===1?'tile':'tiles'} and ${c} standing tiles, end to end.`,
  ],'What is the width of one tile? Give your answer in centimetres.',widthHalf,
  'Both edges are equally long. Take away the flat tiles that both edges share.',[
   [`The two edges are equally long.`,`${a} lengths = ${b} lengths + ${c} widths`],
   [`Take away ${b} ${b===1?'length':'lengths'} from both sides.`,`${d} ${d===1?'length':'lengths'} = ${c} widths`],
   [`Find the total of the lengths.`,`${d} × ${cm(lengthHalf)} = ${cm(d*lengthHalf)} cm`],
   [`Share it among the widths.`,`${cm(d*lengthHalf)} ÷ ${c} = ${cm(widthHalf)} cm`],
  ]);
 }

 if(variant===1){
  // Two stacks reach the same box height; stack 1 gives the width, stack 2 gives the length.
  const m=r.int(1,3),widthHalf=r.int(4,12),lengthHalf=r.int(widthHalf+2,widthHalf*3);
  const heightHalf=m*widthHalf+lengthHalf,n1=Math.ceil(heightHalf/widthHalf)-1,gapHalf=heightHalf-n1*widthHalf;
  return build([
   'All the blocks are the same size. Each block is longer than it is wide.',
   'A flat block is as high as its width. An upright block is as high as its length.',
   `Two stacks of blocks stand side by side inside a box that is ${cm(heightHalf)} cm high.`,
   `Stack 1 has ${n1} blocks lying flat, one on top of another. There is a gap of ${cm(gapHalf)} cm between the top of the stack and the top of the box.`,
   `Stack 2 has ${m} ${m===1?'block':'blocks'} lying flat, with one block standing upright on top of them. The upright block reaches exactly the top of the box.`,
  ],'What is the length of one block? Give your answer in centimetres.',lengthHalf,
  'Use stack 1 to find the width of a block first. Then use stack 2.',[
   [`Stack 1 is ${n1} widths high.`,`${n1} × width = ${cm(heightHalf)} − ${cm(gapHalf)} = ${cm(heightHalf-gapHalf)} cm`],
   [`Find one width.`,`${cm(heightHalf-gapHalf)} ÷ ${n1} = ${cm(widthHalf)} cm`],
   [`Stack 2 reaches the top of the box: ${m} ${m===1?'width':'widths'} and 1 length.`,`${m} × ${cm(widthHalf)} = ${cm(m*widthHalf)} cm`],
   [`Take the widths away from the box height.`,`${cm(heightHalf)} − ${cm(m*widthHalf)} = ${cm(lengthHalf)} cm`],
  ]);
 }

 // Shelf variants (2 = side gap after rearranging, 3 = shelf height).
 const k=r.int(3,6),thickHalf=r.int(5,12),u1=r.int(3,8),f1=r.int(1,3),g1=r.int(1,4);
 const n1=u1+f1*k,shelfHalf=thickHalf*n1+2*g1,lengthHalf=k*thickHalf;
 const books=(u:number)=>`${u} ${u===1?'book stands':'books stand'} upright`;
 const columns=(f:number)=>`${f} ${f===1?'column':'columns'} of ${k} flat books`;
 const common=[
  'All the books are the same size. Each book is longer than it is thick.',
  `A stack of ${k} flat books is exactly as tall as one book standing upright.`,
  `Standing books use their thickness along the shelf. A column of ${k} flat books uses one book length along the shelf.`,
  `The shelf is ${cm(shelfHalf)} cm long inside.`,
  `First arrangement: ${books(u1)} and ${columns(f1)} are placed in a row from one end of the shelf, leaving a gap of ${g1} cm at the other end.`,
 ];
 const sharedSteps:[string,string?][]=[
  [`A stack of ${k} flat books is as tall as one standing book, so one book length = ${k} thicknesses.`],
  [`The first arrangement uses ${u1} + ${f1} × ${k} thicknesses.`,`${u1} + ${f1*k} = ${n1} thicknesses`],
  [`The books fill the shelf except for the gap.`,`${cm(shelfHalf)} − ${g1} = ${cm(shelfHalf-2*g1)} cm`],
  [`Find one thickness.`,`${cm(shelfHalf-2*g1)} ÷ ${n1} = ${cm(thickHalf)} cm`],
 ];
 if(variant===2){
  const f2=r.int(1,f1),u2=f2===f1?r.int(1,u1-1):r.int(1,u1),n2=u2+f2*k,gapHalf=shelfHalf-thickHalf*n2;
  return build([
   ...common,
   `Second arrangement: ${books(u2)} and ${columns(f2)} are placed in a row from one end of the shelf.`,
  ],'In the second arrangement, how wide is the gap at the other end? Give your answer in centimetres.',gapHalf,
  'Change every book into thicknesses. Find one thickness from the first arrangement.',[
   ...sharedSteps,
   [`The second arrangement uses ${u2} + ${f2} × ${k} thicknesses.`,`${u2} + ${f2*k} = ${n2} thicknesses = ${n2} × ${cm(thickHalf)} = ${cm(thickHalf*n2)} cm`],
   [`Take the books from the shelf length.`,`${cm(shelfHalf)} − ${cm(thickHalf*n2)} = ${cm(gapHalf)} cm`],
  ]);
 }
 const topGap=r.int(2,6),heightHalf=lengthHalf+2*topGap;
 return build([
  ...common,
  `In the first arrangement, the tops of all the books are level, ${topGap} cm below the top of the shelf.`,
 ],'What is the height of the shelf? Give your answer in centimetres.',heightHalf,
 'The tallest books are one book length high. Find the length from the thickness.',[
  ...sharedSteps,
  [`One standing book is as tall as ${k} thicknesses.`,`${k} × ${cm(thickHalf)} = ${cm(lengthHalf)} cm`],
  [`Add the gap above the books.`,`${cm(lengthHalf)} + ${topGap} = ${cm(heightHalf)} cm`],
 ]);
}
