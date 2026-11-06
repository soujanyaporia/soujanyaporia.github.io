import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

/** Original generator: shaded triangle areas in rectangles from equal lengths, side ratios or grid cells. */
export const RAG_PATTERN={
 id:'p6-shaded-area-fractions-segment-ratios',
 level:6,
 title:'Shaded area from segment ratios',
 objective:'Turn equal lengths and side ratios into area fractions of a rectangle, then find the shaded fraction or area.',
 skillIds:['P5.S.AREA.02','P6.S.RATIO.05'],
 canonicalPatternId:'p6-shaded-area-fractions-from-segment-ratios',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const frac=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
const num=(n:number)=>String(Number(n.toFixed(4)));
const line=(x1:number,y1:number,x2:number,y2:number):Batch11UpperMark=>({kind:'line',x1,y1,x2,y2});
const text=(x:number,y:number,t:string):Batch11UpperMark=>({kind:'text',x,y,text:t});
const path=(d:string,fill?:string):Batch11UpperMark=>({kind:'path',d,fill});
const pt=(p:readonly number[])=>`${p[0]} ${p[1]}`;
const fig=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;
const SHADE='#cce8dc';

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+index)%3;
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;

 if(variant===0){
  const m=r.pick([2,3,4]),u=30,w=m*u,h=(m+1)*u,x0=110,y0=25;
  const A=[x0,y0],B=[x0+w,y0],C=[x0+w,y0+h],D=[x0,y0+h],E=[x0,y0+m*u];
  const rect=(m+1)*m,tri=m*m/2,answer=frac(m*m,2*m*(m+1));
  return {key,
   context:['ABCD is a rectangle. Point E is on side AD, so A, E and D are in a straight line.',`AE is ${m} times as long as ED, and AE is equal to AB. Triangle ABE is shaded.`],
   prompt:'What fraction of rectangle ABCD is shaded? Give your answer in simplest form.',
   answer,requireSimplified:true,
   hint:'Let ED be 1 unit. Then write AE, AB and AD in units.',
   explanation:`With ED = 1 unit, AE = AB = ${m} units and AD = ${m+1} units. The shaded triangle has area ${num(tri)} and the rectangle has area ${rect}, so the fraction is ${answer}.`,
   workedSteps:[
    {text:`Let ED = 1 unit. Then AE = ${m} units, so AD = ${m} + 1 = ${m+1} units.`},
    {text:`AB = AE = ${m} units, so the rectangle has area ${m} × ${m+1} = ${rect} square units.`},
    {text:`Triangle ABE has a right angle at A: area = 1/2 × ${m} × ${m} = ${num(tri)} square units.`},
    {text:`Fraction shaded = ${num(tri)} ÷ ${rect} = ${m*m}/${2*m*(m+1)} = ${answer}.`}],
   picture:fig(`Rectangle ABCD with E on side AD where AE is ${m} times ED. Triangle ABE is shaded.`,[
    path(`M ${pt(A)} L ${pt(B)} L ${pt(E)} Z`,SHADE),
    line(A[0],A[1],B[0],B[1]),line(B[0],B[1],C[0],C[1]),line(C[0],C[1],D[0],D[1]),line(D[0],D[1],A[0],A[1]),
    text(A[0]-14,A[1]-4,'A'),text(B[0]+4,B[1]-4,'B'),text(C[0]+4,C[1]+14,'C'),text(D[0]-14,D[1]+14,'D'),text(E[0]-14,E[1]+4,'E')])};
 }

 if(variant===1){
  const [a,b]=r.pick([[1,2],[1,3],[2,3],[1,1],[3,1]]),[c,d]=r.pick([[2,1],[1,1],[3,1],[1,3],[2,3]]);
  const S=a+b,T=c+d,k=r.int(1,4),area=k*2*S*T;
  const adeA=k*T*a,ecfA=k*b*d,abfA=k*S*c,answer=area-adeA-ecfA-abfA;
  const x0=40,y0=30,W=240,H=120,p=a/S,q=c/T;
  const A=[x0,y0],B=[x0+W,y0],C=[x0+W,y0+H],D=[x0,y0+H],E=[x0+p*W,y0+H],F=[x0+W,y0+q*H];
  return {key,
   context:[`ABCD is a rectangle with area ${area} cm². E is on side DC and F is on side BC.`,`DE : EC = ${a} : ${b} and BF : FC = ${c} : ${d}. Triangle AEF is shaded. The figure is not drawn to scale.`],
   prompt:'Find the area of the shaded triangle AEF.',
   answer:String(answer),unit:'cm²',
   hint:'Take away the three unshaded right-angled triangles from the whole rectangle.',
   explanation:`The three unshaded triangles are ${adeA} cm², ${ecfA} cm² and ${abfA} cm². The shaded area is ${area} − ${adeA} − ${ecfA} − ${abfA} = ${answer} cm².`,
   workedSteps:[
    {text:`DE is ${a}/${S} of DC and AD is the full height, so triangle ADE is ${frac(a,2*S)} of the rectangle: ${frac(a,2*S)} × ${area} = ${adeA} cm².`},
    {text:`EC is ${b}/${S} of DC and FC is ${d}/${T} of BC, so triangle ECF is ${frac(b*d,2*S*T)} of the rectangle = ${ecfA} cm².`},
    {text:`BF is ${c}/${T} of BC and AB is the full width, so triangle ABF is ${frac(c,2*T)} of the rectangle = ${abfA} cm².`},
    {text:`Shaded area = ${area} − ${adeA} − ${ecfA} − ${abfA} = ${answer} cm².`}],
   picture:fig(`Rectangle ABCD of area ${area} square centimetres. E is on DC with DE:EC = ${a}:${b}; F is on BC with BF:FC = ${c}:${d}. Triangle AEF is shaded.`,[
    path(`M ${pt(A)} L ${pt(E)} L ${pt(F)} Z`,SHADE),
    line(A[0],A[1],B[0],B[1]),line(B[0],B[1],C[0],C[1]),line(C[0],C[1],D[0],D[1]),line(D[0],D[1],A[0],A[1]),
    text(A[0]-14,A[1]-4,'A'),text(B[0]+4,B[1]-4,'B'),text(C[0]+4,C[1]+14,'C'),text(D[0]-14,D[1]+14,'D'),text(E[0]-3,E[1]+16,'E'),text(F[0]+6,F[1]+4,'F')])};
 }

 const tall=r.chance(.5)?1:0,n=tall?r.int(1,2):r.int(2,4);
 const tallCol=r.int(0,1),cw=100,ch=70,x0=60,y0=30;
 const cells:[number,number][]=tall?[[1-tallCol,0],[1-tallCol,1]]:[[0,0],[1,0],[0,1],[1,1]];
 const chosen=r.shuffle(cells).slice(0,n);
 const shapes:Batch11UpperMark[]=[];
 if(tall){const x=x0+tallCol*cw;shapes.push(path(`M ${x} ${y0+2*ch} L ${x+cw} ${y0+2*ch} L ${x+cw/2} ${y0} Z`,SHADE));}
 for(const [col,row] of chosen){const x=x0+col*cw,y=y0+row*ch,o=r.int(0,2);
  shapes.push(path(o===0?`M ${x} ${y+ch} L ${x+cw} ${y+ch} L ${x+cw/2} ${y} Z`:o===1?`M ${x} ${y} L ${x} ${y+ch} L ${x+cw} ${y+ch} Z`:`M ${x} ${y} L ${x} ${y+ch} L ${x+cw} ${y+ch/2} Z`,SHADE));}
 const answer=frac(2*tall+n,8);
 return {key,
  context:['A grid is made of 4 identical rectangles, in 2 rows and 2 columns.',`Tall triangles: ${tall}. Small triangles: ${n}. No shaded triangles overlap.`,'A tall triangle has its base along the bottom of one column of the grid and its top corner on the top edge of the grid. A small triangle has one whole side of a rectangle as its base and its third corner on the opposite side of that rectangle.'],
  prompt:'What fraction of the whole grid is shaded? Give your answer in simplest form.',
  answer,requireSimplified:true,
  hint:'Count the area of one rectangle as 1 unit. Find the area of a small triangle and a tall triangle.',
  explanation:`A small triangle is 1/2 of a rectangle and a tall triangle is 1 whole rectangle. The shaded area is ${tall} + ${n} × 1/2 = ${num(tall+n/2)} rectangles out of 4, which is ${answer}.`,
  workedSteps:[
   {text:'Let the area of one rectangle be 1 unit, so the whole grid is 4 units.'},
   {text:'A small triangle has the same base and height as a rectangle, so its area is 1/2 unit.'},
   {text:'A tall triangle has the width of one rectangle and the height of two, so its area is 1/2 × 1 × 2 = 1 unit.'},
   {text:`Shaded area = ${tall} × 1 + ${n} × 1/2 = ${num(tall+n/2)} units. Fraction = ${num(tall+n/2)}/4 = ${answer}.`}],
  picture:fig(`A grid of 4 identical rectangles in 2 rows and 2 columns with ${tall} tall shaded triangle and ${n} small shaded triangles.`,[
   ...shapes,
   line(x0,y0,x0+2*cw,y0),line(x0,y0+2*ch,x0+2*cw,y0+2*ch),line(x0,y0,x0,y0+2*ch),line(x0+2*cw,y0,x0+2*cw,y0+2*ch),
   line(x0+cw,y0,x0+cw,y0+2*ch),line(x0,y0+ch,x0+2*cw,y0+ch)])};
}
