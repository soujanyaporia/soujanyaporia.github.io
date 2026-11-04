import {lessonPractice} from './lessonPractice';
import { TopicPreview } from '../primary/TopicPreview';
import { useState } from 'react';
import {lessonPreview,matchesLesson,TOPIC_NAMES} from './learningUi';
import { useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { browserStorage } from '../primary/sessionStore';
import { activityById } from '../primary/catalog';
import type { Track } from '../school/curriculum';
import { lessonsForLevel,type LessonMeta } from './index';
import type { WorldId } from './model';
import { lessonState,readAttempts,reviewDue } from './progress';
import { learningRewards } from './rewards';
import './teach.css';
import './library.css';
const kv=browserStorage();
const STATE_LABEL={new:'New',started:'In progress',learned:'Check completed',mastered:'Best check ★★★'};
export function RewardStrip(){const {progress}=useProgress(),r=learningRewards(progress);return <div className="reward-strip" aria-label="Your learning rewards"><span><b>{r.xp}</b> XP</span><span>Level {r.level.level} · {r.level.title}<i className="level-bar"><i style={{width:`${Math.round(r.level.progress*100)}%`}}/></i></span><span><b>{r.gems}</b> Math Gems</span><span><b>{r.streak}</b>day streak</span><span><b>{r.mastered}</b> three-star checks</span></div>;}
export function LearnIndex(){
 const {progress,emit,scope}=useProgress(),{classes}=useAccount(),chosen=progress.primary?.selection;
 const level=chosen?.level??classes[0]?.level??1,track:Track=level<5?'standard':chosen?.track??(classes[0]?.track==='foundation'?'foundation':'standard');
 const [query,setQuery]=useState(''),[topic,setTopic]=useState<WorldId|'all'>('all'),[limit,setLimit]=useState(6);
 const [,setTick]=useState(0),attempts=readAttempts(kv,scope),lessons=lessonsForLevel(level,track);
 const due=lessons.filter(l=>reviewDue(progress,l).due);
 const visible=lessons.filter(l=>(topic==='all'||l.world===topic)&&matchesLesson(l,query));
 const resume=lessons.filter(l=>{const a=attempts[l.id];return a&&a.completedAt===null&&(a.stage>0||Object.keys(a.items).length>0);}).sort((a,b)=>attempts[b.id].updatedAt-attempts[a.id].updatedAt)[0];
 const select=(n:number,t:Track=track)=>{emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});setTick(x=>x+1);setTopic('all');setQuery('');setLimit(6);};
 const worlds=[...new Set(lessons.map(l=>l.world))] as WorldId[];
 const card=(l:LessonMeta)=>{
  const saved=attempts[l.id],inLesson=saved?.mode==='learn'&&saved.completedAt===null;
  const state=lessonState(progress,l,inLesson?saved:undefined),activity=activityById(l.activityId),r=reviewDue(progress,l);
  return <article key={l.id} className={`lesson-card state-${state}`}>
   <div className="lesson-card-top"><span className="lesson-state">{STATE_LABEL[state]}</span><span className="lesson-minutes">{l.minutes} min</span></div>
   <div className="library-card-main"><div className="lesson-card-picture" aria-hidden="true">{activity&&<TopicPreview kind={activity.kind}/>}</div><h3>{l.title}</h3></div>
   <div className="lesson-actions"><a className="teach-btn" href={`#/teach/${l.id}`}>{state==='started'?'Continue':state==='new'?'Let’s learn':'Learn again'}<span className="sr-only">: {l.title}</span></a>
    <details className="lesson-extra"><summary>More options<span className="sr-only"> for {l.title}</span></summary><div>
     <p>{lessonPreview(l)}</p>
     {activity&&<a className="lesson-secondary" href={`#/activity/${activity.id}`}>{lessonPractice(l)?.label}</a>}
     <a className="lesson-secondary" href={`#/watch/${l.id}`}>Watch the example</a>
     <a className="lesson-secondary" href={`#/teach/${l.id}/challenge`}>{saved?.mode==='challenge'&&saved.completedAt===null&&Object.keys(saved.items).length?'Continue challenge':'Take the challenge'}</a>
     {r.due&&<a className="lesson-secondary" href={`#/teach/${l.id}/review`}>Review due</a>}
     <a className="lesson-secondary" href={`#/guide/${l.id}`}>Adult guide</a>
    </div></details>
   </div>
  </article>;
 };
 return <main className={`teach learn-index learn-library grade-${level}`}>
  <header className="library-heading"><div><h1>Let’s learn.</h1><p>Choose one idea. We’ll work it out together.</p></div>
   <label className="library-level">My level<select value={level} onChange={e=>select(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Primary {n}</option>)}</select></label>
  </header>
  {level>=5&&<div className="library-path" role="group" aria-label="Curriculum path">{(['standard','foundation'] as Track[]).map(t=><button key={t} aria-pressed={track===t} onClick={()=>select(level,t)}>{t==='standard'?'Standard':'Foundation'}</button>)}</div>}
  {resume&&<section className="learn-resume" aria-label="Continue your lesson"><div><p className="teach-eyebrow">Pick up where you left off</p><h2>{resume.title}</h2></div><a className="teach-btn" href={`#/teach/${resume.id}${attempts[resume.id].mode==='learn'?'':'/'+attempts[resume.id].mode}`}>Continue →</a></section>}
  {due.length>0&&<details className="library-reviews"><summary>{due.length} {due.length===1?'idea':'ideas'} ready to practise again</summary><div className="review-list">{due.map(l=><a key={l.id} href={`#/teach/${l.id}/review`}>{l.title}<small>A few quick questions</small></a>)}</div></details>}
  <section className="library-browser" aria-label="Find a lesson">
   <div className="library-filters"><label>Topic<select value={topic} onChange={e=>{setTopic(e.target.value as WorldId|'all');setLimit(6);}}><option value="all">All topics</option>{worlds.map(w=><option key={w} value={w}>{TOPIC_NAMES[w]}</option>)}</select></label>
    <label className="lesson-search">Find a lesson<input type="search" value={query} placeholder="Try fractions, time or shapes" onChange={e=>{setQuery(e.target.value);setLimit(6);}}/></label></div>
   <p className="lesson-results" role="status">{visible.length===0?'No lessons found':`Showing ${Math.min(limit,visible.length)} of ${visible.length} lessons`}{query.trim()?` matching “${query.trim()}”`:''}{topic!=='all'?` · ${TOPIC_NAMES[topic]}`:''}</p>
   <div className="lesson-grid">{visible.slice(0,limit).map(card)}</div>
   {visible.length>limit&&<div className="library-more"><button className="teach-btn soft" onClick={()=>setLimit(n=>n+6)}>Show {Math.min(6,visible.length-limit)} more lessons</button></div>}
  </section>
  {lessons.length>0&&!visible.length&&<section className="lesson-empty"><h2>Let’s try another search</h2><p>Try a shorter word or choose another topic.</p><button className="teach-btn soft" onClick={()=>{setQuery('');setTopic('all');setLimit(6);}}>Show P{level} lessons</button></section>}
  {!lessons.length&&<section className="stage-card"><h2>No lessons in this level yet</h2><a className="teach-btn" href="#/">Explore practice activities</a></section>}
  <details className="library-other"><summary>More ways to explore</summary><nav aria-label="Other learning activities"><a href="#/watch">Watch &amp; learn</a><a href="#/missions">Hands-on missions</a><a href="#/lab">Math Lab</a><a href="#/coverage">Syllabus coverage</a></nav></details>
  <details className="learning-rewards"><summary>Your learning rewards</summary><RewardStrip/></details>
  <p className="teach-foot">Made with the help of AI. Ask a teacher or parent if something looks wrong.</p>
 </main>;
}
