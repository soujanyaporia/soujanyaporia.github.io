import { useState } from 'react';
import { ToolView } from './tools/Tools';
import type { Tool } from './model';
import './teach.css';
/** Free exploration: every manipulative from the lessons, with no questions attached. */
interface LabTool {id:string;name:string;about:string;group:string;tool:Tool}
const TOOLS:LabTool[]=[
 {id:'angle-builder',name:'Angle builder',about:'Change the opening while keeping the vertex and first ray fixed.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'angle',a:60,b:0}},
 {id:'clock-builder',name:'Clock explorer',about:'Choose the hour, minute and am or pm. Watch how the clock hands move.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'clock',a:450,b:0}},
 {id:'rectangle-builder',name:'Rectangle builder',about:'Change the width and height; count square units and trace the boundary.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'rectangle',a:5,b:3}},
 {id:'mirror-builder',name:'Mirror points',about:'Match perpendicular distances on opposite sides of a mirror line.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'mirror',a:3,b:2}},
 {id:'nets',name:'Fold a net',about:'Study how two triangular faces and three rectangles close a triangular prism.',group:'Measurement and geometry',tool:{kind:'net-model',shape:'triangular prism'}},
 {id:'counters',name:'Ten frames',about:'Tap the frames to add or remove counters. Making ten is easy to see.',group:'Numbers',tool:{kind:'counters',count:7,frame:20}},
 {id:'number-bond',name:'Number bond',about:'Drag counters between the two parts. The parts always make the whole.',group:'Numbers',tool:{kind:'bond',whole:10,parts:[6,4]}},
 {id:'number-line',name:'Number line',about:'Jump forwards and backwards to see adding, subtracting and skip counting.',group:'Numbers',tool:{kind:'line',min:0,max:20,start:0,jumps:[]}},
 {id:'equal-groups',name:'Equal groups',about:'Change the number of groups and how many are in each group.',group:'Multiplying and dividing',tool:{kind:'groups',groups:3,size:4}},
 {id:'array',name:'Array builder',about:'Build rows and columns, then turn the array to see why 3 × 4 = 4 × 3.',group:'Multiplying and dividing',tool:{kind:'array',rows:3,cols:4}},
 {id:'sharing',name:'Sharing board',about:'Share counters between plates, one at a time or all at once.',group:'Multiplying and dividing',tool:{kind:'share',total:12,people:3,given:[0,0,0],mode:'share'}},
 {id:'fraction-wall',name:'Fraction wall',about:'Shade the strips and see which fractions reach the same place.',group:'Fractions',tool:{kind:'fractions',denominators:[1,2,3,4,6,8,12],shaded:[0,1,0,2,0,0,0]}},
 {id:'bar-model',name:'Bar model',about:'A whole split into parts, and two bars compared.',group:'Fractions',tool:{kind:'bar',parts:[3,5],whole:8,labels:['part','part']}},
 {id:'place-value',name:'Place-value chart',about:'Build decimals from ones, tenths, hundredths and thousandths.',group:'Decimals and percentage',tool:{kind:'place',digits:[4,3,7],wholes:2}},
 {id:'hundred-grid',name:'Hundred grid',about:'Shade squares to see a fraction, a decimal and a percentage at once.',group:'Decimals and percentage',tool:{kind:'hundred',shaded:35}},
 {id:'percent-bar',name:'Percentage bar',about:'Take a percentage of an amount and watch the value change.',group:'Decimals and percentage',tool:{kind:'percent',whole:80,percent:25,unit:'$',step:10}},
 {id:'ratio-bars',name:'Ratio bars',about:'Compare quantities in units, then give each unit a value.',group:'Ratio and algebra',tool:{kind:'ratio',names:['Ali','Ben'],units:[3,2],unitValue:8,total:40}},
 {id:'balance',name:'Algebra balance',about:'Keep both sides equal while you take the same amount off each side.',group:'Ratio and algebra',tool:{kind:'balance',left:{x:2,n:3},right:{x:0,n:11},xValue:4}},
];
function LabCard({item}:{item:LabTool}){
 const [tool,setTool]=useState<Tool>(item.tool);
 return <section className="stage-card lab-tool" id={item.id}><div className="stage-title"><h2>{item.name}</h2><button className="link-btn" onClick={()=>setTool(item.tool)}>Reset</button></div><p className="stage-text">{item.about}</p><ToolView tool={tool} onChange={setTool}/></section>;
}
export function MathLab({tool}:{tool?:string}){
 const groups=[...new Set(TOOLS.map(t=>t.group))],picked=tool?TOOLS.filter(t=>t.id===tool):[];
 const shown=picked.length?picked:TOOLS;
 return <main className="teach math-lab"><a className="back-link" href="#/teach">← Back to Learn</a><p className="teach-eyebrow">Math Lab</p><h1>Play with the maths.</h1><p className="stage-text">These are the same tools the lessons use. Nothing is marked here: change them, break them and see what happens. Teachers can open a tool on a screen during a lesson.</p>
  {picked.length>0&&<p className="stage-text"><a className="link-btn" href="#/lab">Show every tool</a></p>}
  {picked.length===0&&<nav className="lab-jump" aria-label="Jump to a tool">{groups.map(g=><span key={g}><strong>{g}:</strong> {TOOLS.filter(t=>t.group===g).map(t=><a key={t.id} href={`#/lab/${t.id}`}>{t.name}</a>)}</span>)}</nav>}
  {shown.map(t=><LabCard key={t.id} item={t}/>)}
  <p className="teach-foot">Made with the help of AI. If a tool looks wrong, tell a teacher or parent.</p></main>;
}
