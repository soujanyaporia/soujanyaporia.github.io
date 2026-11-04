import './counters.css';
import type {Tool} from '../model';
type JoinTool=Extract<Tool,{kind:'join-parts'}>;
const colours=['#5c8fce','#59a18f','#dc9c4a','#c77a9c'];
export const joinedTotal=(t:JoinTool)=>t.parts.reduce((s,n,i)=>s+(t.joined.includes(i)?n:0),0);
export function JoinParts({t,onChange}:{t:JoinTool;onChange?:(t:Tool)=>void}){
 const total=joinedTotal(t);let offset=0;
 const counters=t.parts.flatMap((n,group)=>Array.from({length:n},(_,i)=>({group,i,key:offset++})));

 return <div className="tool join-parts"><svg viewBox="0 0 520 330" role="img" aria-label={`${t.parts.join(', ')} counters in separate coloured groups. ${t.joined.length} groups joined${t.hideValue?'':`, ${total} counters together`}.`}>
 {t.parts.map((n,i)=><g key={i}><rect x={15+i*(490/t.parts.length)} y="15" width={470/t.parts.length} height="127" rx="18" fill={`${colours[i]}12`} stroke={`${colours[i]}50`} strokeDasharray={t.joined.includes(i)?'5 5':undefined}/><text x={15+(i+.5)*(490/t.parts.length)} y="130" textAnchor="middle" fontSize="18" fontWeight="850" fill={colours[i]}>{t.joined.includes(i)?'joined':`${n} counter${n===1?'':'s'}`}</text></g>)}
 <rect x="28" y="183" width="464" height="120" rx="21" fill="#f2f5ec" stroke="#d6dfc9" strokeWidth="2"/>
 {!t.joined.length&&<text x="260" y="250" textAnchor="middle" fontSize="16" fill="#90a184">Our joined group will go here</text>}
 {counters.map(({group,i,key})=>{const joined=t.joined.includes(group),at=joined?t.joined.slice(0,t.joined.indexOf(group)).reduce((s,g)=>s+t.parts[g],0)+i:i,x=joined?66+at%10*42:15+(group+.5)*(490/t.parts.length)+(i%3-1)*29,y=joined?212+Math.floor(at/10)*30:46+Math.floor(i/3)*26;return <circle className="joining-counter" key={key} r="10" fill={colours[group]} stroke="white" strokeWidth="2" style={{transform:`translate(${x}px,${y}px)`}}/>;})}
 </svg>{onChange&&<div className="join-part-buttons">{t.parts.map((n,i)=><button key={i} aria-label={`Add group ${i+1}: ${n} counter${n===1?'':'s'}`} disabled={t.joined.includes(i)} onClick={()=>onChange({...t,joined:[...t.joined,i]})}><span style={{background:colours[i]}}/>{t.joined.includes(i)?'Joined':`Add ${n}`}</button>)}</div>}
 {!t.hideValue&&onChange&&<p className="join-part-total" aria-live="polite">{t.joined.length?`${t.joined.map(i=>t.parts[i]).join(' + ')} = ${total}${t.joined.length<t.parts.length?' so far':''}`:'Choose a group to start.'}</p>}
 </div>;
}
