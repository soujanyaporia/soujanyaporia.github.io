import type {MissingDigitColumnModel} from './missingDigitModel';
import './missingDigitColumn.css';

export function MissingDigitColumn({model}:{model:MissingDigitColumnModel}){
 const width=model.total.length,place=(i:number)=>['ones','tens','hundreds'][width-i-1];
 const cells=(row:(number|'A'|'B')[])=>row.map((digit,i)=><td key={i}>{typeof digit==='number'?digit:<span className={`missing-digit-box${model.target===digit?' is-target':''}`} aria-label={`Missing ${place(i)} digit ${digit}${model.target===digit?', find this digit':''}`}>{digit}</span>}</td>);
 return <figure className="missing-digit-column"><table aria-label={`Addition with missing digits A and B. Find digit ${model.target}.`}><thead><tr><th aria-label="Operation"/>{model.total.map((_,i)=><th key={i} scope="col">{place(i)}</th>)}</tr></thead><tbody>
  <tr><th scope="row"><span className="sr-only">First number</span></th>{cells(model.top)}</tr>
  <tr><th scope="row" aria-label="Add">+</th>{cells(model.bottom)}</tr>
  <tr className="missing-digit-total"><th scope="row"><span className="sr-only">Total</span></th>{cells(model.total)}</tr>
 </tbody></table><figcaption>A and B each stand for one missing digit.</figcaption></figure>;
}
