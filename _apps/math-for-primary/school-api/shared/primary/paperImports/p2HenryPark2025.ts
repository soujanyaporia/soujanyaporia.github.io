import {Rng,hashString} from '../../engine/random';
import type {Activity} from '../catalog';
import type {Question,Picture,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';
import {exampleGrouping,groupingValue,type GroupingSpec} from '../groupingAnswer';
import type {SentenceOperation} from '../answerFormat';
import {P2_HENRY_PARK_2025_PATTERNS} from './p2HenryPark2025Meta';
export {P2_HENRY_PARK_2025_PATTERNS,P2_HENRY_PARK_2025_SOURCE} from './p2HenryPark2025Meta';
export type P2ImportedQuestion=Question&{grouping?:GroupingSpec;picture:Picture;workedSteps:NonNullable<Question['workedSteps']>};
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});
const groups=(count:number,size:number,heading='Equal groups of apples'):PaperPicture=>cards(heading,Array.from({length:count},(_,i)=>({label:`Group ${i+1}`,value:'Count the apples',icon:'fruit',count:size})));
const numbers=(heading:string,labels:string[],values:(string|number)[]):PaperPicture=>cards(heading,values.map((v,i)=>({label:labels[i],value:String(v),icon:'number'})));
const choices=(r:Rng,answer:number,wrong:number[])=>r.shuffle([...new Set([answer,...wrong.filter(n=>n>=0&&n<=100&&n!==answer)])].slice(0,4)).map(String);
type Step=[text:string,equation?:string];
/** Original mathematical variants, with shared givens retained for linked response parts. */
export function makeP2HenryPark2025Question(activity:Activity,seed:number,index=0):P2ImportedQuestion{
 const meta=P2_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter===activity.parameter);if(!meta)throw Error(`Unknown P2 pilot task ${activity.parameter}`);
 const id=meta.parameter.slice(6),r=new Rng(hashString(`hp2025-p2-quiz2-v1:${seed}:${index}:${meta.group}`));
 const make=(prompt:string,answer:string|number,picture:Picture,context:string[],hint:string,steps:Step[],proof?:Proof,extra:Partial<P2ImportedQuestion>={}):P2ImportedQuestion=>({key:`${activity.id}:${seed}:${index}`,prompt,answer:String(answer),picture,context,hint,workedSteps:steps.map(([text,equation])=>({text,equation,picture})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),proof,...extra});
 if(id==='01'){
  const size=r.pick([2,3,4,5]),count=r.pick([2,3,4,5,6].filter(n=>n!==size&&!(n===6&&size===3))),wrong=`${size} groups of ${count}`;
  return make('Which description does not match the groups shown?',wrong,groups(count,size),['Describe how the apples are grouped, not just the total number.'],'Count the groups and the apples in each group separately.',[[`There are ${count} groups. Each group has ${size} apples.`,`${count} groups of ${size}`],['Swapping the number of groups and the group size describes a different arrangement.',`${size} groups of ${count} does not match`]],undefined,{choices:r.shuffle([wrong,`${count} groups of ${size}`,`${count} lots of ${size}`,Array(count).fill(size).join(' + ')])});
 }
 if(id==='02'||id==='11'){
  const count=r.pick([2,3,4,5,10]),size=r.int(2,9);let total=count*size;if((id==='02'&&total===18&&count===2)||(id==='11'&&total===30&&count===5))total+=count;const answer=total/count;
  return make(id==='02'?'How many stickers does each child receive?':'How many beads go into each pouch?',answer,numbers('Share equally',['Total',id==='02'?'Children':'Pouches'],[total,count]),[id==='02'?'All the stickers are shared equally among the children.':'All the beads are packed equally into the pouches.'],'Divide the total by the number of equal shares.',[['Make equal shares.',`${total} ÷ ${count} = ${answer}`],['Check the total by multiplying.',`${count} × ${answer} = ${total}`]],op('/',total,count),id==='02'?{choices:choices(r,answer,[total-count,total+count,count*total,answer+1,answer-1])}:{});
 }
 if(id==='03'){
  const size=r.pick([2,3,4,5,10]),count=r.pick([2,3,4,5,6,7,8,9].filter(n=>!(n===3&&size===5))),answer=count*size;
  return make('How many pencils are in all the packs?',answer,numbers('Identical pencil packs',['Packs','Pencils in each pack'],[count,size]),['Every pack contains the same number of pencils.'],'Multiply the number of packs by the number in each pack.',[['Count equal packs.',`${count} × ${size} = ${answer}`],['Each pack contributes the same amount.',Array(count).fill(size).join(' + ')+` = ${answer}`]],op('*',count,size),{choices:choices(r,answer,[count+size,answer+size,answer-size,count*10+size])});
 }
 if(id==='04'){
  const n=r.pick([2,3,4,5]),square=n*n;
  return make('What positive whole number does ◆ stand for?',n,{type:'pattern',items:['◆','×','◆','=',String(square)]},['Both diamonds stand for the same number.'],'Find a number that gives this product when multiplied by itself.',[['Try equal factors.',`${n} × ${n} = ${square}`],['Both diamonds have the same value.',`◆ = ${n}`]],n,{choices:choices(r,n,[n-1,n+1,square,Math.floor(square/2)])});
 }
 if(id==='05'){
  const large=r.int(5,10),small=r.int(2,large-1),size=r.pick([2,3,4,5,10].filter(n=>!(large===9&&small===7&&n===5))),answer=(large-small)*size;
  return make('How much greater is the first total?',answer,numbers('Compare the products',['First total','Second total'],[`${large} × ${size}`,`${small} × ${size}`]),[],'The group size is the same. Count the extra groups.',[['Find how many extra groups there are.',`${large} − ${small} = ${large-small}`],['Each extra group contributes the same amount.',`${large-small} × ${size} = ${answer}`]],op('*',op('-',large,small),size),{choices:choices(r,answer,[large-small,large+small,answer+size,answer-size])});
 }
 if(id==='06'){
  const size=r.pick([2,3,4,5]),count=r.pick([3,4,5,6,7,8].filter(n=>!(n===7&&size===2))),total=size*count;
  return make('Which sign makes the number sentence true?','÷',groups(count,size),[], 'The sentence starts with all the apples and finds how many groups.',[['Count the apples altogether.',`${count} × ${size} = ${total}`],['Find the number of groups by dividing.',`${total} ÷ ${size} = ${count}`]],undefined,{display:`${total} ? ${size} = ${count}`,choices:['+','−','×','÷']});
 }
 if(id==='07'||id==='10'){
  const size=r.pick([2,3,5]),count=r.int(3,6),total=size*count,spec:GroupingSpec={total,objectLabel:'gift',target:{kind:id==='07'?'size':'count',value:id==='07'?size:count}};
  return make(id==='07'?`Put the gifts into groups of ${size}.`:`Put the gifts into ${count} equal groups.`,groupingValue(exampleGrouping(spec)),numbers('Make equal groups',['Gifts to group'],[total]),['Use every gift exactly once.'],id==='07'?'Choose the requested number of gifts for each new group.':'Share the gifts equally across the requested number of groups.',[[id==='07'?'Count how many complete groups you can make.':'Find the number in each group.',id==='07'?`${total} ÷ ${size} = ${count} groups`:`${total} ÷ ${count} = ${size}`],['Check that all gifts are used.',`${count} groups of ${size} = ${total}`]],undefined,{grouping:spec});
 }
 if(id==='08'){
  const divisor=r.pick([2,3,4,5,10]),quotient=r.int(2,9);let total=divisor*quotient;if(total===30&&divisor===5)total=35;const q=total/divisor;
  return make('What number belongs in the empty box?',total,{type:'pattern',items:['?','÷',String(divisor),'=',String(q)]},[],'Undo division by multiplying the quotient by the divisor.',[['Multiply to rebuild the starting number.',`${q} × ${divisor} = ${total}`],['Check the original division.',`${total} ÷ ${divisor} = ${q}`]],op('*',q,divisor));
 }
 if(id==='09'){
  const n=r.int(2,9),known=r.pick([2,3,4,5]),next=r.pick([2,3,4,5,10].filter(v=>v!==known&&!(n===4&&known===2&&v===10))),total=n*known,answer=n*next;
  return make('What is the missing product?',answer,numbers('Use the same mystery number',['Clue','Find'],[`◆ × ${known} = ${total}`,`◆ × ${next} = ?`]),['The diamond has the same value in both sentences.'],'Use the first sentence to find the diamond, then multiply again.',[['Find the mystery number.',`${total} ÷ ${known} = ${n}`],['Use it in the second sentence.',`${n} × ${next} = ${answer}`]],op('*',op('/',total,known),next));
 }
 if(id.startsWith('12-')){
  const size=r.pick([2,3,4,5]),count=r.pick([2,3,4,5,6].filter(v=>v!==size&&!(v===4&&size===5))),total=count*size,operation:SentenceOperation=id.endsWith('multiply')?'*':'/',answer=operation==='*'?`${count} * ${size} = ${total}`:`${total} / ${count} = ${size}`;
  return make(operation==='*'?'Write a multiplication sentence for the picture.':'Write a division sentence for the picture.',answer,groups(count,size),['Count the groups and the objects in each group.'],'Use the group count, group size and total to build a related fact.',[['Count the groups and the objects in each.',`${count} groups of ${size} = ${total}`],['One correct sentence is:',answer.replace('*','×').replace('/','÷')]],op(operation,operation==='*'?count:total,operation==='*'?size:count),{numberSentence:{numbers:[count,size,total],operation,freeEntry:true}});
 }
 if(id==='13-a-factor'||id==='13-a-divisor'||id==='13-b'){
  const count=r.pick([3,4,5,6,7,8,9].filter(n=>n!==(id==='13-b'?8:5))),per=2,total=count*per,division=id.endsWith('divisor');
  const pic=id==='13-b'?numbers('Ribbon packs',['Ribbons in all','Ribbons in each pack'],[total,per]):cards('Each pack holds two ribbons',[{label:'Packs',value:'Count the packs',icon:'box',count}]);
  return make(id==='13-b'?'How many packs of ribbons are there?':'What number belongs in the empty box?',count,pic,['Every pack holds exactly 2 ribbons.'], 'Use the total ribbons and the number in each pack.',[['Make pairs of ribbons.',`${total} ÷ 2 = ${count}`],['The related facts use the same three numbers.',`${count} × 2 = ${total}; ${total} ÷ ${count} = 2`]],op('/',total,2),id==='13-b'?{}:{display:division?`${total} ÷ ? = 2`:`? × 2 = ${total}`});
 }
 if(id==='14'){
  const a=r.int(2,6),b=r.int(1,4),count=r.pick([2,3,4,5,10]),answer=(a+b)*count;
  return make('How many books are packed altogether?',answer,numbers('Identical reading packs',['Storybooks in each pack','Activity books in each pack','Packs'],[a,b,count]),['Every pack contains both kinds of book shown.'],'Find all the books in one pack before multiplying.',[['Add both types in a single pack.',`${a} + ${b} = ${a+b}`],['Repeat that amount for every pack.',`${a+b} × ${count} = ${answer}`]],op('*',op('+',a,b),count));
 }
 if(id.startsWith('15-')){
  const size=r.pick([2,3,4,5]),count=r.int(4,8),total=size*count,claimed=total+(r.chance(.5)?0:size),friends=r.pick([1,2,3,4,9]),children=r.pick([2,3,4,5,10]),isTotal=id==='15-total',receivers=id==='15-friends'?friends+1:children,truth=isTotal?claimed===total:total%receivers===0;
  const claim=isTotal?`There are ${claimed} apples altogether.`:id==='15-friends'?`Hana and her ${friends} ${friends===1?'friend':'friends'} can share all the apples equally.`:`All the apples can be shared equally among ${children} children.`;
  return make('Is the statement true or false?',truth?'True':'False',groups(count,size),[claim,...(isTotal?[]:['Every apple stays whole. No apples may be left over.'])],isTotal?'Count the groups and find their total.':'Include every person, then check whether every share can be equal.',[['Find the total apples.',`${count} × ${size} = ${total}`],isTotal?[`Compare the counted total with the statement.`,`${total} ${truth?'=':'≠'} ${claimed}`]:[`There are ${receivers} people. ${truth?'Each gets an equal whole-number share.':'Some apples are left over, so the whole apples cannot be shared equally.'}`,`${receivers} × ${Math.floor(total/receivers)} = ${total-total%receivers}; ${total%receivers} left over`]],undefined,{choices:['True','False']});
 }
 if(id==='16'){
  const count=r.int(3,9),size=r.pick([2,3,4,5]),bought=r.pick(Array.from({length:Math.min(9,count*size-1)},(_,i)=>i+1).filter(n=>!(count===6&&size===2&&n===5))),answer=count*size-bought;
  return make('How many pencils did Lina have before buying more?',answer,numbers('After buying more',['Boxes filled','Pencils in each box','Pencils bought'],[count,size,bought]),['Lina bought some pencils, then packed all her pencils equally into the boxes.'],'Find how many pencils she has now. Undo the purchase.',[['Find the final total in all the boxes.',`${count} × ${size} = ${count*size}`],['Take away the pencils she bought.',`${count*size} − ${bought} = ${answer}`]],op('-',op('*',count,size),bought));
 }
 if(/^(17|18|19-[ab])-(equation|answer)$/.test(id)){
  const count=r.pick([2,3,4,5,10]),size=r.pick([2,3,4,5,6,7,8,9].filter(n=>!(id.startsWith('18')&&count===3&&n===9)&&!(id.startsWith('19')&&count===10&&n===4))),second=r.int(2,9),is19=id.startsWith('19'),isB=id.startsWith('19-b'),is17=id.startsWith('17'),divide=is17||(is19&&!isB),unit=is19?(isB?'muffins':'sandwiches'):'stickers',total=count*size,per=isB?second:size,answer=divide?(is17?count:size):count*per;
  const a=divide?total:count,b=divide?(is17?size:count):per,operation:SentenceOperation=divide?'/':'*',sentence=`${a} ${operation} ${b} = ${answer}`;
  let context:string[],prompt:string,picture:PaperPicture;
  if(is17){context=['Hana gives out all the stickers shown. Each child receives the same share.'];prompt='How many children receive stickers?';picture=numbers('Equal gifts',['Stickers in all','Stickers per child'],[total,size]);}
  else if(id.startsWith('18')){context=['Noor gives all her stickers equally to the children. Each child receives the number shown.'];prompt='How many stickers did Noor have at first?';picture=numbers('Find the starting collection',['Children','Stickers per child'],[count,size]);}
  else{context=[`There are ${count} trays. ${total} sandwiches are shared equally across all these trays.`,...(isB?[`${second} muffins are then placed on each of the same trays.`]:[])];prompt=isB?'How many muffins are on the trays altogether?':'How many sandwiches are on each tray?';picture=numbers('Use the same trays',['Trays','Sandwiches in all',...(isB?['Muffins per tray']:[])],[count,total,...(isB?[second]:[])]);}
  const eq=id.endsWith('equation');return make(eq?'Build a number sentence to answer the story.':prompt,eq?sentence:answer,picture,eq?[...context,prompt]:context,divide?'Use division to find the number of equal shares or the size of each share.':'Use multiplication to combine equal shares.',[['Identify the total and equal groups.',divide?`${total} in all`:`${count} equal groups of ${per}`],['Calculate the missing amount.',sentence.replace('*','×').replace('/','÷')]],op(operation,a,b),eq?{numberSentence:{numbers:r.shuffle([a,b]),operation,missingResult:true,chooseOperation:true}}:{unit:is17?'children':unit});
 }
 throw Error(`Unhandled P2 task ${id}`);
}
export function makeP2HenryPark2025Set(seed:number,variant=0){return P2_HENRY_PARK_2025_PATTERNS.map(pattern=>({pattern,question:makeP2HenryPark2025Question({...pattern,id:`p2s-paper-${pattern.parameter}`,track:'standard',kind:'paper'},seed,variant)}));}
