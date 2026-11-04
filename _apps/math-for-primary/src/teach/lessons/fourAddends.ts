import {FOUR_ADDENDS_ID,FOUR_ADDENDS_AFTER,FOUR_ADDENDS_META} from './fourAddendsMeta';
export {FOUR_ADDENDS_ID,FOUR_ADDENDS_AFTER,FOUR_ADDENDS_META,withFourAddends} from './fourAddendsMeta';
import type {Facet,Gen,Item,Lesson,Tool} from '../model';
import {rngFor} from '../gen';
import {withLessonFlow} from '../flow';
import {withDistinctQuestions} from '../distinct';

/* Internal pattern reference, visually checked 2026-11-04:
 * 2025 P1 Maths Quiz 1, Henry Park, PDF page 8, question 15.
 * https://sgexam.com/subject/maths/2025-p1-maths-quiz-1-henry-park-pdf/
 * Library id 83f52da6fb608310; SHA256 5c72bc926b2415f93b179293c704a4268fe7661ee1fca2ad23586a85a90b9d42.
 * Pattern only: show every object in separate categories, ask for the combined whole,
 * then connect the picture to an addition sentence. The source uses TWO categories.
 * These four-group examples, values, illustrations and questions are original extensions.
 * Four-addend work is enrichment after P1.S.AS.06, not an additional claimed MOE objective.
 */
const join=(parts:number[],joined:number[]=[],hideValue=false):Extract<Tool,{kind:'join-parts'}>=>({kind:'join-parts',parts:[...parts],joined:[...joined],hideValue});
const total=(parts:number[])=>parts.reduce((sum,n)=>sum+n,0);

function sumItem(parts:number[],key:string,facet:Facet='direct'):Item{
 const [a,b,c,d]=parts,pair=a+b,three=pair+c,whole=three+d;
 return {key,kind:'four-addends',prompt:facet==='word'?`Mei has ${a} blue, ${b} green, ${c} orange and ${d} pink beads. How many beads does she have?`:facet==='visual'?'How many counters are in all four groups?':'Add all four numbers.',
  display:facet==='word'||facet==='visual'?undefined:`${parts.join(' + ')} = ?`,answer:String(whole),facet,rep:'counters',tool:join(parts,[],true),requiresModel:facet==='visual',
  modelNote:facet==='word'?'Each counter stands for one bead. The four colours show four separate groups.':'Each dot is one counter. All four groups belong to the whole.',
  hints:[`Join the first two groups: ${a} and ${b}.`,`Now include the orange group of ${c}.`,`Do not leave out the pink group of ${d}.`],
  steps:[`${a} + ${b} = ${pair}.`,`${pair} + ${c} = ${three}.`,`${three} + ${d} = ${whole}. All four groups are included.`],
  another:[{title:'Join two pairs',steps:[`${a} + ${b} = ${pair}.`,`${c} + ${d} = ${c+d}.`,`${pair} + ${c+d} = ${whole}.`],tool:join(parts,[0,1,2,3])}],
  simpler:{key:`${key}-two`,prompt:`First, join just ${a} and ${b}. How many is that?`,answer:String(pair),facet:'direct',tool:join([a,b],[],true),hints:['Count both groups once.'],steps:[`${a} + ${b} = ${pair}.`]},
  wrong:{[String(pair)]:`That counts the first two groups. Include ${c} orange and ${d} pink counters too.`,[String(three)]:`The first three groups make ${three}. The pink group of ${d} is still waiting.`},
  check:`Count every colour once: ${parts.join(' + ')} = ${whole}.`};
}
export function fourAddendItem(seed:number,index:number,facet:Facet='direct'):Item{
 const r=rngFor(FOUR_ADDENDS_ID,seed,index,facet),parts=Array.from({length:4},()=>r.int(1,5)),[a,b,c,d]=parts;
 const whole=total(parts),three=a+b+c,key=`four-${facet}-${index}`;
 if(facet==='missing')return {key,kind:'four-missing',prompt:`Four groups make ${whole}. Three groups have ${a}, ${b} and ${c} counters. How many are in the last group?`,display:`${a} + ${b} + ${c} + □ = ${whole}`,answer:String(d),facet,rep:'bar-model',tool:{kind:'bar',whole,parts:[a,b,c,null],labels:['blue','green','orange','pink']},hints:['Find how many counters are in the three known groups.',`${a} + ${b} + ${c} = ${three}.`,`How many more make ${whole}?`],steps:[`The three known groups have ${three} counters.`,`${whole} − ${three} = ${d}.`],check:`${a} + ${b} + ${c} + ${d} = ${whole}.`,another:[{title:'Count on from the known groups',steps:[`The known groups have ${three} counters.`,`Count from ${three} up to ${whole}. That is ${d} more.`],tool:{kind:'line',min:0,max:20,start:three,jumps:[d]}}],simpler:{key:`${key}-two`,prompt:'Two groups make 5. One group has 2. How many are in the other group?',answer:'3',tool:{kind:'bar',whole:5,parts:[2,null]},hints:['Find how many more join 2 to make 5.'],steps:['5 − 2 = 3.']}};
 if(facet==='reasoning')return {key,kind:'four-waiting',prompt:'Lina joins the first three groups and stops. What should she do next?',answer:'Add the pink group.',choices:r.shuffle(['Add the pink group.','Count only the joined group.','Add the blue group again.']),facet,rep:'counters',requiresModel:true,tool:join(parts,[0,1,2],true),hints:['Look for the group that has not moved down.'],steps:[`The blue, green and orange groups are together.`,`The ${d} pink counters are still waiting. Add them once.`],wrong:{'Count only the joined group.':'That leaves out the pink counters. Every group belongs to the whole.','Add the blue group again.':'The blue counters are already included. Count every group only once.'},check:`Joining the last group makes ${three} + ${d} = ${whole}.`,another:[{title:'Check each colour',steps:['Point to blue, green, orange and pink in the starting groups.','Three colours have joined. Pink is the only colour still above the tray.']}],simpler:{key:`${key}-two`,prompt:'The blue group has joined. Which group is still waiting?',answer:'The green group.',choices:['The blue group.','The green group.'],tool:join([2,1],[0],true),requiresModel:true,hints:['Look above the big tray.'],steps:['The green group is still above the tray.']}};
 return sumItem(parts,key,facet);
}
const gen=(facet:Facet):Gen=>(seed,index)=>fourAddendItem(seed,index,facet);
export const fourAddendChallenge:Gen=(seed,index)=>{
 const r=rngFor(FOUR_ADDENDS_ID,seed,index,'challenge'),parts=Array.from({length:4},()=>r.int(1,4)),whole=total(parts),change=r.int(1,3),mode=index%3;
 if(mode===2){const item=fourAddendItem(seed,index,'missing');return {...item,kind:'challenge:four-missing',hints:['Strategy: find the known part, then the missing part.',...item.hints]};}
 const answer=mode===0?whole-change:whole+change;
 return {key:`four-challenge-${index}`,kind:mode===0?'challenge:four-give':'challenge:four-receive',prompt:`Four pots hold ${parts.join(', ')} beads. Mei puts every bead in one bag. ${mode===0?`She gives away ${change} beads.`:`A friend adds ${change} beads.`} How many beads are in the bag now?`,answer:String(answer),facet:'word',tool:join(parts,[],true),modelNote:'The picture shows the four pots before Mei changes the number of beads in the bag.',
  hints:['Strategy: find the whole first, then follow the change.',`Join the four amounts: ${parts.join(' + ')}.`,mode===0?`Take away the ${change} beads she gives away.`:`Add the ${change} beads from her friend.`],
  steps:[`The four pots hold ${parts.join(' + ')} = ${whole} beads.`,`${whole} ${mode===0?'−':'+'} ${change} = ${answer}.`],
  wrong:{[String(whole)]:`That is the number before ${mode===0?'giving away':'adding'} ${change} beads. Follow the last change too.`},check:mode===0?`${answer} + ${change} = ${whole}, the number before the gift.`:`${answer} − ${change} = ${whole}, the number before the gift.`};
};

const example=[2,3,1,2],worked=[3,2,2,1];
const raw:Lesson={
 ...FOUR_ADDENDS_META,world:'operation-station',revision:'catalogue-depth-2026-11-04-child-sequence-v1',
 objectives:[FOUR_ADDENDS_META.objective],canDo:['Join two groups first, then add each waiting group.','Include every group once.'],prerequisites:[FOUR_ADDENDS_AFTER],representations:['counters','symbols','bar-model'],
 misconceptions:[{name:'Stop at a subtotal',fix:'Check that none of the four groups is still waiting.'},{name:'Count a group twice',fix:'Move each group once and keep its colour.'}],
 stages:[
  {kind:'readiness',title:'Remember three groups',items:[{key:'four-ready',prompt:'Join these three groups. How many counters are there?',answer:'6',tool:join([2,3,1],[],true),hints:['Join 2 and 3 first. Then include the last 1.'],steps:['2 + 3 = 5.','5 + 1 = 6.']}],booster:[{text:'Join the blue and green counters first: 2 + 3 = 5.',tool:join([2,3,1],[0,1])},{text:'One orange counter is still waiting. 5 + 1 = 6.',tool:join([2,3,1],[0,1,2])}]},
  {kind:'explain',title:'One more group',text:'Use the same idea as three numbers. Keep going until every group has joined.',example:'We have 2 blue, 3 green, 1 orange and 2 pink counters. How many altogether?',frames:[
   {text:'Here are four small groups. Each counter will be counted once.',tool:join(example),math:'2 + 3 + 1 + 2'},
   {text:'Join the blue and green groups first. The orange and pink groups are still waiting.',tool:join(example,[0,1]),math:'2 + 3 = 5'},
   {text:'Bring in the orange counter. The pink group is still waiting.',tool:join(example,[0,1,2]),math:'5 + 1 = 6'},
   {text:'Bring in the pink group. No group is waiting now.',tool:join(example,[0,1,2,3]),math:'6 + 2 = 8'}]},
  {kind:'explore',title:'Join four groups',text:'Tap Add for each group. Stop when all four groups are together.',tool:join([1,2,3,2]),goal:t=>t.kind==='join-parts'&&t.parts.length===4&&t.parts.every((_,i)=>t.joined.includes(i)),goalHint:'Look for a group still waiting above the big tray.',success:'You included all four groups once. 1 + 2 + 3 + 2 = 8.'},
  {kind:'worked',title:'Let’s join them together',problem:'There are 3 blue, 2 green, 2 orange and 1 pink counters. How many counters in all?',tool:join(worked,[],true),steps:[
   {text:'Start with the blue and green groups. Leave the other two groups where they are.',tool:join(worked,[0,1],true),ask:{prompt:'How many counters are together so far?',answer:'5',hint:'Count just the blue and green counters.',wrong:{'8':'Eight includes the two groups still waiting. Count only blue and green for this step.'}}},
   {text:'Now bring in the orange group. Keep the pink counter for the last step.',tool:join(worked,[0,1,2],true),ask:{prompt:'How many counters are together now?',answer:'7',hint:'Add the 2 orange counters to the 5 already together.',wrong:{'5':'The 2 orange counters have joined too. Include them.'}}},
   {text:'Bring in the pink counter. All four colours are together.',tool:join(worked,[0,1,2,3],true),ask:{prompt:'How many counters are there in all?',answer:'8',hint:'Add the last 1 to the 7 already together.',wrong:{'7':'The pink counter still needs to be included.'}}},
   {text:'We counted every group once. The four groups make one whole.',math:'3 + 2 + 2 + 1 = 8',tool:join(worked,[0,1,2,3])}]},
  {kind:'practice',mode:'guided',title:'Try with the picture',count:2,gen:gen('visual')},
  {kind:'reflect',title:'Tell me your steps',text:'Look back at the four groups we joined.',tool:join(worked,[0,1,2,3]),prompts:['Which two groups did we join first?','Which group joined next?','How do we know we included every group?'],explanation:['The blue 3 and green 2 made 5.','Adding the orange 2 made 7.','The last pink 1 made 8. All four groups are in the tray.'],transfer:'Try four new small groups. Which groups would you join first, and how would you keep track of the ones still waiting?'},
  {kind:'practice',mode:'independent',title:'Try four new numbers',count:2,gen:gen('direct')},
  {kind:'apply',title:'Put the beads together',count:1,gen:gen('word')},
  {kind:'reason',title:'Did every group join?',items:[fourAddendItem(42,0,'reasoning')]},
  {kind:'mastery',title:'Check the idea',gens:(['direct','visual','missing','word','reasoning'] as Facet[]).map(facet=>({facet,gen:gen(facet)}))},
  {kind:'discovery',title:'Every group counts',text:'Join two groups first. Then bring in each waiting group. Count every group once.',math:'2 + 3 + 1 + 2 = 8',tool:join(example,[0,1,2,3])},
  {kind:'practice',mode:'independent',challenge:true,title:'A little more to think about',count:3,gen:fourAddendChallenge},
 ]
};
export const FOUR_ADDENDS_LESSON=withDistinctQuestions(withLessonFlow(raw));
