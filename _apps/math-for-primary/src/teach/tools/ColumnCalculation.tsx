import type {Tool} from '../model';
import {columnPlace,columnSteps,type ColumnTool} from './columnArithmetic';
import './columnArithmetic.css';

export function ColumnArithmetic({t,onChange}:{t:ColumnTool;onChange?:(tool:Tool)=>void}){
 const steps=columnSteps(t.a,t.b,t.operation),at=Math.max(0,Math.min(t.step,steps.length-1)),s=steps[at],width=s.top.length;
 const original=String(t.a).padStart(width,'0').split('').map(Number);
 const leading=(value:number,column:number)=>column<width-String(value).length;
 const active=(column:number)=>column===s.column?' column-active':'';
 return <div className="column-arithmetic">
  <table aria-label={`Written ${t.operation==='+'?'addition':'subtraction'}: ${t.a} ${t.operation==='+'?'plus':'minus'} ${t.b}`}>
   <thead><tr><th aria-label="Operation"/>{s.top.map((_,i)=><th key={i} scope="col" className={active(i)}>{columnPlace(width,i)}</th>)}</tr></thead>
   <tbody>
    {t.operation==='+'&&<tr className="column-carry"><th scope="row"><span className="sr-only">Carried units</span></th>{s.carry.map((digit,i)=><td key={i} className={active(i)}>{digit?<span aria-label={`${digit} carried ${columnPlace(width,i)}`}>{digit}</span>:null}</td>)}</tr>}
    <tr><th scope="row"><span className="sr-only">First number</span></th>{s.top.map((digit,i)=><td key={i} className={active(i)}>{digit!==original[i]?<span className="column-exchanged"><del aria-label={`Originally ${original[i]}`}>{original[i]}</del><strong aria-label={`Now ${digit} ${columnPlace(width,i)}`}>{digit}</strong></span>:leading(t.a,i)?<span aria-hidden="true"> </span>:digit}</td>)}</tr>
    <tr><th scope="row" aria-label={t.operation==='+'?'Add':'Subtract'}>{t.operation==='+'?'+':'−'}</th>{s.bottom.map((digit,i)=><td key={i} className={active(i)}>{leading(t.b,i)?'':digit}</td>)}</tr>
    <tr className="column-result"><th scope="row"><span className="sr-only">Answer</span></th>{s.result.map((digit,i)=><td key={i} className={active(i)}>{(t.hideValue&&(s.column===null||i===s.column))||digit===null?<span className="column-empty" aria-label={`Unknown ${columnPlace(width,i)}`}>?</span>:digit===0&&leading(t.operation==='+'?t.a+t.b:t.a-t.b,i)?'':digit}</td>)}</tr>
   </tbody>
  </table>
  {s.exchange&&<p className="column-exchange-key"><span>1 {columnPlace(width,Math.min(s.exchange.from,s.exchange.to)).replace(/s$/,'')}</span><b aria-hidden="true">⇄</b><span>10 {columnPlace(width,Math.max(s.exchange.from,s.exchange.to))}</span></p>}
  {onChange&&<><p className="column-instruction" aria-live="polite">{t.hideValue&&s.answer?s.prompt:s.text}</p>{s.equation&&!(t.hideValue&&s.answer)&&<p className="column-equation">{s.equation}</p>}<div className="column-controls"><button type="button" disabled={at===0} onClick={()=>onChange({...t,step:at-1})}>← Previous</button><button type="button" disabled={at===steps.length-1} onClick={()=>onChange({...t,step:at+1})}>{at===steps.length-1?'All columns done':steps[at+1].phase==='exchange'?'Make the exchange →':steps[at+1].phase==='complete'?'Check the answer →':'Work the next column →'}</button></div></>}
 </div>;
}
