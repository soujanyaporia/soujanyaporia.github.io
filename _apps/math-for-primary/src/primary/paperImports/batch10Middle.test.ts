import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch10Middle,type Batch10MiddleQuestion} from './batch10Middle';
import {BATCH10_MIDDLE_PARTS} from './batch10MiddleMeta';
import {Batch10MiddleDiagram} from './Batch10MiddleDiagram';
import {GridDrawing,GridDrawingFigure} from '../GridDrawing';
import {gridDrawingValue,type GridPoint,type GridSegment} from '../gridDrawingModel';
import {correctAnswer,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const dirs=['North','North-east','East','South-east','South','South-west','West','North-west'];
const encode=(segments:GridSegment[])=>segments.map(([a,b])=>`${a.join(',')}:${b.join(',')}`).join(';');
function unitEdges(segments:GridSegment[]):Map<string,GridSegment>{const result=new Map<string,GridSegment>();for(const [a,b] of segments){let steps=Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));while(steps>1&&((a[0]-b[0])%steps!==0||(a[1]-b[1])%steps!==0))steps--;for(let i=0;i<steps;i++){const p:GridPoint=[a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps],q:GridPoint=[a[0]+(b[0]-a[0])*(i+1)/steps,a[1]+(b[1]-a[1])*(i+1)/steps];result.set([p.join(','),q.join(',')].sort().join(':'),[p,q]);}}return result;}
type V=[number,number,number];const neg=(v:V):V=>[-v[0],-v[1],-v[2]];
function cubeValid(cells:[number,number][]):boolean{
 if(new Set(cells.map(c=>c.join(','))).size!==6)return false;const basis=new Map<string,{u:V;v:V;n:V}>([[cells[0].join(','),{u:[1,0,0],v:[0,1,0],n:[0,0,1]}]]),queue=[cells[0]];
 while(queue.length){const a=queue.shift()!,{u,v,n}=basis.get(a.join(','))!;for(const b of cells){const dx=b[0]-a[0],dy=b[1]-a[1];if(Math.abs(dx)+Math.abs(dy)!==1)continue;const turned=dx===1?{u:neg(n),v,n:u}:dx===-1?{u:n,v,n:neg(u)}:dy===1?{u,v:neg(n),n:v}:{u,v:n,n:neg(v)},key=b.join(',');if(basis.has(key)){if(JSON.stringify(basis.get(key))!==JSON.stringify(turned))return false;}else{basis.set(key,turned);queue.push(b);}}}
 return basis.size===6&&new Set([...basis.values()].map(v=>v.n.join(','))).size===6;
}
/** Independent reconstruction from the visible text, picture geometry and construction givens. */
export function solveBatch10Middle(q:Batch10MiddleQuestion,part:string):string|number{
 const text=(q.context??[]).join(' '),ns=nums(text),m=q.picture,spec=q.gridDrawing;
 if(spec?.kind==='line-relation'){
  const [a,b]=spec.givenSegment,p=spec.throughPoint,gx=b[0]-a[0],gy=b[1]-a[1];for(let x=0;x<=spec.columns;x++)for(let y=0;y<=spec.rows;y++){const dx=x-p[0],dy=y-p[1];if(dx===0&&dy===0)continue;if(spec.relation==='parallel'?dx*gy===dy*gx:dx*gx+dy*gy===0)return encode([[p,[x,y]]]);}throw Error('No constructible line');
 }
 if(spec?.kind==='complete-reflection'){
  const original=unitEdges(spec.givenSegments),reflect=([x,y]:GridPoint):GridPoint=>spec.axis.orientation==='vertical'?[2*spec.axis.coordinate-x,y]:[x,2*spec.axis.coordinate-y],mirrored=unitEdges(spec.givenSegments.map(([a,b])=>[reflect(a),reflect(b)]));return encode([...mirrored].filter(([key])=>!original.has(key)).map(([,edge])=>edge));
 }
 if(part==='acute-count'){
  if(m?.type!=='batch10-middle'||m.layout!=='concave-polygon')throw Error('Missing polygon');const p=m.points,area=p.reduce((s,[x,y],i)=>s+x*p[(i+1)%p.length][1]-y*p[(i+1)%p.length][0],0),direction=Math.sign(area);return p.filter(([x,y],i)=>{const prev=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length],ax=x-prev[0],ay=y-prev[1],bx=next[0]-x,by=next[1]-y,turn=Math.atan2(ax*by-ay*bx,ax*bx+ay*by)*180/Math.PI,inside=180-direction*turn;return inside<90-1e-7;}).length;
 }
 if(part==='dial-difference'){if(m?.type!=='batch10-middle'||m.layout!=='mass-pair')throw Error('Missing dials');return m.dials[0].model.reading-m.dials[1].model.reading;}
 if(part==='double-jar-mass'){if(m?.type!=='batch9-early'||m.layout!=='mass-dial')throw Error('Missing dial');let grams=m.reading+m.reading,kg=0;while(grams>=1000){grams-=1000;kg++;}return JSON.stringify([String(kg),String(grams)]);}
 if(part==='elapsed-seconds'){const times=[...text.matchAll(/(\d\d):(\d\d):(\d\d)/g)].map(x=>x.slice(1).map(Number)),a=times[0],b=times[1];let elapsed=0;while(a.join(':')!==b.join(':')&&elapsed<150){a[2]++;if(a[2]===60){a[2]=0;a[1]++;}if(a[1]===60){a[1]=0;a[0]++;}elapsed++;}if(elapsed===150)throw Error('Too long');return elapsed;}
 if(part==='jug-bottle-difference'){const [first,second,multiple]=ns;for(let bottle=1;bottle<first+second;bottle++)if(bottle+bottle*multiple===first+second)return bottle*multiple-bottle;throw Error('No share');}
 if(part==='reverse-freebie'){const [boxes,gifts,received]=ns;for(let bought=0;bought<1000;bought++)if(Math.floor(bought/boxes)*gifts===received)return bought;throw Error('No minimum purchase');}
 if(part==='complete-cube-net'){if(m?.type!=='batch10-middle'||m.layout!=='cube-completion')throw Error('Missing net');const valid=m.candidates.filter(c=>cubeValid([...m.cells,c.cell]));if(valid.length!==1)throw Error('Cube completion ambiguous');return valid[0].label;}
 if(part==='compass-turns'){const after=text.match(/faces ([a-z-]+)\./)![1],index=dirs.findIndex(d=>d.toLowerCase()===after),[a,b]=ns;let current=index;for(let i=0;i<(a+b)/45;i++)current=(current+7)%8;return dirs[current];}
 if(part==='both-line-properties'){
  if(m?.type!=='batch10-middle'||m.layout!=='line-options')throw Error('Missing lines');const valid=m.options.filter(o=>{const vectors=o.segments.map(([a,b])=>[b[0]-a[0],b[1]-a[1]]);let parallel=false,perpendicular=false;for(let i=0;i<vectors.length;i++)for(let j=i+1;j<vectors.length;j++){const [a,b]=vectors[i],[c,d]=vectors[j];parallel ||=Math.abs(a*d-b*c)<1e-8;perpendicular ||=Math.abs(a*c+b*d)<1e-8;}return parallel&&perpendicular;});if(valid.length!==1)throw Error('Line conjunction ambiguous');return valid[0].label;
 }
 if(part==='three-shape-area'){if(m?.type!=='batch10-middle'||m.layout!=='three-shape-area')throw Error('Missing composite');const side=m.width/3;if(side!==m.height-m.drop)throw Error('Shared givens inconsistent');let area=0;for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(x<side||x>=2*side||y>=m.drop)area++;return area;}
 if(part==='pie-sector-count'){if(m?.type!=='batch10-middle'||m.layout!=='pie-sectors')throw Error('Missing pie');const quarter=m.knownCount,small=quarter/2;return quarter*4-quarter-quarter-small;}
 if(part==='common-recipients'){const [total,a,b]=ns;let count=0;for(let pupil=1;pupil<=total;pupil++)if(pupil%a===0&&pupil%b===0)count++;return count;}
 const [target,place]=ns;let greatest=-1;for(let candidate=target-place;candidate<=target+place;candidate++)if(Math.round(candidate/place)*place===target)greatest=candidate;if(greatest<0)throw Error('No rounding interval');return greatest;
}
describe('Batch10 middle construction and reasoning diversity',()=>{
 it('contains8P3and8P4 tasks with valid curriculum identifiers',()=>{
  expect(BATCH10_MIDDLE_PARTS.filter(p=>p.level===3)).toHaveLength(8);expect(BATCH10_MIDDLE_PARTS.filter(p=>p.level===4)).toHaveLength(8);expect(new Set(BATCH10_MIDDLE_PARTS.map(p=>p.canonicalPatternId)).size).toBe(16);for(const p of BATCH10_MIDDLE_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('solves320 variants independently and checks readiness and determinism',()=>{
  for(const p of BATCH10_MIDDLE_PARTS)for(let seed=0;seed<20;seed++){
   const q=makeBatch10Middle(p.id,seed),solved=String(solveBatch10Middle(q,p.id));expect(correctAnswer(q as Question,solved),`${p.id}:${seed}; ${q.answer} / ${solved}`).toBe(true);expect(paperAnswerStatus(q as Question,solved)).toBe('complete');expect(paperAnswerStatus(q as Question,'')).toBe('blank');expect(correctAnswer(q as Question,'999999')).toBe(false);expect(q).toEqual(makeBatch10Middle(p.id,seed));expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(q.workedSteps!.length).toBeGreaterThan(1);expect(q.explanation).toBe(q.workedSteps!.map(s=>s.text).join(' '));expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);if(q.choices)expect(q.choices.filter(v=>correctAnswer(q as Question,v))).toHaveLength(1);
  }
 });
 it('renders necessary figures and three real drawing modes including worked answers',()=>{
  for(const p of BATCH10_MIDDLE_PARTS){const q=makeBatch10Middle(p.id,31,1);if(q.picture?.type==='batch10-middle'){const html=renderToStaticMarkup(createElement(Batch10MiddleDiagram,{model:q.picture}));expect(html).not.toMatch(/NaN|undefined|Infinity/);expect(html).toContain('role="img"');expect(JSON.stringify(q.picture)).not.toMatch(/answer|correctIndex|isValid/);}
   if(q.gridDrawing){const blank=renderToStaticMarkup(createElement(GridDrawing,{spec:q.gridDrawing,value:'',onChange:()=>{}}));expect(blank).toContain('My drawing');expect(blank.toLowerCase()).toContain('given');const final=q.workedSteps!.at(-1)!.picture;if(final?.type!=='grid-drawing')throw Error('Missing drawing solution');expect(final.segments.length).toBeGreaterThan(0);expect(final.givenSegments!.length).toBeGreaterThan(0);const html=renderToStaticMarkup(createElement(GridDrawingFigure,{model:final}));expect(html).not.toMatch(/NaN|undefined/);expect(q.answer.length).toBeLessThanOrEqual(200);}
  }
 });
 it('keeps alternate valid construction lengths and reversed/refined reflections correct',()=>{
  for(const part of ['draw-parallel','draw-perpendicular','complete-reflection'])for(let seed=0;seed<5;seed++){
   const q=makeBatch10Middle(part,seed),value=String(solveBatch10Middle(q,part)),segments=value.split(';').map(s=>s.split(':').map(p=>p.split(',').map(Number)) as GridSegment),reversed=gridDrawingValue(segments.reverse().map(([a,b])=>[b,a]));expect(correctAnswer(q as Question,reversed)).toBe(true);
  }
  const p=makeBatch10Middle('complete-reflection',2);expect(p.gridDrawing?.kind).toBe('complete-reflection');if(p.gridDrawing?.kind==='complete-reflection')expect(p.gridDrawing.givenSegments.length).toBeGreaterThan(6);
 });
});
