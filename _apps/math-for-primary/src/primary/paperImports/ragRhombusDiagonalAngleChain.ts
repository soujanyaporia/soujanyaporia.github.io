import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN={
 id:'p5-rhombus-diagonal-angle-chain',
 level:5,
 title:'Find angles using a rhombus diagonal',
 objective:'Use equal sides, the diagonal of a rhombus and opposite or adjacent angle facts, then a straight line or triangle angle sum, to find an unknown angle.',
 skillIds:['P5.S.SHAPE.01','P5.S.SHAPE.02','P5.S.SHAPE.03','P5.S.ANGLE.01'],
 canonicalPatternId:'p5-rhombus-diagonal-angle-chain',
};

type Pt=[number,number];
const r1=(v:number)=>Math.round(v*10)/10;
const rad=(deg:number)=>deg*Math.PI/180;
const unitVec=(a:Pt,b:Pt):Pt=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;return [dx/n,dy/n];};
const line=(a:Pt,b:Pt):Batch11UpperMark=>({kind:'line',x1:r1(a[0]),y1:r1(a[1]),x2:r1(b[0]),y2:r1(b[1])});
const text=(x:number,y:number,t:string):Batch11UpperMark=>({kind:'text',x:r1(x),y:r1(y),text:t});

/** Fit mathematical coordinates (y up) into the 300 by 200 drawing area (y down). */
function place(raw:Record<string,Pt>):Record<string,Pt>{
 const pts=Object.values(raw),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const w=Math.max(maxX-minX,1e-6),h=Math.max(maxY-minY,1e-6),scale=Math.min(220/w,140/h);
 const ox=(300-w*scale)/2,oy=(200-h*scale)/2;
 return Object.fromEntries(Object.entries(raw).map(([k,p])=>[k,[ox+(p[0]-minX)*scale,oy+(maxY-p[1])*scale] as Pt]));
}

function figure(label:string,raw:Record<string,Pt>,segments:string[],angles:[string,string,string,string][],inner:string[]=[]):Picture{
 const P=place(raw),names=Object.keys(P);
 const cx=names.reduce((s,n)=>s+P[n][0],0)/names.length,cy=names.reduce((s,n)=>s+P[n][1],0)/names.length;
 const marks:Batch11UpperMark[]=segments.map(s=>line(P[s[0]],P[s[1]]));
 for(const n of names){
  const p=P[n],u:Pt=inner.includes(n)?[0.7,-0.7]:unitVec([cx,cy],p);
  marks.push(text(p[0]+u[0]*14-4,p[1]+u[1]*14+5,n));
 }
 for(const [v,a,b,t] of angles){
  const u=unitVec(P[v],P[a]),w=unitVec(P[v],P[b]),m=unitVec([0,0],[u[0]+w[0],u[1]+w[1]]);
  marks.push(text(P[v][0]+m[0]*34-10,P[v][1]+m[1]*34+4,t));
 }
 return ({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;
}

/** Rhombus KLMN: K top-left, L top-right, M bottom-right, N bottom-left. d is angle KMN. */
const rhombus=(d:number)=>{
 const s=100,e=rad(180-2*d);
 const N:Pt=[0,0],M:Pt=[s,0],K:Pt=[s*Math.cos(e),s*Math.sin(e)],L:Pt=[K[0]+s,K[1]];
 return {s,N,M,K,L};
};

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p5-rhombus-diagonal-angle-chain:${seed}:${index}`));
 const variant=(((Math.trunc(seed)+index)%4)+4)%4;
 const key=`rag-p5-rhombus-diagonal-angle-chain:${seed}:${index}`;
 const scaleNote='The figure is not drawn to scale.';
 const done=(context:string[],prompt:string,answer:number,hint:string,steps:string[],picture:Picture):Question=>({
  key,context,prompt,answer:String(answer),unit:'degrees',hint,
  workedSteps:steps.map(t=>({text:t})),explanation:steps.join(' '),picture,
 });
 if(variant===0){
  const d=r.int(52,78),apex=180-2*d,{N,M,K,L}=rhombus(d);
  return done(
   ['KLMN is a rhombus. KM is a diagonal.',`Angle KMN = ${d}°. ${scaleNote}`],
   'Find angle KLM.',apex,
   'Triangle KMN has two sides that are sides of the rhombus. What does that tell you about its base angles?',
   [`KN = NM because they are sides of a rhombus, so angle NKM = angle KMN = ${d}°.`,`Angle KNM = 180° − ${d}° − ${d}° = ${apex}°.`,`Opposite angles of a rhombus are equal, so angle KLM = ${apex}°.`],
   figure(`Rhombus KLMN with diagonal KM. Angle KMN is ${d} degrees. Angle KLM is marked with a question mark.`,{K,L,M,N},['KL','LM','MN','NK','KM'],[['M','K','N',`${d}°`],['L','K','M','?']]),
  );
 }
 if(variant===1){
  const d=r.int(55,75),a=r.int(35,Math.min(100,2*d-20)),apex=180-2*d,answer=2*d-a,{s,N,M,K,L}=rhombus(d);
  const H:Pt=[K[0]-s*Math.sin(rad(answer))/Math.sin(rad(a)),K[1]];
  return done(
   ['KLMN is a rhombus with diagonal KM. H, K and L lie on one straight line, and H is joined to N.',`Angle NHK = ${a}° and angle KMN = ${d}°. ${scaleNote}`],
   'Find angle HNK.',answer,
   'First use the diagonal to find an angle of the rhombus at K. Then use the straight line HKL and triangle HNK.',
   [`KN = NM, so angle NKM = ${d}° and angle KNM = 180° − 2 × ${d}° = ${apex}°.`,`Adjacent angles of a rhombus add up to 180°, so angle NKL = 180° − ${apex}° = ${2*d}°.`,`H, K and L are on a straight line, so angle HKN = 180° − ${2*d}° = ${apex}°.`,`In triangle HNK, angle HNK = 180° − ${a}° − ${apex}° = ${answer}°.`],
   figure(`Rhombus KLMN with diagonal KM. H, K, L are on a straight line and H is joined to N. Angle NHK is ${a} degrees and angle KMN is ${d} degrees. Angle HNK is marked with a question mark.`,{H,K,L,M,N},['HL','LM','MN','NK','KM','HN'],[['H','N','K',`${a}°`],['M','K','N',`${d}°`],['N','H','K','?']]),
  );
 }
 if(variant===2){
  const d=r.int(52,78),apex=180-2*d,answer=2*d,{N,M,K,L}=rhombus(d);
  const T:Pt=[L[0]+(L[0]-M[0])*0.5,L[1]+(L[1]-M[1])*0.5];
  return done(
   ['KLMN is a rhombus with diagonal KM. M, L and T lie on one straight line, with L between M and T.',`Angle KMN = ${d}°. ${scaleNote}`],
   'Find angle KLT.',answer,
   'Find angle KLM inside the rhombus first. Then use the straight line MLT.',
   [`KN = NM, so angle NKM = ${d}° and angle KNM = 180° − 2 × ${d}° = ${apex}°.`,`Opposite angles of a rhombus are equal, so angle KLM = ${apex}°.`,`M, L and T are on a straight line, so angle KLT = 180° − ${apex}° = ${answer}°.`],
   figure(`Rhombus KLMN with diagonal KM. M, L, T are on a straight line with L between M and T. Angle KMN is ${d} degrees. Angle KLT is marked with a question mark.`,{K,L,M,N,T},['KL','LM','MN','NK','KM','LT'],[['M','K','N',`${d}°`],['L','K','T','?']]),
  );
 }
 let x=r.int(18,72);if(x===45)x=46;
 const t=Math.tan(rad(x)),answer=90-x;
 let raw:Record<string,Pt>={W:[0,t],X:[1,0],Y:[0,-t],Z:[-1,0],O:[0,0]};
 if(x>45)raw=Object.fromEntries(Object.entries(raw).map(([k,p])=>[k,[p[1],-p[0]] as Pt]));
 return done(
  ['WXYZ is a rhombus. Its diagonals WY and XZ cross at O.',`Angle WZX = ${x}°. ${scaleNote}`],
  'Find angle XYO.',answer,
  'The diagonals of a rhombus cross at a right angle. Which angle in triangle XOY equals the given angle?',
  [`The diagonals of a rhombus cross at right angles, so angle XOY = 90°.`,`WZ is parallel to XY, so angle ZXY = angle WZX = ${x}° (alternate angles). Angle OXY is the same angle.`,`In triangle XOY, angle XYO = 180° − 90° − ${x}° = ${answer}°.`],
  figure(`Rhombus WXYZ with diagonals WY and XZ crossing at O. Angle WZX is ${x} degrees. Angle XYO is marked with a question mark.`,raw,['WX','XY','YZ','ZW','WY','XZ'],[['Z','W','X',`${x}°`],['Y','X','O','?']],['O']),
 );
}
