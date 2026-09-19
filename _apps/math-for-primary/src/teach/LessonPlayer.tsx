import {answerFormat,lessonPhase,workedFeedback,workedSpeech} from './learningUi';
import {nextStageLabel,questionPurpose,stageFlow} from './flow';
import {modelCaption} from './build/teachingNotes';
import {goalState} from './tools/moves';
import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { useProgress } from '../state/ProgressContext';
import { SpeakButton } from '../ui/SpeakButton';
import { freshSeed } from '../engine/random';
import { newSessionId } from '../primary/session';
import { browserStorage } from '../primary/sessionStore';
import { activityById } from '../primary/catalog';
import { lessonById,nextLessonAfter } from './catalog';
import { ToolView } from './tools/Tools';
import {questionModel} from './tools/questionModel';
import { feedbackFor,isCorrect } from './gen';
import { FACET_LABEL,WORLDS,type Facet,type Item,type Lesson,type Stage,type Tool } from './model';
import { freshItemWork,mergeItemWork,type ItemWork,answerEventId,completeEventId,masteryStars,nodeId,questionKey,readAttempts,reviewDue,reviewNodeId,reviewStages,writeAttempt,type ItemRecord,type LessonAttempt,type LessonMode } from './progress';
import { learningRewards } from './rewards';
import './teach.css';
const kv=browserStorage();
const ITEM_STAGES=['readiness','practice','apply','reason','mastery'];
/** Items for a stage: fixed items, or generated from the attempt's seed so a resumed lesson shows the same questions. */
export function stageItems(stage:Stage,seed:number,index:number):Item[]{
 switch(stage.kind){
  case 'readiness':case 'reason':return stage.items;
  case 'practice':case 'apply':return Array.from({length:stage.count},(_,i)=>stage.gen(seed+index*1009,i));
  case 'mastery':return stage.gens.map((g,i)=>({...g.gen(seed+index*1009,i),facet:g.facet}));
  default:return [];
 }
}
function newAttempt(lesson:Lesson,mode:LessonMode):LessonAttempt{const now=Date.now();return {v:1,revision:lesson.revision,lessonId:lesson.id,attemptId:newSessionId(),seed:freshSeed(),mode,stage:0,items:{},done:{},readinessMissed:false,confidence:null,startedAt:now,updatedAt:now,completedAt:null,stars:null};}
export function LessonPlayer({id,mode='learn'}:{id:string;mode?:LessonMode}){
 const lesson=lessonById(id);
 if(!lesson)return <main className="school-page"><p className="school-eyebrow">Learn</p><h1>We could not find that lesson.</h1><a href="#/teach">See all lessons →</a></main>;
 return <Player key={`${id}:${mode}`} lesson={lesson} mode={mode}/>;
}
function Player({lesson,mode}:{lesson:Lesson;mode:LessonMode}){
 const {progress,emit,scope,syncStatus}=useProgress();
 const stages=useMemo<Stage[]>(()=>mode==='review'?reviewStages(lesson):mode==='challenge'?lesson.stages.filter(s=>s.kind==='mastery'):lesson.stages,[lesson,mode]);
 const [attempt,setAttempt]=useState<LessonAttempt>(()=>{const saved=readAttempts(kv,scope)[lesson.id];return saved&&saved.revision===lesson.revision&&saved.completedAt===null&&saved.mode===mode&&saved.stage<stages.length?saved:newAttempt(lesson,mode);});
 const [updatedContent]=useState(()=>{const saved=readAttempts(kv,scope)[lesson.id];return !!saved&&saved.revision!==lesson.revision&&saved.completedAt===null;});
 const ref=useRef(attempt),before=useRef(learningRewards(progress));
 const [banner,setBanner]=useState(()=>attempt.stage>0||Object.keys(attempt.items).length>0),[toast,setToast]=useState<string|null>(null),[leaving,setLeaving]=useState(false);
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(null),2800);return()=>clearTimeout(t);},[toast]);
 const patch=(f:(a:LessonAttempt)=>LessonAttempt)=>{const next={...f(ref.current),updatedAt:Date.now()};ref.current=next;setAttempt(next);writeAttempt(kv,scope,next);};
 const record=(stageIndex:number,kind:Stage['kind'],item:Item,r:ItemRecord)=>{
  const k=`${stageIndex}:${item.key}`;if(ref.current.items[k])return;
  patch(a=>({...a,items:{...a.items,[k]:r},readinessMissed:a.readinessMissed||(kind==='readiness'&&!r.firstTry)}));
  if(r.firstTry&&kind!=='readiness')setToast(kind==='mastery'?'+8 XP · Solved without help':'+8 XP · First try');
  if(kind==='readiness')return; // warm-up questions are not recorded as practice evidence
  emit({id:answerEventId(ref.current.attemptId,stageIndex,item.key),at:r.at,kind:'primary_answer',activityId:lesson.activityId,questionKey:questionKey(lesson,stageIndex,item.key),answer:r.answer.slice(0,200),correct:r.correct,firstTry:r.firstTry,hints:r.hints,tries:r.tries});
 };
 function complete(){
  const results:{facet:Facet;correct:boolean;firstTry:boolean}[]=[];
  stages.forEach((s,si)=>{if(s.kind==='mastery')for(const it of stageItems(s,ref.current.seed,si)){const rec=ref.current.items[`${si}:${it.key}`];results.push({facet:it.facet??'direct',correct:!!rec?.correct,firstTry:!!rec?.firstTry});}});
  const stars=masteryStars(results),at=Date.now();patch(a=>({...a,completedAt:at,stars}));
  emit({id:completeEventId(ref.current.attemptId),at,kind:'session',stars,lessonId:mode==='review'?reviewNodeId(lesson):nodeId(lesson)});
 }
 const index=attempt.stage,stage=stages[index],items=useMemo(()=>stage?stageItems(stage,attempt.seed,index):[],[stage,attempt.seed,index]);
 if(attempt.completedAt!==null||!stage)return <Completion lesson={lesson} mode={mode} attempt={attempt} stages={stages} gained={before.current} syncStatus={syncStatus} onAgain={()=>{before.current=learningRewards(progress);patch(()=>newAttempt(lesson,mode));setBanner(false);}}/>;
 const complete_=ITEM_STAGES.includes(stage.kind)?items.every(it=>attempt.items[`${index}:${it.key}`]):(['explore','notice','worked','connect','reflect'].includes(stage.kind)||stage.kind==='explain'&&!!stage.frames)?!!attempt.done[index]:true;
 const go=(to:number)=>{setBanner(false);if(to>=stages.length){complete();return;}patch(a=>({...a,stage:Math.max(0,to)}));window.scrollTo({top:0});};
 const assessed=stage.kind==='mastery',flow=stageFlow(stage,index,lesson);
 return <main className={`teach grade-${lesson.level}`}>
  <header className="teach-head"><button className="teach-close" onClick={()=>setLeaving(true)} aria-label="Leave lesson">×</button><div><p className="teach-eyebrow">{mode==='review'?'Review':mode==='challenge'?'Challenge':'Learn'} · P{lesson.level} · {WORLDS[lesson.world].title}</p><h1>{lesson.title}</h1></div><span className="teach-count"><small>STEP</small>{index+1} / {stages.length}</span></header>
  <div className="stage-track" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={index}>{stages.map((s,i)=><span key={i} title={s.title} className={i<index?'done':i===index?'now':''}/>)}</div>
  <ol className="lesson-journey" aria-label="Your learning journey">{(['Warm up','Understand','Try it','Check & remember'] as const).filter(label=>stages.some(s=>lessonPhase(s)===label)).map(label=><li key={label} aria-current={lessonPhase(stage)===label?'step':undefined}>{label}</li>)}</ol>
  {updatedContent&&index===0&&<p className="resume-banner">This lesson has new teaching steps. Start with the updated sequence; your earlier completed checks and rewards are kept.</p>}
  {banner&&<div className="resume-banner" role="status"><span><strong>Welcome back.</strong> You are on step {index+1} of {stages.length}: {stage.title}.</span><span className="resume-actions"><button onClick={()=>setBanner(false)}>Keep going</button><button onClick={()=>{patch(()=>newAttempt(lesson,mode));setBanner(false);}}>Start again</button></span></div>}
  <details className="lesson-purpose" key={`goal-${index}`}><summary>What will I learn?</summary><p>{lesson.mission?.goal??lesson.objectives[0]}</p>{lesson.mission&&<p className="lesson-route">{lesson.mission.connection}</p>}</details>
  {stage.kind!=='explain'&&stage.kind!=='hook'&&(!('text' in stage)||stage.text!==flow.transition||!!flow.carry)&&<aside className="lesson-bridge" aria-label="How this step connects"><p className="flow-label">{flow.label}</p><p>{flow.transition}</p>{flow.carry&&<details className="flow-recap"><summary>Remember the last example</summary><p>{flow.carry}</p></details>}</aside>}
  <StageView key={`${attempt.attemptId}:${index}`} lesson={lesson} stage={stage} index={index} items={items} attempt={attempt} onWork={(item,w)=>patch(a=>({...a,work:{...a.work,[`${index}:${item.key}`]:mergeItemWork(a.work?.[`${index}:${item.key}`],w)}}))} onRecord={(item,r)=>record(index,stage.kind,item,r)} onDone={()=>patch(a=>({...a,done:{...a.done,[index]:true}}))} onConfidence={c=>patch(a=>({...a,confidence:c}))} reward={setToast}/>
  <nav className="stage-nav" aria-label="Lesson steps">{index>0&&!assessed&&<button className="teach-btn soft" onClick={()=>go(index-1)}>← Back</button>}<span className="stage-need" aria-live="polite">{complete_?'':stage.kind==='reflect'?'Try an explanation, then compare it.':stage.kind==='explore'?'Try the model, then press Check.':ITEM_STAGES.includes(stage.kind)?'Answer each question to continue.':stage.kind==='worked'?'Reveal every step to continue.':stage.kind==='connect'?'Show every step to continue.':stage.kind==='explain'?'Follow the picture steps to continue.':'Choose an answer to continue.'}</span><button className="teach-btn" disabled={!complete_} onClick={()=>go(index+1)}>{nextStageLabel(stages[index+1])}</button></nav>
  <p className="teach-foot">Made with the help of AI: check anything that looks wrong with a teacher or parent. <span role="status">{syncStatus}</span></p>
  {toast&&<div className="reward-toast" role="status">{toast}</div>}
  {leaving&&<div className="stop-backdrop" onClick={()=>setLeaving(false)}><div className="stop-panel" role="dialog" aria-modal="true" aria-label="Leave the lesson?" onClick={e=>e.stopPropagation()}><strong>Leave the lesson?</strong><p>Your place is saved on this device. You will come back to step {index+1}.</p><button autoFocus onClick={()=>setLeaving(false)}>Keep learning</button><a href="#/teach">Back to Learn</a></div></div>}
 </main>;
}
function Card({title,text,children,read=true}:{title:string;text?:string;children?:ReactNode;read?:boolean}){return <section className="stage-card"><div className="stage-title"><h2>{title}</h2>{read&&<SpeakButton text={`${title}. ${text??''}`}/>}</div>{text&&<p className="stage-text">{text}</p>}{children}</section>;}
function StageView({lesson,stage,index,items,attempt,onRecord,onWork,onDone,onConfidence,reward}:{lesson:Lesson;stage:Stage;index:number;items:Item[];attempt:LessonAttempt;onRecord:(item:Item,r:ItemRecord)=>void;onWork:(item:Item,w:ItemWork)=>void;onDone:()=>void;onConfidence:(c:number)=>void;reward:(t:string)=>void}){
 const done=!!attempt.done[index];
 switch(stage.kind){
  case 'hook':return <Card title={stage.title} text={stage.text}>{stage.tool&&<figure className="teaching-figure"><ToolView tool={stage.tool}/>{(stage.caption===stage.text?modelCaption(stage.tool):stage.caption??modelCaption(stage.tool))&&<figcaption>{stage.caption===stage.text?modelCaption(stage.tool):stage.caption??modelCaption(stage.tool)}</figcaption>}</figure>}<p className="teacher-reassure">{stage.next??'On the next screen, we will stay with this picture and see how the idea works. You do not need to answer yet.'}</p></Card>;
  case 'explain':return <Explain stage={stage} done={done} onDone={onDone}/>;
  case 'discovery':return <Card title={stage.title} text={stage.text}><div className="discovery-moment" aria-hidden="true">✦</div>{stage.math&&<p className="stage-math">{stage.math}</p>}{stage.tool&&<figure className="teaching-figure"><ToolView tool={stage.tool}/>{(stage.caption===stage.text?modelCaption(stage.tool):stage.caption??modelCaption(stage.tool))&&<figcaption>{stage.caption===stage.text?modelCaption(stage.tool):stage.caption??modelCaption(stage.tool)}</figcaption>}</figure>}</Card>;
  case 'explore':return <Explore stage={stage} done={done} onDone={onDone} reward={reward}/>;
  case 'notice':return <Notice stage={stage} done={done} onDone={onDone} reward={reward}/>;
  case 'connect':return <Connect stage={stage} done={done} onDone={onDone}/>;
  case 'reflect':return <Reflect stage={stage} done={done} onDone={onDone}/>;
  case 'worked':return <Worked stage={stage} done={done} onDone={onDone}/>;
  default:return <ItemsStage lesson={lesson} stage={stage} index={index} items={items} attempt={attempt} onRecord={onRecord} onWork={onWork} onConfidence={onConfidence}/>;
 }
}
function Reflect({stage,done,onDone}:{stage:Extract<Stage,{kind:'reflect'}>;done:boolean;onDone:()=>void}){
 const [compared,setCompared]=useState(done),[draft,setDraft]=useState(''),[choice,setChoice]=useState('');
 return <Card title={stage.title} text={stage.text}>
  {stage.tool&&<ToolView tool={questionModel(stage.tool)}/>}
  <SpeakButton text={stage.prompts.join('. ')}/>
  <ol className="reflection-prompts">{stage.prompts.map(p=><li key={p}>{p}</li>)}</ol>
  <p className="reflection-invitation">Say it aloud, point to the picture, or draw on paper. You can also write below.</p>
  <label className="reflection-draft">My explanation (optional)<textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={3} maxLength={1200} placeholder="I think… because…"/></label>
  <p className="evidence-note">Your words stay on this screen. This is a chance to explain, not an automatically marked answer.</p>
  {!compared?<button className="teach-btn" onClick={()=>setCompared(true)}>I’ve tried explaining — compare ideas</button>:<div className="reflection-compare">
   <div className="stage-title"><h3>One way to explain it</h3><SpeakButton text={[...stage.explanation,stage.transfer].join('. ')}/></div><ol>{stage.explanation.map((p,i)=><li key={i}>{p}</li>)}</ol>
   <p><strong>Before you move on:</strong> {stage.transfer}</p>
   <p>Did your explanation connect the picture, the calculation and the reason?</p>
   <div className="reflection-options" role="group" aria-label="How did explaining feel?">{['I can explain the connection','I need to practise explaining'].map(c=><button className="teach-btn soft" aria-pressed={choice===c} key={c} onClick={()=>{setChoice(c);onDone();}}>{c}</button>)}</div>
   {choice&&<p role="status" className="stage-feedback">{choice==='I can explain the connection'?'Now try a different example and see whether your explanation still works.':'That is useful to notice. Go back to the worked example, or use a clue in the next question. A teacher or parent can listen to your explanation.'}</p>}
  </div>}
 </Card>;
}
function Explain({stage,done,onDone}:{stage:Extract<Stage,{kind:'explain'}>;done:boolean;onDone:()=>void}){
 const [why,setWhy]=useState(false);
 if(stage.frames)return <VisualExplanation stage={stage} done={done} onDone={onDone}/>;
 return <Card title={stage.title} text={stage.text}>{stage.math&&<p className="stage-math">{stage.math}</p>}{stage.tool&&<ToolView tool={stage.tool}/>}{stage.why&&<div className="why-box"><button className="teach-btn soft" aria-expanded={why} onClick={()=>setWhy(w=>!w)}>{why?'Hide':'Why does this work?'}</button>{why&&<div className="why-answer"><h3>{stage.why.question}</h3><p>{stage.why.answer}</p>{stage.why.tool&&<ToolView tool={stage.why.tool}/>}</div>}</div>}</Card>;
}
/** On a phone, the next-picture button can be a full screen below the model. */
function useRevealScroll<T extends HTMLElement=HTMLElement>(step:string|number){
 const picture=useRef<T|null>(null),previous=useRef(step);
 useEffect(()=>{
  if(previous.current!==step){
   previous.current=step;
   if(picture.current&&picture.current.getBoundingClientRect().top<0)picture.current.scrollIntoView({block:'start',behavior:'instant'});
  }
 },[step]);
 return picture;
}
function VisualExplanation({stage,done,onDone}:{stage:Extract<Stage,{kind:'explain'}>;done:boolean;onDone:()=>void}){
 const ways=[{label:stage.method?.label??'Our first method',intro:stage.method?.intro,frames:stage.frames!},...(stage.alternatives??[])];
 const [way,setWay]=useState(0),[positions,setPositions]=useState<Record<number,number>>({0:0});
 const at=positions[way]??0,frames=ways[way].frames,f=frames[at],last=at===frames.length-1;
 const picture=useRevealScroll(`${way}-${at}`),methodStart=useRevealScroll<HTMLDivElement>(way);
 const move=(n:number)=>{setPositions(v=>({...v,[way]:n}));if(way===0&&n===frames.length-1&&!done)onDone();};
 return <section className="visual-tutor stage-card"><p className="visual-tutor-label">{way===0?'WATCH THE EXAMPLE':'OPTIONAL · THE SAME EXAMPLE ANOTHER WAY'}</p><h2>{stage.title}</h2>
 {stage.example&&<div ref={methodStart} className="example-context"><strong>{way===0?'Our picture example':'Same question, different method'}</strong><p>{stage.example}</p></div>}
 {ways.length>1&&<div className="method-context"><h3>{ways[way].label}</h3>{ways[way].intro&&<p>{ways[way].intro}</p>}{way>0&&<button className="link-btn" onClick={()=>setWay(0)}>← Return to the first method</button>}</div>}
 <p className="picture-count">Step {at+1} of {frames.length}{at===0?' · Start here':last?' · Put it together':' · Keep following the same example'}</p>
 <figure ref={picture} className="visual-tutor-picture teaching-figure" key={`${way}-${at}`}>{f.tool&&<ToolView tool={f.tool}/>}{(f.caption??modelCaption(f.tool))&&<figcaption>{f.caption??modelCaption(f.tool)}</figcaption>}</figure>
 <div className="visual-tutor-say" aria-live="polite"><p>{f.text}</p><SpeakButton text={f.text}/></div>
 {f.math&&<p className="visual-tutor-math">{f.math}</p>}
 {f.because&&<aside className="teacher-note"><strong>Why this works</strong><p>{f.because}</p><SpeakButton text={f.because}/></aside>}
 {f.wonder&&<details className="wonder-card" key={`${way}-${at}-wonder`}><summary>Pause &amp; predict: {f.wonder.question}</summary><p>{f.wonder.answer}</p></details>}
 <nav className="visual-tutor-nav" aria-label="Picture steps"><button className="teach-btn soft" disabled={!at} aria-label="Previous picture" onClick={()=>move(at-1)}>← Previous picture</button>{last?<span className="method-finished" role="status">{way===0?'First explanation complete ✓':'Alternative complete ✓'}</span>:<button className="teach-btn" onClick={()=>move(at+1)}>Next picture →</button>}</nav>
 {done&&ways.length>1&&<details className="optional-methods"><summary>Optional: see another way</summary><p>These methods solve the same question. You can explore one, or continue to the next part of the lesson. You do not need to complete every method.</p><div className="method-choices">{ways.slice(1).map((w,i)=><button key={w.label} className="teach-btn soft" aria-pressed={way===i+1} onClick={()=>setWay(i+1)}>{w.label}</button>)}</div></details>}
 </section>;
}
function Explore({stage,done,onDone,reward}:{stage:Extract<Stage,{kind:'explore'}>;done:boolean;onDone:()=>void;reward:(t:string)=>void}){
 const [tool,setTool]=useState<Tool>(stage.tool),[message,setMessage]=useState<string|null>(null),[tries,setTries]=useState(0);
 const check=()=>{if(stage.goal(tool)){setMessage(stage.success);if(!done){onDone();reward('You built the target model');}}else{setTries(n=>n+1);setMessage(`Not yet. ${stage.goalHint}`);}};
 const restart=()=>{setTool(stage.tool);setMessage(null);};
 return <Card title={stage.title} text={stage.text}><ToolView tool={tool} onChange={t=>{setTool(t);setMessage(null);}}/>{done&&!message&&<p className="tool-tip">You completed this activity earlier. You can explore again or continue.</p>}<div className="stage-actions"><button className="teach-btn" onClick={check}>Check</button><button className="teach-btn soft" onClick={restart}>Start again</button>{!done&&tries>=2&&<button className="teach-btn soft" onClick={()=>{const target=goalState(stage.tool,stage.goal);if(target){setTool(target);setMessage(stage.success);onDone();}}}>Show me how</button>}</div>{message&&<p className={`stage-feedback${stage.goal(tool)?' good':''}`} role="status">{message}</p>}</Card>;
}
function Notice({stage,done,onDone,reward}:{stage:Extract<Stage,{kind:'notice'}>;done:boolean;onDone:()=>void;reward:(t:string)=>void}){
 const [picked,setPicked]=useState<number|null>(done?stage.options.findIndex(o=>o.correct):null);
 return <Card title={stage.title} text={stage.text}>{stage.tool&&<ToolView tool={stage.tool}/>}<div className="notice-options" role="group" aria-label="Choose one">{stage.options.map((o,i)=><button key={i} className={picked===i?(o.correct?'right':'wrong'):''} aria-pressed={picked===i} onClick={()=>{setPicked(i);if(o.correct&&!done){onDone();reward('That explanation fits the picture');}}}>{o.text}</button>)}</div>{picked!==null&&<p className={`stage-feedback${stage.options[picked].correct?' good':''}`} role="status">{stage.options[picked].reply}</p>}</Card>;
}
function Connect({stage,done,onDone}:{stage:Extract<Stage,{kind:'connect'}>;done:boolean;onDone:()=>void}){
 const [shown,setShown]=useState(done?stage.rows.length:1);
 return <Card title={stage.title} text={stage.text}><ol className="connect-rows">{stage.rows.slice(0,shown).map((r,i)=><li key={i} className="connect-row"><p>{r.text}</p>{r.math&&<p className="stage-math">{r.math}</p>}{r.tool&&<ToolView tool={r.tool}/>}{i<shown-1&&<span className="connect-arrow" aria-hidden="true">↓</span>}</li>)}</ol>{shown<stage.rows.length?<button className="teach-btn" onClick={()=>{const n=shown+1;setShown(n);if(n===stage.rows.length)onDone();}}>Show the next step ↓</button>:null}</Card>;
}
export function Worked({stage,done,onDone}:{stage:Extract<Stage,{kind:'worked'}>;done:boolean;onDone:()=>void}){
 const [shown,setShown]=useState(done?stage.steps.length:1),[answers,setAnswers]=useState<Record<number,string>>({}),[solved,setSolved]=useState<Record<number,boolean>>(()=>done?Object.fromEntries(stage.steps.map((_,i)=>[i,true])):{});
 const [errors,setErrors]=useState<Record<number,string>>({}),[clues,setClues]=useState<Record<number,boolean>>({}),[revealed,setRevealed]=useState<Record<number,boolean>>({});
 const i=shown-1,step=stage.steps[i],ask=step.ask,waiting=!!ask&&!solved[i],format=answerFormat(ask?.answer??'');
 const picture=useRevealScroll(shown);
 useEffect(()=>{if(shown===stage.steps.length&&!waiting&&!done)onDone();},[shown,stage.steps.length,waiting,done,onDone]);
 const check=(value=answers[i]??'')=>{if(!ask||!value.trim())return;setAnswers(a=>({...a,[i]:value}));if(isCorrect(ask,value)){setSolved(v=>({...v,[i]:true}));setErrors(v=>({...v,[i]:''}));}else setErrors(v=>({...v,[i]:workedFeedback(step,value)}));};
 const clue=ask?.hint??step.caption??modelCaption(step.tool??stage.tool)??step.text;
 return <Card title={stage.title} read={false}>
  <div className="stage-title"><p className="worked-problem">{stage.problem}</p><SpeakButton text={workedSpeech(stage.problem,step,waiting)}/></div>
  <p className="picture-count">Together · Step {shown} of {stage.steps.length}{waiting?' · Your turn':''}</p>
  {(step.tool??stage.tool)&&<figure ref={picture} className="teaching-figure"><ToolView tool={(step.tool??stage.tool)!}/>{(step.caption??modelCaption(step.tool??stage.tool))&&<figcaption>{step.caption??modelCaption(step.tool??stage.tool)}</figcaption>}</figure>}
  <div className="worked-current"><p>{step.text}</p>{step.because&&<p className="worked-because">{step.because}</p>}{step.math&&!waiting&&<p className="stage-math">{step.math}</p>}
   {ask&&(solved[i]?<p className="stage-feedback good" role="status">{revealed[i]?'Let’s use this answer:':'✓ Yes:'} {!revealed[i]&&answers[i]?.trim()&&answers[i].trim()!==ask.answer?`${answers[i].trim()} is the same value as ${ask.answer}`:ask.answer}{ask.unit?' '+ask.unit:''}. {revealed[i]?'Follow the next step to see how it fits.':'Now follow how it fits into the solution.'}</p>:<div className="worked-ask">
    <p><strong>{ask.prompt}</strong></p>
    {ask.choices?<div className="notice-options" role="group" aria-label="Your answer">{ask.choices.map(c=><button key={c} aria-pressed={answers[i]===c} className={answers[i]===c&&errors[i]?'wrong':''} onClick={()=>check(c)}>{c}</button>)}</div>:<form className="inline-answer" onSubmit={e=>{e.preventDefault();check();}}><input aria-label={ask.prompt} aria-invalid={!!errors[i]} aria-describedby={errors[i]?`worked-error-${i}`:undefined} inputMode={format.inputMode} autoComplete="off" maxLength={40} placeholder={format.placeholder} value={answers[i]??''} onChange={e=>{setAnswers(a=>({...a,[i]:e.target.value}));setErrors(v=>({...v,[i]:''}));}}/>{ask.unit&&<span>{ask.unit}</span>}<button className="teach-btn" disabled={!answers[i]?.trim()}>Check</button></form>}
    {!ask.choices&&format.hint&&<p className="answer-format">{format.hint}</p>}
    <div aria-live="polite">{errors[i]&&<p id={`worked-error-${i}`} className="stage-feedback">{errors[i]}</p>}{clues[i]&&<p className="worked-clue"><strong>A clue:</strong> {clue}</p>}</div>
    <div className="help-row"><button className="link-btn" onClick={()=>setClues(v=>({...v,[i]:true}))}>Give me a clue</button>{(clues[i]||errors[i])&&<button className="link-btn" onClick={()=>{setRevealed(v=>({...v,[i]:true}));setSolved(v=>({...v,[i]:true}));}}>Show this step’s answer</button>}</div>
   </div>)}
  </div>
  <div className="visual-tutor-nav"><button className="teach-btn soft" disabled={shown===1} onClick={()=>setShown(n=>n-1)}>← Previous step</button>{shown<stage.steps.length&&<button className="teach-btn" disabled={waiting} onClick={()=>setShown(n=>n+1)}>Next step →</button>}</div>
 </Card>;
}
function ItemsStage({lesson,stage,index,items,attempt,onRecord,onWork,onConfidence}:{lesson:Lesson;stage:Stage;index:number;items:Item[];attempt:LessonAttempt;onRecord:(item:Item,r:ItemRecord)=>void;onWork:(item:Item,w:ItemWork)=>void;onConfidence:(c:number)=>void}){
 const open=items.findIndex(it=>!attempt.items[`${index}:${it.key}`]),[view,setView]=useState(open<0?items.length-1:open);
 const questionStart=useRevealScroll<HTMLDivElement>(view);
 const item=items[Math.min(view,items.length-1)],guided=stage.kind==='readiness'||stage.kind==='reason'||(stage.kind==='practice'&&stage.mode==='guided')||stage.kind==='apply';
 const title='title' in stage?stage.title:'',text='text' in stage?stage.text:undefined,all=open<0;
 if(stage.kind==='mastery'&&attempt.confidence===null&&!Object.keys(attempt.items).some(k=>k.startsWith(`${index}:`)))return <Card title={title} text={text}><p className="stage-text"><strong>Before you start: how sure do you feel about this idea?</strong></p><div className="notice-options confidence" role="group" aria-label="How sure do you feel?">{['Not sure yet','Getting there','Very sure'].map((c,i)=><button key={c} onClick={()=>onConfidence(i)}>{c}</button>)}</div></Card>;
 return <Card title={title} text={text}><div className="item-dots" role="group" aria-label="Questions in this step">{items.map((it,i)=>{const r=attempt.items[`${index}:${it.key}`];return <button key={it.key} aria-label={`Question ${i+1}${r?', answered':''}`} aria-current={i===view?'step':undefined} className={`${i===view?'now ':''}${r?(r.firstTry?'clean':r.correct?'ok':'shown'):''}`} onClick={()=>setView(i)}>{i+1}</button>;})}</div><p className="item-count">Question {Math.min(view,items.length-1)+1} of {items.length}{view>0?' · Read what changes':''}</p>{questionPurpose(item,stage)&&<p className="question-purpose">{questionPurpose(item,stage)}</p>}
  <div ref={questionStart}><ItemCard key={`${index}:${item.key}`} item={item} guided={guided} level={lesson.level} record={attempt.items[`${index}:${item.key}`]} savedWork={attempt.work?.[`${index}:${item.key}`]} onWork={w=>onWork(item,w)} onDone={r=>onRecord(item,r)} onNext={view<items.length-1?()=>setView(v=>v+1):undefined}/></div>
  {stage.kind==='readiness'&&all&&attempt.readinessMissed&&<div className="booster"><h3>Quick booster</h3>{stage.booster.map((b,i)=><div key={i} className="booster-card"><p>{b.text}</p>{b.math&&<p className="stage-math">{b.math}</p>}{b.tool&&<ToolView tool={b.tool}/>}</div>)}</div>}
  {stage.kind==='readiness'&&all&&!attempt.readinessMissed&&<p className="stage-feedback good">You’re ready for the next step.</p>}</Card>;
}
/** One question with scaffolds. Help is always available; using it simply means the answer is not counted as first try. */
export function ItemCard({item,guided,level,record,savedWork,onWork,onDone,onNext,practiceOnly=false,nextLabel='Next question →'}:{item:Item;guided:boolean;level:number;record?:ItemRecord;savedWork?:ItemWork;onWork?:(w:ItemWork)=>void;onDone:(r:ItemRecord)=>void;onNext?:()=>void;practiceOnly?:boolean;nextLabel?:string}){
 const [work,setWork]=useState<ItemWork>(()=>savedWork??freshItemWork(guided||item.facet==='visual'||!!item.requiresModel));
 const workRef=useRef(work),[simple,setSimple]=useState(false),[finished,setFinished]=useState<ItemRecord|null>(record??null);
 const {value,tries,hints,teach,other,usedRecovery,showTool,wrong}=work;
 // Persist synchronously with the action, before another question or page can unmount this card.
 const update=<K extends keyof ItemWork,>(key:K,v:ItemWork[K]|((old:ItemWork[K])=>ItemWork[K]))=>{
  const next=mergeItemWork(workRef.current,{...workRef.current,[key]:typeof v==='function'?v(workRef.current[key]):v});
  workRef.current=next;setWork(next);onWork?.(next);
 };
 const setValue=(v:string|((n:string)=>string))=>update('value',v),setTries=(n:number)=>update('tries',n),setHints=(v:number|((n:number)=>number))=>update('hints',v),setTeach=(v:number|((n:number)=>number))=>update('teach',v),setOther=(v:number|null|((n:number|null)=>number|null))=>update('other',v),setUsedRecovery=(v:boolean)=>update('usedRecovery',v),setShowTool=(v:boolean)=>update('showTool',v),setWrong=(v:string|null)=>update('wrong',v);
 const format=answerFormat(item.answer);
 const input=useRef<HTMLInputElement>(null),nextRef=useRef<HTMLButtonElement>(null),helped=usedRecovery||hints>0||teach>0||other!==null||simple||(showTool&&!guided&&item.facet!=='visual'&&!item.requiresModel);
 useEffect(()=>{if(finished)nextRef.current?.focus();},[finished]);
 const finish=(r:ItemRecord)=>{setFinished(r);setWrong(null);if(!practiceOnly)onDone(r);};
 function check(v=value){if(finished||!v.trim())return;const n=tries+1;setTries(n);if(isCorrect(item,v))finish({answer:v,correct:true,firstTry:n===1&&!helped,hints:helped?Math.max(1,hints):0,tries:n,at:Date.now()});else setWrong(feedbackFor(item,v)??(n>=2?'Not quite. Open a clue, or press “Teach me” to go step by step.':'Not quite. Have another go.'));}
 const reveal=()=>finish({answer:value,correct:false,firstTry:false,hints:Math.max(1,hints),tries:Math.max(1,tries),at:Date.now()});
 const done=!!finished,choice=(c:string)=>{setValue(c);check(c);};
 if(simple&&item.simpler&&!done)return <div className="recovery-question"><p className="stage-feedback">{item.simpler.key.startsWith('support-')?'Let’s practise one part of the idea. Then we will return to your original question.':'Let’s try an easier one like it first. Then we will return to your original question.'}</p><ItemCard item={item.simpler} guided level={level} onDone={()=>{}} practiceOnly onNext={()=>setSimple(false)} nextLabel="Return to your question →"/><button className="link-btn" onClick={()=>setSimple(false)}>Back to your original question</button></div>;
 return <div className={`item-card${done?' done':''}`}>
  <div className="item-top">{item.facet&&<span className="item-facet">{FACET_LABEL[item.facet]}</span>}<SpeakButton text={`${item.prompt} ${item.display??''}`}/></div>
  <h3 className="item-prompt">{item.prompt}</h3>{item.display&&<div className="item-display">{item.display}</div>}
  {item.tool&&(showTool||done)&&<figure className="teaching-figure"><ToolView tool={done?item.tool:questionModel(item.tool)}/>{modelCaption(item.tool)&&<figcaption>{modelCaption(item.tool)}</figcaption>}</figure>}
  {item.tool&&!showTool&&!done&&<button className="link-btn" onClick={()=>setShowTool(true)}>Show me a picture</button>}
  {item.choices?<div className="item-choices" role="group" aria-label="Answer choices">{item.choices.map(c=>{const mine=(finished?.answer??value)===c;return <button key={c} disabled={done} aria-pressed={mine} className={mine?(done&&finished?.correct?'right':wrong?'wrong':'picked'):''} onClick={()=>choice(c)}>{c}</button>;})}</div>:
   <form className="item-answer" onSubmit={e=>{e.preventDefault();check();}}><label>Your answer<span><input ref={input} value={finished?finished.answer:value} disabled={done} maxLength={40} onChange={e=>{setValue(e.target.value);setWrong(null);}} inputMode={format.inputMode} autoComplete="off" placeholder={format.placeholder}/>{item.unit&&<b>{item.unit}</b>}</span></label>
    {!done&&format.hint&&<p className="answer-format">{format.hint}</p>}
    {level<=2&&!done&&<div className="teach-keypad">{['1','2','3','4','5','6','7','8','9','⌫','0',...(item.answer.includes('/')?['/']:[])].map(k=><button type="button" key={k} aria-label={k==='⌫'?'Delete':k} onClick={()=>{setValue(v=>k==='⌫'?v.slice(0,-1):(v+k).slice(0,6));setWrong(null);}}>{k}</button>)}</div>}
    {!done&&<button className="teach-btn" disabled={!value.trim()}>Check my answer</button>}</form>}
  <div aria-live="polite">{wrong&&<p className="stage-feedback">{wrong}</p>}{done&&<div className="item-solution"><p className={finished!.correct?'item-right':'item-shown'}>{finished!.correct?`✓ ${finished!.firstTry?'Right first time!':'You got there.'}`:`The answer is ${item.answer}${item.unit?' '+item.unit:''}.`}</p>{item.check&&<p className="item-check"><strong>Check it:</strong> {item.check}</p>}{(!finished!.correct||teach>0)&&<ol className="teach-steps">{item.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>}</div>}</div>
  {!done&&hints>0&&<ol className="hint-list">{item.hints.slice(0,hints).map((h,i)=><li key={i}>{h}</li>)}</ol>}
  {!done&&teach>0&&<div className="teach-me"><h4>Let’s work through it</h4><ol className="teach-steps">{item.steps.slice(0,teach).map((s,i)=><li key={i}>{s}</li>)}</ol>{teach<item.steps.length?<button className="link-btn" onClick={()=>setTeach(t=>t+1)}>Next step</button>:<p className="stage-feedback">Now you finish it: type your answer above.</p>}</div>}
  {!done&&other!==null&&item.another?.[other]&&<div className="another-way"><h4>Another way: {item.another[other].title}</h4><ol className="teach-steps">{item.another[other].steps.map((s,i)=><li key={i}>{s}</li>)}</ol>{item.another[other].tool&&<ToolView tool={item.another[other].tool!}/>}</div>}
  {!done&&<div className="help-row">{hints<item.hints.length&&<button className="help-btn" onClick={()=>setHints(h=>h+1)}>{hints?'Another clue':'Give me a clue'}</button>}{teach===0&&<button className="help-btn" onClick={()=>{setTeach(1);setShowTool(true);}}>Teach me</button>}{item.another?.length?<button className="help-btn" onClick={()=>setOther(o=>o===null?0:(o+1)%item.another!.length)}>Show me another way</button>:null}{(item.simpler||item.tool)&&<button className="help-btn" onClick={()=>{setUsedRecovery(true);if(item.simpler)setSimple(true);setShowTool(true);if(!item.simpler&&item.another?.length&&other===null)setOther(0);}}>I still don’t get it</button>}{(tries>=2||teach>=item.steps.length)&&<button className="help-btn" onClick={reveal}>Show the answer</button>}</div>}
  {done&&onNext&&<button ref={nextRef} className="teach-btn" onClick={onNext}>{nextLabel}</button>}
 </div>;
}
function Completion({lesson,mode,attempt,stages,gained,syncStatus,onAgain}:{lesson:Lesson;mode:LessonMode;attempt:LessonAttempt;stages:Stage[];gained:ReturnType<typeof learningRewards>;syncStatus:string;onAgain:()=>void}){
 const {progress}=useProgress(),after=learningRewards(progress),stars=attempt.stars??1,next=nextLessonAfter(lesson),activity=activityById(lesson.activityId),due=reviewDue(progress,lesson);
 const facets:{facet:Facet;correct:boolean;firstTry:boolean}[]=[];stages.forEach((s,si)=>{if(s.kind==='mastery')for(const it of stageItems(s,attempt.seed,si)){const r=attempt.items[`${si}:${it.key}`];facets.push({facet:it.facet??'direct',correct:!!r?.correct,firstTry:!!r?.firstTry});}});
 const mastered=stars===3&&mode!=='review';
 return <main className={`teach grade-${lesson.level} lesson-done`}><div className="done-stars" role="img" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div><p className="teach-eyebrow">{mode==='review'?'Review complete':mode==='challenge'?'Check complete':mastered?'Strong finish':'Lesson complete'}</p><h1>{lesson.title}</h1>
  {mastered?<section className="can-do"><h2>Ideas you practised:</h2><ul>{lesson.canDo.map(c=><li key={c}>✓ {c}</li>)}</ul></section>:<p className="stage-text">{stars===2?'You finished the check. Revisit the parts that needed help or another try.':'Good effort. This idea needs more time; try the lesson again or practise with pictures.'}</p>}
  {facets.length>0&&<><p className="check-summary">{facets.filter(f=>f.correct&&f.firstTry).length} of {facets.length} solved on the first try without help.</p><ul className="facet-results" aria-label="Learning check">{facets.map((f,i)=><li key={i} className={f.correct?(f.firstTry?'clean':'ok'):'again'}>{f.correct?'✓':'○'} {FACET_LABEL[f.facet]}{f.correct?(f.firstTry?' · independently':' · after another try or help'):' · answer shown'}</li>)}</ul><p className="evidence-note">This is today’s check. Try a fresh question on another day to see what you remember.</p></>}
  <p className="rewards-gained" role="status">+{Math.max(0,after.xp-gained.xp)} XP · +{Math.max(0,after.gems-gained.gems)} Math Gems · Level {after.level.level} {after.level.title}</p>
  {due.at&&<p className="stage-text">A quick review will be ready {new Date(due.at).toLocaleDateString('en-SG',{weekday:'long',day:'numeric',month:'short'})}. Coming back to an idea helps you remember it.</p>}
  <div className="done-actions">{stars<3&&mode!=='learn'&&<a className="teach-btn" href={`#/teach/${lesson.id}`}>Learn this idea step by step</a>}{stars===3&&next&&<a className="teach-btn" href={`#/teach/${next.id}`}>Next lesson: {next.title} →</a>}{activity&&<a className="teach-btn soft" href={`#/activity/${activity.id}`}>Practise: {activity.title}</a>}<button className={`teach-btn${stars===3||mode!=='learn'?' soft':''}`} onClick={onAgain}>{mode==='review'?'Try a fresh review':mode==='challenge'?'Try a fresh check':stars===3?'Learn it again':'Revisit this idea'}</button><a className="teach-btn soft" href="#/teach">Back to Learn</a></div>
  <p className="teach-foot" role="status">{syncStatus}</p></main>;
}
