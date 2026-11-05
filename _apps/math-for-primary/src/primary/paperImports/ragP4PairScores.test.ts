import {describe,it,expect} from 'vitest';
import type {Question} from '../generate';
import {correctAnswer} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {makeRagQuestion} from './ragP4PairScores';

/** Reconstruct all three unknowns using only the visible card values. */
function solveVisible(q:Pick<Question,'picture'|'prompt'|'context'>){
 const picture=q.picture;if(picture?.type!=='paper'||picture.layout!=='cards')throw Error('Missing score table');
 const labels=['Mira: A and B','Noor: B and C','Vik: A and C'];
 const totals=labels.map(label=>{const card=picture.cards.find(c=>c.label===label);const m=/^(\d+) points$/.exec(card?.value??'');if(!m)throw Error('Missing visible pair score');return Number(m[1]);});
 const [ab,bc,ac]=totals,all=(ab+bc+ac)/2,a=all-bc,b=all-ac,c=all-ab;
 if(![a,b,c].every(n=>Number.isInteger(n)&&n>0))throw Error('Pair totals do not describe positive whole scores');
 if(!q.prompt.includes('region B')||!q.context?.some(x=>x.includes('fixed number of points')))throw Error('Missing target or fixed-score condition');
 return {a,b,c,ab,bc,ac};
}
describe('three pairwise region scores',()=>{
 it('solves a hand-checked example independently',()=>{
  const q=makeRagQuestion(1);q.picture={type:'paper',layout:'cards',cards:[{label:'Mira: A and B',value:'41 points'},{label:'Noor: B and C',value:'57 points'},{label:'Vik: A and C',value:'74 points'}]};
  expect(solveVisible(q)).toEqual({a:29,b:12,c:45,ab:41,bc:57,ac:74});
 });
 it('solves the visible table and grades the target across seeds',()=>{
  const visible=new Set<string>();for(let seed=0;seed<100;seed++)for(const index of [0,1]){
   const q=makeRagQuestion(seed,index),{a,b,c,ab,bc,ac}=solveVisible(q);
   expect(a+b).toBe(ab);expect(b+c).toBe(bc);expect(a+c).toBe(ac);expect(q.answer).toBe(String(b));
   expect(correctAnswer(q,String(b))).toBe(true);expect(correctAnswer(q,String(b+1))).toBe(false);expect(paperAnswerStatus(q,String(b))).toBe('complete');
   expect(q.workedSteps?.length).toBe(3);expect(makeRagQuestion(seed,index)).toEqual(q);expect([a,b,c]).not.toEqual([80,45,20]);visible.add(JSON.stringify(q.picture));
  }expect(visible.size).toBeGreaterThan(80);
 });
});
