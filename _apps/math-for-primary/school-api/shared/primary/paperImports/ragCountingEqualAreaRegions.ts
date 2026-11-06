import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN={
 id:'p6-counting-equal-area-regions',
 level:6,
 title:'What fraction of the figure is shaded?',
 objective:'Count equal-area parts of a figure, then write the shaded or unshaded part as a fraction in simplest form.',
 skillIds:['P2.S.FRAC.01','P3.S.FRAC.02'],
 canonicalPatternId:'p6-counting-equal-area-regions',
};

type Pt=[number,number];
const SHADE='#8fcfae';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const frac=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
const r2=(n:number)=>Number(n.toFixed(2));
const path=(d:string,fill?:string):Batch11UpperMark=>({kind:'path',d,fill});
const poly=(pts:Pt[],fill?:string)=>path('M '+pts.map(([x,y])=>`${r2(x)} ${r2(y)}`).join(' L ')+' Z',fill);
const doubleArea=(pts:Pt[])=>Math.abs(pts.reduce((s,[x,y],i)=>{const [a,b]=pts[(i+1)%pts.length];return s+x*b-a*y;},0));
const fig=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;

// Square pieces use a cell of side 2 units, so every corner, midpoint and centre is a whole number.
const WHOLE:Pt[]=[[0,0],[2,0],[2,2],[0,2]];
const TOP:Pt[]=[[0,0],[2,0],[1,1]],RIGHT:Pt[]=[[2,0],[2,2],[1,1]],BOTTOM:Pt[]=[[0,2],[2,2],[1,1]],LEFT:Pt[]=[[0,0],[0,2],[1,1]];
const PATTERNS:{name:string;polys:Pt[][]}[]=[
 {name:'nothing shaded',polys:[]},
 {name:'whole square shaded',polys:[WHOLE]},
 {name:'upper-right half shaded',polys:[[[0,0],[2,0],[2,2]]]},
 {name:'lower-left half shaded',polys:[[[0,0],[2,2],[0,2]]]},
 {name:'lower-right half shaded',polys:[[[2,0],[2,2],[0,2]]]},
 {name:'upper-left half shaded',polys:[[[0,0],[2,0],[0,2]]]},
 {name:'top quarter shaded',polys:[TOP]},
 {name:'right quarter shaded',polys:[RIGHT]},
 {name:'bottom quarter shaded',polys:[BOTTOM]},
 {name:'left quarter shaded',polys:[LEFT]},
 {name:'top and bottom quarters shaded',polys:[TOP,BOTTOM]},
 {name:'left and right quarters shaded',polys:[LEFT,RIGHT]},
];
const patternArea2=(p:number)=>PATTERNS[p].polys.reduce((a,pp)=>a+doubleArea(pp),0);

function squareGrid(cols:number,rows:number,unit:number,picks:number[]){
 const cell=2*unit,w=cols*cell,h=rows*cell,ox=Math.round((320-w)/2),oy=Math.round((200-h)/2);
 const marks:Batch11UpperMark[]=[];
 picks.forEach((_,i)=>{const x=ox+(i%cols)*cell,y=oy+Math.floor(i/cols)*cell;marks.push(poly([[x,y],[x+cell,y],[x+cell,y+cell],[x,y+cell]],'white'));});
 picks.forEach((p,i)=>{const x=ox+(i%cols)*cell,y=oy+Math.floor(i/cols)*cell;for(const pts of PATTERNS[p].polys)marks.push(poly(pts.map(([a,b])=>[x+a*unit,y+b*unit] as Pt),SHADE));});
 return marks;
}

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=(((Math.trunc(seed)+Math.trunc(index))%4)+4)%4;
 const askShaded=!r.chance(.4);
 const word=askShaded?'shaded':'unshaded';
 const build=(figure:string,context:string[],part:number,whole:number,picture:Picture,steps:string[],hint:string):Question=>{
  const want=askShaded?part:whole-part,answer=frac(want,whole),raw=`${want}/${whole}`;
  const last=`The ${word} part is ${raw}${raw===answer?'':` = ${answer} in simplest form`}.`;
  const all=[...steps,last];
  return {key,context,prompt:`What fraction of the ${figure} is ${word}? Give your answer in its simplest form.`,answer,requireSimplified:true,hint,explanation:all.join(' '),workedSteps:all.map(text=>({text})),picture};
 };
 if(variant===0){
  const [cols,rows]=r.pick([[2,1],[3,1],[4,1],[2,2],[3,2]]),n=cols*rows;
  let picks:number[]=[],shaded2=0;
  for(let t=0;t<200;t++){
   picks=Array.from({length:n},()=>r.int(0,PATTERNS.length-1));
   shaded2=picks.reduce((s,p)=>s+patternArea2(p),0);
   if(picks.filter(p=>p!==0).length>=2&&shaded2>0&&shaded2<8*n)break;
   if(t===199){picks=Array(n).fill(0);picks[0]=2;picks[n-1]=6;shaded2=patternArea2(2)+patternArea2(6);}
  }
  const quarters=shaded2/2,total=4*n;
  const label=`Figure of ${n} identical squares in ${rows} row${rows>1?'s':''} of ${cols}. Reading row by row: ${picks.map(p=>PATTERNS[p].name).join('; ')}.`;
  return build('figure',[`The figure is made up of ${n} identical squares joined edge to edge.`,'Each shaded part is cut off by straight lines joining corners, or corners and the centre of a square.'],quarters,total,fig(label,squareGrid(cols,rows,30,picks)),[
   `Cut every square into 4 equal quarter-squares. The figure has ${n} × 4 = ${total} quarter-squares.`,
   `A shaded half-square is 2 quarter-squares and a whole shaded square is 4. All the shaded parts make ${quarters} quarter-squares.`,
   ...(askShaded?[]:[`Unshaded quarter-squares: ${total} − ${quarters} = ${total-quarters}.`]),
  ],'Cut each square into four equal quarter-squares, then count the shaded quarters.');
 }
 if(variant===1){
  const n=r.int(3,5),N=n*n,s=n===3?64:n===4?52:42,h=s*Math.sqrt(3)/2,top=Math.round((200-n*h)/2),cx=160;
  const cells:Pt[][]=[];
  for(let j=0;j<n;j++){
   const yt=top+j*h,yb=top+(j+1)*h,xt=(m:number)=>cx-j*s/2+m*s,xb=(m:number)=>cx-(j+1)*s/2+m*s;
   for(let k=0;k<=j;k++){cells.push([[xt(k),yt],[xb(k),yb],[xb(k+1),yb]]);if(k<j)cells.push([[xt(k),yt],[xt(k+1),yt],[xb(k+1),yb]]);}
  }
  const k=r.int(2,N-2),chosen=new Set(r.shuffle(Array.from({length:N},(_,i)=>i)).slice(0,k));
  const rowCounts=Array.from({length:n},(_,j)=>2*j+1);
  return build('big triangle',[`Each side of the large equilateral triangle is split into ${n} equal parts. Lines parallel to the sides cut it into small equilateral triangles of the same size.`],k,N,fig('A large equilateral triangle cut into identical small equilateral triangles, with some of them shaded.',cells.map((pts,i)=>poly(pts,chosen.has(i)?SHADE:'white'))),[
   `The rows of small triangles have ${rowCounts.join(', ')} triangles, so there are ${rowCounts.join(' + ')} = ${N} small triangles.`,
   `Count the shaded small triangles: ${k}.`,
   ...(askShaded?[]:[`Unshaded small triangles: ${N} − ${k} = ${N-k}.`]),
  ],'Work out how many small triangles are in each row, then count the shaded ones.');
 }
 if(variant===2){
  const n=r.pick([6,8,10,12]),angle=360/n,k=r.int(2,n-2),chosen=new Set(r.shuffle(Array.from({length:n},(_,i)=>i)).slice(0,k));
  const cx=160,cy=100,R=85,marks:Batch11UpperMark[]=[];
  for(let i=0;i<n;i++){
   const a0=(-90+i*angle)*Math.PI/180,a1=(-90+(i+1)*angle)*Math.PI/180;
   marks.push(path(`M ${cx} ${cy} L ${r2(cx+R*Math.cos(a0))} ${r2(cy+R*Math.sin(a0))} A ${R} ${R} 0 0 1 ${r2(cx+R*Math.cos(a1))} ${r2(cy+R*Math.sin(a1))} Z`,chosen.has(i)?SHADE:'white'));
  }
  return build('circle',[`A circle is divided into ${n} equal sectors. Each sector makes an angle of ${angle}° at the centre.`],k,n,fig('A circle cut into equal sectors from its centre, with some sectors shaded.',marks),[
   `Each sector is 360° ÷ ${n} = ${angle}°.`,
   `Shaded angle: ${k} × ${angle}° = ${k*angle}°.`,
   ...(askShaded?[`Compare with a full turn: ${k*angle}/360.`]:[`Unshaded angle: 360° − ${k*angle}° = ${360-k*angle}°. Compare with a full turn: ${360-k*angle}/360.`]),
  ],'Find the angle of one sector, then compare the shaded angle with the whole turn of 360°.');
 }
 const cols=r.int(3,5),rows=r.int(2,3),N=cols*rows,k=r.int(2,N-2),chosen=new Set(r.shuffle(Array.from({length:N},(_,i)=>i)).slice(0,k));
 const picks=Array.from({length:N},(_,i)=>chosen.has(i)?1:0);
 return build('rectangle',[`A rectangle is made up of ${N} identical squares.`],k,N,fig(`A rectangle of ${cols} columns and ${rows} rows of identical squares, with some squares shaded.`,squareGrid(cols,rows,22,picks)),[
  `There are ${cols} × ${rows} = ${N} identical squares.`,
  `${k} squares are shaded, so ${N} − ${k} = ${N-k} squares are unshaded.`,
 ],'Count all the squares, then count the shaded and unshaded squares.');
}
