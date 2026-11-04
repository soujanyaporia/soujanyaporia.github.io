import type { CSSProperties } from 'react';
import { Picture } from './Picture';
import type { Picture as PictureModel } from './generate';
import type { GameKind } from './catalog';

function Firefly({index}:{index:number}) {
  return <svg className="counting-firefly" style={{'--firefly-delay':`${index%5*.6}s`} as CSSProperties} viewBox="0 0 64 64" aria-hidden="true">
    <ellipse className="firefly-glow" cx="32" cy="39" rx="19" ry="17" fill="#ffe971" opacity=".2"/>
    <path d="M29 30C10 10 6 29 18 34L29 37M35 30C54 10 58 29 46 34L35 37" fill="#baf3de" stroke="#fffbe2" strokeWidth="1.5"/>
    <ellipse cx="32" cy="39" rx="10" ry="13" fill="#ffe563" stroke="#ffef9b" strokeWidth="2"/>
    <path d="M24 37h16M24 43h16" stroke="#d8ac3f" strokeWidth="2"/>
    <path d="M28 23l-4-7M36 23l4-7" stroke="#d9edc8" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="32" cy="27" r="8" fill="#315950"/>
    <circle cx="29" cy="26" r="1.7" fill="#fff"/><circle cx="35" cy="26" r="1.7" fill="#fff"/>
    <path d="M30 30q2 2 4 0" fill="none" stroke="#baf3de" strokeWidth="1.3"/>
  </svg>;
}

export function AdventureScene({model,kind,marked=[],onMark}:{model:PictureModel;kind:GameKind;marked?:number[];onMark?:(index:number)=>void}) {
  if (kind==='count' && model.type==='counters' && !model.group) return <div className="forest-question-scene">
    <div className="forest-counting-grid" role={onMark?'group':'img'} aria-label={`${model.count} fireflies`} style={{'--firefly-columns':Math.min(model.count,5)} as CSSProperties}>
      {Array.from({length:model.count},(_,i)=>onMark?<button type="button" key={i} className={`firefly-touch ${marked.includes(i)?'marked':''}`} aria-label={`${marked.includes(i)?'Unmark':'Mark'} firefly ${i+1}`} aria-pressed={marked.includes(i)} onClick={()=>onMark(i)}><Firefly index={i}/>{marked.includes(i)&&<span aria-hidden="true">✓</span>}</button>:<Firefly key={i} index={i}/>)}
    </div>
    <span className="scene-instruction">{onMark?'Tap a firefly to mark it as counted.':'Look closely. Count each firefly once.'}</span>
  </div>;
  return <div className={`illustrated-question scene-${model.type}`}><Picture model={model}/></div>;
}

export function PlayScenery() {
  return <div className="play-scenery" aria-hidden="true"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <g className="scenery-clouds" fill="#fff" opacity=".75"><path d="M80 130Q80 105 110 104Q118 60 160 80Q188 74 202 108Q232 103 242 132Z"/><path d="M1260 180Q1260 152 1291 156Q1300 122 1332 135Q1361 129 1377 160Q1410 154 1416 182Z"/></g>
    <path d="M0 752Q230 665 470 770Q750 675 1000 755Q1300 655 1600 748V900H0Z" fill="#cde8ca"/>
    <path d="M0 828Q300 735 620 832Q970 750 1190 825Q1420 762 1600 801V900H0Z" fill="#aed7ad"/>
    <g transform="translate(40 490)"><path d="M55 120v205" stroke="#a88755" strokeWidth="24" strokeLinecap="round"/><ellipse cx="56" cy="100" rx="78" ry="105" fill="#6bbb97"/><ellipse cx="42" cy="78" rx="49" ry="74" fill="#83cfab"/><path d="M55 99v92M55 137l-29-29M55 162l31-35" fill="none" stroke="#58a983" strokeWidth="6" strokeLinecap="round"/></g>
    <g transform="translate(1460 480)"><path d="M55 120v205" stroke="#a88755" strokeWidth="24" strokeLinecap="round"/><ellipse cx="56" cy="100" rx="78" ry="105" fill="#6bbb97"/><ellipse cx="42" cy="78" rx="49" ry="74" fill="#83cfab"/><path d="M55 99v92M55 137l-29-29M55 162l31-35" fill="none" stroke="#58a983" strokeWidth="6" strokeLinecap="round"/></g>
    <g transform="translate(120 835)"><path d="M0 15v35M32 24v25" stroke="#fff0c7" strokeWidth="13"/><path d="M-28 17Q-4-22 25 17Z" fill="#ed9c85"/><path d="M12 27Q31 0 50 27Z" fill="#eec97a"/><circle cx="-8" cy="7" r="4" fill="#ffe6c9"/></g>
    <g transform="translate(1380 854)"><ellipse cx="0" cy="15" rx="50" ry="28" fill="#70b68b"/><ellipse cx="40" cy="25" rx="45" ry="23" fill="#8ac59a"/></g>
  </svg></div>;
}
