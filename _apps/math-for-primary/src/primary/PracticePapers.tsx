import {GroupingBuilder,GroupingObjects} from './GroupingBuilder';
import {shownAnswer,showQuestionPicture} from './answerDisplay';
import {operationSymbol} from './answerFormat';
import {NumberSentence} from './NumberSentence';
import {numberEntry,answerInputMode,answerLimit} from './answerFormat';
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {useProgress} from '../state/ProgressContext';
import type {Track} from '../school/curriculum';
import {Picture} from './Picture';
import {PaperMaterials} from './PaperMaterials';
import {QuestionContext} from './QuestionContext';
import {fractionColumns} from './pictureLayout';
import type {Question} from './generate';
import {SolutionStudio} from '../media/SolutionStudio';
import {solutionFrames} from '../media/solution';
import {Scratchpad} from '../ui/Scratchpad';
import {generatePracticePaper,practicePaperTopics,parsePracticePaperCode,type PracticePaper} from './practicePaper';
import {browserStorage} from './sessionStore';
import {createPaperAttempt,readPaperAttemptState,writePaperAttempt,paperMarks,updatePaperAnswer,movePaperQuestion,markPaperAttempt,type PaperAttempt} from './paperAttempt';
import './practicePapers.css';


export function PracticePapers(){const {scope}=useProgress();return <PaperWorkspace key={scope} scope={scope}/>;}
function PaperWorkspace({scope}:{scope:string}){
 const {progress}=useProgress(),selection=progress.primary?.selection;
 const initialRead=useMemo(()=>readPaperAttemptState(browserStorage(),scope),[scope]),initial=initialRead.restored;
 const [restoreNotice,setRestoreNotice]=useState(initialRead.status==='incompatible');
 const [paper,setPaper]=useState<PracticePaper|null>(initial?.paper??null),[saved,setSaved]=useState<PaperAttempt|null>(initial?.saved??null);
 const [setup,setSetup]=useState(true),[level,setLevel]=useState(selection?.level??1),[track,setTrack]=useState<Track>(selection?.track??'standard');
 const [topic,setTopic]=useState('mixed'),[count,setCount]=useState<6|12|18>(6),[code,setCode]=useState(''),[error,setError]=useState(''),[storageError,setStorageError]=useState(false),[confirmMark,setConfirmMark]=useState(false),[printAnswers,setPrintAnswers]=useState(false);
 const topics=useMemo(()=>practicePaperTopics(level,level<5?'standard':track),[level,track]);
 const maxCount=topics.find(t=>t.id===topic)?.maxCount??6;
 useEffect(()=>{if(count>maxCount)setCount(maxCount);},[count,maxCount]);
 const questionHeading=useRef<HTMLHeadingElement>(null),questionJump=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{if(saved)setStorageError(!writePaperAttempt(browserStorage(),scope,saved));},[saved,scope]);
 useEffect(()=>{if(!setup)questionHeading.current?.focus();},[saved?.position,setup,saved?.marked]);
 function open(next:PracticePaper){setPaper(next);setSaved(createPaperAttempt(next));setSetup(false);setConfirmMark(false);setPrintAnswers(false);setRestoreNotice(false);setError('');window.scrollTo({top:0});}
 function generate(e:FormEvent){e.preventDefault();try{open(generatePracticePaper({level,track:level<5?'standard':track,count,topic,seed:crypto.getRandomValues(new Uint32Array(1))[0]}));}catch{setError('This topic needs a smaller set. Choose six questions or mix all topics, then try again.');}}
 function fromCode(e:FormEvent){e.preventDefault();const request=parsePracticePaperCode(code.trim());if(!request){setError('Check the paper code and try again.');return;}try{open(generatePracticePaper(request));}catch{setError('This paper code cannot be opened in this version. Make a fresh paper instead.');}}
 function answer(value:string){setSaved(s=>s?updatePaperAnswer(s,value):s);setConfirmMark(false);}
 function move(position:number){setSaved(s=>s?movePaperQuestion(s,position):s);setConfirmMark(false);if(questionJump.current)questionJump.current.open=false;}
 function mark(){setSaved(s=>s?markPaperAttempt(s):s);setConfirmMark(false);window.scrollTo({top:0});}
 if(setup||!paper||!saved)return <main className="papers-page"><a className="papers-back" href="#/daily">← Daily practice</a><header className="papers-heading"><p className="papers-eyebrow">SINGAPORE PRIMARY MATHS</p><h1>Create a paper</h1><p>Choose your level and topics. Get fresh questions with worked answers.</p></header>
  {restoreNotice&&<p className="paper-error" role="status">Your saved paper could not be restored after an update or a change to its data. Its saved copy is kept until you start a fresh paper.</p>}
  {paper&&saved&&<button className="papers-resume" onClick={()=>setSetup(false)}>{saved.marked?'Return to my answers':`Continue my paper · question ${saved.position+1}`} <span>→</span></button>}
  <form className="paper-maker" onSubmit={generate}><div className="paper-maker-fields"><label>My level<select value={level} onChange={e=>{setLevel(Number(e.target.value));setTopic('mixed');}}>{[1,2,3,4,5,6].map(n=><option value={n} key={n}>Primary {n}</option>)}</select></label>{level>=5&&<label>My path<select value={track} onChange={e=>{setTrack(e.target.value as Track);setTopic('mixed');}}><option value="standard">Standard</option><option value="foundation">Foundation</option></select></label>}<label>What shall we practise?<select value={topic} onChange={e=>setTopic(e.target.value)}><option value="mixed">Mix my topics</option>{topics.filter(t=>t.id!=='mixed').map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label></div>
   <fieldset className="paper-sizes"><legend>How many questions?</legend>{([6,12,18] as const).map(n=><label key={n} className={count===n?'selected':''}><input type="radio" name="paper-size" checked={count===n} disabled={n>maxCount} onChange={()=>setCount(n)}/><strong>{n}</strong><span>{n>maxCount?'Choose a broader topic':n===6?'A little practice':n===12?'A bigger mix':'A longer challenge'}</span></label>)}</fieldset>
   <div className="paper-maker-bottom"><button className="papers-primary" type="submit">Create my paper <span aria-hidden="true">→</span></button><p>Fresh numbers. Answers and worked steps included.</p></div>
  </form>
  <details className="paper-code-entry"><summary>Open a paper with its code</summary><form onSubmit={fromCode}><label htmlFor="paper-code">Paper code</label><div><input id="paper-code" value={code} onChange={e=>setCode(e.target.value)} spellCheck={false} autoComplete="off" placeholder="Paste the paper code" maxLength={200}/><button type="submit">Open paper →</button></div></form><p>The same code opens the same questions. It does not share anyone’s answers.</p></details>
  {error&&<p className="paper-error" role="alert">{error}</p>}<p className="papers-note">Original practice for Singapore primary maths. These are short practice sets, not official MOE or PSLE papers.</p>
 </main>;
 const current=paper.items[saved.position],q=current.question,marks=paperMarks(paper,saved.answers),answered=marks.answered;
 const correct=saved.marked?marks.correct:0;
 return <main className="papers-page paper-open"><div className="paper-screen"><header className="paper-open-heading"><button className="papers-back" onClick={()=>setSetup(true)}>← Paper setup</button><span>Primary {paper.request.level}{paper.request.track==='foundation'?' · Foundation':''} · {paper.items.length} questions</span><button className="paper-print" onClick={()=>window.print()}>Print paper</button></header>
  {saved.marked?<section className="paper-results" aria-label="Paper results"><span className="paper-result-icon" aria-hidden="true">✦</span><div><p className="papers-eyebrow">YOUR PAPER IS MARKED</p><h1>{correct} of {paper.items.length} answers correct</h1><p>Let’s look at the ideas, one question at a time.</p></div></section>:<div className="paper-attempt-title"><h1>My maths paper</h1><p>Take your time. Check all your answers at the end.</p></div>}
  <details className="paper-jump" ref={questionJump}><summary>Question {saved.position+1} of {paper.items.length}<span>Go to a question ⌄</span></summary><nav className="paper-question-nav" aria-label="Paper questions">{paper.items.map((_,i)=>{const right=saved.marked&&marks.right[i],status=marks.statuses[i];return <button key={i} onClick={()=>move(i)} aria-current={i===saved.position?'step':undefined} aria-label={`Question ${i+1}, ${saved.marked?right?'correct':'to revisit':status==='complete'?'answered':status==='partial'?'not finished':'not answered'}`} className={`${i===saved.position?'current ':''}${saved.marked?right?'right':'revisit':status==='complete'?'answered':''}`}><span>{i+1}</span>{saved.marked&&<small aria-hidden="true">{right?'✓':'↻'}</small>}</button>;})}</nav></details>
  <section className="paper-question" key={q.key}><div className="paper-question-label"><span>QUESTION {saved.position+1} OF {paper.items.length}</span></div><QuestionContext question={q} id="paper-question-context"/><h2 tabIndex={-1} ref={questionHeading} aria-describedby={q.context?.length?'paper-question-context':undefined}>{q.prompt}</h2>{q.display&&<div className="math-display">{q.display}</div>}{q.picture&&showQuestionPicture(q)&&<PaperMaterials model={q.picture}/>}
   {saved.marked&&q.grouping&&<GroupingBuilder spec={q.grouping} value={saved.answers[saved.position]} onChange={()=>{}} disabled/>}
   {saved.marked?<div className={`paper-answer-result ${marks.right[saved.position]?'right':'revisit'}`}><span>Your answer: <strong>{saved.answers[saved.position].trim()?shownAnswer(q,saved.answers[saved.position]):'Not answered'}</strong> {saved.answers[saved.position].trim()?q.unit:''}</span><span>{q.numberSentence||q.grouping?'One correct answer: ':'Correct answer: '}<strong>{shownAnswer(q,q.answer)}</strong> {q.unit}</span></div>:<PaperAnswer question={q} value={saved.answers[saved.position]} onChange={answer} level={paper.request.level}/>}
  </section>
  <PaperActions position={saved.position} count={paper.items.length} marked={saved.marked} answered={answered} confirming={confirmMark} onMove={move} onFinish={()=>answered===paper.items.length?mark():setConfirmMark(true)} onConfirm={mark} onCancel={()=>setConfirmMark(false)} onCreate={()=>setSetup(true)}/>

  {saved.marked?<SolutionStudio key={`solution-${q.key}`} question={q}/>:<div className="paper-working"><Scratchpad storageKey={`paper:${scope}:${paper.code}:${saved.position}`}/></div>}
  <footer className="paper-session-footer"><p role="status">{storageError?'This browser could not save your paper. Keep this tab open to continue.':'Your answers are saved on this device.'}</p><details><summary>Paper code &amp; printing</summary><label>Same questions, any time<input value={paper.code} readOnly onFocus={e=>e.currentTarget.select()} aria-label="This paper’s code"/></label>{saved.marked&&<label className="paper-print-option"><input type="checkbox" checked={printAnswers} onChange={e=>setPrintAnswers(e.target.checked)}/>Include answers and worked steps when printing</label>}<button onClick={()=>window.print()}>Print {printAnswers?'with solutions':'questions only'}</button><p>Diagram sizes may be illustrative. Practice papers are saved on this device and do not yet sync to school accounts.</p></details></footer>
 </div><PrintPaper paper={paper} answers={printAnswers&&saved.marked}/></main>;
}

export function PaperAnswer({question:q,value,onChange,level}:{question:Question;value:string;onChange:(value:string)=>void;level:number}){
 if(q.grouping)return <GroupingBuilder spec={q.grouping} value={value} onChange={onChange}/>;
 if(q.numberSentence)return <NumberSentence spec={q.numberSentence} value={value} onChange={onChange}/>;
 if(q.choices)return <fieldset className="paper-choices"><legend>Choose one answer</legend>{q.choices.map(option=><button type="button" key={option} aria-pressed={value===option} className={value===option?'selected':''} onClick={()=>onChange(option)}>{option}</button>)}</fieldset>;
 if(q.order){const picks=value?value.split(','):[];return <div className="paper-order"><p>Tap each number in order. Tap a filled place to undo it.</p><div className="paper-order-slots">{q.order.map((_,i)=><button key={i} disabled={!picks[i]} aria-label={picks[i]?`Remove ${picks[i]}`:`Empty place ${i+1}`} onClick={()=>onChange(picks.filter((_,j)=>j!==i).join(','))}>{picks[i]??'?'}</button>)}</div><div className="paper-order-options">{q.order.filter(n=>!picks.includes(n)).map(n=><button key={n} onClick={()=>onChange([...picks,n].join(','))}>{n}</button>)}</div></div>;}
 if(q.fractionBuilder){const shaded=value?Number(value.split('/')[0]):0;return <div className="paper-fraction"><p>Tap the number of equal parts to shade.</p><div className="paper-fraction-parts" style={{display:'grid',gridTemplateColumns:`repeat(${fractionColumns(q.fractionBuilder)},minmax(0,1fr))`}} role="group" aria-label="Choose shaded parts">{Array.from({length:q.fractionBuilder},(_,i)=><button key={i} aria-label={`Shade ${i+1} of ${q.fractionBuilder} parts`} aria-pressed={i<shaded} className={i<shaded?'selected':''} onClick={()=>onChange(`${shaded===i+1?0:i+1}/${q.fractionBuilder}`)}>{i<shaded?'✓':i+1}</button>)}</div></div>;}
 return <div className="paper-number-answer"><label htmlFor="paper-answer">My answer</label><div><input id="paper-answer" value={value} onChange={e=>onChange(e.target.value)} maxLength={answerLimit(q)} inputMode={answerInputMode(q)} autoComplete="off" placeholder={q.answerFormat==='pi'?'e.g. 42π':q.requireMixed?'e.g. 2 1/3':q.answer.includes('/')?'e.g. 3/4':'Type here'}/>{q.unit&&<span>{q.unit}</span>}</div>{level<=2&&numberEntry(q)&&<div className="paper-keypad" aria-label="Number keypad">{['1','2','3','4','5','6','7','8','9',q.answer.includes('/')?'/':'.','0','⌫'].map(key=><button key={key} aria-label={key==='⌫'?'Delete digit':key} onClick={()=>onChange(key==='⌫'?value.slice(0,-1):(value+key).slice(0,40))}>{key}</button>)}</div>}</div>;
}

function PrintPaper({paper,answers}:{paper:PracticePaper;answers:boolean}){return <article className="paper-print-sheet"><header><p>SINGAPORE PRIMARY MATHS</p><h1>Primary {paper.request.level}{paper.request.track==='foundation'?' Foundation':''} · Practice paper</h1><p>Name: _________________________ &nbsp; Date: ______________</p><small>Original practice · {paper.code} · Diagrams may not be to scale</small></header>{paper.items.map(({question:q,number})=><section className="paper-print-question" key={number}><QuestionContext question={q}/><h2>{number}. {q.prompt}</h2>{q.display&&<p className="math-display">{q.display}</p>}{q.grouping?<GroupingObjects spec={q.grouping}/>:q.picture&&showQuestionPicture(q)&&<PaperMaterials model={q.picture}/>}{q.choices&&<p>{q.choices.map((v,i)=>`(${i+1}) ${v}`).join('     ')}</p>}{q.order&&<p>{q.order.join('     ')}</p>}{q.numberSentence&&<p>{!q.numberSentence.freeEntry&&<>Number cards: {q.numberSentence.numbers.join(' · ')}<br/></>}□ {q.numberSentence.chooseOperation?'□':operationSymbol(q.numberSentence.operation)} □ = □</p>}{q.fractionBuilder&&<Picture model={{type:'fraction',parts:q.fractionBuilder,filled:0}}/>}<div className="paper-print-working"/><p>Answer: __________________ {q.unit}</p></section>)}{answers&&<section className="paper-print-solutions"><h1>Answers &amp; worked steps</h1>{paper.items.map(({question:q,number})=><section key={number}><h2>{number}. {shownAnswer(q,q.answer)} {q.unit}</h2><ol>{solutionFrames(q).map((frame,i)=><li key={i}>{frame.text}{frame.equation&&<p>{frame.equation}</p>}{frame.model&&<PaperMaterials model={frame.model}/>}</li>)}</ol></section>)}</section>}</article>;}

/** One finish/check action at a time. Complete papers mark immediately; only unfinished work asks. */
export function PaperActions({position,count,marked,answered,confirming,onMove,onFinish,onConfirm,onCancel,onCreate}:{position:number;count:number;marked:boolean;answered:number;confirming:boolean;onMove:(position:number)=>void;onFinish:()=>void;onConfirm:()=>void;onCancel:()=>void;onCreate:()=>void}){
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(confirming)heading.current?.focus();},[confirming]);
 if(confirming)return <section className="paper-mark-confirm" role="region" aria-label="Finish paper"><h2 ref={heading} tabIndex={-1}>{count-answered} question{count-answered===1?' is':'s are'} not finished.</h2><p>You can go back to them, or finish and learn from the steps.</p><button className="papers-primary" onClick={onConfirm}>Check my answers</button><button onClick={onCancel}>Keep working</button></section>;
 return <><div className="paper-next"><button disabled={!position} onClick={()=>onMove(position-1)}>← Previous</button>{position<count-1?<button className="papers-primary" onClick={()=>onMove(position+1)}>Next question →</button>:marked?<button className="papers-primary" onClick={onCreate}>Create another paper →</button>:<button className="papers-primary" onClick={onFinish}>Check my answers →</button>}</div>{!marked&&<div className="paper-submit"><span>{answered} of {count} answered</span>{position<count-1&&<button onClick={onFinish}>Finish early</button>}</div>}</>;
}
