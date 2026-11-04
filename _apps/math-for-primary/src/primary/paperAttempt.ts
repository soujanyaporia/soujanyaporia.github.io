import {correctAnswer,numberValue,type Question} from './generate';
import {responseReady} from './answerFormat';
import {restorePaperResume,serializePaperResume,type PracticePaper} from './practicePaper';
import type {KV} from './sessionStore';
import {paperAttemptKey} from './paperAttemptStore';
export {paperAttemptKey,clearPaperAttempt} from './paperAttemptStore';

export interface PaperAttempt {code:string;answers:string[];position:number;marked:boolean;fingerprint:string}
export type PaperAnswerStatus='blank'|'partial'|'complete';
// Reuse the core's graded-content signature. Narration or hint edits do not erase a child's work.
const signature=(paper:PracticePaper)=>serializePaperResume(paper,paper.items.map(()=>null),0);
export function createPaperAttempt(paper:PracticePaper):PaperAttempt{return {code:paper.code,answers:paper.items.map(()=>''),position:0,marked:false,fingerprint:signature(paper)};}
export function restorePaperAttempt(raw:string|null):{paper:PracticePaper;saved:PaperAttempt}|null{
 try{
  if(!raw||raw.length>32768)return null;
  const saved:unknown=JSON.parse(raw);if(!saved||typeof saved!=='object')return null;
  const s=saved as Record<string,unknown>;
  if(typeof s.code!=='string'||s.code.length>200||typeof s.marked!=='boolean'||typeof s.fingerprint!=='string'||s.fingerprint.length>4096||!Array.isArray(s.answers)||!s.answers.every(a=>typeof a==='string'&&a.length<=200)||!Number.isInteger(s.position))return null;
  const restored=restorePaperResume(s.fingerprint);if(!restored)return null;const {paper}=restored;
  if(s.code!==paper.code||s.fingerprint!==signature(paper)||s.answers.length!==paper.items.length||(s.position as number)<0||(s.position as number)>=paper.items.length)return null;
  return {paper,saved:{code:s.code,answers:[...s.answers] as string[],position:s.position as number,marked:s.marked,fingerprint:s.fingerprint}};
 }catch{return null;}
}
export function readPaperAttemptState(kv:KV|null,scope:string):{restored:ReturnType<typeof restorePaperAttempt>;status:'none'|'restored'|'incompatible'|'unavailable'}{
 try{if(!kv)return {restored:null,status:'unavailable'};const raw=kv.getItem(paperAttemptKey(scope));if(raw===null)return {restored:null,status:'none'};const restored=restorePaperAttempt(raw);return {restored,status:restored?'restored':'incompatible'};}catch{return {restored:null,status:'unavailable'};}
}
export const readPaperAttempt=(kv:KV|null,scope:string)=>readPaperAttemptState(kv,scope).restored;
export function writePaperAttempt(kv:KV|null,scope:string,saved:PaperAttempt){try{if(!kv)return false;kv.setItem(paperAttemptKey(scope),JSON.stringify(saved));return true;}catch{return false;}}
export function paperAnswerStatus(q:Question,value:string):PaperAnswerStatus{
 if(!value.trim())return 'blank';
 if(q.numberSentence||q.grouping||q.structuredResponse)return responseReady(q,value)?'complete':'partial';
 if(q.choices)return q.choices.includes(value)?'complete':'partial';
 if(q.order){const picks=value.split(',');return picks.length===q.order.length&&JSON.stringify([...picks].sort())===JSON.stringify([...q.order].sort())?'complete':'partial';}
 if(q.fractionBuilder){const m=/^(\d+)\/(\d+)$/.exec(value);return m&&Number(m[2])===q.fractionBuilder&&Number(m[1])<=q.fractionBuilder?'complete':'partial';}
 if(numberValue(q.answer)!==null){const n=numberValue(value);return n!==null&&Number.isFinite(n)?'complete':'partial';}
 return 'complete';
}
export function paperMarks(paper:PracticePaper,answers:string[]){
 const statuses=paper.items.map((item,i)=>paperAnswerStatus(item.question,answers[i]??''));
 const right=paper.items.map((item,i)=>statuses[i]==='complete'&&correctAnswer(item.question,answers[i]??''));
 const answered=statuses.filter(s=>s==='complete').length;
 return {statuses,right,correct:right.filter(Boolean).length,answered,unfinished:paper.items.length-answered,blank:statuses.filter(s=>s==='blank').length};
}
export function updatePaperAnswer(saved:PaperAttempt,value:string):PaperAttempt{
 return saved.marked?saved:{...saved,answers:saved.answers.map((a,i)=>i===saved.position?value.slice(0,200):a)};
}
export function movePaperQuestion(saved:PaperAttempt,position:number):PaperAttempt{
 return Number.isInteger(position)&&position>=0&&position<saved.answers.length?{...saved,position}:saved;
}
export const markPaperAttempt=(saved:PaperAttempt):PaperAttempt=>({...saved,marked:true,position:0});
