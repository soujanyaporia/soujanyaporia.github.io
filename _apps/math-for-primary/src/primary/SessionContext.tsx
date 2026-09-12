import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { ApiError,useAccount } from '../school/AccountContext';
import { useProgress } from '../state/ProgressContext';
import { combineSessions,mergeSameSession,validateSession,type PrimarySession } from './session';
import { browserStorage,clearSessions,readSessions,storageKey,writeSessions,type SessionEntries } from './sessionStore';
import { combineAll,sessionsFromHistory,unfinishedSessions } from './resume';
/** `unsupported`: the account API predates the sessions endpoint, so drafts stay on this device. */
export type RemoteState='local'|'checking'|'ready'|'unsupported'|'offline';
interface SessionsApi {scope:string;all:Record<string,PrimarySession>;unfinished:PrimarySession[];get:(activityId:string)=>PrimarySession|undefined;save:(s:PrimarySession,draft?:boolean)=>PrimarySession;remote:RemoteState;isUploaded:(activityId:string)=>boolean;restore:(sessions:PrimarySession[])=>void;clear:()=>void}
const Context=createContext<SessionsApi|null>(null);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Continue lists real work: a recorded answer, working on the current question, or an open repair. Merely opening an activity is not enough. */
const hasWork=(s:PrimarySession)=>s.mode==='repair'||s.results.length>0||!!s.draft&&(!!s.draft.value||s.draft.picks.length>0||s.draft.shaded.length>0||s.draft.tries>0||s.draft.hint);
/**
 * Resumable sessions for the current scope. Every change is written to this browser first. Pupils also
 * upload sessions (including drafts) when the account API offers `/sessions`; otherwise, and as the
 * final word on scored answers, sessions are rebuilt from the saved answer history.
 */
export function SessionProvider({children}:{children:ReactNode}){
 const {user,api}=useAccount(),{progress,scope}=useProgress();
 const student=!!user&&user.role==='student'&&!user.mustChange&&scope===`student:${user.id}`;
 const kv=useMemo(browserStorage,[]);
 const [entries,setEntries]=useState<SessionEntries>(()=>readSessions(kv,scope));
 const [remote,setRemoteState]=useState<RemoteState>(student?'checking':'local');
 const remoteRef=useRef(remote),apiRef=useRef(api),timers=useRef(new Map<string,number>()),uploading=useRef(new Set<string>());apiRef.current=api;
 const setRemote=useCallback((r:RemoteState)=>{remoteRef.current=r;setRemoteState(r);},[]);
 const commit=useCallback((next:SessionEntries)=>{writeSessions(kv,scope,next);setEntries(readSessions(kv,scope));},[kv,scope]);
 const latest=useCallback(()=>kv?readSessions(kv,scope):entries,[kv,scope,entries]);
 useEffect(()=>{const key=storageKey(scope);const onStorage=(e:StorageEvent)=>{if(e.key===key)setEntries(readSessions(kv,scope));};window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);},[kv,scope]);
 const upload=useCallback(async(activityId:string)=>{
  if(!student||remoteRef.current==='unsupported'||uploading.current.has(activityId))return;uploading.current.add(activityId);
  try{for(let attempt=0;attempt<3;attempt++){const e=latest()[activityId];if(!e?.dirty)return;
   try{const r=await apiRef.current('/sessions/'+encodeURIComponent(activityId),'POST',{session:e.session,baseRev:e.rev});const now=latest()[activityId];
    const unchanged=!!now&&same(now.session,e.session);commit({...latest(),[activityId]:{session:now?.session??e.session,rev:r.rev,dirty:!unchanged}});setRemote('ready');if(unchanged)return;}
   catch(err){
    if(err instanceof ApiError&&err.status===409){const server=err.data?.session?validateSession(err.data.session,Infinity):null,cur=latest()[activityId];if(!cur)return;
     const chosen=server?combineSessions(cur.session,server)!:cur.session;commit({...latest(),[activityId]:{session:chosen,rev:Number(err.data?.rev)||0,dirty:!(server&&same(chosen,server))}});continue;}
    if(err instanceof ApiError&&err.status===404){setRemote('unsupported');return;}
    if(err instanceof ApiError&&err.status===400){commit({...latest(),[activityId]:{...e,dirty:false}});return;}
    setRemote('offline');return;}}}
  finally{uploading.current.delete(activityId);}
 },[student,latest,commit,setRemote]);
 const schedule=useCallback((activityId:string,delay:number)=>{clearTimeout(timers.current.get(activityId));timers.current.set(activityId,window.setTimeout(()=>void upload(activityId),delay));},[upload]);
 const pull=useCallback(async()=>{
  if(!student||remoteRef.current==='unsupported')return;
  try{const r=await apiRef.current('/sessions');const next={...latest()};
   for(const raw of Array.isArray(r.sessions)?r.sessions:[]){const s=validateSession(raw,Infinity);if(!s)continue;const rev=Number(raw.rev)||0,local=next[s.activityId];
    if(!local){next[s.activityId]={session:s,rev,dirty:false};continue;}
    const chosen=combineSessions(local.session,s)!;next[s.activityId]={session:chosen,rev,dirty:!same(chosen,s)};}
   commit(next);setRemote('ready');for(const [id,e] of Object.entries(next))if(e.dirty)void upload(id);}
  catch(err){setRemote(err instanceof ApiError&&err.status===404?'unsupported':'offline');}
 },[student,latest,commit,upload,setRemote]);
 useEffect(()=>{if(!student)return;void pull();const wake=()=>{if(document.visibilityState==='visible')void pull();};
  window.addEventListener('online',wake);window.addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
  return()=>{window.removeEventListener('online',wake);window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);};},[student,pull]);
 useEffect(()=>()=>{for(const t of timers.current.values())clearTimeout(t);},[]);
 const save=useCallback((session:PrimarySession,draft=false)=>{
  const current=latest(),prev=current[session.activityId];
  const merged=prev&&prev.session.id===session.id?mergeSameSession(session,prev.session):session;
  const upload=student&&remoteRef.current!=='unsupported';
  commit({...current,[session.activityId]:{session:merged,rev:prev?.rev??0,dirty:upload}});if(upload)schedule(session.activityId,draft?1200:150);
  return merged;
 },[latest,commit,schedule,student]);
 /** Replace this scope's sessions (learning passport) or remove them (clearing guest data). */
 const restore=useCallback((sessions:PrimarySession[])=>{const next:SessionEntries={};for(const s of sessions)next[s.activityId]={session:combineSessions(next[s.activityId]?.session,s)!,rev:0,dirty:false};commit(next);},[commit]);
 const clear=useCallback(()=>{clearSessions(kv,scope);setEntries({});},[kv,scope]);
 const history=progress.primary?.history;
 const all=useMemo(()=>combineAll(Object.values(entries).map(e=>e.session),sessionsFromHistory(history)),[entries,history]);
 const value=useMemo<SessionsApi>(()=>({scope,all,unfinished:unfinishedSessions(all).filter(hasWork),get:id=>all[id],save,remote,isUploaded:id=>!!entries[id]&&!entries[id].dirty&&entries[id].rev>0,restore,clear}),[scope,all,save,remote,entries,restore,clear]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSessions(){const c=useContext(Context);if(!c)throw new Error('SessionProvider missing');return c;}
