import type {Batch2EarlyPicture} from './batch2EarlyPicture';
const ink='#203445',blue='#487fb1',orange='#cc7a35';
/** Exact geometric givens: no answer values, source scans or decorative approximations. */
export function Batch2EarlyDiagram({model:m}:{model:Batch2EarlyPicture}){
 if(m.layout==='offset-rulers'){
  const left=28,width=432,unit=width/m.maximum;
  return <svg className="game-figure" viewBox="0 0 520 290" role="img" aria-label="Two ribbons with nonzero start and end positions on centimetre rulers" style={{fontFamily:'inherit'}}>
   <title>Measure both ribbons, then compare their lengths</title>
   {m.objects.map((item,i)=>{const y=24+i*132,start=left+item.start*unit,end=left+item.end*unit;
    return <g key={item.label} data-ruler-object={item.label}>
     <text x={left} y={y} fill={ink} fontSize="15" fontWeight="700">{item.label}</text>
     <rect data-measured-object={item.label} x={start} y={y+18} width={end-start} height="18" rx="2" fill={item.tone==='blue'?blue:orange}/>
     {[start,end].map((x,j)=><line key={j} x1={x} x2={x} y1={y+37} y2={y+55} stroke={ink} strokeDasharray="3 3"/>)}
     <rect x={left-7} y={y+54} width={width+14} height="41" rx="3" fill="#f7e8bf" stroke="#b5a279"/>
     {Array.from({length:m.maximum+1},(_,n)=><g key={n}>
      <line data-ruler-tick={n} x1={left+n*unit} x2={left+n*unit} y1={y+54} y2={y+66} stroke={ink}/>
      <text data-ruler-label={n} x={left+n*unit} y={y+84} textAnchor="middle" fill={ink} fontSize="11">{n}</text>
     </g>)}
     <text x={left+width+20} y={y+79} fill={ink} fontSize="12">cm</text>
    </g>;
   })}
  </svg>;
 }
 const left=120,width=360,top=52,rowHeight=42,bottom=top+m.days.length*rowHeight,unit=width/m.maximum;
 return <svg className="game-figure" viewBox={`0 0 520 ${bottom+68}`} role="img" aria-label={`${m.heading}. Horizontal bars with grid intervals of ${m.minorStep}.`} style={{fontFamily:'inherit'}}>
  <title>{m.heading}</title>
  <text x="260" y="23" textAnchor="middle" fill={ink} fontSize="16" fontWeight="700">{m.heading}</text>
  {Array.from({length:Math.floor(m.maximum/m.minorStep)+1},(_,i)=>{const value=i*m.minorStep,x=left+value*unit;
   return <g key={value}><line data-chart-grid={value} x1={x} x2={x} y1={top-8} y2={bottom} stroke={value%m.labelStep===0?'#a0adb5':'#d9e1e6'} strokeWidth={value===0?1.5:1}/>
    {value%m.labelStep===0&&<text data-chart-tick={value} x={x} y={bottom+20} textAnchor="middle" fill={ink} fontSize="12">{value}</text>}
   </g>;
  })}
  {m.days.map((day,i)=><g key={day}>
   <text x={left-12} y={top+i*rowHeight+17} textAnchor="end" fill={ink} fontSize="13">{day}</text>
   <rect data-sales-bar={day} x={left} y={top+i*rowHeight} width={m.values[i]*unit} height="24" rx="1" fill={i%2===0?blue:'#65998b'}/>
  </g>)}
  <line x1={left} x2={left+width} y1={bottom} y2={bottom} stroke={ink}/>
  <text x={left+width/2} y={bottom+47} textAnchor="middle" fill={ink} fontSize="13">Number of bookmarks</text>
 </svg>;
}
