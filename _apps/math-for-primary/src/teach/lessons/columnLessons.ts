import {COLUMN_LESSON_META} from './columnLessonMeta';
export {COLUMN_LESSON_META,COLUMN_LESSON_PLACEMENTS,withColumnLessons} from './columnLessonMeta';
import type {Facet,Gen,Item,Lesson,RevealStep} from '../model';
import {rngFor} from '../gen';
import {withLessonFlow} from '../flow';
import {withDistinctQuestions} from '../distinct';
import {columnPlace,columnSteps,type ColumnOperation,type ColumnTool} from '../tools/columnArithmetic';

const facets:Facet[]=['direct','visual','missing','word','reasoning'];
const operationFor=(id:string):ColumnOperation=>id.includes('subtraction')?'-':'+';
const metaFor=(id:string)=>{const meta=COLUMN_LESSON_META.find(l=>l.id===id);if(!meta)throw Error(`Unknown written-method lesson: ${id}`);return meta;};
const tool=(a:number,b:number,operation:ColumnOperation,step=0,hideValue=false):ColumnTool=>({kind:'column-algorithm',a,b,operation,step,hideValue});
const symbol=(operation:ColumnOperation)=>operation==='+'?'+':'−';
const calculate=(a:number,b:number,operation:ColumnOperation)=>operation==='+'?a+b:a-b;
const notes=(a:number,b:number,operation:ColumnOperation)=>columnSteps(a,b,operation).map(s=>s.equation?`${s.text} ${s.equation}.`:s.text);

/** Fresh regrouping examples, with every operand and result inside the lesson's stated range. */
function amounts(id:string,seed:number,index:number,salt:string):[number,number]{
 const r=rngFor(id,seed,index,salt),level=metaFor(id).level,operation=operationFor(id);
 if(operation==='+'){
  const ones=r.int(2,9),otherOnes=r.int(10-ones,9);
  if(level===1){const tens=r.int(1,5),otherTens=r.int(1,8-tens);return [10*tens+ones,10*otherTens+otherOnes];}
  const hundreds=r.int(1,5),otherHundreds=r.int(1,8-hundreds),tens=r.int(2,7),otherTens=r.int(9-tens,9);
  return [100*hundreds+10*tens+ones,100*otherHundreds+10*otherTens+otherOnes];
 }
 const ones=r.int(0,7),otherOnes=r.int(ones+1,9);
 if(level===1){const tens=r.int(2,9);return [10*tens+ones,10*r.int(1,tens-1)+otherOnes];}
 const hundreds=r.int(2,9),otherHundreds=r.int(1,hundreds-1),tens=index%3===0?0:r.int(1,8),otherTens=r.int(Math.max(1,tens),9);
 return [100*hundreds+10*tens+ones,100*otherHundreds+10*otherTens+otherOnes];
}
const easy=(operation:ColumnOperation,key:string):Item=>operation==='+'?{
 key:`${key}-small`,prompt:'Eight counters join five counters. How many are there?',answer:'13',tool:{kind:'join-parts',parts:[8,5],joined:[],hideValue:true},hints:['Make a ten first. Eight needs two more.'],steps:['8 + 2 = 10.','Three counters are still waiting. 10 + 3 = 13.'],check:'13 can be grouped as 1 ten and 3 ones.',
}:{key:`${key}-small`,prompt:'There are thirteen counters. Take away five. How many remain?',answer:'8',tool:{kind:'take-away',start:13,removed:[0,1,2,3,4],hideValue:true},hints:['Count the counters that are not crossed out.'],steps:['13 − 3 = 10.','Take away 2 more. 10 − 2 = 8.'],check:'8 + 5 = 13.'};

export function columnLessonItem(id:string,seed:number,index:number,facet:Facet='direct'):Item{
 const [a,b]=amounts(id,seed,index,facet),operation=operationFor(id),answer=calculate(a,b,operation),key=`column-${facet}-${index}`,steps=columnSteps(a,b,operation),r=rngFor(id,seed,index,'choices');
 const base:Item={key,kind:`column-${operation==='+'?'add':'subtract'}`,prompt:operation==='+'?'Add the two numbers.':'Subtract the second number.',display:`${a} ${symbol(operation)} ${b} = ?`,answer:String(answer),facet,rep:'place-value',tool:tool(a,b,operation),modelNote:'Each column has one place value. Start with the ones on the right.',
  hints:['Keep ones under ones and tens under tens.',operation==='+'?'Ten ones can be exchanged for one ten. Include every carried unit.':'If there are too few ones, exchange one ten for ten ones first.','Work from the rightmost column towards the left.'],steps:notes(a,b,operation),simpler:easy(operation,key),check:operation==='+'?`${answer} − ${b} = ${a}.`:`${answer} + ${b} = ${a}.`,
  another:[{title:operation==='+'?'Add in parts':'Subtract in parts',steps:operation==='+'?[`Split ${b} into ${b-b%10} and ${b%10}.`,`${a} + ${b-b%10} = ${a+b-b%10}.`,`${a+b-b%10} + ${b%10} = ${answer}.`]:[`Split ${b} into ${b-b%10} and ${b%10}.`,`${a} − ${b-b%10} = ${a-b+b%10}.`,`${a-b+b%10} − ${b%10} = ${answer}.`]}],
 };
 if(facet==='visual'){
  const writes=steps.flatMap((s,i)=>s.answer!==undefined?[i]:[]),at=writes[index%writes.length],s=steps[at];
  return {...base,kind:'column-digit',prompt:s.prompt!,display:undefined,answer:s.answer!,tool:tool(a,b,operation,at,true),requiresModel:true,modelNote:'Earlier answer digits stay in place. Fill only the highlighted answer box.',hints:[`Look at the highlighted ${columnPlace(s.top.length,s.column!)} column.`,operation==='+'?'Include a carried unit if one is shown above this column.':'Use the exchanged top number, not the crossed-out digit.'],check:`The completed calculation is ${a} ${symbol(operation)} ${b} = ${answer}.`};
 }
 if(facet==='missing'){
  const known=operation==='+'?a:answer,whole=operation==='+'?answer:a;
  return {...base,kind:'column-missing',prompt:'Find the missing number.',display:operation==='+'?`${a} + □ = ${answer}`:`${a} − □ = ${answer}`,answer:String(b),rep:'bar-model',tool:{kind:'bar',whole,parts:[known,null],labels:['known part','missing part']},modelNote:'The two parts together make the whole. The empty part is the missing number.',hints:['Find the whole and the known part.',`Subtract the known part ${known} from the whole ${whole}.`],steps:notes(whole,known,'-'),check:`${known} + ${b} = ${whole}.`,another:[{title:'Check by joining the parts',steps:[`Join the known part ${known} and the missing part ${b}.`,`${known} + ${b} = ${whole}.`]}]};
 }
 if(facet==='word')return {...base,prompt:operation==='+'?`Mei has ${a} stickers. Noor gives her ${b} more. How many stickers does Mei have now?`:`Mei has ${a} stickers. She gives Noor ${b}. How many stickers does Mei have left?`,display:undefined,rep:'story',unit:'stickers',modelNote:operation==='+'?'The top row shows Mei’s starting amount. The second row shows the stickers she receives.':'The top row shows Mei’s starting amount. The second row shows the stickers she gives away.'};
 if(facet==='reasoning'){
  const zeroTens=Math.floor(a/10)%10===0,answerText=operation==='+'?'Exchange 10 ones for 1 ten.':zeroTens?'Exchange 1 hundred for 10 tens first.':'Exchange 1 ten for 10 ones.';
  const choices=operation==='+'?[answerText,'Write both digits in the ones box.','Leave out the extra ten.']:zeroTens?[answerText,'Turn 0 tens into 10 ones without exchanging.','Subtract the smaller ones digit from the larger.']:[answerText,'Swap the top and bottom ones digits.','Change the tens digit without changing the ones.'];
  return {...base,kind:'column-reason',prompt:operation==='+'?'The ones add to more than nine. What should we do?':zeroTens?'There are too few ones and no tens. What should we do first?':'There are too few ones. What exchange keeps the same value?',display:undefined,answer:answerText,choices:r.shuffle(choices),requiresModel:true,steps:operation==='+'?['Ten ones and one ten have the same value.','Write the leftover ones. Carry the new ten into the tens column.']:zeroTens?['Exchange one hundred for ten tens.','Then exchange one of those tens for ten ones.','The starting number keeps the same value.']:['Exchange one ten for ten ones.','Reduce the tens by one and increase the ones by ten.','The starting number keeps the same value.'],wrong:Object.fromEntries(choices.filter(c=>c!==answerText).map(c=>[c,'An exchange must keep the same total value. Use ten of the smaller unit for one of the next unit.']))};
 }
 return base;
}

/** Child checkpoints conceal the active result digit and do not print it in the narration. */
export function columnWorkedFrames(a:number,b:number,operation:ColumnOperation):RevealStep[]{
 return columnSteps(a,b,operation).map((s,step)=>s.answer!==undefined&&s.prompt?{
  text:s.phase==='exchange'?'Make the exchange. Then fill the highlighted answer box.':'Work in the highlighted column.',
  tool:tool(a,b,operation,step,true),ask:{prompt:s.prompt,answer:s.answer,hint:operation==='+'?'Add the numbers in this column, including any carried unit. Write one digit here.':'Subtract using the exchanged top number. Write one digit here.'},
 }:{text:s.text,math:s.equation,tool:tool(a,b,operation,step)});
}

export function columnLessonChallenge(id:string,seed:number,index:number):Item{
 const r=rngFor(id,seed,index,'challenge'),level=metaFor(id).level,operation=operationFor(id),max=level===1?100:999;
 const a=r.int(level===1?30:300,level===1?65:650),b=r.int(level===1?11:111,operation==='+'?(level===1?25:250):a-(level===1?10:100)),first=calculate(a,b,operation);
 const change=r.int(1,Math.min(level===1?9:90,first-1,max-first)),mode=index%3,second=mode===1?'+':'-',answer=second==='+'?first+change:first-change;
 const prompt=operation==='+'?mode===0?`Mei has ${a} stickers and gets ${b} more. She gives away ${change}. How many does she have now?`:mode===1?`One box holds ${a} beads and another holds ${b}. Noor adds ${change} more beads. How many altogether?`:`Lina has ${a} blue and ${b} green beads. Noor has ${change} beads. How many more beads does Lina have than Noor?`:
  mode===0?`A box has ${a} beads. Mei takes ${b}, then Noor takes ${change}. How many beads remain?`:mode===1?`Mei has ${a} stickers and gives away ${b}. She then gets ${change} new stickers. How many now?`:`Lina has ${a} stickers and gives away ${b}. Noor has ${change} stickers. How many more stickers does Lina have than Noor?`;
 return {key:`column-challenge-${index}`,kind:`challenge:column-${operation==='+'?'add':'subtract'}-${mode}`,prompt,answer:String(answer),facet:'word',rep:'story',tool:tool(a,b,operation),modelNote:'The written calculation shows the first change. Read the story for the next step.',hints:['Strategy: work out the first change, then follow the second part of the story.',`First calculate ${a} ${symbol(operation)} ${b}.`,second==='+'?`Add the last ${change}.`:`Subtract ${change} from the first result.`],steps:[...notes(a,b,operation),`Then ${first} ${symbol(second)} ${change} = ${answer}.`],check:second==='+'?`${answer} − ${change} = ${first}, the first result.`:`${answer} + ${change} = ${first}, the first result.`,wrong:{[String(first)]:`That is only the first result. Follow the last change or comparison with ${change} too.`}};
}

function makeLesson(id:string):Lesson{
 const meta=metaFor(id),operation=operationFor(id),examples:Record<string,[number,number,number,number]>={
  'p1-written-addition':[28,35,46,27],'p1-written-subtraction':[52,28,71,36],
  'p2-written-addition':[268,157,356,278],'p2-written-subtraction':[402,187,503,268],
 },[a,b,c,d]=examples[id],answer=calculate(a,b,operation),prerequisite=meta.level===1?'p1s-as-05':'p2s-as-01',gen=(facet:Facet):Gen=>(seed,index)=>columnLessonItem(id,seed,index,facet);
 const raw:Lesson={...meta,world:'operation-station',revision:'catalogue-depth-written-columns-2026-11-04-v1',objectives:[meta.objective],canDo:operation==='+'?['Line up matching places.','Exchange ten ones for a ten and include every carried unit.','Check the total with subtraction.']:['Keep the starting value unchanged when exchanging.',meta.level===2?'Work across a zero by exchanging through the next place.':'Exchange one ten for ten ones.','Check the difference with addition.'],prerequisites:[prerequisite],representations:['place-value','symbols','bar-model','story'],misconceptions:operation==='+'?[{name:'Forget a carried unit',fix:'Include the small carried digit above the next column.'},{name:'Write two digits in one box',fix:'Keep one digit in each answer column; exchange ten units for one next-place unit.'}]:[{name:'Swap subtraction digits',fix:'Keep the order. Exchange from the next place when the top digit is too small.'},{name:'Change only one column',fix:'Each exchange reduces the next place by one and adds ten to the place beside it.'}],stages:[
  {kind:'readiness',title:'A small calculation first',items:[easy(operation,`${id}-ready`)],booster:[{text:operation==='+'?'Thirteen ones can be grouped as one ten and three ones.':'One ten can be opened into ten ones. The amount stays the same.',tool:operation==='+'?{kind:'join-parts',parts:[10,3],joined:[0,1]}:{kind:'join-parts',parts:[10],joined:[]}}]},
  {kind:'explain',title:operation==='+'?'Give each place its own column':'Exchange, then subtract',text:'Keep each digit in its place. Work from the ones column towards the left.',example:`Work out ${a} ${symbol(operation)} ${b}.`,frames:columnSteps(a,b,operation).map((s,step)=>({text:s.text,math:s.equation,tool:tool(a,b,operation,step)}))},
  {kind:'explore',title:'Make each exchange yourself',text:`Work through ${a} ${symbol(operation)} ${b}. Use the next-step button to make each exchange and check the answer.`,tool:tool(a,b,operation),goal:t=>t.kind==='column-algorithm'&&t.a===a&&t.b===b&&t.operation===operation&&t.step===columnSteps(a,b,operation).length-1,goalHint:'Keep going through the columns until you reach the check.',success:`Every exchange kept the same value. ${a} ${symbol(operation)} ${b} = ${answer}.`},
  {kind:'worked',title:'Fill one answer box at a time',problem:`Work out ${c} ${symbol(operation)} ${d}.`,tool:tool(c,d,operation),steps:columnWorkedFrames(c,d,operation)},
  {kind:'practice',mode:'guided',title:'Read the highlighted column',count:2,gen:gen('visual')},
  {kind:'reflect',title:'Tell me how the exchange works',text:`Look back at ${c} ${symbol(operation)} ${d}. Explain the written steps in your own words.`,tool:tool(c,d,operation,columnSteps(c,d,operation).length-1),prompts:['Which column did we work on first?','What did we exchange, and why did the value stay the same?','How can we check the final answer?'],explanation:[`We lined up matching places in ${c} and ${d}, then started with the ones.`,columnSteps(c,d,operation).find(s=>s.phase==='exchange')!.text,operation==='+'?`${c} + ${d} = ${c+d}. Check: ${c+d} − ${d} = ${c}.`:`${c} − ${d} = ${c-d}. Check: ${c-d} + ${d} = ${c}.`],transfer:'Try a new pair of numbers. Point to the first column that needs an exchange and explain what must change in the neighbouring column.'},
  {kind:'practice',mode:'independent',title:'Try two calculations',count:2,gen:gen('direct')},
  {kind:'apply',title:'Use your written method',count:1,gen:gen('word')},
  {kind:'reason',title:'Choose a sensible exchange',items:[columnLessonItem(id,42,0,'reasoning')]},
  {kind:'mastery',title:'Check the written method',gens:facets.map(facet=>({facet,gen:gen(facet)}))},
  {kind:'discovery',title:'One place at a time',text:operation==='+'?'Line up matching places. Start with the ones. Exchange when needed, and include each carried unit.':'Line up matching places. Exchange when the top amount is too small. Change both neighbouring columns and keep the same value.',math:`${a} ${symbol(operation)} ${b} = ${answer}`,tool:tool(a,b,operation,columnSteps(a,b,operation).length-1)},
  {kind:'practice',mode:'independent',challenge:true,title:'Follow two steps',count:3,gen:(seed,index)=>columnLessonChallenge(id,seed,index)},
 ]};
 return withDistinctQuestions(withLessonFlow(raw));
}
export const COLUMN_LESSONS:Lesson[]=COLUMN_LESSON_META.map(meta=>makeLesson(meta.id));
