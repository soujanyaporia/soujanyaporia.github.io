import {useState} from 'react';
import {SpeakButton} from '../ui/SpeakButton';
import {modelCaption} from './build/teachingNotes';
import {modelReading} from './modelReading';
import type {Stage,Tool} from './model';
import {ToolView} from './tools/Tools';

export function PictureKey({tool,initiallyOpen=false,onOpen}:{tool:Tool;initiallyOpen?:boolean;onOpen?:()=>void}){
 const reading=modelReading(tool);
 if(!reading)return null;
 return <details className="picture-key" open={initiallyOpen||undefined} onToggle={e=>{if(e.currentTarget.open)onOpen?.();}}>
  <summary>Read this picture <span>Words &amp; symbols</span></summary>
  <div className="picture-key-body"><SpeakButton label="Read the picture key aloud" text={reading.parts.map(([a,b])=>`${a}. ${b}`).join(' ')+` ${reading.look}`}/>
   <dl>{reading.parts.map(([name,meaning])=><div key={name}><dt>{name}</dt><dd>{meaning}</dd></div>)}</dl><p className="picture-look"><strong>Look closely:</strong> {reading.look}</p>
  </div>
 </details>;
}

/** A separate, explicitly labelled example. Opening it never moves or answers the current question. */
export function ExampleReplay({example,onReturn,label='Earlier worked example',note='Follow the idea here, then read your question’s own numbers carefully. Your question is still waiting above.',returnLabel='Return to my question'}:{example:Extract<Stage,{kind:'worked'}>;onReturn:()=>void;label?:string;note?:string;returnLabel?:string}){
 const [index,setIndex]=useState(0);
 const step=example.steps[index],tool=step.tool??example.tool;
 const answer=step.ask?`${step.ask.answer}${step.ask.unit?' '+step.ask.unit:''}`:undefined;
 return <section className="example-replay" aria-label={label}>
  <p className="support-eyebrow">{label}</p><h4>{example.problem}</h4>
  <p className="support-note">{note}</p>
  <div className="support-step-head"><strong>Step {index+1} of {example.steps.length}</strong><SpeakButton label="Read this example step aloud" text={[step.text,step.because,step.math,answer].filter(Boolean).join('. ')}/></div>
  {tool&&<figure className="teaching-figure"><ToolView tool={tool}/>{(step.caption??modelCaption(tool))&&<figcaption>{step.caption??modelCaption(tool)}</figcaption>}</figure>}
  <p>{step.text}</p>{step.because&&<p className="worked-because">{step.because}</p>}{step.math&&<p className="stage-math">{step.math}</p>}
  {answer&&<p className="example-answer"><strong>{step.ask!.prompt}</strong><br/>In this example: {answer}. {step.ask!.hint}</p>}
  <div className="support-paging"><button type="button" className="teach-btn soft" disabled={index===0} onClick={()=>setIndex(n=>n-1)}>← Previous</button>{index<example.steps.length-1?<button type="button" className="teach-btn" onClick={()=>setIndex(n=>n+1)}>Next example step →</button>:<button type="button" className="teach-btn" onClick={onReturn}>{returnLabel} →</button>}</div>
  {index<example.steps.length-1&&<button type="button" className="link-btn" onClick={onReturn}>{returnLabel}</button>}
 </section>;
}

/** Reflection support stays on the picture being discussed, which can differ from the worked question. */
export function reflectionReplay(stage:Extract<Stage,{kind:'reflect'}>):Extract<Stage,{kind:'worked'}>{
 return {kind:'worked',title:stage.title,problem:stage.text,steps:stage.explanation.map(text=>({text,tool:stage.tool,caption:stage.tool?'Keep referring to this original picture as you explain each step.':undefined}))};
}
