import type {ReactNode} from 'react';
import {foldGeometry,squareRhombusGeometry,parallelShapesGeometry,type Point,type P6CatholicPicture} from './p6CatholicPicture';
import './p6CatholicDiagram.css';
const p=(q:Point)=>`${q.x},${q.y}`;
const line=(a:Point,b:Point,extra:Record<string,unknown>={})=><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...extra}/>;
const label=(at:Point,text:string,dx=0,dy=0)=><text x={at.x+dx} y={at.y+dy}>{text}</text>;
function sector(at:Point,a:Point,b:Point,r:number,text:string,distance=r+16){
 let start=Math.atan2(a.y-at.y,a.x-at.x),end=Math.atan2(b.y-at.y,b.x-at.x);while(end-start>Math.PI)end-=2*Math.PI;while(end-start<-Math.PI)end+=2*Math.PI;
 const mid=(start+end)/2,s={x:at.x+r*Math.cos(start),y:at.y+r*Math.sin(start)},e={x:at.x+r*Math.cos(end),y:at.y+r*Math.sin(end)};
 return <g className="p6-angle-mark"><path d={`M${p(s)} A${r},${r} 0 0 ${end>start?1:0} ${p(e)}`} fill="none"/><text x={at.x+distance*Math.cos(mid)} y={at.y+distance*Math.sin(mid)+5} textAnchor="middle">{text}</text></g>;
}
function right(at:Point,a:Point,b:Point){const ua={x:(a.x-at.x)/Math.hypot(a.x-at.x,a.y-at.y)*12,y:(a.y-at.y)/Math.hypot(a.x-at.x,a.y-at.y)*12},ub={x:(b.x-at.x)/Math.hypot(b.x-at.x,b.y-at.y)*12,y:(b.y-at.y)/Math.hypot(b.x-at.x,b.y-at.y)*12};return <path className="p6-right-mark" d={`M${at.x+ua.x},${at.y+ua.y} l${ub.x},${ub.y} l${-ua.x},${-ua.y}`} fill="none"/>;}
const svg=(title:string,content:ReactNode,viewBox='0 0 460 290')=><svg viewBox={viewBox} role="img" aria-label={title}><title>{title}</title>{content}</svg>;
export function P6CatholicDiagram({model:m}:{model:P6CatholicPicture}){
 let content:ReactNode;
 if(m.layout==='fold'){
  const {A,T,C,D,P,Q}=foldGeometry(m.angle),outline=[A,T,P,D].map(p).join(' ');
  return <figure className="p6-geometry"><div className="p6-fold-panels"><div><strong>Before folding</strong>{svg('Rectangle with a crease from the upper right corner to its lower edge.',<><polygon className="p6-shape" points={[A,T,C,D].map(p).join(' ')}/>{line(T,P,{className:'p6-crease'})}{right(C,T,P)}<text x="90" y="225">Fold the corner inward</text></>,'0 0 330 250')}</div><div><strong>After folding</strong>{svg(`Folded rectangle. The marked angle at the lower crease point is ${m.angle} degrees. Find p at the upper right corner.`,<><polygon className="p6-shape" points={outline}/><polygon className="p6-folded" points={[T,Q,P].map(p).join(' ')}/>{line(T,P,{className:'p6-crease'})}{right(Q,T,P)}{sector(P,T,Q,20,`${m.angle}°`,35)}{sector(T,A,Q,30,'p',51)}</>,'0 0 330 250')}</div></div><figcaption>The paper is a rectangle. The fold preserves its corner angle.</figcaption></figure>;
 }
 if(m.layout==='square-rhombus'){
  const {A,B,C,D,E,F,G}=squareRhombusGeometry(m.angle);
  content=svg(`ABCD is a square and CEFD is a rhombus. A, G, F and C, G, D are collinear. Angle GDF is ${m.angle} degrees. Find angle GFD.`,<><polygon className="p6-shape" points={[A,B,C,D].map(p).join(' ')}/><polygon className="p6-shape p6-second" points={[C,E,F,D].map(p).join(' ')}/>{line(A,F)}{line(C,D)}{right(D,A,C)}{sector(D,C,F,20,`${m.angle}°`,34)}{sector(F,G,D,18,'p',27)}{label(A,'A',-24,0)}{label(B,'B',-4,-12)}{label(C,'C',-3,-12)}{label(D,'D',-15,26)}{label(E,'E',8,0)}{label(F,'F',5,26)}{label(G,'G',-12,-10)}</>);
 }else if(m.layout==='parallel-shapes'){
  const {A,B,E,F,G,H}=parallelShapesGeometry(m.alpha,m.beta,m.gamma);
  content=svg(`EFGH is a parallelogram. AE is parallel to HB. Angle AEH is ${m.alpha} degrees, EBH is ${m.beta} degrees and FGH is ${m.gamma} degrees. Find BEF.`,<><polygon className="p6-shape" points={[E,F,G,H].map(p).join(' ')}/><polygon className="p6-shape p6-second" points={[E,B,H,A].map(p).join(' ')}/>{line(E,H)}{sector(E,A,H,30,`${m.alpha}°`,55)}{sector(B,E,H,24,`${m.beta}°`,43)}{sector(G,F,H,27,`${m.gamma}°`,49)}{sector(E,B,F,46,'p',69)}{label(A,'A',-25,3)}{label(E,'E',-5,-17)}{label(F,'F',5,-8)}{label(G,'G',8,20)}{label(H,'H',-15,24)}{label(B,'B',14,8)}<text x="235" y="265" textAnchor="middle">AE parallel to HB</text></>);
 }else if(m.layout==='circle'){
  const isRadius=m.measure==='radius';content=svg(`Circle with ${m.measure} ${m.value} centimetres.`,<><circle className="p6-shape" cx="230" cy="140" r="95"/><circle cx="230" cy="140" r="4" className="p6-dot"/>{line({x:isRadius?230:135,y:140},{x:325,y:140},{className:'p6-dimension'})}<text x={isRadius?275:230} y="124" textAnchor="middle">{m.value} cm</text><text x="230" y="265" textAnchor="middle">{isRadius?'Radius':'Diameter'}</text></>);
 }else if(m.layout==='quarter-square'){
  content=svg(`A square joined to a quarter circle. The quarter-circle radius and square side are both ${m.side} centimetres.`,<><path className="p6-shape" d="M80 60H380V210H230 A150 150 0 0 1 80 60Z"/>{line({x:230,y:60},{x:230,y:210},{className:'p6-crease'})}{right({x:230,y:60},{x:80,y:60},{x:230,y:210})}{line({x:80,y:35},{x:230,y:35},{className:'p6-dimension'})}<text x="155" y="24" textAnchor="middle">{m.side} cm</text><text x="305" y="142" textAnchor="middle">Square</text><text x="230" y="260" textAnchor="middle">Quarter circle + square</text></>);
 }else{
  const scale=Math.min(270/m.length,65/m.radius),L=m.length*scale,R=m.radius*scale,left=(460-L)/2,rightX=left+L,cy=150;
  content=svg(`A rectangle with two semicircular ends. Rectangle length ${m.length} metres; each semicircle radius ${m.radius} metres.`,<><path className="p6-shape" d={`M${left} ${cy-R} H${rightX} A${R} ${R} 0 0 1 ${rightX} ${cy+R} H${left} A${R} ${R} 0 0 1 ${left} ${cy-R}Z`}/>{line({x:left,y:cy-R},{x:left,y:cy+R},{className:'p6-crease'})}{line({x:rightX,y:cy-R},{x:rightX,y:cy+R},{className:'p6-crease'})}{line({x:left,y:cy-R-24},{x:rightX,y:cy-R-24},{className:'p6-dimension'})}<text x="230" y={cy-R-33} textAnchor="middle">{m.length} m</text>{line({x:rightX,y:cy},{x:rightX+R,y:cy},{className:'p6-dimension'})}<text x={rightX+R/2} y={cy+R+25} textAnchor="middle">{m.radius} m</text></>);
 }
 return <figure className="p6-geometry">{content}</figure>;
}
