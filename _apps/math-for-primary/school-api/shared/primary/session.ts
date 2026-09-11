import { activityById } from './catalog';
/**
 * Resumable activity sessions (schema 1).
 *
 * A session records the identity of its generated questions (generator version, seed and a
 * fingerprint per question), the scored results in order, the question currently shown, and an
 * unscored draft for the question being worked on. Scored results are also sent as learning events
 * with deterministic IDs, so an answer or completion is counted once however often it is retried.
 * A draft is never a scored answer.
 */
export const SESSION_SCHEMA = 1;
export type SessionMode = 'practice' | 'repair';
export interface ScoredResult {answer:string;correct:boolean;firstTry:boolean;hints:number;tries:number;wrong:string[];at:number}
export interface SessionDraft {position:number;value:string;picks:string[];shaded:number[];tries:number;wrong:string[];hint:boolean;status:'answering'|'wrong';stage:'explain'|'try';at:number}
/** A question to repair: its original identity (`activity:seed:index`) and the error evidence. */
export interface RepairItem {key:string;fingerprint:string;wrong:string[];revealed:boolean}
export interface PrimarySession {
 schema:1;id:string;activityId:string;generator:string;seed:number;count:number;fingerprints:string[];
 mode:SessionMode;repairOf:string|null;repair:RepairItem[];
 /** Question on screen. Below `results.length` the pupil is reviewing a scored answer. */
 cursor:number;results:ScoredResult[];draft:SessionDraft|null;
 startedAt:number;updatedAt:number;completedAt:number|null;stars:number|null;
}
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function newSessionId(){const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return hex(bytes);}
/** cyrb128: a fast 128-bit string hash, used to derive stable UUID-shaped event IDs. */
function hash128(text:string){let h1=1779033703,h2=3144134277,h3=1013904242,h4=2773480762;for(let i=0;i<text.length;i++){const k=text.charCodeAt(i);h1=h2^Math.imul(h1^k,597399067);h2=h3^Math.imul(h2^k,2869860233);h3=h4^Math.imul(h3^k,951274213);h4=h1^Math.imul(h4^k,2716044179);}
 h1=Math.imul(h3^(h1>>>18),597399067);h2=Math.imul(h4^(h2>>>22),2869860233);h3=Math.imul(h1^(h3>>>17),951274213);h4=Math.imul(h2^(h4>>>19),2716044179);h1^=h2^h3^h4;h2^=h1;h3^=h1;h4^=h1;return [h1,h2,h3,h4].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');}
export function stableId(text:string){const h=hash128(text);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export const answerEventId=(sessionId:string,position:number)=>stableId(`primary-answer|${sessionId}|${position}`);
export const completeEventId=(sessionId:string)=>stableId(`primary-complete|${sessionId}`);
export interface KeyInfo {content:string;activityId:string;seed:number;index:number;session:{id:string;position:number;count:number;generator:string;fingerprint:string;mode:SessionMode}|null}
/** The saved question identity: `activity:seed:index`, then the session context used to resume on another device. */
export function encodeQuestionKey(s:PrimarySession,position:number,contentKey:string){return `${contentKey}|s=${s.id}|p=${position}|n=${s.count}|g=${s.generator}|f=${s.fingerprints[position]||'-'}|m=${s.mode==='repair'?'r':'p'}`;}
export function parseQuestionKey(key:string):KeyInfo|null{
 const [content,...parts]=key.split('|'),m=/^([A-Za-z0-9-]+):(\d+):(\d+)$/.exec(content);if(!m)return null;
 const f=Object.fromEntries(parts.map(p=>[p.slice(0,1),p.slice(2)])),position=Number(f.p),count=Number(f.n);
 const session=/^[a-f0-9]{16}$/.test(f.s||'')&&Number.isInteger(position)&&Number.isInteger(count)&&position>=0&&position<count&&/^[0-9.]+$/.test(f.g||'')&&(f.m==='p'||f.m==='r')?{id:f.s,position,count,generator:f.g,fingerprint:/^[a-f0-9]{8}$/.test(f.f||'')?f.f:'',mode:(f.m==='r'?'repair':'practice') as SessionMode}:null;
 return {content,activityId:m[1],seed:Number(m[2]),index:Number(m[3]),session};
}
export function starsFor(results:ScoredResult[]){const clean=results.filter(r=>r.firstTry).length/Math.max(1,results.length);return clean>=.85?3:clean>=.5?2:1;}
export const isComplete=(s:PrimarySession)=>s.results.length>=s.count;
export const isUnfinished=(s:PrimarySession)=>!isComplete(s)&&s.completedAt===null;
/** Question number a pupil returns to: the scored answer being reviewed, or the next unanswered question. */
export const resumePosition=(s:PrimarySession)=>Math.min(s.cursor,s.count-1);
const isInt=(n:unknown,min:number,max:number):n is number=>Number.isInteger(n)&&(n as number)>=min&&(n as number)<=max;
const isStr=(s:unknown,max:number):s is string=>typeof s==='string'&&s.length<=max;
const strList=(xs:unknown,items:number,len:number):xs is string[]=>Array.isArray(xs)&&xs.length<=items&&xs.every(x=>isStr(x,len));
const fp=(f:unknown)=>typeof f==='string'&&/^([a-f0-9]{8})?$/.test(f);
function result(r:any,late:number):ScoredResult|null{return r&&typeof r==='object'&&isStr(r.answer,200)&&typeof r.correct==='boolean'&&typeof r.firstTry==='boolean'&&isInt(r.hints,0,1000)&&isInt(r.tries,1,10000)&&strList(r.wrong,3,60)&&isInt(r.at,0,late)&&(!r.firstTry||(r.correct&&r.tries===1&&r.hints===0))?{answer:r.answer,correct:r.correct,firstTry:r.firstTry,hints:r.hints,tries:r.tries,wrong:[...r.wrong],at:r.at}:null;}
function draft(d:any,position:number,late:number):SessionDraft|null|undefined{
 if(d===null)return null;
 if(!d||typeof d!=='object'||d.position!==position||!isStr(d.value,100)||!strList(d.picks,12,40)||!Array.isArray(d.shaded)||d.shaded.length>24||!d.shaded.every((n:unknown)=>isInt(n,0,23))||!isInt(d.tries,0,1000)||!strList(d.wrong,3,60)||typeof d.hint!=='boolean'||!['answering','wrong'].includes(d.status)||!['explain','try'].includes(d.stage)||!isInt(d.at,0,late))return undefined;
 return {position,value:d.value,picks:[...d.picks],shaded:[...d.shaded],tries:d.tries,wrong:[...d.wrong],hint:d.hint,status:d.status,stage:d.stage,at:d.at};
}
/** Strict validation shared by the browser store and the API. Returns a normalised copy or null. */
export function validateSession(raw:unknown,now=Date.now()):PrimarySession|null{
 const s=raw as any,late=now+5*60000;
 if(!s||typeof s!=='object'||s.schema!==1||!/^[a-f0-9]{16}$/.test(String(s.id))||!isStr(s.activityId,80)||!activityById(s.activityId))return null;
 if(!isStr(s.generator,20)||!/^[0-9.]+$/.test(s.generator)||!isInt(s.seed,0,0xffffffff)||!isInt(s.count,1,20))return null;
 if(!Array.isArray(s.fingerprints)||s.fingerprints.length!==s.count||!s.fingerprints.every(fp))return null;
 if(!['practice','repair'].includes(s.mode)||(s.repairOf!==null&&!/^[a-f0-9]{16}$/.test(String(s.repairOf))))return null;
 if(!Array.isArray(s.repair)||(s.mode==='repair'?s.repair.length!==s.count:s.repair.length!==0))return null;
 const repair:RepairItem[]=[];for(const item of s.repair){if(!item||!isStr(item.key,120)||!fp(item.fingerprint)||!strList(item.wrong,3,60)||typeof item.revealed!=='boolean')return null;repair.push({key:item.key,fingerprint:item.fingerprint,wrong:[...item.wrong],revealed:item.revealed});}
 if(!Array.isArray(s.results)||s.results.length>s.count)return null;
 const results:ScoredResult[]=[];for(const r of s.results){const ok=result(r,late);if(!ok)return null;results.push(ok);}
 const d=draft(s.draft,results.length,late);if(d===undefined||(d&&results.length>=s.count))return null;
 if(!isInt(s.cursor,0,results.length)||!isInt(s.startedAt,0,late)||!isInt(s.updatedAt,0,late))return null;
 if(s.completedAt!==null&&(!isInt(s.completedAt,0,late)||results.length<s.count))return null;
 if(s.stars!==null&&!isInt(s.stars,0,3))return null;
 const clean:PrimarySession={schema:1,id:s.id,activityId:s.activityId,generator:s.generator,seed:s.seed,count:s.count,fingerprints:[...s.fingerprints],mode:s.mode,repairOf:s.repairOf,repair,cursor:s.cursor,results,draft:d,startedAt:s.startedAt,updatedAt:s.updatedAt,completedAt:s.completedAt,stars:s.stars};
 return JSON.stringify(clean).length<=20000?clean:null;
}
/**
 * Combine two copies of one session (this device, another device, the server).
 * Scored results only ever grow. Where both copies scored a position, `authoritative` (saved
 * answer history) wins; otherwise the earlier score is kept.
 */
export function mergeSameSession(a:PrimarySession,b:PrimarySession,authoritative=false):PrimarySession{
 const length=Math.max(a.results.length,b.results.length);
 const results=Array.from({length},(_,i)=>{const x=a.results[i],y=b.results[i];if(!x||!y)return x||y;if(authoritative)return x.answer===y.answer&&x.correct===y.correct&&x.firstTry===y.firstTry?x:y;return y.at<x.at?y:x;});
 const draft=[a.draft,b.draft].filter((d):d is SessionDraft=>!!d&&d.position===length&&length<a.count).sort((x,y)=>y.at-x.at)[0]??null;
 const done=[a,b].filter(s=>s.completedAt!==null).sort((x,y)=>x.completedAt!-y.completedAt!)[0];
 return {...a,fingerprints:a.fingerprints.map((f,i)=>f||b.fingerprints[i]||''),results,draft,cursor:Math.min(length,Math.max(a.cursor,b.cursor)),startedAt:Math.min(a.startedAt,b.startedAt),updatedAt:Math.max(a.updatedAt,b.updatedAt),completedAt:done?.completedAt??null,stars:done?.stars??null};
}
/** Pick between two sessions for the same activity: the same session merges; otherwise the newer one wins. */
export function combineSessions(a:PrimarySession|undefined,b:PrimarySession|undefined,authoritative=false):PrimarySession|undefined{
 if(!a||!b)return a||b;if(a.id===b.id)return mergeSameSession(a,b,authoritative);
 return b.startedAt>a.startedAt||(b.startedAt===a.startedAt&&b.updatedAt>a.updatedAt)?b:a;
}
