import {useState} from 'react';
import {gridDrawingValue,parseGridDrawing,type GridDrawingSpec,type GridPoint,type GridSegment,type GridDrawingPicture} from './gridDrawingModel';
import './gridDrawing.css';
const point=(p:GridPoint)=>[44+p[0]*44,44+p[1]*44];
export function GridDrawingFigure({model:m}:{model:GridDrawingPicture}){
 const width=(m.columns+2)*44,height=(m.rows+2)*44;
 const description=m.segments.length?m.segments.map(([a,b])=>`Row ${a[1]+1}, dot ${a[0]+1} to row ${b[1]+1}, dot ${b[0]+1}`).join('; '):'No lines drawn';
 return <svg className="grid-drawing-figure" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${m.caption??'Line drawing on a dot grid'}. ${description}.`}>
  {Array.from({length:m.rows+1},(_,y)=>Array.from({length:m.columns+1},(_,x)=><circle key={`${x},${y}`} cx={44+x*44} cy={44+y*44} r="3" fill="#79978b"/>))}
  {m.segments.map(([a,b],i)=><line key={i} x1={point(a)[0]} y1={point(a)[1]} x2={point(b)[0]} y2={point(b)[1]} stroke="#255d90" strokeWidth="3.5" strokeLinecap="round"/>)}
 </svg>;
}
export function GridDrawing({spec,value,onChange,disabled=false,print=false}:{spec:GridDrawingSpec;value:string;onChange:(value:string)=>void;disabled?:boolean;print?:boolean}){
 const [start,setStart]=useState<GridPoint|null>(null),segments=parseGridDrawing(spec,value)??[],width=(spec.columns+2)*44,height=(spec.rows+2)*44;
 function select(p:GridPoint){if(disabled)return;if(!start){setStart(p);return;}if(p[0]===start[0]&&p[1]===start[1]){setStart(null);return;}
  const next:GridSegment[]=[...(spec.kind==='segment-length'?[]:segments),[start,p]];const encoded=gridDrawingValue(next);if(next.length<=16&&encoded.length<=200)onChange(encoded);setStart(null);
 }
 return <div className={`grid-drawing ${print?'grid-drawing-print':''}`}>
  {!disabled&&!print&&<p>{spec.kind==='segment-length'?'Tap two dots to draw a horizontal line. Each gap represents 1 cm.':'Copy the shape onto the empty grid in the same position. Tap two dots to draw each line.'}</p>}
  {spec.kind==='segment-length'&&(disabled||print)&&<p>Each gap represents 1 cm.</p>}
  <div className="grid-drawing-panels">{spec.kind==='copy-grid'&&<section><h3>Copy this shape</h3><GridDrawingFigure model={{type:'grid-drawing',columns:spec.columns,rows:spec.rows,segments:spec.referenceSegments,caption:'Shape to copy onto the other grid'}}/></section>}
   <section><h3>{print?'Draw here':disabled?'Your drawing':'My drawing'}</h3><div className="grid-drawing-scroll"><div className="grid-drawing-board" style={{width,height}}>
    <GridDrawingFigure model={{type:'grid-drawing',columns:spec.columns,rows:spec.rows,segments,caption:print?'Blank answer grid':'Your drawn lines'}}/>
    {!disabled&&!print&&Array.from({length:spec.rows+1},(_,y)=>Array.from({length:spec.columns+1},(_,x)=><button key={`${x},${y}`} type="button" aria-label={`Row ${y+1}, dot ${x+1}`} aria-pressed={start?.[0]===x&&start?.[1]===y} style={{left:44+x*44,top:44+y*44}} onClick={()=>select([x,y])}><span/></button>))}
   </div></div></section>
  </div>
  {!disabled&&!print&&<div className="grid-drawing-actions"><button type="button" disabled={!segments.length&&!start} onClick={()=>{if(start)setStart(null);else onChange(gridDrawingValue(segments.slice(0,-1)));}}>Undo last line</button><button type="button" disabled={!segments.length&&!start} onClick={()=>{setStart(null);onChange('');}}>Clear drawing</button><span role="status">{start?'Choose the other end of the line.':segments.length?'Drawing saved.':'Choose a starting dot.'}</span></div>}
 </div>;
}
