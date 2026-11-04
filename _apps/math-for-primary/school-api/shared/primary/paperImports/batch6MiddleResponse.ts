/** Visible constraints for three constructed response forms; no answer is stored here. */
export type Batch6MiddleResponseSpec=
 |{kind:'fraction-pair';options:string[]}
 |{kind:'named-pair';options:string[]}
 |{kind:'factor-pairs';total:number;rows:number}
 |{kind:'interval';labels:string[]}
 |{kind:'number-pair';firstLabel:string;secondLabel:string};
const array=(value:string):unknown[]|null=>{try{const a:unknown=JSON.parse(value);return Array.isArray(a)?a:null;}catch{return null;}};
export function structuredResponseReady(spec:Batch6MiddleResponseSpec,value:string):boolean{
 const a=array(value);if(!a)return false;
 if(spec.kind==='number-pair')return a.length===2&&a.every(v=>typeof v==='string'&&/^-?\d+$/.test(v)&&Number.isSafeInteger(Number(v)));
 if(spec.kind==='factor-pairs')return a.length===spec.rows&&a.every(row=>Array.isArray(row)&&row.length===2&&row.every(v=>typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))));
 return a.length===2&&a.every(v=>typeof v==='string'&&(spec.kind==='interval'?spec.labels:spec.options).includes(v))&&(spec.kind==='interval'||a[0]!==a[1]);
}
export function structuredResponseCorrect(spec:Batch6MiddleResponseSpec,expected:string,value:string):boolean{
 if(!structuredResponseReady(spec,value))return false;const a=array(value)!;
 if(spec.kind==='number-pair'){const b=array(expected);return !!b&&b.length===2&&b.every(v=>Number.isSafeInteger(Number(v)))&&Number(a[0])===Number(b[0])&&Number(a[1])===Number(b[1]);}
 if(spec.kind==='factor-pairs'){
  const rows=a as string[][],pairs=rows.map(row=>row.map(Number));return pairs.every(([groups,size])=>groups>1&&size>1&&groups*size===spec.total)&&new Set(pairs.map(row=>row.join(':'))).size===spec.rows;
 }
 if(spec.kind==='named-pair'){const b=array(expected);return !!b&&b.length===2&&(a as string[]).slice().sort().join('\0')===(b as string[]).slice().sort().join('\0');}
 if(spec.kind==='fraction-pair'){
  const fractions=(a as string[]).map(s=>s.split('/').map(Number));return fractions.every(([n,d])=>Number.isSafeInteger(n)&&Number.isSafeInteger(d)&&d>0)&&fractions[0][0]*fractions[1][1]===fractions[1][0]*fractions[0][1];
 }
 const b=array(expected);return !!b&&a[0]===b[0]&&a[1]===b[1];
}
export function formatStructuredResponse(spec:Batch6MiddleResponseSpec,value:string):string{
 const a=array(value);if(!a)return value.trim()?'Incomplete answer':'Not answered';
 if(spec.kind==='number-pair')return `${spec.firstLabel}: ${a[0]||'?'}; ${spec.secondLabel}: ${a[1]||'?'}`;
 if(spec.kind==='factor-pairs')return a.map(row=>Array.isArray(row)?`${row[0]||'?'} groups of ${row[1]||'?'}`:'? groups of ?').join('; ');
 return (a as string[]).map(v=>v||'?').join(spec.kind==='interval'?' to ':' and ');
}
