import type { Gen,Item,Lesson } from '../model';
import { choicesOf,plural,rngFor } from '../gen';
/**
 * P1 exemplar: missing numbers in addition and subtraction, taught through the part–whole relationship
 * (never “move it across and change the sign”). Numbers stay within 20 (P1 facts, MOE p. 31).
 */
const A='p1-missing-parts',B='p1-missing-take-away';
const line=(a:number,b:number)=>({kind:'line' as const,min:0,max:20,start:a,jumps:Array.from({length:b},()=>1)});
/** □ + a = w or a + □ = w: the whole and one part are known. */
function missingPart(id:string,salt:string,max=20):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(Math.min(6,max),max),a=r.int(1,w-1),b=w-a,first=r.chance(.5);
 const easy:Item|undefined=w>6?missingPart(id,salt+'-easy',5)(seed,i):undefined;
 return {key:`${salt}-${i}`,prompt:'Find the missing number.',display:first?`□ + ${a} = ${w}`:`${a} + □ = ${w}`,answer:String(b),facet:first?'direct':'missing',rep:'symbols',
  tool:{kind:'bond',whole:w,parts:first?[b,a]:[a,b],hide:first?'a':'b',locked:true},
  hints:[`The number after = is the whole, ${w}. One part is ${a}.`,`Picture a number bond: ${w} splits into ${a} and a missing part.`,`Take the part you know away from the whole: ${w} − ${a}.`,`Count on from ${a} to ${w} and count the jumps.`],
  steps:[`The whole is ${w}. One part is ${a}.`,`The missing part is the whole take away the part we know: ${w} − ${a}.`,`What goes in the box?`],
  another:[{title:'Count on',steps:[`Start at ${a}. Count on to ${w}.`,`That is ${plural(b,'jump')}, so the missing part is ${b}.`],tool:line(a,b)},{title:'Use a fact you know',steps:[`Think: ${a} and what make ${w}?`,`${a} + ${b} = ${w}, so the missing part is ${b}.`]}],
  ...(easy?{simpler:easy}:{}),
  wrong:{[String(w+a)]:`That adds ${a} and ${w}. But ${w} is the whole, so the missing part must be smaller than ${w}.`,[String(w)]:`${w} is the whole. We are looking for the part that is missing.`},
  check:`Add the parts: ${b} + ${a} = ${w} ✓`};
};}
const STORIES_ADD:((a:number,b:number,w:number)=>{text:string;unit:string})[]=[
 (a,_b,w)=>({text:`Mei has some stickers. Her friend gives her ${a} more. Now she has ${w}. How many stickers did Mei have at first?`,unit:'stickers'}),
 (a,_b,w)=>({text:`There are ${w} children in a group. ${a} are wearing hats. How many are not wearing hats?`,unit:'children'}),
 (a,_b,w)=>({text:`A tray holds ${w} cupcakes. ${a} are on it already. How many more cupcakes are needed to fill the tray?`,unit:'cupcakes'}),
 (a,_b,w)=>({text:`Aiden read ${a} pages in the morning and some more in the afternoon. He read ${w} pages that day. How many pages did he read in the afternoon?`,unit:'pages'}),
];
function partStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(8,20),a=r.int(2,w-2),b=w-a,s=r.pick(STORIES_ADD)(a,b,w);
 return {key:`${salt}-${i}`,prompt:s.text,answer:String(b),unit:s.unit,facet:'word',rep:'story',tool:{kind:'bar',parts:[a,null],whole:w},
  hints:['Which number is the whole amount?',`The whole is ${w}. Which part do you know?`,`Missing part = whole − known part = ${w} − ${a}.`],
  steps:[`Draw a bar for the whole: ${w}.`,`One part is ${a}. The other part is missing.`,`${w} − ${a} = ?`],
  another:[{title:'Count on',steps:[`From ${a}, count on to ${w}: that is ${plural(b,'more')}.`],tool:line(a,b)}],
  wrong:{[String(w+a)]:`${w} is already the whole amount, so the answer must be smaller than ${w}.`},check:`${b} + ${a} = ${w}, the whole ✓`};
};}
function bondPicture(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(7,20),a=r.int(1,w-1),b=w-a;
 return {key:`${salt}-${i}`,prompt:'What number is hiding in the number bond?',answer:String(b),facet:'visual',rep:'number-bond',tool:{kind:'bond',whole:w,parts:[a,b],hide:'b',locked:true},
  hints:['The top number is the whole. The two lower numbers are its parts.',`${a} and the hiding number make ${w}.`,`${w} − ${a}`],steps:[`Whole ${w}, one part ${a}.`,`${w} − ${a} = ?`],check:`${a} + ${b} = ${w} ✓`};
};}
function reverseChoice(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(7,20),a=r.int(1,w-1),answer=`${w} − ${a}`;
 return {key:`${salt}-${i}`,prompt:`The whole is ${w}. One part is ${a}. Which calculation finds the other part?`,answer,choices:choicesOf(r,answer,[`${w} + ${a}`,`${a} − ${w}`,`${w} + ${w}`]),facet:'reverse',rep:'number-bond',
  hints:['The other part is what is left when the known part is taken from the whole.'],steps:[`Whole − known part = missing part.`,`${w} − ${a}`],check:`${w} − ${a} = ${w-a}, and ${w-a} + ${a} = ${w} ✓`};
};}
function jumpItem(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,12),w=r.int(a+2,Math.min(20,a+9)),b=w-a;
 return {key:`${salt}-${i}`,prompt:`Start at ${a} on the number line. How far do you jump to land on ${w}?`,answer:String(b),facet:'unfamiliar',rep:'number-line',tool:{kind:'line',min:0,max:20,start:a,jumps:[],mark:w},
  hints:['Count the steps from the start to the circled number.',`From ${a} to ${w}.`,`${w} − ${a}`],steps:[`The jump is the missing part: ${a} + □ = ${w}.`,`${w} − ${a} = ?`],check:`${a} + ${b} = ${w} ✓`};
};}
function tooBig(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(8,20),a=r.int(2,w-2),answer=`It cannot be right: the missing part must be smaller than ${w}`;
 return {key:`${salt}-${i}`,prompt:`Sam says the answer to □ + ${a} = ${w} is ${w+a}. What do you think?`,answer,choices:choicesOf(r,answer,['Sam is right',`It is right because ${w} + ${a} = ${w+a}`,'We cannot tell']),facet:'reasoning',rep:'symbols',
  hints:[`Which number is the whole in □ + ${a} = ${w}?`,`Could a part be bigger than the whole ${w}?`],steps:[`${w} is the whole, so every part is smaller than ${w}.`,`The missing part is ${w} − ${a} = ${w-a}.`]};
};}
/** □ − a = b (the starting whole is missing) or w − □ = b (the part taken away is missing). */
function missingInTakeAway(id:string,salt:string,max=20):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(Math.min(6,max),max),a=r.int(1,w-1),b=w-a,wholeMissing=r.chance(.5);
 const easy:Item|undefined=w>6?missingInTakeAway(id,salt+'-easy',6)(seed,i):undefined;
 if(wholeMissing)return {key:`${salt}-${i}`,prompt:'Find the missing number.',display:`□ − ${a} = ${b}`,answer:String(w),facet:'direct',rep:'symbols',tool:{kind:'bar',parts:[a,b],whole:null,labels:['taken away','left']},
  hints:['The box is the number we started with: the whole.',`The whole was split into ${a} (taken away) and ${b} (left).`,`Put the parts back together: ${a} + ${b}.`],
  steps:[`We started with □. ${a} were taken away and ${b} were left.`,`The whole is both parts together: ${a} + ${b}.`,'What goes in the box?'],
  another:[{title:'Undo the take-away',steps:[`Taking ${a} away left ${b}.`,`Put the ${a} back: ${b} + ${a} = ${w}.`],tool:{kind:'line',min:0,max:20,start:b,jumps:[a]}}],
  ...(easy?{simpler:easy}:{}),wrong:{...(Math.abs(a-b)>0?{[String(Math.abs(a-b))]:`That takes one number from the other. The box is the whole we started with, so it must be bigger than ${Math.max(a,b)}.`}:{})},check:`${w} − ${a} = ${b} ✓`};
 return {key:`${salt}-${i}`,prompt:'Find the missing number.',display:`${w} − □ = ${b}`,answer:String(a),facet:'missing',rep:'symbols',tool:{kind:'bar',parts:[null,b],whole:w,labels:['taken away','left']},
  hints:[`${w} is the whole. ${b} is the part left.`,'The box is the part that was taken away.',`${w} − ${b}`],
  steps:[`Start with ${w}. Some were taken away and ${b} are left.`,`The part taken away is ${w} − ${b}.`,'What goes in the box?'],
  another:[{title:'Count back',steps:[`Count back from ${w} to ${b}.`,`That is ${plural(a,'step')} back, so ${a} were taken away.`],tool:{kind:'line',min:0,max:20,start:w,jumps:[-a]}}],
  ...(easy?{simpler:easy}:{}),wrong:{[String(w+b)]:`That adds ${w} and ${b}. But ${w} is all we started with, so the part taken away is smaller than ${w}.`},check:`${w} − ${a} = ${b} ✓`};
};}
const STORIES_SUB:((a:number,b:number,w:number)=>{text:string;answer:number;unit:string;whole:boolean})[]=[
 (a,b,w)=>({text:`Some birds sat on a fence. ${a} flew away. ${b} are still on the fence. How many birds were there at first?`,answer:w,unit:'birds',whole:true}),
 (a,b,w)=>({text:`Kumar had some sweets. He gave away ${a}. He has ${b} left. How many sweets did he have at first?`,answer:w,unit:'sweets',whole:true}),
 (a,b,w)=>({text:`There were ${w} apples in a bowl. Some were eaten. ${b} are left. How many apples were eaten?`,answer:a,unit:'apples',whole:false}),
 (a,b,w)=>({text:`A bus had ${w} passengers. Some got off at a stop. ${b} passengers stayed on. How many got off?`,answer:a,unit:'passengers',whole:false}),
];
function takeAwayStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),w=r.int(8,20),a=r.int(2,w-2),b=w-a,s=r.pick(STORIES_SUB)(a,b,w);
 return {key:`${salt}-${i}`,prompt:s.text,answer:String(s.answer),unit:s.unit,facet:'word',rep:'story',tool:s.whole?{kind:'bar',parts:[a,b],whole:null,labels:['went','stayed']}:{kind:'bar',parts:[null,b],whole:w,labels:['went','stayed']},
  hints:['What was the whole amount at the start?',s.whole?'The start is missing. Both parts are known.':'The start is known. One part is missing.',s.whole?`${a} + ${b}`:`${w} − ${b}`],
  steps:s.whole?[`Parts: ${a} went and ${b} stayed.`,`At first there were ${a} + ${b}.`]:[`Whole: ${w}. Part that stayed: ${b}.`,`The part that went is ${w} − ${b}.`],check:s.whole?`${w} − ${a} = ${b} ✓`:`${w} − ${a} = ${b} ✓`};
};}
function wholeOrPart(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(2,9),b=r.int(2,9),answer='The whole: the number we started with';
 return {key:`${salt}-${i}`,prompt:`In □ − ${a} = ${b}, what does the box stand for?`,answer,choices:choicesOf(r,answer,['The part taken away','The part that is left','The answer to a − b']),facet:'reasoning',rep:'bar-model',
  hints:['Read it as a story: we had □, took away some, and some were left.'],steps:['The box comes first, before anything is taken away.','So the box is the whole.',`□ = ${a} + ${b} = ${a+b}.`]};
};}
function wrongMove(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.int(3,9),b=r.int(2,a-1),wrongAns=a-b,answer=`Wei subtracted, but the box is the whole: ${a} + ${b} = ${a+b}`;
 return {key:`${salt}-${i}`,prompt:`□ − ${a} = ${b}. Wei says □ = ${wrongAns} because ${a} − ${b} = ${wrongAns}. What would you tell Wei?`,answer,choices:choicesOf(r,answer,['Wei is right','The box is the part left, so □ = '+b,`□ = ${a}`]),facet:'reasoning',rep:'bar-model',
  hints:['Check Wei\'s answer: is it true that '+wrongAns+' − '+a+' = '+b+'?'],steps:[`${wrongAns} − ${a} does not make ${b}.`,`The box is the whole: ${a} + ${b} = ${a+b}.`,`Check: ${a+b} − ${a} = ${b} ✓`]};
};}
export const P1_LESSONS:Lesson[]=[{
 id:A,level:1,track:'both',world:'operation-station',title:'Find the missing part',minutes:10,skillIds:['P1.S.AS.03','P1.S.AS.04'],activityId:'p1s-missing-n9',
 objectives:['Find a missing part when the whole and one part are known','Show a whole and its two parts with a number bond','Explain why taking away finds a missing part'],
 canDo:['find the missing number in □ + 3 = 8 and 5 + □ = 9','show a whole and its parts with counters and a number bond','use subtraction to find a missing part','check a missing part by adding the parts'],
 prerequisites:['P1.S.AS.01','P1.S.AS.02'],representations:['counters','number-bond','bar-model','number-line','symbols','story'],
 misconceptions:[{name:'Adding the two numbers that are shown',fix:'In □ + 3 = 8 the 8 is the whole. The missing part must be smaller than 8, so 8 + 3 cannot be right.'},{name:'Counting the starting number again when counting on',fix:'Start at the part you know and say the next numbers: 4, 5, 6, 7, 8. Count the jumps, not the starting number.'}],
 grows:['P1: □ + 3 = 8','P2: 8 − 3 = 5 undoes 3 + 5 = 8','P3: missing quantities in stories','P6: x + 3 = 8'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',text:'Let’s warm up. These should feel easy.',items:[
   {key:'warm-1',prompt:'What is 5 + 3?',answer:'8',hints:['Start at 5 and count on 3 more.'],steps:['5, then 6, 7, 8.','5 + 3 = ?'],tool:{kind:'counters',count:8}},
   {key:'warm-2',prompt:'8 is made of 5 and what number?',display:'8 = 5 + ?',answer:'3',hints:['Count on from 5 to 8.'],steps:['From 5: 6, 7, 8. That is 3 more.','8 = 5 + ?'],tool:{kind:'bond',whole:8,parts:[5,3],hide:'b',locked:true}}],
   booster:[{text:'A whole can be split into two parts. The two parts together make the whole.',tool:{kind:'bond',whole:6,parts:[4,2],locked:true}},{text:'Counting on: start at one part and count up to the whole. Count the jumps.',tool:{kind:'line',min:0,max:10,start:4,jumps:[1,1]}}]},
  {kind:'hook',title:'The hiding marbles',text:'Ravi has 8 marbles. 3 are on the table. The rest are hiding in his bag. How many marbles are hiding?',tool:{kind:'bar',parts:[3,null],whole:8,labels:['on the table','in the bag']}},
  {kind:'explore',title:'Build it with counters',text:'Here are Ravi’s 8 marbles as counters. Move counters between the two parts until one part shows the 3 marbles on the table.',tool:{kind:'bond',whole:8,parts:[8,0]},goal:t=>t.kind==='bond'&&(t.parts[0]===3||t.parts[1]===3),goalHint:'Make one part show exactly 3 counters.',success:'One part has 3 and the other has 5. 3 and 5 make 8, so 5 marbles are hiding.'},
  {kind:'notice',title:'What do you notice?',text:'Look at the number bond. Which sentence is true?',tool:{kind:'bond',whole:8,parts:[3,5],locked:true},options:[
   {text:'The two parts together make the whole: 3 + 5 = 8',correct:true,reply:'Yes! The parts join to make the whole.'},
   {text:'The whole is the smallest number',correct:false,reply:'Look again: 8 is the biggest number. The whole is made of both parts.'},
   {text:'To find the hiding marbles we add 8 and 3',correct:false,reply:'8 + 3 = 11 is more marbles than Ravi has! The hiding marbles are part of the 8.'}]},
  {kind:'connect',title:'From counters to a number sentence',rows:[
   {text:'8 counters: 3 in one part and 5 in the other.',tool:{kind:'counters',count:8}},
   {text:'The number bond shows the whole and its two parts.',tool:{kind:'bond',whole:8,parts:[3,5],locked:true}},
   {text:'A bar model shows the same thing.',tool:{kind:'bar',parts:[3,5],whole:8}},
   {text:'We use a box for the number we do not know yet.',math:'3 + □ = 8'},
   {text:'The box stands for 5.',math:'3 + 5 = 8'}]},
  {kind:'explain',title:'Why taking away finds the missing part',text:'When we know the whole and one part, we take that part away from the whole. What is left is the other part.',math:'8 − 3 = 5',tool:{kind:'bar',parts:[3,5],whole:8},
   why:{question:'Why does taking away work?',answer:'The whole is made of the two parts. Take one part away, and only the other part is left. So whole − known part = missing part. Adding the parts back together checks it: 5 + 3 = 8.',tool:{kind:'line',min:0,max:10,start:8,jumps:[-3]}}},
  {kind:'worked',title:'Worked example',problem:'□ + 7 = 15',steps:[
   {text:'What are we trying to find?',ask:{prompt:'What does the box stand for?',choices:['a missing part','the whole','15 + 7'],answer:'a missing part'}},
   {text:'Something plus 7 makes 15. So 15 is the whole and 7 is one part.',tool:{kind:'bar',parts:[null,7],whole:15}},
   {text:'Show it as a number bond.',tool:{kind:'bond',whole:15,parts:[8,7],hide:'a',locked:true}},
   {text:'Addition and subtraction undo each other. Take the part we know away from the whole.'},
   {text:'Work it out.',math:'15 − 7 = ?',ask:{prompt:'What is 15 − 7?',answer:'8'}},
   {text:'So the missing part is 8.',math:'□ = 8'},
   {text:'Check by adding the parts.',math:'8 + 7 = 15 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',text:'Use the number bond, the clues or “Show me another way” whenever you like.',gen:missingPart(A,'guided',12),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',text:'The pictures are hidden now. Open one if you need it.',gen:missingPart(A,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',text:'Find the whole and the part you know before you calculate.',gen:partStory(A,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[tooBig(A,'detective')(0,0),{key:'match-bond',prompt:'A number bond has whole 10 and one part 6. Which number sentence matches it?',answer:'6 + □ = 10',choices:['6 + □ = 10','10 + 6 = □','□ − 6 = 10'],facet:'reasoning',rep:'number-bond',tool:{kind:'bond',whole:10,parts:[6,4],hide:'b',locked:true},hints:['The whole goes after the equals sign in an addition.'],steps:['The parts are 6 and a missing part.','Together they make the whole, 10: 6 + □ = 10.']}]},
  {kind:'mastery',title:'Show what you know',text:'Seven questions, each a different way of thinking about missing parts.',gens:[
   {facet:'direct',gen:missingPart(A,'m-direct')},{facet:'visual',gen:bondPicture(A,'m-visual')},{facet:'reverse',gen:reverseChoice(A,'m-reverse')},
   {facet:'missing',gen:(s,i)=>{const it=missingPart(A,'m-missing')(s,i+7);return {...it,facet:'missing'};}},{facet:'word',gen:partStory(A,'m-word')},{facet:'unfamiliar',gen:jumpItem(A,'m-line')},{facet:'reasoning',gen:tooBig(A,'m-reason')}]},
  {kind:'discovery',title:'You discovered: parts and wholes',text:'Addition joins parts to make a whole. Subtraction takes a part away from the whole. They undo each other, so you can always check a missing part by adding.',math:'3 + 5 = 8     8 − 3 = 5     8 − 5 = 3',tool:{kind:'bond',whole:8,parts:[3,5],locked:true}},
 ]},{
 id:B,level:1,track:'both',world:'operation-station',title:'Missing numbers in take-away',minutes:10,skillIds:['P1.S.AS.02','P1.S.AS.04'],activityId:'p1s-missing-n9',
 objectives:['Find the starting number when the parts are known','Find how many were taken away','Link each subtraction to a matching addition'],
 canDo:['solve □ − 4 = 3 and 8 − □ = 5','tell whether the box is the whole or a part','show a take-away story with a bar model','check a subtraction with an addition'],
 prerequisites:[A],representations:['bar-model','number-bond','number-line','symbols','story'],
 misconceptions:[{name:'Subtracting whatever numbers are shown',fix:'Ask what the box stands for. In □ − 4 = 3 the box is the whole we started with, so we put the parts together: 4 + 3.'},{name:'Thinking subtraction only means “take away”',fix:'Subtraction also finds a missing part and a difference. The bar model shows which one we need.'}],
 grows:['P1: □ − 4 = 3','P3: working backwards in stories','P5–P6: before-and-after problems','P6: x − 4 = 3'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',text:'Two quick ones to get started.',items:[
   {key:'warm-1',prompt:'What is 9 − 4?',answer:'5',hints:['Count back 4 from 9.'],steps:['9, then 8, 7, 6, 5.','9 − 4 = ?'],tool:{kind:'line',min:0,max:10,start:9,jumps:[-1,-1,-1,-1]}},
   {key:'warm-2',prompt:'Find the missing part.',display:'4 + □ = 7',answer:'3',hints:['7 is the whole. 4 is one part.'],steps:['7 − 4 = ?'],tool:{kind:'bond',whole:7,parts:[4,3],hide:'b',locked:true}}],
   booster:[{text:'Take away means the whole gets smaller. What is left is a part of the whole.',tool:{kind:'bar',parts:[4,5],whole:9,labels:['taken','left']}},{text:'In a number bond, whole − one part = the other part.',tool:{kind:'bond',whole:7,parts:[4,3],locked:true}}]},
  {kind:'hook',title:'Birds on a wire',text:'Some birds sat on a wire. 4 flew away. Now 3 are left. How many birds were on the wire at first?',tool:{kind:'bar',parts:[4,3],whole:null,labels:['flew away','left']}},
  {kind:'explore',title:'Put the birds back',text:'The 4 birds that flew away and the 3 that stayed were all on the wire at first. Build the whole: make the parts 4 and 3.',tool:{kind:'bond',whole:7,parts:[7,0],hide:'whole'},goal:t=>t.kind==='bond'&&((t.parts[0]===4&&t.parts[1]===3)||(t.parts[0]===3&&t.parts[1]===4)),goalHint:'One part should show the 4 that flew away and the other the 3 that stayed.',success:'4 and 3 make 7. There were 7 birds at first.'},
  {kind:'notice',title:'What is missing this time?',text:'In the bird story, which number was missing?',options:[
   {text:'The whole: the number of birds at the start',correct:true,reply:'Yes. We knew both parts, so we joined them: 4 + 3 = 7.'},
   {text:'The birds that flew away',correct:false,reply:'We were told 4 flew away. The number we did not know was how many there were at the start.'},
   {text:'The birds that stayed',correct:false,reply:'We were told 3 stayed. We did not know the starting number.'}]},
  {kind:'connect',title:'Two kinds of missing number',rows:[
   {text:'When the whole is missing, join the parts.',math:'□ − 4 = 3,  so □ = 4 + 3 = 7',tool:{kind:'bar',parts:[4,3],whole:null}},
   {text:'When a part is missing, take the part you know from the whole.',math:'8 − □ = 5,  so □ = 8 − 5 = 3',tool:{kind:'bar',parts:[null,5],whole:8}},
   {text:'Every take-away has a matching addition.',math:'7 − 4 = 3   because   4 + 3 = 7'}]},
  {kind:'explain',title:'Ask: is the box the whole or a part?',text:'Do not choose + or − from the words. Decide what the box stands for. If it is the whole, put the parts together. If it is a part, take the known part from the whole.',tool:{kind:'bond',whole:7,parts:[4,3],hide:'whole',locked:true},
   why:{question:'Why does adding find the starting number?',answer:'Taking away split the whole into two parts: the part taken and the part left. Putting the two parts back together rebuilds the whole. That is why 7 − 4 = 3 and 4 + 3 = 7 describe the same bond.'}},
  {kind:'worked',title:'Worked example',problem:'8 − □ = 5',steps:[
   {text:'What does the box stand for?',ask:{prompt:'In 8 − □ = 5, the box is…',choices:['the part taken away','the whole','the part left'],answer:'the part taken away'}},
   {text:'8 is the whole. 5 is the part left.',tool:{kind:'bar',parts:[null,5],whole:8,labels:['taken away','left']}},
   {text:'The part taken away is the whole take away the part left.',math:'8 − 5 = ?',ask:{prompt:'What is 8 − 5?',answer:'3'}},
   {text:'So 3 were taken away.',math:'□ = 3'},
   {text:'Check it.',math:'8 − 3 = 5 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:missingInTakeAway(B,'guided',12),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:missingInTakeAway(B,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',text:'Decide whether the story is missing the whole or a part.',gen:takeAwayStory(B,'story'),count:3},
  {kind:'reason',title:'Maths detective',items:[wrongMove(B,'detective')(0,0),wholeOrPart(B,'what-box')(0,0)]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:(s,i)=>{let k=0,it=missingInTakeAway(B,'m-direct')(s,i);while(it.facet!=='direct'&&k<20)it=missingInTakeAway(B,'m-direct')(s,i+(++k)*97);return it;}},
   {facet:'missing',gen:(s,i)=>{let k=0,it=missingInTakeAway(B,'m-missing')(s,i);while(it.facet!=='missing'&&k<20)it=missingInTakeAway(B,'m-missing')(s,i+(++k)*97);return it;}},
   {facet:'visual',gen:(seed,i)=>{const r=rngFor(B,seed,i,'m-visual'),a=r.int(2,9),b=r.int(2,9);return {key:`m-visual-${i}`,prompt:'The bar model shows a take-away. How many were there at the start?',answer:String(a+b),facet:'visual',rep:'bar-model',tool:{kind:'bar',parts:[a,b],whole:null,labels:['taken away','left']},hints:['The start is the whole bar.'],steps:[`The whole is both parts: ${a} + ${b}.`],check:`${a+b} − ${a} = ${b} ✓`};}},
   {facet:'reverse',gen:(seed,i)=>{const r=rngFor(B,seed,i,'m-reverse'),a=r.int(2,9),b=r.int(2,9),w=a+b,answer=`${a} + ${b} = ${w}`;return {key:`m-reverse-${i}`,prompt:`Which addition matches ${w} − ${a} = ${b}?`,answer,choices:choicesOf(r,answer,[`${w} + ${a} = ${w+a}`,`${w} + ${b} = ${w+b}`,`${b} − ${a} = ${b-a}`]),facet:'reverse',rep:'symbols',hints:['The parts are the part taken and the part left.'],steps:[`Parts ${a} and ${b} make the whole ${w}.`]};}},
   {facet:'word',gen:takeAwayStory(B,'m-word')},
   {facet:'unfamiliar',gen:(seed,i)=>{const r=rngFor(B,seed,i,'m-line'),w=r.int(9,20),a=r.int(2,w-3);return {key:`m-line-${i}`,prompt:`The number line shows a jump back from ${w}. How many were taken away?`,answer:String(a),facet:'unfamiliar',rep:'number-line',tool:{kind:'line',min:0,max:20,start:w,jumps:[-a]},hints:['Read the size of the jump.'],steps:[`From ${w} back to ${w-a}.`,`${w} − ${w-a} = ?`],check:`${w} − ${a} = ${w-a} ✓`};}},
   {facet:'reasoning',gen:wholeOrPart(B,'m-reason')}]},
  {kind:'discovery',title:'You discovered: every take-away has a partner',text:'A subtraction and an addition can describe the same parts and whole. Asking “is the box the whole or a part?” tells you which one to use.',math:'□ − 4 = 3   ⟷   4 + 3 = □',tool:{kind:'bond',whole:7,parts:[4,3],locked:true}},
 ]}];
