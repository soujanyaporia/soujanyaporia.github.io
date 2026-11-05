import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';
import {ARITHMETIC_FAMILIES} from './arithmeticTemplateData';
import type {ArithmeticNode,ArithmeticVariant,OperandDomain} from './arithmeticTemplateTypes';
export {ARITHMETIC_FAMILIES};
type Rational={n:number;d:number};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const rational=(n:number,d=1):Rational=>{if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d<=0)throw Error('Invalid exact arithmetic');const g=gcd(Math.abs(n),d);return {n:n/g,d:d/g};};
function operation(op:string,a:Rational,b:Rational):Rational{
 const v=op==='+'?rational(a.n*b.d+b.n*a.d,a.d*b.d):op==='-'?rational(a.n*b.d-b.n*a.d,a.d*b.d):op==='×'?rational(a.n*b.n,a.d*b.d):rational(a.n*b.d,a.d*b.n);
 if(v.n<0||v.n/v.d>1e9)throw Error('Outside primary arithmetic range');return v;
}
function decimalPlaces(v:Rational):number{let d=v.d,a=0,b=0;while(d%2===0){a++;d/=2;}while(d%5===0){b++;d/=5;}return d===1?Math.max(a,b):Infinity;}
const format=(v:Rational)=>{const places=decimalPlaces(v);if(places>6)throw Error('Non-terminating answer');return (v.n/v.d).toFixed(places);};
function operand(domain:OperandDomain,r:Rng):{value:Rational;text:string}{
 if(domain.fixed!==undefined)return {value:rational(Number(domain.fixed)),text:domain.fixed};
 const scale=10**domain.places,low=domain.belowOne?1:10**(domain.digits-1)*scale,high=domain.belowOne?scale-1:10**domain.digits*scale-1;
 const step=10**domain.trailingZeros,n=r.int(Math.ceil(low/step),Math.floor(high/step))*step;
 return {value:rational(n,scale),text:(n/scale).toFixed(domain.places)};
}
function regroup(op:string,a:Rational,b:Rational):boolean{
 const scale=10**Math.max(decimalPlaces(a),decimalPlaces(b));let x=Math.round(a.n/a.d*scale),y=Math.round(b.n/b.d*scale),carry=0,any=false;
 while(x||y){carry=op==='+'?Number(x%10+y%10+carry>=10):Number(x%10-carry<y%10);any ||=!!carry;x=Math.floor(x/10);y=Math.floor(y/10);}return any;
}
function generated(variant:ArithmeticVariant,r:Rng){
 const values=variant.domains.map(d=>operand(d,r));
 const steps:NonNullable<Question['workedSteps']>=[];
 function walk(node:ArithmeticNode):{value:Rational;text:string;proof:Proof}{
  if('slot' in node){const v=values[node.slot];return {...v,proof:v.value.n/v.value.d};}
  const a=walk(node.a),b=walk(node.b),value=operation(node.op,a.value,b.value);
  if(decimalPlaces(value)>variant.maxAnswerPlaces)throw Error('Unsupported answer precision');
  const sign=node.op==='-'?'−':node.op;
  steps.push({text:node.op==='+'?'Add the two amounts.':node.op==='-'?'Subtract the second amount.':node.op==='×'?'Multiply the two amounts.':'Divide the first amount by the second.',equation:`${format(a.value)} ${sign} ${format(b.value)} = ${format(value)}`});
  return {value,text:`(${a.text} ${sign} ${b.text})`,proof:{op:node.op==='×'?'*':node.op==='÷'?'/':node.op,a:a.proof,b:b.proof}};
 }
 const result=walk(variant.tree);
 if(variant.regroup!==undefined&&'op' in variant.tree&&'slot' in variant.tree.a&&'slot' in variant.tree.b){
  if(regroup(variant.tree.op,values[variant.tree.a.slot].value,values[variant.tree.b.slot].value)!==variant.regroup)throw Error('Regrouping domain mismatch');
 }
 return {result,values,steps};
}
/** Sample fresh values; source operands and OCR text are not part of runtime data. */
export function makeArithmeticVariant(familyId:string,variantIndex:number,seed:number,index=0):Question{
 const family=ARITHMETIC_FAMILIES.find(f=>f.id===familyId);if(!family)throw Error(`Unknown arithmetic family ${familyId}`);
 const variant=family.variants[variantIndex];if(!variant)throw Error('Unknown arithmetic variant');
 const r=new Rng(hashString(`arithmetic-template-v1:${familyId}:${variantIndex}:${seed}:${index}`));
 let sample:ReturnType<typeof generated>|undefined;
 for(let attempt=0;attempt<2000&&!sample;attempt++)try{sample=generated(variant,r);}catch{/* Draw another exact, nonnegative example. */}
 if(!sample)throw Error(`Arithmetic domain could not be sampled: ${familyId}/${variantIndex}`);
 const {result,values}=sample,expression=result.text.slice(1,-1),answer=format(result.value),tree=variant.tree,steps=sample.steps;
 const binary='op' in tree&&'slot' in tree.a&&'slot' in tree.b;
 let hint='Work inside brackets first. Multiply and divide before adding and subtracting.';
 if(binary&&'slot' in tree.a&&'slot' in tree.b){
  const a=values[tree.a.slot],b=values[tree.b.slot];
  hint=tree.op==='+'||tree.op==='-'?'Line up equal place values. Regroup if needed.':tree.op==='×'?'Split the whole-number factor by place value, then add the partial products.':'Use a related multiplication to check your division.';
  if(tree.op==='-')steps.push({text:'Check by adding back the amount subtracted.',equation:`${answer} + ${b.text} = ${a.text}`});
  if(tree.op==='÷')steps.push({text:'Check with multiplication.',equation:`${answer} × ${b.text} = ${a.text}`});
  if(tree.op==='×'&&b.value.d===1&&b.value.n>=10){
   const parts=String(b.value.n).split('').map((digit,i,all)=>Number(digit)*10**(all.length-i-1)).filter(Boolean);
   if(parts.length>1){const partials=parts.map(part=>operation('×',a.value,rational(part)));steps.splice(0,1,...parts.map((part,i)=>({text:`Multiply by ${part}.`,equation:`${a.text} × ${part} = ${format(partials[i])}`})),{text:'Add the partial products.',equation:`${partials.map(format).join(' + ')} = ${answer}`});}
  }
 }
 return {key:`arithmetic-${familyId}:${variantIndex}:${seed}:${index}`,prompt:binary?'Calculate.':'Find the value.',display:expression,answer,hint,explanation:steps.map(s=>`${s.text} ${s.equation??''}`).join(' '),workedSteps:steps,proof:result.proof};
}
export function makeArithmeticTemplate(familyId:string,seed:number,index=0):Question{
 const family=ARITHMETIC_FAMILIES.find(f=>f.id===familyId);if(!family)throw Error(`Unknown arithmetic family ${familyId}`);
 const r=new Rng(hashString(`arithmetic-choice:${familyId}:${seed}:${index}`));return makeArithmeticVariant(familyId,r.int(0,family.variants.length-1),seed,index);
}
