import { reduceEvent,type ProgressEvent } from '../school/events';
import { ApiError } from '../school/api';
import type { KV } from '../primary/sessionStore';
import { initialProgress,sanitize,type ProgressState } from './progress';
export type SyncState='local'|'loading'|'saving'|'saved'|'pending'|'offline'|'expired'|'error';
export interface SyncInfo {state:SyncState;pending:number;rejected:number;lastSavedAt:number|null}
export const pendingKey=(id:string)=>'math.school.pending.'+id,snapshotKey=(id:string)=>'math.school.snapshot.'+id,rejectedKey=(id:string)=>'math.school.rejected.'+id;
type Api=(path:string,method?:string,body?:unknown)=>Promise<any>;
const read=(kv:KV,key:string)=>{try{return JSON.parse(kv.getItem(key)||'null')}catch{return null}};
const unique=(events:ProgressEvent[])=>events.filter((e,i)=>!!e&&typeof e.id==='string'&&events.findIndex(x=>x?.id===e.id)===i);
const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
export function syncLabel(s:SyncInfo){
 switch(s.state){
  case 'local':return 'Saved on this device';
  case 'loading':return 'Connecting to your school account…';
  case 'saving':return 'Saving…';
  case 'saved':return s.rejected?`Saved to your school account · ${plural(s.rejected,'answer')} could not be saved`:'Saved to your school account';
  case 'pending':return `${plural(s.pending,'change')} waiting to save`;
  case 'offline':return s.pending?`Offline — ${plural(s.pending,'change')} will save when you reconnect`:'Offline — your saved work is safe';
  case 'expired':return 'Session expired — sign in again to save';
  case 'error':return 'Saving is paused — sign in again or ask your teacher';
 }
}
/**
 * Uploads one pupil's learning events. Events wait in localStorage until the server confirms them, and
 * are never queued twice (the server rejects a batch containing a repeated ID). An event the server
 * permanently rejects is set aside so it cannot block later work. The last server snapshot is cached,
 * so a pupil can keep learning while offline; it is removed at sign-out.
 */
export class CloudSync{
 queue:ProgressEvent[];version=0;fetched=false;ready:boolean;progress:ProgressState;failures=0;info:SyncInfo;
 private busy:Promise<boolean>|null=null;
 constructor(private userId:string,private api:Api,private kv:KV,private notify:(sync:CloudSync)=>void){
  const saved=read(kv,pendingKey(userId)),snapshot=read(kv,snapshotKey(userId)),base=snapshot?.progress?sanitize(snapshot.progress):null,rejected=read(kv,rejectedKey(userId));
  this.queue=unique(Array.isArray(saved)?saved:[]);this.ready=!!base;this.version=base&&Number.isInteger(snapshot.version)?snapshot.version:0;
  this.progress=this.queue.reduce<ProgressState>(reduceEvent,base??initialProgress());
  this.info={state:'loading',pending:this.queue.length,rejected:Array.isArray(rejected)?rejected.length:0,lastSavedAt:null};
 }
 needsSync(){return this.queue.length>0||!this.fetched}
 nextDelay(){return this.failures?Math.min(60000,5000*2**Math.min(this.failures-1,4)):5000}
 private update(patch:Partial<SyncInfo>){this.info={...this.info,pending:this.queue.length,...patch};this.notify(this);}
 private persist(){try{this.kv.setItem(pendingKey(this.userId),JSON.stringify(this.queue))}catch{this.update({state:'error'})}}
 private accept(version:number,server:unknown){
  const base:ProgressState=(server?sanitize(server):null)??initialProgress();this.version=version;this.fetched=true;this.ready=true;
  try{this.kv.setItem(snapshotKey(this.userId),JSON.stringify({version,progress:base}))}catch{/* cache is optional */}
  this.progress=this.queue.reduce<ProgressState>(reduceEvent,base);
 }
 private setAside(event:ProgressEvent){const list=read(this.kv,rejectedKey(this.userId));const next=[...(Array.isArray(list)?list:[]),event].slice(-50);try{this.kv.setItem(rejectedKey(this.userId),JSON.stringify(next))}catch{/* ignore */}this.queue=this.queue.filter(e=>e.id!==event.id);this.persist();this.info={...this.info,rejected:next.length};}
 emit(event:ProgressEvent){
  if(this.queue.some(e=>e.id===event.id))return;
  this.progress=reduceEvent(this.progress,event);this.queue.push(event);this.persist();
  this.update({state:this.info.state==='expired'||this.info.state==='error'?this.info.state:'pending'});void this.flush();
 }
 private fail(e:unknown){this.failures++;this.update({state:e instanceof ApiError&&e.status===401?'expired':e instanceof ApiError&&e.status===403?'error':'offline'});}
 flush():Promise<boolean>{
  if(this.busy)return this.busy;
  this.busy=(async()=>{try{
   this.update({state:'saving'});
   if(!this.fetched){const r=await this.api('/progress');this.accept(r.version,r.progress);}
   let isolate=false;
   for(let attempt=0;this.queue.length&&attempt<30;attempt++){
    const batch=this.queue.slice(0,isolate?1:100);
    try{const r=await this.api('/progress','POST',{version:this.version,events:batch});const sent=new Set(batch.map(e=>e.id));this.queue=this.queue.filter(e=>!sent.has(e.id));this.persist();this.accept(r.version,r.progress);}
    catch(e){
     if(e instanceof ApiError&&e.status===409){const r=await this.api('/progress');this.accept(r.version,r.progress);continue;}
     if(e instanceof ApiError&&e.status===400){if(batch.length>1)isolate=true;else this.setAside(batch[0]);continue;}
     throw e;
    }
   }
   this.failures=0;
   if(this.queue.length){this.update({state:'pending'});return false;}
   this.update({state:'saved',lastSavedAt:Date.now()});return true;
  }catch(e){this.fail(e);return false;}finally{this.busy=null;}})();
  return this.busy;
 }
 /** Pick up progress saved on another device when nothing is waiting here. */
 async refresh(){if(this.queue.length||this.busy||!this.fetched)return this.flush();try{const r=await this.api('/progress');this.accept(r.version,r.progress);this.failures=0;this.update({state:'saved'});}catch(e){this.fail(e);}return true;}
}
/** Remove a pupil's cached snapshot at sign-out. Unsent events are kept until they reach the server. */
export function clearCloudCache(kv:KV|null,userId:string){try{if(!kv)return;kv.removeItem(snapshotKey(userId));const pending=read(kv,pendingKey(userId));if(!Array.isArray(pending)||!pending.length)kv.removeItem(pendingKey(userId));}catch{/* storage unavailable */}}
