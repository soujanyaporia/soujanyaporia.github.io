import {describe,it,expect} from 'vitest';
import type {Question} from '../generate';
import {correctAnswer} from '../generate';
import {paperAnswerStatus,updatePaperAnswer,createPaperAttempt,movePaperQuestion,restorePaperAttempt,type PaperAttempt} from '../paperAttempt';
import {generatePracticePaper} from '../practicePaper';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {BATCH4_UPPER_PATTERNS,makeBatch4Upper,type Batch4UpperId} from './batch4Upper';
const values=(s:string)=>(s.match(/\d+(?:\.\d+)?/g)??[]).map(Number);
/** Enumerate candidate originals or aggregate the visible sequence, without reading solutions. */
export function solveBatch4Upper(q:Question,id:Batch4UpperId):number{
 const visible=[...(q.context??[]),q.prompt].join(' '),n=values(visible),solutions:number[]=[];
 if(id==='fraction-of-remainder-reverse'){
  const [a,b,c,d,left]=n;for(let original=1;original<=5000;original++)if(Math.abs(original*(1-a/b)*(1-c/d)-left)<1e-8)solutions.push(original);
 }else if(id==='transfer-difference-ratio'){
  const [difference,transfer,ratio]=n;for(let before=transfer+1;before<=5000;before++)if(before+difference+transfer===ratio*(before-transfer))solutions.push(before);
 }else if(id==='overlap-three-groups'){
  const [wx,xyz,multiple]=n;for(let x=1;x<=wx&&x<=xyz;x++)if(wx+xyz-x===multiple*x)solutions.push(x);
 }else if(id==='savings-change-percent'){
  const [first,second,pct]=n;for(let income=first+1;income<=5000;income++)if(Math.abs((income-second)-(income-first)*(1+pct/100))<1e-8)solutions.push(income);
 }else if(id==='shortfall-leftover'){
  const [wanted,short,bought,left]=n;for(let price=1;price<=10000;price++){const have=bought*price+Math.round(left*100);if(wanted*price-have===Math.round(short*100))solutions.push(have/100);}
 }else{
  const pattern=n.slice(0,4),count=n.at(-1)!;return Array.from({length:count},(_,i)=>pattern[i%4]).reduce((a,b)=>a+b,0);
 }
 if(solutions.length!==1)throw Error(`${id}: ${solutions.length} solutions for ${visible}`);return solutions[0];
}
describe('Batch 4 upper-primary word-problem structures',()=>{
 it('covers reviewed skills with six distinct response structures',()=>{
  expect(BATCH4_UPPER_PATTERNS).toHaveLength(6);for(const p of BATCH4_UPPER_PATTERNS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves 3,600 original visible-given questions',()=>{
  for(const p of BATCH4_UPPER_PATTERNS)for(let seed=0;seed<300;seed++)for(const index of [0,1]){
   const q=makeBatch4Upper(p.id,seed,index),answer=solveBatch4Upper(q,p.id),where=`${p.id}:${seed}:${index}`;
   expect(Number(q.answer),where).toBeCloseTo(answer,8);expect(correctAnswer(q,String(answer)),where).toBe(true);expect(correctAnswer(q,'999999'),where).toBe(false);expect(q).toEqual(makeBatch4Upper(p.id,seed,index));expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);expect(q.picture).toBeUndefined();expect(q.context?.length).toBeGreaterThan(0);expect(q.prompt.trim().split(/\s+/).length).toBeLessThanOrEqual(35);expect(q.choices).toHaveLength(4);expect(new Set(q.choices).size).toBe(4);expect(q.choices!.filter(a=>correctAnswer(q,a))).toHaveLength(1);expect(q.choices).toContain(q.answer);expect(paperAnswerStatus(q,q.answer)).toBe('complete');const saved:PaperAttempt={code:'test',answers:[''],position:0,marked:false,fingerprint:'test'};const selected=updatePaperAnswer(saved,q.answer);const restored=JSON.parse(JSON.stringify(selected)) as PaperAttempt;expect(restored.answers[0]).toBe(q.answer);expect(paperAnswerStatus(q,restored.answers[0])).toBe('complete');expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
 it('restores a selected money choice in an actual generated paper draft',()=>{
  let checked=false;
  for(let seed=0;seed<60&&!checked;seed++){
   const paper=generatePracticePaper({level:6,track:'standard',count:18,topic:'mixed',seed});
   const index=paper.items.findIndex(item=>item.activity.parameter?.startsWith('b4u-')&&item.question.unit==='dollars');
   if(index<0)continue;
   const q=paper.items[index].question;expect(q.choices).toContain(q.answer);
   const saved=updatePaperAnswer(movePaperQuestion(createPaperAttempt(paper),index),q.answer);
   const restored=restorePaperAttempt(JSON.stringify(saved));expect(restored).not.toBeNull();
   expect(restored!.saved.answers[index]).toBe(q.answer);expect(paperAnswerStatus(restored!.paper.items[index].question,restored!.saved.answers[index])).toBe('complete');checked=true;
  }
  expect(checked).toBe(true);
 });
 it('independently checks the six reviewed source answers',()=>{
  expect(72/((1-1/4)*(1-3/5))).toBeCloseTo(240,9);expect((25+40)/5+20).toBe(33);expect((114+180)/7).toBe(42);expect(84+(84-60)/.3).toBe(164);expect(5*((6.8+1.2)/(9-5))+1.2).toBeCloseTo(11.2,9);expect(24*(2+1+4+3)+2).toBe(242);
 });
});
