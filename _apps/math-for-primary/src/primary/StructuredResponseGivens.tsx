import type {Question} from './generate';

/** Keep the original options visible when answer controls are replaced by a review. */
export function StructuredResponseGivens({spec,choices}:{spec:Question['structuredResponse'];choices?:Question['choices']}){
 const pair=spec&&(spec.kind==='fraction-pair'||spec.kind==='named-pair')?spec:null;
 if(!pair&&!choices?.length)return null;
 return <>{!!choices?.length&&<div className="question-choice-givens"><p><strong>Choices:</strong></p><ol>{choices.map(choice=><li key={choice}>{choice}</li>)}</ol></div>}{pair&&<p className="structured-response-givens"><strong>{pair.kind==='fraction-pair'?'Fractions: ':'Items: '}</strong>{pair.options.map(option=><span key={option} style={{display:'inline-block',marginRight:16}}>{option}</span>)}</p>}</>;
}
