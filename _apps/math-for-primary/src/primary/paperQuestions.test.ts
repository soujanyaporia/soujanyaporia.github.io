import {describe,it,expect} from 'vitest';
import {PAPER_PATTERNS,type PaperPattern} from './paperCatalog';
import {makePaperQuestion,paperParameter} from './paperQuestions';
import type {Activity} from './catalog';
import {correctAnswer,numberValue,type Proof,type Question} from './generate';
import type {PaperPicture} from './paperPicture';
import {CURRICULUM_SKILLS} from '../school/curriculum';

const own=PAPER_PATTERNS.filter(p=>p.level!==3);
const activity=(p:PaperPattern):Activity=>({...p,id:`check-${p.parameter}`,track:'standard',kind:'paper'});
const numbers=(s:string)=>[...s.replaceAll(',','').matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
const value=(s:string)=>numbers(s)[0];
const diagram=(q:Question):PaperPicture=>{if(q.picture?.type!=='paper')throw Error('Expected paper diagram');return q.picture;};
const cardList=(q:Question)=>{const p=diagram(q);if(p.layout!=='cards')throw Error('Expected cards');return p.cards;};
const timeline=(q:Question)=>{const p=diagram(q);if(p.layout!=='timeline')throw Error('Expected timeline');return p;};
const bars=(q:Question)=>{const p=diagram(q);if(p.layout!=='bars')throw Error('Expected bars');return p;};
const fractionPicture=(q:Question)=>{if(q.picture?.type!=='fraction')throw Error('Expected fraction');return q.picture;};
function proofValue(p:Proof):number{
 if(typeof p==='number')return p;
 const a=proofValue(p.a),b=proofValue(p.b);
 switch(p.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case 'round':return Math.round(a/b)*b;case 'floor':return Math.floor(a/b)*b;}
}

/** Independent checks derive the answer from the illustrated givens, not the answer or its Proof AST. */
export function solve(q:Question,param:string):number{
 switch(param){
  case 'p1-count':return cardList(q)[0].count!;
  case 'p1-more':{const c=cardList(q);return c[0].count!-c[1].count!;}
  case 'p1-missing':{const p=bars(q);return value(p.totalLabel!)-value(p.rows[0].parts[0].label);}
  case 'p1-join':{if(q.picture?.type!=='parts')throw Error('Expected joining picture');return q.picture.parts.reduce((a,b)=>a+b);}
  case 'p1-left':{const c=cardList(q)[0];return c.count!-c.removed!;}
  case 'p1-groups':return cardList(q).reduce((total,c)=>total+c.count!,0);
  case 'p2-groups':{const c=cardList(q);return value(c[0].value)*c[1].count!;}
  case 'p2-share':{const c=cardList(q);return value(c[0].value)/c[1].count!;}
  case 'p2-before':{const p=timeline(q);return value(p.points[1].label)*value(p.caption!)-value(p.gaps[0]);}
  case 'p2-fraction':return cardList(q).reduce((total,c)=>{const [a,b]=numbers(c.value);return total+a/b;},0);
  case 'p2-shade':return numbers(q.prompt)[0]-fractionPicture(q).filled;
  case 'p2-bottles':{const c=cardList(q);return value(c[0].value)/value(c[1].value);}
  case 'p4-round':{const [n,p]=cardList(q).map(c=>value(c.value));const candidates=[Math.floor(n/p)*p,Math.ceil(n/p)*p];return n-candidates[0]<candidates[1]-n?candidates[0]:candidates[1];}
  case 'p4-decimal':{const c=cardList(q),[n,d]=numbers(c[1].value);return value(c[0].value)+n/d;}
  case 'p4-share':{const [total,reserved,albums]=cardList(q).map(c=>value(c.value));return (total-reserved)/albums;}
  case 'p4-factor':{const [a,b]=cardList(q).map(c=>value(c.value));const valid=q.choices!.map(Number).filter(v=>a%v===0&&b%v===0);expect(valid).toHaveLength(1);return valid[0];}
  case 'p4-perimeter':{const p=q.picture;if(p?.type!=='area'||!p.cut)throw Error('Expected cut corner');return (p.a-p.cut)+p.cut+p.cut+(p.b-p.cut)+p.a+p.b;}
  case 'p4-freebie':{const c=cardList(q),paid=value(c[0].value),free=value(c[1].value),price=value(c[2].value),total=value(c[3].value);let items=0,cost=0;while(items<total){items+=paid+free;cost+=paid*price;}expect(items).toBe(total);return cost;}
  case 'p5-convert':{const [kg,g]=cardList(q).map(c=>value(c.value));return (kg*1000+g)/1000;}
  case 'p5-percent':{const p=fractionPicture(q);return 100*p.filled/p.parts;}
  case 'p5-equivalent':{const c=cardList(q),[n,d]=numbers(c[0].value),known=value(c[1].value);return c[1].value.startsWith('?')?known*n/d:known*d/n;}
  case 'p5-triangle':{const p=q.picture;if(p?.type!=='shape')throw Error('Expected triangle');return p.labels!.map(value).reduce((a,b)=>a*b)/2;}
  case 'p5-water':{const p=q.picture;if(p?.type!=='solid')throw Error('Expected tank');const [n,d]=numbers(q.display!);return p.a!*p.b!*p.c!*(1-n/d);}
  case 'p5-bundles':{const c=cardList(q),prices=c.map(c=>value(c.value)),quantities=c.map(c=>numbers(c.label)[1]);return (prices[1]-prices[0])/(quantities[1]-quantities[0]);}
  case 'p6-ratio':{const p=bars(q),total=value(p.totalLabel!),[a,b]=p.rows.map(row=>row.parts.length);return total*b/(a+b);}
  case 'p6-change':{const p=timeline(q),[before,after]=p.points.map(point=>value(point.label));return Math.abs(after/before-1)*100;}
  case 'p6-algebra':{const p=timeline(q),x=value(p.points[0].label);return x*value(p.gaps[0])+value(p.gaps[1]);}
  case 'p6-average':{const p=diagram(q);if(p.layout!=='cards')throw Error('Expected reading cards');return value(p.caption!)*p.cards.length-p.cards.filter(c=>c.value!=='?').reduce((sum,c)=>sum+value(c.value),0);}
  case 'p6-charge':{const c=cardList(q),first=value(c[0].value),rate=value(c[1].value),block=value(c[1].label),duration=value(c[2].value);let covered=value(c[0].label),charge=first;while(covered<duration){charge+=rate;covered+=block;}return charge;}
  case 'p6-redistribute':{const p=timeline(q),[boxes,each]=numbers(p.points[0].label),removed=value(p.points[1].label);const shares=Array(boxes-removed).fill(0);for(let bead=0;bead<boxes*each;bead++)shares[bead%shares.length]++;expect(new Set(shares).size).toBe(1);return shares[0]-each;}
  default:throw Error(`No independent solver for ${param}`);
 }
}

describe('Original Singapore paper-informed practice',()=>{
 it.each(own.map(p=>[p.parameter,p] as const))('%s has independently correct answers, accessible givens and reproducible solutions',(param,pattern)=>{
  const a=activity(pattern);
  for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=makePaperQuestion(a,seed,index),where=`${param} seed ${seed} index ${index}`,answer=numberValue(q.answer);
   expect(answer,where).not.toBeNull();expect(answer!,where).toBeGreaterThanOrEqual(0);
   expect(answer!,where).toBeCloseTo(solve(q,param),7);
   expect(answer!,where).toBeCloseTo(proofValue(q.proof!),7);
   expect(correctAnswer(q,q.answer),where).toBe(true);
   expect(correctAnswer(q,String(answer!+1)),where).toBe(false);
   expect(makePaperQuestion(a,seed,index),where).toEqual(q);
   expect(q.prompt.trim().split(/\s+/).length,where).toBeLessThanOrEqual(18);
   expect(q.hint.length,where).toBeGreaterThan(15);
   expect(q.workedSteps!.length,where).toBeGreaterThanOrEqual(3);
   expect(q.workedSteps!.every(s=>s.picture&&s.text.length>10),where).toBe(true);
   expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);
   if(q.choices){expect(new Set(q.choices).size,where).toBe(q.choices.length);expect(q.choices.length,where).toBeGreaterThanOrEqual(3);expect(q.choices.filter(c=>correctAnswer(q,c)),where).toEqual([q.answer]);}
   if(q.picture?.type==='paper'&&q.picture.layout==='cards')for(const c of q.picture.cards){
    expect(c.label.trim().length).toBeGreaterThan(0);expect(c.value.trim().length).toBeGreaterThan(0);
    if(c.count!==undefined){expect(Number.isInteger(c.count)).toBe(true);expect(c.count).toBeGreaterThan(0);expect(c.count).toBeLessThanOrEqual(12);expect(c.removed??0).toBeLessThan(c.count);}
   }
  }
 });

 it('keeps P1 concrete arithmetic small and P2 multiplication within the taught tables',()=>{
  for(let seed=0;seed<100;seed++)for(const pattern of own.filter(p=>p.level<=2)){
   const q=makePaperQuestion(activity(pattern),seed,seed%3);
   if(pattern.level===1){expect(numberValue(q.answer)).toBeLessThanOrEqual(pattern.parameter==='p1-groups'?40:20);if(q.picture?.type==='parts'){expect(q.picture.parts).toHaveLength(3);expect(q.picture.parts.every(n=>n>0&&n<10)).toBe(true);}}
   if(pattern.parameter==='p2-groups')expect([2,3,4,5,10]).toContain(cardList(q)[1].count);
   if(pattern.parameter==='p2-share')expect([2,3,4,5,10]).toContain(cardList(q)[1].count);
  }
 });

 it('selects all six families per mixed set and gives stable out-of-order resume',()=>{
  for(let level=1;level<=6;level++)for(const seed of [0,1,77,7919,15841,0xffffffff]){
   const p=PAPER_PATTERNS.find(p=>p.level===level)!,a={...activity(p),id:`mixed-p${level}`,parameter:'mixed'};
   const expected=PAPER_PATTERNS.filter(p=>p.level===level).map(p=>p.parameter).sort();
   expect(Array.from({length:6},(_,i)=>paperParameter(a,seed,i)).sort()).toEqual(expected);
   const questions=Array.from({length:6},(_,i)=>makePaperQuestion(a,seed,i));
   for(const i of [5,2,4,0,3,1])expect(makePaperQuestion(a,seed,i)).toEqual(questions[i]);
   expect(new Set(questions.map(q=>q.key)).size).toBe(6);
   for(const q of questions)expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
  }
 });

 it('uses real curriculum references and six unique patterns for each standard grade',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(new Set(PAPER_PATTERNS.map(p=>p.parameter)).size).toBe(36);
  for(let level=1;level<=6;level++)expect(PAPER_PATTERNS.filter(p=>p.level===level)).toHaveLength(6);
  for(const p of PAPER_PATTERNS)for(const id of p.skillIds)expect(ids.has(id),`${p.parameter}: ${id}`).toBe(true);
 });

 it('charges exact blocks and partial blocks, including a one-minute overrun',()=>{
  const p=PAPER_PATTERNS.find(p=>p.parameter==='p6-charge')!,seen=new Set<string>();
  for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=makePaperQuestion(activity(p),seed,index),c=cardList(q),duration=value(c[2].value),block=value(c[1].label),remainder=(duration-60)%block;
   seen.add(remainder===0?'exact':remainder===1?'one-minute':'partial');
   const chargedBlocks=(Number(q.answer)-value(c[0].value))/value(c[1].value);
   expect(60+chargedBlocks*block).toBeGreaterThanOrEqual(duration);
   expect(60+(chargedBlocks-1)*block).toBeLessThan(duration);
  }
  expect([...seen].sort()).toEqual(['exact','one-minute','partial']);
 });

 it('does not encode a hidden part in bar lengths',()=>{
  const p=PAPER_PATTERNS.find(p=>p.parameter==='p1-missing')!;
  for(let seed=0;seed<50;seed++){
   const q=makePaperQuestion(activity(p),seed),diagram=bars(q);
   expect(diagram.rows[0].parts.map(p=>p.size)).toEqual([1,1]);
   expect(diagram.rows[0].parts[1].label).toBe('In the bag: ?');
   expect(diagram.caption).toContain('not to scale');
  }
 });
});
