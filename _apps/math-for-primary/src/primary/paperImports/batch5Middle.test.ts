import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch5MiddleP3} from './batch5Middle';
import {BATCH5_MIDDLE_P3_PARTS} from './batch5MiddleMeta';
import {correctAnswer,numberValue,type Question} from '../generate';
import {Picture} from '../Picture';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {ACTIVITIES} from '../catalog';
import {generatePracticePaper,serializePaperResume,restorePaperResume} from '../practicePaper';
import {createPaperAttempt,updatePaperAnswer,movePaperQuestion,paperAnswerStatus,paperMarks} from '../paperAttempt';
import {PaperAnswer} from '../PracticePapers';
const numbers=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const lowWords=(n:number)=>n<20?small[n]:['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n/10)]+(n%10?' '+small[n%10]:'');
/** Independent read-only solver; no answer, proof, worked step, base generator or metadata values. */
export function solveBatch5MiddleP3(q:Question,part:string):string|number{
 const text=[...(q.context??[]),q.prompt].join(' '),ns=numbers(text),pic=q.picture;
 if(part==='1'){const n=Number(q.display);return `${small[Math.floor(n/1000)]} thousand and ${lowWords(n%100)}`;}
 if(part==='2')return [...q.order!].sort((a,b)=>Number(a)-Number(b)).join(',');
 if(part==='3'){if(pic?.type!=='pattern')throw Error('Missing pattern');const vals=pic.items.map(v=>v==='?'?null:Number(v)),jump=vals[3]!-vals[2]!;return vals[0]!+jump;}
 if(part==='4'){const rows=q.context!.map(s=>({label:s.match(/Item ([ABC])/)![1],price:numbers(s)[0]}));return rows.sort((a,b)=>b.price-a.price)[0].label;}
 if(part==='5'){const [whole,thousands,tens,ones]=numbers(q.display!);return (whole-thousands-tens-ones)/10;}
 if(part==='6'){if(pic?.type!=='pattern')throw Error('Missing money tiles');return pic.items.reduce((sum,s)=>sum+numbers(s)[0]*(s.includes('¢')?1:100),0)/100;}
 if(part==='7'){if(pic?.type!=='clock')throw Error('Missing clock');return Math.floor(pic.minutes/60)%12||12;}
 if(part==='8')return ns[0]*60+ns[1];
 if(part==='9'){let packed=0,bags=0;while(packed<ns[0]){packed+=ns[1];bags++;}if(packed!==ns[0])throw Error('Partial bag');return bags;}
 if(part==='10'){const context=q.context!,prices=context.slice(0,4).map(s=>({name:s.split(':')[0],price:numbers(s)[0]})),last=context[4],known=prices.find(p=>last.toLowerCase().includes(`buys the ${p.name.toLowerCase()}`))!;return prices.find(p=>Math.abs(p.price-(numbers(last)[0]-known.price))<1e-7)!.name;}
 if(part==='11')return ns[0]-ns[1];
 if(part==='12'){const times=text.match(/\d\d:\d\d/g)!.map(t=>{const [h,m]=t.split(':').map(Number);return h*60+m;}),minutes=times[1]-times[0];return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;}
 if(part==='13')return ns[0]+ns[0]-ns[1];
 if(part==='14'){let ben=0;for(let i=0;i<ns[1];i++)ben+=ns[0];return ns[0]+ben+(ben-ns[2]);}
 const [gap,sum]=ns,solutions=[];for(let older=1;older<sum;older++)if(older+(older-gap)===sum)solutions.push(older);if(solutions.length!==1)throw Error('Age ambiguous');return solutions[0];
}
describe('Whole Tao Nan P3 WA1 inventory with reusable configurations',()=>{
 it('has exactly one implementation per source response and valid curriculum objectives',()=>{
  expect(BATCH5_MIDDLE_P3_PARTS.map(p=>p.id)).toEqual(Array.from({length:15},(_,i)=>String(i+1)));for(const p of BATCH5_MIDDLE_P3_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves 6000 complete variations from visible givens',()=>{
  for(const p of BATCH5_MIDDLE_P3_PARTS)for(let seed=0;seed<200;seed++)for(const index of [0,1]){
   const q=makeBatch5MiddleP3(p.id,seed,index),solved=solveBatch5MiddleP3(q,p.id),actual=numberValue(q.answer),expected=numberValue(String(solved));if(actual!==null&&expected!==null)expect(actual,`${p.id}/${seed}/${index}`).toBeCloseTo(expected,8);else expect(correctAnswer(q,String(solved)),`${p.id}/${seed}/${index}:${solved}`).toBe(true);
   expect(correctAnswer(q,String(solved))).toBe(true);expect(correctAnswer(q,q.answer)).toBe(true);expect(q.explanation).toBe(q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '));if(p.id==='9')expect(q.explanation+' '+q.hint).not.toMatch(/crayon|box|Nora/i);expect(correctAnswer(q,'999999')).toBe(false);expect(q.choices).toBeUndefined();expect(q.workedSteps!.length).toBeGreaterThan(0);expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(q).toEqual(makeBatch5MiddleP3(p.id,seed,index));expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity/);
  }
 });
 it('preserves zero hundreds, close-number ordering, early gaps and required range constraints',()=>{
  for(let seed=0;seed<100;seed++){
   const words=makeBatch5MiddleP3('1',seed);expect(Math.floor(Number(words.display)/100)%10).toBe(0);
   const ordered=makeBatch5MiddleP3('2',seed).order!;expect(new Set(ordered.map(n=>n[0])).size).toBe(1);expect(ordered.every(n=>n.length===4&&n.includes('0'))).toBe(true);expect(new Set(ordered.map(n=>n.split('').sort().join(''))).size).toBe(1);
   const pat=makeBatch5MiddleP3('3',seed).picture;if(pat?.type!=='pattern')throw Error('Missing pattern');expect(pat.items).toHaveLength(5);expect(pat.items[1]).toBe('?');expect(Number(pat.items[0])).toBeGreaterThan(1000);expect(Number(pat.items[2])).toBeLessThan(1000);
   const clock=makeBatch5MiddleP3('7',seed).picture;if(clock?.type!=='clock')throw Error('Missing clock');expect(clock.minutes%60).toBe(0);
  }
 });
 it('uses existing figures only for countable values, sequence and clock',()=>{
  for(const p of BATCH5_MIDDLE_P3_PARTS)for(const seed of [0,17,931]){const q=makeBatch5MiddleP3(p.id,seed);expect(Boolean(q.picture)).toBe(['3','6','7'].includes(p.id));if(q.picture){const html=renderToStaticMarkup(createElement(Picture,{model:q.picture}));expect(html.length).toBeGreaterThan(40);expect(html).not.toMatch(/NaN|undefined/);}}
 });
 it('uses the integrated hours:minutes control in real paper readiness and saved drafts',()=>{
  const activity=ACTIVITIES.find(a=>a.parameter==='b5m-12');expect(activity).toBeDefined();const pool=[activity!],paper=generatePracticePaper({level:3,track:'standard',count:6,topic:'mixed',seed:817},pool);let saved=createPaperAttempt(paper);
  for(const [i,item] of paper.items.entries()){const q=item.question;expect(q.answer).toMatch(/^[12]:[0-5]\d$/);expect(paperAnswerStatus(q,'')).toBe('blank');expect(paperAnswerStatus(q,q.answer)).toBe('complete');expect(correctAnswer(q,String(solveBatch5MiddleP3(q,'12')))).toBe(true);saved=updatePaperAnswer(movePaperQuestion(saved,i),q.answer);const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:q.answer,onChange:()=>{},level:3}));expect(html).toMatch(/inputMode="text"/i);expect(html).toContain('h:min');}
  const restored=restorePaperResume(serializePaperResume(paper,saved.answers,saved.position),pool);expect(restored!.answers).toEqual(saved.answers);expect(paperMarks(paper,saved.answers).correct).toBe(6);
 });
 it('checks all source answers including the incorrect older-age key',()=>{
  expect([3045,3405,3450,3504].sort((a,b)=>a-b)).toEqual([3045,3405,3450,3504]);expect(1037-100).toBe(937);expect(90.8).toBeGreaterThan(89.4);expect((5396-5000-90-6)/10).toBe(30);expect(3*50+4*10+3*5+4*.1+.5).toBe(205.9);expect(2*60+20).toBe(140);expect(56/7).toBe(8);expect(42.4-16.9).toBe(25.5);expect(98.9-43.7).toBeCloseTo(55.2,8);expect(16*60+25-(14*60+50)).toBe(95);expect(1374*2-235).toBe(2513);expect(3+3*6+(3*6-5)).toBe(34);expect((54+6)/2).toBe(30);expect((54+6)/2).not.toBe(24);
 });
});
