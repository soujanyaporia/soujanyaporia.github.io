import { useState } from 'react';
import {lessonPreview,matchesLesson,TOPIC_NAMES} from './learningUi';
import { useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { browserStorage } from '../primary/sessionStore';
import { activityById } from '../primary/catalog';
import type { Track } from '../school/curriculum';
import { lessonsFor } from './catalog';
import { WORLDS,type Lesson,type WorldId } from './model';
import { lessonState,readAttempts,reviewDue,reviewStages } from './progress';
import { learningRewards } from './rewards';
import './teach.css';
const kv=browserStorage();
const STATE_LABEL={new:'New',started:'In progress',learned:'Check completed',mastered:'Best check ★★★'};
export function RewardStrip(){const {progress}=useProgress(),r=learningRewards(progress);return <div className="reward-strip" aria-label="Your learning rewards"><span><b>{r.xp}</b> XP</span><span>Level {r.level.level} · {r.level.title}<i className="level-bar"><i style={{width:`${Math.round(r.level.progress*100)}%`}}/></i></span><span><b>{r.gems}</b> Math Gems</span><span><b>{r.streak}</b>day streak</span><span><b>{r.mastered}</b> three-star checks</span></div>;}
export function LearnIndex(){
 const {progress,emit,scope}=useProgress(),{classes}=useAccount(),chosen=progress.primary?.selection;
 const level=chosen?.level??classes[0]?.level??1,track:Track=level<5?'standard':chosen?.track??(classes[0]?.track==='foundation'?'foundation':'standard');
 const [query,setQuery]=useState(''),[topic,setTopic]=useState<WorldId|'all'>('all');
 const [,setTick]=useState(0),attempts=readAttempts(kv,scope),lessons=lessonsFor(level,track);
 const due=lessons.filter(l=>reviewDue(progress,l).due);
 const visible=lessons.filter(l=>(topic==='all'||l.world===topic)&&matchesLesson(l,query));
 const resume=lessons.filter(l=>{const a=attempts[l.id];return a&&a.revision===l.revision&&a.completedAt===null&&(a.stage>0||Object.keys(a.items).length>0);}).sort((a,b)=>attempts[b.id].updatedAt-attempts[a.id].updatedAt)[0];
 const select=(n:number,t:Track=track)=>{emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});setTick(x=>x+1);setTopic('all');setQuery('');};
 const resumeAttempt=resume?attempts[resume.id]:undefined;
 const resumeStages=resume&&resumeAttempt?(resumeAttempt.mode==='review'?reviewStages(resume):resumeAttempt.mode==='challenge'?resume.stages.filter(s=>s.kind==='mastery'):resume.stages):[];
 const worlds=[...new Set(lessons.map(l=>l.world))] as WorldId[];
 const card=(l:Lesson)=>{const saved=attempts[l.id]?.revision===l.revision?attempts[l.id]:undefined,inLesson=saved?.mode==='learn'&&saved.completedAt===null;const state=lessonState(progress,l,inLesson?saved:undefined),activity=activityById(l.activityId),r=reviewDue(progress,l);return <article key={l.id} className={`lesson-card state-${state}`}><div className="lesson-card-top"><span className="lesson-state">{STATE_LABEL[state]}</span><span className="lesson-minutes">about {l.minutes} min</span></div><h3>{l.title}</h3><p className="lesson-preview"><span>Start with</span>{lessonPreview(l)}</p><div className="lesson-actions"><a className="teach-btn" href={`#/teach/${l.id}`}>{state==='started'?'Continue learning':state==='new'?'Learn':'Learn again'}</a>{activity&&<a className="lesson-secondary" href={`#/activity/${activity.id}`}>Practise</a>}<a className="lesson-secondary" href={`#/teach/${l.id}/challenge`}>{saved?.mode==='challenge'&&saved.completedAt===null&&Object.keys(saved.items).length?'Continue challenge':'Challenge'}</a>{r.due&&<a className="lesson-secondary" href={`#/teach/${l.id}/review`}>Review due</a>}<a className="lesson-secondary" href={`#/guide/${l.id}`}>Adult guide</a></div></article>;};
 return <main className={`teach learn-index grade-${level}`}><header className="learn-head"><p className="teach-eyebrow">Learn a new idea</p><h1>{level<=2?'Let’s find out how maths works.':'Understand it, then master it.'}</h1><p className="stage-text">Watch an example, try the model, then solve it yourself.</p></header>
  <section className="primary-selector learn-levels" aria-label="Choose your primary level"><div className="primary-years">{[1,2,3,4,5,6].map(n=><button key={n} aria-pressed={level===n} className={level===n?'selected':''} onClick={()=>select(n)}><small>PRIMARY</small><strong>{n}</strong></button>)}</div>{level>=5&&<div className="path-choice" role="group" aria-label="Curriculum path">{(['standard','foundation'] as Track[]).map(t=><button key={t} aria-pressed={track===t} className={track===t?'selected':''} onClick={()=>select(level,t)}><strong>{t==='standard'?'Standard Mathematics':'Foundation Mathematics'}</strong></button>)}</div>}</section>
  {resume&&<section className="learn-resume" aria-label="Continue your lesson"><div><p className="teach-eyebrow">Your next small step</p><h2>{resume.title}</h2><p>Step {attempts[resume.id].stage+1} · {resumeStages[attempts[resume.id].stage]?.title}</p></div><a className="teach-btn" href={`#/teach/${resume.id}${attempts[resume.id].mode==='learn'?'':'/'+attempts[resume.id].mode}`}>Continue lesson →</a></section>}
  {due.length>0&&<section className="review-due"><h2>Ready to review</h2><div className="review-list">{due.map(l=><a key={l.id} href={`#/teach/${l.id}/review`}>{l.title}<small>P{l.level} · a few quick questions</small></a>)}</div></section>}
  <section className="lesson-browser" aria-label="Find a lesson"><div className="lesson-browser-head"><div><h2>Choose your next idea</h2><p>P{level}{level>=5?` · ${track==='foundation'?'Foundation':'Standard'}`:''} · Learn with pictures, then try it yourself.</p></div><label className="lesson-search">Find a lesson<input type="search" value={query} placeholder="Try fractions, time or shapes" onChange={e=>setQuery(e.target.value)}/></label></div>
   <div className="topic-filters" role="group" aria-label="Filter by topic"><button aria-pressed={topic==='all'} onClick={()=>setTopic('all')}>All topics <span>{lessons.length}</span></button>{worlds.map(w=><button key={w} aria-pressed={topic===w} onClick={()=>setTopic(w)}>{TOPIC_NAMES[w]} <span>{lessons.filter(l=>l.world===w).length}</span></button>)}</div>
   <p className="lesson-results" role="status">{visible.length} {visible.length===1?'lesson':'lessons'}{query.trim()?` matching “${query.trim()}”`:''}{topic!=='all'?` · ${TOPIC_NAMES[topic]}`:''}</p>
  </section>
  {worlds.filter(w=>visible.some(l=>l.world===w)).map(w=><section key={w} className="world"><div className="world-head"><p className="teach-eyebrow">{WORLDS[w].title}</p><h2>{TOPIC_NAMES[w]}</h2><p>{WORLDS[w].blurb}</p></div><div className="lesson-grid">{visible.filter(l=>l.world===w).map(card)}</div></section>)}
  {lessons.length>0&&!visible.length&&<section className="lesson-empty"><h2>No lessons match that search</h2><p>Try a shorter word or look through all the topics for P{level}.</p><button className="teach-btn soft" onClick={()=>{setQuery('');setTopic('all');}}>Show all P{level} lessons</button></section>}
  {!lessons.length&&<section className="stage-card"><h2>Learn lessons for P{level}{level>=5?` ${track==='foundation'?'Foundation':'Standard'}`:''} are on their way</h2><p className="stage-text">The first full lessons cover other levels. P{level} has practice activities for every mapped topic now.</p><a className="teach-btn" href="#/">Practise P{level} activities</a></section>}
  <details className="learning-rewards"><summary>Your learning rewards</summary><RewardStrip/></details>
  <section className="learn-more"><a className="lab-card" href="#/lab"><strong>Math Lab</strong><span>Explore counters, fraction strips, place value, balances and more, with no questions attached.</span></a><a className="lab-card" href="#/coverage"><strong>What is covered so far</strong><span>See which syllabus topics have Learn lessons, practice and mastery checks.</span></a></section>
  <p className="teach-foot">Made with the help of AI. Please learn with a teacher or parent nearby, and check anything that looks wrong.</p></main>;
}
