import {Rng,hashString} from '../../engine/random';
import type {Activity} from '../catalog';
import type {Question,Picture,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {P6CatholicPicture} from './p6CatholicPicture';
import {P6_CATHOLIC_2025_PATTERNS} from './p6Catholic2025Meta';
export {P6_CATHOLIC_2025_PATTERNS,P6_CATHOLIC_2025_SOURCE} from './p6Catholic2025Meta';
type PilotPicture=Picture|P6CatholicPicture;
export type P6ImportedQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:PilotPicture;workedSteps:{text:string;equation?:string;picture?:PilotPicture}[]};
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const money=(n:number)=>`$${n.toFixed(2)}`;
const rounded=(n:number)=>Number(n.toFixed(6));
const cards=(heading:string,labels:string[],values:(string|number)[]):PaperPicture=>({type:'paper',layout:'cards',heading,cards:values.map((v,i)=>({label:labels[i],value:String(v),icon:'number'}))});
type Step=[text:string,equation?:string];
export function makeP6Catholic2025Question(activity:Activity,seed:number,index=0):P6ImportedQuestion{
 const meta=P6_CATHOLIC_2025_PATTERNS.find(p=>p.parameter===activity.parameter);if(!meta)throw Error(`Unknown P6 source task ${activity.parameter}`);
 const id=meta.parameter.slice(6),r=new Rng(hashString(`ch2025-p6-assessment2-v1:${seed}:${index}:${meta.group}`));
 const make=(prompt:string,answer:string|number,picture:PilotPicture,context:string[],hint:string,steps:Step[],proof?:Proof,extra:Partial<P6ImportedQuestion>={}):P6ImportedQuestion=>({key:`${activity.id}:${seed}:${index}`,prompt,answer:String(answer),picture,context,hint,workedSteps:steps.map(([text,equation])=>({text,equation,picture})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),proof,...extra});
 if(id==='01'){
  const price=r.pick(Array.from({length:50},(_,i)=>i+12).filter(n=>n!==25)),rate=9,paid=rounded(price*1.09);
  return make('What was the price before GST?',price,cards('Art-kit receipt',['Paid, including GST','GST rate'],[money(paid),`${rate}%`]),['An art kit costs the amount on the receipt after 9% GST is added.'],'The paid amount is 109% of the price before GST.',[['Include the original 100% and the tax.',`100% + 9% = 109%`],['Find 1%, then recover 100%.',`${paid.toFixed(2)} ÷ 109 × 100 = ${price.toFixed(2)}`]],op('*',op('/',paid,109),100),{unit:'dollars'});
 }
 if(id==='02'){
  const radius=r.pick([4,7,8,9,12,14,16,18,24,28]),coefficient=2*radius;
  return make('Find the circumference in terms of π.',`${coefficient}π`,{type:'catholic-p6',layout:'circle',measure:'radius',value:radius},['Give an exact answer using π, rather than a decimal.'],'Circumference is π times the diameter.',[['Double the radius to find the diameter.',`${radius} × 2 = ${coefficient}`],['Multiply the diameter by π.',`C = ${coefficient}π cm`]],undefined,{answerFormat:'pi',unit:'cm'});
 }
 if(id==='03'){
  const angle=r.pick([52,54,56,58,60,64,66,68,70]),small=90-angle,answer=90-2*small;
  return make('Find angle p after the corner is folded.',answer,{type:'catholic-p6',layout:'fold',angle},['The paper starts as a rectangle. It is folded along the dashed crease shown.'],'The folded corner stays a right angle. The crease makes equal angles with an edge and its reflection.',[['Find the other angle in the folded right triangle.',`180° − 90° − ${angle}° = ${small}°`],['Reflection makes an equal angle on the other side of the crease.',`${small}° + ${small}° = ${2*small}°`],['Subtract both angles from the rectangle’s top right angle.',`p = 90° − ${2*small}° = ${answer}°`]],op('-',90,op('*',2,op('-',90,angle))),{unit:'°'});
 }
 if(id==='04'){
  const price=r.pick([80,120,160,180,240,280,360,420,480]),discount=r.pick([10,15,20,25,30]),answer=price*(100-discount)/100;
  return make('What is the price after the discount?',answer,cards('Sale at the sports shop',['Usual price','Discount'],[money(price),`${discount}%`]),['The discount is taken from the usual price of a sports bag.'],'Subtract the discount percentage from 100%. Pay that fraction of the original price.',[['Find the percentage still payable.',`100% − ${discount}% = ${100-discount}%`],['Calculate the sale price.',`${100-discount}/100 × ${price} = ${answer.toFixed(2)}`]],op('*',op('/',100-discount,100),price),{unit:'dollars'});
 }
 if(id==='05'){
  const angle=r.pick([30,34,38,40,42,46,48,50,54,58]),apex=90+angle,answer=(180-apex)/2;
  return make('Find angle GFD, marked p.',answer,{type:'catholic-p6',layout:'square-rhombus',angle},['ABCD is a square. CEFD is a rhombus.','A, G and F lie on one straight line. C, G and D lie on another.'],'Use the shared side to find two equal sides of triangle ADF.',[['A square and a rhombus have equal sides, so AD = DC = DF. Triangle ADF is isosceles.'],['Combine the right angle with the angle at D.',`∠ADF = 90° + ${angle}° = ${apex}°`],['The other two angles of triangle ADF are equal.',`p = (180° − ${apex}°) ÷ 2 = ${answer}°`]],op('/',op('-',180,op('+',90,angle)),2),{unit:'°'});
 }
 if(id==='06'){
  const radius=r.pick([7,14,21,28,42,49]),diameter=radius*2,answer=22*radius*radius/7;
  return make('Find the area of the circle.',answer,{type:'catholic-p6',layout:'circle',measure:'diameter',value:diameter},['Use π = 22/7.'],'The radius is half the diameter. Square the radius, then multiply by π.',[['Halve the given diameter.',`${diameter} ÷ 2 = ${radius} cm`],['Apply the circle area formula.',`A = 22/7 × ${radius} × ${radius} = ${answer} cm²`]],op('*',op('/',22,7),op('*',radius,radius)),{unit:'cm²'});
 }
 if(id==='07'){
  const side=r.pick([4,5,7,8,9,10,12]),square=side*side,quarter=3.14*square/4,answer=rounded(square+quarter);
  return make('Find the area of the whole figure.',answer,{type:'catholic-p6',layout:'quarter-square',side},['A quarter circle and a square share the dashed side. Use π = 3.14.'],'The square side is also the radius of the quarter circle.',[['Calculate the square area.',`${side} × ${side} = ${square} cm²`],['Calculate one quarter of the circle area.',`3.14 × ${side} × ${side} ÷ 4 = ${rounded(quarter)} cm²`],['Join the two non-overlapping areas.',`${square} + ${rounded(quarter)} = ${answer} cm²`]],op('+',square,op('/',op('*',3.14,square),4)),{unit:'cm²'});
 }
 if(id==='08'){
  const alpha=r.pick([24,28,32,36,40]),beta=r.pick([64,68,72,80,84]),gamma=r.pick([102,106,110,114,118].filter(g=>g+alpha+beta-180>10&&g+alpha+beta-180<60)),first=180-beta,inside=first-alpha,answer=gamma-inside;
  return make('Find angle BEF, marked p.',answer,{type:'catholic-p6',layout:'parallel-shapes',alpha,beta,gamma},['EFGH is a parallelogram. EBHA is a trapezium, with AE parallel to HB.'],'First use the parallel sides in the trapezium. Then use opposite angles in the parallelogram.',[['The angles between parallel AE and HB add to 180°.',`∠AEB = 180° − ${beta}° = ${first}°`],['Remove the small angle AEH.',`∠BEH = ${first}° − ${alpha}° = ${inside}°`],['Opposite parallelogram angles E and G are equal.',`p = ${gamma}° − ${inside}° = ${answer}°`]],op('-',gamma,op('-',op('-',180,beta),alpha)),{unit:'°'});
 }
 if(id==='09'){
  const radius=r.pick([3,5,6,7]),length=r.pick([18,20,22,26,28,30,32]),curves=rounded(2*3.14*radius),answer=rounded(2*length+curves);
  return make('Find the perimeter around the outside.',answer,{type:'catholic-p6',layout:'stadium',length,radius},['Two identical semicircles are attached to the short sides of a rectangle. Use π = 3.14.'],'The two curved ends together make one full circumference. Count only the two long straight sides.',[['Join the two semicircular arcs.',`2 × 3.14 × ${radius} = ${curves} m`],['Add the two straight boundary lengths.',`2 × ${length} = ${2*length} m`],['Combine the curves and straight sides.',`${curves} + ${2*length} = ${answer} m`]],op('+',op('*',2,length),op('*',op('*',2,3.14),radius)),{unit:'m'});
 }
 if(id==='10'){
  const increase=r.pick([10,20,25,30]),decrease=r.pick([10,15,20,25]),first=r.pick(Array.from({length:25},(_,i)=>(i+3)*100).filter(n=>Number.isInteger(n*(100+increase)*(100-decrease)/10000))),second=first*(100+increase)/100,last=second*(100-decrease)/100;
  const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Visitors over three weeks',points:[{label:'Week 1: ?'},{label:'Week 2: ?'},{label:`Week 3: ${last}`}],gaps:[`Increase ${increase}%`,`Decrease ${decrease}%`]};
  return make('How many visitors came in Week 1?',first,picture,['Week 2 is compared with Week 1. Week 3 is compared with Week 2.'],'Undo the last change first. Each percentage uses the preceding week as its whole.',[['Week 3 is the remaining percentage of Week 2.',`Week 2 = ${last} ÷ ${100-decrease} × 100 = ${second}`],['Undo the earlier increase.',`Week 1 = ${second} ÷ ${100+increase} × 100 = ${first}`]],op('*',op('/',op('*',op('/',last,100-decrease),100),100+increase),100),{unit:'visitors'});
 }
 if(id==='11-a'||id==='11-b'){
  const initialPercent=r.pick([40,50,60,70]),finalPercent=r.pick([10,20,25].filter(n=>n<initialPercent)),total=r.pick(Array.from({length:46},(_,i)=>(i+5)*10).filter(n=>Number.isInteger(n*initialPercent/100)&&Number.isInteger(n*(100-initialPercent)*finalPercent/(100*(100-finalPercent))))),unchanged=total*(100-initialPercent)/100,initialGroup=total*initialPercent/100,remaining=unchanged*finalPercent/(100-finalPercent),left=initialGroup-remaining,askUnchanged=id.endsWith('-a');
  const picture=cards('School coding club',['Pupils at first','Girls at first','Girls after some leave'],[total,`${initialPercent}%`,`${finalPercent}%`]);
  return make(askUnchanged?'How many boys are in the club?':'How many girls leave the club?',askUnchanged?unchanged:left,picture,['The club has only boys and girls. Only some girls leave. No boys join or leave.','The final percentage refers to all pupils still in the club.'],'The number of boys stays the same, even though their percentage changes.',askUnchanged?[['Find the percentage of boys.',`100% − ${initialPercent}% = ${100-initialPercent}%`],['Find the number of boys.',`${100-initialPercent}/100 × ${total} = ${unchanged}`]]:[['Find the boys, whose number does not change.',`${100-initialPercent}/100 × ${total} = ${unchanged}`],['Use the boys to recover the final girls count.',`${unchanged} ÷ ${100-finalPercent} × ${finalPercent} = ${remaining}`],['Compare the initial and final girls counts.',`${initialGroup} − ${remaining} = ${left} girls leave`]],askUnchanged?op('*',op('/',100-initialPercent,100),total):op('-',op('*',op('/',initialPercent,100),total),op('*',op('/',unchanged,100-finalPercent),finalPercent)),{unit:askUnchanged?'boys':'girls'});
 }
 throw Error(`Unhandled P6 task ${id}`);
}
export function makeP6Catholic2025Set(seed:number,variant=0){return P6_CATHOLIC_2025_PATTERNS.map(pattern=>({pattern,question:makeP6Catholic2025Question({...pattern,id:`p6s-paper-${pattern.parameter}`,track:'standard',kind:'paper'},seed,variant)}));}
