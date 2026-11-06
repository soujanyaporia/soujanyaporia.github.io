import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p5-perimeter-repeated-units',
 level:5,
 title:'Perimeter from repeated units',
 objective:'Find a perimeter by working out the number of repeated units or exposed unit edges, then using the size of one unit.',
 skillIds:['P3.S.AREA.02','P4.S.AREA.02','P5.S.FRAC.05'],
 canonicalPatternId:'p5-perimeter-repeated-units',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const tenths=(t:number)=>String(Number((t/10).toFixed(1)));
const POLYGONS:Record<number,string>={5:'pentagon',6:'hexagon',7:'heptagon',8:'octagon'};

/** Cells are [row, column]; row 0 is the top row. Each row is one unbroken run, and neighbouring rows overlap. */
function squareFigure(r:Rng):[number,number][]{
 for(let attempt=0;attempt<200;attempt++){
  const rows=r.int(3,4),runs:[number,number][]=[];
  const s0=r.int(0,2);runs.push([s0,Math.min(5,s0+r.int(0,2))]);
  for(let i=1;i<rows;i++){
   const [ps,pe]=runs[i-1],ns=r.int(Math.max(0,ps-2),pe),ne=r.int(Math.max(ns,ps),Math.min(5,ns+3));
   runs.push([ns,ne]);
  }
  const cells=runs.flatMap(([a,b],row)=>Array.from({length:b-a+1},(_,j)=>[row,a+j] as [number,number]));
  const varied=runs.some(([a,b],i)=>i>0&&(a!==runs[i-1][0]||b!==runs[i-1][1]));
  if(cells.length>=7&&cells.length<=14&&varied)return cells;
 }
 const runs:[number,number][]=[[2,2],[2,3],[1,4],[0,3]];
 return runs.flatMap(([a,b],row)=>Array.from({length:b-a+1},(_,j)=>[row,a+j] as [number,number]));
}

function exposedEdges(cells:[number,number][]):number{
 const has=new Set(cells.map(([a,b])=>`${a},${b}`));
 let edges=0;
 for(const [a,b] of cells)for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]])if(!has.has(`${a+da},${b+db}`))edges++;
 return edges;
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p5-perimeter-repeated-units:${seed}:${index}`));
 const key=`rag-p5-perimeter-repeated-units:${seed}:${index}`;
 const variant=r.int(0,2);

 if(variant===0){
  const lengthT=r.pick([20,24,25,30]),widthT=r.pick([8,10,12,15]),tables=r.int(6,15),chairs=2*tables+4;
  const rowT=tables*widthT,perimeterT=2*(rowT+lengthT);
  const steps=[
   'Each extra table adds 2 chairs, because the pattern goes 6, 8, 10.',
   `${chairs} − 6 = ${chairs-6}, and ${chairs-6} ÷ 2 = ${(chairs-6)/2} extra tables, so there are ${tables} tables.`,
   `The tables touch along their long sides, so the row is ${tables} × ${tenths(widthT)} = ${tenths(rowT)} m long and ${tenths(lengthT)} m wide.`,
   `Perimeter = 2 × (${tenths(rowT)} + ${tenths(lengthT)}) = ${tenths(perimeterT)} m.`,
  ];
  return {key,
   context:[
    `Tables are pushed together in a straight row with their long sides touching. Each table is ${tenths(lengthT)} m long and ${tenths(widthT)} m wide.`,
    'Figure 1 has 1 table and 6 chairs. Figure 2 has 2 tables and 8 chairs. Figure 3 has 3 tables and 10 chairs.',
    `The pattern keeps going. One figure uses ${chairs} chairs.`,
   ],
   prompt:'What is the perimeter of the row of tables in that figure?',
   answer:tenths(perimeterT),unit:'m',
   hint:'Use the chair pattern to find how many tables there are. Then work out the length and width of the whole row.',
   workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
 }

 if(variant===1){
  const line=r.pick([2,3,4]),side=r.pick([2,3,4,5]),cells=squareFigure(r),edges=exposedEdges(cells),perimeter=edges*side;
  const steps=[
   `${line} squares in a line measure ${line*side} cm, so one side is ${line*side} ÷ ${line} = ${side} cm.`,
   `Count the unit edges on the outside of the figure: ${edges} edges.`,
   `Perimeter = ${edges} × ${side} = ${perimeter} cm.`,
  ];
  return {key,
   context:[`All the squares in the figure are identical. ${line} identical squares in a line measure ${line*side} cm.`],
   prompt:'What is the perimeter of the figure?',
   answer:String(perimeter),unit:'cm',
   picture:{type:'net',cells},
   hint:'Find the side of one square first. Then count only the edges on the outside of the figure.',
   workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
 }

 let sides=5,numerator=1,denominator=3;
 for(let attempt=0;attempt<200;attempt++){
  const k=r.pick([5,6,7,8]),d=r.pick([3,4,5,6,7,8]),n=r.int(1,d-1);
  if(gcd(n,d)===1&&(k*n)%d!==0&&k*n>d){sides=k;numerator=n;denominator=d;break;}
 }
 const total=sides*numerator,whole=Math.floor(total/denominator),rest=total%denominator,g=gcd(rest,denominator);
 const answer=`${whole} ${rest/g}/${denominator/g}`;
 const steps=[
  `A regular shape has equal sides, so multiply the side length by the number of sides: ${sides} × ${numerator}/${denominator}.`,
  `${sides} × ${numerator}/${denominator} = ${total}/${denominator}.`,
  `${total}/${denominator} = ${answer} m.`,
 ];
 return {key,
  context:[`A regular ${POLYGONS[sides]} has all ${sides} sides equal. Each side is ${numerator}/${denominator} m long.`],
  prompt:'What is the perimeter of the shape? Give your answer as a mixed number.',
  answer,unit:'m',requireMixed:true,requireSimplified:true,
  hint:'All the sides are equal, so multiply one side by the number of sides.',
  workedSteps:steps.map(text=>({text})),explanation:steps.join(' ')};
}
