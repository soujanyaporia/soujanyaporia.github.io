import type {Batch11UpperPicture} from './batch11UpperPicture';
/** Labels and lines remain readable when the figure scales to a phone. */
export function Batch11UpperDiagram({model}:{model:Batch11UpperPicture}){
 return <svg viewBox="0 0 320 200" role="img" aria-label={model.label} style={{display:'block',width:'100%',maxWidth:400,height:'auto',margin:'12px auto'}}>
  {model.marks.map((m,i)=>m.kind==='line'?<line key={i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#235b4c" strokeWidth="2.5" strokeDasharray={m.dashed?'5 4':undefined}/>:m.kind==='path'?<path key={i} d={m.d} stroke="#235b4c" strokeWidth="2.5" fill={m.fill??'none'}/>:m.kind==='circle'?<circle key={i} cx={m.cx} cy={m.cy} r={m.r} fill={m.fill??'none'} stroke="#235b4c" strokeWidth="2.5"/>:<text key={i} x={m.x} y={m.y} fontSize="17" fontWeight="600" fill="#173c34">{m.text}</text>)}
 </svg>;
}
