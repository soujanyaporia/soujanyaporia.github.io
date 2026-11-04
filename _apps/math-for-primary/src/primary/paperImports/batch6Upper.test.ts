import {describe,it,expect} from 'vitest';
import {correctAnswer,numberValue,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {PaperAnswer} from '../PracticePapers';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {BATCH6_UPPER_PARTS,makeBatch6Upper,type Batch6UpperPart} from './batch6Upper';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const nums=(s:string)=>[...s.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
const f=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
const mix=(n:number,d:number)=>{const g=gcd(n,d);n/=g;d/=g;return n%d?`${Math.floor(n/d)} ${n%d}/${d}`:String(n/d);};
/** Re-derive answers exclusively from the visible source text and prompt. */
export function solveBatch6Upper(part:Batch6UpperPart,q:Question):string{
 const t=[...(q.context||[]),q.prompt].join(' '),a=nums(t);
 switch(part){
  case '1a':return String(a[3]+a[1]-a[0]);
  case '1b':{const l=a[0]*a[1]/gcd(a[0],a[1]);return JSON.stringify([String(l),String(2*l)]);}
  case '2':{const [w,n,d,x,y,e]=a,den=d*e/gcd(d,e);return mix((w-x)*den+n*den/d-y*den/e,den);}
  case '3':return String(a[2]/a[0]*a[1]);
  case '4':return f(a[1]-a[0],a[1]*a[3]*a[4]);
  case '5':return String((a[0]-a[1])/2);
  case '6':{const packs=gcd(a[0],a[1]);return String(a[0]/packs);}
  case '7a':case '7b':{
   const [w,n,d,b,e]=a,den=d*e/gcd(d,e),total=(w*d+n)*den/d,bag=b*den/e,count=Math.floor(total/bag);
   return part==='7a'?String(count):f(total-count*bag,den);
  }
  case '8a':{const [,days,period,n,d]=a;void days;return f(n,d*period);}
  case '8b':{const [saved,days,period,n,d]=a;return (saved/(1-days*n/(d*period))).toFixed(2);}
  case '9':{const [round,extra,n,d,value]=a;return String(value/(d*round+n*(round+extra))*(d+n));}
  case '10a':{const [weekly,,,ten,period,weeks]=a;void ten;return String(weeks*weekly+Math.floor(weeks/period));}
  case '10b':{const [weekly,two,five,ten,period,weeks,value]=a;return String((value-Math.floor(weeks/period)*ten-weeks*weekly*two)/(five-two));}
  case '11a':{const [t,boxT,c,boxC,difference]=a;return String(difference/(boxT/t-boxC/c)/t);}
  case '11b':{const [t,,c,,dan,caleb]=a;return String(Math.abs((dan-caleb)*(c-t)));}
 }
}
describe('Raffles Girls P6 WA1 original adaptations',()=>{
 it('solves 8,000 generated examples from visible givens',()=>{
  for(const {id} of BATCH6_UPPER_PARTS)for(let seed=0;seed<250;seed++)for(let index=0;index<2;index++){
   const q=makeBatch6Upper(id,seed,index),a=solveBatch6Upper(id,q);
   expect(q.answer,`${id} ${seed}/${index}`).toBe(a);
   expect(correctAnswer(q,a),`${id} grader ${seed}/${index}`).toBe(true);
   if(id==='7b')expect(numberValue(a)).toBeGreaterThan(0);
  }
 });
 it('retains shared scenarios in paired parts',()=>{
  for(let seed=0;seed<30;seed++)for(const [a,b] of [['7a','7b'],['8a','8b'],['10a','10b']] as const)
   expect(makeBatch6Upper(a,seed).context).toEqual(makeBatch6Upper(b,seed).context);
 });
 it('accepts two ordered multiples in labelled number fields',()=>{
  const q=makeBatch6Upper('1b',17),html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:6}));
  expect(html).toContain('First multiple');expect(html).toContain('Second multiple');expect((html.match(/inputMode="numeric"/g)??[]).length).toBe(2);expect(paperAnswerStatus(q,q.answer)).toBe('complete');
  expect(correctAnswer(q,q.answer)).toBe(true);expect(correctAnswer(q,JSON.stringify(JSON.parse(q.answer).reverse()))).toBe(false);expect(paperAnswerStatus(q,JSON.stringify([JSON.parse(q.answer)[0],'']))).toBe('partial');
 });
 it('independently checks the source key including its two errors',()=>{
  expect(37230+250).toBe(37480);expect(6*9/gcd(6,9)).toBe(18);
  expect(mix((5*4+1)*5-(1*5+2)*4,20)).toBe('3 17/20');
  expect(65/5*9).toBe(117);expect(f((7-3),7*4*2)).toBe('1/14');
  expect((136-20)/2).toBe(58);expect(96/gcd(96,80)).toBe(6);
  expect(Math.floor((3+2/5)/(1/4))).toBe(13);expect((3+2/5)-13/4).toBeCloseTo(3/20);
  expect(f(2,7*8)).toBe('1/28');expect(494/(1-15/28)).toBeCloseTo(1064);
  expect(1044/(5*3+3*7)*(5+3)).toBe(232);expect(232).not.toBe(310);
  expect(17*2+Math.floor(17/4)).toBe(38);expect((171-4*10-34*2)/3).toBe(21);
  expect(96/(33/6-28/8)/6).toBe(8);expect((20-8)*(8-6)).toBe(24);
 });
 it('uses known curriculum skills',()=>{
  const known=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const p of BATCH6_UPPER_PARTS)for(const id of p.skillIds)expect(known.has(id),id).toBe(true);
 });
});
