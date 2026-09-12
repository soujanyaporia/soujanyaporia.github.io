import { useState } from 'react';
import { ACTIVITIES } from '../primary/catalog';
import { CURRICULUM,curriculumPath,type Track } from '../school/curriculum';
import { LESSON_INDEX } from './index';
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
  return {s,lessons,activities,visual:lessons.length>0||activities.some(a=>VISUAL_KINDS.has(a.kind)),word:lessons.length>0||activities.some(a=>WORD_KINDS.has(a.kind))};
 });
 const withLesson=rows.filter(r=>r.lessons.length).length,withPractice=rows.filter(r=>r.activities.length||r.lessons.length).length;
 const tick=(on:boolean,label:string)=><td className={on?'cov-yes':'cov-no'}><span aria-label={`${label}: ${on?'available':'not yet'}`}>{on?'✓':'—'}</span></td>;
 return <main className="teach coverage"><a className="back-link" href="#/teach">← Back to Learn</a><p className="teach-eyebrow">Curriculum coverage</p><h1>What is built, and what is not.</h1>
  <p className="stage-text">Every mapped objective from the {CURRICULUM.revision} syllabus is listed. A tick means that part exists today; a dash means it does not. Practice questions without a Learn lesson mean the app can give a child questions on that objective but does not yet teach it.</p>
  <div className="cov-controls"><label>Level<select value={level} onChange={e=>setLevel(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Primary {n}</option>)}</select></label><label>Path<select value={level<5?'standard':track} disabled={level<5} onChange={e=>setTrack(e.target.value as Track)}><option value="standard">{level<5?'Common':'Standard'}</option><option value="foundation">Foundation</option></select></label></div>
  <p className="cov-summary" role="status"><strong>{withLesson} of {rows.length}</strong> objectives have a Learn lesson · <strong>{withPractice} of {rows.length}</strong> have practice questions · <strong>{rows.length-withPractice}</strong> are mapped only.</p>
  <div className="table-scroll"><table className="cov-table"><thead><tr><th>Objective</th><th>Learn</th><th>Guided</th><th>Practice</th><th>Visual</th><th>Word</th><th>Mastery</th></tr></thead>
   <tbody>{rows.map(({s,lessons,activities,visual,word})=><tr key={s.id}><th scope="row"><strong>{s.title}</strong><small>{s.id} · {s.topic} · MOE p. {s.sourcePage}</small>{lessons.map(l=><a key={l.id} className="cov-link" href={`#/teach/${l.id}`}>Learn: {l.title}</a>)}{activities.slice(0,2).map(a=><a key={a.id} className="cov-link" href={`#/activity/${a.id}`}>Practise: {a.title}</a>)}</th>
    {tick(lessons.length>0,'Learn lesson')}{tick(lessons.length>0,'Guided practice')}{tick(activities.length>0||lessons.length>0,'Practice questions')}{tick(visual,'Interactive model')}{tick(word,'Word problems')}{tick(lessons.length>0,'Mastery check')}</tr>)}</tbody></table></div>
  <p className="stage-text">Each objective has a dedicated teaching sequence with practice and explanations. The original exemplar units provide longer explorations. Drawing lessons include paper construction tasks for a teacher or adult to check; the app does not automatically grade those drawings. Teachers can also use the <a href="#/lab">Math Lab</a> models directly.</p>
  <p className="teach-foot">This table counts what has been built. It is not a claim that the syllabus has been covered or that the content has been reviewed by a teacher.</p></main>;
}
