import {useState} from 'react';
import type {PaperIcon,PaperPicture} from './paperPicture';
import './paper.css';

/** An individual illustration; its parent supplies the accessible meaning. */
export function PaperObject({kind='number'}:{kind?:PaperIcon}){
 const outline={stroke:'currentColor',strokeWidth:2.4,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <svg viewBox="0 0 80 70" aria-hidden="true" className={`paper-object object-${kind}`}><ellipse cx="40" cy="61" rx="28" ry="4" fill="currentColor" opacity=".09"/>
  {kind==='coin'?<g {...outline}><circle cx="36" cy="34" r="23" fill="#ffdf83"/><circle cx="36" cy="34" r="17" fill="none"/><path d="M40 23h-5a6 6 0 0 0 0 12h3a6 6 0 0 1 0 12h-8M36 18v33" fill="none"/></g>
  :kind==='bag'?<g {...outline} fill="#f5cfaa"><path d="M20 24h40l5 35H15Z"/><path d="M30 26V18a10 10 0 0 1 20 0v8" fill="none"/><path d="M30 39h20M30 47h14"/></g>
  :kind==='book'?<g {...outline}><path d="M40 20Q25 8 12 16v39q14-6 28 5 14-11 28-5V16Q55 8 40 20Z" fill="#b8d9f1"/><path d="M40 20v40M20 25l12 4M20 35l12 4M48 29l12-4M48 39l12-4" fill="none"/></g>
  :kind==='fruit'?<g {...outline}><path d="M40 23C20 8 7 28 17 47q9 20 23 9 14 11 23-9c10-19-3-39-23-24Z" fill="#ffc3ad"/><path d="M40 26V12M41 17q13-17 22-7-9 14-22 7Z" fill="#a9d4b2"/></g>
  :kind==='muffin'?<g {...outline}><path d="M18 32h44l-7 27H25Z" fill="#efd4a5"/><path d="M18 34C6 24 21 13 28 16 29 3 53 3 55 17 69 15 76 32 62 36Z" fill="#c78c59"/><path d="M29 39l3 15M40 39v16M51 39l-3 15" fill="none"/><circle cx="28" cy="25" r="2" fill="#68503c"/><circle cx="44" cy="19" r="2" fill="#68503c"/><circle cx="53" cy="28" r="2" fill="#68503c"/></g>
  :kind==='ticket'?<g {...outline}><path d="M13 18h54v10a7 7 0 0 0 0 14v10H13V42a7 7 0 0 0 0-14Z" fill="#ffe2a9"/><path d="M49 20v30" strokeDasharray="3 4"/><path d="m31 24 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#fff4d5"/></g>
  :kind==='clock'?<g {...outline}><circle cx="40" cy="34" r="25" fill="#d9ebec"/><path d="M40 17v3M40 48v3M23 34h3M54 34h3M40 24v11l10 5" fill="none"/><circle cx="40" cy="34" r="2"/></g>
  :kind==='box'?<g {...outline}><path d="m13 23 27-13 27 13v30L40 64 13 53Z" fill="#e7caa1"/><path d="m13 23 27 13 27-13M40 36v28M27 17l27 13v11" fill="none"/></g>
  :kind==='pencil'?<g {...outline}><path d="m19 52 5-14L53 9l13 13-29 29-18 5Z" fill="#ffda83"/><path d="m24 38 13 13M48 14l13 13M30 44l25-25" fill="none"/><path d="m19 56 5-14 8 9Z" fill="#536b7c"/></g>
  :kind==='child'?<g {...outline}><circle cx="40" cy="21" r="12" fill="#f4d0b1"/><path d="M23 58V47a17 17 0 0 1 34 0v11Z" fill="#b8d9f1"/><path d="M28 17q8-16 24 0M36 25q4 4 8 0" fill="none"/></g>
  :kind==='ribbon'?<g {...outline} fill="#b7dbca"><path d="M12 21q15-10 28 0t28 0v23q-15 10-28 0t-28 0Z"/><path d="M19 26v8M29 25v5M39 28v8M49 29v5M59 26v8" fill="none"/></g>
  :kind==='water'?<g {...outline}><path d="M21 15h32v40q-16 12-32 0Z" fill="#e7f4fb"/><path d="M53 23h9q14 15-9 23" fill="none"/><path d="M22 35q8-5 16 0t14 0v19q-15 10-30 0Z" fill="#a4d1ea" stroke="none"/><path d="M25 29h6M25 40h6M25 50h6" fill="none"/></g>
  :<g {...outline}><rect x="14" y="13" width="52" height="43" rx="10" fill="#d7e5fb"/><path d="M26 28h28M26 42h28M35 24v23M45 24v23" fill="none"/></g>}
 </svg>;
}

export function toggleCountMark(marked:number[],index:number){return marked.includes(index)?marked.filter(n=>n!==index):[...marked,index];}
const objectNames:Record<PaperIcon,[string,string]>={fruit:['apple','apples'],muffin:['muffin','muffins'],book:['book','books'],bag:['bag','bags'],coin:['coin','coins'],ticket:['ticket','tickets'],clock:['clock','clocks'],box:['box','boxes'],number:['object','objects'],pencil:['pencil','pencils'],child:['child','children'],ribbon:['ribbon','ribbons'],water:['jug','jugs']};
function CountedObjects({count,removed=0,icon='number',label}:{count:number;removed?:number;icon?:PaperIcon;label:string}){
 const [marked,setMarked]=useState<number[]>([]),[singular,plural]=objectNames[icon];
 return <div className="paper-counting" role="group" aria-label={`${label}: count the ${plural}${removed?' left':''}`}>
  <div className="paper-count-objects">{Array.from({length:count},(_,i)=>{
   if(i<removed)return <span key={i} className="paper-count-object paper-object-removed" role="img" aria-label={`Crossed-out ${singular}; do not count`}><PaperObject kind={icon}/><b aria-hidden="true">×</b></span>;
   const order=marked.indexOf(i)+1;
   return <button type="button" key={i} className={`paper-count-object${order?' is-counted':''}`} aria-pressed={!!order} aria-label={order?`${singular}, counted ${order}. Unmark this ${singular}`:`Count this ${singular}`} onClick={()=>setMarked(items=>toggleCountMark(items,i))}><PaperObject kind={icon}/>{order>0&&<b className="paper-count-badge" aria-hidden="true">{order}</b>}</button>;
  })}</div>
  <button type="button" className="paper-count-reset" disabled={!marked.length} onClick={()=>setMarked([])} aria-label={`Start counting ${label.toLowerCase()} again`}>Count again ↻</button>
 </div>;
}

export function PaperDiagram({model:m}:{model:PaperPicture}){
 const largest=m.layout==='bars'?Math.max(...m.rows.map(r=>r.parts.reduce((n,p)=>n+p.size,0)),1):1;
 const modelKey=m.layout==='cards'?JSON.stringify(m):'';
 return <figure className={`paper-diagram paper-${m.layout}`}>
  {m.heading&&<div className="paper-diagram-heading">{m.heading}</div>}
  {m.layout==='cards'&&<div className={`paper-givens${m.cards.some(c=>c.count!==undefined)?' paper-count-givens':''}`}>{m.cards.map((c,i)=><div className={`paper-given${c.count!==undefined?' paper-count-card':''}`} key={i}>{c.count===undefined?<PaperObject kind={c.icon}/>:<CountedObjects key={`${modelKey}:${i}`} count={c.count} removed={c.removed} icon={c.icon} label={c.label}/>}<span>{c.label}</span><strong>{c.value}</strong></div>)}</div>}
  {m.layout==='bars'&&<div className="paper-bar-model">{m.totalLabel&&<p className="paper-whole">{m.totalLabel}</p>}{m.rows.map((r,i)=><div className="paper-bar-row" key={i}><strong className="paper-row-label">{r.label}</strong><div className="paper-bar-track"><div className="paper-bar-segments" style={{width:`${r.parts.reduce((n,p)=>n+p.size,0)/largest*100}%`}}>{r.parts.map((p,j)=><span key={j} className={`paper-bar-part tone-${p.tone??(i%2?'green':'blue')}`} style={{flex:p.size}}>{p.label}</span>)}</div></div></div>)}{m.unit&&<p className="paper-unit">{m.unit}</p>}</div>}
  {m.layout==='timeline'&&<ol className="paper-time-line">{m.points.map((p,i)=><li key={i}><div className="paper-time-point"><PaperObject kind={p.icon??'clock'}/><strong>{p.label}</strong></div>{i<m.points.length-1&&<div className="paper-time-gap"><span>{m.gaps[i]}</span><i aria-hidden="true">→</i></div>}</li>)}</ol>}
  {m.caption&&<figcaption>{m.caption}</figcaption>}
 </figure>;
}
