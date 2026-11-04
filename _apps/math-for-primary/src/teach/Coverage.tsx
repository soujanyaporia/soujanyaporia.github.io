import { useState } from 'react';
import { ACTIVITIES } from '../primary/catalog';
import { CURRICULUM,curriculumPath,type Track } from '../school/curriculum';
import { LESSON_INDEX } from './index';
import {lessonById} from './catalog';
import './teach.css';
/**
 * An honest map of what exists for each syllabus objective: a Learn lesson, practice activities,
 * an interactive model, word problems and a mastery check. Gaps are shown as gaps.
 */
const VISUAL_KINDS=new Set(['count','place','groups','share','fractionShade','fractionCompare','fractionEquivalent','fractionSimplify','fractionSet','mixedFraction','clock','length','shape','shapePattern','solid','net','symmetry','area','perimeter','triangleArea','angleType','angleFacts','triangleAngle','quadrilateral','parallel','barGraph','lineGraph','pieChart','pictureGraph','percent','volume','circle','decimalPlace','money','ordinal','pattern']);
const WORD_KINDS=new Set(['story','discount','rate','ratioShare','average','moneyChange','reversePercent','percentChange','volumeMissing']);
export function Coverage(){
 const [level,setLevel]=useState(1),[track,setTrack]=useState<Track>('standard');
 const skills=curriculumPath(level,track);
 const rows=skills.map(s=>{
  const activities=ACTIVITIES.filter(a=>a.skillIds.includes(s.id)),lessons=LESSON_INDEX.filter(l=>l.skillIds.includes(s.id));
  const stages=lessons.flatMap(l=>lessonById(l.id)?.stages??[]);
  return {s,lessons,activities,guided:stages.some(s=>s.kind==='practice'&&s.mode==='guided'&&s.count>0),practice:stages.some(s=>s.kind==='practice'&&s.count>0)||activities.length>0,mastery:stages.some(s=>s.kind==='mastery'&&s.gens.length>0),visual:stages.some(s=>s.kind==='explore')||activities.some(a=>VISUAL_KINDS.has(a.kind)),word:stages.some(s=>s.kind==='apply'&&s.count>0)||activities.some(a=>WORD_KINDS.has(a.kind))};
 });
 const withLesson=rows.filter(r=>r.lessons.length).length,withPractice=rows.filter(r=>r.practice).length;
 const tick=(on:boolean,label:string)=><td className={on?'cov-yes':'cov-no'}><span aria-label={`${label}: ${on?'available':'not yet'}`}>{on?'✓':'—'}</span></td>;
 return <main className="teach coverage"><a className="back-link" href="#/teach">← Back to Learn</a><p className="teach-eyebrow">Curriculum coverage</p><h1>What is built, and what is not.</h1>
  <p className="stage-text">This is our content inventory, organised using the {CURRICULUM.revision} syllabus. A tick means a lesson component exists in the app. It does not establish that every MOE subpoint is fully taught or that a child has mastered it.</p>
  <details className="cinema-insight"><summary>What still needs work?</summary><p>Our 252 objectives group 288 numbered MOE requirements. The latest audit found these areas need more teaching or better assessment:</p><ul><li>Written methods beyond the new P1/P2 addition and subtraction lessons.</li><li>Comparing object sets, ordering fractions, and reading and ordering measurements.</li><li>Combining shapes, drawing with instruments, and completing whole symmetric figures.</li><li>More composite-circle problems and examples using cubic metres.</li></ul><p>Some lesson links offer related practice rather than a drill for that exact objective. Available content is not the same as complete syllabus coverage. A qualified primary teacher has not reviewed every sequence.</p><a href={CURRICULUM.source} target="_blank" rel="noreferrer">Read the official Singapore MOE syllabus</a></details>
  <div className="cov-controls"><label>Level<select value={level} onChange={e=>setLevel(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Primary {n}</option>)}</select></label><label>Path<select value={level<5?'standard':track} disabled={level<5} onChange={e=>setTrack(e.target.value as Track)}><option value="standard">{level<5?'Common':'Standard'}</option><option value="foundation">Foundation</option></select></label></div>
  <p className="cov-summary" role="status"><strong>{withLesson} of {rows.length}</strong> objectives have a Learn lesson · <strong>{withPractice} of {rows.length}</strong> have practice questions · <strong>{rows.length-withPractice}</strong> are mapped only.</p>
  <div className="table-scroll"><table className="cov-table"><thead><tr><th>Objective</th><th>Learn</th><th>Guided</th><th>Practice</th><th>Visual</th><th>Word</th><th>Mastery</th></tr></thead>
   <tbody>{rows.map(({s,lessons,activities,guided,practice,mastery,visual,word})=><tr key={s.id}><th scope="row"><strong>{s.title}</strong><small>{s.id} · {s.topic} · MOE p. {s.sourcePage}</small>{lessons.map(l=><a key={l.id} className="cov-link" href={`#/teach/${l.id}`}>Learn: {l.title}</a>)}{activities.slice(0,2).map(a=><a key={a.id} className="cov-link" href={`#/activity/${a.id}`}>Practise: {a.title}</a>)}</th>
    {tick(lessons.length>0,'Learn lesson')}{tick(guided,'Guided practice')}{tick(practice,'Practice questions')}{tick(visual,'Interactive model')}{tick(word,'Word problems')}{tick(mastery,'Mastery check')}</tr>)}</tbody></table></div>
  <p className="stage-text">Each objective has a dedicated teaching sequence with practice and explanations. The original exemplar units provide longer explorations. Drawing lessons include paper construction tasks for a teacher or adult to check; the app does not automatically grade those drawings. Teachers can also use the <a href="#/lab">Math Lab</a> models directly.</p>
  <p className="teach-foot">This table counts what has been built. It is not a claim that the syllabus has been covered or that the content has been reviewed by a teacher.</p></main>;
}
