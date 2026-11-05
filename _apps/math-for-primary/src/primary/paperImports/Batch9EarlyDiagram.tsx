import type {Batch9EarlyPicture} from './batch9EarlyPicture';
const ink='#203445',shade='#769dba';
/** Essential mathematical figures only; all values are givens, never worked answers. */
export function Batch9EarlyDiagram({model:m}:{model:Batch9EarlyPicture}){
 if(m.layout==='ruler-total'){
  const left=24,unit=29;
  return <svg className="game-figure" viewBox="0 0 360 245" role="img" aria-label={m.objects.map(o=>`${o.label} starts at ${o.start} cm and ends at ${o.end} cm.`).join(' ')} style={{fontFamily:'inherit'}}>
   {m.objects.map((o,i)=>{const y=22+i*118;return <g key={o.label} data-measured-ribbon={o.label}>
    <text x={left} y={y} fill={ink} fontSize="17">{o.label}</text><rect x={left+o.start*unit} y={y+12} width={(o.end-o.start)*unit} height="16" fill={i? '#bd956d':shade}/>
    {[o.start,o.end].map(n=><line key={n} x1={left+n*unit} x2={left+n*unit} y1={y+29} y2={y+43} stroke={ink} strokeDasharray="3 2"/>)}
    <line x1={left} x2={left+m.maximum*unit} y1={y+43} y2={y+43} stroke={ink}/>
    {Array.from({length:m.maximum+1},(_,n)=><g key={n}><line x1={left+n*unit} x2={left+n*unit} y1={y+43} y2={y+54} stroke={ink}/><text x={left+n*unit} y={y+75} textAnchor="middle" fontSize="17" fill={ink}>{n}</text></g>)}
    <text x="337" y={y+75} fontSize="16" fill={ink}>cm</text>
   </g>;})}
  </svg>;
 }
 if(m.layout==='shape-parts'){
  const x=160-m.width/2,y=50,bottom=y+m.height,cap=m.cap==='semicircle'?`M${x},${bottom} A${m.width/2},${m.width/2} 0 0 0 ${x+m.width},${bottom}Z`:`M${x},${bottom} L160,${bottom+m.width/2} L${x+m.width},${bottom}Z`;
  return <svg className="game-figure" viewBox="0 0 320 280" role="img" aria-label={`Two joined parts separated by a line. One has four straight sides and four square corners. The other has ${m.cap==='semicircle'?'one straight edge and one curved edge':'three straight edges'}.`}>
   <g transform={`rotate(${m.rotation} 160 140)`} fill="white" stroke={ink} strokeWidth="3"><rect x={x} y={y} width={m.width} height={m.height}/><path d={cap}/></g>
  </svg>;
 }
 if(m.layout==='circle-pieces'){
  const largest=Math.max(...m.pieces.map(p=>p.radius));
  return <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>{m.pieces.map(p=>{
   const d=p.shape==='semicircle'?`M${-p.radius},0 A${p.radius},${p.radius} 0 0 1 ${p.radius},0Z`:`M0,0 L${p.radius},0 A${p.radius},${p.radius} 0 0 0 0,${-p.radius}Z`;
   return <figure key={p.label} style={{margin:0,width:125}}><figcaption style={{fontSize:17,textAlign:'center',fontWeight:700}}>{p.label}</figcaption><svg viewBox="0 0 128 128" role="img" aria-label={`Piece ${p.label}: ${p.radius===largest?'large':'small'} ${p.shape==='semicircle'?'semicircle':'quarter circle'}.`}><g transform={`translate(64 64) rotate(${p.rotation})`}><path data-piece-label={p.label} d={d} fill="#f5f7f8" stroke={ink} strokeWidth="2"/></g></svg></figure>;
  })}</div>;
 }
 if(m.layout==='mass-dial'){
  const cx=160,cy=145,radius=104,ticks=m.maximum/m.minorStep,angle=m.reading/m.maximum*2*Math.PI;
  return <svg className="game-figure" viewBox="0 0 320 280" role="img" aria-label={`Mass dial in grams, from zero to ${m.maximum}. Small marks are ${m.minorStep} grams apart. Pointer at small mark ${m.reading/m.minorStep} clockwise from zero.`} style={{fontFamily:'inherit'}}>
   <circle cx={cx} cy={cy} r={radius} fill="white" stroke={ink} strokeWidth="3"/>
   {Array.from({length:ticks},(_,i)=>{const a=i/ticks*2*Math.PI,label=i*m.minorStep%m.labelStep===0;return <g key={i}><line x1={cx+Math.sin(a)*(label?91:97)} y1={cy-Math.cos(a)*(label?91:97)} x2={cx+Math.sin(a)*103} y2={cy-Math.cos(a)*103} stroke={ink} strokeWidth={label?2:1}/>{label&&<text x={cx+Math.sin(a)*72} y={cy-Math.cos(a)*72+5} textAnchor="middle" fontSize="16" fill={ink}>{i===0?`0/${m.maximum}`:i*m.minorStep}</text>}</g>;})}
   <line data-mass-pointer="true" x1={cx} y1={cy} x2={cx+Math.sin(angle)*87} y2={cy-Math.cos(angle)*87} stroke={ink} strokeWidth="4" strokeLinecap="round"/><circle cx={cx} cy={cy} r="5" fill={ink}/><text x={cx} y={cy+30} textAnchor="middle" fontSize="19" fill={ink}>g</text>
  </svg>;
 }
 return <svg className="game-figure" viewBox="0 0 320 135" role="img" aria-label={m.pieces.map(p=>`${p.label}, ${p.kind}, ${p.shaded?'shaded':'not shaded'}`).join('; ')}>
  {m.pieces.map(p=><polygon key={p.label} data-area-piece={p.label} data-shaded={p.shaded?'yes':'no'} points={p.points.map(([x,y])=>`${30+x*32},${25+y*32}`).join(' ')} fill={p.shaded?shade:'white'} stroke={ink} strokeWidth="2"/>)}
 </svg>;
}
