import {describe,it,expect} from 'vitest';
import {roundHundredthsToTenth,makeBatch2RoundingQuestion} from './batch2Reuse';
import {correctAnswer,type Question} from '../generate';
import type {Activity} from '../catalog';
const activity={id:'batch2-round-tenth',parameter:'batch2-round-tenth'} as Activity;
export function solveBatch2Rounding(q:Question):string{
 const p=q.picture;if(!p||p.type!=='paper'||p.layout!=='cards')throw Error('Missing visible decimal');
 const [whole,decimal]=p.cards[0].value.split('.');
 const tenths=Number(whole)*10+Number(decimal[0])+(Number(decimal[1])>=5?1:0);
 return `${Math.floor(tenths/10)}.${tenths%10}`;
}

describe('reusable two-decimal rounding',()=>{
 it('rounds below, at and above halfway including a carry',()=>{
  for(const [n,answer] of [[1204,'12.0'],[1205,'12.1'],[1294,'12.9'],[1295,'13.0'],[9995,'100.0']] as const)expect(roundHundredthsToTenth(n)).toBe(answer);
 });
 it('independently checks 1000 generated visible inputs',()=>{
  for(let seed=0;seed<1000;seed++){
   const q=makeBatch2RoundingQuestion(activity,seed,seed%3);expect(q).toEqual(makeBatch2RoundingQuestion(activity,seed,seed%3));
   const p=q.picture;if(!p||p.type!=='paper'||p.layout!=='cards')throw Error('missing decimal');const input=p.cards[0].value;
   expect(input).toMatch(/^\d+\.\d{2}$/);const [whole,decimal]=input.split('.');let tenths=Number(whole)*10+Number(decimal[0])+(Number(decimal[1])>=5?1:0);
   const independent=`${Math.floor(tenths/10)}.${tenths%10}`;expect(q.answer).toBe(independent);expect(correctAnswer(q as Question,independent)).toBe(true);
  }
 });
});
