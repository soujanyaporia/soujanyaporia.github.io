import type {Batch4EarlyPicture} from './batch4EarlyPicture';
/** Responsive native-size labels; whole/half glyphs wrap instead of shrinking or disappearing. */
export function Batch4EarlyDiagram({model:m}:{model:Batch4EarlyPicture}){
 const hasHalf=m.rows.some(r=>r.halfSymbol);
 const rowGivens=m.rows.map(r=>`${r.label}: ${r.wholeSymbols} whole ${r.wholeSymbols===1?'symbol':'symbols'}${r.halfSymbol?' and 1 half symbol':''}.`).join(' ');
 const full=(key:string)=><svg key={key} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{display:'block',flexShrink:0}}><circle data-whole-symbol="true" cx="11" cy="11" r="10" fill="#3b6d8a"/></svg>;
 return <figure role="img" aria-label={`${m.heading}. ${rowGivens} Each whole symbol represents ${m.scale}.${hasHalf?' A half symbol represents half as many.':''}`} style={{margin:'10px 0',fontFamily:'inherit',fontSize:16,lineHeight:1.4,minWidth:0}}>
  <figcaption style={{fontSize:17,fontWeight:700,marginBottom:14,color:'#243e48'}}>{m.heading}</figcaption>
  <div style={{borderTop:'1px solid #cad6d9'}}>
   {m.rows.map(r=><div data-pictograph-row={r.label} key={r.label} style={{display:'grid',gridTemplateColumns:'100px minmax(0, 1fr)',columnGap:10,alignItems:'center',padding:'12px 0',borderBottom:'1px solid #cad6d9'}}>
    <span style={{fontSize:16,fontWeight:600,color:'#243e48',overflowWrap:'anywhere'}}>{r.label}</span>
    <span style={{display:'flex',flexWrap:'wrap',gap:7,alignItems:'center',minWidth:0}}>
     {Array.from({length:r.wholeSymbols},(_,n)=>full(`${r.label}-${n}`))}
     {r.halfSymbol&&<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{display:'block',flexShrink:0}}><path data-half-symbol="true" d="M11 1 a10 10 0 0 0 0 20 Z" fill="#3b6d8a"/></svg>}
    </span>
   </div>)}
  </div>
  <div style={{display:'flex',alignItems:'center',gap:9,fontSize:16,marginTop:14,color:'#243e48'}}>
   <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{display:'block',flexShrink:0}}><circle cx="11" cy="11" r="10" fill="#3b6d8a"/></svg>
   <span>Each whole symbol represents <span data-legend-scale="true">{m.scale}</span>.</span>
  </div>
  {hasHalf&&<p style={{fontSize:15,margin:'10px 0 0',color:'#243e48'}}>A half symbol has half the value of a whole symbol.</p>}
 </figure>;
}
