import type {Facet,Gen,Item,Lesson,Tool} from '../model';
import {rngFor} from '../gen';
import {withLessonFlow} from '../flow';
import {withDistinctQuestions} from '../distinct';
import {P4_ARCHIVE_META} from './p4ArchiveLessonMeta';
const table=(rows:string[][]):Extract<Tool,{kind:'table'}>=>({kind:'table',headers:['Clue','Information'],rows,caption:'The information from this question'});
const facets:Facet[]=['direct','visual','missing','word','reverse','reasoning'];

/** Original practice: a total, one extra amount and a times-as-many relation. */
export function threeGroupsItem(seed:number,index:number,facet:Facet='direct'):Item{
 const r=rngFor('p4-three-groups-extra-parts',seed,index,facet),green=r.int(12,35),factor=r.pick([2,3,4]),extra=r.int(4,25),blue=factor*green,red=blue+extra,total=green+blue+red,equal=total-extra,units=2*factor+1;
 const source=table([['All buttons',String(total)],['Red compared with blue',`${extra} more`],['Blue compared with green',`${factor} times as many`]]);
 const base=`A shop has ${total} red, blue and green buttons altogether. Red has ${extra} more than blue. Blue has ${factor} times as many as green.`;
 const answer=facet==='visual'?green:facet==='word'?red:facet==='missing'?equal:blue;
 const target=facet==='visual'?'How many green buttons are there?':facet==='word'?'How many red buttons are there?':facet==='missing'?'How many buttons remain after the extra red buttons are set aside?':'How many blue buttons are there?';
 const steps=[`Set aside the extra red buttons: ${total} − ${extra} = ${equal}.`,`The equal-part groups are ${factor} red parts, ${factor} blue parts and 1 green part: ${units} parts.`,`One part is ${equal} ÷ ${units} = ${green}.`,`Blue is ${factor} × ${green} = ${blue}.`,`Red is ${blue} + ${extra} = ${red}.`];
 if(facet==='reasoning')return {key:`three-reason-${index}`,kind:'three-groups-reason',facet,rep:'table',prompt:`${base} What should you do first to make the red and blue groups equal?`,answer:'Set aside the extra red buttons.',choices:r.shuffle(['Set aside the extra red buttons.','Add the extra red buttons again.','Divide the extra red buttons by three.']),tool:source,hints:['Red is bigger by the stated extra amount.'],steps:[`Set aside the ${extra} extra red buttons. Red and blue then have equal-sized groups.`],check:'Putting the extra back makes red larger than blue again.'};
 if(facet==='reverse')return {key:`three-reverse-${index}`,kind:'three-groups-check',facet,rep:'table',prompt:`There are ${green} green buttons. Blue has ${factor} times as many as green, and red has ${extra} more than blue. How many buttons are there altogether?`,answer:String(total),tool:table([['Green',String(green)],['Blue compared with green',`${factor} times as many`],['Red compared with blue',`${extra} more`]]),hints:['Find blue first, then find red.'],steps:[`Blue: ${factor} × ${green} = ${blue}.`,`Red: ${blue} + ${extra} = ${red}.`,`Total: ${green} + ${blue} + ${red} = ${total}.`],check:`The three colour counts add to ${total}.`};
 return {key:`three-${facet}-${index}`,kind:'three-groups-extra-parts',facet,rep:'table',prompt:`${base} ${target}`,answer:String(answer),unit:'buttons',tool:source,hints:['Set aside the extra red buttons so red and blue match.','Count equal parts before dividing.'],steps:facet==='missing'?steps.slice(0,1):steps,check:`The three colour counts are ${green}, ${blue} and ${red}; together they make ${total}.`};
}

/** Original practice: one part versus two, then a transfer and a remaining gap. */
export function transferDifferenceItem(seed:number,index:number,facet:Facet='direct'):Item{
 const r=rngFor('p4-transfer-changing-difference',seed,index,facet),moved=r.int(3,15),gap=r.int(5,30),startGap=gap+2*moved,bottom=startGap,top=2*startGap,afterTop=top-moved,afterBottom=bottom+moved;
 const source=table([['At first','Top has twice the bottom'],['Moved from top to bottom',`${moved} beads`],['Final difference',`${gap} more in top`]]);
 const base=`At first, the top tray has twice as many beads as the bottom tray. ${moved} beads move from top to bottom. The top then has ${gap} more beads.`;
 const answer=facet==='visual'?bottom:facet==='missing'?startGap:facet==='word'?afterTop:top;
 const target=facet==='visual'?'How many beads were in the bottom tray at first?':facet==='missing'?'What was the difference between the trays at first?':facet==='word'?'How many beads are in the top tray after the move?':'How many beads were in the top tray at first?';
 const steps=[`The difference fell by ${moved} + ${moved} = ${2*moved}.`,`The starting difference was ${gap} + ${2*moved} = ${startGap}.`,`At first, the difference is one bottom-tray part: ${bottom}.`,`The top started with ${bottom} × 2 = ${top}.`,`After moving ${moved}, the top has ${afterTop}.`];
 if(facet==='reasoning')return {key:`transfer-reason-${index}`,kind:'transfer-reason',facet,rep:'table',prompt:`${base} Why did the difference shrink by ${2*moved} beads?`,answer:'The top lost and the bottom gained the same number.',choices:r.shuffle(['The top lost and the bottom gained the same number.','Only the bottom changed.','The total number of beads doubled.']),tool:source,hints:['Follow the beads in both trays.'],steps:[`The top lost ${moved}; the bottom gained ${moved}. Both changes affect the difference.`],check:`The total number of beads stays the same during the move.`};
 if(facet==='reverse')return {key:`transfer-reverse-${index}`,kind:'transfer-check',facet,rep:'table',prompt:`At first, the bottom tray has ${bottom} beads and the top has twice as many. ${moved} beads move from top to bottom. How many more beads are in the top tray now?`,answer:String(gap),tool:table([['Bottom at first',`${bottom} beads`],['Top at first','Twice the bottom'],['Moved to bottom',`${moved} beads`]]),hints:['Find each tray after the move, then compare.'],steps:[`Top at first: ${bottom} × 2 = ${top}.`,`After the move: top ${top} − ${moved} = ${afterTop}; bottom ${bottom} + ${moved} = ${afterBottom}.`,`Difference: ${afterTop} − ${afterBottom} = ${gap}.`],check:'The same number moved out of one tray and into the other.'};
 return {key:`transfer-${facet}-${index}`,kind:'transfer-changing-difference',facet,rep:'table',prompt:`${base} ${target}`,answer:String(answer),unit:'beads',tool:source,hints:['The top lost beads and the bottom gained beads.','Add both changes back to the final difference.'],steps,check:`After the move, ${afterTop} − ${afterBottom} = ${gap}.`};
}
const three=(facet:Facet):Gen=>(seed,index)=>threeGroupsItem(seed,index,facet);
const transfer=(facet:Facet):Gen=>(seed,index)=>transferDifferenceItem(seed,index,facet);
const threeExample=table([['All buttons','92'],['Red compared with blue','8 more'],['Blue compared with green','3 times as many']]);
const threeWorked=table([['All buttons','79'],['Red compared with blue','9 more'],['Blue compared with green','2 times as many']]);
const transferExample=table([['At first','Top has twice the bottom'],['Moved from top to bottom','8 beads'],['Final difference','14 more in top']]);
const transferWorked=table([['At first','Top has twice the bottom'],['Moved from top to bottom','9 beads'],['Final difference','14 more in top']]);
const threeRaw:Lesson={...P4_ARCHIVE_META[0],world:'operation-station',track:'standard',revision:'catalogue-depth-2026-11-05-p4-parts-v1',objectives:[P4_ARCHIVE_META[0].objective],canDo:['Set aside the extra amount.','Count equal parts and use one part to find a group.'],prerequisites:['P4.S.MD.03'],representations:['table','bar-model','symbols','story'],misconceptions:[{name:'Leave the extra in the equal parts',fix:'Set it aside before dividing the remaining total.'},{name:'Count the blue parts only',fix:'Include the matching red parts and the green part too.'}],stages:[
 {kind:'readiness',title:'Count the equal parts',items:[{key:'three-ready',prompt:'A group has 2 equal parts, another has 2 equal parts and a third has 1 part. How many parts altogether?',answer:'5',tool:table([['First group','2 parts'],['Second group','2 parts'],['Third group','1 part']]),hints:['Count the parts in all three groups.'],steps:['2 + 2 + 1 = 5 parts.']}],booster:[{text:'Count both two-part groups and the one-part group.',math:'2 + 2 + 1 = 5'}]},
 {kind:'explain',title:'Set the extra aside',text:'First make red and blue equal. Then count all the equal parts.',example:'There are 92 buttons. Red has 8 more than blue. Blue has 3 times as many as green. Find blue.',frames:[
  {text:'The table keeps the three clues together.',tool:threeExample},
  {text:'Set aside the extra 8 red buttons. Red and blue now match.',math:'92 − 8 = 84',tool:threeExample},
  {text:'Green is 1 part. Blue is 3 parts, and the red buttons left are also 3 parts.',math:'1 + 3 + 3 = 7 parts',tool:threeExample},
  {text:'Share the 84 equally among the 7 parts, then use 3 parts for blue.',math:'84 ÷ 7 = 12; 3 × 12 = 36',tool:threeExample}]},
 {kind:'notice',title:'What changes first?',text:'Red has 8 more than blue. What makes their counts equal?',tool:threeExample,options:[{text:'Set aside 8 red buttons.',correct:true,reply:'Yes. The remaining red and blue counts match.'},{text:'Add 8 more red buttons.',correct:false,reply:'That makes red even larger.'},{text:'Remove 8 green buttons.',correct:false,reply:'The difference is between red and blue.'}]},
 {kind:'worked',title:'Try one step at a time',problem:'There are 79 buttons. Red has 9 more than blue. Blue has twice as many as green. Find blue.',tool:threeWorked,steps:[
  {text:'First set aside the extra red buttons.',tool:threeWorked,ask:{prompt:'How many buttons remain?',answer:'70',hint:'Subtract the extra from the total.'}},
  {text:'Now count red, blue and green parts.',tool:threeWorked,ask:{prompt:'How many equal parts are there?',answer:'5',hint:'Two red parts, two blue parts and one green part.'}},
  {text:'Share the remaining buttons equally among those parts.',tool:threeWorked,ask:{prompt:'How many buttons are in one part?',answer:'14',hint:'Divide the remaining total by the number of parts.'}},
  {text:'Blue has two of those equal parts.',tool:threeWorked,ask:{prompt:'How many blue buttons are there?',answer:'28',hint:'Multiply one part by two.'}},
  {text:'Put the extra back to check all three groups.',math:'14 + 28 + 37 = 79',tool:threeWorked}]},
 {kind:'practice',mode:'guided',title:'Practise with the clues',count:2,gen:three('direct')},
 {kind:'apply',title:'Try a new collection',count:1,gen:three('word')},
 {kind:'reason',title:'Explain your first move',items:[threeGroupsItem(31,0,'reasoning')]},
 {kind:'mastery',title:'Check the idea',gens:facets.map(facet=>({facet,gen:three(facet)}))},
 {kind:'discovery',title:'One equal part',text:'Set the extra aside, count all equal parts, and use one part to find the requested group.',tool:threeExample,math:'(92 − 8) ÷ 7 = 12'},
]};
const transferRaw:Lesson={...P4_ARCHIVE_META[1],world:'operation-station',track:'standard',revision:'catalogue-depth-2026-11-05-p4-transfer-v1',objectives:[P4_ARCHIVE_META[1].objective],canDo:['Track the loss and gain in a transfer.','Work back to the starting difference.'],prerequisites:['P4.S.MD.01'],representations:['table','bar-model','symbols','story'],misconceptions:[{name:'Count only one side of the transfer',fix:'The top loses and the bottom gains, so both changes affect the difference.'},{name:'Double the final difference',fix:'Find the starting difference before using the original twice-as-many clue.'}],stages:[
 {kind:'readiness',title:'Follow both trays',items:[{key:'transfer-ready',prompt:'The top tray loses 3 beads and the bottom gains 3 beads. By how many beads does the difference shrink?',answer:'6',tool:table([['Top','Loses 3'],['Bottom','Gains 3']]),hints:['Both changes bring the two amounts closer.'],steps:['3 + 3 = 6 beads.']}],booster:[{text:'A move changes both trays, not just one.',math:'3 + 3 = 6'}]},
 {kind:'explain',title:'Two changes in one move',text:'A transfer makes the top smaller and the bottom bigger.',example:'The top starts with twice the bottom. Move 8 beads down; the top then has 14 more. Find the starting top.',frames:[
  {text:'Keep the original comparison, move and final gap visible.',tool:transferExample},
  {text:'Moving 8 changes each side of the gap by 8.',math:'8 + 8 = 16',tool:transferExample},
  {text:'Add that change back to the final gap to recover the starting gap.',math:'14 + 16 = 30',tool:transferExample},
  {text:'At first the top was two parts and the bottom one part. Their gap was one part, so the top was two parts.',math:'30 × 2 = 60',tool:transferExample}]},
 {kind:'notice',title:'What happens to the difference?',text:'When 8 beads move from the top tray to the bottom, what happens to the difference?',tool:transferExample,options:[{text:'It shrinks by 16.',correct:true,reply:'Yes. One tray loses 8 and the other gains 8.'},{text:'It shrinks by 8.',correct:false,reply:'That counts the change in only one tray.'},{text:'It grows by 16.',correct:false,reply:'The move brings the two amounts closer.'}]},
 {kind:'worked',title:'Work backwards together',problem:'The top starts with twice the bottom. Move 9 beads down; the top then has 14 more. Find the starting top.',tool:transferWorked,steps:[
  {text:'The top loses 9 and the bottom gains 9.',tool:transferWorked,ask:{prompt:'By how many beads did the difference shrink?',answer:'18',hint:'Add both changes.'}},
  {text:'Add that change back to the final difference of 14.',tool:transferWorked,ask:{prompt:'What was the starting difference?',answer:'32',hint:'Use the change in difference from the last step.'}},
  {text:'The starting top was two equal parts and the bottom was one. Their difference is one part.',tool:transferWorked,ask:{prompt:'How many beads were in the top tray at first?',answer:'64',hint:'The top is two copies of the starting difference.'}},
  {text:'Check both trays after the move.',math:'64 − 9 = 55; 32 + 9 = 41; 55 − 41 = 14',tool:transferWorked}]},
 {kind:'practice',mode:'guided',title:'Practise working back',count:2,gen:transfer('direct')},
 {kind:'apply',title:'Try another tray story',count:1,gen:transfer('word')},
 {kind:'reason',title:'Explain the change',items:[transferDifferenceItem(31,0,'reasoning')]},
 {kind:'mastery',title:'Check the idea',gens:facets.map(facet=>({facet,gen:transfer(facet)}))},
 {kind:'discovery',title:'Follow both sides',text:'Add back both changes to recover the old difference. Then use the starting comparison.',tool:transferExample,math:'14 + 8 + 8 = 30'},
]};
export const P4_ARCHIVE_LESSONS=[threeRaw,transferRaw].map(lesson=>withDistinctQuestions(withLessonFlow(lesson)));
