import {useMemo,useState} from 'react';
import {lessonApplication} from './lessonApplicationSelection';
import type {LessonMeta} from './handIndex';
import {QuestionContext} from '../primary/QuestionContext';
import {PaperMaterials} from '../primary/PaperMaterials';
import {PaperAnswer,PaperMarkedAnswer} from '../primary/PracticePapers';
import {correctAnswer} from '../primary/generate';
import {responseReady} from '../primary/answerFormat';
import {showQuestionPicture} from '../primary/answerDisplay';
import {SolutionStudio} from '../media/SolutionStudio';

export function LessonApplication({lesson,seed}:{lesson:Pick<LessonMeta,'id'|'level'|'track'|'skillIds'>;seed:number}){
 const [index,setIndex]=useState(0),[answer,setAnswer]=useState(''),[checked,setChecked]=useState(false);
 const example=useMemo(()=>lessonApplication(lesson,seed,index),[lesson,seed,index]);
 if(!example)return null;const q=example.question;
 return <section className="stage-card lesson-application" aria-label="Apply this lesson"><p className="teach-eyebrow">Use what you learned</p><h2>A different kind of question</h2><QuestionContext question={q}/><h3>{q.prompt}</h3>{q.display&&<div className="math-display">{q.display}</div>}{q.picture&&!q.angleConstruction&&showQuestionPicture(q)&&<PaperMaterials model={q.picture}/>}
  {checked?<><PaperMarkedAnswer question={q} value={answer} correct={correctAnswer(q,answer)}/><SolutionStudio question={q}/><button className="teach-btn soft" onClick={()=>{setIndex(i=>i+1);setAnswer('');setChecked(false);}}>Try another question</button></>:<><PaperAnswer question={q} value={answer} onChange={setAnswer} level={lesson.level}/><button className="teach-btn" disabled={!responseReady(q,answer)} onClick={()=>setChecked(true)}>Check this question</button></>}
 </section>;
}
