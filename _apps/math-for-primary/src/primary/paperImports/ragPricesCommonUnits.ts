import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-prices-in-common-units',
 level:6,
 title:'Prices written as multiples of one base price',
 objective:'Write related prices in common units, use the total cost to find one unit, then find the price or price difference asked for.',
 skillIds:['P6.S.RATIO.01','P5.S.RATE.02'],
 canonicalPatternId:'p6-prices-in-common-units',
};

const money=(cents:number)=>(cents/100).toFixed(2);
const count=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;

/** Original word problems. Every price is a whole number of cents, so all answers are exact. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-prices-in-common-units:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%3;
 const key=`rag-p6-prices-in-common-units:${seed}:${index}`;
 const finish=(context:string[],prompt:string,answerCents:number,hint:string,steps:string[]):Question=>({
  key,context,prompt,answer:money(answerCents),unit:'dollars',hint,
  workedSteps:steps.map(text=>({text})),explanation:steps.join(' '),
 });

 if(variant===0){
  const [a,b]=r.pick([[3,2],[2,3],[4,3],[3,4],[5,2],[2,5],[5,3],[3,5]]);
  const [fruitA,fruitB]=r.pick([['cherries','peaches'],['mangoes','pears'],['grapes','apples'],['plums','oranges']]);
  const person=r.pick(['Mrs Tan','Mr Ong','Ms Devi','Mr Lim']);
  const x=r.int(2,6),y=r.int(2,5),unit=r.int(4,30)*5;
  const units=x*b+y*a,total=units*unit;
  const askB=r.chance(.5),fruit=askB?fruitB:fruitA,coefficient=askB?a:b;
  return finish(
   [`${a} kg of ${fruitA} cost as much as ${b} kg of ${fruitB}.`,`${person} paid $${money(total)} for ${x} kg of ${fruitA} and ${y} kg of ${fruitB}.`],
   `What was the cost of 1 kg of ${fruit}?`,coefficient*unit,
   'Write both prices as multiples of one unit. If a kg of one fruit costs as much as b kg of the other, their prices are in the ratio b : a.',
   [
    `${a} kg of ${fruitA} cost the same as ${b} kg of ${fruitB}, so 1 kg of ${fruitA} is ${b} units and 1 kg of ${fruitB} is ${a} units.`,
    `${x} × ${b} + ${y} × ${a} = ${units} units, and this costs $${money(total)}.`,
    `1 unit = $${money(total)} ÷ ${units} = $${money(unit)}.`,
    `1 kg of ${fruit} = ${coefficient} × $${money(unit)} = $${money(coefficient*unit)}.`,
   ],
  );
 }

 const [big,small]=r.pick([['notebook','pencil'],['jacket','cap'],['mug','spoon'],['kite','ball'],['bag','bottle']]);
 const k=r.int(2,5);

 if(variant===1){
  const n=r.int(2,5),m=r.int(1,4),unit=r.int(5,60)*10,units=k*n+m,total=units*unit;
  const person=r.pick(['Aisha','Ben','Chen','Devi']);
  return finish(
   [`A ${big} costs ${k} times as much as a ${small}.`,`${person} bought ${count(n,big)} and ${count(m,small)}. The cost of these things was $${money(total)}.`].map((t,i)=>i===1?`The cost of ${count(n,big)} and ${count(m,small)} was $${money(total)}.`:t),
   `What is the cost of one ${small}?`,unit,
   `Let the price of one ${small} be 1 unit. Then one ${big} is ${k} units.`,
   [
    `One ${small} is 1 unit and one ${big} is ${k} units.`,
    `${n} × ${k} + ${m} × 1 = ${units} units, and this costs $${money(total)}.`,
    `1 unit = $${money(total)} ÷ ${units} = $${money(unit)}, so one ${small} costs $${money(unit)}.`,
   ],
  );
 }

 const n=r.int(2,4),unit=r.int(2,15)*100,units=n*(k+1),total=units*unit;
 const person=r.pick(['Dina','Ravi','Mei','Hana']);
 return finish(
  [`A ${big} costs ${k} times as much as a ${small}.`,`${person} spent $${money(total)} on ${count(n,big)} and ${count(n,small)}.`],
  `How much more does a ${big} cost than a ${small}?`,(k-1)*unit,
  `One ${small} is 1 unit and one ${big} is ${k} units. Find one unit first, then the difference in units.`,
  [
   `One ${small} is 1 unit and one ${big} is ${k} units, so one of each is ${k+1} units.`,
   `${n} of each cost ${n} × ${k+1} = ${units} units, and this is $${money(total)}.`,
   `1 unit = $${money(total)} ÷ ${units} = $${money(unit)}.`,
   `The difference is ${k} − 1 = ${k-1} units = ${k-1} × $${money(unit)} = $${money((k-1)*unit)}.`,
  ],
 );
}
