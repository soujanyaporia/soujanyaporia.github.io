import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH4_UPPER_PATTERNS,type Batch4UpperId} from './batch4UpperMeta';
export {BATCH4_UPPER_PATTERNS,type Batch4UpperId} from './batch4UpperMeta';
const cash=(c:number)=>(c/100).toFixed(2);
type Step=[string,string?];
/** Six original configurations; each context contains the complete givens. */
export function makeBatch4Upper(id:Batch4UpperId,seed:number,index=0):Question{
 if(!BATCH4_UPPER_PATTERNS.some(p=>p.id===id))throw Error(`Unknown upper task ${id}`);
 const r=new Rng(hashString(`batch4-upper-v1:${id}:${seed}:${index}`));
 const make=(context:string[],prompt:string,answer:number,hint:string,steps:Step[],unit?:string,distractors:number[]=[]):Question=>({key:`batch4-upper:${id}:${seed}:${index}`,context,prompt,answer:unit==='dollars'?answer.toFixed(2):String(answer),unit,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.join(' ')).join(' '),choices:r.shuffle([...new Set([answer,...distractors,answer+1,answer+2,answer+3].filter(n=>Number.isFinite(n)&&n>=0))].slice(0,4).map(n=>unit==='dollars'?n.toFixed(2):String(n)))});
 if(id==='fraction-of-remainder-reverse'){
  const [a,b,c,d]=r.pick([[1,3,2,5],[1,4,2,3],[2,5,1,2],[1,5,3,4]]),whole=r.int(4,16)*b*d,left=whole*(b-a)*(d-c)/(b*d);
  return make([`Mina saved ${a}/${b} of her allowance.`,`She spent ${c}/${d} of the remaining allowance on food and had $${left} left.`],'How much was her allowance at first?',whole,'Work backwards: first find the allowance after saving, then the original amount.',[['Find the fraction left after spending.',`1 − ${c}/${d} = ${d-c}/${d}`],['Work back to the amount after saving.',`$${left} ÷ ${d-c} × ${d} = $${whole*(b-a)/b}`],['Undo the saving.',`$${whole*(b-a)/b} ÷ ${b-a} × ${b} = $${whole}`]],'dollars',[whole*(b-a)/b,whole-left,left]);
 }
 if(id==='transfer-difference-ratio'){
  const ratio=r.pick([3,4,5,7]),transfer=r.int(5,18),remaining=r.int(Math.max(8,Math.floor(2*transfer/(ratio-1))+1),25),initial=remaining+transfer,difference=(ratio-1)*remaining-2*transfer;
  const changed=difference+2*transfer;
  return make([`Asha had $${difference} more than Ben.`,`Ben gave Asha $${transfer}.`,`After that, Asha had ${ratio} times as much money as Ben.`],'How much money did Ben have at first?',initial,'The transfer increases the difference by twice the amount transferred.',[['Find the difference after the transfer.',`$${difference} + 2 × $${transfer} = $${changed}`],['That difference is the extra ratio units.',`$${changed} ÷ ${ratio-1} = $${remaining}`],['Return the amount Ben gave away.',`$${remaining} + $${transfer} = $${initial}`]],'dollars',[remaining,changed,remaining-transfer]);
 }
 if(id==='overlap-three-groups'){
  const x=r.int(15,90),multiple=r.pick([4,5,7]),w=r.int(8,x-2),rest=(multiple-1)*x-w,y=r.int(2,rest-2),z=rest-y,wx=w+x,xyz=x+y+z;
  return make([`There are ${wx} books on shelves W and X together.`,`There are ${xyz} books on shelves X, Y and Z together.`,`Altogether the four shelves hold ${multiple} times the number on shelf X.`],'How many books are on shelf X?',x,'Adding the two given totals counts shelf X twice.',[['Add both totals.',`${wx} + ${xyz} = ${wx+xyz}`],['This is the whole plus one extra X.',`${multiple} + 1 = ${multiple+1} units`],['Find one unit.',`${wx+xyz} ÷ ${multiple+1} = ${x} books`]],'books',[wx,xyz,w]);
 }
 if(id==='savings-change-percent'){
  const pct=r.pick([20,25,40,50]),saving=r.int(4,14)*20,change=saving*pct/100,secondSpent=r.int(30,90),firstSpent=secondSpent+change,income=firstSpent+saving;
  return make(['Jia received the same amount of pocket money each month.',`In May she spent $${firstSpent} and saved the rest.`,`In June she spent $${secondSpent} and saved the rest.`,`Her savings in June were ${pct}% greater than in May.`],'How much pocket money did she receive each month?',income,'The fall in spending equals the increase in savings.',[['Find the increase in savings.',`$${firstSpent} − $${secondSpent} = $${change}`],[`That increase is ${pct}% of May savings.`,`$${change} ÷ ${pct} × 100 = $${saving}`],['Add May spending and savings.',`$${firstSpent} + $${saving} = $${income}`]],'dollars',[saving,secondSpent+saving,firstSpent+change]);
 }
 if(id==='shortfall-leftover'){
  const price=r.int(6,35)*20,desired=r.int(8,13),bought=r.int(3,desired-3),left=r.int(1,Math.min(Math.floor(price*bought/100),Math.floor(((desired-bought)*price-1)/100)))*100,have=bought*price+left,short=desired*price-have;
  return make([`Nadia wanted to buy ${desired} identical notebooks but was short of $${cash(short)}.`,`Instead, she bought ${bought} notebooks and had $${cash(left)} left.`],'How much money did she have at first?',have/100,'The shortfall and leftover together pay for the extra notebooks.',[['Find the cost of the extra notebooks.',`$${cash(short)} + $${cash(left)} = $${cash(short+left)}`],['Find the price of one notebook.',`$${cash(short+left)} ÷ ${desired-bought} = $${cash(price)}`],['Add the leftover to the cost of the notebooks bought.',`${bought} × $${cash(price)} + $${cash(left)} = $${cash(have)}`]],'dollars',[bought*price/100,price/100,(bought*price+short)/100]);
 }
 const cycle=r.shuffle([1,2,3,4,5,6]).slice(0,4);if(cycle.join(',')==='2,1,4,3')cycle.reverse();
 const cycles=r.int(12,28),remaining=r.pick([1,2,3]),terms=cycles*4+remaining,sum=cycle.reduce((a,b)=>a+b,0),answer=cycles*sum+cycle.slice(0,remaining).reduce((a,b)=>a+b,0),shown=[...cycle,...cycle,...cycle].join(', ');
 return make([`The number pattern repeats: ${shown}, …`],`What is the sum of the first ${terms} numbers?`,answer,'Count complete repeating groups, then add the extra terms.',[['Find the sum of one group of four.',`${cycle.join(' + ')} = ${sum}`],['Separate complete groups and the remaining terms.',`${terms} = ${cycles} × 4 + ${remaining}`],['Add the complete groups and extra terms.',`${cycles} × ${sum} + ${cycle.slice(0,remaining).join(' + ')} = ${answer}`]],undefined,[cycles*sum,answer-cycle[0],(cycles+1)*sum]);
}
