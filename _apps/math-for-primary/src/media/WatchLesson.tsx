import {useState} from 'react';
import {lessonById} from '../teach/catalog';
import {SoundToggle} from '../ui/Adventure';
import {Icon} from '../ui/Icon';
import {WalkthroughControls} from './WalkthroughControls';
import {frameNarration} from './frames';
import {CinemaModel} from './CinemaModel';
import {CinemaCheck,quickCheck} from './CinemaCheck';
import '../teach/teach.css';
import './studio.css';
import './cinema.css';
import './watchFocus.css';
export function WatchLesson({id}:{id:string}){
 const lesson=lessonById(id),[at,setAt]=useState(0);
 if(!lesson)return <main className="teach"><h1>Let’s find a walkthrough.</h1><a className="btn" href="#/watch">Watch & learn</a></main>;
 const explanation=lesson.stages.find(s=>s.kind==='explain'&&s.frames?.length),worked=lesson.stages.find(s=>s.kind==='worked'),frames=explanation?.kind==='explain'?explanation.frames!:worked?.kind==='worked'?worked.steps:[],f=frames[at];
 if(!f)return <main className="teach"><h1>{lesson.title}</h1><a className="btn" href={`#/teach/${id}`}>Open lesson</a></main>;
 const title=explanation?.title??lesson.title,last=at===frames.length-1;
 return <main className={`maths-cinema watch-focused grade-${lesson.level}`}>
  <header className="cinema-header"><a href="#/watch" className="cinema-back" aria-label="Back to Watch and learn"><Icon name="back"/></a><div><h1>{title}</h1></div><SoundToggle compact/></header>
  <section className="cinema-film" aria-label="Animated maths explanation">
   <div className="cinema-scene-heading"><span className="cinema-kicker">{at===0?'LET’S LOOK':last?'PUT IT TOGETHER':'ONE STEP AT A TIME'}</span><span>Picture {at+1} of {frames.length}</span></div>
   <div className="cinema-stage"><CinemaModel tool={f.tool}/>{f.math&&<div className="cinema-equation" key={f.math}>{f.math}</div>}</div>
   <div className="cinema-coach"><p aria-live="polite">{f.text}</p></div>
   <div className="cinema-transport"><WalkthroughControls compact segments={frames.map(frame=>frameNarration(frame))} index={at} onFrame={setAt}/></div>
   <nav className="watch-picture-nav" aria-label="Picture steps">{at>0?<button className="teach-btn soft" onClick={()=>setAt(n=>n-1)}>← Back</button>:<span/>}{last?<a className="teach-btn" href={`#/teach/${id}`}>Let’s try it →</a>:<button className="teach-btn" onClick={()=>setAt(n=>n+1)}>Next picture →</button>}</nav>
  </section>
  {last&&quickCheck(f.tool)&&<section className="watch-check"><CinemaCheck key={id} tool={f.tool}/></section>}
  <details className="watch-help"><summary>Need help?</summary>
   {(f.caption||f.because)&&<p>{f.because??f.caption}</p>}
   <a className="link-btn" href={`#/teach/${id}`}>Work through it with pictures and practice →</a>
   <details className="cinema-transcript"><summary>See every picture</summary><ol>{frames.map((step,i)=><li key={i}><button type="button" className="watch-jump" aria-label={`Go to picture ${i+1}`} aria-current={i===at?'step':undefined} onClick={()=>setAt(i)}>{i+1}</button><span>{step.text}{step.math&&<b>{step.math}</b>}</span></li>)}</ol></details>
  </details>
 </main>;
}
