import type {Picture as Model} from './generate';
import {Picture} from './Picture';

/** Exam presentation: retain every given; use pictures only when they encode the maths. */
export function PaperMaterials({model:m}:{model:Model}){
 if(m.type==='paper'&&m.layout==='cards'&&m.cards.every(c=>c.count===undefined))return <div className="paper-facts">
  {m.heading&&<p className="paper-facts-heading">{m.heading}</p>}
  <dl>{m.cards.map((c,i)=><div key={i}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}</dl>
  {m.transfer&&<><p>{m.transfer.from} gives {m.transfer.to} {m.transfer.amount} {m.transfer.unit}.</p><p>{m.transfer.after}</p></>}
  {m.caption&&<p className="paper-facts-caption">{m.caption}</p>}
 </div>;
 if(m.type==='paper'&&m.layout==='timeline')return <div className="paper-facts">
  {m.heading&&<p className="paper-facts-heading">{m.heading}</p>}
  <ol className="paper-time-facts">{m.points.map((p,i)=><li key={i}><strong>{p.label}</strong>{i<m.points.length-1&&<span> → {m.gaps[i]}</span>}</li>)}</ol>
  {m.transfer&&<><p>{m.transfer.from} gives {m.transfer.to} {m.transfer.amount} {m.transfer.unit}.</p><p>{m.transfer.after}</p></>}
  {m.caption&&<p className="paper-facts-caption">{m.caption}</p>}
 </div>;
 return <div className="paper-maths-figure"><Picture model={m}/></div>;
}
