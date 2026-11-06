import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {GridDrawingPicture,GridSegment} from '../gridDrawingModel';

type Pt=[number,number];
type Kind='triangle'|'rectangle'|'parallelogram'|'trapezium'|'dart'|'hexagon'|'octagon'|'heptagon'|'nonagon';
interface Shape{kind:Kind;tessellates:boolean;points:Pt[];reason:string}

export const RAG_PATTERN={
 id:'p5-tessellation-capability',
 level:5,
 title:'Decide which shapes can be tessellated',
 objective:'Decide which straight-sided shapes can cover a flat surface with copies of themselves, leaving no gaps and no overlaps',
 skillIds:['P1.S.SHAPE.02','P5.S.SHAPE.02'],
 canonicalPatternId:'p5-determine-tessellation-capability',
};

const YES_KINDS:Kind[]=['triangle','rectangle','parallelogram','trapezium','dart','hexagon'];
const NO_KINDS:Kind[]=['octagon','heptagon','nonagon'];
const LETTERS=['A','B','C','D'];
const PITCH=8;
const NONE_LABEL='None of the shapes';
const ALL_LABEL='All four shapes';

const REASONS:Record<Kind,string>={
 triangle:'Copies of any triangle, turned round, fit together with no gaps.',
 rectangle:'Rectangles fit side to side in rows with no gaps.',
 parallelogram:'Parallelograms slide together in rows with no gaps.',
 trapezium:'Turned copies of a trapezium fit together in rows with no gaps.',
 dart:'Every four-sided shape tessellates: its four corners add up to 360°, so four corners can meet at one point.',
 hexagon:'Its opposite sides are equal and parallel, so copies fit together like a honeycomb with no gaps.',
 octagon:'It has 8 sides and no inward corners. A shape like that cannot be tessellated by itself, because gaps are left.',
 heptagon:'It has 7 sides and no inward corners. A shape like that cannot be tessellated by itself, because gaps are left.',
 nonagon:'It has 9 sides and no inward corners. A shape like that cannot be tessellated by itself, because gaps are left.',
};

function build(kind:Kind,r:Rng):Pt[]{
 switch(kind){
  case 'triangle':{const w=r.int(3,6),h=r.int(3,6),apex=r.int(0,w);return [[0,0],[w,0],[apex,h]];}
  case 'rectangle':{const w=r.int(2,6),h=r.int(2,6);return [[0,0],[w,0],[w,h],[0,h]];}
  case 'parallelogram':{const w=r.int(2,4),s=r.int(1,2),h=r.int(2,4);return [[0,0],[w,0],[w+s,h],[s,h]];}
  case 'trapezium':{const w=r.int(5,6),a=r.int(1,2),b=r.int(1,2),h=r.int(2,4);return [[0,0],[w,0],[w-a,h],[b,h]];}
  case 'dart':{const m=r.int(2,3),d=r.int(1,2),top=r.int(4,6);return [[0,0],[m,d],[2*m,0],[m,top]];}
  case 'hexagon':{const a=r.int(1,2),q=r.int(2,3),c=r.int(2,3);return [[a,0],[a+q,0],[2*a+q,c],[a+q,2*c],[a,2*c],[0,c]];}
  case 'octagon':{const a=r.int(1,2),q=a===2?2:r.int(2,4),h=a===2?2:r.int(2,4);return [[a,0],[a+q,0],[2*a+q,a],[2*a+q,a+h],[a+q,2*a+h],[a,2*a+h],[0,a+h],[0,a]];}
  case 'heptagon':return [[2,0],[5,0],[7,2],[7,4],[5,6],[2,6],[0,3]];
  case 'nonagon':return [[2,0],[4,0],[6,1],[7,3],[6,5],[4,6],[2,6],[0,4],[0,2]];
 }
}

/** Turn or flip the drawing so that repeated questions do not always show the same orientation. */
function orient(points:Pt[],r:Rng):Pt[]{
 const flipX=r.chance(.5),flipY=r.chance(.5),maxX=Math.max(...points.map(p=>p[0])),maxY=Math.max(...points.map(p=>p[1]));
 return points.map(([x,y])=>[flipX?maxX-x:x,flipY?maxY-y:y] as Pt);
}

function makeShape(kind:Kind,r:Rng):Shape{
 return {kind,tessellates:YES_KINDS.includes(kind),points:orient(build(kind,r),r),reason:REASONS[kind]};
}

function picture(shapes:Shape[]):GridDrawingPicture{
 const segments:GridSegment[]=[];
 shapes.forEach((shape,i)=>{
  const moved=shape.points.map(([x,y])=>[x+i*PITCH,y] as Pt);
  moved.forEach((p,k)=>segments.push([p,moved[(k+1)%moved.length]]));
 });
 return {type:'grid-drawing',columns:3*PITCH+7,rows:6,segments,caption:'Four shapes drawn on a grid'};
}

const joinLetters=(letters:string[])=>letters.join(' and ');

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p5-tessellation:${seed}:${index}`));
 const variant=r.int(0,2);
 const yesCount=variant===0?3:variant===1?2:1;
 const yesKinds=r.shuffle([...YES_KINDS] as Kind[]).slice(0,yesCount);
 const noKinds=r.shuffle([...NO_KINDS] as Kind[]).slice(0,4-yesCount);
 const shapes=r.shuffle([...yesKinds,...noKinds] as Kind[]).map(kind=>makeShape(kind,r));
 const yesLetters=shapes.flatMap((s,i)=>s.tessellates?[LETTERS[i]]:[]);
 const noLetters=shapes.flatMap((s,i)=>s.tessellates?[]:[LETTERS[i]]);
 const context=[
  'Shapes A, B, C and D are shown from left to right. Each one has straight sides.',
  'A shape can be tessellated if copies of that one shape, all the same size and turned or flipped as needed, can cover a flat surface with no gaps and no overlaps.',
 ];
 const key=`rag-p5-tessellation:${seed}:${index}`;
 const reasonLines=shapes.map((s,i)=>`${LETTERS[i]}: ${s.reason}`);
 const workedSteps=[...reasonLines.map(text=>({text})),{text:variant===0?`The shape that cannot be tessellated is ${noLetters[0]}.`:variant===2?`The only shape that can be tessellated is ${yesLetters[0]}.`:`The shapes that can be tessellated are ${joinLetters(yesLetters)}.`}];
 const common={key,context,picture:picture(shapes),workedSteps,explanation:workedSteps.map(s=>s.text).join(' ')};
 const hint='Test each shape: do turned copies fit together with no gaps? Every triangle and every four-sided shape does. A shape with many sides and no inward corners does not.';
 if(variant===0)return {...common,prompt:'Which one of the four shapes cannot be tessellated?',answer:noLetters[0],choices:[...LETTERS],hint};
 if(variant===2)return {...common,prompt:'Only one of the four shapes can be tessellated. Which one is it?',answer:yesLetters[0],choices:[...LETTERS],hint};
 const label=joinLetters(yesLetters);
 const pairs:string[]=[];
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const p=`${LETTERS[i]} and ${LETTERS[j]}`;if(p!==label)pairs.push(p);}
 const others=r.shuffle(pairs);
 const choices=r.shuffle([label,others[0],others[1],r.pick([NONE_LABEL,ALL_LABEL])]);
 return {...common,prompt:'Which of the four shapes can be tessellated? Choose the correct group.',answer:label,choices,hint};
}
