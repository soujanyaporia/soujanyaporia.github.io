import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch6MiddleP4,type Batch6MiddleQuestion} from './batch6Middle';
import {BATCH6_MIDDLE_P4_PARTS} from './batch6MiddleMeta';
import {structuredResponseCorrect,structuredResponseReady,formatStructuredResponse,type Batch6MiddleResponseSpec} from './batch6MiddleResponse';
import {Batch6MiddleAnswer} from './batch6MiddleAnswer';
import {correctAnswer} from '../generate';
import {Picture} from '../Picture';
import {ACTIVITIES} from '../catalog';
import {generatePracticePaper,serializePaperResume,restorePaperResume} from '../practicePaper';
import {paperAnswerStatus,paperMarks} from '../paperAttempt';
import {PaperAnswer} from '../PracticePapers';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const word=(n:number)=>n<20?small[n]:['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n/10)]+(n%10?' '+small[n%10]:'');
const fractions=(s:string)=>[...s.matchAll(/(\d+)\/(\d+)/g)].map(m=>({s:m[0],n:Number(m[1]),d:Number(m[2])}));
/** Independent visible-givens reconstruction; never reads answer/proof/steps or base generators. */
export function solveBatch6MiddleP4(q:Batch6MiddleQuestion,part:string):string|number{
 const text=[...(q.context??[]),q.prompt].join(' '),ns=nums(text),m=q.picture;
 if(part==='1'){if(m?.type!=='pattern')throw Error('Missing sequence');return Number(m.items[2])+Number(m.items[1])-Number(m.items[0]);}
 if(part==='2'){const [whole,n,d]=nums(q.display!);return `${whole*d+n}/${d}`;}
 if(part==='3'){const n=Number(q.display);return Math.floor((n+50)/100)*100;}
 if(part==='4'){const n=Number(q.display);return `${word(Math.floor(n/1000))} thousand and ${word(n%100)}`;}
 if(part==='5'){const [a,b]=ns;for(let n=1;n<=a*b;n++)if(n%a===0&&n%b===0)return n;throw Error('No LCM');}
 if(part==='6'){const [a,b]=nums(q.display!);let left=a;while(left>=b)left-=b;return left;}
 if(part==='7'){const [a,b]=nums(q.display!);let sum=0;for(let i=0;i<b;i++)sum+=a;return sum;}
 if(part==='8'){const [a,b]=fractions(q.display!),top=a.d*b.d-a.n*b.d-b.n*a.d,bottom=a.d*b.d;let common=Math.min(top,bottom);while(common>1&&(top%common!==0||bottom%common!==0))common--;return bottom/common===1?String(top/common):`${top/common}/${bottom/common}`;}
 if(part==='9'){if(q.structuredResponse?.kind!=='fraction-pair')throw Error('Missing visible fraction options');const fs=fractions(q.structuredResponse.options.join(' ')),pairs:string[][]=[];for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++)if(fs[i].n*fs[j].d===fs[j].n*fs[i].d)pairs.push([fs[i].s,fs[j].s]);if(pairs.length!==1)throw Error('Equivalent pair ambiguous');return JSON.stringify(pairs[0]);}
 if(part==='10'){const f=fractions(text)[0],total=ns[0];return total*(1-f.n/f.d);}
 if(part==='11'){const [multiple,difference]=ns;const matches=[];for(let girls=1;girls<=difference;girls++)if(multiple*girls-girls===difference)matches.push(girls);if(matches.length!==1)throw Error('Girls ambiguous');return matches[0];}
 if(part==='12a'||part==='12b'){if(m?.type!=='nanyang-p4'||m.layout!=='table')throw Error('Missing table');const row=m.rows.find(r=>q.prompt.includes(r.label))!.values;return part==='12a'?row[3]!-row[0]!-row[2]!:row[0]!+row[1]!+row[2]!;}
 if(part==='13'){const total=ns[0],pairs:string[][]=[];for(let groups=2;groups<total;groups++)for(let size=2;size<total;size++)if(groups*size===total)pairs.push([String(groups),String(size)]);return JSON.stringify(pairs.slice(-3));}
 if(part==='14'){const [total,up,down]=ns;for(let ben=1;ben<total;ben++)if(ben+(ben+up)+(ben-down)===total)return ben-down;throw Error('Money ambiguous');}
 if(part==='15'){const [a,b]=fractions(text),difference=Number(text.match(/\$(\d+)/)![1]);return difference/(b.n/b.d-a.n/a.d);}
 if(part==='16a'||part==='16b'){
  if(m?.type!=='bars'||!m.line)throw Error('Missing line graph');if(part==='16b'){const labels=q.prompt.match(/\d{1,2}:\d\d/g)!;return m.values[m.labels.indexOf(labels[0])]-m.values[m.labels.indexOf(labels[1])];}
  const gains=m.values.slice(1).map((v,i)=>v-m.values[i]),best=Math.max(...gains),indices=gains.flatMap((n,i)=>n===best?[i]:[]);if(indices.length!==1||best<=0)throw Error('Largest increase ambiguous');return JSON.stringify(m.labels.slice(indices[0],indices[0]+2));
 }
 const [total,n,d,used]=ns,solutions=[];for(let first=1;first<total;first++){const second=total-first;if(Math.abs(first-first*n/d-(second-used))<1e-9)solutions.push(second);}if(solutions.length!==1)throw Error('Stickers ambiguous');return solutions[0];
}
const grade=(q:Batch6MiddleQuestion,value:string)=>q.structuredResponse?structuredResponseCorrect(q.structuredResponse,q.answer,value):correctAnswer(q,value);
describe('Whole Tao Nan P4 source closure with reusable controls',()=>{
 it('accounts for19responses and exactly14missing configurations, with valid objectives',()=>{
  expect(BATCH6_MIDDLE_P4_PARTS).toHaveLength(19);expect(BATCH6_MIDDLE_P4_PARTS.filter(p=>p.neededConfiguration)).toHaveLength(14);for(const p of BATCH6_MIDDLE_P4_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves7600complete variants from visible givens',()=>{
  for(const p of BATCH6_MIDDLE_P4_PARTS)for(let seed=0;seed<200;seed++)for(const index of [0,1]){
   const q=makeBatch6MiddleP4(p.id,seed,index),solved=solveBatch6MiddleP4(q,p.id);expect(grade(q,String(solved)),`${p.id}/${seed}/${index}:${solved}`).toBe(true);expect(grade(q,q.answer)).toBe(true);expect(grade(q,'999999')).toBe(false);expect(q).toEqual(makeBatch6MiddleP4(p.id,seed,index));expect(q.choices).toBeUndefined();expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(q.explanation).toBe(q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '));expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity/);
  }
 });
 it('preserves four/five-digit ranges, simplest fractions and linked full figures',()=>{
  for(let seed=0;seed<80;seed++){
   const sequence=makeBatch6MiddleP4('1',seed).picture;if(sequence?.type!=='pattern')throw Error('Missing sequence');for(const v of sequence.items.filter(v=>v!=='?')){expect(Number(v)).toBeGreaterThanOrEqual(1000);expect(Number(v)).toBeLessThanOrEqual(9999);}
   const name=Number(makeBatch6MiddleP4('4',seed).display);expect(name).toBeGreaterThan(10000);expect(Math.floor(name/100)%10).toBe(0);
   for(const part of ['6','7']){const n=nums(makeBatch6MiddleP4(part,seed).display!)[0];expect(n).toBeGreaterThanOrEqual(1000);expect(n).toBeLessThanOrEqual(9999);}
   const q=makeBatch6MiddleP4('8',seed),[n,d]=q.answer.split('/').map(Number);expect(q.requireSimplified).toBe(true);if(d)expect(grade(q,`${n*2}/${d*2}`)).toBe(false);
   for(const group of ['12','16'])expect(makeBatch6MiddleP4(group+'a',seed).picture).toEqual(makeBatch6MiddleP4(group+'b',seed).picture);
  }
 });
 it('accepts every valid set of3factor groupings and rejects trivial or duplicated groupings',()=>{
  for(let seed=0;seed<12;seed++){
   const q=makeBatch6MiddleP4('13',seed),spec=q.structuredResponse!;if(spec.kind!=='factor-pairs')throw Error('Missing factor response');const pairs=Array.from({length:spec.total-2},(_,i)=>i+2).filter(g=>spec.total%g===0).map(g=>[String(g),String(spec.total/g)]);
   for(let a=0;a<pairs.length;a++)for(let b=a+1;b<pairs.length;b++)for(let c=b+1;c<pairs.length;c++)expect(grade(q,JSON.stringify([pairs[c],pairs[a],pairs[b]]))).toBe(true);
   expect(grade(q,JSON.stringify([pairs[0],pairs[0],pairs[1]]))).toBe(false);expect(grade(q,JSON.stringify([['1',String(spec.total)],pairs[0],pairs[1]]))).toBe(false);expect(structuredResponseReady(spec,JSON.stringify([['2',''],['',''],['','']]))).toBe(false);
  }
 });
 it('preserves pair order freedom, numeric-pair semantics and44px touch targets without answer leakage',()=>{
  const named:Batch6MiddleResponseSpec={kind:'named-pair',options:['Book','Pen','Bag','Ruler']},numberPair:Batch6MiddleResponseSpec={kind:'number-pair',firstLabel:'Numerator',secondLabel:'Denominator'};
  expect(structuredResponseCorrect(named,'["Book","Pen"]','["Pen","Book"]')).toBe(true);expect(structuredResponseCorrect(named,'["Book","Pen"]','["Book","Bag"]')).toBe(false);expect(structuredResponseReady(named,'["Book","Book"]')).toBe(false);
  expect(structuredResponseCorrect(numberPair,'["3","5"]','["03","5"]')).toBe(true);expect(structuredResponseReady(numberPair,'["3",""]')).toBe(false);expect(structuredResponseReady(numberPair,'["3.2","5"]')).toBe(false);expect(formatStructuredResponse(numberPair,'["3","5"]')).toContain('Numerator: 3');
  for(const part of ['9','13','16a']){const q=makeBatch6MiddleP4(part,17),spec=q.structuredResponse!;expect(spec).not.toHaveProperty('answer');const html=renderToStaticMarkup(createElement(Batch6MiddleAnswer,{spec,value:'',onChange:()=>{}}));expect(html).toContain('44px');expect(html).not.toMatch(/NaN|undefined/);if(part==='13')expect((html.match(/<input/g)??[]).length).toBe(6);if(part==='16a')expect((html.match(/<select/g)??[]).length).toBe(2);}
 });
 it('renders complete two-row tables and all6line points and labels within the chart',()=>{
  for(const seed of [0,17,99])for(const part of ['12a','16a']){const q=makeBatch6MiddleP4(part,seed),html=renderToStaticMarkup(createElement(Picture,{model:q.picture!}));expect(html).not.toMatch(/NaN|undefined/);if(q.picture!.type==='bars'){const m=q.picture as Extract<NonNullable<Batch6MiddleQuestion['picture']>,{type:'bars'}>;expect(m.values.every(v=>v%m.scale===0)).toBe(true);expect(m.labels).toHaveLength(6);for(const label of m.labels)expect(html).toContain(label);const positions=[...html.matchAll(/<circle cx="([\d.]+)"/g)].map(m=>Number(m[1]));expect(positions).toHaveLength(6);expect(positions.every(x=>x>=45&&x<=395)).toBe(true);}else{expect(html).toContain('<table>');expect(html).toContain('Monday');expect(html).toContain('Tuesday');expect((html.match(/aria-label="unknown"/g)??[]).length).toBe(2);}}
 });
 it('uses integrated structured controls in real papers, readiness, draft restore and marking',()=>{
  const pool=ACTIVITIES.filter(a=>['b6m-9','b6m-13','b6m-16a'].includes(a.parameter??''));expect(pool).toHaveLength(3);const paper=generatePracticePaper({level:4,track:'standard',count:6,topic:'mixed',seed:731},pool),answers=paper.items.map(item=>String(solveBatch6MiddleP4(item.question,item.activity.parameter!.slice(4))));
  for(const [i,item] of paper.items.entries()){expect(paperAnswerStatus(item.question,'')).toBe('blank');expect(paperAnswerStatus(item.question,'[]')).toBe('partial');expect(paperAnswerStatus(item.question,answers[i])).toBe('complete');expect(correctAnswer(item.question,answers[i])).toBe(true);const html=renderToStaticMarkup(createElement(PaperAnswer,{question:item.question,value:'',onChange:()=>{},level:4}));expect(html).toContain('<fieldset');}
  expect(restorePaperResume(serializePaperResume(paper,answers,2),pool)!.answers).toEqual(answers);expect(paperMarks(paper,answers).correct).toBe(6);
 });
 it('independently verifies every source response and retains the printed intermediate defect',()=>{
  expect(3789+150).toBe(3939);expect(4+2/3).toBeCloseTo(14/3,10);expect(Math.round(34578/100)*100).toBe(34600);expect(18%6+18%9).toBe(0);expect(3210%8).toBe(2);expect(4728*7).toBe(33096);expect(1-1/4-5/12).toBeCloseTo(1/3,10);expect(8/12).toBe(4/6);expect(75*4/5).toBe(60);expect(30/(3-1)).toBe(15);expect(33-9-16).toBe(8);expect(12+7+8).toBe(27);expect([2*9,3*6,6*3]).toEqual([18,18,18]);expect((4000-1000-600)/3).toBe(800);expect(24/(5/8-1/4)).toBe(64);expect(Math.max(20,25,-5,-25,-5)).toBe(25);expect(75-40).toBe(35);expect(435/5).toBe(87);expect(435/5).not.toBe(587);expect(87*2+30).toBe(204);
 });
});
