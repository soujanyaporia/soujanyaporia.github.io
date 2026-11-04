import type {Question} from './generate';
import type {SessionDraft,SessionMode} from './session';

export const blankDraft=(position:number,mode:SessionMode):SessionDraft=>({position,value:'',picks:[],shaded:[],tries:0,wrong:[],hint:false,status:'answering',stage:mode==='repair'?'explain':'try',at:0});
/** Remove stale selections a child cannot reach or undo in the current question's controls. */
export function usableDraft(q:Question,d:SessionDraft):SessionDraft{
 const available=[...(q.order??[])],picks=d.picks.filter(value=>{const i=available.indexOf(value);if(i<0)return false;available.splice(i,1);return true;});
 const parts=q.fractionBuilder??(q.picture?.type==='counters'?q.picture.count:0);
 const shaded=[...new Set(d.shaded)].filter(n=>Number.isInteger(n)&&n>=0&&n<parts);
 const value=q.choices&&!q.choices.includes(d.value)?'':d.value;
 return {...d,picks,shaded,value};
}
export const draftAnswer=(q:Question,d:SessionDraft)=>q.order?d.picks.join(','):q.fractionBuilder?`${d.shaded.length}/${q.fractionBuilder}`:d.value;
export function draftReady(q:Question,d:SessionDraft){return q.order?d.picks.length===q.order.length:q.fractionBuilder?true:!!d.value.trim();}
