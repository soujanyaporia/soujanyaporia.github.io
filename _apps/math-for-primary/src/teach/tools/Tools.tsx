import {LessonScene,FoundationPicture} from './LessonScene';
import {NetModel} from './NetModel';
import {GeometryWorkbench} from './GeometryWorkbench';
import {Picture} from '../../primary/Picture';
import { useRef,useState,type PointerEvent as ReactPointerEvent } from 'react';
import type { Tool } from '../model';
import { barWidths,beamAngle,equalRows,expandedForm,isBalanced,linePosition,percentOf,pileLeft,placeValue,ratioTotal,sideText,stripParts } from './geometry';
import { fmt,simplest } from '../gen';
type Of<K extends Tool['kind']>=Extract<Tool,{kind:K}>;
type Props<K extends Tool['kind']>={t:Of<K>;onChange?:(t:Tool)=>void};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const Stepper=({label,value,onChange,min=0,max=99}:{label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number})=><div className="stepper" role="group" aria-label={label}><span>{label}</span><button type="button" disabled={value<=min} onClick={()=>onChange(value-1)} aria-label={`${label}: one less`}>−</button><output aria-live="polite">{value}</output><button type="button" disabled={value>=max} onClick={()=>onChange(value+1)} aria-label={`${label}: one more`}>+</button></div>;
/** Drag a token from one drop zone to another; a tap still works for keyboard and switch users. */
function useDrag(onDrop:(from:string,to:string)=>void){
 const [drag,setDrag]=useState<{from:string;x:number;y:number;dx:number;dy:number}|null>(null),moved=useRef(false);
 return {drag,moved,handlers:(from:string)=>({
  onPointerDown:(e:ReactPointerEvent)=>{if(e.button!==0)return;(e.currentTarget as Element).setPointerCapture?.(e.pointerId);moved.current=false;setDrag({from,x:e.clientX,y:e.clientY,dx:0,dy:0});},
  onPointerMove:(e:ReactPointerEvent)=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>8)moved.current=true;setDrag({...drag,dx,dy});},
  onPointerUp:(e:ReactPointerEvent)=>{if(!drag)return;const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]')?.getAttribute('data-drop');setDrag(null);if(moved.current&&to&&to!==drag.from)onDrop(drag.from,to);},
  onPointerCancel:()=>setDrag(null),
 })};
}
function Counters({t,onChange}:Props<'counters'>){
 const cap=t.frame??10,set=(n:number)=>onChange?.({...t,count:clamp(n,0,cap)});
 return <div className="tool tool-counters"><div className="ten-frames" role={onChange?'group':'img'} aria-label={`${t.count} counters in ${cap/10} ten frame${cap>10?'s':''}`}>{Array.from({length:cap/10},(_,f)=><div className="ten-frame" key={f}>{Array.from({length:10},(_,i)=>{const n=f*10+i,on=n<t.count;return onChange?<button type="button" key={i} className={on?'on':''} aria-label={on?`Remove a counter (${t.count} now)`:`Add a counter (${t.count} now)`} onClick={()=>set(on?t.count-1:t.count+1)}/>:<span key={i} className={on?'on':''}/>;})}</div>)}</div>{onChange&&<Stepper label="Counters" value={t.count} max={cap} onChange={set}/>}</div>;
}
function Bond({t,onChange}:Props<'bond'>){
 const move=(from:'a'|'b')=>{if(!onChange||t.locked)return;const [a,b]=t.parts;if(from==='a'&&a>0)onChange({...t,parts:[a-1,b+1]});if(from==='b'&&b>0)onChange({...t,parts:[a+1,b-1]});};
 const {drag,moved,handlers}=useDrag(from=>move(from as 'a'|'b'));const live=!!onChange&&!t.locked;
 const show=(which:'whole'|'a'|'b',n:number)=>t.hide===which?'?':String(n);
 const part=(which:'a'|'b',n:number)=><div className={`bond-part part-${which}`} data-drop={which}><strong>{show(which,n)}</strong>{t.hide!==which&&<div className="bond-dots">{Array.from({length:n},(_,i)=>live?<button type="button" key={i} className="dot" aria-label={`Move a counter to the other part`} style={drag?.from===which&&i===n-1?{transform:`translate(${drag.dx}px,${drag.dy}px)`}:undefined} {...(i===n-1?handlers(which):{})} onClick={()=>{if(!moved.current)move(which);}}/>:<i key={i} className="dot"/>)}</div>}</div>;
 return <div className="tool tool-bond" role={live?'group':'img'} aria-label={`Number bond: whole ${show('whole',t.whole)}, parts ${show('a',t.parts[0])} and ${show('b',t.parts[1])}`}><div className="bond-whole"><strong>{show('whole',t.whole)}</strong><small>whole</small></div><svg className="bond-lines" viewBox="0 0 200 40" aria-hidden="true"><line x1="100" y1="0" x2="45" y2="40"/><line x1="100" y1="0" x2="155" y2="40"/></svg><div className="bond-parts">{part('a',t.parts[0])}{part('b',t.parts[1])}</div>{live&&<p className="tool-tip">Drag or tap a counter to move it to the other part.</p>}</div>;
}
function Bar({t}:Props<'bar'>){
 if(t.compare){const {top,bottom,names}=t.compare,max=Math.max(top??0,bottom??0,1),w=(v:number|null)=>`${((v??max*.6)/max)*100}%`;
  return <div className="tool tool-bar compare" role="img" aria-label={`Comparison model: ${names[0]} ${top??'unknown'}, ${names[1]} ${bottom??'unknown'}`}>{[[names[0],top],[names[1],bottom]].map(([name,v])=><div className="bar-row" key={String(name)}><span className="bar-name">{name}</span><span className="bar-track"><span className="bar-seg" style={{width:w(v as number|null)}}>{v===null?'?':String(v)}</span></span></div>)}{top!==null&&bottom!==null&&<p className="bar-diff">Difference: {Math.abs((top as number)-(bottom as number))}</p>}</div>;}
 const widths=barWidths(t.parts,t.whole,100);
 return <div className="tool tool-bar" role="img" aria-label={`Bar model: whole ${t.whole??'unknown'}; parts ${t.parts.map(p=>p??'unknown').join(' and ')}`}><div className="bar-whole"><span>{t.whole??'?'}</span></div><div className="bar-parts">{t.parts.map((p,i)=><span key={i} className={`bar-seg seg-${i%3}`} style={{width:`${widths[i]}%`}}>{p===null?'?':String(p)}{t.labels?.[i]&&<small>{t.labels[i]}</small>}</span>)}</div></div>;
}
function NumberLine({t,onChange}:Props<'line'>){
 const W=520,x0=24,x1=W-24,step=t.step??1,ticks=Math.round((t.max-t.min)/step),pos=(v:number)=>linePosition(v,t.min,t.max,x0,x1);let at=t.start;
 const arcs=t.jumps.map(j=>{const from=at,to=at+j;at=to;return {from,to,j};});
 return <div className="tool tool-line"><svg viewBox={`0 0 ${W} 96`} role="img" aria-label={`Number line from ${t.min} to ${t.max}, starting at ${t.start}${t.jumps.length?`, jumps ${t.jumps.join(', ')}, ending at ${at}`:''}`}><line className="nl-axis" x1={x0} x2={x1} y1="70" y2="70"/>{Array.from({length:ticks+1},(_,i)=>{const v=t.min+i*step,major=ticks<=20||i%5===0;return <g key={i}><line className="nl-tick" x1={pos(v)} x2={pos(v)} y1={major?62:65} y2="78"/>{major&&<text x={pos(v)} y="92" textAnchor="middle">{fmt(v)}</text>}</g>;})}{arcs.map((a,i)=><g key={i}><path className="nl-jump" d={`M${pos(a.from)} 62 Q${(pos(a.from)+pos(a.to))/2} ${62-Math.min(46,10+Math.abs(pos(a.to)-pos(a.from))/3)} ${pos(a.to)} 62`}/><text className="nl-jump-label" x={(pos(a.from)+pos(a.to))/2} y={Math.max(12,40-Math.abs(pos(a.to)-pos(a.from))/6)} textAnchor="middle">{a.j>0?`+${fmt(a.j)}`:fmt(a.j)}</text></g>)}<circle className="nl-start" cx={pos(t.start)} cy="70" r="6"/>{t.mark!=null&&<circle className="nl-mark" cx={pos(t.mark)} cy="70" r="7"/>}</svg>{onChange&&<div className="tool-controls">{[-10,-1,1,10].filter(j=>Math.abs(j)<=t.max-t.min).map(j=><button type="button" key={j} disabled={at+j<t.min||at+j>t.max} onClick={()=>onChange({...t,jumps:[...t.jumps,j]})}>{j>0?`Jump +${j}`:`Jump ${j}`}</button>)}<button type="button" disabled={!t.jumps.length} onClick={()=>onChange({...t,jumps:t.jumps.slice(0,-1)})}>Undo</button><output aria-live="polite">At {fmt(at)}</output></div>}</div>;
}
function Groups({t,onChange}:Props<'groups'>){
 const limit=t.limit??10,total=t.groups*t.size;
 return <div className="tool tool-groups"><div className="plates" role="img" aria-label={`${t.groups} equal groups of ${t.size}: ${total} altogether`}>{Array.from({length:t.groups},(_,g)=><div className="plate" key={g}>{Array.from({length:t.size},(_,i)=><i key={i} className="dot"/>)}</div>)}</div><p className="tool-sum" aria-live="polite">{t.groups&&t.size?`${Array.from({length:t.groups},()=>t.size).join(' + ')} = ${t.groups} × ${t.size} = ${total}`:'Make some equal groups.'}</p>{onChange&&<div className="tool-controls"><Stepper label="Groups" value={t.groups} max={limit} onChange={n=>onChange({...t,groups:n})}/><Stepper label="In each group" value={t.size} max={limit} onChange={n=>onChange({...t,size:n})}/></div>}</div>;
}
function ArrayGrid({t,onChange}:Props<'array'>){
 return <div className="tool tool-array"><div className="array-grid" role="img" aria-label={`Array of ${t.rows} rows and ${t.cols} columns: ${t.rows*t.cols} dots`} style={{gridTemplateColumns:`repeat(${t.cols},1fr)`}}>{Array.from({length:t.rows*t.cols},(_,i)=><i key={i} className="dot"/>)}</div><p className="tool-sum" aria-live="polite">{t.rows} rows of {t.cols} = {t.rows} × {t.cols} = {t.rows*t.cols}</p>{onChange&&<div className="tool-controls"><Stepper label="Rows" value={t.rows} max={10} min={1} onChange={n=>onChange({...t,rows:n})}/><Stepper label="Columns" value={t.cols} max={10} min={1} onChange={n=>onChange({...t,cols:n})}/><button type="button" onClick={()=>onChange({...t,rows:t.cols,cols:t.rows})}>Turn it a quarter turn</button></div>}</div>;
}
function Share({t,onChange}:Props<'share'>){
 const left=pileLeft(t),size=t.size??1,live=!!onChange;
 const give=(i:number)=>{if(!onChange)return;if(t.mode==='group'){if(left>=size)onChange({...t,given:[...t.given,size]});return;}if(left>0)onChange({...t,given:t.given.map((g,j)=>j===i?g+1:g)});};
 const {handlers,moved}=useDrag((_,to)=>give(Number(to.slice(6))));
 const round=()=>{if(onChange&&t.mode==='share'&&left>=t.people)onChange({...t,given:t.given.map(g=>g+1)});};
 const boxes=t.mode==='share'?t.given:t.given;
 return <div className="tool tool-share"><div className="pile" aria-label={`${left} left to ${t.mode==='share'?'share':'put in groups'}`}>{Array.from({length:left},(_,i)=>live&&t.mode==='share'&&i===left-1?<button type="button" key={i} className="token" aria-label="Drag this to a plate" {...handlers('pile')}/>:<i key={i} className="token"/>)}{!left&&<span className="pile-empty">None left</span>}</div>
  <div className="plates">{(t.mode==='share'?Array.from({length:t.people},(_,i)=>i):boxes.map((_,i)=>i)).map(i=><div key={i} className="plate" data-drop={`plate-${i}`}>{live&&t.mode==='share'?<button type="button" className="plate-add" onClick={()=>{if(!moved.current)give(i);}} aria-label={`Give one to friend ${i+1} (has ${t.given[i]})`}>{Array.from({length:t.given[i]},(_,k)=><i key={k} className="token"/>)}</button>:Array.from({length:t.given[i]??0},(_,k)=><i key={k} className="token"/>)}<small>{t.mode==='share'?`Friend ${i+1}: ${t.given[i]}`:`Group ${i+1}: ${t.given[i]}`}</small></div>)}</div>
  {live&&<div className="tool-controls">{t.mode==='share'?<button type="button" disabled={left<t.people} onClick={round}>Give one to everyone</button>:<button type="button" disabled={left<size} onClick={()=>give(0)}>Make a group of {size}</button>}<button type="button" disabled={!t.given.some(Boolean)} onClick={()=>onChange!({...t,given:t.mode==='share'?t.given.map(()=>0):[]})}>Start again</button></div>}</div>;
}
function FractionWall({t,onChange}:Props<'fractions'>){
 const W=600,H=46,gap=10,pairs=equalRows(t),set=(row:number,k:number)=>onChange?.({...t,shaded:t.shaded.map((s,i)=>i===row?(s===k?k-1:k):s)});
 const matchX=pairs.length?(t.shaded[pairs[0][0]]/t.denominators[pairs[0][0]])*W:null;
 return <div className="tool tool-fractions"><svg viewBox={`0 0 ${W+140} ${t.denominators.length*(H+gap)+8}`} role={onChange?'group':'img'} aria-label={t.denominators.map((d,i)=>`${t.shaded[i]} of ${d} equal parts shaded`).join('; ')}>{t.denominators.map((d,row)=><g key={row} transform={`translate(0 ${row*(H+gap)+4})`}>{stripParts(W,d).map((p,k)=>{const on=k<t.shaded[row];return <g key={k}>{onChange?<rect className={`fw-part${on?' on':''}`} x={p.x} y="0" width={p.width} height={H} role="button" tabIndex={0} aria-label={`Shade ${k+1} of ${d}`} onClick={()=>set(row,k+1)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();set(row,k+1);}}}/>:<rect className={`fw-part${on?' on':''}`} x={p.x} y="0" width={p.width} height={H}/>}{d<=12&&<text className="fw-label" x={p.x+p.width/2} y={H/2+5} textAnchor="middle">{d===1?'1':`1/${d}`}</text>}</g>;})}<text className="fw-value" x={W+14} y={H/2+6}>{t.shaded[row]}/{d}</text></g>)}{matchX!==null&&<line className="fw-match" x1={matchX} x2={matchX} y1="0" y2={t.denominators.length*(H+gap)}/>}</svg>{pairs.length>0&&<p className="tool-sum fw-equal" aria-live="polite">{pairs.map(([i,j])=>`${t.shaded[i]}/${t.denominators[i]} = ${t.shaded[j]}/${t.denominators[j]}`).join('  ·  ')}: the same length, so the same amount.</p>}</div>;
}
function Place({t,onChange}:Props<'place'>){
 const names=['Ones','Tenths','Hundredths','Thousandths'],value=placeValue(t.digits,t.wholes??0),set=(i:number,v:number)=>onChange?.({...t,digits:t.digits.map((d,j)=>j===i?clamp(v,0,9):d)});
 return <div className="tool tool-place"><div className="place-chart" role={onChange?'group':'img'} aria-label={`Place-value chart showing ${fmt(value)}`} style={{gridTemplateColumns:`repeat(${t.digits.length+1},1fr)`}}>{names.slice(0,t.digits.length+1).map((n,i)=><div className={`place-col${i===0?' ones':''}`} key={n}><strong>{n}</strong><span className="place-digit">{i===0?t.wholes??0:t.digits[i-1]}</span><span className="place-dots" aria-hidden="true">{Array.from({length:i===0?t.wholes??0:t.digits[i-1]},(_,k)=><i key={k}/>)}</span>{onChange&&i>0&&<span className="place-steps"><button type="button" onClick={()=>set(i-1,t.digits[i-1]-1)} aria-label={`One fewer ${n.toLowerCase().slice(0,-1)}`}>−</button><button type="button" onClick={()=>set(i-1,t.digits[i-1]+1)} aria-label={`One more ${n.toLowerCase().slice(0,-1)}`}>+</button></span>}</div>)}</div><p className="tool-sum" aria-live="polite"><strong>{fmt(value)}</strong> = {expandedForm(t.digits,t.wholes??0)}</p></div>;
}
function Hundred({t,onChange}:Props<'hundred'>){
 const set=(n:number)=>onChange?.({...t,shaded:clamp(n,0,100)});
 return <div className="tool tool-hundred"><div className="hundred-board" role={onChange?'group':'img'} aria-label={`${t.shaded} of 100 squares shaded`}>{Array.from({length:100},(_,i)=>onChange?<button type="button" key={i} tabIndex={i%10===0?0:-1} className={i<t.shaded?'on':''} aria-label={`Shade ${i+1} squares`} onClick={()=>set(i+1===t.shaded?i:i+1)}/>:<i key={i} className={i<t.shaded?'on':''}/>)}</div><p className="tool-sum" aria-live="polite">{t.shaded}/100 = {fmt(t.shaded/100)} = <strong>{t.shaded}%</strong></p>{onChange&&<div className="tool-controls">{[-10,-1,1,10].map(n=><button type="button" key={n} onClick={()=>set(t.shaded+n)}>{n>0?`+${n}`:n}</button>)}</div>}</div>;
}
function PercentBar({t,onChange}:Props<'percent'>){
 const step=t.step??10,segs=100/step,unit=t.unit??'',value=percentOf(t.whole,t.percent),show=(n:number)=>unit==='$'?`$${fmt(n)}`:`${fmt(n)}${unit}`;
 return <div className="tool tool-percent"><div className="pbar" role="img" aria-label={`${t.percent}% of ${show(t.whole)} is ${show(value)}`}>{Array.from({length:segs},(_,i)=><span key={i} className={(i+1)*step<=t.percent?'on':''}><small>{step}%</small><b>{show(t.whole*step/100)}</b></span>)}</div><div className="pbar-scale" aria-hidden="true"><span>0%</span><span>100% = {show(t.whole)}</span></div><p className="tool-sum" aria-live="polite"><strong>{t.percent}%</strong> of {show(t.whole)} = {show(value)}</p>{onChange&&<div className="tool-controls"><button type="button" disabled={t.percent<=0} onClick={()=>onChange({...t,percent:t.percent-step})}>− {step}%</button><button type="button" disabled={t.percent>=100} onClick={()=>onChange({...t,percent:t.percent+step})}>+ {step}%</button></div>}</div>;
}
function Ratio({t,onChange}:Props<'ratio'>){
 const total=ratioTotal(t),colours=t.colours??['#5b8fd6','#e2a54b','#6fa676'];
 return <div className="tool tool-ratio" role={onChange?'group':'img'} aria-label={`Ratio ${t.names.join(' to ')} is ${t.units.join(' : ')}${t.unitValue!==null?`; one unit is ${t.unitValue}`:''}`}>{t.names.map((name,i)=><div className="ratio-row" key={name}><span className="ratio-name">{name}</span><span className="ratio-units">{Array.from({length:t.units[i]},(_,k)=><span key={k} className="ratio-unit" style={{background:colours[i%colours.length]}}>{t.unitValue!==null?fmt(t.unitValue):''}</span>)}</span>{t.unitValue!==null&&<span className="ratio-amount">{fmt(t.units[i]*t.unitValue)}</span>}{onChange&&<Stepper label={`${name} units`} value={t.units[i]} min={1} max={9} onChange={n=>onChange({...t,units:t.units.map((u,j)=>j===i?n:u)})}/>}</div>)}<p className="tool-sum" aria-live="polite">{t.names.join(' : ')} = {t.units.join(' : ')}{t.total!=null?` · ${total} units = ${fmt(t.total)}${t.unitValue!==null?` · 1 unit = ${fmt(t.unitValue)}`:''}`:''}</p></div>;
}
function Balance({t,onChange}:Props<'balance'>){
 const letter=t.letter??'x',angle=beamAngle(t),ok=isBalanced(t),change=(f:(s:{x:number;n:number})=>{x:number;n:number},sides:'both'|'left')=>onChange?.({...t,left:f(t.left),right:sides==='both'?f(t.right):t.right});
 const divisor=[2,3,4,5,6,7,8,9].find(k=>(t.left.x%k===0)&&(t.right.x%k===0)&&(t.left.n%k===0)&&(t.right.n%k===0)&&(t.left.x+t.right.x+t.left.n+t.right.n)>0);
 const pan=(s:{x:number;n:number},side:string)=><div className={`pan pan-${side}`}>{Array.from({length:s.x},(_,i)=><span key={'x'+i} className="xbox">{letter}</span>)}{Array.from({length:s.n},(_,i)=><span key={'n'+i} className="unit"/>)}</div>;
 return <div className="tool tool-balance"><div className="balance-scene" role="img" aria-label={`Balance: ${sideText(t.left,letter)} on the left, ${sideText(t.right,letter)} on the right. ${ok?'Balanced.':'Not balanced.'}`}><div className="beam" style={{transform:`rotate(${angle}deg)`}}>{pan(t.left,'left')}{pan(t.right,'right')}</div><div className="fulcrum"/></div><p className={`tool-sum balance-eq${ok?'':' off'}`} aria-live="polite"><strong>{sideText(t.left,letter)} {ok?'=':'≠'} {sideText(t.right,letter)}</strong>{ok?' · balanced':' · not balanced any more'}</p>{onChange&&<div className="tool-controls"><button type="button" disabled={!t.left.n||!t.right.n} onClick={()=>change(s=>({...s,n:s.n-1}),'both')}>Take 1 off both sides</button><button type="button" disabled={!t.left.x||!t.right.x} onClick={()=>change(s=>({...s,x:s.x-1}),'both')}>Take one {letter} off both sides</button>{divisor&&<button type="button" onClick={()=>change(s=>({x:s.x/divisor,n:s.n/divisor}),'both')}>Split both sides into {divisor} equal groups</button>}<button type="button" disabled={!t.left.n} onClick={()=>change(s=>({...s,n:s.n-1}),'left')}>Take 1 off the left only</button></div>}</div>;
}
/** One entry point for every manipulative. */
export function ToolView({tool,onChange}:{tool:Tool;onChange?:(t:Tool)=>void}){
 switch(tool.kind){case 'focus':return <figure className='tool-focus'><div style={{transform:`rotate(${tool.rotate}deg)`}}><ToolView tool={tool.source}/></div><figcaption>{tool.caption}</figcaption></figure>;case 'scene':return <LessonScene t={tool}/>;case 'foundation-visual':return <FoundationPicture t={tool}/>;
  case 'net-model':return <NetModel shape={tool.shape}/>;
  case 'geometry':return <GeometryWorkbench tool={tool} onChange={onChange}/>;
  case 'diagram':return <figure className="tool"><Picture model={tool.picture}/><figcaption>{tool.caption}</figcaption></figure>;
  case 'table':return <div className="tool table-scroll"><table className="school-table"><caption>{tool.caption}</caption><thead><tr>{tool.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{tool.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>;
  case 'counters':return <Counters t={tool} onChange={onChange}/>;
  case 'bond':return <Bond t={tool} onChange={onChange}/>;
  case 'bar':return <Bar t={tool}/>;
  case 'line':return <NumberLine t={tool} onChange={onChange}/>;
  case 'groups':return <Groups t={tool} onChange={onChange}/>;
  case 'array':return <ArrayGrid t={tool} onChange={onChange}/>;
  case 'share':return <Share t={tool} onChange={onChange}/>;
  case 'fractions':return <FractionWall t={tool} onChange={onChange}/>;
  case 'place':return <Place t={tool} onChange={onChange}/>;
  case 'hundred':return <Hundred t={tool} onChange={onChange}/>;
  case 'percent':return <PercentBar t={tool} onChange={onChange}/>;
  case 'ratio':return <Ratio t={tool} onChange={onChange}/>;
  case 'balance':return <Balance t={tool} onChange={onChange}/>;
 }
}
export const toolFraction=(n:number,d:number)=>simplest(n,d);
