import {Rng} from '../../engine/random';
import type {Item,Lesson,Stage,Tool} from '../model';
import {questionModel} from '../tools/questionModel';

function plan(prompt:string,choices:string[],answer:string,why:string,wrong:Record<string,string>):Item{
 return {key:'bridge-plan',prompt,choices,answer,facet:'reasoning',hints:[why],steps:[why,answer],wrong,check:why,another:[{title:"Why the other choice does not fit",steps:Object.values(wrong)}]};
}
function transfer(prompt:string,answer:string,tool:Tool,steps:string[],check:string,wrong:Record<string,string>):Item{
 return {key:'bridge-transfer',prompt,answer,tool:questionModel(tool),facet:'word',hints:steps,steps:[...steps,`The answer is ${answer}.`],check,wrong,another:[{title:"Check against the original situation",steps:[check]}]};
}
/** A decision followed by a changed context: copying the last worked answer cannot pass both. */
export const INDEPENDENCE_CHECKS:Record<string,[Item,Item]>={
 'p1s-as-03':[
  plan('You know 6 + 3 = 9. Which taking-away sentence uses exactly the same whole and parts?',['9 − 6 = 3','6 − 3 = 9'],'9 − 6 = 3','Taking away starts with the whole, nine. Removing one part leaves the other.',{'6 − 3 = 9':'Six is only a part. Start with all nine, then take away six.'}),
  transfer('There are ten children. Four wear caps. How many do not wear caps?','6',{kind:'bond',whole:10,parts:[4,6],hide:'b',locked:true},['Ten is the whole group. Four with caps is one part.','Find the other part: take four away from ten.'],'4 with caps + 6 without caps = all 10 children.',{'4':'Four counts those with caps. Find the other part.','14':'The four children are already included in the ten.'})
 ],
 'p1s-as-07':[
  plan('We take five from thirteen. Which action checks how many are left?',['Put the five back.','Take five away again.'],'Put the five back.','A check should rebuild the group we started with.',{'Take five away again.':'That takes away a second group. To check, undo the first taking-away action.'}),
  transfer('A bus has twelve children. Four get off. How many stay on the bus?','8',{kind:'take-away',start:12,removed:[8,9,10,11]},['The bus starts with twelve children.','Four leave. Count the children without crosses.'],'8 children stay. Putting the 4 back gives 12 again.',{'16':'The four children get off, so the group becomes smaller.','4':'Four get off. Count those who stay.'})
 ],
 'p2s-md-02':[
  plan('Twelve buns go into bags of three. What does 12 ÷ 3 count?',['The number of bags.','The number of buns in each bag.'],'The number of bags.','Three buns already tells us the size of each bag. Division finds how many bags fit into twelve.',{'The number of buns in each bag.':'We already know there are three in each bag. The missing quantity is how many bags.'}),
  transfer('Twenty pencils go into packets of five. How many packets can we fill?','4',{kind:'groups',groups:4,size:5},['The total is twenty. Each packet holds five.','Count how many groups of five make twenty.'],'4 packets × 5 pencils = 20 pencils.',{'5':'Five counts pencils per packet. Find the number of packets.','15':'Taking five once fills only one packet. Keep making equal groups.'})
 ],
 'p2s-frac-01':[
  plan('A whole is cut into five equal parts. Two are blue and three are white. What does the bottom number count?',['All five equal parts.','Only the three white parts.'],'All five equal parts.','The whole contains both the chosen and unchosen parts.',{'Only the three white parts.':'The blue parts belong to the whole too. Count every equal part.'}),
  transfer('This circle is one whole. What fraction is coloured? Write the fraction shown.','3/4',{kind:'fraction-pieces',shape:'circle',widths:[1,1,1,1],selected:[0,1,2]},['The shape has changed, but the idea has not: start with the whole.','There are four equal pieces altogether. Three are coloured.'],'The top counts 3 coloured pieces. The bottom counts all 4 equal pieces.',{'3/1':'One counts only the uncoloured piece. The bottom must include all four.','1/4':'That describes the uncoloured share. We want the coloured share.'})
 ],
 'p3s-frac-01':[
  plan('Every third of a strip is cut into four equal pieces. What happens to both numbers in 2/3?',['Multiply both by four.','Add four to both.'],'Multiply both by four.','Each old part produces four new parts, including each coloured part.',{'Add four to both.':'Every old piece becomes four pieces. That multiplies both counts; it does not add four pieces to each.'}),
  transfer('Half a metre of ribbon is marked in eighths of a metre. How many eighths make the same half metre?','4',{kind:'fractions',denominators:[2,8],shaded:[1,4]},['The whole metre has eight equal pieces instead of two.','Each old half contains four of the new pieces.'],'4/8 metre and 1/2 metre reach the same point.',{'1':'One was the number of halves. Count the smaller eighths now.','6':'Do not add six to both numbers. Each half has been split into four.'})
 ],
 'p4s-dec-01':[
  plan('The digit 5 moves from tenths to hundredths. What happens to its value?',['It becomes one tenth as much.','It stays the same because the digit is still 5.'],'It becomes one tenth as much.','Each hundredth is one tenth the size of a tenth. We still have five pieces, but they are smaller.',{'It stays the same because the digit is still 5.':'The digit counts pieces. Moving place changes the size of those pieces.'}),
  transfer('A ribbon measures 0.507 m. What value does the digit 7 contribute, in metres?','0.007',{kind:'place',digits:[5,0,7],wholes:0},['Read the places after the decimal point: tenths, hundredths, thousandths.','The seven counts thousandths of a metre.'],'0.5 m + 0.007 m = 0.507 m.',{'7':'Seven is the digit. Its place makes it seven thousandths of a metre.','0.07':'That is seven hundredths. Here the zero holds the hundredths place.'})
 ],
 'p4s-dec-05':[
  plan('For 0.62 − 0.27, we exchange one tenth. Which row still represents 0.62?',['5 tenths and 12 hundredths.','6 tenths and 12 hundredths.'],'5 tenths and 12 hundredths.','One tenth becomes ten hundredths. We gain ten hundredths but must have one fewer tenth.',{'6 tenths and 12 hundredths.':'That creates an extra tenth. Remove the exchanged tenth from the tenths column.'}),
  transfer('A 0.71 m ribbon has 0.26 m cut off. How many metres remain?','0.45',{kind:'table',headers:['Ribbon at first (m)','Cut off (m)'],rows:[['0.71','0.26']],caption:'Find the part that remains.'},['There is only one hundredth, so exchange one tenth for ten hundredths.','0.71 becomes 6 tenths and 11 hundredths. Subtract 2 tenths and 6 hundredths.'],'0.45 m + 0.26 m = the original 0.71 m.',{'0.55':'After exchanging, there are six tenths, not seven, before subtracting.','0.97':'The ribbon gets shorter. Subtract the part cut off.'})
 ],
 'p5s-pct-03':[
  plan('Thirty per cent of 60 is 18. Now the whole becomes 90, with the same 30% share. What changes?',['Each ten-per-cent section holds more.','The share is still 18 because 30% did not change.'],'Each ten-per-cent section holds more.','The percentage fixes a proportion. Increasing the whole increases the amount in each equal section.',{'The share is still 18 because 30% did not change.':'Eighteen belonged to a whole of sixty. Each tenth of ninety is larger.'}),
  transfer('A club has 90 children. Thirty per cent walk to school. How many children walk?','27',{kind:'percent',whole:90,percent:30,step:10},['The full bar is ninety children. One tenth is 90 ÷ 10.','Thirty per cent is three of those equal tenths.'],'27 is three groups of 9; 9 is one tenth of 90.',{'30':'Thirty is the percentage, not the number of children.','18':'The whole is ninety this time, not sixty.','9':'Nine children is only ten per cent. We need three such sections.'})
 ],
 'p5s-area-02':[
  plan('A right-angled triangle has base 8 and perpendicular height 5. What does 8 × 5 measure?',['The matching rectangle containing two copies of this triangle.','Just this one triangle.'],'The matching rectangle containing two copies of this triangle.','Two copies of the right triangle fill the rectangle. One triangle takes half its area.',{'Just this one triangle.':'Base times height covers the full matching rectangle. The triangle fills half.'}),
  transfer('A triangular flag has base 10 cm and perpendicular height 6 cm. What is its area in square centimetres?','30',{kind:'triangle-pair',base:10,height:6,joined:false},['Two matching flags fill a 10-by-6 rectangle.','Find the rectangle’s area, then take half.'],'2 × 30 = 60 square centimetres, the matching rectangle’s area.',{'60':'Sixty covers the whole rectangle, which holds two flags.','16':'Adding the side measurements does not count the surface inside.'})
 ],
 'p6s-alg-05':[
  plan('For 3x + 2 = 20, which first step keeps both sides equal?',['Subtract 2 from both sides.','Subtract 2 from the left side only.'],'Subtract 2 from both sides.','The +2 is outside the equal groups. Remove the same amount from each side before sharing.',{'Subtract 2 from the left side only.':'The sides were equal. Changing only one side breaks that equality.'}),
  transfer('Three identical notebooks and a $2 delivery charge cost $20. What is the price of one notebook, in dollars?','6',{kind:'balance',left:{x:3,n:2},right:{x:0,n:20},xValue:6},['The three bags stand for notebook prices. The two loose counters stand for delivery.','Remove $2 from both sides, then share the remaining $18 among three notebooks.'],'3 × $6 + $2 = $20, including delivery.',{'18':'Eighteen dollars buys all three notebooks. Share equally to find one.','20':'Twenty includes all three notebooks and the delivery charge.','22':'Remove the delivery cost from the total before sharing it.'})
 ]
};

const pictureNotes:Record<string,string>={
 'p1s-as-03':'The whole is all ten children. The part of four counts children with caps; the question mark is the group without caps.',
 'p1s-as-07':'Each counter stands for one child on the bus. Crosses mark the children who got off.',
 'p2s-md-02':'Each ring is one packet. Each dot is one pencil. Count packets, rather than the pencils inside one packet.',
 'p2s-frac-01':'The full circle is one whole, including the uncoloured piece. The pieces have equal size.',
 'p3s-frac-01':'Each full strip represents one metre of ribbon. The top is divided into halves; the bottom into eighths. Compare the marked lengths.',
 'p4s-dec-01':'One whole in this chart represents one metre. The counters record tenths, hundredths and thousandths of that metre.',
 'p4s-dec-05':'Both table entries measure metres of the same ribbon. One is the starting length and the other is the length removed.',
 'p5s-pct-03':'The full bar stands for all ninety children, not one hundred children. The coloured part represents those who walk.',
 'p5s-area-02':'In this picture, one length unit is one centimetre. The right-angle mark shows how the height meets the base.',
 'p6s-alg-05':'Each bag stands for the price of one notebook. Each loose square stands for $1. The two loose squares on the left represent the delivery charge.'
};

export function addIndependenceCheck(lesson:Lesson):Lesson{
 const items=INDEPENDENCE_CHECKS[lesson.id];if(!items)return lesson;
 const stages=[...lesson.stages],at=stages.findIndex(s=>s.kind==='reflect')+1;
 const bridge:Stage={kind:'practice',mode:'guided',title:'Choose a first step, then try it',text:'First choose why a step works. Then use the same idea in a different question. The earlier example is here if you need it.',flow:{phase:'try',label:'Take the idea to a new question',transition:'You have explained the example. Now choose a useful first step and try the idea in a new situation.'},count:2,gen:(seed,i)=>({...items[i%2],modelNote:i%2?pictureNotes[lesson.id]:undefined,choices:items[i%2].choices?new Rng(seed+i).shuffle(items[i%2].choices!):undefined,simpler:i%2?{...items[0],key:'support-bridge-plan'}:undefined})};
 stages.splice(at,0,bridge);
 return {...lesson,revision:lesson.revision?.replace('-v5','-v6'),stages};
}
