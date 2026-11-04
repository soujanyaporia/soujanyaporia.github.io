import {parseSentence,sentenceValue,operationSymbol,operationName,operationFamily,type NumberSentenceSpec} from './answerFormat';
import './numberSentence.css';

/** Three reusable number cards: touch and keyboard use the same buttons. */
export function NumberSentence({spec,value,onChange,disabled=false}:{spec:NumberSentenceSpec;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const parsed=parseSentence(value),slots=parsed.slots,operation=spec.chooseOperation?parsed.operation:spec.operation,remaining=spec.missingResult?slots.slice(0,2):[...slots];
 const cards=spec.numbers.map((n,i)=>{const at=remaining.indexOf(n),used=at!==-1;if(used)remaining.splice(at,1);return {n,i,used};});
 const write=(at:number,n:number|null)=>{const next=slots.map((old,i)=>i===at?n:old);onChange(next.every(x=>x===null)&&operation==='?'?'':sentenceValue(next,operation));};
 const openSlot=slots.findIndex((n,i)=>n===null&&(!spec.missingResult||i<2));
 return <section className="number-sentence" aria-label="Build a number sentence">
  <p>{spec.freeEntry?'Count the picture, then type the three numbers in your sentence.':spec.missingResult?'Use the two numbers from the story. Work out the answer.':spec.numbers.length===3?'Use every number card once.':'Choose three number cards. Use each chosen card once.'} {spec.freeEntry?'': 'Tap a filled box to change it.'}</p>
  {spec.chooseOperation&&<div className="sentence-operations" role="group" aria-label={`Choose ${operationFamily(spec.operation).map(operationName).join(' or ')}`}>{operationFamily(spec.operation).map(op=><button type="button" key={op} disabled={disabled} aria-label={`Use ${operationName(op)}`} aria-pressed={operation===op} onClick={()=>onChange(sentenceValue(slots,op))}>{operationSymbol(op)}</button>)}</div>}
  <div className="sentence-slots" role="group" aria-label="Your number sentence">
   {slots.map((n,i)=><span className="sentence-part" key={i}>{i>0&&<b aria-hidden="true">{i===1?operationSymbol(operation):'='}</b>}{spec.freeEntry||(i===2&&spec.missingResult)?<input aria-label={i===2?'Answer in your number sentence':`Number ${i+1} in your sentence`} inputMode="numeric" autoComplete="off" disabled={disabled} value={n??''} placeholder="?" maxLength={7} onChange={e=>{if(/^\d{0,7}$/.test(e.target.value))write(i,e.target.value===''?null:Number(e.target.value));}}/>:<button type="button" disabled={disabled||n===null} onClick={()=>write(i,null)} aria-label={n===null?`Empty number box ${i+1}`:`Remove ${n} from box ${i+1}`}>{n??'?'}</button>}</span>)}
  </div>
  {!spec.freeEntry&&<div className="sentence-cards" role="group" aria-label="Number cards">{cards.map(({n,i,used})=><button type="button" key={i} disabled={disabled||used||openSlot<0} aria-label={`Place ${n}${cards.filter(c=>c.n===n).length>1?`, card ${i+1}`:''}`} onClick={()=>write(openSlot,n)}>{n}</button>)}</div>}
  <span className="sr-only" aria-live="polite">{sentenceValue(slots,operation).replace(/\?/g,'blank')}</span>
 </section>;
}
