import type {CorpusPicture} from './corpusPaperQuestions';
import './corpusDiagram.css';

const rad=(degrees:number)=>degrees*Math.PI/180;
type Point=[number,number];
const at=(angle:number,length=138):Point=>[210+length*Math.cos(rad(angle)),232-length*Math.sin(rad(angle))];
const angleArc=(start:number,end:number,r:number)=>{const a=at(start,r),b=at(end,r);return `M${a[0]} ${a[1]}A${r} ${r} 0 0 0 ${b[0]} ${b[1]}`;};
function tick(a:Point,b:Point){const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);return `M${mid[0]-dy/length*5} ${mid[1]+dx/length*5}L${mid[0]+dy/length*5} ${mid[1]-dx/length*5}`;}

/** Original figures with all mathematical givens visible. No answer value is hidden in an aria label. */
export function CorpusDiagram({model:m}:{model:CorpusPicture}){
 if(m.layout==='fraction-rows')return <figure className="corpus-diagram"><svg viewBox={`0 0 480 ${m.rows.length*66+24}`} role="img" aria-label={m.rows.map(r=>`Ribbon ${r.label}: ${r.filled} of ${r.parts} equal parts shaded`).join('. ')}>
  {m.rows.map((row,i)=><g key={row.label}><text x="10" y={43+i*66} fontSize="21" fontWeight="800">{row.label}: {row.filled}/{row.parts}</text>{Array.from({length:row.parts},(_,part)=><rect key={part} data-ribbon={row.label} data-part={part} x={110+part*350/row.parts} y={18+i*66} width={350/row.parts} height="36" fill={part<row.filled?'#76a4d0':'#fff'} stroke="#527e98" strokeWidth="1.5"/>)}</g>)}
 </svg><figcaption>Every complete ribbon has the same length.</figcaption></figure>;
 if(m.layout==='rectangular-frame'){
  const scale=Math.min(320/m.outerWidth,176/m.outerHeight),w=m.outerWidth*scale,h=m.outerHeight*scale,b=m.border*scale,left=(440-w)/2,top=50;
  return <figure className="corpus-diagram"><svg viewBox={`0 0 440 ${top+h+74}`} role="img" aria-label={`Rectangular plot ${m.outerWidth} metres by ${m.outerHeight} metres. A path ${m.border} metres wide lies inside all four edges.${m.showInner?` The inner lawn is ${m.outerWidth-2*m.border} metres by ${m.outerHeight-2*m.border} metres.`:''} Find the path’s area.`}>
   <rect data-plot="outer" x={left} y={top} width={w} height={h} fill="#f2d39d" stroke="#966b38" strokeWidth="2"/>
   <rect data-plot="inner" x={left+b} y={top+b} width={w-2*b} height={h-2*b} fill="#deedd6" stroke="#66915c" strokeWidth="2"/>
   <text x="220" y="29" textAnchor="middle" fontSize="20" fontWeight="800">{m.outerWidth} m</text><text x="20" y={top+h/2} textAnchor="middle" fontSize="20" fontWeight="800" transform={`rotate(-90 20 ${top+h/2})`}>{m.outerHeight} m</text>
   {!m.showInner&&<text x="220" y={top+h/2+5} textAnchor="middle" fontSize="20" fontWeight="750">Lawn</text>}
   <path d={`M220 ${top+2}V${top+b-2}`} stroke="#8a602f" strokeWidth="2"/><path d={`M${left+w-b+2} ${top+h/2}H${left+w-2}`} stroke="#8a602f" strokeWidth="2"/>
   {m.showInner&&<><text x="220" y={top+h-b-8} textAnchor="middle" fontSize="18">{m.outerWidth-2*m.border} m</text><text x={left+b+18} y={top+h/2} textAnchor="middle" fontSize="18" transform={`rotate(-90 ${left+b+18} ${top+h/2})`}>{m.outerHeight-2*m.border} m</text></>}
   <text x="220" y={top+h+44} textAnchor="middle" fontSize="20" fontWeight="800">Path width: {m.border} m on every side</text>
  </svg></figure>;
 }
 const o:Point=[210,232],a=at(m.givenAngle),b=at(m.givenAngle+60),known=at(m.givenAngle/2,62),unknown=at((m.givenAngle+240)/2,61),inside=at(m.givenAngle+30,67);
 return <figure className="corpus-diagram"><svg viewBox="0 0 440 300" role="img" aria-label={`L, O and R are on a straight line. OAB is an equilateral triangle. Angle AOR is ${m.givenAngle} degrees. Find angle BOL, marked with a question mark.`}>
  <path d="M35 232H405" stroke="#527e70" strokeWidth="3"/>
  <polygon data-equilateral="true" points={`${o.join(',')} ${a.join(',')} ${b.join(',')}`} fill="#dcebd2" stroke="#527e70" strokeWidth="3"/>
  <path d={`${tick(o,a)} ${tick(a,b)} ${tick(b,o)}`} fill="none" stroke="#527e70" strokeWidth="2"/>
  <path d={angleArc(0,m.givenAngle,40)} fill="none" stroke="#b27b38" strokeWidth="2"/><path d={angleArc(m.givenAngle+60,180,42)} fill="none" stroke="#6d8fc5" strokeWidth="2"/>
  <text x="30" y="256" fontSize="20" fontWeight="800">L</text><text x="203" y="256" fontSize="20" fontWeight="800">O</text><text x="400" y="256" fontSize="20" fontWeight="800">R</text><text x={a[0]+9} y={a[1]-8} fontSize="20" fontWeight="800">A</text><text x={b[0]-13} y={b[1]-9} fontSize="20" fontWeight="800">B</text>
  <text x={known[0]} y={known[1]+5} textAnchor="middle" fontSize="20">{m.givenAngle}°</text><text x={unknown[0]} y={unknown[1]+5} textAnchor="middle" fontSize="23" fontWeight="850">?</text>
  {m.revealTriangle&&<text x={inside[0]} y={inside[1]+5} textAnchor="middle" fontSize="20">60°</text>}
  {m.revealCombined&&<text x="220" y="286" textAnchor="middle" fontSize="17">Angle BOR = {m.givenAngle+60}°</text>}
 </svg></figure>;
}
