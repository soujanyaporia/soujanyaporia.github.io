import type {P3RafflesPicture,Point} from './p3RafflesPicture';
import './p3RafflesDiagram.css';

const pts=(points:Point[])=>points.map(p=>p.join(',')).join(' ');
const title='Original mathematical diagram';
/** Passive question givens: answer controls remain the shared touch/keyboard question controls. */
export function P3RafflesDiagram({model:m}:{model:P3RafflesPicture}){
 if(m.layout==='angle-polygon'){
  const maxX=Math.max(...m.points.map(p=>p[0])),maxY=Math.max(...m.points.map(p=>p[1])),scale=260/Math.max(maxX,maxY),r=m.rotation*Math.PI/180;
  const points:Point[]=m.points.map(([x,y])=>{const a=(x-maxX/2)*scale,b=(y-maxY/2)*scale;return [180+a*Math.cos(r)-b*Math.sin(r),180+a*Math.sin(r)+b*Math.cos(r)];});
  return <figure className="raffles-diagram"><svg viewBox="0 0 360 360" role="img" aria-label={`A polygon with angles ${m.angles.map(a=>a.label).join(', ')} marked inside its boundary.`}>
   <title>{`${title}: compare marked angles with a right angle`}</title><polygon data-angle-polygon={JSON.stringify(m.points)} points={pts(points)} fill="#e2f0ec" stroke="#245b51" strokeWidth="3"/>
   {m.angles.map(a=>{const p=points[a.vertex],prev=points[(a.vertex+points.length-1)%points.length],next=points[(a.vertex+1)%points.length],v=[prev[0]-p[0],prev[1]-p[1]],w=[next[0]-p[0],next[1]-p[1]],vl=Math.hypot(...v),wl=Math.hypot(...w),u=[v[0]/vl,v[1]/vl],t=[w[0]/wl,w[1]/wl],mid=[u[0]+t[0],u[1]+t[1]],ml=Math.hypot(...mid),radius=21,sweep=u[0]*t[1]-u[1]*t[0]>0?1:0;
    return <g key={a.label} data-angle-label={a.label} data-vertex={a.vertex}><path d={`M${p[0]+u[0]*radius} ${p[1]+u[1]*radius} A${radius} ${radius} 0 0 ${sweep} ${p[0]+t[0]*radius} ${p[1]+t[1]*radius}`} fill="none" stroke="#a76125" strokeWidth="2.5"/><text x={p[0]+mid[0]/ml*38} y={p[1]+mid[1]/ml*38+7} textAnchor="middle">{a.label}</text></g>;
   })}</svg><figcaption>Compare the marked openings with a square corner.</figcaption></figure>;
 }
 if(m.layout==='polygons')return <figure className="raffles-diagram"><svg viewBox="0 0 400 370" role="img" aria-label="Four shapes on equal square grids. Every small square is one square centimetre.">
  <title>{`${title}: areas on square grids`}</title>{m.shapes.map((s,i)=>{const x=15+(i%2)*200,y=10+Math.floor(i/2)*185,cell=23,points=s.points.map(([a,b]):Point=>[x+cell+a*cell,y+cell+b*cell]);return <g key={s.label}>
   {Array.from({length:8},(_,j)=><line key={`v${j}`} x1={x+j*cell} x2={x+j*cell} y1={y} y2={y+6*cell} stroke="#c6d6d1"/>)}{Array.from({length:7},(_,j)=><line key={`h${j}`} y1={y+j*cell} y2={y+j*cell} x1={x} x2={x+7*cell} stroke="#c6d6d1"/>)}
   <polygon data-grid-polygon={s.label} data-unit-points={JSON.stringify(s.points)} points={pts(points)} fill={i%2?'#a6cce0':'#b7d5bb'} fillOpacity=".65" stroke="#315d58" strokeWidth="2.5"/><text x={x+80} y={y+167} textAnchor="middle">Shape {s.label}</text>
  </g>;})}</svg><figcaption>Each grid square is 1 cm × 1 cm.</figcaption></figure>;
 if(m.layout==='fraction-line')return <figure className="raffles-diagram"><svg viewBox="0 0 440 145" role="img" aria-label={`A number line from zero to one, divided into ${m.parts} equal spaces. ${m.marker} is ${m.position} spaces after zero.`}>
  <title>{`${title}: fraction number line`}</title><line x1="28" y1="55" x2="412" y2="55" stroke="#315d58" strokeWidth="3"/>
  {Array.from({length:m.parts+1},(_,i)=><line key={i} data-fraction-tick={i} x1={28+384*i/m.parts} x2={28+384*i/m.parts} y1="45" y2="65" stroke="#315d58" strokeWidth="2"/>)}<text x="28" y="31" textAnchor="middle">0</text><text x="412" y="31" textAnchor="middle">1</text>
  <path d={`M${28+384*m.position/m.parts} 104v-28m-6 7 6-7 6 7`} fill="none" stroke="#a76125" strokeWidth="3"/><text x={28+384*m.position/m.parts} y="132" textAnchor="middle">{m.marker}</text>
 </svg></figure>;
 if(m.layout==='parallel-lines'){
  const cell=30,left=32,top=22;
  return <figure className="raffles-diagram"><svg viewBox="0 0 340 355" role="img" aria-label={`Four line segments on a square grid. Find the line parallel to ${m.reference}.`}>
   <title>{`${title}: parallel lines`}</title>{Array.from({length:11},(_,i)=><g key={i}><line x1={left+i*cell} x2={left+i*cell} y1={top} y2={top+10*cell} stroke="#d5dfdd"/><line x1={left} x2={left+10*cell} y1={top+i*cell} y2={top+i*cell} stroke="#d5dfdd"/></g>)}
   {m.segments.map(s=><g key={s.label} data-segment={s.label} data-from={s.from.join(',')} data-to={s.to.join(',')}><line x1={left+s.from[0]*cell} y1={top+s.from[1]*cell} x2={left+s.to[0]*cell} y2={top+s.to[1]*cell} stroke={s.label===m.reference?'#a76125':'#285a65'} strokeWidth={s.label===m.reference?4:3}/><text paintOrder="stroke" stroke="#fff" strokeWidth="5" strokeLinejoin="round" x={left+s.from[0]*cell-10} y={top+s.from[1]*cell-7} textAnchor="end">{s.label[0]}</text><text paintOrder="stroke" stroke="#fff" strokeWidth="5" strokeLinejoin="round" x={left+s.to[0]*cell+8} y={top+s.to[1]*cell+18}>{s.label[1]}</text></g>)}
  </svg><figcaption>Follow each line’s direction across the grid.</figcaption></figure>;
 }
 if(m.layout==='rectangles')return <figure className="raffles-diagram"><svg viewBox="0 0 440 260" role="img" aria-label={m.rectangles.map(r=>`Shape ${r.label}: ${r.width} centimetres by ${r.height} centimetres.`).join(' ')}>
  <title>{`${title}: compare area and perimeter`}</title>{m.rectangles.map((r,i)=>{const scale=13,x=35+i*220+(130-r.width*scale)/2,y=60;return <g key={r.label}><rect data-rectangle={r.label} x={x} y={y} width={r.width*scale} height={r.height*scale} fill={i?'#d3e6f1':'#d1e5d4'} stroke="#315d58" strokeWidth="2.5"/><text x={x+r.width*scale/2} y={y+r.height*scale/2+8} textAnchor="middle">{r.label}</text><text x={x+r.width*scale/2} y={y-18} textAnchor="middle">{r.width} cm</text><text transform={`translate(${x+r.width*scale+24} ${y+r.height*scale/2}) rotate(90)`} textAnchor="middle">{r.height} cm</text></g>;})}
 </svg><figcaption>Use the labelled lengths. Area measures inside; perimeter measures around.</figcaption></figure>;
 const rawMax=Math.max(...m.series.flatMap(s=>s.values)),majorStep=m.scale*(rawMax/m.scale>14?2:1),max=Math.ceil(rawMax/majorStep)*majorStep,h=230,base=280,left=52,group=92,bar=27;
 return <figure className="raffles-diagram"><svg viewBox="0 0 440 345" role="img" aria-label={`Grouped bar graph. ${m.days.map((d,i)=>`${d}: ${m.series.map(s=>`${s.values[i]} ${s.label.toLowerCase()}`).join(', ')}`).join('; ')}.`}>
  <title>{`${title}: items collected over four days`}</title>{m.series.map((s,i)=><g key={s.label}><rect x={105+i*170} y="8" width="18" height="18" fill={i?'#efbc78':'#7fb6a4'} stroke="#315d58"/><text className="raffles-axis" x={130+i*170} y="23">{s.label}</text></g>)}{Array.from({length:max/m.scale+1},(_,i)=>{const n=i*m.scale,y=base-n/max*h;return <g key={n}><line x1={left} x2="425" y1={y} y2={y} stroke="#d4dfda"/>{(max/m.scale<=14||i%2===0||n===max)&&<text className="raffles-axis" x={left-8} y={y+6} textAnchor="end">{n}</text>}</g>;})}
  <line x1={left} x2={left} y1="50" y2={base} stroke="#315d58"/><line x1={left} x2="425" y1={base} y2={base} stroke="#315d58"/>
  {m.days.map((d,i)=><g key={d}>{m.series.map((s,j)=><rect data-bar-series={j} data-bar-day={i} data-value={s.values[i]} key={s.label} x={left+12+i*group+j*bar} y={base-s.values[i]/max*h} width={bar-2} height={s.values[i]/max*h} fill={j?'#efbc78':'#7fb6a4'} stroke={j?'#a96a25':'#315d58'} strokeWidth="1.5"/>)}<text className="raffles-axis" x={left+39+i*group} y="308" textAnchor="middle">{d.slice(0,3)}</text></g>)}<text x="238" y="338" textAnchor="middle">Collection day</text><text className="raffles-axis" x="8" y="28">Items</text>
 </svg><figcaption>In each pair, notebooks are on the left and cards on the right. Each small grid step represents {m.scale} items.</figcaption></figure>;
}
