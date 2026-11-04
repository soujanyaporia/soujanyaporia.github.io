import {useState} from 'react';
import {lessonById} from '../teach/catalog';
import {AdventureBuddy,SoundToggle} from '../ui/Adventure';
import {Icon} from '../ui/Icon';
import {WalkthroughControls} from './WalkthroughControls';
import {frameNarration} from './frames';
import {CinemaModel} from './CinemaModel';
import {CinemaCheck,quickCheck} from './CinemaCheck';
import '../teach/teach.css';
import './studio.css';
import './cinema.css';
export function WatchLesson({id}:{id:string}){
 const lesson=lessonById(id),[at,setAt]=useState(0);
 if(!lesson)return <main className="teach"><h1>Let’s find a walkthrough.</h1><a className="btn" href="#/watch">Watch & learn</a></main>;
 const explanation=lesson.stages.find(s=>s.kind==='explain'&&s.frames?.length),worked=lesson.stages.find(s=>s.kind==='worked'),frames=explanation?.kind==='explain'?explanation.frames!:worked?.kind==='worked'?worked.steps:[],f=frames[at];
 if(!f)return <main className="teach"><h1>{lesson.title}</h1><a className="btn" href={`#/teach/${id}`}>Open lesson</a></main>;
 const title=explanation?.title??lesson.title,last=at===frames.length-1;
 return <main className={`maths-cinema grade-${lesson.level}`}><header className="cinema-header"><a href="#/watch" className="cinema-back" aria-label="Back to Watch and learn"><Icon name="back"/></a><div><span>WATCH & DISCOVER · PRIMARY {lesson.level}</span><h1>{title}</h1></div><SoundToggle compact/></header>
 <div className="cinema-layout"><section className="cinema-film" aria-label="Animated maths explanation"><div className="cinema-scene-heading"><span className="cinema-kicker">{at===0?'LET’S TAKE A LOOK':last?'PUT IT TOGETHER':'FOLLOW THE IDEA'}</span><span>{at+1} <i>/</i> {frames.length}</span></div>
 <div className="cinema-stage"><CinemaModel tool={f.tool}/>{f.math&&<div className="cinema-equation" key={f.math}>{f.math}</div>}</div>
 <div className="cinema-coach"><AdventureBuddy happy={last}/><p aria-live="polite">{f.text}</p></div>
 <div className="cinema-transport"><WalkthroughControls segments={frames.map(frame=>frameNarration(frame))} index={at} onFrame={setAt}/><div className="cinema-step-buttons"><button aria-label="Previous picture" disabled={!at} onClick={()=>setAt(n=>n-1)}><Icon name="back"/></button><button aria-label={last?'Watch again':'Next picture'} onClick={()=>setAt(last?0:at+1)}><Icon name={last?'refresh':'arrowRight'}/></button></div></div>
 <div className="cinema-chapters" aria-label="Jump to a picture">{frames.map((_,i)=><button key={i} aria-label={`Picture ${i+1}`} aria-current={i===at?'step':undefined} onClick={()=>setAt(i)}><span>{i+1}</span>{i===0?'Look':i===frames.length-1?'Discover':'Explore'}</button>)}</div></section>
 <aside className="cinema-companion">{last&&quickCheck(f.tool)?<CinemaCheck key={id} tool={f.tool}/>:<div className={`cinema-notice${last?' cinema-notice-final':''}`}><span className="cinema-kicker">{last?'YOUR TURN TO WONDER':'KEEP AN EYE ON'}</span><p>{last?(f.wonder?.question??'Can you explain what the picture shows in your own words?'):(f.caption??'What changes in the picture? What stays the same?')}</p><span className="cinema-notice-dots">✦ · ✧</span></div>}
 <details className="cinema-insight"><summary>Why does this work?</summary><p>{f.because??lesson.objectives[0]}</p></details>
 <a className="cinema-next" href={`#/teach/${id}`}><span><small>READY TO HAVE A GO?</small><strong>Let’s try it together</strong></span><Icon name="arrowRight"/></a><details className="cinema-transcript"><summary>Read all the steps</summary><ol>{frames.map((step,i)=><li key={i}><strong>{i+1}</strong><span>{step.text}{step.math&&<b>{step.math}</b>}</span></li>)}</ol></details><p className="cinema-lesson-name">{lesson.title}{lesson.track==='foundation'?' · Foundation':''}</p></aside></div>
 <footer className="cinema-footer"><a href="#/watch">More maths stories</a><span>Explore at your pace. Watching doesn’t count as mastery.</span></footer></main>;
}
