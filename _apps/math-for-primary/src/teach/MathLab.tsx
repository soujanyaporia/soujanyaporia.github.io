import { useState } from 'react';
import { AdventureBuddy } from '../ui/Adventure';
import { Icon } from '../ui/Icon';
import { Picture } from '../primary/Picture';
import { Scratchpad } from '../ui/Scratchpad';
import { ToolView } from './tools/Tools';
import type { Tool } from './model';
import './teach.css';
/** Free exploration: every manipulative from the lessons, with no questions attached. */
interface LabTool {id:string;name:string;about:string;group:string;tool:Tool}
export const LAB_TOOLS:LabTool[]=[
 {id:'take-away',name:'Take-away picnic',about:'Cross out counters, put them back and explain what remains.',group:'Numbers',tool:{kind:'take-away',start:12,removed:[]}},
 {id:'fraction-pieces',name:'Fraction pizza',about:'Choose equal slices and compare the selected part with the whole.',group:'Fractions',tool:{kind:'fraction-pieces',widths:[1,1,1,1,1,1,1,1],selected:[],shape:'circle'}},
 {id:'triangle-pair',name:'Triangle transformer',about:'Join a matching triangle to see why a triangle has half a rectangle’s area.',group:'Measurement and geometry',tool:{kind:'triangle-pair',base:8,height:4,joined:false}},
 {id:'volume-builder',name:'Cuboid studio',about:'Build a cuboid by changing its dimensions and counting cubes.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'solid',a:4,b:3,c:3}},
 {id:'ruler',name:'Ruler ranger',about:'Move the end of a length and read its measurement from zero.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'ruler',a:5,b:0}},
 {id:'angle-builder',name:'Angle builder',about:'Change the opening while keeping the vertex and first ray fixed.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'angle',a:60,b:0}},
 {id:'clock-builder',name:'Clock explorer',about:'Choose the hour, minute and am or pm. Watch how the clock hands move.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'clock',a:450,b:0}},
 {id:'rectangle-builder',name:'Rectangle builder',about:'Change the width and height; count square units and trace the boundary.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'rectangle',a:5,b:3}},
 {id:'mirror-builder',name:'Mirror points',about:'Match perpendicular distances on opposite sides of a mirror line.',group:'Measurement and geometry',tool:{kind:'geometry',mode:'mirror',a:3,b:2}},
 {id:'nets',name:'Nets & solids',about:'Compare four solids with their flat nets. Explore faces, edges and vertices.',group:'Measurement and geometry',tool:{kind:'net-model',shape:'triangular prism'}},
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
 {id:'percent-bar',name:'Percentage bar',about:'Take a percentage of an amount and watch the value change.',group:'Decimals and percentage',tool:{kind:'percent',whole:80,percent:25,unit:'$',step:5}},
 {id:'ratio-bars',name:'Ratio bars',about:'Change how many equal units each person has. Every unit here stands for eight.',group:'Ratio and algebra',tool:{kind:'ratio',names:['Ali','Ben'],units:[3,2],unitValue:8}},
 {id:'balance',name:'Algebra balance',about:'Keep both sides equal while you take the same amount off each side.',group:'Ratio and algebra',tool:{kind:'balance',left:{x:2,n:3},right:{x:0,n:11},xValue:4}},
];
function NetExplorer(){
 const [shape,setShape]=useState<Extract<Tool,{kind:'net-model'}>['shape']>('cube'),[flat,setFlat]=useState(true);
 const facts={'cube':[6,12,8],'cuboid':[6,12,8],'triangular prism':[5,9,6],'square pyramid':[5,8,5]}[shape];
 return <div className="net-explorer"><div className="lab-net-shapes" role="group" aria-label="Choose a solid">{(['cube','cuboid','triangular prism','square pyramid'] as const).map(s=><button key={s} aria-pressed={s===shape} onClick={()=>setShape(s)}>{s}</button>)}</div><div className="lab-net-toggle" role="group" aria-label="View the net or solid"><button aria-pressed={flat} onClick={()=>setFlat(true)}>Flat net</button><button aria-pressed={!flat} onClick={()=>setFlat(false)}>Closed solid</button></div><div className="lab-net-picture" key={`${shape}-${flat}`}>{flat?<ToolView tool={{kind:'net-model',shape}}/>:<Picture model={{type:'solid',shape}}/>}</div><p className="tool-sum" role="status">{facts[0]} faces · {facts[1]} edges · {facts[2]} vertices</p><p className="tool-tip">Imagine folding along shared edges. Which faces will meet?</p></div>;
}
function LabCard({item}:{item:LabTool}){
 const [tool,setTool]=useState<Tool>(item.tool),[reset,setReset]=useState(0);
 return <section className="stage-card lab-tool" id={item.id}><div className="stage-title"><h1>{item.name}</h1><button className="link-btn" onClick={()=>{setTool(item.tool);setReset(n=>n+1);}}>Reset tool</button></div><p className="stage-text">{item.about}</p>{item.id==='nets'?<NetExplorer key={reset}/>:<ToolView tool={tool} onChange={setTool}/>}<Scratchpad storageKey={`lab:${item.id}:${reset}`}/></section>;
}
export function MathLab({tool}:{tool?:string}){
 const [query,setQuery]=useState(''),groups=[...new Set(LAB_TOOLS.map(t=>t.group))],picked=LAB_TOOLS.find(t=>t.id===tool),visible=LAB_TOOLS.filter(t=>`${t.name} ${t.about} ${t.group}`.toLowerCase().includes(query.toLowerCase().trim()));
 return <main className="teach math-lab"><a className="back-link" href={picked?'#/lab':'#/teach'}>← {picked?'All tools':'Back to Learn'}</a>{picked?<><p className="teach-eyebrow">MATH LAB · {picked.group.toUpperCase()}</p><LabCard key={picked.id} item={picked}/><a className="lab-mission-link" href="#/missions"><Icon name="puzzle"/><span>Ready for a mission? Put these tools to work.</span><Icon name="arrowRight"/></a></>:<><header className="lab-library-head"><div><p className="teach-eyebrow">A PLACE TO WONDER</p><h1>What will you<br/><em>discover today?</em></h1><p className="stage-text">{LAB_TOOLS.length} maths tools. No timer. No wrong turns. Tap, build and change one thing at a time.</p></div><AdventureBuddy/></header><a className="lab-mission-link" href="#/missions"><Icon name="puzzle"/><span><strong>Want something to solve?</strong> Try a hands-on mission for your level.</span><Icon name="arrowRight"/></a><label className="lab-search">Find a tool<input type="search" placeholder="Try fractions, clock or balance" value={query} onChange={e=>setQuery(e.target.value)}/></label>{tool&&!picked&&<p role="status">That tool is not here. Choose one below.</p>}<p className="lab-results" role="status">{visible.length} tools to explore</p>{groups.filter(g=>visible.some(t=>t.group===g)).map(g=><section className="lab-tool-group" key={g}><h2>{g}</h2><div className="lab-tool-grid">{visible.filter(t=>t.group===g).map((t,i)=><a className={`lab-tool-tile lab-tile-${i%3}`} key={t.id} href={`#/lab/${t.id}`}><span className="lab-tile-symbol" aria-hidden="true">{t.tool.kind==='geometry'?t.tool.mode==='clock'?'◷':t.tool.mode==='angle'?'∠':'◇':t.tool.kind==='fractions'||t.tool.kind==='fraction-pieces'?'½':t.tool.kind==='percent'||t.tool.kind==='hundred'?'%':t.tool.kind==='balance'?'x':t.tool.kind==='ratio'?':':t.tool.kind==='array'||t.tool.kind==='groups'?'×':'+'}</span><strong>{t.name}</strong><p>{t.about}</p><span className="lab-tile-open">Open tool <Icon name="arrowRight" size={18}/></span></a>)}</div></section>)}{!visible.length&&<section className="stage-card"><h2>No tools match yet.</h2><button className="teach-btn" onClick={()=>setQuery('')}>Show every tool</button></section>}</>}<p className="teach-foot">Explore with touch, a mouse or a keyboard. Made with AI help; check anything that looks wrong with a teacher or parent.</p></main>;
}
