import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';

export const RAG_PATTERN={
 id:'p3-unresolved-visual-relationships',
 level:3,
 title:'Find hidden numbers from a layout',
 objective:'Use place value in a subtraction layout, or a repeated rule in a target figure, to find hidden numbers.',
 skillIds:['P3.S.AS.01','P3.S.MD.03','P3.S.WN.01'],
 canonicalPatternId:'p3-unresolved-visual-relationships',
};

const times=(a:Proof,b:Proof):Proof=>({op:'*',a,b});
const divide=(a:Proof,b:Proof):Proof=>({op:'/',a,b});

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`p3-unresolved-visual-relationships:${seed}:${index}`));
 const variant=(((seed+index)%3)+3)%3;
 const key=`rag-p3-unresolved-visual-relationships:${seed}:${index}`;
 if(variant===0){
  const a=r.int(5,9),b=r.int(1,9),prefix=r.int(100,a*100-100),subtrahend=prefix*10+b,difference=a*1000-subtrahend;
  const onesOfDifference=difference%10;
  const steps=[
   {text:'Subtraction can be checked by adding. The answer plus the number taken away gives the start number.',equation:`${difference} + ${prefix}B = A000`},
   {text:'The ones digit of the start number is 0, so B and the ones digit of the answer must make a number ending in 0.',equation:`${onesOfDifference} + B ends in 0, so B = ${b}`},
   {text:'Now add the whole numbers to find the start number.',equation:`${difference} + ${subtrahend} = ${a*1000}`},
   {text:`The thousands digit is ${a}.`,equation:`A = ${a}`},
  ];
  return {
   key,prompt:'Find the digits A and B that make this subtraction correct.',context:['A and B each stand for one digit.'],display:`A000 − ${prefix}B = ${difference}`,
   answer:JSON.stringify([String(a),String(b)]),structuredResponse:{kind:'number-pair',firstLabel:'A',secondLabel:'B'},
   hint:'Add the answer to the number taken away. Start with the ones.',workedSteps:steps,explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),
  };
 }
 const centre=r.int(3,9),middles=r.shuffle([2,3,4,5,6,7,8,9,10,11,12]).slice(0,4),outers=middles.map(m=>m*centre),unknown=r.int(0,3);
 const names=['Top left','Top right','Bottom left','Bottom right'];
 const findOuter=variant===1;
 const known=[0,1,2,3].find(i=>i!==unknown)!;
 const cards:Extract<PaperPicture,{layout:'cards'}>['cards']=[
  ...names.map((label,i)=>({label,value:i===unknown?(findOuter?`outer A · middle ${middles[i]}`:`outer ${outers[i]} · middle A`):`outer ${outers[i]} · middle ${middles[i]}`})),
  {label:'Centre',value:String(centre)},
 ];
 const answer=findOuter?outers[unknown]:middles[unknown];
 const steps=findOuter?[
  {text:'Compare a complete quarter with the centre number to find the rule.',equation:`${middles[known]} × ${centre} = ${outers[known]}`},
  {text:'Use the same rule in the quarter with A.',equation:`${middles[unknown]} × ${centre} = ${answer}`},
 ]:[
  {text:'Compare a complete quarter with the centre number to find the rule.',equation:`${middles[known]} × ${centre} = ${outers[known]}`},
  {text:'The rule goes backwards for the middle number, so divide the outer number by the centre number.',equation:`${outers[unknown]} ÷ ${centre} = ${answer}`},
 ];
 return {
  key,prompt:'What number does A stand for?',
  context:['The target has a centre circle, a middle ring and an outer ring. It is split into four quarters, and every quarter follows the same rule.'],
  picture:{type:'paper',layout:'cards',heading:'Target numbers',cards},answer:String(answer),
  hint:'Look at a quarter with no letter. How does its outer number come from its middle number and the centre number?',
  workedSteps:steps,explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),
  proof:findOuter?times(middles[unknown],centre):divide(outers[unknown],centre),
 };
}
