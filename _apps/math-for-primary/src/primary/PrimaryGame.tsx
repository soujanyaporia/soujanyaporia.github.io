import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { activityById,type Activity } from './catalog';
import { useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { useSessions } from './SessionContext';
import { correctAnswer,type Question } from './generate';
import { Picture } from './Picture';
import { SpeakButton } from '../ui/SpeakButton';
import { useDialogFocus } from '../ui/useDialogFocus';
import { answerEventId,completeEventId,encodeQuestionKey,isComplete,mergeSameSession,starsFor,type PrimarySession,type RepairItem,type ScoredResult,type SessionDraft,type SessionMode } from './session';
import { checkSession,createSession,diagnose,questionFromKey } from './sessionQuestions';
import './primary.css';
/** A just-finished activity reopens on its result; after this it starts a fresh set. */
const RECENT=30*60000;
type Loaded={kind:'play';session:PrimarySession;questions:Question[];resumed:boolean}|{kind:'changed';session:PrimarySession;reason:'activity'|'generator'|'questions'};
const blank=(position:number,mode:SessionMode):SessionDraft=>({position,value:'',picks:[],shaded:[],tries:0,wrong:[],hint:false,status:'answering',stage:mode==='repair'?'explain':'try',at:0});
const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
export function PrimaryGame({id}:{id:string}){const activity=activityById(id);return activity?<Loader activity={activity}/>:<main className="school-page"><h1>Let’s find another adventure.</h1><a href="#/">Choose a primary level →</a></main>;}
/** Restore the unfinished session exactly, explain honestly when it cannot be restored, or start a new one. */
function Loader({activity}:{activity:Activity}){
 const {get,save,remote}=useSessions();
 const [waited,setWaited]=useState(remote!=='checking'),[loaded,setLoaded]=useState<Loaded|null>(null),decided=useRef(false);
 useEffect(()=>{if(remote!=='checking'){setWaited(true);return;}const t=window.setTimeout(()=>setWaited(true),1500);return()=>clearTimeout(t);},[remote]);
 function start(options?:Parameters<typeof createSession>[1]){const fresh=createSession(activity,options);save(fresh.session);setLoaded({kind:'play',session:fresh.session,questions:fresh.questions,resumed:false});}
 useEffect(()=>{
  if(decided.current||!waited)return;decided.current=true;const s=get(activity.id);
  if(s&&(!isComplete(s)||(s.completedAt!==null&&Date.now()-s.completedAt<RECENT))){const c=checkSession(activity,s);
   if(c.ok){setLoaded({kind:'play',session:s,questions:c.questions,resumed:!isComplete(s)&&(s.cursor>0||s.draft!==null)});return;}
   if(!isComplete(s)){setLoaded({kind:'changed',session:s,reason:c.reason});return;}}
  start();
 });
 if(!loaded)return <main className={`primary-game grade-${activity.level}`} aria-busy="true"><div className="route-loading"><span className="route-spinner" aria-hidden="true"/><p role="status">Opening your activity…</p></div></main>;
 if(loaded.kind==='changed'){const n=loaded.session.results.length;return <main className={`primary-game grade-${activity.level}`}><section className="notice-card" role="alert"><p className="primary-eyebrow">{activity.title} · this activity has changed</p><h1>We can’t restore your unfinished questions exactly.</h1><p>{loaded.reason==='generator'?'The questions in this activity were updated after you started.':'The saved questions no longer match this version of the activity.'} {n?`Your ${plural(n,'recorded answer')} still count${n===1?'s':''} in your progress.`:''} Starting again gives you a new set of questions.</p><div className="completion-actions"><button className="check-answer" onClick={()=>start()}>Start the updated activity</button><a href="#/">Back to my adventures</a></div></section></main>;}
 return <Game key={loaded.session.id} activity={activity} initial={loaded.session} questions={loaded.questions} resumed={loaded.resumed} onFresh={()=>start()} onRepair={(repair,from)=>start({mode:'repair',repair,repairOf:from})}/>;
}
function Panel({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useDialogFocus(true,onClose);return <div className="stop-backdrop" onClick={onClose}><div ref={ref} className="stop-panel" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><strong>{title}</strong>{children}</div></div>;}
function Game({activity,initial,questions,resumed,onFresh,onRepair}:{activity:Activity;initial:PrimarySession;questions:Question[];resumed:boolean;onFresh:()=>void;onRepair:(items:RepairItem[],from:string)=>void}){
 const {user}=useAccount(),{emit,syncStatus}=useProgress(),{save,get}=useSessions();
 const [session,setSession]=useState(initial),ref=useRef(session);
 const [banner,setBanner]=useState(resumed),[panel,setPanel]=useState<null|'leave'|'fresh'>(null);
 const commit=(next:PrimarySession,draft=false)=>{const merged=save(next,draft);ref.current=merged;setSession(merged);};
 const change=(f:(s:PrimarySession)=>PrimarySession,draft=false)=>commit({...f(ref.current),updatedAt:Date.now()},draft);
 // Take in answers another tab or device recorded in this session, keeping this screen's own question
 // (saved history points past the last answer, but a pupil reviewing an explanation should stay on it).
 const external=get(activity.id);
 useEffect(()=>{const cur=ref.current;if(external&&external.id===cur.id&&external.results.length>cur.results.length){const merged=mergeSameSession(cur,external),next={...merged,cursor:Math.min(cur.cursor,merged.results.length)};ref.current=next;setSession(next);}},[external]);
 /** Record a final outcome once. Event IDs come from the session and position, so retries and other tabs cannot count it twice. */
 function score(position:number,result:ScoredResult){
  const latest=get(activity.id),base=latest&&latest.id===ref.current.id?mergeSameSession(ref.current,latest):ref.current;
  if(base.results.length!==position){ref.current=base;setSession(base);return;}
  const results=[...base.results,result],done=results.length>=base.count,stars=done&&base.mode==='practice'?starsFor(results):null;
  commit({...base,results,draft:null,cursor:position,updatedAt:result.at,completedAt:done?result.at:null,stars});
  emit({id:answerEventId(base.id,position),at:result.at,kind:'primary_answer',activityId:activity.id,questionKey:encodeQuestionKey(base,position,questions[position].key),answer:result.answer.slice(0,200),correct:result.correct,firstTry:result.firstTry,hints:result.hints,tries:result.tries,sessionId:base.id,position});
  if(stars!==null)emit({id:completeEventId(base.id),at:result.at,kind:'primary_complete',activityId:activity.id,stars,sessionId:base.id});
 }
 const position=session.cursor;
 if(position>=session.count)return session.mode==='repair'?<RepairDone activity={activity} session={session} onFresh={onFresh}/>:<Complete activity={activity} session={session} questions={questions} syncStatus={syncStatus} onFresh={onFresh} onRepair={onRepair}/>;
 const q=questions[position],result=session.results[position]??null,draft=!result&&session.draft?.position===position?session.draft:blank(position,session.mode);
 const setDraft=(d:SessionDraft,typing=false)=>change(s=>s.results.length===d.position?{...s,draft:d}:s,typing);
 const working=!result&&(!!draft.value||draft.picks.length>0||draft.shaded.length>0||draft.tries>0||draft.hint);
 const repair=session.mode==='repair';
 return <main className={`primary-game grade-${activity.level}${repair?' repair-mode':''}`}>
  <header className="play-header"><button onClick={()=>setPanel('leave')} aria-label="Leave activity">×</button><div><p>{repair?'Repair · ':''}P{activity.level} {activity.track==='foundation'?'Foundation':'Mathematics'} · {activity.strand}</p><h1>{activity.title}</h1></div><span>{position+1} / {session.count}</span></header>
  <div className="quest-track" role="progressbar" aria-label="Activity progress" aria-valuemin={0} aria-valuemax={session.count} aria-valuenow={session.results.length}>{Array.from({length:session.count},(_,i)=><span key={i} className={i<session.results.length&&i!==position?'done':i===position?'current':''}>{i<session.results.length&&i!==position?'✓':i===position?'✦':'·'}</span>)}</div>
  {banner&&<div className="resume-banner" role="status"><span><strong>Welcome back.</strong> You are on question {position+1} of {session.count}{session.draft?', with your working restored':''}.</span><span className="resume-actions"><button onClick={()=>setBanner(false)}>Keep going</button>{!repair&&<button onClick={()=>setPanel('fresh')}>Start fresh instead</button>}</span></div>}
  {repair&&!result&&draft.stage==='explain'?<RepairExplain activity={activity} item={session.repair[position]} onTry={()=>{setBanner(false);setDraft({...draft,stage:'try',at:Date.now()});}}/>:
   <Round key={q.key} q={q} level={activity.level} result={result} draft={draft} last={position===session.count-1} repair={repair} onDraft={setDraft} onScore={r=>{setBanner(false);score(position,r);}} onNext={()=>change(s=>({...s,cursor:Math.min(s.results.length,s.cursor+1)}))}/>}
  <footer className="game-source">Primary {activity.level} · Diagrams may not be to scale · Made with AI help: check anything that looks wrong with a teacher or parent. <span role="status">{result?'Answer recorded. ':working?'Your working is saved; the answer is recorded once it is checked. ':''}{syncStatus}</span></footer>
  {panel==='leave'&&<Panel title="Leave for now?" onClose={()=>setPanel(null)}><p>Your place is saved{user?.role==='student'?'':' on this device'}. When you come back you will return to question {position+1}.</p><button onClick={()=>setPanel(null)}>Keep playing</button><a href="#/">Back to adventures</a></Panel>}
  {panel==='fresh'&&<Panel title="Start a fresh set of questions?" onClose={()=>setPanel(null)}><p>{session.results.length?`The ${plural(session.results.length,'answer')} you recorded still count. `:''}The new set starts at question 1.</p><button onClick={()=>{setPanel(null);onFresh();}}>Start fresh</button><button onClick={()=>setPanel(null)}>Keep going</button></Panel>}
 </main>;
}
interface RoundProps {q:Question;level:number;result:ScoredResult|null;draft:SessionDraft;last:boolean;repair:boolean;onDraft:(d:SessionDraft,typing?:boolean)=>void;onScore:(r:ScoredResult)=>void;onNext:()=>void}
function Round({q,level,result,draft,last,repair,onDraft,onScore,onNext}:RoundProps){
 const done=!!result,status=result?(result.correct?'correct':'revealed'):draft.status;
 const current=q.order?draft.picks.join(','):q.fractionBuilder?`${draft.shaded.length}/${q.fractionBuilder}`:draft.value;
 const heading=useRef<HTMLHeadingElement>(null),input=useRef<HTMLInputElement>(null),next=useRef<HTMLButtonElement>(null),sent=useRef(false);
 const numeric=!q.choices&&!q.order&&!q.fractionBuilder;
 useEffect(()=>{if(done)return;if(numeric&&level>2)input.current?.focus();else heading.current?.focus();},[]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(done)next.current?.focus();},[done]);
 const now=()=>Date.now();
 function check(value=current){if(done||!value)return;const tries=draft.tries+1;
  if(correctAnswer(q,value))onScore({answer:value,correct:true,firstTry:tries===1&&!draft.hint,hints:Number(draft.hint),tries,wrong:draft.wrong,at:now()});
  else onDraft({...draft,value:q.choices?value:draft.value,tries,wrong:[...draft.wrong,value.slice(0,60)].slice(-3),status:'wrong',at:now()});}
 function reveal(){if(!done)onScore({answer:current,correct:false,firstTry:false,hints:Number(draft.hint),tries:Math.max(1,draft.tries),wrong:draft.wrong,at:now()});}
 const shown=done?result.answer:current,picks=done&&q.order?result.answer.split(','):draft.picks,shaded=done&&q.fractionBuilder?Array.from({length:Number(result.answer.split('/')[0])||0},(_,i)=>i):draft.shaded;
 return <div className="round-layout"><section className="play-question"><div className="question-topline"><span>{repair?'NEW QUESTION · SAME IDEA':'LOOK · THINK · TRY'}</span><SpeakButton text={`${q.prompt} ${q.display||''}`}/></div><h2 ref={heading} tabIndex={-1}>{q.prompt}</h2>{q.display&&<div className="math-display">{q.display}</div>}{q.picture&&<Picture model={q.picture}/>}
  {q.fractionBuilder&&<div className="fraction-builder" style={{gridTemplateColumns:`repeat(${Math.min(q.fractionBuilder,6)},1fr)`}} role="group" aria-label="Equal parts to shade">{Array.from({length:q.fractionBuilder},(_,i)=><button key={i} disabled={done} aria-label={`Part ${i+1}`} aria-pressed={shaded.includes(i)} className={shaded.includes(i)?'shaded':''} onClick={()=>onDraft({...draft,shaded:draft.shaded.includes(i)?draft.shaded.filter(n=>n!==i):[...draft.shaded,i],status:'answering',at:now()})}>{shaded.includes(i)?'✓':''}</button>)}</div>}
  {q.order&&<><div className="order-slots" role="group" aria-label="Your order">{q.order.map((_,i)=><button disabled={done||!picks[i]} key={i} aria-label={picks[i]?`Remove ${picks[i]}`:`Empty place ${i+1}`} onClick={()=>onDraft({...draft,picks:draft.picks.filter((_,j)=>j!==i),status:'answering',at:now()})}>{picks[i]||'?'}</button>)}</div><div className="order-choices" role="group" aria-label="Numbers to place">{q.order.filter(n=>!picks.includes(n)).map(n=><button disabled={done} key={n} onClick={()=>onDraft({...draft,picks:[...draft.picks,n],status:'answering',at:now()})}>{n}</button>)}</div></>}
  {q.choices&&<div className="answer-choices" role="group" aria-label="Answer choices">{q.choices.map(value=>{const picked=shown===value;return <button disabled={done} aria-pressed={picked} className={picked?(status==='wrong'?'picked wrong':'picked'):''} key={value} onClick={()=>check(value)}>{value}</button>;})}</div>}
  {numeric&&<form onSubmit={e=>{e.preventDefault();check();}}><label className="answer-input">Your answer<span><input ref={input} aria-label="Your answer" value={shown} maxLength={40} onChange={e=>onDraft({...draft,value:e.target.value,status:'answering',at:now()},true)} disabled={done} autoComplete="off" inputMode={q.answer.includes('/')?'text':'decimal'} placeholder={q.answer.includes('/')?'e.g. 3/4':'Type a number'}/>{q.unit&&<b>{q.unit}</b>}</span></label>{level<=2&&!done&&<div className="primary-keypad">{['1','2','3','4','5','6','7','8','9',q.answer.includes('/')?'/':'.','0','⌫'].map(key=><button type="button" key={key} aria-label={key==='⌫'?'Delete digit':key} onClick={()=>onDraft({...draft,value:key==='⌫'?draft.value.slice(0,-1):(draft.value+key).slice(0,40),status:'answering',at:now()},true)}>{key}</button>)}</div>}{!done&&<button className="check-answer" disabled={!draft.value.trim()}>Check my answer →</button>}</form>}
  {!done&&(q.order||q.fractionBuilder)&&<button className="check-answer" disabled={q.order?draft.picks.length!==q.order.length:!draft.shaded.length} onClick={()=>check()}>Check my answer →</button>}
  </section><aside className="play-coach"><div className="coach-star" aria-hidden="true">✦</div><h3>{status==='correct'?'You found it!':status==='revealed'?'Let’s learn from this.':status==='wrong'?'Try another way.':'Every attempt grows your thinking.'}</h3><div aria-live="polite">{status==='wrong'&&<p>That answer doesn’t fit yet. Use the clue, check the units, and have another go.</p>}{done&&<><p className="solution-answer">{status==='correct'?'✓ ':''}{q.order?q.answer.split(',').join(' → '):q.answer} {q.unit}</p><p>{q.explanation}</p></>}</div>{draft.hint&&!done&&<p className="hint-box">{q.hint}</p>}{!done&&<div className="coach-actions"><button disabled={draft.hint} onClick={()=>onDraft({...draft,hint:true,at:now()})}>{draft.hint?'Clue opened':'Give me a clue'}</button>{(draft.hint||draft.tries>=2)&&<button onClick={reveal}>Show the steps</button>}</div>}{done&&<button ref={next} className="check-answer next-answer" onClick={()=>{if(sent.current)return;sent.current=true;onNext();}}>{last?(repair?'Finish repair →':'See my stars →'):'Next question →'}</button>}<p className="coach-note">{done?'Understanding matters more than speed.':'No rush. You can use paper to show your working.'}</p></aside></div>;
}
/** A targeted explanation of the original mistake, before a fresh question on the same idea. */
function RepairExplain({activity,item,onTry}:{activity:Activity;item:RepairItem;onTry:()=>void}){
 const original=useMemo(()=>questionFromKey(activity,item.key),[activity,item.key]);const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[item.key]);
 if(!original)return null;const first=item.wrong[0],note=first?diagnose(original,first):null,answer=original.order?original.answer.split(',').join(' → '):original.answer;
 return <section className="repair-card" aria-labelledby="repair-title"><div className="repair-question"><p className="primary-eyebrow">Look again at this question</p><h2 id="repair-title" ref={heading} tabIndex={-1}>{original.prompt}</h2>{original.display&&<div className="math-display">{original.display}</div>}{original.picture&&<Picture model={original.picture}/>}</div>
  <div className="repair-explain"><dl className="repair-evidence">{first&&<><dt>Your first answer</dt><dd>{first} {original.unit}</dd></>}{!first&&item.revealed&&<><dt>What happened</dt><dd>The steps were shown before an answer fitted.</dd></>}{!first&&!item.revealed&&<><dt>What happened</dt><dd>It was solved after a clue or another try.</dd></>}<dt>Correct answer</dt><dd>{answer} {original.unit}</dd></dl>
  {note&&<p className="repair-note">{note}</p>}<h3>The relationship to use</h3><p>{original.hint}</p><h3>Worked steps</h3><p>{original.explanation}</p><button className="check-answer" onClick={onTry}>Try a new question on this idea →</button></div></section>;
}
function Complete({activity,session,questions,syncStatus,onFresh,onRepair}:{activity:Activity;session:PrimarySession;questions:Question[];syncStatus:string;onFresh:()=>void;onRepair:(items:RepairItem[],from:string)=>void}){
 const results=session.results,clean=results.filter(r=>r.firstTry).length,stars=session.stars??starsFor(results);
 const items:RepairItem[]=results.flatMap((r,i)=>r.firstTry?[]:[{key:questions[i].key,fingerprint:session.fingerprints[i]||'',wrong:r.wrong.map(w=>w.slice(0,60)).slice(-3),revealed:!r.correct}]).slice(0,20);
 return <main className={`game-complete grade-${activity.level}`}><div className="completion-orbit" role="img" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div><p className="primary-eyebrow">PRIMARY {activity.level} · {activity.track.toUpperCase()}</p><h1>Another discovery made.</h1><h2>{activity.title}</h2><p>{clean} of {results.length} solved first time without a clue.</p><p>{results.filter(r=>r.correct).length} solved before viewing the steps. Keep practising the ideas that felt new.</p>
  <div className="completion-actions"><a className="check-answer" href="#/">Back to my adventures</a>{items.length>0&&<button onClick={()=>onRepair(items,session.id)}>Repair {plural(items.length,'tricky question')}</button>}<button onClick={onFresh}>Play fresh questions</button></div>{items.length>0&&<p className="repair-hint">Repair explains what went wrong, then gives you a new question on the same idea.</p>}<p role="status">{syncStatus}</p></main>;
}
function RepairDone({activity,session,onFresh}:{activity:Activity;session:PrimarySession;onFresh:()=>void}){
 const solved=session.results.filter(r=>r.firstTry).length;
 return <main className={`game-complete grade-${activity.level}`}><div className="completion-orbit" aria-hidden="true">✦</div><p className="primary-eyebrow">REPAIR · {activity.title.toUpperCase()}</p><h1>Ideas revisited.</h1><p>{solved} of {plural(session.count,'new question')} solved first time without a clue.</p><p>{solved===session.count?'You used the same idea on new questions.':'Some ideas need more practice. Try a fresh set of questions when you are ready.'}</p><div className="completion-actions"><a className="check-answer" href="#/">Back to my adventures</a><button onClick={onFresh}>Play fresh questions</button></div></main>;
}
