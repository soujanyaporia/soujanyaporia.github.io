import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {makeBatch9Early,BATCH9_EARLY_PARTS} from './batch9Early';
import {Batch9EarlyDiagram} from './Batch9EarlyDiagram';
import {correctAnswer,type Question} from '../generate';
import {responseReady} from '../answerFormat';
import {Picture} from '../Picture';
import {PaperAnswer} from '../PracticePapers';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+/g)?.map(Number)??[];
const unique=<T,>(values:T[])=>{if(values.length!==1)throw Error('Visible question is not uniquely solvable');return values[0];};
const time=(s:string)=>{const m=/(\d+):(\d+) (am|pm)/.exec(s)!;return Number(m[1])%12*60+Number(m[2])+(m[3]==='pm'?720:0);};
const showTime=(n:number)=>`${Math.floor(n/60)%12||12}:${String(n%60).padStart(2,'0')} ${n>=720?'pm':'am'}`;
const figure=(q:Question)=>{if(q.picture?.type!=='batch9-early')throw Error('Missing necessary mathematical figure');return renderToStaticMarkup(createElement(Batch9EarlyDiagram,{model:q.picture}));};
function readClock(q:Question){
 if(!q.picture)throw Error('Missing clock');const html=renderToStaticMarkup(createElement(Picture,{model:q.picture})),hands=[...html.matchAll(/<line x1="150" y1="123" x2="([\d.eE+-]+)" y2="([\d.eE+-]+)"/g)];
 if(hands.length!==2)throw Error('Clock needs both hands');const angle=(m:RegExpMatchArray)=>(Math.atan2(Number(m[1])-150,123-Number(m[2]))*180/Math.PI+360)%360;
 return Math.floor((angle(hands[0])+1e-7)/30)%12*60+Math.round(angle(hands[1])/6)%60;
}
function readDial(q:Question){
 const html=figure(q),maximum=Number(html.match(/>0\/(\d+)<\/text>/)![1]),pointer=html.match(/data-mass-pointer="true" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.eE+-]+)" y2="([\d.eE+-]+)"/)!;
 const angle=(Math.atan2(Number(pointer[3])-Number(pointer[1]),Number(pointer[2])-Number(pointer[4]))+2*Math.PI)%(2*Math.PI);return Math.round(angle/(2*Math.PI)*maximum);
}

/** Independent reconstruction from visible givens; never reads answer, proof, hint or worked steps. */
export function solveBatch9Early(q:Question,part:string):string|number{
 const context=(q.context??[]).join(' '),n=nums(context);
 if(part==='draw-length'){const length=nums(q.prompt)[0];return `${length+1},1:1,1`;}
 if(part==='copy-grid'){
  if(q.gridDrawing?.kind!=='copy-grid')throw Error('Missing reference grid');return [...q.gridDrawing.referenceSegments].reverse().map(([a,b])=>`${b.join(',')}:${a.join(',')}`).join(';');
 }
 if(part==='joined-shapes')return JSON.stringify(['rectangle',/ d="[^"]* A/.test(figure(q))?'semicircle':'triangle']);
 if(part==='circle-pieces'){
  const paths=[...figure(q).matchAll(/data-piece-label="([^"]+)" d="([^"]+)"/g)],semis=paths.filter(m=>m[2].startsWith('M-')).map(m=>({label:m[1],radius:Number(m[2].match(/A(\d+),/)![1])})),pairs:string[][]=[];
  for(let i=0;i<semis.length;i++)for(let j=i+1;j<semis.length;j++)if(semis[i].radius===semis[j].radius)pairs.push([semis[i].label,semis[j].label]);return JSON.stringify(unique(pairs));
 }
 if(part==='schedule-hour'){
  const entries=q.context!.filter(s=>/\d+:\d+ (am|pm):/.test(s)).map(s=>({time:time(s),label:s.split(/(?:am|pm): /)[1]}));
  return unique(entries.slice(0,-1).filter((entry,i)=>entries[i+1].time-entry.time===60)).label;
 }
 if(part==='ruler-total'){
  if(q.picture?.type!=='batch9-early'||q.picture.layout!=='ruler-total')throw Error('Missing rulers');let length=0;for(const object of q.picture.objects)for(let mark=object.start;mark<object.end;mark++)length++;return length;
 }
 if(part==='combine-group'){
  let supply=[...Array(n[0]),...Array(n[1])].length,packets=0;while(supply>0){supply-=n[2];packets++;}if(supply!==0)throw Error('Cannot pack every bead');return packets;
 }
 if(part==='fill-baskets'){
  const spaces:number[]=[];for(let basket=0;basket<n[0];basket++)for(let space=0;space<n[1];space++)spaces.push(1);for(let have=0;have<n[2];have++)spaces.pop();return spaces.length;
 }
 if(part==='mass-dial')return readDial(q);
 if(part==='contents-mass')return unique(Array.from({length:n[0]+1},(_,mass)=>mass).filter(mass=>mass+n[1]===n[0]));
 if(part==='identical-masses'){
  const mass=readDial(q);return unique(Array.from({length:mass},(_,one)=>one).filter(one=>one+one===mass));
 }
 if(part==='nested-capacity'){
  let litres=0;for(let tub=0;tub<n[3];tub++)for(let jar=0;jar<n[2];jar++)for(let bottle=0;bottle<n[1];bottle++)litres+=n[0];return litres;
 }
 if(part==='unequal-pieces'){
  const pieces=[...figure(q).matchAll(/data-shaded="(yes|no)" points="([^"]+)"/g)].map(m=>{const points=m[2].split(' ').map(s=>s.split(',').map(Number));let twiceArea=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];twiceArea+=a[0]*b[1]-a[1]*b[0];}return {shaded:m[1]==='yes',area:Math.abs(twiceArea)};});
  const total=pieces.reduce((sum,p)=>sum+p.area,0),shaded=pieces.filter(p=>p.shaded).reduce((sum,p)=>sum+p.area,0);let common=Math.min(total,shaded);while(total%common||shaded%common)common--;return `${shaded/common}/${total/common}`;
 }
 if(part==='slow-clock'){let correct=readClock(q);for(let elapsed=0;elapsed<n[0];elapsed++)correct++;return showTime(correct);}
 if(part==='price-from-change')return unique(Array.from({length:n[0]},(_,price)=>price).filter(price=>price*n[1]+n[2]===n[0]));
 if(part==='coin-claim'){
  const total=n[0],claim=Number(q.prompt.match(/more (\d+)-cent/)![1]),verdicts:boolean[]=[];
  for(let ten=1;ten*10<total;ten++){const rest=total-ten*10;if(rest>0&&rest%20===0){const twenty=rest/20;verdicts.push(claim===10?ten>twenty:twenty>ten);}}
  if(!verdicts.length)throw Error('No possible coins');return verdicts.every(Boolean)?'True':verdicts.every(v=>!v)?'False':'Not enough information';
 }
 throw Error(`No visible-input solver for ${part}`);
}

describe('Source-pattern batch9 early primary expansion',()=>{
 it('declares eight P1 and eight P2 patterns with valid objectives and exact source pointers',()=>{
  expect(BATCH9_EARLY_PARTS).toHaveLength(16);for(const level of [1,2])expect(BATCH9_EARLY_PARTS.filter(p=>p.level===level)).toHaveLength(8);
  expect(new Set(BATCH9_EARLY_PARTS.map(p=>p.canonicalPatternId)).size).toBe(16);
  for(const part of BATCH9_EARLY_PARTS){expect(part.sourceUnits).toHaveLength(1);expect(part.sourceUnits[0].sourcePage).toBeGreaterThan(0);for(const skill of part.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);}
 });
 it('independently solves twenty seeds per pattern and keeps controls ready and deterministic',()=>{
  for(const part of BATCH9_EARLY_PARTS)for(let seed=0;seed<20;seed++){
   const index=seed%3,q=makeBatch9Early(part.id,seed,index),solved=String(solveBatch9Early(q,part.id)),where=`${part.id}/${seed}/${index}`;
   expect(correctAnswer(q,solved),where).toBe(true);expect(correctAnswer(q,q.answer),where).toBe(true);expect(responseReady(q,q.answer),where).toBe(true);expect(correctAnswer(q,'__wrong__'),where).toBe(false);
   expect(q,where).toEqual(makeBatch9Early(part.id,seed,index));expect(q.workedSteps!.length,where).toBeGreaterThanOrEqual(2);expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);
   expect(q.explanation,where).toBe(q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '));
   const hidden={...q,answer:'poisoned',hint:'poisoned',proof:999,explanation:'poisoned',workedSteps:[{text:'poisoned'}]};expect(solveBatch9Early(hidden,part.id),where).toEqual(solveBatch9Early(q,part.id));
   if(q.choices)expect(q.choices.filter(c=>c===q.answer),where).toHaveLength(1);
  }
 });
 it('preserves real construction alternatives and complete reference and solution drawings',()=>{
  for(const part of ['draw-length','copy-grid']){
   const q=makeBatch9Early(part,17),html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:1}));
   expect(html).toContain('<svg');expect(q.answer.length).toBeLessThan(200);expect(correctAnswer(q,String(solveBatch9Early(q,part)))).toBe(true);expect(q.workedSteps!.at(-1)!.picture?.type).toBe('grid-drawing');
   if(q.gridDrawing?.kind==='copy-grid'){const partial=q.answer.split(';').slice(1).join(';');expect(correctAnswer(q,partial)).toBe(false);expect(q.gridDrawing.referenceSegments.length).toBeLessThanOrEqual(8);}
  }
 });
 it('keeps every essential figure visible and uses readable scale and choice labels',()=>{
  for(const part of BATCH9_EARLY_PARTS){const q=makeBatch9Early(part.id,17);if(q.picture?.type==='batch9-early'){
   const html=figure(q);expect(html).not.toMatch(/NaN|undefined/);expect(html).toContain('role="img"');
   if(q.picture.layout==='circle-pieces')for(const piece of q.picture.pieces)expect(html).toContain(`<figcaption style="font-size:17px;text-align:center;font-weight:700">${piece.label}</figcaption>`);
   if(q.picture.layout==='mass-dial')expect(html).toContain('font-size="16"');
   if(q.picture.layout==='area-fraction'){expect((html.match(/<polygon/g)??[]).length).toBe(5);expect(html).toContain('not shaded');}
  }}
 });
 it('handles noon correctly and exercises all three money-evidence verdicts',()=>{
  const verdicts=new Set<string>();let noon=false;
  for(let seed=0;seed<20;seed++){
   const schedule=makeBatch9Early('schedule-hour',seed);if(schedule.context!.some(s=>s.startsWith('12:00'))){noon=true;expect(schedule.context!.some(s=>s.startsWith('12:00 pm'))).toBe(true);expect(schedule.context!.some(s=>s.startsWith('12:00 am'))).toBe(false);}
   expect(correctAnswer(schedule,String(solveBatch9Early(schedule,'schedule-hour')))).toBe(true);verdicts.add(makeBatch9Early('coin-claim',seed).answer);
  }
  const trueFixture=makeBatch9Early('coin-claim',21);expect(trueFixture.answer).toBe('True');expect(solveBatch9Early(trueFixture,'coin-claim')).toBe('True');verdicts.add(trueFixture.answer);
  expect(noon).toBe(true);expect(verdicts).toEqual(new Set(['True','False','Not enough information']));
 });
});
