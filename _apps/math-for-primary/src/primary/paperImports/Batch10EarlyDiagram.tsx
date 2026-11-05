import {Picture} from '../Picture';
import type {Batch10EarlyPicture} from './batch10EarlyPicture';
/** Necessary solid geometry only. Native-size labels remain readable on narrow screens. */
export function Batch10EarlyDiagram({model:m}:{model:Batch10EarlyPicture}){
 return <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',margin:'12px 0'}}>
  {m.objects.map(o=><figure key={o.label} role="img" aria-label={`Object ${o.label}: ${o.shape}`} style={{margin:0,flex:'1 1 110px',maxWidth:180,minWidth:100}} data-solid-label={o.label} data-solid-shape={o.shape}>
   <Picture model={{type:'solid',shape:o.shape}}/>
   <figcaption style={{textAlign:'center',fontSize:16,fontWeight:700}}>Object {o.label}</figcaption>
  </figure>)}
 </div>;
}
