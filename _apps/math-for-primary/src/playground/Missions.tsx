import { useEffect,useRef,useState } from 'react';
import { useProgress } from '../state/ProgressContext';
import { AdventureBuddy,CompletionParty,SoundToggle } from '../ui/Adventure';
import { Icon } from '../ui/Icon';
import { playSound } from '../lib/sound';
import { TopicPreview } from '../primary/TopicPreview';
import { stableId } from '../primary/session';
import { browserStorage } from '../primary/sessionStore';
import { ToolView } from '../teach/tools/Tools';
import { Scratchpad } from '../ui/Scratchpad';
import {SpeakButton} from '../ui/SpeakButton';
import type { Track } from '../school/curriculum';
import { MISSIONS,MISSION_ROUNDS,missionById,missionsFor,type Mission } from './catalog';
import { makeMission } from './generate';
import { freshRun,readRun,writeRun,type MissionRun } from './session';
import '../teach/teach.css';
import './missions.css';
export function MissionLibrary(){
 const {progress,emit,scope}=useProgress();const level=progress.primary?.selection?.level??1,track=level<5?'standard':progress.primary?.selection?.track??'standard';
 function select(n:number,t:Track=track){emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});}
 return <main className="teach mission-library"><header className="mission-library-hero"><div><p className="teach-eyebrow">TOUCH · BUILD · DISCOVER</p><h1>Little missions.<br/><em>Big discoveries.</em></h1><p>Move the maths with your hands. Build a model, try an idea, and see why it works.</p><span className="mission-new">{MISSIONS.length} hands-on missions · fresh puzzles each time</span></div><AdventureBuddy happy/></header>
 <div className="primary-years" aria-label="Choose a mission level">{[1,2,3,4,5,6].map(n=><button key={n} aria-pressed={n===level} className={n===level?'selected':''} onClick={()=>select(n)}><small>PRIMARY</small><strong>{n}</strong><span>{['Discover','Explore','Build','Connect','Apply','Reason'][n-1]}</span></button>)}</div>
 {level>=5&&<div className="mission-tracks" role="group" aria-label="Curriculum path">{(['standard','foundation'] as const).map(t=><button key={t} aria-pressed={track===t} onClick={()=>select(level,t)}>{t==='standard'?'Standard Mathematics':'Foundation Mathematics'}</button>)}</div>}
 <div className="section-heading"><h2>Your P{level}{track==='foundation'?' Foundation':''} missions</h2><span>4 discoveries in every mission</span></div><div className="mission-grid">{missionsFor(level,track).map((m,i)=>{const n=progress.nodes[`mission.${m.id}`],run=readRun(browserStorage(),scope,m),resuming=run&&!run.finishedAt;return <a key={m.id} className={`mission-card mission-tone-${i%3}`} href={`#/missions/${m.id}`}><span className="mission-card-visual"><TopicPreview kind={m.preview}/><span className="mission-card-no">0{i+1}</span></span><span className="mission-card-body"><strong>{m.title}</strong><span>{m.about}</span><span className="mission-card-foot"><b>{resuming?`Continue · ${run.round+1}/4`:n?.completions?'Play again':'Let’s explore'}</b><span aria-label={`${n?.bestStars??0} of 3 stars`}>{n?.completions?'★'.repeat(n.bestStars)+'☆'.repeat(3-n.bestStars):'→'}</span></span></span></a>;})}</div><aside className="mission-footnote"><Icon name="bulb"/><p>There’s no timer. Use a clue, draw your thinking, or reset your model. Every tool works with touch, a mouse or a keyboard.</p><a href="#/lab">Explore tools freely →</a></aside></main>;
}
function MissionGame({mission:m}:{mission:Mission}){
 const {progress,emit,scope}=useProgress(),sound=progress.settings.sound;
 const [run,setRun]=useState(()=>readRun(browserStorage(),scope,m)??freshRun(m)),[feedback,setFeedback]=useState(''),[saved,setSaved]=useState(true),heading=useRef<HTMLHeadingElement>(null);
 const p=makeMission(m,run.seed,run.round),stars=run.clean===MISSION_ROUNDS?3:2;
 const update=(next:MissionRun)=>{const r={...next,updatedAt:Date.now()};setRun(r);setSaved(writeRun(browserStorage(),scope,m,r));};
 useEffect(()=>{if(run.finishedAt&&(progress.nodes[`mission.${m.id}`]?.lastAt??0)<run.finishedAt)emit({id:stableId(`mission-complete|${run.id}`),at:run.finishedAt,kind:'session',stars,lessonId:`mission.${m.id}`});},[run.finishedAt,run.id,stars,m.id,emit]);
 function check(){if(run.checked)return;const ok=p.accepts(run.tool);playSound(ok?'correct':'retry',sound);setFeedback(ok?p.explanation:'Not quite yet. Adjust your model and try again.');update({...run,tries:run.tries+1,checked:ok,clean:run.clean+Number(ok&&run.tries===0&&!run.hint)});}
 function next(){if(!run.checked)return;if(run.round===MISSION_ROUNDS-1){update({...run,finishedAt:Date.now()});return;}const round=run.round+1;update({...run,round,tool:makeMission(m,run.seed,round).initial,checked:false,hint:false,tries:0});setFeedback('');requestAnimationFrame(()=>heading.current?.focus());}
 return <main className="mission-player"><header className="mission-player-top"><a href="#/missions" className="mission-exit" aria-label="Save and leave this mission"><Icon name="close"/></a><div><small>P{m.level}{m.track==='foundation'?' FOUNDATION':''} · HANDS-ON MISSION</small><strong>{m.title}</strong></div><SoundToggle compact/></header>
 {run.finishedAt?<section className="mission-finished"><CompletionParty/><p className="teach-eyebrow">MISSION COMPLETE</p><h1>You made a discovery!</h1><p>You built and solved all {MISSION_ROUNDS} models in {m.title.toLowerCase()}.</p><div className="mission-stars" aria-label={`${stars} out of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div><p>{run.clean} of {MISSION_ROUNDS} solved on the first check without a clue. Take your time and keep exploring.</p><div className="mission-actions"><a className="btn btn-primary" href="#/missions">Choose another mission <Icon name="arrowRight"/></a><button className="btn btn-soft" onClick={()=>{update(freshRun(m));setFeedback('');}}>Play with new numbers</button></div><a className="link-btn" href="#/progress">See my progress →</a></section>:<>
 <div className="mission-trail" aria-label={`Discovery ${run.round+1} of ${MISSION_ROUNDS}`}>{Array.from({length:MISSION_ROUNDS},(_,i)=><span key={i} className={i<run.round?'done':i===run.round?'current':''}><b>{i<run.round?'✓':i+1}</b><small>Discovery {i+1}</small></span>)}</div>
 <section className="mission-workspace"><div className="mission-question"><span className="mission-buddy"><AdventureBuddy happy={run.checked}/></span><div><p className="teach-eyebrow">{run.checked?'YOU DID IT!':'BUILD IT. TRY IT. FIGURE IT OUT.'}</p><h1 ref={heading} tabIndex={-1}>{p.prompt}</h1><SpeakButton text={run.checked?p.explanation:p.prompt} label={run.checked?'Hear why it works':'Listen to the mission'}/></div></div><div className={`mission-tool ${run.checked?'is-solved':''}`}><ToolView tool={run.tool} onChange={run.checked?undefined:tool=>{update({...run,tool});setFeedback('');}}/></div>
 <div className="mission-help"><button className="btn btn-soft" disabled={run.checked} data-hint="true" onClick={()=>update({...run,hint:true,hints:run.hints+Number(!run.hint)})}><Icon name="bulb"/>Give me a clue</button><button className="link-btn" disabled={run.checked} onClick={()=>{update({...run,tool:p.initial});setFeedback('');}}>Reset model</button><span>{saved?'Your place saves on this device':'This browser could not save your place'}</span></div>
 {run.hint&&!run.checked&&<p className="mission-clue" role="status">{p.hint}</p>}
 <div className={`mission-feedback ${run.checked?'success':feedback?'retry':''}`} role="status" aria-live="polite">{run.checked?<><Icon name="check"/><span>{p.explanation}</span></>:feedback}</div>
 <div className="mission-check"><span>{run.checked?'Can you explain why your model works?':'Ready? Let’s check your model.'}</span>{run.checked?<button className="btn btn-primary" onClick={next}>{run.round===MISSION_ROUNDS-1?'Finish mission':'Next discovery'}<Icon name="arrowRight"/></button>:<button className="btn btn-primary" data-no-tap="true" onClick={check}>Check my model<Icon name="check"/></button>}</div></section><Scratchpad storageKey={`mission:${m.id}:${run.id}:${run.round}`}/></>}
 </main>;
}
export function MissionScreen({id}:{id:string}){const m=missionById(id);return m?<MissionGame key={m.id} mission={m}/>:<main className="teach"><h1>Let’s find another mission.</h1><a className="btn" href="#/missions">See all missions</a></main>;}
