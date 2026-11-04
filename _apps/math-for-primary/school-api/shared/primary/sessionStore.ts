import { combineSessions,validateSession,type PrimarySession } from './session';
/**
 * Browser copies of resumable sessions, one store per scope: `guest`, `staff:<id>` or `student:<id>`.
 * Scopes never share a key, so guest play and each account stay separate on a shared device.
 * `rev` is the last server revision seen (0 when never saved); `dirty` marks changes not yet uploaded.
 */
export interface KV {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export interface StoredSession {session:PrimarySession;rev:number;dirty:boolean}
export type SessionEntries=Record<string,StoredSession>;
const PREFIX='math-for-primary.sessions.v1:',DAY=86400000;
export const storageKey=(scope:string)=>PREFIX+scope;
export function browserStorage():KV|null{try{return typeof localStorage==='undefined'?null:localStorage}catch{return null}}
/** Keep the 60 most recent sessions; drop synced finished sessions after two days and anything after 120 days. */
export function prune(entries:SessionEntries,now=Date.now()):SessionEntries{
 return Object.fromEntries(Object.entries(entries).filter(([,e])=>e.dirty||(now-e.session.updatedAt<120*DAY&&(e.session.completedAt===null||now-e.session.updatedAt<2*DAY))).sort((a,b)=>b[1].session.updatedAt-a[1].session.updatedAt).slice(0,60));
}
export function readSessions(kv:KV|null,scope:string):SessionEntries{
 try{const raw=kv?.getItem(storageKey(scope)),data=raw?JSON.parse(raw):null;if(!data||data.scope!==scope||typeof data.entries!=='object')return {};
  const out:SessionEntries={};for(const [activityId,e] of Object.entries<any>(data.entries)){const session=validateSession(e?.session,Infinity);if(session&&session.activityId===activityId)out[activityId]={session,rev:Number.isInteger(e.rev)&&e.rev>=0?e.rev:0,dirty:!!e.dirty};}
  return prune(out);}catch{return {}}
}
export function writeSessions(kv:KV|null,scope:string,entries:SessionEntries){try{if(!kv)return false;kv.setItem(storageKey(scope),JSON.stringify({scope,entries:prune(entries)}));return true;}catch{return false}}
export function clearSessions(kv:KV|null,scope:string){try{kv?.removeItem(storageKey(scope))}catch{/* storage unavailable */}}
/** Stable store methods let React update a draft without restarting the account-sync effect. */
export function createSessionCache(kv:KV|null,scope:string){
 let entries=readSessions(kv,scope),persistent=!!kv;
 return {
  read(){if(persistent)entries=readSessions(kv,scope);return entries;},
  write(next:SessionEntries){persistent=writeSessions(kv,scope,next);entries=persistent?readSessions(kv,scope):prune(next);return entries;},
  reload(){
   const stored=readSessions(kv,scope);
   if(persistent){entries=stored;return entries;}
   // Another tab's storage event does not prove our failed write was saved.
   // Merge new remote work while retaining newer drafts and pending uploads in memory.
   const merged={...stored};
   for(const [id,local] of Object.entries(entries)){
    const other=stored[id];
    merged[id]=other?{session:combineSessions(local.session,other.session)!,rev:Math.max(local.rev,other.rev),dirty:local.dirty||other.dirty}:local;
   }
   entries=prune(merged);return entries;
  },
  clear(){clearSessions(kv,scope);entries={};return entries;},
  get persistent(){return persistent;},
 };
}
