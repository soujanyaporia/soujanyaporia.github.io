import { freshSeed } from '../engine/random';
import { newSessionId } from '../primary/session';
import type { KV } from '../primary/sessionStore';
import type { Tool } from '../teach/model';
import { MISSIONS,MISSION_ROUNDS,type Mission } from './catalog';
import { makeMission } from './generate';
export interface MissionRun {v:1;id:string;seed:number;round:number;tool:Tool;tries:number;hints:number;clean:number;checked:boolean;hint:boolean;finishedAt:number|null;updatedAt:number;}
const PREFIX='math-for-primary.missions.v1:';
export const missionKey=(scope:string,id:string)=>`${PREFIX}${scope}:${id}`;
export function freshRun(m:Mission):MissionRun{const seed=freshSeed();return {v:1,id:newSessionId(),seed,round:0,tool:makeMission(m,seed,0).initial,tries:0,hints:0,clean:0,checked:false,hint:false,finishedAt:null,updatedAt:Date.now()};}
const int=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const nums=(v:unknown,min:number,max:number,n:number)=>Array.isArray(v)&&v.length===n&&v.every(x=>int(x,min,max));
/** Restore only the editable fields of a known puzzle. Givens and display text come from the generator. */
export function restoreTool(initial:Tool,value:unknown):Tool|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;if(v.kind!==initial.kind)return null;
 switch(initial.kind){
  case 'counters':return int(v.count,0,initial.frame??10)?{...initial,count:v.count}:null;
  case 'bond':return nums(v.parts,0,initial.whole,2)&&(v.parts as number[]).reduce((a,b)=>a+b,0)===initial.whole?{...initial,parts:v.parts as [number,number]}:null;
  case 'line':{if(!Array.isArray(v.jumps)||v.jumps.length>120||!v.jumps.every(n=>int(n,-20,20)))return null;let at=initial.start;for(const n of v.jumps){at+=n;if(at<initial.min||at>initial.max)return null;}return {...initial,jumps:v.jumps};}
  case 'take-away':return Array.isArray(v.removed)&&v.removed.length<=initial.start&&v.removed.every(n=>int(n,0,initial.start-1))&&new Set(v.removed).size===v.removed.length?{...initial,removed:v.removed}:null;
  case 'groups':return int(v.groups,0,10)&&int(v.size,0,10)?{...initial,groups:v.groups,size:v.size}:null;
  case 'array':return int(v.rows,1,10)&&int(v.cols,1,10)?{...initial,rows:v.rows,cols:v.cols}:null;
  case 'share':return nums(v.given,0,initial.total,initial.people)&&(v.given as number[]).reduce((a,b)=>a+b,0)<=initial.total?{...initial,given:v.given as number[]}:null;
  case 'fractions':return Array.isArray(v.shaded)&&v.shaded.length===initial.denominators.length&&v.shaded.every((n,i)=>int(n,0,initial.denominators[i]))?{...initial,shaded:v.shaded}:null;
  case 'bar':return nums(v.parts,0,30,initial.parts.length)?{...initial,parts:v.parts as number[],whole:(v.parts as number[]).reduce((a,b)=>a+b,0)}:null;
  case 'geometry':{const max=initial.mode==='clock'?1439:initial.mode==='angle'?180:initial.mode==='mirror'?6:12,min=['rectangle','solid'].includes(initial.mode)?1:0;if(!int(v.a,min,max)||!int(v.b,min,initial.mode==='mirror'?6:12))return null;return {...initial,a:v.a,b:v.b};}
  case 'place':return int(v.wholes,0,9)&&nums(v.digits,0,9,initial.digits.length)?{...initial,wholes:v.wholes,digits:v.digits as number[]}:null;
  case 'hundred':return int(v.shaded,0,100)?{...initial,shaded:v.shaded}:null;
  case 'percent':return int(v.percent,0,100)&&v.percent%(initial.step??10)===0?{...initial,percent:v.percent}:null;
  case 'triangle-pair':return typeof v.joined==='boolean'?{...initial,joined:v.joined}:null;
  case 'ratio':return nums(v.units,1,9,initial.units.length)?{...initial,units:v.units as number[]}:null;
  case 'balance':{const left=v.left as {x:unknown;n:unknown}|undefined,right=v.right as {x:unknown;n:unknown}|undefined;return left&&right&&int(left.x,0,initial.left.x)&&int(left.n,0,initial.left.n)&&int(right.x,0,initial.right.x)&&int(right.n,0,initial.right.n)?{...initial,left:{x:left.x,n:left.n},right:{x:right.x,n:right.n}}:null;}
  default:return null;
 }
}
export function validateRun(m:Mission,r:any):MissionRun|null{
 try{if(r?.v!==1||typeof r.id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(r.id)||!int(r.seed,0,0xffffffff)||!int(r.round,0,MISSION_ROUNDS-1)||!int(r.tries,0,10000)||!int(r.hints,0,10000)||!int(r.clean,0,r.round+1)||typeof r.checked!=='boolean'||typeof r.hint!=='boolean'||!int(r.updatedAt,0,1e15)||(r.finishedAt!==null&&!int(r.finishedAt,0,1e15)))return null;
 const p=makeMission(m,r.seed,r.round),tool=restoreTool(p.initial,r.tool);if(!tool||r.checked&&!p.accepts(tool)||r.finishedAt!==null&&(!r.checked||r.round!==MISSION_ROUNDS-1))return null;
 return {v:1,id:r.id,seed:r.seed,round:r.round,tool,tries:r.tries,hints:r.hints,clean:r.clean,checked:r.checked,hint:r.hint,finishedAt:r.finishedAt,updatedAt:r.updatedAt};}catch{return null;}
}
export function readRun(kv:KV|null,scope:string,m:Mission):MissionRun|null{try{const raw=kv?.getItem(missionKey(scope,m.id));return raw&&raw.length<=24000?validateRun(m,JSON.parse(raw)):null;}catch{return null;}}
export function readMissionRuns(kv:KV|null,scope:string):Record<string,MissionRun>{const out:Record<string,MissionRun>={};for(const m of MISSIONS){const run=readRun(kv,scope,m);if(run)out[m.id]=run;}return out;}
export function validateMissionRuns(raw:unknown):Record<string,MissionRun>{const out:Record<string,MissionRun>={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;for(const m of MISSIONS){const r=validateRun(m,(raw as Record<string,unknown>)[m.id]);if(r)out[m.id]=r;}return out;}
export function restoreMissionRuns(kv:KV|null,scope:string,runs:Record<string,MissionRun>){clearMissionRuns(kv,scope);for(const m of MISSIONS)if(runs[m.id])writeRun(kv,scope,m,runs[m.id]);}
export function writeRun(kv:KV|null,scope:string,m:Mission,r:MissionRun):boolean{try{if(!kv)return false;kv.setItem(missionKey(scope,m.id),JSON.stringify(r));return true;}catch{return false;}}
export function clearMissionRuns(kv:KV|null,scope:string){try{for(const m of MISSIONS)kv?.removeItem(missionKey(scope,m.id));}catch{/* unavailable */}}
