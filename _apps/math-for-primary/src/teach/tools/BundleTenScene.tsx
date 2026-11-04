import './counters.css';
import {useEffect,useState} from 'react';
/** Counter identities are retained while their positions change: grouping never changes the amount. */
export function bundlePosition(i:number,phase:number):[number,number]{
 const groups=Math.min(3,phase);
 if(!groups)return [132+i%8*35,57+Math.floor(i/8)*43];
 if(i<groups*10)return [43+i%10*23,65+Math.floor(i/10)*57];
 const n=i-groups*10;
 return groups===3?[365+n*42,122]:[338+n%5*29,67+Math.floor(n/5)*33];
}
export function BundleTenScene({phase,interactive=true}:{phase:number;interactive?:boolean}){
 const groups=Math.min(3,phase),[count,setCount]=useState(0),[counting,setCounting]=useState(false);
 useEffect(()=>{setCount(0);setCounting(false);},[phase]);
 useEffect(()=>{if(!counting)return;if(count===10){setCounting(false);return;}const timer=setTimeout(()=>setCount(n=>n+1),450);return()=>clearTimeout(timer);},[counting,count]);
 return <div className="bundle-ten-scene"><svg className="lesson-scene" viewBox="0 0 520 290" role="img" aria-label={`32 counters: ${groups} groups of ten and ${32-groups*10} counters still loose`}>
 {groups>0&&<><text x="150" y="25" textAnchor="middle" className="bundle-heading">{groups===1?'One group of ten':'Groups of ten'}</text><text x="395" y="25" textAnchor="middle" className="bundle-heading">{groups===3?'Two left over':'Still loose'}</text></>}
 {[0,1,2].map(g=><g key={g} opacity={g<groups?1:0} className="bundle-outline"><rect x="26" y={44+g*57} width="267" height="42" rx="15" fill="#ece9fc" stroke="#b8b0e2" strokeWidth="2"/><text x="274" y={71+g*57} textAnchor="middle" fontSize="13" fill="#8273b7" fontWeight="900">10</text></g>)}
 {Array.from({length:32},(_,i)=>{const [x,y]=bundlePosition(i,phase),counted=i<10&&i<count;return <g key={i} className="bundle-counter" style={{transform:`translate(${x}px,${y}px)`}}><circle r={counted?11:9} fill={i<groups*10?(counted?'#d89743':'#897fc8'):'#6aa99c'} stroke="white" strokeWidth="2"/>{counted&&<text textAnchor="middle" y="4" fontSize="11" fontWeight="900" fill="white">{i+1}</text>}</g>;})}
 <text x="260" y="258" textAnchor="middle" fill="#4d5370" fontSize="20" fontWeight="850">{groups===0?'Let’s put these counters into groups.':phase===4?'30 + 2 = 32':`${groups} ${groups===1?'ten':'tens'} · ${32-groups*10} ones`}</text>
 </svg>{interactive&&groups>0&&<button className="bundle-count-button" onClick={()=>{setCount(0);setCounting(true);}} disabled={counting}>{counting?`Counting… ${count}`:'Count the first group with me'}</button>}{count===10&&!counting&&<p className="bundle-confirmation" role="status">Ten counters. One ten!</p>}</div>;
}
