import {toggleFractionPiece} from './geometry';
import type {Tool} from '../model';
import {LessonScene} from './LessonScene';

export function TakeAway({t,onChange}:{t:Extract<Tool,{kind:'take-away'}>;onChange?:(t:Tool)=>void}){
 const toggle=(i:number)=>onChange?.({...t,removed:t.removed.includes(i)?t.removed.filter(n=>n!==i):[...t.removed,i].sort((a,b)=>a-b)});
 return <div className="tool teaching-counters"><div className="removal-grid" role={onChange?'group':'img'} aria-label={`${t.start} counters at the start; ${t.removed.length} crossed out`}>{Array.from({length:t.start},(_,i)=>{
  const removed=t.removed.includes(i),cls=`removal-counter${removed?' removed':''}`;
  return onChange?<button key={i} type="button" className={cls} aria-label={`${removed?'Put back':'Take away'} counter ${i+1}`} aria-pressed={removed} onClick={()=>toggle(i)}><span aria-hidden="true">{removed?'×':''}</span></button>:<span key={i} className={cls} aria-hidden="true">{removed?'×':''}</span>;
 })}</div>{onChange&&<p role="status">{t.removed.length} taken away. Count the blue counters that remain.</p>}<p className="tool-tip">Blue counters stay. Crossed counters have been taken away.</p></div>;
}

export function TrianglePair({t,onChange}:{t:Extract<Tool,{kind:'triangle-pair'}>;onChange?:(t:Tool)=>void}){
 return <div className="tool"><LessonScene t={{kind:'scene',scene:'triangle',lengthUnit:t.lengthUnit,values:[t.base,t.height],phase:t.joined?1:0,labels:[`Blue triangle: base ${t.base} ${t.lengthUnit??'units'}, perpendicular height ${t.height} ${t.lengthUnit??'units'}`,t.joined?'A matching orange triangle completes the rectangle.':'The other half is empty.']}}/>{onChange&&<div className="tool-controls"><button type="button" aria-pressed={t.joined} onClick={()=>onChange({...t,joined:!t.joined})}>{t.joined?'Remove the matching triangle':'Join the matching triangle'}</button></div>}<p role="status">{t.joined?'Two matching triangles fill the rectangle.':'One blue triangle. The right-angle mark identifies its height.'}</p></div>;
}

/** No printed fraction: the learner reads the chosen parts and the whole. */
export function FractionPieces({t,onChange}:{t:Extract<Tool,{kind:'fraction-pieces'}>;onChange?:(t:Tool)=>void}){
 const total=t.widths.reduce((a,b)=>a+b,0),equal=t.widths.every(w=>w===t.widths[0]);let at=-Math.PI/2;
 const label=`One whole divided into ${t.widths.length} ${equal?'equal':'unequal'} parts; ${t.selected.length} blue ${t.selected.length===1?'part':'parts'}.`;
 const action=(i:number)=>`${t.selected.includes(i)?'Unshade':'Shade'} piece ${i+1}`;
 const colour=(i:number)=>t.selected.includes(i)?'#536ce7':'#eef0f7';
 return <div className="fraction-piece-model">{t.shape==='circle'?<svg className="fraction-pieces-circle" viewBox="0 0 220 220" role={onChange?'group':'img'} aria-label={label}>{t.widths.map((w,i)=>{const start=at;at+=w/total*2*Math.PI;return <path key={i} d={`M110 110L${110+96*Math.cos(start)} ${110+96*Math.sin(start)}A96 96 0 ${w/total>.5?1:0} 1 ${110+96*Math.cos(at)} ${110+96*Math.sin(at)}Z`} fill={colour(i)} stroke="white" strokeWidth="3" {...(onChange?{role:'button',tabIndex:0,'aria-label':action(i),'aria-pressed':t.selected.includes(i),onClick:()=>onChange(toggleFractionPiece(t,i)),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onChange(toggleFractionPiece(t,i));}}}:{})}/>;})}</svg>:<div className="fraction-pieces-strip" role={onChange?'group':'img'} aria-label={label}>{t.widths.map((w,i)=>onChange?<button type="button" key={i} style={{flex:w,background:colour(i)}} aria-label={action(i)} aria-pressed={t.selected.includes(i)} onClick={()=>onChange(toggleFractionPiece(t,i))}><span className="piece-tick" aria-hidden="true">{t.selected.includes(i)?'✓':''}</span></button>:<span key={i} style={{flex:w,background:colour(i)}}/>)}</div>}
 {onChange&&<><p className="piece-count" role="status">{t.selected.length} chosen · {t.widths.length} {equal?'equal ':''}parts in the whole</p><p className="tool-tip">Tap a piece to choose it. Tap it again to put it back. The pieces you choose do not have to touch.</p></>}
 </div>;
}
