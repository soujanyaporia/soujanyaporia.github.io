import {useId} from 'react';
import type {ReactNode} from 'react';
import {solidCubes,type P5MahaBodhiPicture} from './p5MahaBodhiPicture';
import './p5MahaBodhiDiagram.css';
export function P5MahaBodhiDiagram({model:m}:{model:P5MahaBodhiPicture}){
 const id=useId().replaceAll(':','');
 if(m.layout==='parcel')return <figure className="maha-diagram"><table><caption>Parcel delivery charges</caption><thead><tr><th scope="col">Mass</th><th scope="col">Charge</th></tr></thead><tbody><tr><th scope="row">First {m.firstMass} g</th><td>${(m.baseCents/100).toFixed(2)}</td></tr><tr><th scope="row">Each further {m.blockMass} g or part of it</th><td>${(m.blockCents/100).toFixed(2)}</td></tr></tbody></table></figure>;
 const text=(x:number,y:number,s:ReactNode,anchor:'start'|'middle'|'end'='middle')=><text x={x} y={y} textAnchor={anchor} fontSize="17" fill="#203e50">{s}</text>;
 const line=(x1:number,y1:number,x2:number,y2:number,dash=false)=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#234b61" strokeWidth="2" strokeDasharray={dash?'5 4':undefined}/>;
 let desc='',content:ReactNode;
 if(m.layout==='two-squares'){
  const s=180,t=s/m.ratio,x=70,y=245;desc=`ABCD is a square with side ${m.side} cm. EFGC is a square. AB is ${m.ratio} times EF. D, C and G lie on one straight line. Triangle AGD is shaded.`;
  content=<>{<polygon points={`${x},${y-s} ${x},${y} ${x+s+t},${y}`} fill="#a7d8e5"/>}<path d={`M${x} ${y}V${y-s}H${x+s}V${y}ZM${x+s} ${y}V${y-t}H${x+s+t}V${y}ZM${x} ${y-s}L${x+s+t} ${y}`} fill="none" stroke="#234b61" strokeWidth="2"/>{text(x-14,y-s,'A')}{text(x+s+12,y-s-8,'B')}{text(x+s-10,y-t-8,'E')}{text(x+s+t+12,y-t,'F')}{text(x-12,y+22,'D')}{text(x+s,y+24,'C')}{text(x+s+t,y+24,'G')}{text(x+s/2,y-s-20,`${m.side} cm`)}</>;
 }else if(m.layout==='composite'){
  const k=240/(m.width+m.extension),x=85,y=230,w=m.width*k,h=m.height*k,e=m.extension*k,v=m.tipHeight*k;desc=`PQST is a rectangle, width ${m.width} m and height ${m.height} m. R is ${m.extension} m to the right of QS, and ${m.tipHeight} m above line TS. Region PQRT is shaded.`;
  content=<><polygon points={`${x},${y-h} ${x+w},${y-h} ${x+w+e},${y-v} ${x},${y}`} fill="#a7d8e5" stroke="#234b61" strokeWidth="2"/>{line(x,y,x+w,y)}{line(x+w,y-h,x+w,y)}{line(x+w,y,x+w+e,y-v)}{line(x+w,y,x+w+e,y,true)}{line(x+w+e,y,x+w+e,y-v,true)}{text(x-10,y-h-8,'P')}{text(x+w,y-h-10,'Q')}{text(x-10,y+20,'T')}{text(x+w-6,y+20,'S')}{text(x+w+e+12,y-v-3,'R')}{text(x-12,y-h/2,`${m.height} m`,'end')}{text(x+w/2,y+24,`${m.width} m`)}{text(x+w+e/2,y+48,`${m.extension} m`)}{text(x+w+e+10,y-v/2,`${m.tipHeight} m`,'start')}</>;
 }else if(m.layout==='containers'){
  desc=`Container A has a square base, side ${m.side} cm, height ${m.height} cm, and ${m.water} cm³ of water. B is empty and its capacity is ${m.multiple} times A's capacity.`;
  const tank=(x:number,y:number,w:number,h:number,filled:number)=><g><path d={`M${x} ${y}v-${h}l24 -20h${w}v${h}l-24 20ZM${x} ${y-h}h${w}l24 -20M${x+w} ${y-h}v${h}`} fill="none" stroke="#234b61" strokeWidth="2"/>{filled>0&&<rect x={x+2} y={y-filled} width={w-4} height={filled-2} fill="#a7d8e5"/>}</g>;
  content=<>{tank(75,240,70,165,165*m.water/(m.side*m.side*m.height))}{tank(260,240,125,80,0)}{text(110,275,'Container A')}{text(322,275,'Container B')}{text(110,258,`${m.side} cm`)}{text(66,160,`${m.height} cm`,'end')}{text(320,110,'empty')}{text(230,310,'Drawing not to scale')}</>;
 }else if(m.layout==='cube-growth'){
  desc=`The solids have the same stepped front profile: column heights ${m.heights.join(', ')} unit cubes. Their depths are ${m.depths.join(', ')} unit cubes. The pattern adds one identical layer each time.`;
  const project=(x:number,y:number,z:number)=>[x*19+y*9,-z*19-y*8];
  content=<>{m.depths.map((depth,i)=><g key={depth} transform={`translate(${30+i*146} 215)`}>{solidCubes(m.heights,depth).sort((a,b)=>b[1]-a[1]||a[2]-b[2]||a[0]-b[0]).map(([x,y,z])=>{const pts=(v:number[][])=>v.map(p=>project(p[0],p[1],p[2]).join(',')).join(' ');return <g key={`${x},${y},${z}`} data-unit-cube={`${x},${y},${z}`}><polygon points={pts([[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]])} fill="#d2edf2" stroke="#234b61"/><polygon points={pts([[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]])} fill="#8fb8cb" stroke="#234b61"/><polygon points={pts([[x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1]])} fill="#b8dce7" stroke="#234b61"/></g>;})}{text(50,35,`Solid ${i+1}`)}</g>)}</>;
 }else{
  const x=70,y=245,s=180,e=s*m.extensionRatio,hitY=y-s+s*(.5)/(.5+m.extensionRatio);desc=`ABCD is a square with area ${m.area} cm². E is the midpoint of AB. D, C and F are collinear. Triangle EBF crosses the square. X is the part of the square outside the triangle; Y is the part of the triangle outside the square.`;
  content=<><polygon points={`${x},${y-s} ${x+s/2},${y-s} ${x+s},${hitY} ${x+s},${y} ${x},${y}`} fill="#a7d8e5"/><polygon points={`${x+s},${y-s} ${x+s+e},${y} ${x+s},${hitY}`} fill="#acd9bc"/><path d={`M${x} ${y}V${y-s}H${x+s}V${y}ZM${x+s/2} ${y-s}L${x+s+e} ${y}L${x+s} ${y-s}`} fill="none" stroke="#234b61" strokeWidth="2"/>{line(x+s,y,x+s+e+15,y,true)}{text(x-12,y-s,'A')}{text(x+s/2,y-s-12,'E')}{text(x+s+10,y-s,'B')}{text(x-12,y+22,'D')}{text(x+s,y+22,'C')}{text(x+s+e,y+22,'F')}{text(x+s*.4,y-s*.4,'X')}{text(x+s+e*.35,y-s*.5,'Y')}{text(220,35,`Square area = ${m.area} cm²`)}</>;
 }
 return <figure className="maha-diagram"><svg viewBox={m.layout==='cube-growth'?'0 70 460 220':'0 0 460 330'} role="img" aria-labelledby={`${id}-title ${id}-desc`}><title id={`${id}-title`}>Maths diagram</title><desc id={`${id}-desc`}>{desc}</desc>{content}</svg>{m.layout==='cube-growth'&&<figcaption>Each solid is built from identical layers. Hidden cubes are included.</figcaption>}</figure>;
}
