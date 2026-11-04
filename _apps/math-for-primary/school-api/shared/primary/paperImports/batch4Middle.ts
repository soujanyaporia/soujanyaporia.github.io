import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';
import {makeP2HenryPark2025Question} from './p2HenryPark2025';
import {P2_HENRY_PARK_2025_PATTERNS} from './p2HenryPark2025Meta';
import {BATCH4_MIDDLE_PARTS,type Batch4MiddlePart} from './batch4MiddleMeta';
export {BATCH4_MIDDLE_PARTS,type Batch4MiddlePart} from './batch4MiddleMeta';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const fraction=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
/** Shared equal-unit arithmetic used by pair and three-person comparison configurations. */
function equalBase(total:number,offsets:number[]){return (total-offsets.reduce((a,b)=>a+b,0))/offsets.length;}
const fractionPairs:{d:number;a:number;b:number}[]=[];
for(const d of [6,8,10,12])for(let a=1;a<d;a++)for(let b=1;b<d/2;b++)if(gcd(a,d)===1&&gcd(b,d/2)===1&&a+2*b<d)fractionPairs.push({d,a,b});
/** Original operands are generated from constraints. Only the graph requires a figure;
 * all story givens are plain text. Related box subparts share one existing generator. */
export function makeBatch4Middle(part:Batch4MiddlePart,seed:number,index=0):Question{
 const meta=BATCH4_MIDDLE_PARTS.find(p=>p.id===part);if(!meta)throw Error(`Unknown middle batch part: ${part}`);
 const r=new Rng(hashString(`batch4-middle-v1:${meta.group}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,hint:string,steps:NonNullable<Question['workedSteps']>,extra:Partial<Question>={}):Question=>({key:`batch4-middle:${part}:${seed}:${index}`,prompt,answer:String(answer),hint,workedSteps:steps,explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra});
 if(part==='age-sum-difference'){
  const young=r.int(7,24),gap=r.int(2,12),sum=2*young+gap,answer=equalBase(sum,[gap,0])+gap;
  return make('How old will Noah be then?',answer,'The age difference stays the same. Use the sum and difference to find the older person’s age.',[{text:'Add the difference to the total to make twice the older age.',equation:`${sum} + ${gap} = ${sum+gap}`},{text:'Divide by two to find Noah’s age.',equation:`${sum+gap} ÷ 2 = ${answer}`}],{context:[`Lina is ${gap} years younger than Noah.`,`The sum of their ages will be ${sum} years.`],unit:'years',proof:op('/',op('+',sum,gap),2)});
 }
 if(part==='three-offset-total'){
  const least=r.int(12,48)*10,down=r.int(2,12)*10,up=r.int(6,24)*10,base=least+down,total=3*base+up-down,answer=equalBase(total,[up,0,-down])-down;
  return make('How much money does Chen have?',answer,'Compare everyone with Chen. Remove the two extra amounts, then divide the rest into three equal shares.',[{text:'Ben has the stated difference more than Chen.',equation:`Ben − Chen = $${down}`},{text:'Asha has both differences more than Chen.',equation:`${up} + ${down} = $${up+down}`},{text:'Remove the extras to get three equal Chen shares.',equation:`${total} − ${down} − ${up+down} = ${3*answer}`},{text:'Find Chen’s share.',equation:`${3*answer} ÷ 3 = $${answer}`}],{context:[`Asha, Ben and Chen have $${total} altogether.`,`Asha has $${up} more than Ben. Chen has $${down} less than Ben.`],unit:'dollars',proof:op('/',op('-',op('-',total,down),up+down),3)});
 }
 if(part==='equal-remainders'){
  const denominator=r.pick([3,4,5,6,8]),used=r.pick(Array.from({length:Math.floor(denominator/2)},(_,i)=>i+1).filter(n=>gcd(n,denominator)===1)),u=r.int(18,82),fixed=r.int(2,11)*5,first=denominator*u,second=(denominator-used)*u+fixed,total=first+second,count=2*denominator-used;
  return make('How many stickers did Ben have at first?',second,'Remove Ben’s used stickers from the combined total. Match the equal amounts left using equal fraction parts.',[{text:'Use the denominator to represent Asha’s starting stickers.',equation:`Asha starts with ${denominator} units and has ${denominator-used} units left.`},{text:'After removing Ben’s used stickers, both remaining collections are represented by these units.',equation:`${denominator} + ${denominator-used} = ${count} units; ${total} − ${fixed} = ${total-fixed}`},{text:'Find one equal unit.',equation:`${total-fixed} ÷ ${count} = ${u}`},{text:'Ben started with his remaining stickers plus those he used.',equation:`${denominator-used} × ${u} + ${fixed} = ${second}`}],{context:[`Asha and Ben have ${total} stickers altogether.`,`Asha uses ${fraction(used,denominator)} of her stickers. Ben uses ${fixed} stickers.`,`They then have the same number of stickers left.`],unit:'stickers',proof:op('+',op('*',op('/',op('-',total,fixed),count),denominator-used),fixed)});
 }
 if(part==='chart-transfer'){
  const scale=r.pick([2,4]),a=r.int(2,4)*scale,d=a+r.int(2,4)*scale,c=d+r.int(2,4)*scale,b=c+r.int(2,4)*scale,answer=(b-d)/2;
  return make('How many paper clips must move from Box B to Box D so that both boxes contain the same number?',answer,'Moving one clip reduces the difference by two: one fewer in B and one more in D.',[{text:'Read the two relevant bars.',equation:`Box B: ${b}; Box D: ${d}`},{text:'Find their difference.',equation:`${b} − ${d} = ${b-d}`},{text:'Half the difference must move.',equation:`${b-d} ÷ 2 = ${answer}`},{text:'Check that the new counts match.',equation:`${b} − ${answer} = ${d} + ${answer} = ${(b+d)/2}`}],{picture:{type:'bars',labels:['Box A','Box B','Box C','Box D'],values:[a,b,c,d],scale},unit:'paper clips',proof:op('/',op('-',b,d),2)});
 }
 if(part==='fraction-left-two'){
  const {d,a,b}=r.pick(fractionPairs),first=fraction(a,d),second=fraction(b,d/2),used=a+2*b,answer=fraction(d-used,d);
  return make('What fraction of the pizza remains?',answer,'Use equal-sized fraction parts to add the portions eaten. Subtract their total from one whole.',[{text:'Give both eaten portions the same denominator.',equation:`${first} + ${second} = ${a}/${d} + ${2*b}/${d} = ${fraction(used,d)}`},{text:'Subtract the eaten portion from the whole pizza.',equation:`1 − ${fraction(used,d)} = ${answer}`}],{context:[`Maya eats ${first} of a pizza. Ravi eats ${second} of the same pizza.`],proof:op('-',1,op('+',op('/',a,d),op('/',b,d/2)))});
 }
 const base=P2_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter==='hp2q2-17-answer')!,q=makeP2HenryPark2025Question({...base,id:'batch4-middle-boxes-base',kind:'paper',track:'standard'},seed,index);
 if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Existing equal-group count representation changed');
 const [total,per]=q.picture.cards.map(c=>Number(c.value)),count=Number(q.answer),price=r.int(3,12),context=[`Nora sells ${total} crayons packed in boxes of ${per}.`],steps=[{text:'Divide the total number of crayons by the number in each box.',equation:`${total} ÷ ${per} = ${count} boxes`}];
 if(part==='boxes-a')return make('How many boxes of crayons does Nora sell?',count,q.hint,steps,{context,unit:'boxes',proof:q.proof});
 return make('How much money does Nora collect?',count*price,'Find the number of boxes first, then multiply by the price of one box.',[...steps,{text:'Multiply the number of boxes by the price per box.',equation:`${count} × $${price} = $${count*price}`}],{context:[...context,`Every box sells for $${price}.`],unit:'dollars',proof:op('*',q.proof??op('/',total,per),price)});
}
