import { useEffect,useState,type CSSProperties } from 'react';
import { Icon } from '../ui/Icon';
import { GemIcon, FlameIcon } from '../ui/GameIcons';
import { activitiesFor,activityById,type Activity } from './catalog';
import { CURRICULUM_SKILLS,type Track } from '../school/curriculum';
import { useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { useSessions } from './SessionContext';
import { activityBand } from './progress';
import { resumePosition } from './session';
import { TopicPreview } from './TopicPreview';
import { lessonsForActivity } from '../teach/index';
import { learningRewards } from '../teach/rewards';
import './primary.css';
import '../media/studio.css';
import './home.css';
const INTRO_KEY='math-for-primary.intro-dismissed.v1';
const skillTitle=(a:Activity)=>CURRICULUM_SKILLS.find(s=>s.id===a.skillIds[0])?.title??a.title;
const pathOf=(a:Activity)=>`P${a.level}${a.track==='foundation'?' Foundation':''}`;
export function ago(at:number,now=Date.now()){const m=Math.round((now-at)/60000);if(m<1)return 'just now';if(m<60)return `${m} min ago`;const h=Math.round(m/60);if(h<24)return `${h} h ago`;const d=Math.round(h/24);return d<=1?'yesterday':`${d} days ago`;}
function flag(key:string,set=false){try{if(set)localStorage.setItem(key,'1');return localStorage.getItem(key)==='1'}catch{return set}}
const Stars=({n}:{n:number})=><span className="activity-stars" aria-label={`${n} of 3 stars`}>{'★'.repeat(n)}{'☆'.repeat(3-n)}</span>;
export function PrimaryHome(){
 const {user,classes}=useAccount(),{progress,emit,syncStatus}=useProgress(),{unfinished}=useSessions();const chosen=progress.primary?.selection;
 const level=chosen?.level??classes[0]?.level??1,track:Track=level<5?'standard':chosen?.track??(classes[0]?.track==='foundation'?'foundation':'standard');
 const [strand,setStrand]=useState('All topics'),[showAll,setShowAll]=useState(false);const all=activitiesFor(level,track),activities=all.filter(a=>strand==='All topics'||a.strand===strand);
 // The home page shows a handful of activities; the full set is one tap away, not a wall of cards.
 const FIRST=6,shown=showAll?activities:activities.slice(0,FIRST);
 const records=progress.primary?.activities||{},completed=all.filter(a=>records[a.id]?.sessions).length;
 const [intro,setIntro]=useState(()=>!user&&!progress.totals.attempted&&!flag(INTRO_KEY));
 useEffect(()=>{const t=window.setTimeout(()=>void import('./PrimaryGame'),1500);return()=>clearTimeout(t);},[]);
 function select(n:number,t:Track=track){setStrand('All topics');setShowAll(false);emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});}
 const open=unfinished.filter(s=>{const a=activityById(s.activityId);return a?.level===level&&a.track===track;}),resume=open[0],openBy=new Map(open.map(s=>[s.activityId,s]));
 const recent=Object.entries(records).filter(([id,r])=>activityById(id)&&r.lastAt).sort((a,b)=>b[1].lastAt-a[1].lastAt).slice(0,3);
 const resumeActivity=resume&&activityById(resume.activityId)!;
 const rewards=learningRewards(progress);
 return <main className={`primary-home home-focused grade-${level}`}>
 <header className="home-welcome">
  <div><p className="home-greeting">{user?.role==='student'?`Hello, ${user.name}!`:progress.profile.name?`Hello, ${progress.profile.name}!`:'Hello, explorer!'}</p><h1>Let’s do some maths.</h1></div>
  <div className="home-level-choice"><label>My level<select value={level} onChange={e=>select(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Primary {n}</option>)}</select></label>{level>=5&&<div className="home-track-choice" role="group" aria-label="Curriculum path">{(['standard','foundation'] as Track[]).map(t=><button key={t} aria-pressed={track===t} onClick={()=>select(level,t)}>{t==='standard'?'Standard':'Foundation'}</button>)}</div>}</div>
 </header>
 <nav className="home-start" aria-label="Choose how to learn">
  <a className="home-start-card home-start-daily" href="#/daily"><span className="home-start-icon"><Icon name="target" size={28}/></span><span className="home-start-copy"><strong>Daily practice</strong><span>Six questions. A little every day.</span></span><Icon name="arrowRight" size={22}/></a>
  <a className="home-start-card home-start-paper" href="#/papers"><span className="home-start-icon"><Icon name="pencil" size={28}/></span><span className="home-start-copy"><strong>Create a paper</strong><span>Choose topics. Get fresh questions.</span></span><Icon name="arrowRight" size={22}/></a>
  <a className="home-start-card home-start-learn" href="#/teach"><span className="home-start-icon"><Icon name="book" size={28}/></span><span className="home-start-copy"><strong>Learn</strong><span>One idea, step by step.</span></span><Icon name="arrowRight" size={22}/></a>
 </nav>
 <p className="home-reassurance">Your place is saved. Take your time.</p>
 {resumeActivity&&<a className="home-continue" href={`#/activity/${resumeActivity.id}`}><Icon name="play" size={22}/><span><strong>Continue where you left off</strong><span>{resumeActivity.title} · question {resumePosition(resume)+1} of {resume.count}</span></span><Icon name="arrowRight" size={20}/></a>}
 {recent.length>0&&<details className="home-recent"><summary>Recently practised</summary><div className="recent-strip"><ul>{recent.map(([id,r])=>{const a=activityById(id)!;return <li key={id}><a href={`#/activity/${id}`}><span className="recent-title">{a.title}</span><span className="recent-meta">{pathOf(a)} · {ago(r.lastAt)}</span><Stars n={r.stars}/></a></li>;})}</ul></div></details>}
 {intro&&<aside className="first-adventure"><details><summary><Icon name="bulb" size={19}/>New here? Here’s how to play <span aria-hidden="true">⌄</span></summary><ol><li><strong>Choose your primary level.</strong> Each level has its own activities.</li><li><strong>Pick an activity.</strong> Look, think and answer. Ask for a clue when you are stuck.</li><li><strong>Stop whenever you like.</strong> Your place is saved on this device.</li></ol><p>Made with AI help. Check anything that looks wrong with a teacher or parent.</p></details><button aria-label="Dismiss how to play" onClick={()=>{flag(INTRO_KEY,true);setIntro(false);}}>×</button></aside>}
 <div className="activity-heading" id="activities"><div><h2>Practise a topic</h2><p>Primary {level}{track==='foundation'?' Foundation':''} · {completed} of {all.length} topics explored</p></div><a href="#/curriculum">View syllabus map ↗</a></div>
 <nav className="strand-tabs" aria-label="Activity strand">{['All topics','Number & Algebra','Measurement & Geometry','Statistics'].map(s=><button key={s} aria-pressed={strand===s} className={strand===s?'selected':''} onClick={()=>setStrand(s)}>{s==='Number & Algebra'?'Numbers & algebra':s==='Measurement & Geometry'?'Measure & geometry':s==='Statistics'?'Data & graphs':s}</button>)}</nav>
 <div className="activity-grid" key={`${level}-${track}-${strand}`}>{shown.map((a,i)=>{const s=openBy.get(a.id),r=records[a.id];const lesson=lessonsForActivity(a.id)[0];return <div className="activity-card-wrap" key={a.id} style={{'--card-index':Math.min(i,8)} as CSSProperties}>{lesson&&<a className="card-learn" href={`#/teach/${lesson.id}`}>Learn it first</a>}<a href={`#/activity/${a.id}`} className={`activity-card strand-${a.strand==='Number & Algebra'?'number':a.strand==='Statistics'?'data':'shape'}`}><div className="activity-card-top"><span className="activity-thumb"><TopicPreview kind={a.kind}/></span><span className="activity-number">TOPIC {String(i+1).padStart(2,'0')}</span></div><h3>{a.title}</h3><p>{skillTitle(a)}</p><span className="card-play-icon" aria-hidden="true"><Icon name="arrowRight" size={19}/></span><div className="activity-card-foot">{s?<span className="card-progress">In progress · question {resumePosition(s)+1} of {s.count}</span>:<span>{activityBand(r)}</span>}<Stars n={r?.stars||0}/></div>{s&&<span className="card-meter" aria-hidden="true"><i style={{width:`${s.results.length/s.count*100}%`}}/></span>}{a.parameter==='review'&&<small>Prerequisite review</small>}</a></div>;})}</div>
 {activities.length>FIRST&&<div className="show-all-row"><button type="button" className="show-all" aria-expanded={showAll} onClick={()=>setShowAll(v=>!v)}>{showAll?'Show fewer activities':`Show all ${activities.length} activities`}</button></div>}
 <details className="home-explore"><summary>More ways to explore <span aria-hidden="true">+</span></summary><nav aria-label="More ways to explore"><a href="#/watch"><Icon name="play" size={20}/>Watch a walkthrough</a><a href="#/missions"><Icon name="puzzle" size={20}/>Play a mission</a><a href="#/lab"><Icon name="bulb" size={20}/>Try the Maths Lab</a><a href="#/progress"><Icon name="trophy" size={20}/>My progress</a></nav></details>
 <footer className="primary-footer"><a className="home-progress-summary" href="#/progress"><span><FlameIcon size={20}/>{rewards.streak} day streak</span><span><GemIcon size={21}/>{rewards.gems} gems</span><span>My progress →</span></a><details><summary>About this learning app</summary><p className="ai-note"><strong>Made with the help of AI.</strong> Questions, explanations and diagrams can contain mistakes. Use this app as a learning resource with a teacher or parent, and check anything that looks wrong.</p><p>Based on the MOE Primary Mathematics syllabus, updated October 2025. Activities practise selected objectives; this is not an official or MOE-endorsed resource or assessment.</p></details><div><a href="#/teach">Learn lessons</a><a href="#/lab">Math Lab</a><a href="#/coverage">Coverage map</a><a href="#/foundations">Original guided lessons</a><a href="#/progress">My progress</a><a href="#/about">About, privacy &amp; AI</a>{!user&&<a href="#/about/passport">Save or move guest progress</a>}<span>{syncStatus}</span></div></footer></main>;
}
