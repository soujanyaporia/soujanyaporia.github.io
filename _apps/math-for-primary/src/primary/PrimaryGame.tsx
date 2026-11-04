import {StructuredResponseGivens} from './StructuredResponseGivens';
import {Batch6MiddleAnswer} from './paperImports/batch6MiddleAnswer';
import {GroupingBuilder} from './GroupingBuilder';
import {shownAnswer,showQuestionPicture} from './answerDisplay';
import {NumberSentence} from './NumberSentence';
import {numberEntry,answerInputMode,answerLimit} from './answerFormat';
import {lessonsForActivity} from '../teach/index';
import { SolutionStudio } from '../media/SolutionStudio';
import { Scratchpad } from '../ui/Scratchpad';
import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { activityById,type Activity,type GameKind } from './catalog';
import { useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { useSessions } from './SessionContext';
import { correctAnswer,type Question } from './generate';
import { Picture } from './Picture';
import {QuestionContext,spokenQuestion} from './QuestionContext';
import {fractionColumns} from './pictureLayout';
import {blankDraft,usableDraft,draftAnswer,draftReady} from './sessionDraft';
import { AdventureScene, PlayScenery } from './AdventureScene';
import { Icon } from '../ui/Icon';
import { AdventureBuddy, Celebration, CompletionParty, SoundToggle } from '../ui/Adventure';
import { playSound } from '../lib/sound';
import { SpeakButton } from '../ui/SpeakButton';
import { useDialogFocus } from '../ui/useDialogFocus';
import { advanceSession,answerEventId,completeEventId,encodeQuestionKey,isComplete,mergeSameSession,starsFor,type PrimarySession,type RepairItem,type ScoredResult,type SessionDraft } from './session';
import { checkSession,createSession,diagnose,questionFromKey } from './sessionQuestions';
import './primary.css';
/** A just-finished activity reopens on its result; after this it starts a fresh set. */
const RECENT=30*60000;
type Loaded={kind:'play';session:PrimarySession;questions:Question[];resumed:boolean}|{kind:'changed';session:PrimarySession;reason:'activity'|'generator'|'questions'}|{kind:'unavailable'};
const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
export function PrimaryGame({id}:{id:string}){const activity=activityById(id);return activity?<Loader activity={activity}/>:<main className="school-page"><h1>Let’s find another adventure.</h1><a href="#/">Choose a primary level →</a></main>;}
/** Restore the unfinished session exactly, explain honestly when it cannot be restored, or start a new one. */
function Loader({activity}:{activity:Activity}){
 const {get,save,remote}=useSessions();
 const [waited,setWaited]=useState(remote!=='checking'),[loaded,setLoaded]=useState<Loaded|null>(null),decided=useRef(false);
 useEffect(()=>{if(remote!=='checking'){setWaited(true);return;}const t=window.setTimeout(()=>setWaited(true),1500);return()=>clearTimeout(t);},[remote]);
 function start(options?:Parameters<typeof createSession>[1]){try{const fresh=createSession(activity,options);save(fresh.session);setLoaded({kind:'play',session:fresh.session,questions:fresh.questions,resumed:false});}catch{setLoaded({kind:'unavailable'});}}
 useEffect(()=>{
  if(decided.current||!waited)return;decided.current=true;const s=get(activity.id);
  if(s&&(!isComplete(s)||(s.completedAt!==null&&(activity.kind==='daily'||Date.now()-s.completedAt<RECENT)))){const c=checkSession(activity,s);
   if(c.ok){setLoaded({kind:'play',session:s,questions:c.questions,resumed:!isComplete(s)&&(s.cursor>0||s.draft!==null)});return;}
   if(!isComplete(s)){setLoaded({kind:'changed',session:s,reason:c.reason});return;}}
  start();
 });
 if(!loaded)return <main className={`primary-game grade-${activity.level}`} aria-busy="true"><div className="route-loading"><span className="route-spinner" aria-hidden="true"/><p role="status">Opening your activity…</p></div></main>;
 if(loaded.kind==='unavailable')return <main className="school-page"><h1>This question set could not open.</h1><p>Your earlier recorded answers are kept. Try a fresh set or choose another activity.</p><div className="completion-actions"><button className="check-answer" onClick={()=>start()}>Try a fresh set</button><a href={activity.kind==='daily'?'#/daily':'#/'}>Choose another activity →</a></div></main>;
 if(loaded.kind==='changed'){const n=loaded.session.results.length;return <main className={`primary-game grade-${activity.level}`}><section className="notice-card" role="alert"><p className="primary-eyebrow">{activity.title} · this activity has changed</p><h1>We can’t restore your unfinished questions exactly.</h1><p>{loaded.reason==='generator'?'The questions in this activity were updated after you started.':'The saved questions no longer match this version of the activity.'} {n?`Your ${plural(n,'recorded answer')} still count${n===1?'s':''} in your progress.`:''} Starting again gives you a new set of questions.</p><div className="completion-actions"><button className="check-answer" onClick={()=>start()}>Start the updated activity</button><a href={activity.kind==='daily'?'#/daily':'#/'}>{activity.kind==='daily'?'Back to daily practice':'Back to my adventures'}</a></div></section></main>;}
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
 const q=questions[position],result=session.results[position]??null,draft=!result&&session.draft?.position===position?usableDraft(q,session.draft):blankDraft(position,session.mode);
 const setDraft=(d:SessionDraft,typing=false)=>change(s=>s.results.length===d.position?{...s,draft:d}:s,typing);
 const working=!result&&(!!draft.value||draft.picks.length>0||draft.shaded.length>0||draft.tries>0||draft.hint);
 const repair=session.mode==='repair';
 return <main className={`primary-game adventure-play grade-${activity.level}${repair?' repair-mode':''}`}><PlayScenery/>
  <header className="play-header"><button onClick={()=>setPanel('leave')} aria-label="Leave activity">×</button><div>{repair&&<p>Revisit an idea</p>}<h1>{activity.title}</h1></div><span className="play-count">{position+1} / {session.count}</span><SoundToggle compact/></header>
  <div className="quest-track" role="progressbar" aria-label="Activity progress" aria-valuemin={0} aria-valuemax={session.count} aria-valuenow={session.results.length}>{Array.from({length:session.count},(_,i)=><span key={i} className={i<session.results.length&&i!==position?'done':i===position?'current':''}>{i<session.results.length&&i!==position?'✓':i===position?'✦':'·'}</span>)}</div>
  {banner&&<div className="resume-banner" role="status"><span><strong>Welcome back.</strong> You are on question {position+1} of {session.count}{session.draft?', with your working restored':''}.</span><span className="resume-actions"><button onClick={()=>setBanner(false)}>Keep going</button>{!repair&&<button onClick={()=>setPanel('fresh')}>Start fresh instead</button>}</span></div>}
  {repair&&!result&&draft.stage==='explain'?<RepairExplain activity={activity} item={session.repair[position]} onTry={()=>{setBanner(false);setDraft({...draft,stage:'try',at:Date.now()});}}/>:
   <Round key={q.key} kind={activityById(q.sourceActivityId??'')?.kind??activity.kind} q={q} level={activity.level} result={result} draft={draft} last={position===session.count-1} repair={repair} onDraft={setDraft} onScore={r=>{setBanner(false);score(position,r);}} onNext={()=>change(s=>advanceSession(s,position))}/>}
  <nav className="activity-teach-links" aria-label="Help with this idea">{lessonsForActivity(q.sourceActivityId??activity.id).slice(0,1).map(l=><a key={l.id} href={`#/teach/${l.id}`}>Learn this idea step by step →</a>)}</nav>{activity.level>=3&&<Scratchpad storageKey={`${session.id}:${position}`}/>}<footer className="game-source">Primary {activity.level} · Diagrams may not be to scale · Made with AI help: check anything that looks wrong with a teacher or parent. <span role="status">{result?'Answer recorded. ':working?'Your working is saved; the answer is recorded once it is checked. ':''}{syncStatus}</span></footer>
  {panel==='leave'&&<Panel title="Leave for now?" onClose={()=>setPanel(null)}><p>Your place is saved{user?.role==='student'?'':' on this device'}. When you come back you will return to question {position+1}.</p><button onClick={()=>setPanel(null)}>Keep playing</button><a href={activity.kind==='daily'?'#/daily':'#/'}>{activity.kind==='daily'?'Back to daily practice':'Back to adventures'}</a></Panel>}
  {panel==='fresh'&&<Panel title="Start a fresh set of questions?" onClose={()=>setPanel(null)}><p>{session.results.length?`The ${plural(session.results.length,'answer')} you recorded still count. `:''}The new set starts at question 1.</p><button onClick={()=>{setPanel(null);onFresh();}}>Start fresh</button><button onClick={()=>setPanel(null)}>Keep going</button></Panel>}
 </main>;
}
interface RoundProps {kind:GameKind;q:Question;level:number;result:ScoredResult|null;draft:SessionDraft;last:boolean;repair:boolean;onDraft:(d:SessionDraft,typing?:boolean)=>void;onScore:(r:ScoredResult)=>void;onNext:()=>void}
function Round({q,kind,level,result,draft,last,repair,onDraft,onScore,onNext}:RoundProps){
 const {progress}=useProgress();
 const done=!!result,status=result?(result.correct?'correct':'revealed'):draft.status;
 const current=draftAnswer(q,draft);
 const [watch,setWatch]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null),input=useRef<HTMLInputElement>(null),next=useRef<HTMLButtonElement>(null);
 const numeric=!q.choices&&!q.order&&!q.fractionBuilder&&!q.numberSentence&&!q.grouping&&!q.structuredResponse;
 useEffect(()=>{if(done)return;if(numeric&&level>2)input.current?.focus();else heading.current?.focus();},[]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(done)next.current?.focus();},[done]);
 const now=()=>Date.now();
 function check(value=current){if(done||!value.trim())return;const tries=draft.tries+1;
  if(correctAnswer(q,value)){playSound('correct',progress.settings.sound);onScore({answer:value,correct:true,firstTry:tries===1&&!draft.hint,hints:Number(draft.hint),tries,wrong:draft.wrong,at:now()});}
  else {playSound('retry',progress.settings.sound);onDraft({...draft,value:q.choices?value:draft.value,tries,wrong:[...draft.wrong,value.slice(0,60)].slice(-3),status:'wrong',at:now()});}}
 function reveal(){if(!done){setWatch(true);onScore({answer:current,correct:false,firstTry:false,hints:Number(draft.hint),tries:Math.max(1,draft.tries),wrong:draft.wrong,at:now()});}}
 const shown=done?result.answer:current,picks=done&&q.order?result.answer.split(','):draft.picks,shaded=done&&q.fractionBuilder?Array.from({length:Number(result.answer.split('/')[0])||0},(_,i)=>i):draft.shaded;
 return <div className={`round-layout round-${status}`}><section className="play-question"><div className="question-topline"><span>{repair?'NEW QUESTION · SAME IDEA':kind==='count'?'COUNT & DISCOVER':'YOUR NEXT CHALLENGE'}</span><SpeakButton text={spokenQuestion(q)}/></div><QuestionContext question={q} id="round-context"/><h2 ref={heading} tabIndex={-1} aria-describedby={q.context?.length?'round-context':undefined}>{q.prompt}</h2>{q.display&&<div className="math-display">{q.display}</div>}{q.picture&&showQuestionPicture(q)&&<AdventureScene model={q.picture} kind={kind} marked={draft.shaded} onMark={kind==='count'&&!done?i=>onDraft({...draft,shaded:draft.shaded.includes(i)?draft.shaded.filter(n=>n!==i):[...draft.shaded,i],at:now()}):undefined}/>}
  {q.fractionBuilder&&<div className="fraction-builder" style={{gridTemplateColumns:`repeat(${fractionColumns(q.fractionBuilder)},1fr)`}} role="group" aria-label="Equal parts to shade">{Array.from({length:q.fractionBuilder},(_,i)=><button key={i} disabled={done} aria-label={`Part ${i+1}`} aria-pressed={shaded.includes(i)} className={shaded.includes(i)?'shaded':''} onClick={()=>onDraft({...draft,shaded:draft.shaded.includes(i)?draft.shaded.filter(n=>n!==i):[...draft.shaded,i],status:'answering',at:now()})}>{shaded.includes(i)?'✓':''}</button>)}</div>}
  {q.order&&<><div className="order-slots" role="group" aria-label="Your order">{q.order.map((_,i)=><button disabled={done||!picks[i]} key={i} aria-label={picks[i]?`Remove ${picks[i]}`:`Empty place ${i+1}`} onClick={()=>onDraft({...draft,picks:draft.picks.filter((_,j)=>j!==i),status:'answering',at:now()})}>{picks[i]||'?'}</button>)}</div><div className="order-choices" role="group" aria-label="Numbers to place">{q.order.filter(n=>!picks.includes(n)).map(n=><button disabled={done} key={n} onClick={()=>onDraft({...draft,picks:[...draft.picks,n],status:'answering',at:now()})}>{n}</button>)}</div></>}
  {q.grouping&&<GroupingBuilder spec={q.grouping} value={status==='revealed'?q.answer:shown} disabled={done} onChange={value=>onDraft({...draft,value,status:'answering',at:now()})}/>}
  {q.structuredResponse&&<Batch6MiddleAnswer spec={q.structuredResponse} value={status==='revealed'?q.answer:shown} disabled={done} onChange={value=>onDraft({...draft,value,status:'answering',at:now()})}/>}
  {q.numberSentence&&<NumberSentence spec={q.numberSentence} value={shown} disabled={done} onChange={value=>onDraft({...draft,value,status:'answering',at:now()})}/>}
  {q.choices&&<div className="answer-choices" data-no-tap="true" role="group" aria-label="Answer choices">{q.choices.map(value=>{const picked=shown===value;return <button disabled={done} aria-pressed={picked} className={picked?(status==='wrong'?'picked wrong':'picked'):''} key={value} onClick={()=>check(value)}>{value}</button>;})}</div>}
  {numeric&&<form className={`adventure-answer-console ${level<=2&&numberEntry(q)?'with-keypad':''}`} onSubmit={e=>{e.preventDefault();check();}}><label className="answer-input"><span className="answer-prompt">What’s your answer?</span><span><input ref={input} aria-label="Your answer" value={shown} maxLength={answerLimit(q)} onChange={e=>onDraft({...draft,value:e.target.value,status:'answering',at:now()},true)} disabled={done} autoComplete="off" inputMode={answerInputMode(q)} placeholder={q.answerFormat==='number-words'?'Type the number in words':q.answerFormat==='pi'?'e.g. 42π':q.requireMixed?'e.g. 2 1/3':q.answer.includes('/')?'e.g. 3/4':numberEntry(q)?'Type a number':'Type your answer'}/>{q.unit&&<b>{q.unit}</b>}</span></label>{level<=2&&numberEntry(q)&&!done&&<div className="primary-keypad">{['1','2','3','4','5','6','7','8','9',q.answer.includes('/')?'/':'.','0','⌫'].map(key=><button type="button" key={key} aria-label={key==='⌫'?'Delete digit':key} onClick={()=>onDraft({...draft,value:key==='⌫'?draft.value.slice(0,-1):(draft.value+key).slice(0,40),status:'answering',at:now()},true)}>{key}</button>)}</div>}{!done&&<button className="check-answer" data-no-tap="true" disabled={!draft.value.trim()}>Check my answer →</button>}</form>}
  {!done&&(q.order||q.fractionBuilder||q.numberSentence||q.grouping||q.structuredResponse)&&<button className="check-answer" data-no-tap="true" disabled={!draftReady(q,draft)} onClick={()=>check()}>Check my answer →</button>}
  </section><aside className={`play-coach coach-${status}`}><span className="coach-label">YOUR ADVENTURE BUDDY</span><div className="coach-companion"><AdventureBuddy happy={status==='correct'}/>{status==='correct'&&<Celebration/>}</div><h3>{status==='correct'?'You found it!':status==='revealed'?'Let’s learn from this.':status==='wrong'?'Try another way.':'You’ve got this, explorer!'}</h3><div aria-live="polite">{status==='wrong'&&<p>That answer doesn’t fit yet. Use the clue, check the units, and have another go.</p>}{done&&<><p className="solution-answer">{status==='correct'?'✓ ':''}{shownAnswer(q,status==='correct'?result!.answer:q.answer)} {q.unit}</p><p>{q.explanation}</p></>}</div>{draft.hint&&!done&&<p className="hint-box">{q.hint}</p>}{!done&&<div className="coach-actions"><button data-hint="true" disabled={draft.hint} onClick={()=>onDraft({...draft,hint:true,at:now()})}><Icon name="bulb" size={19}/>{draft.hint?'Clue opened':'Give me a clue'}</button><button onClick={reveal}>Show me how</button></div>}{done&&<button ref={next} className="check-answer next-answer" onClick={onNext}>{last?(repair?'Finish repair →':'See my stars →'):'Next question →'}</button>}<p className="coach-note">{done?'Understanding matters more than speed.':'Take your time. A little thinking goes a long way.'}</p><span className="coach-bottom-stars" aria-hidden="true">✦ · ✦ · ✦</span>{done&&<button className="solution-watch" aria-expanded={watch} onClick={()=>setWatch(!watch)}><Icon name="play" size={17}/>{watch?'Hide animated solution':'Watch my solution'}</button>}</aside>{watch&&done&&<SolutionStudio question={q}/>}</div>;
}
/** A targeted explanation of the original mistake, before a fresh question on the same idea. */
export function RepairExplain({activity,item,onTry}:{activity:Activity;item:RepairItem;onTry:()=>void}){
 const original=useMemo(()=>questionFromKey(activity,item.key),[activity,item.key]);const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[item.key]);
 if(!original)return <section className="repair-card"><h2>This earlier question has changed.</h2><p>Try the new question on the same idea.</p><button className="check-answer" onClick={onTry}>Try the new question →</button></section>;const first=item.wrong[0],note=first?diagnose(original,first):null,answer=shownAnswer(original,original.answer);
 return <section className="repair-card" aria-labelledby="repair-title"><div className="repair-question"><p className="primary-eyebrow">Look again at this question</p><QuestionContext question={original} id="repair-context"/><h2 id="repair-title" ref={heading} tabIndex={-1} aria-describedby={original.context?.length?'repair-context':undefined}>{original.prompt}</h2>{original.display&&<div className="math-display">{original.display}</div>}{original.picture&&<Picture model={original.picture}/>}<StructuredResponseGivens spec={original.structuredResponse} choices={original.choices}/></div>
  <div className="repair-explain"><dl className="repair-evidence">{first&&<><dt>Your first answer</dt><dd>{shownAnswer(original,first)} {original.unit}</dd></>}{!first&&item.revealed&&<><dt>What happened</dt><dd>The steps were shown before an answer fitted.</dd></>}{!first&&!item.revealed&&<><dt>What happened</dt><dd>It was solved after a clue or another try.</dd></>}<dt>Correct answer</dt><dd>{answer} {original.unit}</dd></dl>
  {note&&<p className="repair-note">{note}</p>}<h3>The relationship to use</h3><p>{original.hint}</p><h3>Worked steps</h3><p>{original.explanation}</p><button className="check-answer" onClick={onTry}>Try a new question on this idea →</button></div></section>;
}
function Complete({activity,session,questions,syncStatus,onFresh,onRepair}:{activity:Activity;session:PrimarySession;questions:Question[];syncStatus:string;onFresh:()=>void;onRepair:(items:RepairItem[],from:string)=>void}){
 const results=session.results,clean=results.filter(r=>r.firstTry).length,stars=session.stars??starsFor(results);
 const items:RepairItem[]=results.flatMap((r,i)=>r.firstTry?[]:[{key:questions[i].key,fingerprint:session.fingerprints[i]||'',wrong:r.wrong.map(w=>w.slice(0,60)).slice(-3),revealed:!r.correct}]).slice(0,20);
 return <main className={`game-complete grade-${activity.level}`}><CompletionParty/><div className="completion-orbit" role="img" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div><p className="primary-eyebrow">PRIMARY {activity.level} · {activity.track.toUpperCase()}</p><h1>Another discovery made.</h1><h2>{activity.title}</h2><p>{clean} of {results.length} solved first time without a clue.</p><p>{results.filter(r=>r.correct).length} solved before viewing the steps. Keep practising the ideas that felt new.</p>
  <div className="completion-actions"><a className="check-answer" href={activity.kind==='daily'?'#/daily':'#/'}>{activity.kind==='daily'?'Back to daily practice':'Back to my adventures'}</a>{items.length>0&&<button onClick={()=>onRepair(items,session.id)}>Repair {plural(items.length,'tricky question')}</button>}<button onClick={onFresh}>Play fresh questions</button></div>{items.length>0&&<p className="repair-hint">Repair explains what went wrong, then gives you a new question on the same idea.</p>}<AnswerReview questions={questions} results={results}/><p role="status">{syncStatus}</p></main>;
}
function RepairDone({activity,session,onFresh}:{activity:Activity;session:PrimarySession;onFresh:()=>void}){
 const solved=session.results.filter(r=>r.firstTry).length;
 return <main className={`game-complete grade-${activity.level}`}><CompletionParty/><div className="completion-orbit" aria-hidden="true">✦</div><p className="primary-eyebrow">REPAIR · {activity.title.toUpperCase()}</p><h1>Ideas revisited.</h1><p>{solved} of {plural(session.count,'new question')} solved first time without a clue.</p><p>{solved===session.count?'You used the same idea on new questions.':'Some ideas need more practice. Try a fresh set of questions when you are ready.'}</p><div className="completion-actions"><a className="check-answer" href={activity.kind==='daily'?'#/daily':'#/'}>{activity.kind==='daily'?'Back to daily practice':'Back to my adventures'}</a><button onClick={onFresh}>Play fresh questions</button></div></main>;
}

export function AnswerReview({questions,results}:{questions:Question[];results:ScoredResult[]}){
 const [at,setAt]=useState(0),q=questions[at],result=results[at];
 return <details className="activity-answer-review"><summary>Review my answers and worked steps</summary><div><label>Choose a question<select value={at} onChange={e=>setAt(Number(e.target.value))}>{questions.map((_,i)=><option key={i} value={i}>Question {i+1} · {results[i].firstTry?'Solved first time':results[i].correct?'Solved with help':'Steps shown'}</option>)}</select></label><QuestionContext question={q}/><h2>{q.prompt}</h2>{q.display&&<p className="math-display">{q.display}</p>}<StructuredResponseGivens spec={q.structuredResponse} choices={q.choices}/><p>Your answer: <strong>{result.answer?shownAnswer(q,result.answer):'Not answered'}</strong> {result.answer?q.unit:''}</p><p>{q.grouping||q.numberSentence||q.structuredResponse?'One correct answer: ':'Correct answer: '}<strong>{shownAnswer(q,q.answer)}</strong> {q.unit}</p><SolutionStudio key={q.key} question={q}/></div></details>;
}
