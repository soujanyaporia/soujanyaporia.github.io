import type {PointerEvent} from 'react';
import './angleConstruction.css';
import {constructionSweep,type AngleConstructionSpec} from './batch8AnglesPicture';
import {AngleProtractor,anglePoint} from './Batch8AnglesDiagram';
/** Numeric swept degrees use existing draft/readiness/grading; this draws the response. */
export function Batch8AngleConstruction({spec,value,onChange,disabled=false}:{spec:AngleConstructionSpec;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const cx=250,cy=240,rotation=spec.baseline>90?spec.baseline-180:spec.baseline,base=anglePoint(cx,cy,195,spec.baseline),sweep=/^\d+$/.test(value)&&Number(value)<=180?Number(value):null,end=sweep!==null?anglePoint(cx,cy,195,spec.baseline+(spec.direction??1)*sweep):null;
 const select=(event:PointerEvent<SVGSVGElement>)=>{
  if(disabled||(event.type==='pointermove'&&event.buttons===0))return;const svg=event.currentTarget,matrix=svg.getScreenCTM();if(!matrix)return;const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const at=p.matrixTransform(matrix.inverse());if(Math.hypot(at.x-cx,at.y-cy)<35)return;
  const turned=constructionSweep(spec,at.x,at.y,cx,cy);if(turned!==null)onChange(String(turned));
 };
 return <div className="angle-construction"><p>Tap or drag on the protractor to draw the second ray. The first ray stays fixed.</p><svg viewBox="0 0 500 360" className="game-figure" role="img" aria-label="Angle construction board with a fixed labelled baseline and movable second ray" onPointerDown={e=>{if(!disabled)e.currentTarget.setPointerCapture(e.pointerId);select(e);}} onPointerMove={select} style={{touchAction:'none',cursor:disabled?'default':'crosshair'}}>
  <AngleProtractor x={cx} y={cy} rotation={rotation}/><path d={`M${cx} ${cy}L${base[0]} ${base[1]}`} stroke="#254f44" strokeWidth="3" fill="none"/>
  {end&&<path data-constructed-ray="true" d={`M${cx} ${cy}L${end[0]} ${end[1]}`} stroke="#245c98" strokeWidth="3" fill="none"/>}<circle cx={cx} cy={cy} r="4" fill="#254f44"/><text x={cx} y={cy+25} textAnchor="middle" fontSize="20">{spec.vertexLabel}</text><text x={base[0]} y={base[1]+(base[1]>cy?25:-12)} textAnchor="middle" fontSize="20">{spec.baseLabel}</text>{end&&<text x={end[0]} y={end[1]-12} textAnchor="middle" fontSize="20" fill="#245c98">{spec.endLabel}</text>}
 </svg><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><button type="button" disabled={disabled} onClick={()=>onChange(String(Math.max(0,(sweep??1)-1)))} style={{minWidth:44,minHeight:44}}>Rotate −1°</button><button type="button" disabled={disabled} onClick={()=>onChange(String(Math.min(180,(sweep??0)+1)))} style={{minWidth:44,minHeight:44}}>Rotate +1°</button><label>Ray angle (°) <input type="number" min="0" max="180" step="1" inputMode="numeric" value={value} disabled={disabled} onChange={event=>{const s=event.target.value;if(s===''||(/^\d+$/.test(s)&&Number(s)<=180))onChange(s);}} style={{width:90,minHeight:44}}/></label><button type="button" disabled={disabled||!value} onClick={()=>onChange('')} style={{minWidth:44,minHeight:44}}>Clear ray</button><span aria-live="polite">{end?'Second ray drawn.':'Second ray not drawn yet.'}</span></div></div>;
}
