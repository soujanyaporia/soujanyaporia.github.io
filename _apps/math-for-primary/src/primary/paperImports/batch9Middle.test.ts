import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch9Middle,type Batch9MiddleQuestion} from './batch9Middle';
import {BATCH9_MIDDLE_PARTS} from './batch9MiddleMeta';
import {Batch9MiddleDiagram} from './Batch9MiddleDiagram';
import {correctAnswer,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {GridCell} from './batch9MiddlePicture';
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const normal=(cells:GridCell[])=>{const minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));return cells.map(([x,y])=>`${x-minX},${y-minY}`).sort().join(';');};
function symmetric(cells:GridCell[]){const key=normal(cells);return [cells.map(([x,y])=>[-x,y]),cells.map(([x,y])=>[x,-y]),cells.map(([x,y])=>[y,x]),cells.map(([x,y])=>[-y,-x])].some(c=>normal(c as GridCell[])===key);}
type V=[number,number,number];
const neg=(v:V):V=>[-v[0],-v[1],-v[2]];
function cubeNormals(faces:{label:string;x:number;y:number}[]){
 const orientations=new Map<string,{u:V;v:V;n:V}>([[faces[0].label,{u:[1,0,0],v:[0,1,0],n:[0,0,1]}]]),queue=[faces[0]];
 while(queue.length){const at=queue.shift()!,basis=orientations.get(at.label)!;for(const next of faces){if(orientations.has(next.label))continue;const dx=next.x-at.x,dy=next.y-at.y;if(Math.abs(dx)+Math.abs(dy)!==1)continue;const {u,v,n}=basis,turned=dx===1?{u:neg(n),v,n:u}:dx===-1?{u:n,v,n:neg(u)}:dy===1?{u,v:neg(n),n:v}:{u,v:n,n:neg(v)};orientations.set(next.label,turned);queue.push(next);}}
 if(orientations.size!==6||new Set([...orientations.values()].map(o=>o.n.join(','))).size!==6)throw Error('Invalid cube net');return orientations;
}
/** Independent visible-givens solver; no answer, proof, steps or generator internals. */
export function solveBatch9Middle(q:Batch9MiddleQuestion,part:string):string|number{
 const text=(q.context??[]).join(' '),ns=nums(text),p=q.picture;
 if(part==='wire-square'){const [l,w]=ns;for(let side=1;side<100;side++)if(side*4===l+w+l+w)return side*side;throw Error('No square');}
 if(part==='change-notes'){const [cost,n,face,value]=ns;let remaining=n*face-cost,count=0;while(remaining>0){remaining-=value;count++;}if(remaining!==0)throw Error('Non-note change');return count;}
 if(part==='balance-chain'){if(p?.type!=='batch9-middle'||p.layout!=='balances')throw Error('Missing balances');const [a,b,c]=p.rows,l=a.left.find(i=>i.kind==='ball')!.count,r=a.right.find(i=>i.kind==='ball')!.count,mass=a.right.find(i=>i.kind==='weight')!.grams!,carBalls=b.left.find(i=>i.kind==='ball')!.count,cars=c.right.find(i=>i.kind==='car')!.count;return mass/(l-r)*carBalls*cars;}
 if(part==='chain-total'){const [first,second,total]=ns;for(let ben=1;ben<total;ben++)if(ben+ben*first+ben*first*second===total)return ben*first;throw Error('No count');}
 if(part==='graph-claims'){if(p?.type!=='bars')throw Error('Missing bars');const [a,b,c,d,e]=p.values;return `A: ${d===c+c?'True':'False'}; B: ${e===a+b?'True':'False'}`;}
 if(part==='equal-start-changes'){const [lost,gained]=ns;return (1000+gained)-(1000-lost);}
 if(part==='unknown-purchase'){const [paid,change,known]=ns;return ((Math.round(paid*100)-Math.round(change*100)-Math.round(known*100))/100).toFixed(2);}
 if(part==='two-rectangles'){const [w,multiple]=ns;let area=0;for(let rectangle=0;rectangle<2;rectangle++)for(let y=0;y<w;y++)for(let x=0;x<w*multiple;x++)area++;return area;}
 if(part==='symmetry-choice'){if(p?.type!=='batch9-middle'||p.layout!=='symmetry-options')throw Error('Missing grid options');const matches=p.options.filter(o=>symmetric(o.cells));if(matches.length!==1)throw Error('Ambiguous symmetry');return matches[0].label;}
 if(part==='cube-opposite'){if(p?.type!=='batch9-middle'||p.layout!=='cube-net')throw Error('Missing net');const bottom=text.match(/Face ([A-Z])/)![1],folded=cubeNormals(p.faces),normal=folded.get(bottom)!.n;for(const [face,o] of folded)if(o.n.every((v,i)=>v===-normal[i]))return face;throw Error('No opposite');}
 if(part==='overlap-area'){
  if(p?.type!=='batch9-middle'||p.layout!=='crossed-rectangles')throw Error('Missing overlap');const occupied=new Set<string>(),offset=(p.long-p.short)/2;let intersection=0;
  for(let y=0;y<p.long;y++)for(let x=0;x<p.long;x++){const horizontal=y>=offset&&y<offset+p.short,vertical=x>=offset&&x<offset+p.short;if(horizontal||vertical)occupied.add(`${x},${y}`);if(horizontal&&vertical)intersection++;}
  return intersection;
 }
 if(part==='square-completion'){
  if(p?.type!=='batch9-middle'||p.layout!=='unit-squares')throw Error('Missing unit squares');const minX=Math.min(...p.cells.map(c=>c[0])),minY=Math.min(...p.cells.map(c=>c[1]));for(let side=1;side<=10;side++)for(let x=minX-side;x<=minX;x++)for(let y=minY-side;y<=minY;y++)if(p.cells.every(([a,b])=>a>=x&&a<x+side&&b>=y&&b<y+side))return side*side-p.cells.length;throw Error('No square completion');
 }
 if(part==='reverse-cut'){if(p?.type!=='batch9-middle'||p.layout!=='cut-rectangle')throw Error('Missing cut figure');let side=1;while(side*side<p.removedArea)side++;if(side*side!==p.removedArea)throw Error('Not a square');return (p.removedArea+p.remainingArea)/(side+side);}
 if(part==='notch-perimeter'){if(p?.type!=='batch9-middle'||p.layout!=='notch')throw Error('Missing notch');const {width:w,height:h,depth:d,rightFoot:f}=p,points=[[0,0],[w,0],[w,h],[w-f,h],[w-f,h-d],[w-f-d,h-d],[w-f-d,h],[0,h]];return points.reduce((sum,[x,y],i)=>{const next=points[(i+1)%points.length];return sum+Math.abs(x-next[0])+Math.abs(y-next[1]);},0);}
 if(part==='vehicle-capacity'){const [total,car,van,seats]=ns;for(let n=0;n<=total;n++)if(n*car+(total-n)*van===seats)return n;throw Error('No mix');}
 const [bn,bd,rn,rd,gn,gd]=ns,blue=bn/bd,red=rn/rd,green=gn/gd,claim=q.context!.at(-1)!,outcomes=new Set<boolean>();for(let i=1;i<Math.min(blue,red,green)*24;i++){const used=i/24;outcomes.add(claim.includes('twice')?Math.abs((green-used)-2*(red-used))<1e-8:claim.includes('shorter')?blue-used<red-used:blue-used>red-used);}return outcomes.size>1?'Cannot tell':outcomes.has(true)?'True':'False';
}
describe('Batch9 middle genuine reasoning expansion',()=>{
 it('provides8P3 and8P4 configurations with valid distinct metadata',()=>{
  expect(BATCH9_MIDDLE_PARTS.filter(p=>p.level===3)).toHaveLength(8);expect(BATCH9_MIDDLE_PARTS.filter(p=>p.level===4)).toHaveLength(8);expect(new Set(BATCH9_MIDDLE_PARTS.map(p=>p.canonicalPatternId)).size).toBe(16);for(const p of BATCH9_MIDDLE_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('solves320 variants independently and checks readiness, grading and determinism',()=>{
  for(const p of BATCH9_MIDDLE_PARTS)for(let seed=0;seed<20;seed++){
   const q=makeBatch9Middle(p.id,seed),solved=String(solveBatch9Middle(q,p.id));expect(correctAnswer(q as Question,solved),`${p.id}/${seed}: ${q.answer} vs ${solved}`).toBe(true);expect(paperAnswerStatus(q as Question,solved)).toBe('complete');expect(paperAnswerStatus(q as Question,'')).toBe('blank');expect(correctAnswer(q as Question,'999999')).toBe(false);expect(q).toEqual(makeBatch9Middle(p.id,seed));expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(q.workedSteps!.length).toBeGreaterThan(1);expect(q.explanation).toBe(q.workedSteps!.map(s=>s.text).join(' '));expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
   if(q.choices)expect(q.choices.filter(c=>correctAnswer(q as Question,c))).toHaveLength(1);
   if(p.id==='chain-total'){const [first,second]=nums(q.context!.join(' '));expect(1+first+first*second).toBeLessThanOrEqual(9);}
   if(p.id==='change-notes')expect(nums(q.context![0])[0]).toBeGreaterThan(0);
  }
 });
 it('keeps all necessary native diagrams renderable with target-free models',()=>{
  for(const p of BATCH9_MIDDLE_PARTS){const q=makeBatch9Middle(p.id,31,1);if(q.picture?.type!=='batch9-middle')continue;const html=renderToStaticMarkup(createElement(Batch9MiddleDiagram,{model:q.picture}));expect(html).toContain('role="img"');expect(html).not.toMatch(/NaN|undefined|Infinity/);expect(JSON.stringify(q.picture)).not.toMatch(/answer|correctIndex|oppositeMap/);}
  const squares=makeBatch9Middle('square-completion',31).picture;if(squares?.type!=='batch9-middle'||squares.layout!=='unit-squares')throw Error('Missing unit-square arrangement');expect(new Set(squares.cells.map(c=>c.join(','))).size).toBe(squares.cells.length);
 });
 it('varies original givens and produces all three equal-cut logical outcomes',()=>{
  for(const p of BATCH9_MIDDLE_PARTS)expect(new Set(Array.from({length:20},(_,seed)=>{const q=makeBatch9Middle(p.id,seed);return JSON.stringify([q.context,q.picture]);})).size,p.id).toBeGreaterThan(5);
  expect(new Set(Array.from({length:20},(_,seed)=>makeBatch9Middle('equal-cut-logic',seed).answer))).toEqual(new Set(['True','False','Cannot tell']));expect(()=>makeBatch9Middle('unknown',1)).toThrow();
 });
});
