import {useState} from 'react';
import {groupingValue,placedGroups,type GroupingSpec} from './groupingAnswer';
import './groupingBuilder.css';

const gift=(id:number)=> <><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M8 12Q18 4 28 12L25 29H11Z" fill="#e79d58"/><path d="M7 10H29V15H7Z" fill="#a95a3e"/><path d="M17 7C10 8 9 1 14 2Q18 2 18 7C22 0 29 3 25 7Z" fill="#4f9272"/></svg><span>{id+1}</span></>;
/** Static ungrouped objects keep a printed grouping question fully answerable. */
export function GroupingObjects({spec}:{spec:GroupingSpec}){return <div className="grouping-print-objects" role="img" aria-label={`${spec.total} ${spec.objectLabel} objects to group`}>{Array.from({length:spec.total},(_,id)=><span key={id}>{gift(id)}</span>)}</div>;}
/** Select objects and place them together; never auto-solve a group for the child. */
export function GroupingBuilder({spec,value,onChange,disabled=false}:{spec:GroupingSpec;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [selected,setSelected]=useState<number[]>([]),groups=placedGroups(spec,value),used=new Set(groups.flat()),available=Array.from({length:spec.total},(_,i)=>i).filter(i=>!used.has(i)),selection=selected.filter(i=>available.includes(i));

 const instructions=spec.target.kind==='size'?`Make groups of ${spec.target.value}.`:`Make ${spec.target.value} equal groups.`;
 return <section className="grouping-builder" aria-label="Make equal groups">
  <p><strong>{instructions}</strong> Select objects, then choose “Make a group”. Use every object once.</p>
  <div className="grouping-objects" role="group" aria-label="Objects not yet grouped">{available.map(id=><button type="button" key={id} disabled={disabled} aria-label={`Select ${spec.objectLabel} ${id+1}`} aria-pressed={selection.includes(id)} onClick={()=>setSelected(selection.includes(id)?selection.filter(n=>n!==id):[...selection,id])}>{gift(id)}</button>)}</div>
  <div className="grouping-actions"><button type="button" disabled={disabled||selection.length===0} onClick={()=>{onChange(groupingValue([...groups,selection]));setSelected([]);}}>Make a group{selection.length>0?` (${selection.length})`:''}</button><button type="button" disabled={disabled||selection.length===0} onClick={()=>setSelected([])}>Clear selection</button></div>
  <div className="grouping-made">{groups.map((group,g)=><fieldset key={g}><legend>Group {g+1}</legend><div className="grouping-objects">{group.map(id=><button type="button" key={id} disabled={disabled} aria-label={`Return ${spec.objectLabel} ${id+1} from group ${g+1}`} onClick={()=>onChange(groupingValue(groups.map((old,i)=>i===g?old.filter(n=>n!==id):old).filter(old=>old.length)))}>{gift(id)}</button>)}</div></fieldset>)}</div>
  <p className="grouping-status" aria-live="polite">{used.size} of {spec.total} objects grouped. {groups.length} {groups.length===1?'group':'groups'} made.</p>
  {groups.length>0&&<button className="grouping-reset" type="button" disabled={disabled} onClick={()=>{onChange('');setSelected([]);}}>Start the groups again</button>}
 </section>;
}
