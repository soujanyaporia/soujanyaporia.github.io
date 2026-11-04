import {useEffect,useState,type FormEvent} from 'react';
import {useAccount} from '../school/AccountContext';
import type {Track} from '../school/curriculum';
import {useProgress} from '../state/ProgressContext';
import {ACTIVITIES} from './catalog';
import {DAILY_DAYS,DAILY_QUESTIONS,dailyId,dailyPlanDay,dailyTopics,firstDayForTopic,nextDailyDay} from './dailyPlan';
import {useSessions} from './SessionContext';
import {resumePosition} from './session';
import './daily.css';

export function DailyPractice(){
 const {classes}=useAccount(),{progress,emit}=useProgress();
 const chosen=progress.primary?.selection,level=chosen?.level??classes[0]?.level??1;
 const track:Track=level<5?'standard':chosen?.track??(classes[0]?.track==='foundation'?'foundation':'standard');
 function select(n:number,t:Track=track){emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});}
 return <main className="daily-page">
  <a className="daily-back" href="#/">← Home</a>
  <header className="daily-heading"><div><p className="daily-eyebrow">SINGAPORE PRIMARY MATHS</p><h1>A little maths.<br/><em>Every day.</em></h1><p>Six questions. One small step forward.</p></div>
   <div className="daily-level"><label>My level<select value={level} onChange={e=>select(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option value={n} key={n}>Primary {n}</option>)}</select></label>{level>=5&&<label>My path<select value={track} onChange={e=>select(level,e.target.value as Track)}><option value="standard">Standard</option><option value="foundation">Foundation</option></select></label>}</div>
  </header>
  <DailyPath key={`${level}-${track}`} level={level} track={track}/>
 </main>;
}

function DailyPath({level,track}:{level:number;track:Track}){
 const {progress}=useProgress(),{unfinished,get}=useSessions(),records=progress.primary?.activities??{};
 const recommended=nextDailyDay(level,track,records,unfinished);
 const [picked,setPicked]=useState<number|null>(null),[jump,setJump]=useState('');
 const day=picked??recommended,plan=dailyPlanDay(level,track,day,ACTIVITIES)!;
 const topics=dailyTopics(level,track,ACTIVITIES),session=get(plan.id),open=unfinished.find(s=>s.activityId===plan.id);
 const complete=!!records[plan.id]?.sessions||!!session&&(session.completedAt!==null||session.results.length>=session.count);
 const completed=Array.from({length:DAILY_DAYS},(_,i)=>dailyId(level,track,i+1)).filter(id=>records[id]?.sessions).length;
 const answered=session?.results.length??0,weekStart=(plan.week-1)*5+1;
 useEffect(()=>setJump(String(day)),[day]);
 const choose=(n:number)=>setPicked(Math.max(1,Math.min(DAILY_DAYS,n)));
 function jumpToDay(e:FormEvent){e.preventDefault();const n=Number(jump);if(Number.isInteger(n)&&n>=1&&n<=DAILY_DAYS)choose(n);}
 return <>
  <section className={`daily-feature ${complete?'daily-finished':''}`} aria-labelledby="daily-title">
   <div className="daily-feature-copy"><p className="daily-eyebrow">TERM {plan.term} · WEEK {(plan.week-1)%10+1}</p><span className="daily-day-label">Day {day}{plan.review&&<span>Mix &amp; remember</span>}</span><h2 id="daily-title">{plan.review?'Let’s bring it together':plan.topic.title}</h2>
    <p>{complete?'You finished this day. Revisit the idea or try fresh questions.':open?`Your place is saved. Continue with question ${resumePosition(open)+1}.`:plan.review?'A little of what you’ve practised so far.':'Look, think and try. A clue is always there if you need one.'}</p>
    <div className="daily-question-dots" aria-label={`${Math.min(answered,DAILY_QUESTIONS)} of ${DAILY_QUESTIONS} questions answered`}>{Array.from({length:DAILY_QUESTIONS},(_,i)=><span key={i} className={i<answered?'done':''} aria-hidden="true">{i<answered?'✓':i+1}</span>)}</div>
    <a className="daily-start" href={`#/activity/${plan.id}`}>{complete?'Open this day':open?'Continue my practice':'Start my practice'}<span aria-hidden="true">→</span></a>
    <small className="daily-reassurance">{complete?'One more step to be proud of.':'No timer. Take it at your pace.'}</small>
   </div>
   <div className="daily-art" aria-hidden="true"><span className="daily-art-spark">✦</span><div className="daily-art-book"><span className="daily-art-binding"/><span className="daily-art-label">MY MATHS</span><strong>{String(day).padStart(2,'0')}</strong><div className="daily-art-face"><i/><i/><b/></div><span className="daily-art-stars">✧ &nbsp; ✦ &nbsp; ✧</span></div><span className="daily-art-pencil">✎</span></div>
  </section>
  <section className="daily-week" aria-labelledby="daily-week-title"><div className="daily-week-heading"><div><p className="daily-eyebrow">YOUR PATH</p><h2 id="daily-week-title">One week at a time</h2></div><label className="daily-term">Choose term<select value={plan.term} onChange={e=>choose((Number(e.target.value)-1)*50+1)}>{[1,2,3,4].map(n=><option key={n} value={n}>Term {n} · days {(n-1)*50+1}–{n*50}</option>)}</select></label></div>
   <div className="daily-week-nav"><button type="button" aria-label="Previous week" disabled={plan.week===1} onClick={()=>choose(weekStart-5)}>←</button><span>Week {(plan.week-1)%10+1}<small>Days {weekStart}–{weekStart+4}</small></span><button type="button" aria-label="Next week" disabled={plan.week===40} onClick={()=>choose(weekStart+5)}>→</button></div>
   <div className="daily-days" role="group" aria-label={`Practice days ${weekStart} to ${weekStart+4}`}>{Array.from({length:5},(_,i)=>{
    const n=weekStart+i,id=dailyId(level,track,n),done=!!records[id]?.sessions,started=unfinished.some(s=>s.activityId===id);
    return <button type="button" key={n} className={`${n===day?'selected ':''}${done?'completed':''}`} aria-current={n===day?'step':undefined} aria-label={`Day ${n}, ${i===4?'review':'practice'}${done?', completed':started?', in progress':''}`} onClick={()=>choose(n)}><span className="daily-day-icon" aria-hidden="true">{done?'✓':i===4?'✦':started?'◒':String(i+1).padStart(2,'0')}</span><strong>Day {n}</strong><small>{i===4?'Review':'Practice'}</small><span className="daily-day-state">{done?'Done':started?'Started':n===day?'Ready':' '}</span></button>;
   })}</div>
   <p className="daily-week-note">Four days to practise. A fifth to revisit what you know.</p>
  </section>
  <details className="daily-choose"><summary>Choose a topic or jump to a day <span aria-hidden="true">+</span></summary><div className="daily-choose-fields"><label>Go to a topic<select value={plan.topic.code} onChange={e=>choose(firstDayForTopic(level,track,e.target.value,ACTIVITIES))}>{topics.map(t=><option key={t.code} value={t.code}>{t.title}</option>)}</select></label><form onSubmit={jumpToDay}><label htmlFor="daily-jump">Go to a day (1–200)</label><div><input id="daily-jump" type="number" inputMode="numeric" required min="1" max={DAILY_DAYS} step="1" value={jump} onChange={e=>setJump(e.target.value)}/><button type="submit">Go →</button></div></form></div><p>Explore freely. Skipping ahead does not mark earlier practice complete.</p></details>
  <aside className="daily-paper-link"><a href="#/papers"><span>Ready for a fresh challenge?</span><strong>Create a paper <span aria-hidden="true">→</span></strong></a></aside>
  <footer className="daily-progress"><span className="daily-progress-icon" aria-hidden="true">✦</span><div><strong>{completed} of {DAILY_DAYS} days completed</strong><p>Four terms of practice, with room to pause and return.</p></div><a href="#/progress">My progress →</a></footer>
 </>;
}
