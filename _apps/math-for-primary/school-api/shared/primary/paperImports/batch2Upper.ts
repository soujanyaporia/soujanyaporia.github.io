import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {PaperPicture} from '../paperPicture';
import {BATCH2_UPPER_PATTERNS,type Batch2UpperId} from './batch2UpperMeta';
import type {Batch2UpperPicture} from './batch2UpperPicture';
export {BATCH2_UPPER_PATTERNS,type Batch2UpperId} from './batch2UpperMeta';
export type Batch2UpperQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:Picture|Batch2UpperPicture;workedSteps:{text:string;equation?:string;picture?:Picture|Batch2UpperPicture}[]};
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});
const dollars=(n:number)=>(n/100).toFixed(2);
export function makeBatch2Upper(id:Batch2UpperId,seed:number,index=0):Batch2UpperQuestion{
 if(!BATCH2_UPPER_PATTERNS.some(p=>p.id===id))throw Error(`Unknown upper batch structure: ${id}`);
 const r=new Rng(hashString(`batch2-upper-v1:${id}:${seed}:${index}`));
 const make=(prompt:string,answer:number|string,picture:Batch2UpperQuestion['picture'],hint:string,workedSteps:Batch2UpperQuestion['workedSteps'],extra:Partial<Batch2UpperQuestion>={}):Batch2UpperQuestion=>({key:`batch2-upper:${id}:${seed}:${index}`,prompt,answer:String(answer),picture,hint,workedSteps,explanation:workedSteps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra});
 if(id==='three-square-area'){
  const small=r.pick([3,4,5]),large=r.pick([10,11,12,13,14,15].filter(v=>v>small*2)),medium=large-small,total=large**2+medium**2+small**2;
  return make('What is the total area of the three adjoining squares?',total,{type:'batch2-upper',layout:'three-squares',smallArea:small**2,largeArea:large**2},'A square’s side multiplied by itself gives its area. Use the two known sides to find the third.',[{text:'Find the side of the largest square.',equation:`${large} × ${large} = ${large**2}, so its side is ${large} cm`},{text:'Find the side of the smallest square.',equation:`${small} × ${small} = ${small**2}, so its side is ${small} cm`},{text:'The two stacked heights equal the side of the largest square.',equation:`${large} − ${small} = ${medium} cm`},{text:'Add the three separate square areas.',equation:`${large**2} + ${medium} × ${medium} + ${small**2} = ${total} cm²`}],{unit:'cm²'});
 }
 if(id==='linked-scores'){
  const smaller=r.int(35,160),gap=r.int(21,98),larger=smaller+gap,multiplier=r.pick([3,4,5]),pair=larger+smaller,total=pair*(multiplier+1);
  return make('How many points did Hana score?',larger,cards('Three players’ scores',[{label:'Hana, Iqbal and Jia together',value:`${total} points`},{label:'Hana scores more than Iqbal',value:`${gap} points`},{label:'Jia’s score',value:`${multiplier} times Hana and Iqbal’s combined score`}]),'Treat Hana and Iqbal’s combined score as one unit. Find that total before using their difference.',[{text:'Combine the pair unit and Jia’s units.',equation:`1 + ${multiplier} = ${multiplier+1} units`},{text:'Find Hana and Iqbal’s combined score.',equation:`${total} ÷ ${multiplier+1} = ${pair}`},{text:'Add the difference to make twice Hana’s score.',equation:`${pair} + ${gap} = ${2*larger}`},{text:'Divide by two.',equation:`${2*larger} ÷ 2 = ${larger}`}],{unit:'points'});
 }
 if(id==='mixed-purchase-more'){
  const ratio=r.pick([2,4,5]),count=r.pick([4,5,7,8]),other=r.pick([6,8,10,14]),unit=r.pick([15,20,25,30,35]),extra=r.pick([3,4,6,8]),price=unit*ratio,spent=count*price+other*unit,total=spent+extra*price,answer=count+extra;
  return make('How many brushes did Mira buy altogether?',answer,cards('Buy art supplies',[{label:'Money at first',value:`$${dollars(total)}`},{label:'First purchase',value:`${count} brushes and ${other} erasers`},{label:'First purchase costs',value:`$${dollars(spent)}`},{label:'One brush costs',value:`${ratio} times the price of one eraser`}]),'Convert the first purchase into eraser-price units. Find a brush price, then use the remaining money.',[{text:'Count eraser-price units in the first purchase.',equation:`${count} × ${ratio} + ${other} = ${count*ratio+other} units`},{text:'Find one eraser price and then one brush price.',equation:`${spent} ÷ ${count*ratio+other} = ${unit} cents; ${unit} × ${ratio} = ${price} cents`},{text:'Find the remaining money and additional brushes.',equation:`${total} − ${spent} = ${extra*price} cents; ${extra*price} ÷ ${price} = ${extra}`},{text:'Include the brushes bought first.',equation:`${count} + ${extra} = ${answer}`}],{context:['Mira spends all the remaining money on more brushes at the same price.'],unit:'brushes',choices:r.shuffle([...new Set([answer,count,extra,count+other,extra+other,answer+1,answer+2,answer+3])].slice(0,4).map(String))});
 }
 const inner=r.pick([18,20,22,24,26,28,30]),apex=r.pick([44,48,52,60,64,68,72]),base=(180-apex)/2,answer=base-inner;
 return make('Find angle NLM.',answer,{type:'batch2-upper',layout:'nested-isosceles',innerBaseAngle:inner,outerApexAngle:apex},'Each isosceles triangle has two equal base angles. Find both angles at L, then subtract.',[{text:'The two outer base angles are equal.',equation:`Angle KLM = (180° − ${apex}°) ÷ 2 = ${base}°`},{text:'The inner triangle also has equal base angles.',equation:`Angle KLN = ${inner}°`},{text:'Subtract the inner angle from the outer angle at L.',equation:`Angle NLM = ${base}° − ${inner}° = ${answer}°`}],{context:['KM = LM and KN = LN. N is inside triangle KLM.'],unit:'degrees',choices:r.shuffle([...new Set([answer,base,inner,180-apex,answer+7,answer+11])].slice(0,4).map(String))});
}
