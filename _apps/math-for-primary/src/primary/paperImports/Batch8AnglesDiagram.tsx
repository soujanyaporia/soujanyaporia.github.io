import {anglePoint,type AnglePoint,type Batch8AnglesPicture} from './batch8AnglesPicture';
export {anglePoint} from './batch8AnglesPicture';
const arc=(x:number,y:number,r:number,from:number,to:number)=>{const a=anglePoint(x,y,r,from),b=anglePoint(x,y,r,to);return `M${a[0]} ${a[1]}A${r} ${r} 0 ${to-from>180?1:0} 0 ${b[0]} ${b[1]}`;};
/** Both zero origins are printed. Rotation moves the complete tool, including ticks. */
export function AngleProtractor({x,y,rotation=0,radius=175}:{x:number;y:number;rotation?:number;radius?:number}){
 return <g data-protractor="dual-scale" transform={`rotate(${-rotation} ${x} ${y})`}>
  <path d={`M${x-radius} ${y}A${radius} ${radius} 0 0 1 ${x+radius} ${y}Z`} fill="#fbfcfa" fillOpacity=".88" stroke="#8a9691"/>
  {Array.from({length:181},(_,i)=>{const major=i%10===0,mid=i%5===0,a=anglePoint(x,y,radius-(major?16:mid?11:6),i),b=anglePoint(x,y,radius,i);return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#718078" strokeWidth={major?1.3:.6}/>;})}
  {Array.from({length:19},(_,i)=>{const deg=i*10,a=anglePoint(x,y,radius-28,deg),b=anglePoint(x,y,radius-48,deg),offset=i===0||i===18?17:4;return <g key={i}><text x={a[0]} y={a[1]+offset} textAnchor="middle" fontSize="13" fill="#1b3830">{deg}</text><text x={b[0]} y={b[1]+offset} textAnchor="middle" fontSize="12" fill="#5f625f">{180-deg}</text></g>;})}
  <path d={`M${x-10} ${y}H${x+10}M${x} ${y-10}V${y+10}`} stroke="#88938e" fill="none"/>
 </g>;
}
function Label({point,vertex}:{point:AnglePoint;vertex?:AnglePoint}){const dx=vertex?point.x-vertex.x:0,dy=vertex?point.y-vertex.y:0,len=Math.hypot(dx,dy)||1;return <text x={point.x+dx/len*14} y={point.y+dy/len*14+6} textAnchor="middle" fontSize="19" fontWeight="650">{point.label}</text>;}
export function Batch8AnglesDiagram({model:m}:{model:Batch8AnglesPicture}){
 let body;
 if(m.layout==='square-corner'){
  const x=105,y=285,side=205,low=m.nearHorizontal,high=90-m.nearVertical,hit=(degrees:number)=>{const slope=Math.tan(degrees*Math.PI/180);return slope>=1?[x+side/slope,y-side]:[x+side,y-side*slope];},a=hit(low),b=hit(high),labels=[{start:0,end:low,text:`${low}°`,r:62},{start:low,end:high,text:'y',r:88},{start:high,end:90,text:`${m.nearVertical}°`,r:115}];
  body=<><rect x={x} y={y-side} width={side} height={side} fill="none" stroke="#315c50" strokeWidth="2.6"/><path d={`M${a[0]} ${a[1]}L${x} ${y}L${b[0]} ${b[1]}`} fill="none" stroke="#315c50" strokeWidth="2.5"/>{labels.map((item,i)=>{const at=anglePoint(x,y,item.r+18,(item.start+item.end)/2);return <g key={i}><path d={arc(x,y,item.r,item.start,item.end)} stroke="#9b7036" fill="none" strokeWidth="1.6"/><text x={at[0]} y={at[1]+5} textAnchor="middle" fontSize="17">{item.text}</text></g>;})}{[{x,y:y-side,label:'A'},{x:x+side,y:y-side,label:'B'},{x:x+side,y,label:'C'},{x,y,label:'D'}].map(p=><text key={p.label} x={p.x+(p.x===x?-16:16)} y={p.y+(p.y===y?22:-10)} textAnchor="middle" fontSize="19">{p.label}</text>)}</>;
 }else if(m.layout==='notation'){
  const v=m.points[m.markedVertex],prev=m.points[(m.markedVertex+m.points.length-1)%m.points.length],next=m.points[(m.markedVertex+1)%m.points.length],from=Math.atan2(v.y-prev.y,prev.x-v.x)*180/Math.PI,to=Math.atan2(v.y-next.y,next.x-v.x)*180/Math.PI;let a=from,b=to;if(b<a)b+=360;if(b-a>180){a=to;b=from;if(b<a)b+=360;}
  const centre={x:m.points.reduce((s,p)=>s+p.x,0)/m.points.length,y:m.points.reduce((s,p)=>s+p.y,0)/m.points.length,label:''};
  body=<><polygon points={m.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#315c50" strokeWidth="2.6"/><path d={arc(v.x,v.y,28,a,b)} fill="none" stroke="#9b7036" strokeWidth="2.3"/>{m.points.map(p=><Label key={p.label} point={p} vertex={centre}/>)}</>;
 }else{
  const v=m.vertex,ends=m.layout==='rays'?m.ends:[m.base];
  body=<>{m.protractorRotation!==undefined&&<AngleProtractor x={v.x} y={v.y} rotation={m.protractorRotation}/>}<path d={ends.map(p=>`M${v.x} ${v.y}L${p.x} ${p.y}`).join(' ')} fill="none" stroke="#254f44" strokeWidth="3"/>{m.layout==='rays'&&m.closeShape&&<line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke="#254f44" strokeWidth="3"/>}<circle cx={v.x} cy={v.y} r="3" fill="#254f44"/><text x={v.x} y={v.y+24} textAnchor="middle" fontSize="19">{v.label}</text>{ends.map(p=><Label key={p.label} point={p} vertex={v}/>)}{m.layout==='rays'&&<><path d={arc(v.x,v.y,36,m.mark[0],m.mark[1])} fill="none" stroke="#a57634" strokeWidth="2"/>{m.markLabel&&(()=>{const p=anglePoint(v.x,v.y,55,(m.mark[0]+m.mark[1])/2);return <text x={p[0]} y={p[1]+5} textAnchor="middle" fontSize="18">{m.markLabel}</text>;})()}</>}{m.layout==='dots'&&m.dots.map(p=><g key={p.label}><circle cx={p.x} cy={p.y} r="4" fill="#254f44"/><Label point={p} vertex={v}/></g>)}</>;
 }
 return <svg className="game-figure" viewBox="0 0 500 360" role="img" aria-label={m.layout==='notation'?'A labelled polygon with one angle marked':m.layout==='square-corner'?'A square corner split into three adjacent angles':m.layout==='dots'?'A labelled baseline and candidate points':'A labelled angle'+(m.protractorRotation!==undefined?' with a dual-scale protractor':'')}>{body}</svg>;
}
