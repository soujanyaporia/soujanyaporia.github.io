import {useState,type CSSProperties} from 'react';
import type {Question} from '../primary/generate';
import {Picture} from '../primary/Picture';
import {WalkthroughControls} from './WalkthroughControls';
import {solutionFrames,solutionNarration} from './solution';
export function SolutionStudio({question:q}:{question:Question}){
 const [at,setAt]=useState(0),frames=solutionFrames(q),f=frames[at];
 return <section className="solution-studio narrated-stage" aria-label="Animated solution to this question"><span className="cinema-badge"><i/>YOUR QUESTION · WORKED STEP BY STEP</span><h3>{f.label}</h3><WalkthroughControls compact segments={frames.map(solutionNarration)} index={at} onFrame={setAt}/><div className="solution-stage" key={q.picture?.type==='parts'?q.key:at}>{f.counting?<div className="solution-counting" role="img" aria-label={`${f.counting.lit} of ${f.counting.total} fireflies counted`}>{Array.from({length:f.counting.total},(_,i)=><span key={i} style={{'--object-index':i,opacity:i<f.counting!.lit?1:.3} as CSSProperties}>{i<f.counting!.lit?i+1:'✦'}</span>)}</div>:f.model?<Picture model={f.model}/>:null}{f.equation&&<p className="solution-equation">{f.equation}</p>}{!f.model&&!f.counting&&!f.equation&&<p className="solution-text">{f.text}</p>}</div><p className="solution-step-caption" aria-live="polite">{f.text}</p><div className="solution-step-nav"><button className="btn btn-soft" disabled={!at} onClick={()=>setAt(n=>n-1)}>← Previous</button><span>Step {at+1} of {frames.length}</span>{at<frames.length-1?<button className="btn btn-primary" onClick={()=>setAt(n=>n+1)}>Next step →</button>:<button className="btn btn-soft" onClick={()=>setAt(0)}>Replay ↻</button>}</div></section>;
}
