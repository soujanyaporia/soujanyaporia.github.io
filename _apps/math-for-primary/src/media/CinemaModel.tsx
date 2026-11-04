import {useEffect,useId,useState,type CSSProperties} from 'react';
import type {Tool} from '../teach/model';
import {ToolView} from '../teach/tools/Tools';
import {AdventureBuddy} from '../ui/Adventure';
const colours=['#7c76d6','#4c9e9a','#edab55','#dc7c7b','#6b9c67','#708fc5'];
const placeNames:Record<number,string>={1000000:'millions',100000:'hundred thousands',10000:'ten thousands',1000:'thousands',100:'hundreds',10:'tens',1:'ones',.1:'tenths',.01:'hundredths',.001:'thousandths'};
export function placeColumns(value:number,decimals=0){
 return String(value).padStart(decimals+1,'0').split('').map((s,i,all)=>{const digit=Number(s),unit=10**(all.length-i-1-decimals);return {digit,unit,value:Number((digit*unit).toFixed(4)),name:placeNames[unit]??String(unit)};});
}
export function CinemaModel({tool}:{tool?:Tool}){
 if(!tool)return <AdventureBuddy happy/>;
 if(tool.kind==='scene'&&tool.scene==='place')return <PlaceStudio value={tool.values[0]} decimals={tool.values[1]??0} phase={tool.phase} focus={tool.values[2]??0}/>;
 return <div className="cinema-model-native"><ToolView tool={tool}/></div>;
}
function PlaceStudio({value,decimals,phase,focus}:{value:number;decimals:number;phase:number;focus:number}){
 const [selected,setSelected]=useState<number|null>(null),shadow=useId();
 useEffect(()=>setSelected(phase===1?focus:null),[phase,focus]);
 const columns=placeColumns(value,decimals),cols=columns.length,w=160,canvas=Math.max(400,cols*w+20),left=(canvas-cols*w)/2;
 return <div className="place-studio"><svg viewBox={`0 0 ${canvas} 320`} role="img" aria-label={`Place-value model for ${value/10**decimals}`}>
 <defs><filter id={shadow}><feDropShadow dx="0" dy="4" stdDeviation="1" floodColor="#2e3653" floodOpacity=".12"/></filter></defs>
 {columns.map(({digit,unit,name},i)=>{const x=left+i*w,colour=colours[i%colours.length],dim=selected!==null&&selected!==i;return <g key={i} className="cinema-place-column" opacity={dim?.38:1}>
 <rect x={x+7} y="12" width={w-14} height="280" rx="22" fill="#ffffffb8" stroke={selected===i?colour:'#e2e4ee'} strokeWidth={selected===i?3:1}/>
 <text x={x+w/2} y="42" textAnchor="middle" fill={colour} fontSize={name.length>12?11:16} fontWeight="850">{name}</text>
 <text x={x+w/2} y="60" textAnchor="middle" fill={colour} fontSize="11" fontWeight="750">{unit}</text>
 <g filter={`url(#${shadow})`}>{Array.from({length:digit},(_,n)=>{
 if(unit===10){const bw=Math.min(24,(w-35)/4),bx=x+w/2+(n%3-1)*(bw+7)-bw/2,by=68+Math.floor(n/3)*53;return <g key={n} className="cinema-math-block"><rect x={bx} y={by} width={bw} height="45" rx="4" fill={colour}/>{Array.from({length:9},(_,j)=><path key={j} d={`M${bx+1} ${by+(j+1)*4.5}h${bw-2}`} stroke="#ffffff65" strokeWidth=".7"/>)}</g>;}
 const size=Math.min(25,(w-38)/3),bx=x+w/2+(n%3-1)*(size+5)-size/2,by=74+Math.floor(n/3)*(size+8);
 return <g key={n} className="cinema-math-block"><rect x={bx} y={by} width={size} height={size} rx={unit===1?5:size/2} fill={colour}/>{unit!==1&&<text x={bx+size/2} y={by+size/2+3} textAnchor="middle" fill="white" fontSize={unit>=1000?7:8} fontWeight="800">{unit>=1000?`${unit/1000}k`:unit}</text>}</g>;
 })}</g><text x={x+w/2} y="244" textAnchor="middle" fill="#303858" fontSize="39" fontWeight="900">{digit}</text>
 {phase>=2&&<text className="cinema-place-value" x={x+w/2} y="276" textAnchor="middle" fill={colour} fontSize="18" fontWeight="850">= {Number((digit*unit).toFixed(4))}</text>}
 </g>;})}
 </svg><div className="place-touch-keys" aria-label="Explore the place-value columns">{columns.map(({digit,name},i)=><button key={i} aria-pressed={selected===i} onClick={()=>setSelected(selected===i?null:i)} style={{'--column-colour':colours[i%colours.length]} as CSSProperties}>{digit} {name}</button>)}</div><p className="cinema-touch-hint" aria-live="polite">{selected===null?'Tap a place to take a closer look.':`${columns[selected]?.digit} × ${columns[selected]?.unit} = ${columns[selected]?.value}`}</p></div>;
}
