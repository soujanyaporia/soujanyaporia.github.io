import type { Gen,Lesson } from '../model';
import { choicesOf,plural,rngFor } from '../gen';
/**
 * P2 exemplar: multiplication built from equal groups and arrays, and the two kinds of division
 * (sharing and grouping), always tied to the matching multiplication fact (MOE p. 33).
 */
const A='p2-equal-groups',B='p2-sharing-and-grouping';
const TABLES=[2,3,4,5,10];
const repeated=(g:number,s:number)=>Array.from({length:g},()=>s).join(' + ');
function product(id:string,salt:string,limit=10):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.pick(TABLES),b=r.int(2,limit),total=a*b;
 return {key:`${salt}-${i}`,prompt:'How many altogether?',display:`${a} × ${b} = ?`,answer:String(total),facet:'direct',rep:'array',tool:{kind:'array',rows:a,cols:b},
  hints:[`${a} × ${b} means ${a} equal groups of ${b}.`,`Count in ${b}s, ${a} times.`,`${repeated(a,b)}`],
  steps:[`${a} groups of ${b}.`,`${repeated(a,b)} = ?`,`So ${a} × ${b} = ?`],
  another:[{title:'Skip count',steps:[`Count in ${b}s: ${Array.from({length:a},(_,k)=>b*(k+1)).join(', ')}.`],tool:{kind:'line',min:0,max:Math.max(20,total),start:0,jumps:Array.from({length:a},()=>b),step:b}},{title:'Use a fact you know',steps:[`${a-1} × ${b} = ${(a-1)*b}.`,`One more group of ${b}: ${(a-1)*b} + ${b} = ${total}.`]}],
  wrong:{...(a+b!==total?{[String(a+b)]:`That adds ${a} and ${b}. Multiplying means ${a} groups of ${b}, so we add ${b} ${plural(a,'time')}.`}:{}),...(total-b!==total?{[String(total-b)]:`That is only ${a-1} groups of ${b}. There is one more group.`}:{})},
  check:`Count the array: ${a} rows of ${b} makes ${total} ✓`};
};}
function missingFactor(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.pick(TABLES),b=r.int(2,10),total=a*b,groupsMissing=r.chance(.5);
 return {key:`${salt}-${i}`,prompt:'Find the missing number.',display:groupsMissing?`□ × ${b} = ${total}`:`${a} × □ = ${total}`,answer:String(groupsMissing?a:b),facet:'missing',rep:'equal-groups',tool:{kind:'groups',groups:a,size:b},
  hints:[groupsMissing?`How many groups of ${b} make ${total}?`:`${a} equal groups make ${total}. How many in each group?`,`Count in ${groupsMissing?b:a}s until you reach ${total}.`,`${total} ÷ ${groupsMissing?b:a}`],
  steps:[`${total} is shared into equal groups.`,`${total} ÷ ${groupsMissing?b:a} = ?`],
  check:`${a} × ${b} = ${total} ✓`};
};}
function arrayRead(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,6),b=r.int(2,9),answer=`${a} × ${b} = ${a*b}`;
 return {key:`${salt}-${i}`,prompt:'Which multiplication does this array show?',answer,choices:choicesOf(r,answer,[`${a} + ${b} = ${a+b}`,`${a} × ${b} = ${a*b+b}`,`${a+1} × ${b} = ${(a+1)*b}`]),facet:'visual',rep:'array',tool:{kind:'array',rows:a,cols:b},
  hints:['Count the rows, then count how many are in each row.'],steps:[`There are ${a} rows.`,`Each row has ${b}.`,`${a} rows of ${b} is ${a} × ${b} = ${a*b}.`]};
};}
function skipLine(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),b=r.pick([2,3,4,5,10]),a=r.int(3,5);
 return {key:`${salt}-${i}`,prompt:`The number line shows equal jumps. Where do the jumps end?`,answer:String(a*b),facet:'unfamiliar',rep:'number-line',tool:{kind:'line',min:0,max:Math.max(20,a*b),start:0,jumps:Array.from({length:a},()=>b),step:b},
  hints:[`Each jump is ${b}.`,`There are ${a} jumps.`,`${a} × ${b}`],steps:[`${a} jumps of ${b}.`,`${a} × ${b} = ?`],check:`Count in ${b}s ${plural(a,'time')} ✓`};
};}
const MUL_STORIES:((a:number,b:number)=>{text:string;unit:string})[]=[
 (a,b)=>({text:`A shop sells stickers in packets. There are ${a} packets with ${b} stickers in each. How many stickers altogether?`,unit:'stickers'}),
 (a,b)=>({text:`${a} tables have ${b} chairs each. How many chairs are there?`,unit:'chairs'}),
 (a,b)=>({text:`Mrs Lim packs ${b} buns into each box. She fills ${a} boxes. How many buns does she pack?`,unit:'buns'}),
];
function mulStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,6),b=r.pick(TABLES),s=r.pick(MUL_STORIES)(a,b);
 return {key:`${salt}-${i}`,prompt:s.text,answer:String(a*b),unit:s.unit,facet:'word',rep:'story',tool:{kind:'groups',groups:a,size:b},
  hints:['How many equal groups are there? How many in each group?',`${a} groups of ${b}.`,`${a} × ${b}`],steps:[`Equal groups: ${a} groups of ${b}.`,`${a} × ${b} = ?`],check:`${repeated(a,b)} = ${a*b} ✓`};
};}
function repeatedMatch(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.pick([2,3,4,5]),b=r.pick(TABLES.filter(t=>t!==a)),answer=repeated(a,b);
 return {key:`${salt}-${i}`,prompt:`Which addition means the same as ${a} × ${b}?`,answer,choices:choicesOf(r,answer,[repeated(b,a),`${a} + ${b}`,repeated(a+1,b)]),facet:'reverse',rep:'symbols',
  hints:[`${a} × ${b} means ${a} groups of ${b}.`,`So we add ${b} ${plural(a,'time')}.`],steps:[`${a} groups of ${b}.`,`${repeated(a,b)} = ${a*b}.`],check:`${repeated(a,b)} = ${a*b} = ${a} × ${b} ✓`};
};}
function turnAround(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,6),b=r.int(2,9),answer=`Yes: the same array turned a quarter turn, so both are ${a*b}`;
 return {key:`${salt}-${i}`,prompt:`Is ${a} × ${b} the same as ${b} × ${a}?`,answer,choices:choicesOf(r,answer,['No: the groups are different sizes',`No: ${b} × ${a} is bigger`,'Only when one number is 2']),facet:'reasoning',rep:'array',tool:{kind:'array',rows:a,cols:b},
  hints:['Turn the array a quarter turn. Does the number of dots change?'],steps:[`${a} rows of ${b} has ${a*b} dots.`,`Turned round it is ${b} rows of ${a}: still ${a*b} dots.`,'Multiplication can be done in either order.']};
};}
/** Division: sharing (how many each?) and grouping (how many groups?). */
function division(id:string,salt:string,mode?:'share'|'group'):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),b=r.pick(TABLES),q=r.int(2,10),total=b*q,sharing=mode?mode==='share':r.chance(.5);
 return {key:`${salt}-${i}`,prompt:sharing?`${total} counters are shared equally between ${b} friends. How many does each friend get?`:`${total} counters are put into groups of ${b}. How many groups are there?`,display:`${total} ÷ ${b} = ?`,answer:String(q),facet:sharing?'direct':'missing',rep:'sharing',
  tool:{kind:'share',total,people:sharing?b:q,given:Array.from({length:sharing?b:q},()=>sharing?q:b),mode:sharing?'share':'group',size:b},
  hints:[sharing?`Give one to each friend, again and again, until none are left.`:`Take away groups of ${b} until none are left.`,`What number times ${b} makes ${total}?`,`${b} × ? = ${total}`],
  steps:[sharing?`${total} shared between ${b}.`:`${total} in groups of ${b}.`,`${b} × ? = ${total}`,`${total} ÷ ${b} = ?`],
  another:[{title:'Use the times table',steps:[`${b} × ${q} = ${total}, so ${total} ÷ ${b} = ${q}.`]}],
  wrong:{...(total-b!==q?{[String(total-b)]:`That is ${total} take away ${b}. Division splits ${total} into equal parts instead.`}:{})},
  check:`${q} × ${b} = ${total} ✓`};
};}
function factFamily(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),b=r.pick(TABLES),q=r.int(2,10),total=b*q,answer=`${q} × ${b} = ${total}`;
 return {key:`${salt}-${i}`,prompt:`Which multiplication checks ${total} ÷ ${b} = ${q}?`,answer,choices:choicesOf(r,answer,[`${total} × ${b} = ${total*b}`,`${q} + ${b} = ${q+b}`,`${total} × ${q} = ${total*q}`]),facet:'reverse',rep:'symbols',
  hints:['Division and multiplication belong to the same fact family.'],steps:[`${total} ÷ ${b} = ${q} means ${q} groups of ${b} make ${total}.`,`${q} × ${b} = ${total}`]};
};}
function shareVisual(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),people=r.int(2,5),each=r.int(2,6),total=people*each;
 return {key:`${salt}-${i}`,prompt:`${total} counters were shared equally. How many did each plate get?`,answer:String(each),facet:'visual',rep:'sharing',tool:{kind:'share',total,people,given:Array.from({length:people},()=>each),mode:'share'},
  hints:['Count the counters on one plate.'],steps:[`${total} shared between ${people} plates.`,`${total} ÷ ${people} = ?`],check:`${people} × ${each} = ${total} ✓`};
};}
const DIV_STORIES:((b:number,q:number,total:number)=>{text:string;answer:number;unit:string})[]=[
 (b,q,total)=>({text:`${total} strawberries are shared equally among ${b} children. How many does each child get?`,answer:q,unit:'strawberries'}),
 (b,q,total)=>({text:`A baker puts ${b} buns in each bag. She has ${total} buns. How many bags does she fill?`,answer:q,unit:'bags'}),
 (b,q,total)=>({text:`${total} pupils sit in rows of ${b}. How many rows are there?`,answer:q,unit:'rows'}),
];
function divStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),b=r.pick(TABLES),q=r.int(2,9),total=b*q,s=r.pick(DIV_STORIES)(b,q,total);
 return {key:`${salt}-${i}`,prompt:s.text,answer:String(s.answer),unit:s.unit,facet:'word',rep:'story',
  hints:['Are we sharing into equal parts, or making groups of a certain size?',`${total} split into ${b}s.`,`${total} ÷ ${b}`],steps:[`${total} split equally using ${b}.`,`${b} × ? = ${total}`],check:`${q} × ${b} = ${total} ✓`};
};}
function divideJumpBack(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),b=r.pick([2,3,4,5]),q=r.int(3,5),total=b*q;
 return {key:`${salt}-${i}`,prompt:`The number line jumps back in equal steps from ${total} to 0. How many jumps are there?`,answer:String(q),facet:'unfamiliar',rep:'number-line',tool:{kind:'line',min:0,max:Math.max(20,total),start:total,jumps:Array.from({length:q},()=>-b),step:b},
  hints:[`Each jump back is ${b}.`,`${total} ÷ ${b}`],steps:[`Jumps of ${b} from ${total} to 0.`,`${total} ÷ ${b} = ?`],check:`${q} × ${b} = ${total} ✓`};
};}
function divisionSense(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),b=r.pick([3,4,5]),q=r.int(3,6),total=b*q,answer=`No: ${total} ÷ ${b} means ${b} × ? = ${total}, so the answer is ${q}`;
 return {key:`${salt}-${i}`,prompt:`Ali says ${total} ÷ ${b} = ${b} because there are ${b} groups. Is Ali right?`,answer,choices:choicesOf(r,answer,['Yes, Ali is right',`Yes, because ${b} + ${b} = ${2*b}`,'We cannot tell without counters']),facet:'reasoning',rep:'sharing',
  hints:[`Check with the times table: does ${b} × ${b} make ${total}?`],steps:[`${b} × ${b} = ${b*b}, not ${total}.`,`${b} × ${q} = ${total}, so ${total} ÷ ${b} = ${q}.`]};
};}
export const P2_LESSONS:Lesson[]=[{
 id:A,level:2,track:'both',world:'operation-station',title:'Equal groups become multiplication',minutes:12,skillIds:['P2.S.MD.01','P2.S.MD.04'],activityId:'p2s-multiply-n7',
 objectives:['Recognise equal groups and describe them as groups of','Write repeated addition as a multiplication','Read an array as rows of equal groups','Use turn-around facts to help recall'],
 canDo:['make equal groups and say “4 groups of 3”','change 3 + 3 + 3 + 3 into 4 × 3','read an array as a multiplication','use 4 × 3 = 3 × 4 to make facts easier'],
 prerequisites:['P1.S.MD.01','P2.S.AS.01'],representations:['counters','equal-groups','array','number-line','symbols','story'],
 misconceptions:[{name:'Adding the two numbers in a multiplication',fix:'4 × 3 does not mean 4 + 3. It means 4 groups of 3, so we add 3 four times.'},{name:'Counting groups that are not equal',fix:'Multiplication only works when every group has the same amount. Check each group before multiplying.'}],
 grows:['P1: equal groups','P2: 4 × 3 and the 2, 3, 4, 5 and 10 tables','P3: tables to 10 and multiplying larger numbers','P5: multiplying fractions and decimals'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',text:'Two quick ones about counting in steps.',items:[
   {key:'warm-1',prompt:'Count in 2s: 2, 4, 6, 8, …  What comes next?',answer:'10',hints:['Add 2 each time.'],steps:['8 + 2 = ?'],tool:{kind:'line',min:0,max:12,start:0,jumps:[2,2,2,2],step:2}},
   {key:'warm-2',prompt:'What is 3 + 3 + 3?',answer:'9',hints:['Add two of them first, then the last one.'],steps:['3 + 3 = 6.','6 + 3 = ?'],tool:{kind:'groups',groups:3,size:3}}],
   booster:[{text:'Skip counting adds the same amount each time: 5, 10, 15, 20.',tool:{kind:'line',min:0,max:20,start:0,jumps:[5,5,5,5],step:5}},{text:'Equal groups have exactly the same number in each group.',tool:{kind:'groups',groups:3,size:4}}]},
  {kind:'hook',title:'Packing the fruit stall',text:'Mrs Tan packs apples into trays. Every tray gets the same number of apples. She fills 4 trays with 3 apples each. What do you notice about the trays?',tool:{kind:'groups',groups:4,size:3}},
  {kind:'explore',title:'Make the trays yourself',text:'Use the controls to build 4 groups with 3 in each group. Watch the sentence under the trays change as you build.',tool:{kind:'groups',groups:1,size:1,limit:8},goal:t=>t.kind==='groups'&&t.groups===4&&t.size===3,goalHint:'You need 4 groups, with 3 in every group.',success:'4 groups of 3. Adding them gives 3 + 3 + 3 + 3 = 12, and we write that as 4 × 3 = 12.'},
  {kind:'notice',title:'What do you notice?',text:'Look at the four trays of 3 apples.',tool:{kind:'groups',groups:4,size:3},options:[
   {text:'There are 4 equal groups, with 3 in each group',correct:true,reply:'Yes. Equal groups are what multiplication is about.'},
   {text:'There are 7 apples, because 4 + 3 = 7',correct:false,reply:'4 + 3 would join a group of 4 and a group of 3. Here we have 4 groups, each with 3 apples: 3 + 3 + 3 + 3 = 12.'},
   {text:'The trays have different amounts',correct:false,reply:'Look again: every tray has exactly 3 apples. That is what “equal groups” means.'}]},
  {kind:'connect',title:'From trays to a multiplication',rows:[
   {text:'Four trays, three apples in each.',tool:{kind:'groups',groups:4,size:3}},
   {text:'Adding the same number again and again.',math:'3 + 3 + 3 + 3 = 12'},
   {text:'The same apples arranged as an array: 4 rows of 3.',tool:{kind:'array',rows:4,cols:3}},
   {text:'A shorter way to write “4 groups of 3”.',math:'4 × 3 = 12'}]},
  {kind:'explain',title:'What × really means',text:'4 × 3 means 4 groups of 3. The first number tells you how many groups; the second tells you how many are in each group. Multiplication is a short way to add equal groups.',math:'4 × 3 = 3 + 3 + 3 + 3 = 12',tool:{kind:'array',rows:4,cols:3},
   why:{question:'Why does 4 × 3 give the same answer as 3 × 4?',answer:'Turn the array a quarter turn. The rows become columns, but not one dot is added or taken away, so the total stays the same. That is why you can use the easier fact of the pair when you are recalling facts.',tool:{kind:'array',rows:3,cols:4}}},
  {kind:'worked',title:'Worked example',problem:'5 × 2 = ?',steps:[
   {text:'What does 5 × 2 mean?',ask:{prompt:'5 × 2 means…',choices:['5 groups of 2','5 add 2','2 groups of 5 apples only'],answer:'5 groups of 2'}},
   {text:'Build 5 groups with 2 in each.',tool:{kind:'groups',groups:5,size:2}},
   {text:'Add the groups.',math:'2 + 2 + 2 + 2 + 2'},
   {text:'Count in 2s: 2, 4, 6, 8, 10.',tool:{kind:'line',min:0,max:12,start:0,jumps:[2,2,2,2,2],step:2},ask:{prompt:'What is 5 × 2?',answer:'10'}},
   {text:'So 5 × 2 = 10. The turn-around fact 2 × 5 = 10 gives the same answer.',math:'5 × 2 = 10   2 × 5 = 10'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',text:'The array is there to count if you need it.',gen:product(A,'guided',6),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:product(A,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:mulStory(A,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[turnAround(A,'detective')(0,0),{key:'not-equal',prompt:'Three plates have 4, 4 and 5 biscuits. Can we write this as a multiplication?',answer:'No, because the groups are not equal',choices:['No, because the groups are not equal','Yes: 3 × 5','Yes: 3 × 4'],facet:'reasoning',rep:'equal-groups',hints:['Multiplication needs every group to be the same size.'],steps:['The plates hold 4, 4 and 5 — not equal groups.','We would add: 4 + 4 + 5 = 13.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:product(A,'m-direct')},{facet:'visual',gen:arrayRead(A,'m-visual')},{facet:'reverse',gen:repeatedMatch(A,'m-reverse')},
   {facet:'missing',gen:missingFactor(A,'m-missing')},{facet:'word',gen:mulStory(A,'m-word')},{facet:'unfamiliar',gen:skipLine(A,'m-line')},{facet:'reasoning',gen:turnAround(A,'m-reason')}]},
  {kind:'discovery',title:'You discovered: turn-around facts',text:'An array turned a quarter turn shows the same total. So every multiplication fact comes with a partner, and you only need to remember the easier one.',math:'4 × 3 = 12     3 × 4 = 12',tool:{kind:'array',rows:3,cols:4}},
 ]},{
 id:B,level:2,track:'both',world:'operation-station',title:'Two kinds of division',minutes:12,skillIds:['P2.S.MD.02','P2.S.MD.03'],activityId:'p2s-divide-n8',
 objectives:['Share a quantity equally and say how many each','Make equal groups and say how many groups','Write both situations with the division symbol','Use a multiplication fact to check a division'],
 canDo:['share 12 between 3 and write 12 ÷ 3 = 4','find how many groups of 4 fit into 12','tell a sharing story from a grouping story','check a division with its multiplication'],
 prerequisites:[A],representations:['counters','sharing','equal-groups','number-line','symbols','story'],
 misconceptions:[{name:'Thinking the answer to a division is always the number of groups',fix:'Read what the question asks: how many each (sharing) or how many groups (grouping). The calculation is the same, but the answer means something different.'},{name:'Subtracting instead of dividing',fix:'12 − 3 takes 3 away once. 12 ÷ 3 splits all 12 into equal parts.'}],
 grows:['P1: sharing objects','P2: 12 ÷ 3 = 4','P3: division with remainders','P5: fractions as division'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'What is 3 × 4?',answer:'12',hints:['3 groups of 4.'],steps:['4 + 4 + 4 = ?'],tool:{kind:'array',rows:3,cols:4}},
   {key:'warm-2',prompt:'How many groups of 5 make 20?',answer:'4',hints:['Count in 5s to 20.'],steps:['5, 10, 15, 20 — that is 4 fives.'],tool:{kind:'line',min:0,max:20,start:0,jumps:[5,5,5,5],step:5}}],
   booster:[{text:'Equal groups: the same amount in every group.',tool:{kind:'groups',groups:4,size:5}},{text:'Every multiplication fact helps with division: 4 × 5 = 20, so 20 splits into 4 groups of 5.',tool:{kind:'array',rows:4,cols:5}}]},
  {kind:'hook',title:'Sharing the strawberries',text:'Three friends share 12 strawberries so that everyone gets the same. How many does each friend get?',tool:{kind:'share',total:12,people:3,given:[0,0,0],mode:'share'}},
  {kind:'explore',title:'Share them out',text:'Drag a strawberry onto a plate, or use “Give one to everyone”. Keep going until the pile is empty and every plate is fair.',tool:{kind:'share',total:12,people:3,given:[0,0,0],mode:'share'},goal:t=>t.kind==='share'&&t.given.every(g=>g===4)&&t.given.length===3,goalHint:'Every plate needs the same number, with none left in the pile.',success:'Each friend gets 4. We write this as 12 ÷ 3 = 4.'},
  {kind:'notice',title:'What does the answer mean?',text:'You shared 12 strawberries between 3 friends and each got 4.',options:[
   {text:'4 is how many each friend gets',correct:true,reply:'Yes. When we share, the answer tells us how many are in each equal part.'},
   {text:'4 is how many friends there are',correct:false,reply:'There are 3 friends. The 4 tells us how many strawberries each one gets.'},
   {text:'4 is how many strawberries are left over',correct:false,reply:'None are left over — the pile is empty. Each friend has 4.'}]},
  {kind:'connect',title:'Two questions, one calculation',rows:[
   {text:'Sharing: 12 shared between 3 friends. How many each?',tool:{kind:'share',total:12,people:3,given:[4,4,4],mode:'share'},math:'12 ÷ 3 = 4'},
   {text:'Grouping: 12 put into groups of 3. How many groups?',tool:{kind:'share',total:12,people:4,given:[3,3,3,3],mode:'group',size:3},math:'12 ÷ 3 = 4'},
   {text:'Both use the same multiplication fact.',math:'4 × 3 = 12'}]},
  {kind:'explain',title:'What ÷ asks',text:'Division splits a total into equal parts. Sometimes we know how many parts and ask how many in each (sharing). Sometimes we know how big each group is and ask how many groups (grouping). Reading the question tells you which one it is.',math:'12 ÷ 3 = 4',tool:{kind:'array',rows:4,cols:3},
   why:{question:'Why can I use the times table to divide?',answer:'12 ÷ 3 asks “what number times 3 makes 12?”. The array shows it: 4 rows of 3 make 12, so 12 splits into 4 threes. Multiplication and division are two ways of describing the same array.',tool:{kind:'array',rows:4,cols:3}}},
  {kind:'worked',title:'Worked example',problem:'15 ÷ 5 = ?',steps:[
   {text:'What is the question asking?',ask:{prompt:'15 ÷ 5 can mean…',choices:['15 shared into 5 equal parts','15 take away 5','5 groups of 15'],answer:'15 shared into 5 equal parts'}},
   {text:'Make groups of 5 from 15 counters.',tool:{kind:'share',total:15,people:3,given:[5,5,5],mode:'group',size:5}},
   {text:'Ask the multiplication question: 5 × ? = 15.',math:'5 × ? = 15',ask:{prompt:'What is 15 ÷ 5?',answer:'3'}},
   {text:'So 15 ÷ 5 = 3.',math:'15 ÷ 5 = 3'},
   {text:'Check with multiplication.',math:'3 × 5 = 15 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:division(B,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:division(B,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',text:'Decide first: are we sharing, or making groups?',gen:divStory(B,'story'),count:3},
  {kind:'reason',title:'Maths detective',items:[divisionSense(B,'detective')(0,0),{key:'which-story',prompt:'Which story matches 20 ÷ 4 = 5?',answer:'20 pencils shared equally between 4 children: each gets 5',choices:['20 pencils shared equally between 4 children: each gets 5','20 pencils and 4 more pencils','4 children with 20 pencils each'],facet:'reasoning',rep:'story',hints:['The total comes first in a division.'],steps:['20 is the total.','It is split into 4 equal parts of 5.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:division(B,'m-direct','share')},{facet:'visual',gen:shareVisual(B,'m-visual')},{facet:'reverse',gen:factFamily(B,'m-reverse')},
   {facet:'missing',gen:division(B,'m-missing','group')},{facet:'word',gen:divStory(B,'m-word')},{facet:'unfamiliar',gen:divideJumpBack(B,'m-line')},{facet:'reasoning',gen:divisionSense(B,'m-reason')}]},
  {kind:'discovery',title:'You discovered: fact families',text:'One array tells four number sentences. When you know one, you know them all.',math:'4 × 5 = 20     5 × 4 = 20     20 ÷ 4 = 5     20 ÷ 5 = 4',tool:{kind:'array',rows:4,cols:5}},
 ]}];
