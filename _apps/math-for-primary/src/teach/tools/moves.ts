import {toggleFractionPiece} from './geometry';
import {geometryMoves} from './GeometryWorkbench';
import type { Tool } from '../model';
/**
 * The states one press of each on-screen control can reach, per manipulative. This mirrors the
 * controls rendered in `tools/Tools.tsx`, and the lesson tests search it to prove that every explore
 * goal can actually be reached by a pupil with the buttons in front of them. A goal that needs a
 * control the tool does not offer is a dead end, however sensible the mathematics looks.
 *
 * Keep this in step with `Tools.tsx`: a control added or removed there belongs here too.
 */
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function movesFor(t:Tool):Tool[]{
 switch(t.kind){
  case 'take-away':return Array.from({length:t.start},(_,i)=>({...t,removed:t.removed.includes(i)?t.removed.filter(n=>n!==i):[...t.removed,i].sort((a,b)=>a-b)}));
  case 'triangle-pair':return [{...t,joined:!t.joined}];
  case 'fraction-pieces':return t.widths.map((_,i)=>toggleFractionPiece(t,i));
  case 'geometry':return geometryMoves(t);
  case 'net-model':case 'diagram':case 'focus':case 'scene':case 'foundation-visual':case 'table':return [];
  // Every cell is clickable, and a stepper covers the rest, so any count is one press away.
  case 'counters':{const cap=t.frame??10,out:Tool[]=[];for(let n=0;n<=cap;n++)if(n!==t.count)out.push({...t,count:n});return out;}
  // A counter moves between the two parts; the whole never changes.
  case 'bond':{if(t.locked)return [];const [a,b]=t.parts,out:Tool[]=[];
   if(a>0)out.push({...t,parts:[a-1,b+1]});if(b>0)out.push({...t,parts:[a+1,b-1]});return out;}
  // Display only: the bar model has no controls at all.
  case 'bar':return [];
  // Jump buttons and undo. The pupil cannot move the start or the mark.
  case 'line':{const at=t.start+t.jumps.reduce((s,j)=>s+j,0),out:Tool[]=[];
   for(const j of [-10,-1,1,10])if(Math.abs(j)<=t.max-t.min&&at+j>=t.min&&at+j<=t.max)out.push({...t,jumps:[...t.jumps,j]});
   if(t.jumps.length)out.push({...t,jumps:t.jumps.slice(0,-1)});return out;}
  case 'groups':{const limit=t.limit??10,out:Tool[]=[];
   for(const g of [t.groups-1,t.groups+1])if(g>=0&&g<=limit)out.push({...t,groups:g});
   for(const s of [t.size-1,t.size+1])if(s>=0&&s<=limit)out.push({...t,size:s});return out;}
  case 'array':{const out:Tool[]=[];
   for(const r of [t.rows-1,t.rows+1])if(r>=1&&r<=10)out.push({...t,rows:r});
   for(const c of [t.cols-1,t.cols+1])if(c>=1&&c<=10)out.push({...t,cols:c});
   out.push({...t,rows:t.cols,cols:t.rows});return out;}
  case 'share':{const left=t.total-t.given.reduce((s,g)=>s+g,0),size=t.size??1,out:Tool[]=[];
   if(t.mode==='group'){if(left>=size)out.push({...t,given:[...t.given,size]});if(t.given.length)out.push({...t,given:[]});return out;}
   if(left>0)for(let i=0;i<t.given.length;i++)out.push({...t,given:t.given.map((g,j)=>j===i?g+1:g)});
   if(left>=t.given.length&&t.given.length)out.push({...t,given:t.given.map(g=>g+1)});
   if(t.given.some(Boolean))out.push({...t,given:t.given.map(()=>0)});return out;}
  // Clicking part k of a row shades k+1, or unshades back to k.
  case 'fractions':{const out:Tool[]=[];t.denominators.forEach((d,row)=>{for(let n=0;n<=d;n++)if(n!==t.shaded[row])out.push({...t,shaded:t.shaded.map((s,i)=>i===row?n:s)});});return out;}
  // Each decimal digit has plus and minus buttons; the whole-number column is fixed.
  case 'place':{const out:Tool[]=[];t.digits.forEach((d,i)=>{for(const v of [d-1,d+1]){const n=clamp(v,0,9);if(n!==d)out.push({...t,digits:t.digits.map((x,j)=>j===i?n:x)});}});return out;}
  case 'hundred':{const out:Tool[]=[];for(let n=0;n<=100;n++)if(n!==t.shaded)out.push({...t,shaded:n});return out;}
  case 'percent':{const step=t.step??10,out:Tool[]=[];
   if(t.percent>0)out.push({...t,percent:Math.max(0,t.percent-step)});
   if(t.percent<100)out.push({...t,percent:Math.min(100,t.percent+step)});return out;}
  case 'ratio':{const out:Tool[]=[];t.units.forEach((u,i)=>{for(const n of [u-1,u+1])if(n>=1&&n<=9)out.push({...t,units:t.units.map((x,j)=>j===i?n:x)});});return out;}
  case 'balance':{const out:Tool[]=[],both=(f:(s:{x:number;n:number})=>{x:number;n:number}):Tool=>({...t,left:f(t.left),right:f(t.right)});
   if(t.left.n&&t.right.n)out.push(both(s=>({...s,n:s.n-1})));
   if(t.left.x&&t.right.x)out.push(both(s=>({...s,x:s.x-1})));
   const divisor=[2,3,4,5,6,7,8,9].find(k=>t.left.x%k===0&&t.right.x%k===0&&t.left.n%k===0&&t.right.n%k===0&&t.left.x+t.right.x+t.left.n+t.right.n>0);
   if(divisor)out.push(both(s=>({x:s.x/divisor,n:s.n/divisor})));
   if(t.left.n)out.push({...t,left:{...t.left,n:t.left.n-1}});
   return out;}
 }
}
/** Can the pupil reach a state the goal accepts, using only those controls? */
export function goalState(start:Tool,goal:(t:Tool)=>boolean,maxPresses=10,budget=40000):Tool|null{
 if(goal(start))return start;
 const seen=new Set<string>([JSON.stringify(start)]);
 let frontier:Tool[]=[start];
 for(let depth=0;depth<maxPresses&&frontier.length;depth++){
  const next:Tool[]=[];
  for(const state of frontier)for(const move of movesFor(state)){
   const key=JSON.stringify(move);
   if(seen.has(key))continue;
   if(goal(move))return move;
   seen.add(key);next.push(move);
   if(seen.size>budget)return null;
  }
  frontier=next;
 }
 return null;
}

export const goalReachable=(start:Tool,goal:(t:Tool)=>boolean,maxPresses=10,budget=40000)=>goalState(start,goal,maxPresses,budget)!==null;
