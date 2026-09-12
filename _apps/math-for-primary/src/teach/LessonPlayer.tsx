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
import { feedbackFor,isCorrect } from './gen';
import { FACET_LABEL,WORLDS,type Facet,type Item,type Lesson,type Stage,type Tool } from './model';
import { answerEventId,completeEventId,masteryStars,nodeId,questionKey,readAttempts,reviewDue,reviewNodeId,reviewStages,writeAttempt,type ItemRecord,type LessonAttempt,type LessonMode } from './progress';
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
 const complete_=ITEM_STAGES.includes(stage.kind)?items.every(it=>attempt.items[`${index}:${it.key}`]):(['explore','notice','worked','connect'].includes(stage.kind)||stage.kind==='explain'&&!!stage.frames)?!!attempt.done[index]:true;
 const go=(to:number)=>{setBanner(false);if(to>=stages.length){complete();return;}patch(a=>({...a,stage:Math.max(0,to)}));window.scrollTo({top:0});};
 const assessed=stage.kind==='mastery';
 return <main className={`teach grade-${lesson.level}`}>
  <header className="teach-head"><button className="teach-close" onClick={()=>setLeaving(true)} aria-label="Leave lesson">×</button><div><p className="teach-eyebrow">{mode==='review'?'Review':mode==='challenge'?'Challenge':'Learn'} · P{lesson.level} · {WORLDS[lesson.world].title}</p><h1>{lesson.title}</h1></div><span className="teach-count">{index+1} / {stages.length}</span></header>
  <div className="stage-track" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={index}>{stages.map((s,i)=><span key={i} title={s.title} className={i<index?'done':i===index?'now':''}/>)}</div>
  {banner&&<div className="resume-banner" role="status"><span><strong>Welcome back.</strong> You are on step {index+1} of {stages.length}: {stage.title}.</span><span className="resume-actions"><button onClick={()=>setBanner(false)}>Keep going</button><button onClick={()=>{patch(()=>newAttempt(lesson,mode));setBanner(false);}}>Start again</button></span></div>}
  <StageView key={`${attempt.attemptId}:${index}`} lesson={lesson} stage={stage} index={index} items={items} attempt={attempt} onRecord={(item,r)=>record(index,stage.kind,item,r)} onDone={()=>patch(a=>({...a,done:{...a.done,[index]:true}}))} onConfidence={c=>patch(a=>({...a,confidence:c}))} reward={setToast}/>
  <nav className="stage-nav" aria-label="Lesson steps">{index>0&&!assessed&&<button className="teach-btn soft" onClick={()=>go(index-1)}>← Back</button>}<span className="stage-need" aria-live="polite">{complete_?'':stage.kind==='explore'?'Try the model, then press Check.':ITEM_STAGES.includes(stage.kind)?'Answer each question to continue.':stage.kind==='worked'?'Reveal every step to continue.':stage.kind==='connect'?'Show every step to continue.':stage.kind==='explain'?'Follow the picture steps to continue.':'Choose an answer to continue.'}</span><button className="teach-btn" disabled={!complete_} onClick={()=>go(index+1)}>{index===stages.length-1?'Finish':'Next →'}</button></nav>
  <p className="teach-foot">Made with the help of AI: check anything that looks wrong with a teacher or parent. <span role="status">{syncStatus}</span></p>
  {toast&&<div className="reward-toast" role="status">{toast}</div>}
  {leaving&&<div className="stop-backdrop" onClick={()=>setLeaving(false)}><div className="stop-panel" role="dialog" aria-modal="true" aria-label="Leave the lesson?" onClick={e=>e.stopPropagation()}><strong>Leave the lesson?</strong><p>Your place is saved on this device. You will come back to step {index+1}.</p><button autoFocus onClick={()=>setLeaving(false)}>Keep learning</button><a href="#/teach">Back to Learn</a></div></div>}
 </main>;
}
function Card({title,text,children,read=true}:{title:string;text?:string;children?:ReactNode;read?:boolean}){return <section className="stage-card"><div className="stage-title"><h2>{title}</h2>{read&&<SpeakButton text={`${title}. ${text??''}`}/>}</div>{text&&<p className="stage-text">{text}</p>}{children}</section>;}
function StageView({lesson,stage,index,items,attempt,onRecord,onDone,onConfidence,reward}:{lesson:Lesson;stage:Stage;index:number;items:Item[];attempt:LessonAttempt;onRecord:(item:Item,r:ItemRecord)=>void;onDone:()=>void;onConfidence:(c:number)=>void;reward:(t:string)=>void}){
 const done=!!attempt.done[index];
 switch(stage.kind){
  case 'hook':return <Card title={stage.title} text={stage.text}>{stage.tool&&<ToolView tool={stage.tool}/>}</Card>;
  case 'explain':return <Explain stage={stage} done={done} onDone={onDone}/>;
  case 'discovery':return <Card title={stage.title} text={stage.text}><div className="discovery-moment" aria-hidden="true">✦</div>{stage.math&&<p className="stage-math">{stage.math}</p>}{stage.tool&&<ToolView tool={stage.tool}/>}</Card>;
  case 'explore':return <Explore stage={stage} done={done} onDone={onDone} reward={reward}/>;
  case 'notice':return <Notice stage={stage} done={done} onDone={onDone} reward={reward}/>;
  case 'connect':return <Connect stage={stage} done={done} onDone={onDone}/>;
  case 'worked':return <Worked stage={stage} done={done} onDone={onDone}/>;
  default:return <ItemsStage lesson={lesson} stage={stage} index={index} items={items} attempt={attempt} onRecord={onRecord} onConfidence={onConfidence}/>;
 }
}
function Explain({stage,done,onDone}:{stage:Extract<Stage,{kind:'explain'}>;done:boolean;onDone:()=>void}){
 const [why,setWhy]=useState(false);
 if(stage.frames)return <VisualExplanation stage={stage} done={done} onDone={onDone}/>;
 return <Card title={stage.title} text={stage.text}>{stage.math&&<p className="stage-math">{stage.math}</p>}{stage.tool&&<ToolView tool={stage.tool}/>}{stage.why&&<div className="why-box"><button className="teach-btn soft" aria-expanded={why} onClick={()=>setWhy(w=>!w)}>{why?'Hide':'Why does this work?'}</button>{why&&<div className="why-answer"><h3>{stage.why.question}</h3><p>{stage.why.answer}</p>{stage.why.tool&&<ToolView tool={stage.why.tool}/>}</div>}</div>}</Card>;
}
function VisualExplanation({stage,done,onDone}:{stage:Extract<Stage,{kind:'explain'}>;done:boolean;onDone:()=>void}){
 const ways=[{label:'See the idea',frames:stage.frames!},...(stage.alternatives??[])];
 const [way,setWay]=useState(0),[at,setAt]=useState(0),[started,setStarted]=useState(done);
 const frames=ways[way].frames,f=frames[at],last=at===frames.length-1;
 return <section className="visual-tutor stage-card"><p className="visual-tutor-label">LET’S SEE WHY</p><h2>{stage.title}</h2>
 {ways.length>1&&<div className="visual-way-tabs" role="tablist" aria-label="Ways to understand">{ways.map((w,i)=><button key={w.label} role="tab" aria-selected={way===i} onClick={()=>{setWay(i);setAt(0);setStarted(true);}}>{w.label}</button>)}</div>}
 <div className="visual-tutor-picture" key={`${way}-${at}`}>{f.tool&&<ToolView tool={f.tool}/>}</div>
 <div className="visual-tutor-say" aria-live="polite"><p>{f.text}</p><SpeakButton text={f.text}/></div>
 {started&&f.math&&<p className="visual-tutor-math">{f.math}</p>}
 <nav className="visual-tutor-nav" aria-label="Picture steps"><button className="teach-btn soft" disabled={!at} aria-label="Previous picture" onClick={()=>setAt(n=>n-1)}>←</button><span aria-label={`Picture ${at+1} of ${frames.length}`}>{frames.map((_,i)=><i key={i} className={i===at?'on':''}/>)}</span><button className="teach-btn" disabled={last&&done} onClick={()=>{setStarted(true);if(last){onDone();}else{setAt(n=>n+1);if(at+1===frames.length-1)onDone();}}}>{last?'All steps seen ✓':started?'Next step →':'Show me how →'}</button></nav>
 </section>;
}
function Explore({stage,done,onDone,reward}:{stage:Extract<Stage,{kind:'explore'}>;done:boolean;onDone:()=>void;reward:(t:string)=>void}){
 const [tool,setTool]=useState<Tool>(stage.tool),[message,setMessage]=useState<string|null>(done?stage.success:null),[tries,setTries]=useState(0);
 const check=()=>{if(stage.goal(tool)){setMessage(stage.success);if(!done){onDone();reward('+5 XP · You built it');}}else{setTries(n=>n+1);setMessage(`Not yet. ${stage.goalHint}`);}};
 const restart=()=>{setTool(stage.tool);setMessage(null);};
 return <Card title={stage.title} text={stage.text}><ToolView tool={tool} onChange={t=>{setTool(t);if(!done)setMessage(null);}}/><div className="stage-actions"><button className="teach-btn" onClick={check}>Check</button><button className="teach-btn soft" onClick={restart}>Start again</button>{!done&&tries>=2&&<button className="teach-btn soft" onClick={()=>{const target=goalState(stage.tool,stage.goal);if(target){setTool(target);setMessage(stage.success);onDone();}}}>Show me how</button>}</div>{message&&<p className={`stage-feedback${stage.goal(tool)||done?' good':''}`} role="status">{message}</p>}</Card>;
}
function Notice({stage,done,onDone,reward}:{stage:Extract<Stage,{kind:'notice'}>;done:boolean;onDone:()=>void;reward:(t:string)=>void}){
 const [picked,setPicked]=useState<number|null>(done?stage.options.findIndex(o=>o.correct):null);
 return <Card title={stage.title} text={stage.text}>{stage.tool&&<ToolView tool={stage.tool}/>}<div className="notice-options" role="group" aria-label="Choose one">{stage.options.map((o,i)=><button key={i} className={picked===i?(o.correct?'right':'wrong'):''} aria-pressed={picked===i} onClick={()=>{setPicked(i);if(o.correct&&!done){onDone();reward('+5 XP · Great noticing');}}}>{o.text}</button>)}</div>{picked!==null&&<p className={`stage-feedback${stage.options[picked].correct?' good':''}`} role="status">{stage.options[picked].reply}</p>}</Card>;
}
function Connect({stage,done,onDone}:{stage:Extract<Stage,{kind:'connect'}>;done:boolean;onDone:()=>void}){
 const [shown,setShown]=useState(done?stage.rows.length:1);
 return <Card title={stage.title} text={stage.text}><ol className="connect-rows">{stage.rows.slice(0,shown).map((r,i)=><li key={i} className="connect-row"><p>{r.text}</p>{r.math&&<p className="stage-math">{r.math}</p>}{r.tool&&<ToolView tool={r.tool}/>}{i<shown-1&&<span className="connect-arrow" aria-hidden="true">↓</span>}</li>)}</ol>{shown<stage.rows.length?<button className="teach-btn" onClick={()=>{const n=shown+1;setShown(n);if(n===stage.rows.length)onDone();}}>Show the next step ↓</button>:null}</Card>;
}
function Worked({stage,done,onDone}:{stage:Extract<Stage,{kind:'worked'}>;done:boolean;onDone:()=>void}){
 const [shown,setShown]=useState(done?stage.steps.length:1),[answers,setAnswers]=useState<Record<number,string>>({}),[solved,setSolved]=useState<Record<number,boolean>>(()=>done?Object.fromEntries(stage.steps.map((_,i)=>[i,true])):{});
 const step=stage.steps[shown-1],waiting=!!step?.ask&&!solved[shown-1];
 useEffect(()=>{if(shown===stage.steps.length&&!waiting&&!done)onDone();},[shown,stage.steps.length,waiting,done,onDone]);
 const advance=()=>setShown(n=>n+1);
 return <Card title={stage.title}><p className="worked-problem">{stage.problem}</p>{(step.tool??stage.tool)&&<ToolView tool={(step.tool??stage.tool)!}/>}<ol className="worked-steps one-at-a-time">{stage.steps.map((s,i)=>i===shown-1&&<li key={i}><p>{s.text}</p>{s.math&&(!s.ask||solved[i])&&<p className="stage-math">{s.math}</p>}{s.ask&&(solved[i]?<p className="stage-feedback good">✓ {s.ask.answer}</p>:<div className="worked-ask"><p><strong>{s.ask.prompt}</strong></p>{s.ask.choices?<div className="notice-options">{s.ask.choices.map(c=><button key={c} className={answers[i]===c?(c===s.ask!.answer?'right':'wrong'):''} onClick={()=>{setAnswers(a=>({...a,[i]:c}));if(c===s.ask!.answer)setSolved(v=>({...v,[i]:true}));}}>{c}</button>)}</div>:<form className="inline-answer" onSubmit={e=>{e.preventDefault();if(isCorrect({answer:s.ask!.answer},answers[i]??''))setSolved(v=>({...v,[i]:true}));else setAnswers(a=>({...a,[i]:''}));}}><input aria-label={s.ask.prompt} inputMode="decimal" value={answers[i]??''} onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))}/><button className="teach-btn">Check</button></form>}<button className="link-btn" onClick={()=>setSolved(v=>({...v,[i]:true}))}>Show me</button></div>)}</li>)}</ol><div className="visual-tutor-nav"><button className="teach-btn soft" disabled={shown===1} onClick={()=>setShown(n=>n-1)}>← Previous step</button><span>{shown} / {stage.steps.length}</span>{shown<stage.steps.length&&<button className="teach-btn" disabled={waiting} onClick={advance}>Next step →</button>}</div></Card>;
}
function ItemsStage({lesson,stage,index,items,attempt,onRecord,onConfidence}:{lesson:Lesson;stage:Stage;index:number;items:Item[];attempt:LessonAttempt;onRecord:(item:Item,r:ItemRecord)=>void;onConfidence:(c:number)=>void}){
 const open=items.findIndex(it=>!attempt.items[`${index}:${it.key}`]),[view,setView]=useState(open<0?items.length-1:open);
 const item=items[Math.min(view,items.length-1)],guided=stage.kind==='readiness'||stage.kind==='reason'||(stage.kind==='practice'&&stage.mode==='guided')||stage.kind==='apply';
 const title='title' in stage?stage.title:'',text='text' in stage?stage.text:undefined,all=open<0;
 if(stage.kind==='mastery'&&attempt.confidence===null&&!Object.keys(attempt.items).some(k=>k.startsWith(`${index}:`)))return <Card title={title} text={text}><p className="stage-text"><strong>Before you start: how sure do you feel about this idea?</strong></p><div className="notice-options confidence" role="group" aria-label="How sure do you feel?">{['Not sure yet','Getting there','Very sure'].map((c,i)=><button key={c} onClick={()=>onConfidence(i)}>{c}</button>)}</div></Card>;
 return <Card title={title} text={text}><div className="item-dots" aria-hidden="true">{items.map((it,i)=>{const r=attempt.items[`${index}:${it.key}`];return <button key={it.key} tabIndex={-1} className={`${i===view?'now ':''}${r?(r.firstTry?'clean':r.correct?'ok':'shown'):''}`} onClick={()=>setView(i)}/>;})}</div><p className="item-count">Question {Math.min(view,items.length-1)+1} of {items.length}</p>
  <ItemCard key={`${index}:${item.key}`} item={item} guided={guided} level={lesson.level} record={attempt.items[`${index}:${item.key}`]} onDone={r=>onRecord(item,r)} onNext={view<items.length-1?()=>setView(v=>v+1):undefined}/>
  {stage.kind==='readiness'&&all&&attempt.readinessMissed&&<div className="booster"><h3>Quick booster</h3>{stage.booster.map((b,i)=><div key={i} className="booster-card"><p>{b.text}</p>{b.math&&<p className="stage-math">{b.math}</p>}{b.tool&&<ToolView tool={b.tool}/>}</div>)}</div>}
  {stage.kind==='readiness'&&all&&!attempt.readinessMissed&&<p className="stage-feedback good">Your maths brain is warmed up. Let’s go!</p>}</Card>;
}
/** One question with scaffolds. Help is always available; using it simply means the answer is not counted as first try. */
export function ItemCard({item,guided,level,record,onDone,onNext,practiceOnly=false}:{item:Item;guided:boolean;level:number;record?:ItemRecord;onDone:(r:ItemRecord)=>void;onNext?:()=>void;practiceOnly?:boolean}){
 const [value,setValue]=useState(''),[tries,setTries]=useState(0),[hints,setHints]=useState(0),[teach,setTeach]=useState(0),[other,setOther]=useState<number|null>(null),[simple,setSimple]=useState(false),[showTool,setShowTool]=useState(guided),[wrong,setWrong]=useState<string|null>(null),[finished,setFinished]=useState<ItemRecord|null>(record??null);
 const input=useRef<HTMLInputElement>(null),nextRef=useRef<HTMLButtonElement>(null),helped=hints>0||teach>0||other!==null||simple||(showTool&&!guided);
 useEffect(()=>{if(finished)nextRef.current?.focus();},[finished]);
 const finish=(r:ItemRecord)=>{setFinished(r);setWrong(null);if(!practiceOnly)onDone(r);};
 function check(v=value){if(finished||!v.trim())return;const n=tries+1;setTries(n);if(isCorrect(item,v))finish({answer:v,correct:true,firstTry:n===1&&!helped,hints:helped?Math.max(1,hints):0,tries:n,at:Date.now()});else setWrong(feedbackFor(item,v)??(n>=2?'Not quite. Open a clue, or press “Teach me” to go step by step.':'Not quite. Have another go.'));}
 const reveal=()=>finish({answer:value,correct:false,firstTry:false,hints:Math.max(1,hints),tries:Math.max(1,tries),at:Date.now()});
 const done=!!finished,choice=(c:string)=>{setValue(c);check(c);};
 return <div className={`item-card${done?' done':''}`}>
  <div className="item-top">{item.facet&&<span className="item-facet">{FACET_LABEL[item.facet]}</span>}<SpeakButton text={`${item.prompt} ${item.display??''}`}/></div>
  <h3 className="item-prompt">{item.prompt}</h3>{item.display&&<div className="item-display">{item.display}</div>}
  {item.tool&&(showTool||done)&&<ToolView tool={item.tool}/>}
  {item.tool&&!showTool&&!done&&<button className="link-btn" onClick={()=>setShowTool(true)}>Show me a picture</button>}
  {simple&&item.simpler&&!done&&<div className="simpler"><p className="stage-feedback">Let’s try an easier one with the same idea first.</p><ItemCard item={item.simpler} guided level={level} onDone={()=>{}} practiceOnly onNext={()=>setSimple(false)}/></div>}
  {item.choices?<div className="item-choices" role="group" aria-label="Answer choices">{item.choices.map(c=>{const mine=(finished?.answer??value)===c;return <button key={c} disabled={done} aria-pressed={mine} className={mine?(done&&finished?.correct?'right':wrong?'wrong':'picked'):''} onClick={()=>choice(c)}>{c}</button>;})}</div>:
   <form className="item-answer" onSubmit={e=>{e.preventDefault();check();}}><label>Your answer<span><input ref={input} value={finished?finished.answer:value} disabled={done} maxLength={40} onChange={e=>{setValue(e.target.value);setWrong(null);}} inputMode={item.answer.includes('/')||item.answer.includes(':')?'text':'decimal'} autoComplete="off" placeholder={item.answer.includes('/')?'e.g. 3/4':'Type a number'}/>{item.unit&&<b>{item.unit}</b>}</span></label>
    {level<=2&&!done&&<div className="teach-keypad">{['1','2','3','4','5','6','7','8','9','⌫','0'].map(k=><button type="button" key={k} aria-label={k==='⌫'?'Delete':k} onClick={()=>{setValue(v=>k==='⌫'?v.slice(0,-1):(v+k).slice(0,6));setWrong(null);}}>{k}</button>)}</div>}
    {!done&&<button className="teach-btn" disabled={!value.trim()}>Check my answer</button>}</form>}
  <div aria-live="polite">{wrong&&<p className="stage-feedback">{wrong}</p>}{done&&<div className="item-solution"><p className={finished!.correct?'item-right':'item-shown'}>{finished!.correct?`✓ ${finished!.firstTry?'Right first time!':'You got there.'}`:`The answer is ${item.answer}${item.unit?' '+item.unit:''}.`}</p>{item.check&&<p className="item-check"><strong>Check it:</strong> {item.check}</p>}{(!finished!.correct||teach>0)&&<ol className="teach-steps">{item.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>}</div>}</div>
  {!done&&hints>0&&<ol className="hint-list">{item.hints.slice(0,hints).map((h,i)=><li key={i}>{h}</li>)}</ol>}
  {!done&&teach>0&&<div className="teach-me"><h4>Let’s work through it</h4><ol className="teach-steps">{item.steps.slice(0,teach).map((s,i)=><li key={i}>{s}</li>)}</ol>{teach<item.steps.length?<button className="link-btn" onClick={()=>setTeach(t=>t+1)}>Next step</button>:<p className="stage-feedback">Now you finish it: type your answer above.</p>}</div>}
  {!done&&other!==null&&item.another?.[other]&&<div className="another-way"><h4>Another way: {item.another[other].title}</h4><ol className="teach-steps">{item.another[other].steps.map((s,i)=><li key={i}>{s}</li>)}</ol>{item.another[other].tool&&<ToolView tool={item.another[other].tool!}/>}</div>}
  {!done&&<div className="help-row">{hints<item.hints.length&&<button className="help-btn" onClick={()=>setHints(h=>h+1)}>{hints?'Another clue':'Give me a clue'}</button>}{teach===0&&<button className="help-btn" onClick={()=>{setTeach(1);setShowTool(true);}}>Teach me</button>}{item.another?.length?<button className="help-btn" onClick={()=>setOther(o=>o===null?0:(o+1)%item.another!.length)}>Show me another way</button>:null}{(item.simpler||item.tool)&&<button className="help-btn" onClick={()=>{if(item.simpler)setSimple(true);setShowTool(true);if(item.another?.length&&other===null)setOther(0);}}>I still don’t get it</button>}{(tries>=2||teach>=item.steps.length)&&<button className="help-btn" onClick={reveal}>Show the answer</button>}</div>}
  {done&&onNext&&<button ref={nextRef} className="teach-btn" onClick={onNext}>Next question →</button>}
 </div>;
}
function Completion({lesson,mode,attempt,stages,gained,syncStatus,onAgain}:{lesson:Lesson;mode:LessonMode;attempt:LessonAttempt;stages:Stage[];gained:ReturnType<typeof learningRewards>;syncStatus:string;onAgain:()=>void}){
 const {progress}=useProgress(),after=learningRewards(progress),stars=attempt.stars??1,next=nextLessonAfter(lesson),activity=activityById(lesson.activityId),due=reviewDue(progress,lesson);
 const facets:{facet:Facet;correct:boolean;firstTry:boolean}[]=[];stages.forEach((s,si)=>{if(s.kind==='mastery')for(const it of stageItems(s,attempt.seed,si)){const r=attempt.items[`${si}:${it.key}`];facets.push({facet:it.facet??'direct',correct:!!r?.correct,firstTry:!!r?.firstTry});}});
 const mastered=stars===3&&mode!=='review';
 return <main className={`teach grade-${lesson.level} lesson-done`}><div className="done-stars" role="img" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div><p className="teach-eyebrow">{mode==='review'?'Review complete':mastered?'Skill mastered':'Lesson complete'}</p><h1>{lesson.title}</h1>
  {mastered?<section className="can-do"><h2>You can now:</h2><ul>{lesson.canDo.map(c=><li key={c}>✓ {c}</li>)}</ul></section>:<p className="stage-text">{stars===2?'Nearly there. Look at the ideas below that need another go.':'Good effort. This idea needs more time; try the lesson again or practise with pictures.'}</p>}
  {facets.length>0&&<ul className="facet-results" aria-label="Mastery check">{facets.map((f,i)=><li key={i} className={f.correct?(f.firstTry?'clean':'ok'):'again'}>{f.correct?'✓':'○'} {FACET_LABEL[f.facet]}{f.correct&&!f.firstTry?' (with help)':''}</li>)}</ul>}
  <p className="rewards-gained" role="status">+{Math.max(0,after.xp-gained.xp)} XP · +{Math.max(0,after.gems-gained.gems)} Math Gems · Level {after.level.level} {after.level.title}</p>
  {due.at&&<p className="stage-text">A quick review will be ready {new Date(due.at).toLocaleDateString('en-SG',{weekday:'long',day:'numeric',month:'short'})}. Coming back to an idea helps you remember it.</p>}
  <div className="done-actions">{next&&<a className="teach-btn" href={`#/teach/${next.id}`}>Next lesson: {next.title} →</a>}{activity&&<a className="teach-btn soft" href={`#/activity/${activity.id}`}>Practise: {activity.title}</a>}<button className="teach-btn soft" onClick={onAgain}>{mode==='review'?'Review again':'Learn it again'}</button><a className="teach-btn soft" href="#/teach">Back to Learn</a></div>
  <p className="teach-foot" role="status">{syncStatus}</p></main>;
}
