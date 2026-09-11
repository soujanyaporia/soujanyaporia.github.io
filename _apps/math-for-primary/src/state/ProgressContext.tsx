import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { newBadges,type BadgeDef } from '../content/badges';
import type { AttemptOutcome } from '../engine/adaptive';
import { initialProgress,localStorageRepository,type ProgressRepository,type ProgressState,type Settings } from './progress';
import { reduceEvent,type ProgressEvent } from '../school/events';
import { useAccount,ApiError } from '../school/AccountContext';
interface ProgressApi {progress:ProgressState;recordAttempt:(o:AttemptOutcome)=>void;completeSession:(stars:number,lessonId?:string)=>BadgeDef[];updateSettings:(patch:Partial<Settings>)=>void;reset:()=>void;sync:()=>Promise<boolean>;syncStatus:string}
const ProgressContext=createContext<ProgressApi|null>(null);
export function ProgressProvider({children,repository=localStorageRepository}:{children:ReactNode;repository?:ProgressRepository}){
 const {user,api}=useAccount();const cloud=user?.role==='student'&&!user.mustChange;const key='math.school.pending.'+user?.id;
 const [progress,setProgress]=useState(()=>cloud?initialProgress():repository.load()??initialProgress());
 const current=useRef(progress),queue=useRef<ProgressEvent[]>([]),version=useRef(0),busy=useRef<Promise<boolean>|null>(null),alive=useRef(true),readyRef=useRef(!cloud);
 const [ready,setReady]=useState(!cloud),[syncStatus,setSyncStatus]=useState(cloud?'Connecting…':'Saved on this device');
 const commit=useCallback((s:ProgressState)=>{current.current=s;setProgress(s);if(!cloud)repository.save(s)},[cloud,repository]);
 const saveQueue=useCallback(()=>{try{localStorage.setItem(key,JSON.stringify(queue.current))}catch{setSyncStatus('Storage unavailable — keep this tab open until synced');}},[key]);
 const sync=useCallback(async():Promise<boolean>=>{
  if(!cloud)return true;if(busy.current)return busy.current;
  const task=(async()=>{try{
   setSyncStatus('Syncing…');
   if(!readyRef.current){const r=await api('/progress');if(!alive.current)return false;version.current=r.version;commit(queue.current.reduce(reduceEvent,r.progress));readyRef.current=true;setReady(true);}
   for(let attempt=0;queue.current.length&&attempt<8;attempt++){
    const batch=queue.current.slice(0,100);
    try{const r=await api('/progress','POST',{version:version.current,events:batch});if(!alive.current)return false;const sent=new Set(batch.map(e=>e.id));queue.current=queue.current.filter(e=>!sent.has(e.id));version.current=r.version;saveQueue();commit(queue.current.reduce(reduceEvent,r.progress));}
    catch(e){if(e instanceof ApiError&&e.status===409){const r=await api('/progress');version.current=r.version;commit(queue.current.reduce(reduceEvent,r.progress));}else throw e;}
   }
   if(queue.current.length){setSyncStatus('Still syncing — keep this tab open');return false;}
   setSyncStatus('Saved to your school account');return true;
  }catch(e){if(alive.current)setSyncStatus(e instanceof ApiError&&e.status===401?'Session expired — sign in again to sync':'Offline or service unavailable — progress waiting to sync');return false;}
  finally{busy.current=null;}})();busy.current=task;return task;
 },[api,cloud,commit,saveQueue]);
 useEffect(()=>{alive.current=true;if(cloud){try{const saved=JSON.parse(localStorage.getItem(key)||'[]');queue.current=Array.isArray(saved)?saved:[]}catch{queue.current=[]}void sync();}return()=>{alive.current=false}},[cloud,key,sync]);
 useEffect(()=>{if(!cloud)return;const timer=window.setInterval(()=>{if(queue.current.length||!readyRef.current)void sync()},5000);const onFocus=()=>{if(queue.current.length||!readyRef.current)void sync();else api('/progress').then(r=>{if(alive.current&&!queue.current.length){version.current=r.version;commit(r.progress)}}).catch(()=>{})};window.addEventListener('online',onFocus);window.addEventListener('focus',onFocus);const unload=(e:BeforeUnloadEvent)=>{if(queue.current.length){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',unload);return()=>{clearInterval(timer);window.removeEventListener('online',onFocus);window.removeEventListener('focus',onFocus);window.removeEventListener('beforeunload',unload)}},[cloud,sync,api,commit]);
 const emit=useCallback((event:ProgressEvent)=>{commit(reduceEvent(current.current,event));if(cloud){queue.current.push(event);saveQueue();setSyncStatus('Changes waiting to sync');void sync();}},[cloud,commit,saveQueue,sync]);
 const recordAttempt=useCallback((outcome:AttemptOutcome)=>emit({id:crypto.randomUUID(),at:Date.now(),kind:'attempt',outcome}),[emit]);
 const completeSession=useCallback((stars:number,lessonId?:string)=>{const e:ProgressEvent={id:crypto.randomUUID(),at:Date.now(),kind:'session',stars,lessonId};const before=current.current;const earned=newBadges({...reduceEvent(before,e),badges:before.badges});emit(e);return earned;},[emit]);
 const updateSettings=useCallback((patch:Partial<Settings>)=>emit({id:crypto.randomUUID(),at:Date.now(),kind:'settings',patch}),[emit]);
 const reset=useCallback(()=>{if(cloud)return;repository.clear();commit({...initialProgress(),settings:current.current.settings})},[cloud,commit,repository]);
 const value=useMemo(()=>({progress,recordAttempt,completeSession,updateSettings,reset,sync,syncStatus}),[progress,recordAttempt,completeSession,updateSettings,reset,sync,syncStatus]);
 return <ProgressContext.Provider value={value}>{ready?children:<main className="school-page"><h1>Opening your learning journal…</h1><p role="status">{syncStatus}</p><button className="btn" onClick={()=>void sync()}>Try again</button><a href="#/account" onClick={()=>{setReady(true)}}>Account settings</a></main>}</ProgressContext.Provider>;
}
export function useProgress(){const c=useContext(ProgressContext);if(!c)throw new Error('ProgressProvider missing');return c;}
