import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN={
 id:'p5s-rag-equilateral-isosceles-chain',
 level:5,
 title:'Equilateral and isosceles triangle angle chain',
 objective:'Use the 60° angle of an equilateral triangle together with an isosceles triangle to find an unknown angle, working forwards or backwards.',
 skillIds:['P5.S.SHAPE.01','P5.S.SHAPE.03'],
 canonicalPatternId:'p5-equilateral-isosceles-triangle-chain',
};

type Pt=readonly [number,number];
const rad=(d:number)=>d*Math.PI/180;
const r2=(n:number)=>Number(n.toFixed(2));
const line=(a:Pt,b:Pt):Batch11UpperMark=>({kind:'line',x1:r2(a[0]),y1:r2(a[1]),x2:r2(b[0]),y2:r2(b[1])});
const text=(x:number,y:number,value:string):Batch11UpperMark=>({kind:'text',x:r2(x),y:r2(y),text:value});
const polar=(c:Pt,radius:number,deg:number):Pt=>[c[0]+radius*Math.cos(rad(deg)),c[1]-radius*Math.sin(rad(deg))];
const arc=(c:Pt,radius:number,from:number,to:number,sweep:0|1):Batch11UpperMark=>{
 const a=polar(c,radius,from),b=polar(c,radius,to);
 return {kind:'path',d:`M ${r2(a[0])} ${r2(a[1])} A ${radius} ${radius} 0 0 ${sweep} ${r2(b[0])} ${r2(b[1])}`,fill:'none'};
};
const fig=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;

/** Equilateral EFG with H inside on the line from E, so GH = FH. x is angle HGF = angle HFG. */
function equilateralFigure(x:number,atH:string,atF:string,description:string):Picture{
 const G:Pt=[75,170],F:Pt=[245,170],E:Pt=[160,170-85*Math.sqrt(3)],H:Pt=[160,170-85*Math.tan(rad(x))];
 const mark=polar(F,52,150-x/2);
 return fig(description,[
  line(E,G),line(E,F),line(G,F),line(G,H),line(F,H),line(E,H),
  arc(F,34,180-x,120,1),arc(H,12,180+x,360-x,0),
  text(152,15,'E'),text(57,188,'G'),text(248,188,'F'),text(H[0]+7,H[1]-4,'H'),
  text(H[0]-12,H[1]+30,atH),text(mark[0]-8,mark[1]+4,atF),
 ]);
}

/** Isosceles ABC with AB = AC and equilateral BDC inside it. */
function apexFigure(apex:number,atA:string,atB:string,description:string):Picture{
 const base=(180-apex)/2,A:Pt=[160,25],w=145/Math.tan(rad(base)),B:Pt=[160-w,170],C:Pt=[160+w,170],D:Pt=[160,170-w*Math.sqrt(3)];
 const mark=polar(B,64,(60+base)/2);
 return fig(description,[
  line(A,B),line(A,C),line(B,C),line(D,B),line(D,C),
  arc(B,40,60,base,0),arc(A,16,270-apex/2,270+apex/2,0),
  text(152,17,'A'),text(B[0]-18,188,'B'),text(C[0]+6,188,'C'),text(D[0]-4,D[1]-6,'D'),
  text(A[0]+14,A[1]+16,atA),text(mark[0]-6,mark[1]+4,atB),
 ]);
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=(((Math.trunc(seed)%4)+4)%4+Math.abs(Math.trunc(index)))%4;
 const make=(context:string[],prompt:string,answer:number,hint:string,steps:string[],picture:Picture):Question=>({
  key:`${RAG_PATTERN.id}:${seed}:${index}`,context,prompt,answer:String(answer),unit:'degrees',hint,
  workedSteps:steps.map(step=>({text:step})),explanation:steps.join(' '),picture,
 });
 if(variant===0){
  const x=r.int(20,50),apex=180-2*x,answer=60-x;
  return make([
   'EFG is an equilateral triangle. H is a point inside it with GH = FH.',
   `Angle GHF = ${apex}°. The figure is not drawn to scale.`,
  ],'Find angle EFH.',answer,'Triangle GHF is isosceles. Find its base angle, then take it from the 60° angle of the equilateral triangle.',[
   `Triangle GHF is isosceles with GH = FH, so angle HFG = (180° − ${apex}°) ÷ 2 = ${x}°.`,
   'Angle EFG = 60° because EFG is equilateral.',
   `Angle EFH = 60° − ${x}° = ${answer}°.`,
  ],equilateralFigure(x,`${apex}°`,'?',`Equilateral triangle EFG with H inside and GH equal to FH. Angle GHF is ${apex} degrees. Angle EFH is unknown.`));
 }
 if(variant===1){
  const y=r.int(10,40),x=60-y,answer=180-2*x;
  return make([
   'EFG is an equilateral triangle. H is a point inside it with GH = FH.',
   `Angle EFH = ${y}°. The figure is not drawn to scale.`,
  ],'Find angle GHF.',answer,'Use the 60° angle of the equilateral triangle to find a base angle of triangle GHF.',[
   'Angle EFG = 60° because EFG is equilateral.',
   `Angle HFG = 60° − ${y}° = ${x}°.`,
   `GH = FH, so angle HGF is also ${x}°.`,
   `Angle GHF = 180° − ${x}° − ${x}° = ${answer}°.`,
  ],equilateralFigure(x,'?',`${y}°`,`Equilateral triangle EFG with H inside and GH equal to FH. Angle EFH is ${y} degrees. Angle GHF is unknown.`));
 }
 if(variant===2){
  const apex=2*r.int(10,24),base=(180-apex)/2,answer=base-60;
  return make([
   'ABC is an isosceles triangle with AB = AC. BDC is an equilateral triangle, and D is inside triangle ABC.',
   `Angle BAC = ${apex}°. The figure is not drawn to scale.`,
  ],'Find angle ABD.',answer,'Find the base angle of the isosceles triangle, then take away the 60° angle of the equilateral triangle.',[
   `Angle ABC = (180° − ${apex}°) ÷ 2 = ${base}°.`,
   'Angle DBC = 60° because BDC is equilateral.',
   `Angle ABD = ${base}° − 60° = ${answer}°.`,
  ],apexFigure(apex,`${apex}°`,'?',`Isosceles triangle ABC with AB equal to AC and an equilateral triangle BDC inside it. Angle BAC is ${apex} degrees. Angle ABD is unknown.`));
 }
 const e=r.int(6,20),base=60+e,answer=180-2*base;
 return make([
  'ABC is an isosceles triangle with AB = AC. BDC is an equilateral triangle, and D is inside triangle ABC.',
  `Angle ABD = ${e}°. The figure is not drawn to scale.`,
 ],'Find angle BAC.',answer,'Add the 60° angle of the equilateral triangle to angle ABD to get a base angle of triangle ABC.',[
  'Angle DBC = 60° because BDC is equilateral.',
  `Angle ABC = 60° + ${e}° = ${base}°.`,
  `AB = AC, so angle ACB is also ${base}°.`,
  `Angle BAC = 180° − ${base}° − ${base}° = ${answer}°.`,
 ],apexFigure(answer,'?',`${e}°`,`Isosceles triangle ABC with AB equal to AC and an equilateral triangle BDC inside it. Angle ABD is ${e} degrees. Angle BAC is unknown.`));
}
