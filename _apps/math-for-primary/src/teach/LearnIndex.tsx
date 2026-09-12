import { useState } from 'react';
import { useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { browserStorage } from '../primary/sessionStore';
import { activityById } from '../primary/catalog';
import type { Track } from '../school/curriculum';
import { LESSONS,lessonsFor } from './catalog';
import { WORLDS,type Lesson,type WorldId } from './model';
import { lessonState,readAttempts,reviewDue } from './progress';
import { learningRewards } from './rewards';
import './teach.css';
const kv=browserStorage();
const STATE_LABEL={new:'New',started:'In progress',learned:'Learned',mastered:'Mastered ★★★'};
export function RewardStrip(){const {progress}=useProgress(),r=learningRewards(progress);return <div className="reward-strip" aria-label="Your learning rewards"><span><b>{r.xp}</b> XP</span><span>Level {r.level.level} · {r.level.title}<i className="level-bar"><i style={{width:`${Math.round(r.level.progress*100)}%`}}/></i></span><span><b>{r.gems}</b> Math Gems</span><span><b>{r.streak}</b>day streak</span><span><b>{r.mastered}</b> mastered</span></div>;}
export function LearnIndex(){
 const {progress,emit,scope}=useProgress(),{user,classes}=useAccount(),chosen=progress.primary?.selection;
 const level=chosen?.level??classes[0]?.level??1,track:Track=level<5?'standard':chosen?.track??(classes[0]?.track==='foundation'?'foundation':'standard');
 const [,setTick]=useState(0),attempts=readAttempts(kv,scope),lessons=lessonsFor(level,track),staff=!!user&&user.role!=='student';
 const due=LESSONS.filter(l=>reviewDue(progress,l).due);
 const select=(n:number,t:Track=track)=>{emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});setTick(x=>x+1);};
 const worlds=[...new Set(lessons.map(l=>l.world))] as WorldId[];
 const card=(l:Lesson)=>{const state=lessonState(progress,l,attempts[l.id]),activity=activityById(l.activityId),r=reviewDue(progress,l);return <article key={l.id} className={`lesson-card state-${state}`}><div className="lesson-card-top"><span className="lesson-state">{STATE_LABEL[state]}</span><span className="lesson-minutes">about {l.minutes} min</span></div><h3>{l.title}</h3><p>{l.objectives[0]}</p><div className="lesson-actions"><a className="teach-btn" href={`#/teach/${l.id}`}>{state==='started'?'Continue learning':state==='new'?'Learn':'Learn again'}</a>{activity&&<a className="teach-btn soft" href={`#/activity/${activity.id}`}>Practise</a>}<a className="teach-btn soft" href={`#/teach/${l.id}/challenge`}>Challenge</a>{r.due&&<a className="teach-btn soft" href={`#/teach/${l.id}/review`}>Review due</a>}{staff&&<a className="link-btn" href={`#/guide/${l.id}`}>Teacher guide</a>}</div></article>;};
 return <main className={`teach learn-index grade-${level}`}><header className="learn-head"><p className="teach-eyebrow">Learn a new idea</p><h1>{level<=2?'Let’s find out how maths works.':'Understand it, then master it.'}</h1><p className="stage-text">Start with a clear question. Follow the pictures and explanations, try an example with help, then practise the idea yourself.</p></header>
  <RewardStrip/>
  {due.length>0&&<section className="review-due"><h2>Ready to review</h2><div className="review-list">{due.map(l=><a key={l.id} href={`#/teach/${l.id}/review`}>{l.title}<small>P{l.level} · a few quick questions</small></a>)}</div></section>}
  <section className="primary-selector learn-levels" aria-label="Choose your primary level"><div className="primary-years">{[1,2,3,4,5,6].map(n=><button key={n} aria-pressed={level===n} className={level===n?'selected':''} onClick={()=>select(n)}><small>PRIMARY</small><strong>{n}</strong></button>)}</div>{level>=5&&<div className="path-choice" role="group" aria-label="Curriculum path">{(['standard','foundation'] as Track[]).map(t=><button key={t} aria-pressed={track===t} className={track===t?'selected':''} onClick={()=>select(level,t)}><strong>{t==='standard'?'Standard Mathematics':'Foundation Mathematics'}</strong></button>)}</div>}</section>
  {worlds.map(w=><section key={w} className="world"><div className="world-head"><h2>{WORLDS[w].title}</h2><p>{WORLDS[w].blurb}</p></div><div className="lesson-grid">{lessons.filter(l=>l.world===w).map(card)}</div>{lessons.filter(l=>l.world===w&&l.grows?.length).slice(0,1).map(l=><p key={l.id} className="grows" aria-label="How this idea grows">{l.grows!.join('  →  ')}</p>)}</section>)}
  {!lessons.length&&<section className="stage-card"><h2>Learn lessons for P{level}{level>=5?` ${track==='foundation'?'Foundation':'Standard'}`:''} are on their way</h2><p className="stage-text">The first full lessons cover other levels. P{level} has practice activities for every mapped topic now.</p><a className="teach-btn" href="#/">Practise P{level} activities</a></section>}
  <section className="learn-more"><a className="lab-card" href="#/lab"><strong>Math Lab</strong><span>Explore counters, fraction strips, place value, balances and more, with no questions attached.</span></a><a className="lab-card" href="#/coverage"><strong>What is covered so far</strong><span>See which syllabus topics have Learn lessons, practice and mastery checks.</span></a></section>
  <p className="teach-foot">Made with the help of AI. Please learn with a teacher or parent nearby, and check anything that looks wrong.</p></main>;
}
