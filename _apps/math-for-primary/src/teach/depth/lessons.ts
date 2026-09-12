import type {Facet,Gen,Item,Lesson,RevealStep,Stage,StageFlow} from '../model';
import {annotateSteps} from '../build/teachingNotes';
import {fraction,fractionItem,removal,subtractionItem,triangle,triangleItem} from './items';

export const DEPTH_IDS=['p1s-as-07','p2s-frac-01','p5s-area-02'] as const;
const bridge=(label:string,transition:string,phase:StageFlow['phase']='together'):StageFlow=>({label,transition,phase});
const warm=(item:Item,text:string):Stage=>({kind:'readiness',title:'A small step we already know',text,items:[item],booster:[{text:item.hints[0],tool:item.tool},{text:item.hints[1]??item.steps[1],tool:item.tool}],flow:bridge('Check the building blocks','Try this earlier idea first. If it feels difficult, use the picture and clues before starting the new lesson.','watch')});
const readyItem=(key:string,prompt:string,answer:string,tool:Item['tool'],hints:string[],wrong:Record<string,string>):Item=>({key,prompt,answer,tool,hints,steps:[...hints,`The answer is ${answer}.`],wrong,check:`Check the picture and count each part once.`});
const choices=(title:string,text:string,options:[string,boolean,string][],flow:StageFlow,tool?:Item['tool']):Stage=>({kind:'notice',actionLabel:'Think before trying',title,text,options:options.map(([text,correct,reply])=>({text,correct,reply})),flow,tool});

/** Three deliberately authored sequences. Other objectives keep their existing content. */
export function deepenLesson(lesson:Lesson):Lesson{
 if(!(DEPTH_IDS as readonly string[]).includes(lesson.id))return lesson;
 const subtraction=lesson.id===DEPTH_IDS[0],fractions=lesson.id===DEPTH_IDS[1];
 const originalExplain=lesson.stages.find((s):s is Extract<Stage,{kind:'explain'}>=>s.kind==='explain')!;
 let setup:string,question:string,frames:RevealStep[],prerequisite:Stage,predict:Stage,explore:Stage,worked:Extract<Stage,{kind:'worked'}>,reason:Item,make:(seed:number,i:number,facet:Facet)=>Item,facets:Facet[],canDo:string[],recap:string;
 if(subtraction){
  setup='There are 13 counters. We take away 5. How many stay?';question='Start with 17 counters. Take away 3. How many stay?';
  prerequisite=warm(readyItem('count-five','How many counters are here?','5',removal(5,0),['Count the blue counters once each.','Empty spaces are not counters.'],{'10':'That counts all the spaces. Count only the blue counters.','6':'Touch each blue counter once; do not count an empty space.'}),'Before taking counters away, check that we can count a group.');
  predict=choices('What will change?','We will take 5 counters away from 13. What should happen to the group?',[
   ['It gets smaller.',true,'Yes. We are removing counters. Now test that idea with your own taps.'],
   ['It gets bigger.',false,'A bigger group needs more counters to be added. Here we are taking some away.'],
   ['It stays the same.',false,'Five counters leave the group. The number that stays must change.']
  ],bridge('Before you touch the counters','Think about the direction of the change. You do not need the exact answer yet.'),removal(13,0));
  explore={kind:'explore',title:'You take five away',text:'Tap any 5 counters to cross them out. Tap a crossed counter to put it back. Then count the blue counters that stay.',tool:removal(13,0),goal:t=>t.kind==='take-away'&&t.start===13&&t.removed.length===5,goalHint:'Cross out exactly 5 counters. It does not matter which five you choose.',success:'Five went away and eight stayed. Different choices of five leave the same number: eight.',flow:bridge('Test your prediction','Start with the same 13 counters. Your taps will show what taking away five means.')};
  frames=[
   {text:'Let’s replay your change. Here are the same 13 counters before any are taken away.',tool:removal(13,0),caption:'Our starting group has thirteen counters.'},
   {text:'Cross out five. Those five no longer belong to the group that stays.',tool:removal(13,5),caption:'A cross means taken away. It does not mean an extra counter.'},
   {text:'Count only the blue counters without a cross. Eight stay.',tool:removal(13,5),math:'13 − 5 = 8'},
   {text:'Put the five back to check. Eight that stayed and five put back make our starting thirteen.',tool:{kind:'foundation-visual',visual:{type:'counters',groups:[{count:8,color:'blue'},{count:5,color:'orange'}]}},caption:'Blue: the eight that stayed. Orange: the five put back.',math:'8 + 5 = 13'}
  ];
  worked={kind:'worked',title:'A new example, with your turn',problem:question,tool:removal(17,0),steps:[
   {text:'Start with 17 counters. This time we will take away only three.',tool:removal(17,0)},
   {text:'Three are crossed out. You count the counters that stay before we show the total.',tool:removal(17,3),ask:{prompt:question,answer:'14'}},
   {text:'Fourteen counters stay. The subtraction sentence records the change you counted.',tool:removal(17,3),math:'17 − 3 = 14'},
   {text:'Put the three back. The two parts rebuild our starting seventeen.',tool:{kind:'foundation-visual',visual:{type:'counters',groups:[{count:14,color:'blue'},{count:3,color:'orange'}]}},math:'14 + 3 = 17',caption:'Blue counters stayed. Orange counters are the three put back.'}
  ]};
  make=subtractionItem;facets=['direct','visual','missing','word','reasoning'];reason=subtractionItem(51,0,'reasoning');
  canDo=['show what taking away does to a group','connect an addition fact to its subtraction fact','find a missing part and check the whole'];
  recap=`${question} Fourteen counters stay. Putting the three back makes seventeen. Taking away and putting back connect the same whole and parts.`;
 }else if(fractions){
  setup='One sandwich is cut into 4 equal pieces. Mei chooses 3. How do we name her share?';question='What fraction of this whole strip is blue?';
  prerequisite=warm(readyItem('count-parts','How many parts are in the whole strip?','4',fraction(0,4),['Count every space between the cuts.','Include every part of the whole, even though none is blue yet.'],{'3':'That may count the internal cuts. Count the four pieces between the boundaries.','0':'There are no blue parts yet, but the whole still has four parts.'}),'First count all the parts. We will name a chosen share next.');
  predict=choices('What makes the sharing fair?','Four children will each get one piece. What must be true?',[
   ['All four pieces are equal.',true,'Yes. Equal pieces let each child receive the same share.'],
   ['Only the blue pieces are equal.',false,'Every piece of the whole must be the same size, including the white ones.'],
   ['Four pieces can be any size.',false,'Then one child could get much more. Equal shares need equal-sized pieces.']
  ],bridge('Check the meaning of equal parts','Counting pieces is not enough. Think about their sizes before choosing a share.'),fraction(0,4));
  explore={kind:'explore',title:'Choose Mei’s three pieces',text:'The whole sandwich has four equal pieces. Tap the third piece to shade three. Notice that the fourth piece still belongs to the whole.',tool:fraction(0,4),goal:t=>t.kind==='fractions'&&t.denominators[0]===4&&t.shaded[0]===3,goalHint:'Shade 3 of the 4 equal pieces. Tap the third piece from the left.',success:'Three pieces are chosen. All four pieces, including the white one, make the whole.',flow:bridge('Build the share from our story','Use the same sandwich and choose the three pieces Mei takes.')};
  frames=[
   {text:'Replay the sharing from the start. This strip is one whole sandwich, with four equal pieces.',tool:fraction(0,4),caption:'One strip is the whole. Each of its four pieces has the same size.'},
   {text:'One chosen piece is one of four equal parts. We call it one quarter.',tool:fraction(1,4),math:'1/4',because:'The bottom number counts all four equal parts. The top counts the one chosen part.'},
   {text:'Mei chooses three of those pieces. We call her share three quarters.',tool:fraction(3,4),math:'3/4',because:'Only the chosen count changed. The whole still has four equal parts.'},
   {text:'Read the two numbers together: three chosen parts out of four equal parts in the whole.',tool:fraction(3,4),math:'3 chosen / 4 in the whole',because:'The white piece counts in the bottom number too. The bottom does not count only what is left.'}
  ];
  worked={kind:'worked',title:'Name a new share together',problem:question,tool:fraction(2,5),steps:annotateSteps([
   {text:'This is a new whole, cut into five equal parts. We use the same idea: all parts at the bottom, chosen parts at the top.',tool:fraction(2,5),ask:{prompt:'How many equal parts make this whole?',answer:'5'}},
   {text:'Two parts are blue. Keep the bottom number five and write the chosen count above it.',tool:fraction(2,5),ask:{prompt:question,answer:'2/5'}},
   {text:'Two blue parts and three white parts make all five. The blue share is two fifths.',tool:fraction(2,5),math:'2/5',caption:'The whole includes the three white parts as well as the two blue parts.'}
  ])};
  make=fractionItem;facets=['visual','missing','word','unfamiliar','reasoning'];reason=fractionItem(51,0,'reasoning');
  canDo=['identify the whole and its equal parts','name the chosen share in a strip or circle','explain why unequal pieces cannot be called halves'];
  recap='What fraction of this whole strip is blue? Two of its five equal parts are blue: 2/5. The top counts chosen parts; the bottom counts every equal part of the whole.';
 }else{
  setup='A blue triangle has base 6 units and perpendicular height 4 units. How much surface does it cover?';question='A triangle has base 8 units and perpendicular height 5 units. What is its area?';
  prerequisite=warm(readyItem('rectangle-area','A rectangle has 4 squares in each of 3 rows. How many squares cover it?','12',{kind:'scene',scene:'area',values:[4,3],phase:0},['Count four squares in each row.','Join three equal rows: 4 + 4 + 4.'],{'7':'Adding 4 and 3 counts two lengths, not the squares covering the rectangle.','14':'Count the squares inside. The distance around the edge answers a different question.'}),'We will use rectangle area to explain triangle area.');
  predict=choices('What could a matching copy make?','Imagine turning a matching triangle into the empty space. Which shape will the two triangles fill?',[
   ['A rectangle.',true,'Yes. Now join the copy and check that it fills the gap exactly.'],
   ['A square.',false,'The outside is six units across and four high. Those sides are not equal.'],
   ['A smaller triangle.',false,'We are adding an equal copy. Together they cover more surface than one triangle.']
  ],bridge('Predict the shape before joining','Look at the pale empty half beside the blue triangle.'),triangle(6,4));
  explore={kind:'explore',title:'Join the matching triangle',text:'Add the orange copy. Look for gaps or overlaps. You can remove it and join it again to compare one triangle with the pair.',tool:triangle(6,4),goal:t=>t.kind==='triangle-pair'&&t.joined,goalHint:'Join the matching triangle to complete the rectangle.',success:'The pair fills one rectangle exactly. Both triangles have equal area, so each owns half of the rectangle’s area.',flow:bridge('Test the fit','Keep the same base of six and height of four. Only the matching copy is added.')};
  frames=originalExplain.frames!;
  worked={kind:'worked',title:'Use the rectangle idea with less help',problem:question,tool:triangle(8,5),steps:annotateSteps([
   {text:'The dimensions have changed to eight and five. A matching copy still completes a rectangle. First find that rectangle’s area.',tool:{kind:'triangle-pair',base:8,height:5,joined:true},ask:{prompt:'What is the rectangle area in square units?',answer:'40'}},
   {text:'Forty belongs to two equal triangles. Decide how much belongs to just the blue one.',tool:{kind:'triangle-pair',base:8,height:5,joined:true},ask:{prompt:question,answer:'20'}},
   {text:'One triangle covers twenty square units. Doubling it gives the forty-square-unit rectangle again.',tool:triangle(8,5),math:'8 × 5 ÷ 2 = 20; check: 20 × 2 = 40',caption:'Base and perpendicular height match the rectangle dimensions. Area uses square units.'}
  ])};
  make=triangleItem;facets=['direct','visual','word','reverse','reasoning'];reason=triangleItem(51,0,'reasoning');
  canDo=['explain why triangle area is half of base times height','use the perpendicular height shown in a picture','spot and correct a missing divide-by-two step'];
  recap='A triangle has base 8 units and perpendicular height 5 units. What is its area? The rectangle has 40 square units. The blue triangle covers half: 20 square units.';
 }
 const takeaway=frames.at(-1)!.text;
 const explain:Stage={...originalExplain,title:subtraction?'Replay what taking away means':fractions?'Give the share a name':originalExplain.title,example:setup,text:frames[0].text,frames:annotateSteps(frames),alternatives:undefined,method:undefined};
 worked={...worked,flow:{...bridge('Use the idea with a new example','The first example is complete. We are changing the example now. Use the same relationship with the new picture and values.'),carry:takeaway}};
 const generator=(facet:Facet):Gen=>(seed,i)=>make(seed,i,facet);
 const guided:Gen=(seed,i)=>make(seed,i,fractions?i%2?'missing':'visual':'direct');
 const independent:Gen=(seed,i)=>make(seed,i,fractions?i%2?'unfamiliar':'visual':i%2?'direct':'visual');
 return {...lesson,revision:'depth-2026-09-12-v1',canDo,mission:{goal:lesson.mission?.goal??lesson.title,pictureExample:setup,question,connection:'Check a building block, predict, try the model, then explain and use the idea.'},stages:[
  prerequisite,
  {kind:'hook',title:'Our question to explore',text:setup,tool:frames[0].tool,caption:frames[0].caption??frames[0].text,next:'First predict what will happen. Then test it with the model.'},
  predict,explore,explain,worked,
  {kind:'practice',mode:'guided',title:'Try it with the picture',gen:guided,count:2,flow:bridge('Keep the support while practising','Try two new questions. The picture is ready, and a clue can help you decide what to count.','try')},
  {kind:'practice',mode:'independent',title:fractions?'A different whole, the same idea':'Choose your own first step',gen:independent,count:2,flow:bridge('Use the idea with less help',fractions?'The next questions use a strip and then a circle. The whole changes shape; the meaning of equal parts stays the same.':'Read the model when it is part of the question. For a number question, try your own first step before opening help.','try')},
  {kind:'apply',title:'Use the idea in a story',gen:generator('word'),count:1},
  {kind:'reason',title:fractions?'Can we really call that a half?':subtraction?'Does the check put it back?':'Find the missing step',items:[reason],flow:bridge('Explain a decision',fractions?'Now check a tempting mistake: counting pieces without checking their sizes.':subtraction?'Use addition to check a subtraction. Choose the check that rebuilds the starting whole.':'A calculation can use the right numbers and still miss a step. Use the pair of triangles to explain the correction.','check')},
  {kind:'mastery',title:'Show the idea in different ways',gens:facets.map(facet=>({facet,gen:generator(facet)}))},
  {kind:'discovery',title:'Tell someone what you discovered',text:recap,tool:worked.steps.at(-1)!.tool,math:worked.steps.at(-1)!.math,caption:worked.steps.at(-1)!.caption}
 ]};
}
