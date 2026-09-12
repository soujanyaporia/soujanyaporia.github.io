import { activityById } from '../primary/catalog';
import { CURRICULUM,CURRICULUM_SKILLS } from '../school/curriculum';
import { lessonById } from './catalog';
import { ToolView } from './tools/Tools';
import { FACET_LABEL,REP_LABEL,WORLDS,type Lesson,type Stage,type Tool } from './model';
import { stageItems } from './LessonPlayer';
import './teach.css';
const STAGE_LABEL:Record<Stage['kind'],string>={readiness:'Readiness check',hook:'Story hook',explore:'Explore with a manipulative',notice:'What do you notice?',connect:'Concrete → pictorial → abstract',explain:'Explanation',worked:'Worked example',practice:'Practice',apply:'Apply in a story',reason:'Reasoning',mastery:'Mastery check',discovery:'Discovery moment'};
/** Every manipulative a lesson shows, wherever it appears: stages, worked steps, items and clues. */
function lessonTools(l:Lesson):Tool[]{
 const out:Tool[]=[],add=(t?:Tool|null)=>{if(t)out.push(t);};
 l.stages.forEach((s,i)=>{
  if('tool' in s)add(s.tool as Tool|undefined);
  if(s.kind==='readiness'){s.items.forEach(it=>add(it.tool));s.booster.forEach(b=>add(b.tool));}
  if(s.kind==='connect')s.rows.forEach(r=>add(r.tool));
  if(s.kind==='worked')s.steps.forEach(st=>add(st.tool));
  if(s.kind==='explain')add(s.why?.tool);
  if(s.kind==='reason')s.items.forEach(it=>add(it.tool));
  if(s.kind==='practice'||s.kind==='apply'||s.kind==='mastery')stageItems(s,7,i).forEach(it=>add(it.tool));
 });
 return [...new Map(out.map(t=>[t.kind,t])).values()];
}
/** Teacher view of a lesson: what it teaches, in what order, with what models, and how mastery is judged. No pupil data. */
export function LessonGuide({id}:{id:string}){
 const lesson=lessonById(id);
 if(!lesson)return <main className="school-page"><h1>We could not find that lesson.</h1><a href="#/teach">See all lessons →</a></main>;
 const sample=(stage:Stage,index:number)=>stageItems(stage,7,index).slice(0,1)[0];
 return <main className="teach lesson-guide"><a className="back-link" href="#/teach">← Back to Learn</a><p className="teach-eyebrow">Teacher guide · P{lesson.level} · {WORLDS[lesson.world].title}</p><h1>{lesson.title}</h1>
  <div className="guide-actions"><a className="teach-btn" href={`#/teach/${lesson.id}`}>Preview as a student</a><a className="teach-btn soft" href={`#/teach/${lesson.id}/challenge`}>Open the mastery check</a>{activityById(lesson.activityId)&&<a className="teach-btn soft" href={`#/activity/${lesson.activityId}`}>Practice activity</a>}</div>
  <section className="stage-card"><h2>Learning objectives</h2><ul className="guide-list">{lesson.objectives.map(o=><li key={o}>{o}</li>)}</ul>
   <h3>Syllabus objectives</h3><ul className="guide-list">{lesson.skillIds.map(sid=>{const s=CURRICULUM_SKILLS.find(c=>c.id===sid);return <li key={sid}><strong>{sid}</strong> — {s?.title}{s?` (MOE syllabus p. ${s.sourcePage})`:''}</li>;})}</ul>
   <p className="muted">Curriculum map {CURRICULUM.id}, {CURRICULUM.revision}. Objective wording is paraphrased; prerequisites below are this app's instructional choice, not MOE sequencing.</p>
   <h3>Assumed before this lesson</h3><ul className="guide-list">{lesson.prerequisites.map(p=>{const s=CURRICULUM_SKILLS.find(c=>c.id===p),l=lessonById(p);return <li key={p}>{l?<a href={`#/guide/${l.id}`}>{l.title}</a>:s?`${s.id} — ${s.title}`:p}</li>;})}</ul>
   <h3>About {lesson.minutes} minutes</h3><p className="muted">Representations used: {lesson.representations.map(r=>REP_LABEL[r]).join(', ')}.</p></section>
  <section className="stage-card"><h2>Teaching sequence</h2><ol className="guide-sequence">{lesson.stages.map((s,i)=>{const item=sample(s,i);return <li key={i}><strong>{STAGE_LABEL[s.kind]}</strong> — {'title' in s?s.title:''}
   {s.kind==='explore'&&<p className="muted">Goal: {s.goalHint} Manipulative: {s.tool.kind}.</p>}
   {s.kind==='worked'&&<p className="muted">Problem: {s.problem} · {s.steps.length} revealed steps, {s.steps.filter(x=>x.ask).length} asking the pupil to answer.</p>}
   {s.kind==='explain'&&s.why&&<p className="muted">“Why does this work?”: {s.why.question}</p>}
   {(s.kind==='practice'||s.kind==='apply')&&<p className="muted">{s.count} generated questions{s.kind==='practice'?` (${s.mode})`:''}. Example: {item?.prompt} {item?.display??''} → {item?.answer}</p>}
   {s.kind==='mastery'&&<p className="muted">{s.gens.length} questions, one per facet: {s.gens.map(g=>FACET_LABEL[g.facet]).join('; ')}.</p>}
   {s.kind==='reason'&&<p className="muted">{s.items.length} reasoning questions, for example: {s.items[0]?.prompt}</p>}</li>;})}</ol></section>
  <section className="stage-card"><h2>Expected misconceptions</h2><ul className="guide-list">{lesson.misconceptions.map(m=><li key={m.name}><strong>{m.name}.</strong> {m.fix}</li>)}</ul></section>
  <section className="stage-card"><h2>How mastery is judged</h2><p className="stage-text">The mastery check asks one question per facet: {Object.values(FACET_LABEL).join(', ')}. Three stars need every facet correct with at most one needing help; two stars allow up to two facets wrong; otherwise one star. A quick review falls due one day later, then after four, ten and thirty days.</p>
   <h3>What the pupil should be able to do</h3><ul className="guide-list">{lesson.canDo.map(c=><li key={c}>{c}</li>)}</ul>
   {lesson.grows&&<><h3>How this idea grows</h3><p className="stage-text">{lesson.grows.join('  →  ')}</p></>}</section>
  <section className="stage-card"><h2>Manipulatives in this lesson</h2><div className="guide-tools">{lessonTools(lesson).map(t=><div key={t.kind} className="guide-tool"><h3>{t.kind}</h3><ToolView tool={t}/></div>)}</div><p className="muted">Open any of these on their own in the <a href="#/lab">Math Lab</a>.</p></section>
  <p className="teach-foot">Lesson content was written with the help of AI and checked by automated tests for mathematical correctness. Please review it before teaching with it.</p></main>;
}
