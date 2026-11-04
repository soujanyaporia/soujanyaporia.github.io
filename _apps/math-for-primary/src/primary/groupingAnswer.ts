/** Each object's zero-based ID occurs once. Group order and order inside a group do not matter. */
export interface GroupingSpec {total:number;objectLabel:string;target:{kind:'size'|'count';value:number}}
export function parseGrouping(value:string):number[][]|null{
 try{const parsed:unknown=JSON.parse(value);return Array.isArray(parsed)&&parsed.every(g=>Array.isArray(g)&&g.length>0&&g.every(n=>Number.isSafeInteger(n)))?parsed as number[][]:null;}catch{return null;}
}
export const groupingValue=(groups:number[][])=>JSON.stringify(groups);
export function groupingReady(spec:GroupingSpec,value:string):boolean{
 const groups=parseGrouping(value);if(!groups)return false;const ids=groups.flat();
 return ids.length===spec.total&&new Set(ids).size===spec.total&&ids.every(n=>n>=0&&n<spec.total);
}
export function validGrouping(spec:GroupingSpec,value:string):boolean{
 if(!Number.isInteger(spec.total)||spec.total<1||!Number.isInteger(spec.target.value)||spec.target.value<1||!groupingReady(spec,value))return false;
 const groups=parseGrouping(value)!;
 return spec.target.kind==='size'?groups.every(g=>g.length===spec.target.value):groups.length===spec.target.value&&groups.every(g=>g.length===groups[0].length);
}
export function exampleGrouping(spec:GroupingSpec):number[][]{
 const size=spec.target.kind==='size'?spec.target.value:spec.total/spec.target.value;
 if(!Number.isInteger(size)||size<1||spec.total%size!==0)throw Error('Grouping target must divide the object count.');
 return Array.from({length:spec.total/size},(_,g)=>Array.from({length:size},(_,i)=>g*size+i));
}
/** Keep only valid placed objects when loading an untrusted or partial UI value. */
export function placedGroups(spec:GroupingSpec,value:string):number[][]{
 const seen=new Set<number>();return (parseGrouping(value)??[]).map(g=>g.filter(id=>{if(id<0||id>=spec.total||seen.has(id))return false;seen.add(id);return true;})).filter(g=>g.length>0);
}
