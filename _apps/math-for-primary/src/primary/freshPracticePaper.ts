import type {Track} from '../school/curriculum';
import type {KV} from './sessionStore';
import {paperReasoningFamily} from './paperBlueprints';
import {generatePracticePaper,type PaperRequest,type PracticePaper} from './practicePaper';

/** Only reasoning-family identifiers are retained, never question text or answers. */
export interface PaperHistoryEntry {level:number;track:Track;families:string[]}
const PREFIX='math-for-primary.paper-history.v1:',MAX_TOTAL=48,MAX_PER_PATH=6,LOOKBACK=4;
const familyPattern=/^[a-zA-Z0-9:_-]{1,160}$/;
const isEntry=(x:unknown):x is PaperHistoryEntry=>{
 if(!x||typeof x!=='object')return false;const v=x as Record<string,unknown>;
 return Number.isInteger(v.level)&&Number(v.level)>=1&&Number(v.level)<=6&&(v.track==='standard'||v.track==='foundation'&&Number(v.level)>=5)&&Array.isArray(v.families)&&v.families.length>0&&v.families.length<=18&&v.families.every(f=>typeof f==='string'&&familyPattern.test(f));
};
/** Input and result are chronological, oldest first; preserve at most six per grade/path. */
function bounded(entries:PaperHistoryEntry[]):PaperHistoryEntry[]{
 const counts=new Map<string,number>(),kept:PaperHistoryEntry[]=[];
 for(let i=entries.length-1;i>=0;i--){const e=entries[i];if(!isEntry(e))continue;const path=`${e.level}:${e.track}`,n=counts.get(path)??0;if(n>=MAX_PER_PATH)continue;counts.set(path,n+1);kept.push({level:e.level,track:e.track,families:[...new Set(e.families)]});if(kept.length===MAX_TOTAL)break;}
 return kept.reverse();
}
export function paperHistoryEntry(paper:PracticePaper):PaperHistoryEntry{
 return {level:paper.request.level,track:paper.request.track,families:[...new Set(paper.items.map(({activity,question})=>paperReasoningFamily(activity,question)))]};
}
export function readPaperHistory(kv:KV|null,scope:string):PaperHistoryEntry[]{
 try{const raw=kv?.getItem(PREFIX+scope);if(!raw||raw.length>100000)return [];const data:unknown=JSON.parse(raw);if(!data||typeof data!=='object')return [];const o=data as Record<string,unknown>;if(o.schema!==1||!Array.isArray(o.entries)||o.entries.length>256||!o.entries.every(isEntry))return [];return bounded(o.entries);}catch{return [];}
}
export function rememberPaper(kv:KV|null,scope:string,paper:PracticePaper):boolean{
 try{if(!kv)return false;const entry=paperHistoryEntry(paper);if(!isEntry(entry))return false;const entries=bounded([...readPaperHistory(kv,scope),entry]);kv.setItem(PREFIX+scope,JSON.stringify({schema:1,entries}));return true;}catch{return false;}
}
/** Lexicographic score: unused families first, then less frequent/recent families. */
export function paperFreshnessScore(families:readonly string[],recent:readonly PaperHistoryEntry[]):{unseen:number;weightedReuse:number}{
 const unique=[...new Set(families)],used=new Set<string>(),window=recent.slice(-LOOKBACK);let weightedReuse=0;
 for(let i=0;i<window.length;i++){const seen=new Set(window[i].families),weight=i+1;for(const f of unique)if(seen.has(f)){used.add(f);weightedReuse+=weight;}}
 return {unseen:unique.length-used.size,weightedReuse};
}
/**
 * Choose among caller-supplied random seeds; the selected code regenerates by
 * itself. No source, topic, grade, or within-paper balance rule is bypassed.
 */
export function generateFreshPracticePaper(request:Omit<PaperRequest,'seed'>,seeds:number[],history:PaperHistoryEntry[]):PracticePaper{
 const limit=request.count===18?12:16,candidates=[...new Set(seeds.slice(0,limit))];
 if(!candidates.length||candidates.some(s=>!Number.isInteger(s)||s<0||s>0xffffffff))throw new RangeError('Provide valid random paper seeds.');
 const recent=bounded(Array.isArray(history)?history:[]).filter(e=>e.level===request.level&&e.track===request.track).slice(-LOOKBACK);
 let best=generatePracticePaper({...request,seed:candidates[0]});
 if(!recent.length)return best;
 let score=paperFreshnessScore(paperHistoryEntry(best).families,recent);
 for(const seed of candidates.slice(1)){
  const paper=generatePracticePaper({...request,seed}),next=paperFreshnessScore(paperHistoryEntry(paper).families,recent);
  if(next.unseen>score.unseen||next.unseen===score.unseen&&next.weightedReuse<score.weightedReuse){best=paper;score=next;}
 }
 return best;
}
