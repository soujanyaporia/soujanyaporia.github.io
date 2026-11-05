import {describe,it,expect} from 'vitest';
import {ARITHMETIC_FAMILIES,makeArithmeticVariant,makeArithmeticTemplate} from './arithmeticTemplates';
import {correctAnswer,numberValue,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
/** Independent read of the displayed expression, using ordinary precedence. No eval. */
export function solveArithmeticDisplay(q:Question):number{
 const tokens=(q.display??'').match(/\d+(?:\.\d+)?|[()+−×÷-]/g)??[];let at=0;
 const atom=():number=>{if(tokens[at]==='('){at++;const value=sum();if(tokens[at++]!==')')throw Error('Missing closing bracket');return value;}const token=tokens[at++];if(!/^\d+(?:\.\d+)?$/.test(token??''))throw Error('Missing operand');return Number(token);};
 const product=():number=>{let value=atom();while(['×','÷'].includes(tokens[at])){const op=tokens[at++],next=atom();value=op==='×'?value*next:value/next;}return value;};
 const sum=():number=>{let value=product();while(['+','−','-'].includes(tokens[at])){const op=tokens[at++],next=product();value=op==='+'?value+next:value-next;}return value;};
 const result=sum();if(at!==tokens.length)throw Error('Unconsumed expression');return result;
}
describe('data-driven original arithmetic templates',()=>{
 it('samples every operand domain with valid answers and complete displayed steps',()=>{
  for(const family of ARITHMETIC_FAMILIES)for(let variant=0;variant<family.variants.length;variant++)for(let seed=0;seed<10;seed++){
   const q=makeArithmeticVariant(family.id,variant,seed),expected=solveArithmeticDisplay(q);
   expect(numberValue(q.answer),`${family.id}/${variant}/${seed}`).toBeCloseTo(expected,6);
   expect(correctAnswer(q,q.answer)).toBe(true);expect(correctAnswer(q,String(expected+1))).toBe(false);
   expect(expected).toBeGreaterThanOrEqual(0);expect(q.workedSteps?.length).toBeGreaterThan(0);
   for(const step of q.workedSteps!){const [left,right]=step.equation!.split(' = ');expect(solveArithmeticDisplay({...q,display:left})).toBeCloseTo(Number(right),6);}
  }
 });
 it('uses actual curriculum references and deterministic varied examples',()=>{
  const skills=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const family of ARITHMETIC_FAMILIES){
   for(const id of family.skillIds)expect(skills.has(id),id).toBe(true);
   const examples=Array.from({length:8},(_,seed)=>makeArithmeticTemplate(family.id,seed));
   expect(new Set(examples.map(q=>q.display)).size,family.id).toBeGreaterThan(1);
   expect(makeArithmeticTemplate(family.id,17)).toEqual(makeArithmeticTemplate(family.id,17));
  }
 });
});
