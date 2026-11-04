import {Rng,hashString} from '../../engine/random';
import type {Activity} from '../catalog';
import type {Question,Picture,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {MissingDigitColumnModel} from './missingDigitModel';
import {P1_HENRY_PARK_2025_PATTERNS} from './p1HenryPark2025Meta';
export {P1_HENRY_PARK_2025_PATTERNS,P1_HENRY_PARK_2025_SOURCE} from './p1HenryPark2025Meta';

type PilotPicture=Picture|MissingDigitColumnModel;
export type P1ImportedQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:PilotPicture;workedSteps:{text:string;equation?:string;picture?:PilotPicture}[]};
const op=(symbol:'+'|'-'|'*',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});
const numberCards=(values:(number|string)[]):Picture=>({type:'pattern',items:values.map(String)});
const packets=(tens:number,ones:number,label='Books'):PaperPicture=>cards(label,[{label:'Boxes of ten',value:'Count the boxes',icon:'box',count:tens},{label:'Loose books',value:'Count the books',icon:'book',count:ones}]);
const packetContext='Each closed box holds 10 books. Loose books are outside the boxes.';
const names=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
function words(n:number):string{if(n<20)return names[n];const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];return tens[Math.floor(n/10)]+(n%10?`-${names[n%10]}`:'');}
const choose=(r:Rng,answer:number,wrong:number[])=>r.shuffle([...new Set([answer,...wrong.filter(n=>n>=0&&n<=100&&n!==answer)])].slice(0,4)).map(String);
type Step=[text:string,equation?:string];

/** Original variants of every reviewed source response. This module is deliberately not routed yet. */
export function makeP1HenryPark2025Question(activity:Activity,seed:number,index=0):P1ImportedQuestion{
 const meta=P1_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter===activity.parameter);
 if(!meta)throw Error(`Unknown P1 pilot task: ${activity.parameter}`);
 const slug=meta.parameter.slice(5),r=new Rng(hashString(`hp2025-quiz3-v1:${seed}:${index}:${meta.group}`));
 const make=(prompt:string,answer:string|number,picture:PilotPicture,context:string[],hint:string,steps:Step[],proof?:Proof,extra:Partial<P1ImportedQuestion>={}):P1ImportedQuestion=>({
  key:`${activity.id}:${seed}:${index}`,prompt,answer:String(answer),picture,context,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation,picture})),explanation:steps.map(([text,equation])=>[text,equation].filter(Boolean).join(' ')).join(' '),proof,...extra,
 });
 if(slug==='01'){
  const tens=r.int(2,8);let ones=r.int(1,9);if(tens===5&&ones===6)ones=7;const total=tens*10+ones;
  return make('How many books are in the delivery?',total,packets(tens,ones,'The book delivery'),[packetContext],'Count ten books for each box, then include the loose books.',[['Count the books packed in boxes.',`${tens} × 10 = ${tens*10}`],['Add the loose books.',`${tens*10} + ${ones} = ${total}`]],op('+',op('*',tens,10),ones),{choices:choose(r,total,[total-1,total+1,total-10,total+10])});
 }
 if(slug==='02'){
  const tens=r.int(2,8);let ones=r.int(1,9);if(tens===3&&ones===3)ones=4;const n=10*tens+ones,wrong=`${tens} + ${ones}`;
  const choices=r.shuffle([`${10*tens} + ${ones}`,`${tens} tens ${ones} ones`,words(n),wrong]);
  return make(`Which choice does not have the same value as ${n}?`,wrong,cards('Compare the representations',[{label:'Target number',value:String(n),icon:'number'}]),[],'A tens digit counts groups of ten, not single ones.',[['The tens and ones make the target number.',`${tens} tens + ${ones} ones = ${n}`],[`Adding the two digits as ones gives a different value.`,`${wrong} = ${tens+ones}`]],undefined,{choices});
 }
 if(slug==='03'){
  const more=r.int(8,12),fewer=r.int(2,more-2),answer=more-fewer;
  const picture=cards('Two apple trays',[{label:'Lina’s tray',value:'Count the apples',icon:'fruit',count:more},{label:'Noor’s tray',value:'Count the apples',icon:'fruit',count:fewer}]);
  return make('How many more apples does Lina have than Noor?',answer,picture,[],'Match one apple on each tray. Count Lina’s unmatched apples.',[['Count both collections.',`Lina: ${more}; Noor: ${fewer}`],['Subtract the smaller count from the larger count.',`${more} − ${fewer} = ${answer}`]],op('-',more,fewer),{choices:choose(r,answer,[answer+1,answer-1,more+fewer,more])});
 }
 if(slug==='04'){
  let n=r.int(31,99);if(n===89)n=88;const answer=n-10;
  return make(`What is 10 less than ${n}?`,answer,cards('Take away one ten',[{label:'Start',value:String(n),icon:'number'},{label:'Take away',value:'1 ten',icon:'box'}]),[],'Reduce the tens by one. Keep the ones unchanged.',[['One ten has a value of ten.',`1 ten = 10`],['Subtract ten from the starting number.',`${n} − 10 = ${answer}`]],op('-',n,10),{choices:choose(r,answer,[n-1,n+1,n+10,n-20])});
 }
 if(slug==='05'||slug==='09'){
  const at=r.int(1,5),bt=r.int(1,8-at),ao=r.int(2,7),bo=slug==='05'?r.int(10-ao,9):r.int(0,9-ao);
  let a=at*10+ao;const b=bt*10+bo;if(a===43&&b===39)a+=10;if(a===16&&b===72)a+=1;const answer=a+b,ones=a%10+b%10,tens=Math.floor(a/10)+Math.floor(b/10);
  return make('Add the two numbers.',answer,cards('Join the two amounts',[{label:'First number',value:String(a),icon:'number'},{label:'Add',value:String(b),icon:'number'}]),[],'Add the ones, then the tens. Exchange ten ones for one ten if needed.',[['Add the ones.',`${a%10} + ${b%10} = ${ones}`],['Combine the tens and ones.',`${tens*10} + ${ones} = ${answer}`]],op('+',a,b),{display:`${a} + ${b} = ?`,...(slug==='05'?{choices:choose(r,answer,[answer-10,answer+1,answer-1,answer-20])}:{})});
 }
 if(slug==='06'){
  let n=r.int(21,99);if(n===93)n=92;const tens=10*Math.floor(n/10),ones=n%10;
  return make('Write the number in words.',words(n),cards('Read the number card',[{label:'Number',value:String(n),icon:'number'}]),[],'Name the tens first, then the ones.',[[`The tens part is ${words(tens)}.`,`${n} = ${tens} + ${ones}`],[ones?`Add the word ${words(ones)} after ${words(tens)}.`:'There are no extra ones to name.',words(n)]],n,{answerFormat:'number-words'});
 }
 if(slug==='07'){
  const values=r.shuffle(Array.from({length:90},(_,i)=>i+10)).slice(0,4).sort((a,b)=>a-b);if(values.join(',')==='12,28,32,38')values[3]=39;
  const shuffled=r.shuffle(values);
  return make('Arrange the cards from smallest to greatest.',values.join(','),numberCards(shuffled),[],'Compare the tens first. When the tens match, compare the ones.',[['Find the smallest number first.',`${values[0]} is smallest`],['Place each remaining number after the smaller one.',values.join(' < ')]],undefined,{order:shuffled.map(String)});
 }
 if(slug==='08-tens'||slug==='08-ones'){
  const tens=r.int(2,8);let ones=r.int(1,9);if(tens===6&&ones===8)ones=7;const askTens=slug.endsWith('tens');
  return make(askTens?'How many tens are shown?':'How many loose ones are shown?',askTens?tens:ones,packets(tens,ones,'Tens and ones'),[packetContext],askTens?'Each complete box is one ten.':'Count only the books outside the boxes.',[[`Each box stands for one ten. There are ${tens} boxes.`],[`The ${ones} loose books are the ones.`,`${tens} tens and ${ones} ones`]],askTens?tens:ones);
 }
 if(slug==='10'){
  const step=r.pick([2,3,4,5]);let first=r.int(step*5+5,99);if(first===64&&step===4)first=65;const missing=r.pick([2,3]),values=Array.from({length:6},(_,i)=>first-i*step),answer=values[missing];
  return make('What number belongs in the empty box?',answer,numberCards(values.map((n,i)=>i===missing?'?':n)),['The same amount is subtracted at every step.'],'Compare two neighbouring known numbers to find the step.',[['Find the size of each backward step.',`${values[0]} − ${values[1]} = ${step}`],['Subtract that amount from the number before the gap.',`${values[missing-1]} − ${step} = ${answer}`]],op('-',values[missing-1],step));
 }
 if(slug==='11'){
  const upperTens=r.int(6,9),lowerTens=r.int(2,upperTens-3),digits=[r.int(upperTens,9),upperTens-1,r.int(1,lowerTens)];
  digits.push(r.pick([0,1,2,3,4,5,6,7,8,9].filter(d=>!digits.includes(d))));
  const lower=lowerTens*10,upper=upperTens*10,possible=digits.flatMap((a,i)=>digits.filter((_,j)=>i!==j).map(b=>10*a+b)).filter(n=>n>lower&&n<upper),answer=Math.max(...possible),shown=r.shuffle(digits);
  return make('What is the greatest number you can make?',answer,numberCards(shown),[`Use exactly two cards. Use each card at most once. The number must be greater than ${lower} and less than ${upper}.`],'Choose the greatest allowed tens digit, then the greatest remaining ones digit.',[['Check the bounds before choosing the tens digit.',`${lower} < number < ${upper}`],['Use the greatest remaining card for the ones.',`${Math.floor(answer/10)} tens and ${answer%10} ones = ${answer}`]],answer);
 }
 if(slug==='12'){
  let largePart=r.int(12,44);const smallPart=r.int(2,9);if(largePart===29&&smallPart===9)largePart=30;const whole=largePart+smallPart;
  const extra=r.pick(Array.from({length:88},(_,i)=>i+1).filter(d=>{
   const values=[whole,largePart,smallPart,d];if(new Set(values).size!==4)return false;
   return !values.some((a,i)=>values.some((b,j)=>i!==j&&values.some((c,k)=>k!==i&&k!==j&&a-b===c&&!(a===whole&&(b===largePart||b===smallPart)))));
  }));
  const pool=r.shuffle([whole,largePart,smallPart,extra]),sentence=`${whole} - ${largePart} = ${smallPart}`;
  return make('Choose three cards to build a true subtraction sentence.',sentence,numberCards(pool),['Use each chosen card once. One card will be left unused.'],'Find three cards where two parts make the whole.',[['Two of the cards join to make a third card.',`${largePart} + ${smallPart} = ${whole}`],['One correct subtraction sentence removes one part from the whole.',`${whole} − ${largePart} = ${smallPart}`],['Swapping the two parts also gives a correct subtraction sentence.',`${whole} − ${smallPart} = ${largePart}`]],op('-',whole,largePart),{numberSentence:{numbers:pool,operation:'-'}});
 }
 if(slug==='13-a'||slug==='13-b'||slug==='14'){
  const at=r.int(3,5),bt=r.int(1,2),bo=r.int(1,8);let ao=r.int(4,9);if(at===4&&ao===9&&bt===2&&bo===3)ao=8;const a=10*at+ao,b=10*bt+bo;
  const picture=cards('Two book collections',[{label:'A: boxes of ten',value:'Count the boxes',icon:'box',count:at},{label:'A: loose books',value:'Count the books',icon:'book',count:ao},{label:'B: boxes of ten',value:'Count the boxes',icon:'box',count:bt},{label:'B: loose books',value:'Count the books',icon:'book',count:bo}]);
  const total=slug==='14',partA=slug==='13-a',answer=total?a+b:partA?a:b;
  return make(total?'How many books are in collections A and B altogether?':`How many books are in collection ${partA?'A':'B'}?`,answer,picture,[packetContext],'Count ten for each box and one for each loose book.',total?[['Find the first collection.',`${at} × 10 + ${ao} = ${a}`],['Find the second collection.',`${bt} × 10 + ${bo} = ${b}`],['Join the two amounts.',`${a} + ${b} = ${answer}`]]:[[partA?'Read collection A.':'Read collection B.',`${partA?at:bt} × 10 + ${partA?ao:bo} = ${answer}`],['Check that both the boxes and the loose books were included.']],total?op('+',a,b):op('+',op('*',partA?at:bt,10),partA?ao:bo));
 }
 if(slug==='15'){
  const tens=r.int(2,8),ones=r.int(0,9),answer=10*tens+ones;
  return make('What number do these tens and ones make?',answer,cards('Build the number',[{label:'Tens',value:String(tens),icon:'box'},{label:'Ones',value:String(ones),icon:'book'}]),[],'Each ten is worth ten ones.',[['Find the value of the tens.',`${tens} × 10 = ${10*tens}`],['Include the ones.',`${10*tens} + ${ones} = ${answer}`]],op('+',op('*',tens,10),ones));
 }
 if(slug==='16'){
  const tens=r.int(2,5);let start=r.int(10,99-10*tens);if(start===42&&tens===3)start=43;const end=start+10*tens;
  const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Find the starting number',points:[{label:'Start: ?'},{label:`Finish: ${end}`}],gaps:[`Add ${tens} tens`]};
  return make('What was the starting number?',start,picture,[],'Work backwards. Take away the tens that were added.',[['Convert the added tens to ones.',`${tens} tens = ${tens*10}`],['Undo the increase.',`${end} − ${tens*10} = ${start}`]],op('-',end,op('*',tens,10)));
 }
 if(slug==='17'){
  const trayA=r.int(6,12),trayB=r.int(3,9),ready=trayA+trayB;let target=ready+r.int(6,19);if(ready===18&&target===35)target=36;const answer=target-ready;
  const picture=cards('Fill the bakery order',[{label:'First tray',value:'Ready muffins',icon:'muffin',count:trayA},{label:'Second tray',value:'Ready muffins',icon:'muffin',count:trayB},{label:'Order needs',value:`${target} muffins`,icon:'muffin'}]);
  return make('How many more muffins must Hana bake?',answer,picture,['Both trays contain muffins already baked for this order.'],'Count the muffins that are ready. Find the gap up to the order total.',[['Count the muffins already baked.',`${trayA} + ${trayB} = ${ready}`],['Subtract that count from the order total.',`${target} − ${ready} = ${answer}`]],op('-',target,op('+',trayA,trayB)),{unit:'muffins'});
 }
 if(slug==='18-a'||slug==='18-b'){
  const at=r.int(1,4),bt=r.int(1,8-at);let ao=r.int(2,9);if(at===1&&bt===6&&ao===6)ao=7;const bo=10-ao,totalTens=at+bt+1,target=slug.endsWith('-a')?'A':'B';
  const picture:MissingDigitColumnModel={type:'missing-column',operation:'+',top:['A',ao],bottom:[bt,'B'],total:[totalTens,0],target};
  return make(`What digit belongs in box ${target}?`,target==='A'?at:bo,picture,['A and B each stand for one digit. The addition sentence must be true.'],'Start with the ones. Remember the ten carried into the next column.',[['The ones make ten, leaving zero ones in the total.',`${ao} + ${bo} = 10, so B = ${bo}`],['Carry one ten. Find the missing tens digit.',`${at} + ${bt} + 1 = ${totalTens}, so A = ${at}`],['Check the complete addition.',`${at*10+ao} + ${bt*10+bo} = ${totalTens*10}`]],target==='A'?op('-',op('-',totalTens,bt),1):op('-',10,ao));
 }
 if(/^(19|20|21)-(equation|answer)$/.test(slug)){
  const group=meta.group,equation=slug.endsWith('equation');let a:number,b:number,answer:number,operation:'+'|'-',context:string[],prompt:string,picture:PaperPicture;
  if(group==='19'){
   a=r.int(11,19);b=r.int(5,9);if(a===16&&b===5)a=17;answer=a+b;operation='+';
   context=['A library box contains only the books and pencils shown.'];prompt='How many items are in the library box?';
   picture=cards('Pack the library box',[{label:'Books',value:String(a),icon:'book'},{label:'Pencils',value:String(b),icon:'pencil'}]);
  }else if(group==='20'){
   a=r.int(31,69);b=r.int(3,9);if(a===47&&b===6)a=48;answer=a-b;operation='-';
   context=[`Lina has ${a} stickers. She has ${b} more stickers than Noor.`];prompt='How many stickers does Noor have?';
   picture={type:'paper',layout:'bars',heading:'Compare the sticker collections',rows:[{label:'Lina',parts:[{size:1,label:'Same as Noor'},{size:1,label:`${b} extra`,tone:'orange'}]},{label:'Noor',parts:[{size:1,label:'? stickers'}]}],totalLabel:`Lina: ${a} stickers`,caption:'Diagram not to scale.'};
  }else{
   a=r.int(14,29);b=r.int(5,13);if(a===24&&b===12)a=25;answer=a+b;operation='+';
   context=[`${a} toy cars remain in a box. Another ${b} cars were lost from that box earlier.`];prompt='How many toy cars were in the box before any were lost?';
   picture=cards('Restore the collection',[{label:'Still in the box',value:`${a} cars`,icon:'box'},{label:'Lost earlier',value:`${b} cars`,icon:'box'}]);
  }
  const sentence=`${a} ${operation} ${b} = ${answer}`,steps:Step[]=group==='19'?[['Both collections belong to the same whole. Add them.',`${a} + ${b} = ${answer}`],['Check that books and pencils were both included.',`${answer} − ${b} = ${a}`]]:group==='20'?[['Remove Lina’s extra stickers to find Noor’s matching amount.',`${a} − ${b} = ${answer}`],['Add the difference back to check Lina’s amount.',`${answer} + ${b} = ${a}`]]:[['The starting collection includes the remaining and lost cars.',`${a} + ${b} = ${answer}`],['Check by removing the cars that were lost.',`${answer} − ${b} = ${a}`]];
  return make(equation?'Build a number sentence to answer the story.':prompt,equation?sentence:answer,picture,equation?[...context,prompt]:context,group==='20'?'The smaller collection does not include the extra stickers.':'Identify the two parts that belong to the whole.',steps,op(operation,a,b),equation?{numberSentence:{numbers:r.shuffle([a,b]),operation,missingResult:true,chooseOperation:true}}:{unit:group==='19'?'items':group==='20'?'stickers':'cars'});
 }
 throw Error(`Unimplemented reviewed source response: ${meta.parameter}`);
}

/** A complete original practice set. Related source subparts retain the same fresh shared givens. */
export function makeP1HenryPark2025Set(seed:number,variant=0){
 return P1_HENRY_PARK_2025_PATTERNS.map(pattern=>({pattern,question:makeP1HenryPark2025Question({...pattern,id:`p1s-paper-${pattern.parameter}`,track:'standard',kind:'paper'},seed,variant)}));
}
