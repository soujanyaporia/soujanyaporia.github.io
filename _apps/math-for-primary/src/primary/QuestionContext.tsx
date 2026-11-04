import type {Question} from './generate';
import './questionText.css';
/** Essential story givens belong beside the question, not in a small diagram caption. */
export function QuestionContext({question,id}:{question:Question;id?:string}){
 return question.context?.length?<div className="question-context" id={id}>{question.context.map((line,i)=><p key={i}>{line}</p>)}</div>:null;
}
export const spokenQuestion=(q:Question)=>[...(q.context??[]),q.prompt,q.display??''].filter(Boolean).join(' ');
