import type {Tool} from '../model';
import {Picture} from '../../primary/Picture';
export type GeometryTool={kind:'geometry';mode:'angle'|'rectangle'|'clock'|'ruler'|'solid'|'mirror'|'lines';a:number;b:number;c?:number;shape?:string;editable?:boolean;showProtractor?:boolean};
export function geometryMoves(t:GeometryTool):GeometryTool[]{
 const limits=t.mode==='angle'?[180,0]:t.mode==='clock'?[1439,0]:t.mode==='mirror'?[6,6]:t.mode==='ruler'?[12,0]:[12,12],out:GeometryTool[]=[];
 for(const field of ['a','b'] as const){const max=limits[field==='a'?0:1];if(!max)continue;for(const d of [-1,1]){const n=t[field]+d;if(n>=(t.mode==='rectangle'||t.mode==='solid'?1:0)&&n<=max)out.push({...t,[field]:n});}}
 return out;
}
export function GeometryWorkbench({tool:t,onChange}:{tool:GeometryTool;onChange?:(t:Tool)=>void}){
 const controls=t.mode==='angle'?[['a','Angle in degrees',180]]:t.mode==='clock'?[['a','Minutes after midnight',1439]]:t.mode==='ruler'?[['a','Length in centimetres',12]]:t.mode==='mirror'?[['a','Distance left of mirror',6],['b','Distance right of mirror',6]]:t.mode==='lines'?[['a','First line height',12],['b','Second line height',12]]:[['a','Width',12],['b','Height',12]];
 return <div className="tool geometry-workbench">
 {t.mode==='angle'?<><Picture model={{type:'angle',degrees:t.a,label:t.showProtractor===false?undefined:'protractor'}}/>{t.showProtractor!==false&&<p>Place the protractor centre at the vertex. Start reading at the zero on the first ray.</p>}</>:t.mode==='clock'?<Picture model={{type:'clock',minutes:t.a}}/>:t.mode==='ruler'?<Picture model={{type:'ruler',length:t.a}}/>:t.mode==='solid'?<Cuboid a={t.a} b={t.b} c={t.c??3}/>:t.mode==='rectangle'?<Picture model={{type:'area',a:Math.max(1,t.a),b:Math.max(1,t.b)}}/>:<svg viewBox="0 0 320 180" role="img" aria-label={t.mode==='mirror'?`Mirror line with points ${t.a} units left and ${t.b} units right`:`Two horizontal lines at heights ${t.a} and ${t.b}`}>
 {Array.from({length:15},(_,i)=><path key={i} d={`M${20+i*20} 10V170`} stroke="#e2e6dc"/>)}
 {t.mode==='mirror'?<><path d="M160 10V170" stroke="#6b877c" strokeDasharray="5 4"/><circle cx={160-t.a*20} cy="90" r="7" fill="#5789ac"/><circle cx={160+t.b*20} cy="90" r="7" fill="#b98148"/></>:<><path d={`M20 ${15+t.a*10}H300 M20 ${15+t.b*10}H300`} stroke="#57886e" strokeWidth="3"/><path d="M100 10V170" stroke="#b98148" strokeWidth="3"/></>}</svg>}
 {onChange&&t.mode==='clock'&&<div className="tool-controls clock-controls"><label>Hour<input aria-label="Hour" type="number" min="1" max="12" value={Math.floor(t.a/60)%12||12} onChange={e=>{const h=Number(e.target.value);if(Number.isInteger(h)&&h>=1&&h<=12)onChange({...t,a:(h%12+(t.a>=720?12:0))*60+t.a%60});}}/></label><label>Minute<input aria-label="Minute" type="number" min="0" max="59" value={t.a%60} onChange={e=>{const m=Number(e.target.value);if(Number.isInteger(m)&&m>=0&&m<60)onChange({...t,a:Math.floor(t.a/60)*60+m});}}/></label>{['am','pm'].map((label,i)=><button key={label} aria-pressed={t.a>=720?i===1:i===0} onClick={()=>onChange({...t,a:t.a%720+i*720})}>{label}</button>)}</div>}
 {onChange&&t.mode!=='clock'&&<div className="tool-controls">{controls.map(([field,label,max])=><label key={field}>{t.showProtractor===false?'Opening':label}<input type="range" aria-label={t.showProtractor===false?'Opening':String(label)} min={t.mode==='rectangle'||t.mode==='solid'?1:0} max={Number(max)} value={t[field as 'a'|'b']} onChange={e=>onChange({...t,[field]:Number(e.target.value)})}/>{t.showProtractor!==false&&<input type="number" aria-label={`${label} value`} min={t.mode==='rectangle'||t.mode==='solid'?1:0} max={Number(max)} value={t[field as 'a'|'b']} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=(t.mode==='rectangle'||t.mode==='solid'?1:0)&&n<=Number(max))onChange({...t,[field]:n});}}/>}</label>)}</div>}
 <p className="tool-sum">{t.mode==='rectangle'?`${t.a} by ${t.b} units`:t.mode==='clock'?`${Math.floor(t.a/60)%12||12}:${String(t.a%60).padStart(2,'0')} ${t.a>=720?'pm':'am'}`:t.mode==='solid'?`Width ${t.a}, height ${t.b}, depth ${t.c??3}`:t.mode==='ruler'?`${t.a} cm`:t.mode==='mirror'?`Left ${t.a} units · right ${t.b} units`:t.mode==='lines'?'Horizontal lines are parallel when distinct. The vertical line meets them at right angles.':t.showProtractor===false?'Compare the opening with a square corner.':`${t.a} degrees`}</p>
 </div>;
}

function Cuboid({a,b,c}:{a:number;b:number;c:number}){
 const w=a*16,h=b*12,d=c*8,x=65,y=205-h;
 return <svg className="game-figure" viewBox="0 0 380 250" role="img" aria-label={`Cuboid ${a} units wide, ${b} units high, ${c} units deep`}>
 <path d={`M${x} ${y}h${w}v${h}h${-w}Z`} fill="#dbe8d2" stroke="#628966"/>
 <path d={`M${x} ${y}l${d} ${-d}h${w}l${-d} ${d}Z`} fill="#ecf2e2" stroke="#628966"/>
 <path d={`M${x+w} ${y}l${d} ${-d}v${h}l${-d} ${d}Z`} fill="#b6cfa9" stroke="#628966"/>
 {Array.from({length:a-1},(_,i)=><path key={`v${i}`} d={`M${x+(i+1)*16} ${y}v${h}`} stroke="#8bac82"/>)}
 {Array.from({length:b-1},(_,i)=><path key={`h${i}`} d={`M${x} ${y+(i+1)*12}h${w}`} stroke="#8bac82"/>)}
 <text x={x+w/2} y="228" textAnchor="middle">{a} units</text><text x={x-8} y={y+h/2} textAnchor="end">{b}</text><text x={x+w+d+8} y={y+h/2}>{c} deep</text>
 </svg>;
}
