import { createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import { ApiError,apiRequest } from './api';
import { browserStorage,clearSessions } from '../primary/sessionStore';
import { clearCloudCache } from '../state/cloudSync';
export { API_URL,ApiError,NetworkError,apiRequest } from './api';
export interface SchoolUser {id:string;schoolId:string;username:string;name:string;role:'student'|'teacher'|'admin';mustChange:boolean;schoolName:string;schoolCode:string;demo:boolean}
const KEY='math.school.session',PROFILE='math.school.profile';
function readToken(){try{return sessionStorage.getItem(KEY)}catch{return null}}
function saveToken(value:string|null){try{if(value)sessionStorage.setItem(KEY,value);else sessionStorage.removeItem(KEY)}catch{/* memory-only session */}}
export interface SchoolClass {id:string;name:string;level:number;year:number;track:string}
interface Profile {user:SchoolUser;classes:SchoolClass[]}
/** The signed-in profile is cached for this tab only, so a pupil can keep learning through a brief outage. */
function readProfile():Profile|null{try{const p=JSON.parse(sessionStorage.getItem(PROFILE)||'null');return p?.user?.id?p:null}catch{return null}}
function saveProfile(p:Profile|null){try{if(p)sessionStorage.setItem(PROFILE,JSON.stringify(p));else sessionStorage.removeItem(PROFILE)}catch{/* memory-only session */}}
/** `offline`: signed in from the cached profile but the service is unreachable. `unreachable`: signed in, but no profile is available yet. */
export type Connection='online'|'offline'|'unreachable';
interface AccountApi {register:(schoolName:string,name:string,email:string,password:string)=>Promise<void>;classes:SchoolClass[];user:SchoolUser|null;token:string|null;loading:boolean;error:string;connection:Connection;api:(path:string,method?:string,body?:unknown)=>Promise<any>;login:(schoolCode:string,username:string,password:string)=>Promise<void>;logout:()=>Promise<void>;refresh:()=>Promise<void>;retry:()=>void;continueAsGuest:()=>void}
const Context=createContext<AccountApi|null>(null);
export function AccountProvider({children}:{children:ReactNode}){
 const [token,setToken]=useState(readToken),[cached]=useState(()=>token?readProfile():null);
 const [classes,setClasses]=useState<SchoolClass[]>(cached?.classes??[]),[user,setUser]=useState<SchoolUser|null>(cached?.user??null);
 const [loading,setLoading]=useState(!!token&&!cached),[error,setError]=useState(''),[connection,setConnection]=useState<Connection>('online'),[attempt,setAttempt]=useState(0);
 const api=useCallback((path:string,method='GET',body?:unknown)=>apiRequest(path,token,method,body),[token]);
 const accept=useCallback((u:SchoolUser,cs:SchoolClass[])=>{setUser(u);setClasses(cs);saveProfile({user:u,classes:cs});setConnection('online');setError('');},[]);
 const forget=useCallback(()=>{saveToken(null);saveProfile(null);setToken(null);setUser(null);setClasses([]);setConnection('online');},[]);
 const refresh=useCallback(async()=>{if(!token)return;const r=await api('/me');accept(r.user,r.classes);},[api,token,accept]);
 useEffect(()=>{let live=true;if(!token){setLoading(false);return;}
  api('/me').then(r=>{if(live)accept(r.user,r.classes)}).catch(e=>{if(!live)return;
   if(e instanceof ApiError&&e.status===401){forget();setError('Your session has ended. Please sign in again.');}
   else{setError(e.message);setConnection(readProfile()?'offline':'unreachable');}
  }).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[api,token,accept,forget,attempt]);
 const retry=useCallback(()=>{setConnection(c=>c==='unreachable'?c:'online');setAttempt(n=>n+1);},[]);
 const login=useCallback(async(schoolCode:string,username:string,password:string)=>{const r=await apiRequest('/login',null,'POST',{schoolCode,username,password});saveToken(r.token);setToken(r.token);accept(r.user,[]);},[accept]);
 const register=useCallback(async(schoolName:string,name:string,email:string,password:string)=>{const r=await apiRequest('/register-school',null,'POST',{schoolName,name,email,password});saveToken(r.token);setToken(r.token);accept(r.user,[]);},[accept]);
 const logout=useCallback(async()=>{if(token)try{await api('/logout','POST',{})}catch(e){if(!(e instanceof ApiError&&e.status===401))throw e;}
  // A shared school device should not keep a pupil's cached progress or unfinished activities.
  if(user?.role==='student'){const kv=browserStorage();clearCloudCache(kv,user.id);clearSessions(kv,'student:'+user.id);}
  forget();setError('');},[api,token,user,forget]);
 const value=useMemo(()=>({register,classes,user,token,loading,error,connection,api,login,logout,refresh,retry,continueAsGuest:forget}),[register,classes,user,token,loading,error,connection,api,login,logout,refresh,retry,forget]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccount(){const c=useContext(Context);if(!c)throw new Error('AccountProvider missing');return c;}
