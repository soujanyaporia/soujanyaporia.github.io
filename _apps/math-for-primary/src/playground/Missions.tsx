import { useEffect,useRef,useState } from 'react';
import { useProgress } from '../state/ProgressContext';
import { CompletionParty,SoundToggle } from '../ui/Adventure';
import { Icon } from '../ui/Icon';
import { playSound } from '../lib/sound';
import { TopicPreview } from '../primary/TopicPreview';
import { stableId } from '../primary/session';
import { browserStorage } from '../primary/sessionStore';
import { ToolView } from '../teach/tools/Tools';
import { Scratchpad } from '../ui/Scratchpad';
import {SpeakButton} from '../ui/SpeakButton';
import type { Track } from '../school/curriculum';
import { MISSION_ROUNDS,missionById,missionsFor,type Mission } from './catalog';
import { makeMission } from './generate';
import { freshRun,readRun,writeRun,type MissionRun } from './session';
import '../teach/teach.css';
import './missions.css';
export function MissionLibrary(){
 const {progress,emit,scope}=useProgress();const level=progress.primary?.selection?.level??1,track=level<5?'standard':progress.primary?.selection?.track??'standard';
 function select(n:number,t:Track=track){emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});}
 return <main className="teach mission-library"><header className="mission-library-heading"><div><h1>Let’s build something.</h1><p>Choose a mission. Try four little puzzles.</p></div><label>My level<select value={level} onChange={e=>select(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Primary {n}</option>)}</select></label></header>
 {level>=5&&<div className="mission-tracks" role="group" aria-label="Curriculum path">{(['standard','foundation'] as const).map(t=><button key={t} aria-pressed={track===t} onClick={()=>select(level,t)}>{t==='standard'?'Standard':'Foundation'}</button>)}</div>}
 <div className="section-heading"><h2>Your P{level}{track==='foundation'?' Foundation':''} missions</h2></div><div className="mission-grid">{missionsFor(level,track).map((m,i)=>{const n=progress.nodes[`mission.${m.id}`],run=readRun(browserStorage(),scope,m),resuming=run&&!run.finishedAt;return <a key={m.id} className={`mission-card mission-tone-${i%3}`} href={`#/missions/${m.id}`}><span className="mission-card-visual"><TopicPreview kind={m.preview}/></span><span className="mission-card-body"><strong>{m.title}</strong><span>{m.about}</span><span className="mission-card-foot"><b>{resuming?`Continue · ${run.round+1}/4`:n?.completions?'Play again':'Let’s explore'}</b><span aria-label={`${n?.bestStars??0} of 3 stars`}>{n?.completions?'★'.repeat(n.bestStars)+'☆'.repeat(3-n.bestStars):'→'}</span></span></span></a>;})}</div><p className="mission-library-note">Take your time. There’s no timer. <a href="#/lab">Explore the tools →</a></p></main>;
}
function MissionGame({mission:m}:{mission:Mission}){
 const {progress,emit,scope}=useProgress(),sound=progress.settings.sound;
 const [run,setRun]=useState(()=>readRun(browserStorage(),scope,m)??freshRun(m)),[feedback,setFeedback]=useState(''),[saved,setSaved]=useState(true),heading=useRef<HTMLHeadingElement>(null);
 const [help,setHelp]=useState(run.hint);
 const p=makeMission(m,run.seed,run.round),stars=run.clean===MISSION_ROUNDS?3:2;
 const update=(next:MissionRun)=>{const r={...next,updatedAt:Date.now()};setRun(r);setSaved(writeRun(browserStorage(),scope,m,r));};
 useEffect(()=>{if(run.finishedAt&&(progress.nodes[`mission.${m.id}`]?.lastAt??0)<run.finishedAt)emit({id:stableId(`mission-complete|${run.id}`),at:run.finishedAt,kind:'session',stars,lessonId:`mission.${m.id}`});},[run.finishedAt,run.id,stars,m.id,emit]);
 function check(){if(run.checked)return;const ok=p.accepts(run.tool);playSound(ok?'correct':'retry',sound);setFeedback(ok?p.explanation:'Not quite yet. Adjust your model and try again.');update({...run,tries:run.tries+1,checked:ok,clean:run.clean+Number(ok&&run.tries===0&&!run.hint)});}
 function next(){if(!run.checked)return;if(run.round===MISSION_ROUNDS-1){update({...run,finishedAt:Date.now()});return;}const round=run.round+1;update({...run,round,tool:makeMission(m,run.seed,round).initial,checked:false,hint:false,tries:0});setFeedback('');setHelp(false);requestAnimationFrame(()=>heading.current?.focus());}
 return <main className="mission-player"><header className="mission-player-top"><a href="#/missions" className="mission-exit" aria-label="Save and leave this mission"><Icon name="close"/></a><div className="mission-title"><strong>{m.title}</strong>{!run.finishedAt&&<div className="mission-progress" role="progressbar" aria-label="Mission progress" aria-valuemin={0} aria-valuemax={MISSION_ROUNDS} aria-valuenow={run.round+Number(run.checked)} aria-valuetext={`Puzzle ${run.round+1} of ${MISSION_ROUNDS}`}><span style={{width:`${(run.round+Number(run.checked))/MISSION_ROUNDS*100}%`}}/></div>}</div>{!run.finishedAt&&<span className="mission-round">{run.round+1}/{MISSION_ROUNDS}</span>}<SoundToggle compact/></header>
 {run.finishedAt?<section className="mission-finished"><CompletionParty/><p className="teach-eyebrow">MISSION COMPLETE</p><h1>You made a discovery!</h1><p>You built and solved all {MISSION_ROUNDS} models in {m.title.toLowerCase()}.</p><div className="mission-stars" aria-label={`${stars} out of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div><p>{run.clean} of {MISSION_ROUNDS} solved on the first check without a clue. Take your time and keep exploring.</p><div className="mission-actions"><a className="btn btn-primary" href="#/missions">Choose another mission <Icon name="arrowRight"/></a><button className="btn btn-soft" onClick={()=>{update(freshRun(m));setFeedback('');setHelp(false);}}>Play with new numbers</button></div><a className="link-btn" href="#/progress">See my progress →</a></section>:<>
 <section className="mission-workspace"><div className="mission-question"><h1 ref={heading} tabIndex={-1}>{p.prompt}</h1><SpeakButton text={p.prompt} label="Listen to the mission"/></div><div className={`mission-tool ${run.checked?'is-solved':''}`}><ToolView tool={run.tool} onChange={run.checked?undefined:tool=>{update({...run,tool});setFeedback('');}}/></div>
 {!run.checked&&<div className="mission-help"><button className="link-btn" aria-expanded={help} aria-controls="mission-help-panel" onClick={()=>setHelp(v=>!v)}>Need help? <span aria-hidden="true">{help?'−':'+'}</span></button></div>}
 {help&&!run.checked&&<div id="mission-help-panel" className="mission-help-panel"><div className="mission-help-options">
 {!run.hint&&<button className="btn btn-soft" data-hint="true" onClick={()=>update({...run,hint:true,hints:run.hints+Number(!run.hint)})}><Icon name="bulb"/>Give me a clue</button>}
 <button className="link-btn" onClick={()=>{update({...run,tool:p.initial});setFeedback('');}}>Start the model again</button></div>
 {run.hint&&<p className="mission-clue" role="status">{p.hint}</p>}
 {m.level>=3&&<Scratchpad storageKey={`mission:${m.id}:${run.id}:${run.round}`}/>}</div>}
 <div className={`mission-feedback ${run.checked?'success':feedback?'retry':''}`} role="status" aria-live="polite">{run.checked?<><Icon name="check"/><span>{p.explanation}</span></>:feedback}</div>
 {!saved&&<p className="mission-save-warning" role="status">This browser could not save your place. Keep this page open to continue.</p>}
 </section><div className="mission-check">{run.checked?<button className="btn btn-primary" onClick={next}>{run.round===MISSION_ROUNDS-1?'Finish mission':'Next puzzle'}<Icon name="arrowRight"/></button>:<button className="btn btn-primary" data-no-tap="true" onClick={check}>Check<Icon name="check"/></button>}</div></>}

 </main>;
}
export function MissionScreen({id}:{id:string}){const m=missionById(id);return m?<MissionGame key={m.id} mission={m}/>:<main className="teach"><h1>Let’s find another mission.</h1><a className="btn" href="#/missions">See all missions</a></main>;}
