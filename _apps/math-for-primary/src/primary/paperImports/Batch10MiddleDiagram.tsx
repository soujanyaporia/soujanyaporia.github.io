import type {ReactNode} from 'react';
import {Batch9EarlyDiagram} from './Batch9EarlyDiagram';
import type {Batch10MiddlePicture} from './batch10MiddlePicture';
const ink='#31594f',fill='#deebe5';
const text=(x:number,y:number,value:string,size=17)=><text x={x} y={y} textAnchor="middle" fontSize={size} fill="#243e36">{value}</text>;
export function Batch10MiddleDiagram({model:m}:{model:Batch10MiddlePicture}){
 if(m.layout==='mass-pair')return <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:12}}>{m.dials.map(d=><figure key={d.label} style={{width:270,maxWidth:'100%',margin:0}}><figcaption style={{textAlign:'center',fontWeight:700}}>{d.label}</figcaption><Batch9EarlyDiagram model={d.model}/></figure>)}</div>;
 let body:ReactNode,height=350,label='Mathematical figure';
 if(m.layout==='concave-polygon'){
  label='A concave polygon with pointed and inward corners';const minX=Math.min(...m.points.map(p=>p[0])),minY=Math.min(...m.points.map(p=>p[1])),w=Math.max(...m.points.map(p=>p[0]))-minX,h=Math.max(...m.points.map(p=>p[1]))-minY,s=Math.min(350/w,230/h),x=250-w*s/2,y=175-h*s/2;body=<polygon points={m.points.map(([a,b])=>`${x+(a-minX)*s},${y+(b-minY)*s}`).join(' ')} fill="none" stroke={ink} strokeWidth="3"/>;
 }else if(m.layout==='cube-completion'){
  label='Five joined squares and four possible squares to add';const all=[...m.cells,...m.candidates.map(c=>c.cell)],minX=Math.min(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),w=Math.max(...all.map(p=>p[0]))-minX+1,h=Math.max(...all.map(p=>p[1]))-minY+1,s=Math.min(60,350/w,250/h),ox=250-w*s/2,oy=175-h*s/2;
  body=<>{m.cells.map(([x,y],i)=><rect key={i} x={ox+(x-minX)*s} y={oy+(y-minY)*s} width={s} height={s} fill={fill} stroke={ink} strokeWidth="2"/>)}{m.candidates.map(c=><g key={c.label}><rect x={ox+(c.cell[0]-minX)*s} y={oy+(c.cell[1]-minY)*s} width={s} height={s} fill="none" stroke="#81684e" strokeDasharray="5 3"/>{text(ox+(c.cell[0]-minX+.5)*s,oy+(c.cell[1]-minY+.5)*s+7,c.label,21)}</g>)}</>;
 }else if(m.layout==='compass'){
  label='Eight compass directions spaced equally around north';const names=['North','North-east','East','South-east','South','South-west','West','North-west'];body=names.map((name,i)=>{const a=i*Math.PI/4,x=250+110*Math.sin(a),y=175-110*Math.cos(a),tx=250+143*Math.sin(a),ty=175-143*Math.cos(a);return <g key={name}><line x1="250" y1="175" x2={x} y2={y} stroke={ink} strokeWidth="2"/>{text(tx,ty+6,name,15)}</g>;});
 }else if(m.layout==='line-options'){
  height=375;label='Four figures on square grids';body=m.options.map((o,i)=>{const x=65+i%2*250,y=25+Math.floor(i/2)*180,s=30;return <g key={o.label}>{text(x-20,y+70,o.label,21)}{Array.from({length:6},(_,k)=><g key={k}><line x1={x+k*s} y1={y} x2={x+k*s} y2={y+150} stroke="#d6e0da"/><line x1={x} y1={y+k*s} x2={x+150} y2={y+k*s} stroke="#d6e0da"/></g>)}{o.segments.map(([a,b],n)=><line key={n} x1={x+a[0]*s} y1={y+a[1]*s} x2={x+b[0]*s} y2={y+b[1]*s} stroke={ink} strokeWidth="2.8"/>)}</g>;});
 }else if(m.layout==='three-shape-area'){
  label='Two identical rectangles flank a lower square';const side=m.height-m.drop,s=Math.min(330/m.width,210/m.height),x=85,y=280,H=m.height*s,S=side*s,D=m.drop*s;body=<><path d={`M${x} ${y}V${y-H}H${x+S}V${y-S}H${x+2*S}V${y-H}H${x+3*S}V${y}Z`} fill={fill} stroke={ink} strokeWidth="2.5"/><path d={`M${x+S} ${y-S}V${y}M${x+2*S} ${y-S}V${y}`} fill="none" stroke={ink} strokeDasharray="4 3"/>{[['A',x,y-H-10],['B',x+S,y-H-10],['C',x+S-9,y-S-8],['D',x+2*S+9,y-S-8],['E',x+2*S,y-H-10],['F',x+3*S,y-H-10],['G',x+3*S,y+24],['H',x+2*S,y+24],['I',x+S,y+24],['J',x,y+24]].map(([v,a,b])=><g key={v}>{text(Number(a),Number(b),String(v),16)}</g>)}{text(x+1.5*S,y+52,`${m.width} cm`)}{text(x+3*S+35,y-H/2,`${m.height} cm`)}{text(x+2*S-27,y-H+D/2,`${m.drop} cm`,15)}</>;
 }else{
  label='A pie chart with two right-angle sectors and one known count';const angles=[90,135,90,45],r=125,cx=250,cy=175,p=(a:number,length=r)=>[cx+length*Math.cos(a*Math.PI/180),cy+length*Math.sin(a*Math.PI/180)];let start=m.rotation;
  body=angles.map((a,i)=>{const end=start+a,A=p(start),B=p(end),at=p(start+a/2,83),first=start;start=end;const u=p(first,17),v=p(end,17),corner=[u[0]+v[0]-cx,u[1]+v[1]-cy];return <g key={i}><path d={`M${cx} ${cy}L${A[0]} ${A[1]}A${r} ${r} 0 0 1 ${B[0]} ${B[1]}Z`} fill={i%2?'#edf2f7':'#e0ebe4'} stroke={ink} strokeWidth="2"/>{text(at[0],at[1],m.labels[i],14)}{i===0&&text(at[0],at[1]+21,String(m.knownCount),16)}{a===90&&<path d={`M${u[0]} ${u[1]}L${corner[0]} ${corner[1]}L${v[0]} ${v[1]}`} fill="none" stroke={ink} strokeWidth="1.6"/>}</g>;});
 }
 return <svg className="game-figure" viewBox={`0 0 500 ${height}`} role="img" aria-label={label}>{body}</svg>;
}
