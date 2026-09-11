import { createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
export const API_URL = import.meta.env.VITE_SCHOOL_API || 'https://math-for-primary-school-api.soujanya-poria.chatgpt.site';
export interface SchoolUser {id:string;schoolId:string;username:string;name:string;role:'student'|'teacher'|'admin';mustChange:boolean;schoolName:string;schoolCode:string;demo:boolean}
export class ApiError extends Error { constructor(public status:number,message:string,public data:any){super(message)} }
export async function apiRequest(path:string,token:string|null,method='GET',body?:unknown){
 const r=await fetch(API_URL+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 let data;try{data=await r.json()}catch{throw new Error('The school service is temporarily unavailable. Guest play is still available.');}
 if(!r.ok)throw new ApiError(r.status,data.error||'Request failed.',data);return data;
}
const KEY='math.school.session';
function readToken(){try{return sessionStorage.getItem(KEY)}catch{return null}}
function saveToken(value:string|null){try{if(value)sessionStorage.setItem(KEY,value);else sessionStorage.removeItem(KEY)}catch{/* memory-only session */}}
export interface SchoolClass {id:string;name:string;level:number;year:number;track:string}
interface AccountApi {classes:SchoolClass[];user:SchoolUser|null;token:string|null;loading:boolean;error:string;api:(path:string,method?:string,body?:unknown)=>Promise<any>;login:(schoolCode:string,username:string,password:string)=>Promise<void>;logout:()=>Promise<void>;refresh:()=>Promise<void>}
const Context=createContext<AccountApi|null>(null);
export function AccountProvider({children}:{children:ReactNode}){
 const [classes,setClasses]=useState<SchoolClass[]>([]);
 const [token,setToken]=useState(readToken),[user,setUser]=useState<SchoolUser|null>(null),[loading,setLoading]=useState(!!token),[error,setError]=useState('');
 const api=useCallback((path:string,method='GET',body?:unknown)=>apiRequest(path,token,method,body),[token]);
 const refresh=useCallback(async()=>{if(!token)return;const r=await api('/me');setUser(r.user);setClasses(r.classes);},[api,token]);
 useEffect(()=>{let live=true;if(!token){setLoading(false);return;}setLoading(true);api('/me').then(r=>{if(live){setUser(r.user);setClasses(r.classes)}}).catch(e=>{if(live){setError(e.message);if(e.status===401){saveToken(null);setToken(null)}}}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[api,token]);
 const login=useCallback(async(schoolCode:string,username:string,password:string)=>{const r=await apiRequest('/login',null,'POST',{schoolCode,username,password});saveToken(r.token);setUser(r.user);setToken(r.token);setError('');},[]);
 const logout=useCallback(async()=>{if(token)try{await api('/logout','POST',{})}catch(e){if(!(e instanceof ApiError&&e.status===401))throw e;}saveToken(null);setToken(null);setUser(null);setClasses([]);setError('');},[api,token]);
 const value=useMemo(()=>({classes,user,token,loading,error,api,login,logout,refresh}),[classes,user,token,loading,error,api,login,logout,refresh]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccount(){const c=useContext(Context);if(!c)throw new Error('AccountProvider missing');return c;}
