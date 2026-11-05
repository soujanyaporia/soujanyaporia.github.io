import type {Batch6MiddleResponseSpec} from './batch6MiddleResponse';
const parse=(value:string):unknown[]=>{try{const a:unknown=JSON.parse(value);return Array.isArray(a)?a:[];}catch{return [];}};
/** Passive, accessible constructed responses. Never fills an answer or forces a factor target. */
export function Batch6MiddleAnswer({spec,value,onChange,disabled=false}:{spec:Batch6MiddleResponseSpec;value:string;onChange:(v:string)=>void;disabled?:boolean}){
 const current=parse(value);
 if(spec.kind==='fraction-pair'||spec.kind==='named-pair'){
  const selected=current.filter((v):v is string=>typeof v==='string'&&spec.options.includes(v));
  return <fieldset className="batch6-answer"><legend>{spec.kind==='fraction-pair'?'Select the two equivalent fractions.':'Select the two items.'}</legend><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{spec.options.map(option=><button type="button" key={option} aria-pressed={selected.includes(option)} style={{minHeight:44,minWidth:44}} disabled={disabled||selected.length===2&&!selected.includes(option)} onClick={()=>onChange(JSON.stringify(selected.includes(option)?selected.filter(s=>s!==option):[...selected,option]))}>{option}</button>)}</div><p aria-live="polite">{selected.length} of 2 selected.</p></fieldset>;
 }
 if(spec.kind==='number-pair'){
  const selected=[0,1].map(i=>typeof current[i]==='string'?current[i] as string:'');
  return <fieldset className="batch6-answer"><legend>Answer both parts.</legend><div style={{display:'grid',gap:16}}>{selected.map((v,i)=><label key={i} style={{display:'grid',gap:6}}>{i===0?spec.firstLabel:spec.secondLabel}<input type="text" inputMode={spec.decimal?'decimal':'numeric'} maxLength={12} style={{display:'block',width:140,maxWidth:'100%',minHeight:44}} disabled={disabled} value={v} onChange={e=>onChange(JSON.stringify(selected.map((old,j)=>i===j?e.target.value:old)))}/></label>)}</div></fieldset>;
 }
 if(spec.kind==='number-fields'){
  const selected=spec.fields.map((_,i)=>typeof current[i]==='string'?current[i] as string:'');
  return <fieldset className="batch6-answer"><legend>Answer each part.</legend><div style={{display:'grid',gap:16}}>{spec.fields.map((field,i)=><label key={i} style={{display:'grid',gap:6}}>{field.label}<input type="text" inputMode={field.decimal?'decimal':'numeric'} maxLength={12} style={{display:'block',width:140,maxWidth:'100%',minHeight:44}} disabled={disabled} value={selected[i]} onChange={e=>onChange(JSON.stringify(selected.map((old,j)=>i===j?e.target.value:old)))}/></label>)}</div></fieldset>;
 }
 if(spec.kind==='factor-pairs'){
  const rows=Array.from({length:spec.rows},(_,i)=>Array.from({length:2},(_,j)=>Array.isArray(current[i])&&typeof current[i][j]==='string'?current[i][j]:''));
  return <fieldset className="batch6-answer"><legend>Different equal groupings</legend><p>Use all {spec.total} students each time. There must be more than one group and more than one student per group.</p>{rows.map((row,i)=><div key={i} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}}><span>({i+1})</span>{[0,1].map(j=><label key={j} style={{display:'flex',gap:6,alignItems:'center'}}><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} style={{width:72,minHeight:44}} aria-label={`Grouping ${i+1}: ${j===0?'number of groups':'students in each group'}`} disabled={disabled} value={row[j]} onChange={e=>onChange(JSON.stringify(rows.map((r,k)=>k===i?r.map((v,c)=>c===j?e.target.value:v):r)))}/>{j===0?'groups of':'students'}</label>)}</div>)}</fieldset>;
 }
 const selected=[0,1].map(i=>typeof current[i]==='string'?current[i] as string:'');
 return <fieldset className="batch6-answer"><legend>Write the period</legend><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>{selected.map((v,i)=><label key={i}>{i===0?'From ':'To '}<select aria-label={i===0?'Start of period':'End of period'} value={v} disabled={disabled} style={{minHeight:44}} onChange={e=>onChange(JSON.stringify(selected.map((old,j)=>i===j?e.target.value:old)))}><option value="">Choose time</option>{spec.labels.map(label=><option key={label} value={label}>{label}</option>)}</select></label>)}</div></fieldset>;
}
