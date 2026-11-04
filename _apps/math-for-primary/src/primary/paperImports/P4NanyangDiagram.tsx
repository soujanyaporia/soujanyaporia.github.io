import {useId} from 'react';
import type {P4NanyangPicture} from './p4NanyangPicture';
import './p4NanyangDiagram.css';

export function P4NanyangDiagram({model:m}:{model:P4NanyangPicture}){
 const id=useId().replaceAll(':','');
 if(m.layout==='line-graph'){
  const max=Math.ceil(Math.max(...m.values)/m.scale)*m.scale,x=(i:number)=>64+i*84,y=(v:number)=>220-v/max*184;
  return <figure className="nanyang-diagram nanyang-line"><strong>{m.title}</strong><svg viewBox="0 0 360 270" role="img" aria-labelledby={`${id}-title ${id}-description`}><title id={`${id}-title`}>{m.title}</title><desc id={`${id}-description`}>{`Vertical scale: each interval is ${m.scale}. ${m.labels.map((label,i)=>`${label}: ${m.values[i]}`).join('; ')}.`}</desc>{Array.from({length:max/m.scale+1},(_,i)=><g key={i}><line x1="42" x2="340" y1={y(i*m.scale)} y2={y(i*m.scale)} stroke="#cad9e0"/><text x="34" y={y(i*m.scale)+5} textAnchor="end" fontSize="15">{i*m.scale}</text></g>)}<path d="M42 30V220H340" stroke="#21465b" strokeWidth="2" fill="none"/><polyline data-chart-line="true" points={m.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} fill="none" stroke="#236985" strokeWidth="3"/>{m.values.map((v,i)=><g key={m.labels[i]}><circle data-chart-point={i} cx={x(i)} cy={y(v)} r="5" fill="#236985" stroke="white" strokeWidth="2"/><text x={x(i)} y="248" textAnchor="middle" fontSize="15">{m.labels[i]}</text></g>)}</svg></figure>;
 }
 if(m.layout==='table')return <figure className="nanyang-diagram nanyang-table"><table><caption>{m.caption}</caption><thead><tr><th scope="col">Day</th>{m.columns.map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{m.rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value,i)=><td key={i}>{value===null?<span aria-label="unknown">?</span>:value}</td>)}</tr>)}</tbody></table><figcaption>? means an unknown number.</figcaption></figure>;
 return <figure className="nanyang-diagram"><div className="nanyang-sets">{m.sets.map((set,i)=>{
  const cols=4,rows=Math.ceil(set.total/cols),height=rows*38+12,description=`Set ${set.label}: ${set.shadedIndices.length} shaded tiles out of ${set.total} separate tiles.`;
  return <div className="nanyang-set" key={set.label}><strong>Set {set.label}</strong><svg viewBox={`0 0 168 ${height}`} role="img" aria-labelledby={`${id}-${i}`}><title id={`${id}-${i}`}>{description}</title>{Array.from({length:set.total},(_,j)=><g key={j} data-set-tile={j} data-shaded={set.shadedIndices.includes(j)?'true':'false'}><rect x={10+j%cols*38} y={6+Math.floor(j/cols)*38} width="28" height="28" rx="5" fill={set.shadedIndices.includes(j)?'#296d8d':'#fff'} stroke="#21465b" strokeWidth="2"/>{set.shadedIndices.includes(j)&&<path d={`m${17+j%cols*38},${20+Math.floor(j/cols)*38} 5 5 9-12`} fill="none" stroke="#fff" strokeWidth="2.5"/>}</g>)}</svg></div>;
 })}</div><figcaption>Filled tiles with a tick are shaded. Each tile is one object.</figcaption></figure>;
}
