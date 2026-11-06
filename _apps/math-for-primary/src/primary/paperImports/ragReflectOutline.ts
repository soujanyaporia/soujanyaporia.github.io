import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {gridDrawingValue,reflectedSegments,type GridAxis,type GridDrawingSpec,type GridPoint,type GridSegment} from '../gridDrawingModel';

export const RAG_PATTERN={
 id:'p6-reflect-outline-grid',
 level:6,
 title:'Complete a reflected outline on a grid',
 objective:'Reflect the corners of a drawn outline across a mirror line and join them to complete a symmetric figure',
 skillIds:['P4.S.SYM.02'],
 canonicalPatternId:'p6-reflecting-geometric-outlines',
};

const COLUMNS=10,ROWS=8;
type Variant={vertical:boolean;touching:boolean};
const VARIANTS:Variant[]=[
 {vertical:true,touching:false},
 {vertical:false,touching:false},
 {vertical:true,touching:true},
 {vertical:false,touching:true},
];
const FALLBACK:Record<string,GridPoint[]>={
 'true:false':[[3,2],[1,4],[4,6]],
 'false:false':[[2,3],[5,1],[8,2]],
 'true:true':[[5,1],[3,3],[4,5],[5,6]],
 'false:true':[[1,4],[3,2],[6,3],[8,4]],
};

const cross=(o:GridPoint,a:GridPoint,b:GridPoint)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
const within=(p:GridPoint,a:GridPoint,b:GridPoint)=>p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
function touches(a:GridPoint,b:GridPoint,c:GridPoint,d:GridPoint):boolean{
 const d1=cross(a,b,c),d2=cross(a,b,d),d3=cross(c,d,a),d4=cross(c,d,b);
 if(((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0)))return true;
 return (d1===0&&within(c,a,b))||(d2===0&&within(d,a,b))||(d3===0&&within(a,c,d))||(d4===0&&within(b,c,d));
}
function validPath(p:GridPoint[]):boolean{
 if(new Set(p.map(q=>q.join(','))).size!==p.length)return false;
 for(let i=1;i<p.length-1;i++)if(cross(p[i-1],p[i],p[i+1])===0)return false;
 for(let i=0;i<p.length-1;i++)for(let j=i+2;j<p.length-1;j++)if(touches(p[i],p[i+1],p[j],p[j+1]))return false;
 return true;
}
function makePath(r:Rng,v:Variant,axisCoordinate:number):GridPoint[]{
 const maxDistance=v.vertical?4:3,alongMax=v.vertical?ROWS-1:COLUMNS-1,side=r.chance(.5)?1:-1,count=v.touching?4:r.pick([3,4]);
 for(let tries=0;tries<2000;tries++){
  const points:GridPoint[]=[];
  for(let i=0;i<count;i++){
   const onAxis=v.touching&&(i===0||i===count-1),distance=onAxis?0:r.int(1,maxDistance),along=r.int(1,alongMax),across=axisCoordinate+side*distance;
   points.push(v.vertical?[across,along]:[along,across]);
  }
  if(validPath(points))return points;
 }
 return FALLBACK[`${v.vertical}:${v.touching}`];
}
const squares=(n:number)=>`${n} square${n===1?'':'s'}`;

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=VARIANTS[(Math.abs(Math.trunc(seed))+index)%VARIANTS.length];
 const r=new Rng(hashString(`rag-reflect-outline:${seed}:${index}`));
 const axisCoordinate=variant.vertical?COLUMNS/2:ROWS/2;
 const axis:GridAxis={orientation:variant.vertical?'vertical':'horizontal',coordinate:axisCoordinate};
 const points=makePath(r,variant,axisCoordinate);
 const given:GridSegment[]=points.slice(1).map((p,i)=>[points[i],p] as GridSegment);
 const answer=gridDrawingValue(reflectedSegments(given,axis));
 const spec:GridDrawingSpec={kind:'complete-reflection',columns:COLUMNS,rows:ROWS,axis,givenSegments:given};
 const acrossOf=(p:GridPoint)=>variant.vertical?p[0]:p[1];
 const offAxis=points.filter(p=>acrossOf(p)!==axisCoordinate);
 const farthest=Math.max(...offAxis.map(p=>Math.abs(acrossOf(p)-axisCoordinate)));
 const sign=Math.sign(acrossOf(offAxis[0])-axisCoordinate);
 const here=variant.vertical?(sign<0?'to the left of':'to the right of'):(sign<0?'above':'below');
 const there=variant.vertical?(sign<0?'to the right of':'to the left of'):(sign<0?'below':'above');
 const steps=[
  'Count how many squares each corner is from the dashed mirror line, measured straight across to the line.',
  `The farthest corner is ${squares(farthest)} ${here} the mirror line, so its image is ${squares(farthest)} ${there} it, level with the original corner.`,
  `Mark every image the same way, then join the images in the same order. ${variant.touching?'Corners on the mirror line stay where they are.':'No corner touches the mirror line, so every corner moves.'}`,
 ];
 return {
  key:`rag-reflect-outline:${seed}:${index}`,
  prompt:variant.touching?'Draw the other half of the figure so that the whole figure is symmetrical about the dashed line.':'Draw the mirror image of the path on the other side of the dashed line.',
  context:[
   `The grid has ${COLUMNS} columns and ${ROWS} rows. The dashed mirror line is the middle ${variant.vertical?'vertical':'horizontal'} grid line.`,
   variant.touching?'The first and last corners of the drawn path touch the mirror line.':'The drawn path does not touch the mirror line.',
   'Draw straight lines from grid point to grid point.',
  ],
  answer,
  gridDrawing:spec,
  picture:{type:'grid-drawing',columns:COLUMNS,rows:ROWS,segments:given,givenSegments:given,axis,caption:`Mirror line: middle ${variant.vertical?'vertical':'horizontal'} grid line`},
  hint:'A corner and its image are the same number of squares from the mirror line, on opposite sides.',
  explanation:steps.join(' '),
  workedSteps:steps.map(text=>({text})),
 };
}
