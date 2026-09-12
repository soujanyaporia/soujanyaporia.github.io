import { sanitize,type ProgressState } from '../state/progress';
import { validateSession,type PrimarySession } from './session';
/**
 * Learning passport: a guest's progress and unfinished activities packed into a code (or a file holding
 * that code) that the guest keeps. Nothing is sent to a server. Opening the passport in another browser
 * restores the same progress there. It holds learning records only: the profile name is removed and no
 * account, school or device details are included.
 */
export const PASSPORT_PREFIX='MFP1-',PLAIN_PREFIX='MFP0-';
const KIND='maths-for-sg-primary-passport',MAX_CODE=600_000,MAX_JSON=3_000_000;
export interface Passport {progress:ProgressState;sessions:PrimarySession[];lessons:Record<string,unknown>;at:number}
const toB64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const fromB64=(text:string)=>{if(!/^[A-Za-z0-9_-]*$/.test(text))throw new Error('bad');const b=atob(text.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((text.length+3)%4));return Uint8Array.from(b,c=>c.charCodeAt(0));};
async function through(bytes:Uint8Array,stream:CompressionStream|DecompressionStream){return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());}
const anonymous=(p:ProgressState):ProgressState=>({...p,profile:{...p.profile,name:''}});
/** Lesson attempts travel as opaque records; only their shape is trusted, and only for known lessons. */
function lessonAttempts(raw:unknown):Record<string,unknown>{
 const out:Record<string,unknown>={};if(!raw||typeof raw!=='object')return out;
 for(const [id,a] of Object.entries(raw as Record<string,any>)){
  if(!/^[a-z0-9-]{3,60}$/.test(id)||!a||typeof a!=='object'||a.v!==1||a.lessonId!==id)continue;
  if(typeof a.attemptId!=='string'||!Number.isInteger(a.stage)||typeof a.items!=='object')continue;
  out[id]=a;
 }
 return out;
}
export async function makePassport(progress:ProgressState,sessions:PrimarySession[],{lessons={},now=Date.now()}:{lessons?:Record<string,unknown>;now?:number}={}):Promise<string>{
 const bytes=new TextEncoder().encode(JSON.stringify({kind:KIND,v:1,at:now,progress:anonymous(progress),sessions,lessons:lessonAttempts(lessons)}));
 return typeof CompressionStream==='function'?PASSPORT_PREFIX+toB64(await through(bytes,new CompressionStream('deflate-raw'))):PLAIN_PREFIX+toB64(bytes);
}
/** Read and strictly validate a passport. Throws an Error with a child-friendly message when it cannot be used. */
export async function readPassport(code:string):Promise<Passport>{
 const text=code.replace(/\s+/g,''),compressed=text.startsWith(PASSPORT_PREFIX);
 if(!compressed&&!text.startsWith(PLAIN_PREFIX))throw new Error('This is not a Maths for SG Primary Schools learning passport.');
 if(text.length>MAX_CODE)throw new Error('This passport is too large to open.');
 let bytes:Uint8Array;try{bytes=fromB64(text.slice(PASSPORT_PREFIX.length));}catch{throw new Error('The passport code is incomplete. Copy the whole code and try again.');}
 if(compressed){if(typeof DecompressionStream!=='function')throw new Error('This browser cannot open passports. Please update the browser and try again.');try{bytes=await through(bytes,new DecompressionStream('deflate-raw'));}catch{throw new Error('The passport code is damaged or incomplete. Copy the whole code and try again.');}}
 if(bytes.length>MAX_JSON)throw new Error('This passport is too large to open.');
 let data:any;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error('The passport code is damaged or incomplete. Copy the whole code and try again.');}
 if(data?.kind!==KIND)throw new Error('This is not a Maths for SG Primary Schools learning passport.');
 if(data.v!==1)throw new Error('This passport was made by a newer version of the app. Refresh the page and try again.');
 const progress=sanitize(data.progress);if(!progress)throw new Error('This passport does not contain valid progress.');
 const sessions=(Array.isArray(data.sessions)?data.sessions:[]).map((s:unknown)=>validateSession(s,Infinity)).filter((s:PrimarySession|null):s is PrimarySession=>!!s);
 return {progress:anonymous(progress),sessions,lessons:lessonAttempts(data.lessons),at:Number.isFinite(data.at)?data.at:0};
}
