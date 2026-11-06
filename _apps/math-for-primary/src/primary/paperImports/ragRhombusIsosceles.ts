import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN={
 id:'p5-rhombus-isosceles-construction',
 level:5,
 title:'Rhombus with an isosceles construction',
 objective:'Combine rhombus and parallel-side angle facts with equal base angles and triangle sums to find or test angles',
 skillIds:['P5.S.SHAPE.01','P5.S.SHAPE.02','P5.S.SHAPE.03','P5.S.ANGLE.01','P5.S.ANGLE.04'],
 canonicalPatternId:'p5-rhombus-isosceles-construction',
};

type Pt=[number,number];
const rad=Math.PI/180;
const r1=(n:number)=>Number(n.toFixed(1));
const line=(a:Pt,b:Pt):Batch11UpperMark=>({kind:'line',x1:r1(a[0]),y1:r1(a[1]),x2:r1(b[0]),y2:r1(b[1])});
const text=(x:number,y:number,t:string):Batch11UpperMark=>({kind:'text',x:r1(x),y:r1(y),text:t});
const path=(d:string,fill?:string):Batch11UpperMark=>({kind:'path',d,fill});
const fig=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;

/** Map maths coordinates (y up) into the 320 by 200 drawing area, keeping the shape. */
function fit(points:Record<string,Pt>):Record<string,Pt>{
 const list=Object.values(points),xs=list.map(p=>p[0]),ys=list.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(230/(maxX-minX||1),130/(maxY-minY||1));
 const ox=160-(minX+maxX)/2*scale,oy=100+(minY+maxY)/2*scale;
 const result:Record<string,Pt>={};
 for(const [name,p] of Object.entries(points))result[name]=[ox+p[0]*scale,oy-p[1]*scale];
 return result;
}
const centre=(points:Pt[]):Pt=>[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];
const vlabel=(name:string,p:Pt,c:Pt)=>{const dx=p[0]-c[0],dy=p[1]-c[1],n=Math.hypot(dx,dy)||1;return text(p[0]+dx/n*13-4,p[1]+dy/n*13+4,name);};
const ang=(from:Pt,to:Pt)=>Math.atan2(to[1]-from[1],to[0]-from[0]);
const norm=(a:number)=>{let d=a%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<=-Math.PI)d+=2*Math.PI;return d;};
function arcMarks(v:Pt,p1:Pt,p2:Pt,radius:number,label:string,t=.5,labelRadius=radius+14):Batch11UpperMark[]{
 const a1=ang(v,p1),diff=norm(ang(v,p2)-a1),a2=a1+diff,sweep=diff>0?1:0;
 const q1:Pt=[v[0]+radius*Math.cos(a1),v[1]+radius*Math.sin(a1)],q2:Pt=[v[0]+radius*Math.cos(a2),v[1]+radius*Math.sin(a2)];
 const mid=a1+diff*t;
 return [path(`M ${r1(q1[0])} ${r1(q1[1])} A ${radius} ${radius} 0 0 ${sweep} ${r1(q2[0])} ${r1(q2[1])}`),text(v[0]+labelRadius*Math.cos(mid)-9,v[1]+labelRadius*Math.sin(mid)+4,label)];
}
const tick=(a:Pt,b:Pt):Batch11UpperMark=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,px=-dy/n*5,py=dx/n*5;return line([mx-px,my-py],[mx+px,my+py]);};
const chevron=(a:Pt,b:Pt):Batch11UpperMark=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n,px=-uy*4,py=ux*4;return path(`M ${r1(mx-ux*3+px)} ${r1(my-uy*3+py)} L ${r1(mx+ux*3)} ${r1(my+uy*3)} L ${r1(mx-ux*3-px)} ${r1(my-uy*3-py)}`);};

/** Variant 1: rhombus with an isosceles triangle on an extended side. */
function extensionQuestion(r:Rng,key:string):Question{
 const apex=r.pick([24,28,32,36,44,48,52,56,60,64,68,72]);
 const base=(180-apex)/2,adc=180-base,dac=(180-adc)/2,answer=apex+dac;
 const A:Pt=[Math.cos(adc*rad),Math.sin(adc*rad)],B:Pt=[A[0]+1,A[1]],C:Pt=[1,0],D:Pt=[0,0],E:Pt=[2*A[0],0];
 const p=fit({A,B,C,D,E}),c=centre([p.A,p.B,p.C,p.D]);
 const marks:Batch11UpperMark[]=[line(p.E,p.C),line(p.A,p.B),line(p.B,p.C),line(p.D,p.A),line(p.A,p.E),line(p.A,p.C),tick(p.A,p.D),tick(p.A,p.E),
  ...arcMarks(p.A,p.E,p.D,24,`${apex}°`,.5,40),...arcMarks(p.A,p.E,p.C,52,'?',.85,68),
  vlabel('A',p.A,c),vlabel('B',p.B,c),vlabel('C',p.C,c),vlabel('D',p.D,c),vlabel('E',p.E,c)];
 const steps=[
  `Triangle ADE has AE = AD, so angle ADE = (180° − ${apex}°) ÷ 2 = ${base}°.`,
  `E, D and C lie on a straight line, so angle ADC = 180° − ${base}° = ${adc}°.`,
  `In a rhombus AD = DC, so triangle ADC is isosceles and angle DAC = (180° − ${adc}°) ÷ 2 = ${dac}°.`,
  `Angle CAE = ${apex}° + ${dac}° = ${answer}°.`,
 ];
 return {key,context:['ABCD is a rhombus. The points E, D and C lie on one straight line, and AE = AD.',`Angle EAD = ${apex}°. The figure is not drawn to scale.`],prompt:'Find angle CAE.',answer:String(answer),unit:'degrees',
  hint:'Find the base angles of triangle ADE first. Then use the straight line E, D, C.',explanation:steps.join(' '),workedSteps:steps.map(t=>({text:t})),
  picture:fig(`Rhombus ABCD. E, D and C are on one straight line with AE equal to AD. Angle EAD is ${apex} degrees. Diagonal AC is drawn and angle CAE is unknown.`,marks)};
}

function rhombusPoints(c:number,e:number){
 const m=(180-e)*rad,cr=c*rad;
 const d=1/(1+Math.cos(m)+Math.sin(m)*Math.cos(cr)/Math.sin(cr));
 const D:Pt=[0,0],C:Pt=[1,0],A:Pt=[-Math.cos(cr),Math.sin(cr)],B:Pt=[1-Math.cos(cr),Math.sin(cr)],E:Pt=[d*Math.cos(m),d*Math.sin(m)],F:Pt=[E[0]+d,E[1]];
 const beta=E[1]/A[1],alpha=E[0]-beta*A[0],t=d*Math.sin(m)/Math.sin(cr);
 return [alpha,beta,t].every(v=>v>.12&&v<.88)?{A,B,C,D,E,F}:null;
}

/** Variant 2: rhombus with DE = EF and EF parallel to DC; two linked angles. */
function parallelQuestion(r:Rng,key:string):Question{
 let c=70,e=132,pts=rhombusPoints(c,e);
 for(let tries=0;tries<400;tries++){
  const cc=r.int(56,84),ee=2*r.int(Math.ceil((cc+16)/2),73),candidate=rhombusPoints(cc,ee);
  if(candidate){c=cc;e=ee;pts=candidate;break;}
 }
 if(!pts)throw Error('No valid rhombus layout');
 const k=(180-e)/2,m=180-e,adc=180-c,adeAngle=adc-m;
 const p=fit(pts),rh=centre([p.A,p.B,p.C,p.D]);
 const marks:Batch11UpperMark[]=[line(p.A,p.B),line(p.B,p.C),line(p.C,p.D),line(p.D,p.A),line(p.D,p.E),line(p.E,p.F),line(p.D,p.F),tick(p.D,p.E),tick(p.E,p.F),chevron(p.D,p.C),chevron(p.E,p.F),
  ...arcMarks(p.C,p.D,p.B,20,`${c}°`,.5,36),...arcMarks(p.E,p.D,p.F,13,`${e}°`,.5,30),
  vlabel('A',p.A,rh),vlabel('B',p.B,rh),vlabel('C',p.C,rh),vlabel('D',p.D,rh),vlabel('E',p.E,[p.E[0]+20,p.E[1]]),vlabel('F',p.F,rh)];
 const steps=[
  `DE = EF, so triangle DEF is isosceles and angle EDF = (180° − ${e}°) ÷ 2 = ${k}°.`,
  `EF is parallel to DC, so angle DEF and angle EDC add up to 180°. Angle EDC = 180° − ${e}° = ${m}°.`,
  `AD is parallel to BC in a rhombus, so angle ADC = 180° − ${c}° = ${adc}°.`,
  `Angle ADE = angle ADC − angle EDC = ${adc}° − ${m}° = ${adeAngle}°.`,
 ];
 return {key,context:['ABCD is a rhombus. E is a point inside it and F is a point on side BC. DE = EF, and EF is parallel to DC.',`Angle BCD = ${c}° and angle DEF = ${e}°. The figure is not drawn to scale.`],prompt:'Find angle EDF and angle ADE.',
  answer:JSON.stringify([String(k),String(adeAngle)]),structuredResponse:{kind:'number-fields',fields:[{label:'Angle EDF (degrees)'},{label:'Angle ADE (degrees)'}]},
  hint:'Use the equal sides of triangle DEF first. Then use the parallel lines to find angle EDC.',explanation:steps.join(' '),workedSteps:steps.map(t=>({text:t})),
  picture:fig(`Rhombus ABCD with point E inside and point F on side BC. DE equals EF, and EF is parallel to DC. Angle BCD is ${c} degrees and angle DEF is ${e} degrees.`,marks)};
}

const CHOICES=['True','False','Not possible to tell'];

/** Variant 3: decide whether a statement is true, false or not possible to tell. */
function statementQuestion(r:Rng,key:string,kind:number):Question{
 const g=r.pick([118,122,126,130,134,138,142,148,152,156,160,164]);
 const x=r.int(30,65),rh=g-x;
 let y=r.int(20,70);
 while(Math.abs(y-x)<4)y=r.int(20,70);
 const h=180-g+y;
 const statements:[string,string,string][]=[
  [`∠BAD + ∠DEC = ${g}°`,'True',`∠BAD + ∠DEC = (${g} − x)° + x° = ${g}°, whatever x is. The statement is true.`],
  [`∠BAD = ${g}°`,'False',`∠BAD = (${g} − x)°, which is smaller than ${g}° because x is more than 0. The statement is false.`],
  [`∠ABC = ${270-g}°`,'False',`∠ABC = (${180-g} + x)° and x is less than 90°, so ∠ABC is less than ${270-g}°. The statement is false.`],
  [`∠ABC = ${h}°`,'Not possible to tell',`∠ABC = (${180-g} + x)°. It equals ${h}° only if x = ${y}, but x is not given. It is not possible to tell.`],
  [`∠DEC = ${y}°`,'Not possible to tell',`Nothing in the information fixes x, so ∠DEC = ${y}° may or may not be true. It is not possible to tell.`],
 ];
 const [statement,answer,verdict]=statements[kind%statements.length];
 const A:Pt=[-1-Math.cos(rh*rad),Math.sin(rh*rad)],B:Pt=[-1,0],C:Pt=[0,0],D:Pt=[-Math.cos(rh*rad),Math.sin(rh*rad)];
 const E:Pt=[-2*Math.cos(x*rad)*Math.cos(g*rad),2*Math.cos(x*rad)*Math.sin(g*rad)];
 const p=fit({A,B,C,D,E}),cen=centre([p.A,p.B,p.C,p.D]);
 const marks:Batch11UpperMark[]=[line(p.A,p.B),line(p.B,p.C),line(p.C,p.D),line(p.D,p.A),line(p.D,p.E),line(p.C,p.E),tick(p.C,p.D),tick(p.D,p.E),
  ...arcMarks(p.C,p.B,p.E,24,`${g}°`,.2,42),
  vlabel('A',p.A,cen),vlabel('B',p.B,cen),vlabel('C',p.C,cen),vlabel('D',p.D,cen),vlabel('E',p.E,cen)];
 const steps=[
  'Let ∠DEC = x°. DC = DE, so the base angles are equal: ∠DCE = x°. The two base angles are less than 180° together, so x is less than 90°.',
  `∠BCD = ∠BCE − ∠DCE = (${g} − x)°.`,
  `Opposite angles of a rhombus are equal, so ∠BAD = (${g} − x)°. Angles next to each other add to 180°, so ∠ABC = 180° − (${g} − x)° = (${180-g} + x)°.`,
  verdict,
 ];
 return {key,context:['ABCD is a rhombus. Triangle CDE is attached to side CD, outside the rhombus, and DC = DE.',`Angle BCE = ${g}°. The figure is not drawn to scale.`],prompt:'Is this statement true, false, or not possible to tell from the information given?',display:statement,
  answer,choices:[...CHOICES],hint:'Call ∠DEC by a letter, then write the other angles using that letter.',explanation:steps.join(' '),workedSteps:steps.map(t=>({text:t})),
  picture:fig(`Rhombus ABCD with triangle CDE attached outside side CD. DC equals DE. Angle BCE is ${g} degrees.`,marks)};
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const n=Math.abs(Math.trunc(seed))+index,variant=n%3,kind=Math.floor(n/3)%5;
 if(variant===0)return extensionQuestion(r,key);
 if(variant===1)return parallelQuestion(r,key);
 return statementQuestion(r,key,kind);
}
