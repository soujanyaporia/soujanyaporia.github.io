import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { newBadges,type BadgeDef } from '../content/badges';
import type { AttemptOutcome } from '../engine/stats';
import { initialProgress,localRepository,localStorageRepository,progressKeyFor,type ProgressRepository,type ProgressState,type Settings } from './progress';
import { reduceEvent,type ProgressEvent } from '../school/events';
import { useAccount } from '../school/AccountContext';
import { CloudSync,syncLabel,type SyncInfo } from './cloudSync';
import { browserStorage,type KV } from '../primary/sessionStore';
interface ProgressApi {emit:(e:ProgressEvent)=>void;progress:ProgressState;recordAttempt:(o:AttemptOutcome)=>void;completeSession:(stars:number,lessonId?:string)=>BadgeDef[];updateSettings:(patch:Partial<Settings>)=>void;reset:()=>void;sync:()=>Promise<boolean>;syncStatus:string;status:SyncInfo;scope:string;restoreLocal:(state:ProgressState)=>boolean}
const ProgressContext=createContext<ProgressApi|null>(null);
const memory=():KV=>{const m=new Map<string,string>();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>void m.set(k,v),removeItem:k=>void m.delete(k)};};
/**
 * Guest and staff progress stays in this browser, each scope under its own key; changes in another tab
 * are followed, and every event is applied to the latest stored state. Pupil progress is uploaded as
 * learning events through CloudSync.
 */
export function ProgressProvider({children,repository}:{children:ReactNode;repository?:ProgressRepository}){
 const {user,api}=useAccount();const cloud=!!user&&user.role==='student'&&!user.mustChange;
 const scope=!user?'guest':`${user.role==='student'?'student':'staff'}:${user.id}`;
 const repo=useMemo(()=>repository??(scope==='guest'?localStorageRepository:localRepository(progressKeyFor(scope))),[repository,scope]);
 const apiRef=useRef(api);apiRef.current=api;
 const notify=useRef((_:CloudSync)=>{});
 const [engine]=useState(()=>cloud?new CloudSync(user!.id,(path,method,body)=>apiRef.current(path,method,body),browserStorage()??memory(),s=>notify.current(s)):null);
 const [progress,setProgress]=useState<ProgressState>(()=>engine?engine.progress:repo.load()??initialProgress());
 const [status,setStatus]=useState<SyncInfo>(()=>engine?engine.info:{state:'local',pending:0,rejected:0,lastSavedAt:null});
 const [ready,setReady]=useState(()=>!engine||engine.ready);
 notify.current=s=>{setProgress(s.progress);setStatus(s.info);setReady(r=>r||s.ready);};
 const current=useRef(progress);current.current=progress;
 useEffect(()=>{if(!engine)return;let live=true,timer=0;
  const tick=async()=>{if(!live)return;if(engine.needsSync())await engine.flush();if(live)timer=window.setTimeout(tick,engine.nextDelay());};void tick();
  const wake=()=>{void engine.refresh();},visible=()=>{if(document.visibilityState==='visible')wake();};
  const unload=(e:BeforeUnloadEvent)=>{if(engine.queue.length){e.preventDefault();e.returnValue='';}};
  window.addEventListener('online',wake);window.addEventListener('focus',wake);document.addEventListener('visibilitychange',visible);window.addEventListener('beforeunload',unload);
  return()=>{live=false;clearTimeout(timer);window.removeEventListener('online',wake);window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',visible);window.removeEventListener('beforeunload',unload);};},[engine]);
 useEffect(()=>{if(engine||!repo.key)return;const key=repo.key;const onStorage=(e:StorageEvent)=>{if(e.key===key){const next=repo.load();if(next){current.current=next;setProgress(next);}}};window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);},[engine,repo]);
 const emit=useCallback((event:ProgressEvent)=>{if(engine){engine.emit(event);return;}const next=reduceEvent(repo.load()??current.current,event);current.current=next;repo.save(next);setProgress(next);},[engine,repo]);
 const recordAttempt=useCallback((outcome:AttemptOutcome)=>emit({id:crypto.randomUUID(),at:Date.now(),kind:'attempt',outcome}),[emit]);
 const completeSession=useCallback((stars:number,lessonId?:string)=>{const e:ProgressEvent={id:crypto.randomUUID(),at:Date.now(),kind:'session',stars,lessonId};const before=engine?engine.progress:current.current;const earned=newBadges({...reduceEvent(before,e),badges:before.badges});emit(e);return earned;},[emit,engine]);
 const updateSettings=useCallback((patch:Partial<Settings>)=>emit({id:crypto.randomUUID(),at:Date.now(),kind:'settings',patch}),[emit]);
 const reset=useCallback(()=>{if(engine)return;repo.clear();const next={...initialProgress(),settings:current.current.settings};current.current=next;repo.save(next);setProgress(next);},[engine,repo]);
 const sync=useCallback(()=>engine?engine.flush():Promise.resolve(true),[engine]);
 /** Replace guest or staff progress in this browser (learning passport). Pupil progress lives in the school account. */
 const restoreLocal=useCallback((state:ProgressState)=>{if(engine)return false;current.current=state;repo.save(state);setProgress(state);return true;},[engine,repo]);
 const syncStatus=syncLabel(status);
 const value=useMemo(()=>({emit,progress,recordAttempt,completeSession,updateSettings,reset,sync,syncStatus,status,scope,restoreLocal}),[emit,progress,recordAttempt,completeSession,updateSettings,reset,sync,syncStatus,status,scope,restoreLocal]);
 return <ProgressContext.Provider value={value}>{ready?children:<main className="school-page loading-page" aria-busy="true"><p className="school-eyebrow">Your learning journal</p><h1>{status.state==='offline'?'We can’t reach your school account yet.':'Opening your learning journal…'}</h1><p role="status">{status.state==='offline'?'Check the connection. Nothing you have saved will be lost; we will keep trying.':syncStatus}</p><div className="loading-actions"><button className="btn" onClick={()=>void engine?.flush()}>Try again</button><a href="#/account" onClick={()=>setReady(true)}>Account settings</a></div></main>}</ProgressContext.Provider>;
}
export function useProgress(){const c=useContext(ProgressContext);if(!c)throw new Error('ProgressProvider missing');return c;}
