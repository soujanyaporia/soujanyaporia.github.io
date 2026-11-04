import {useState} from 'react';
import {useProgress} from '../state/ProgressContext';
import {lessonsForLevel} from '../teach/index';
import {activityById} from '../primary/catalog';
import {TopicPreview} from '../primary/TopicPreview';
import {AdventureBuddy} from '../ui/Adventure';
import {Icon} from '../ui/Icon';
import type {Track} from '../school/curriculum';
import '../teach/teach.css';
import './studio.css';
export function WatchLibrary(){
 const {progress,emit}=useProgress(),[query,setQuery]=useState(''),level=progress.primary.selection?.level??1,track=level<5?'standard':progress.primary.selection?.track??'standard',all=lessonsForLevel(level,track),shown=all.filter(l=>`${l.title} ${l.objective}`.toLowerCase().includes(query.toLowerCase().trim()));
 const choose=(n:number,t:Track=track)=>emit({id:crypto.randomUUID(),at:Date.now(),kind:'primary_selection',level:n,track:n<5?'standard':t});
 return <main className="teach watch-library"><header className="watch-hero"><div><p className="teach-eyebrow">SINGAPORE PRIMARY MATHS · WATCH & LEARN</p><h1>See the idea.<br/><em>Try it yourself.</em></h1><p>A friendly voice. Pictures you can explore. Little discoveries that click.</p><span className="cinema-badge"><i/>P1–P6 · LISTEN · EXPLORE · DISCOVER</span></div><AdventureBuddy happy/></header><div className="primary-years" aria-label="Choose a walkthrough level">{[1,2,3,4,5,6].map(n=><button key={n} aria-pressed={n===level} className={n===level?'selected':''} onClick={()=>choose(n)}><small>PRIMARY</small><strong>{n}</strong></button>)}</div>{level>=5&&<div className="watch-tracks">{(['standard','foundation'] as const).map(t=><button key={t} aria-pressed={track===t} onClick={()=>choose(level,t)}>{t==='standard'?'Standard Mathematics':'Foundation Mathematics'}</button>)}</div>}<label className="lesson-search watch-search">Find a walkthrough<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try fractions, clocks or division"/></label><p className="lesson-results" role="status">{shown.length} walkthroughs for Primary {level}{track==='foundation'?' Foundation':''}</p><div className="watch-grid">{shown.map(l=><a key={l.id} href={`#/watch/${l.id}`} className="watch-card"><span className="watch-thumbnail"><TopicPreview kind={activityById(l.activityId)?.kind??'count'}/><span className="watch-play"><Icon name="play" filled size={19}/></span><span className="watch-caption">STEP BY STEP</span></span><span className="watch-card-copy"><strong>{l.title}</strong><span>{l.objective}</span><small>Watch · Pause · Try it yourself</small></span></a>)}</div>{shown.length===0&&<p className="stage-text">Try a shorter search or choose another level.</p>}<p className="teach-foot">Animated examples use the same models and explanations as the lessons. Listen to the explanation, explore the pictures and try each step for yourself.</p></main>;
}
