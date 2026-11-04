import type {Question} from './generate';

/** Keep the original options visible when answer controls are replaced by a review. */
export function StructuredResponseGivens({spec}:{spec:Question['structuredResponse']}){
 if(!spec||(spec.kind!=='fraction-pair'&&spec.kind!=='named-pair'))return null;
 return <p className="structured-response-givens"><strong>{spec.kind==='fraction-pair'?'Fractions: ':'Items: '}</strong>{spec.options.map(option=><span key={option} style={{display:'inline-block',marginRight:16}}>{option}</span>)}</p>;
}
