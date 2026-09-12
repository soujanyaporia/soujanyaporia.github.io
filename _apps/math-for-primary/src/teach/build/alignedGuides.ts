import type {PlanEntry} from './plan';
import type {VisualGuide} from './guides';
import type {RevealStep,Tool} from '../model';

const step=(text:string,tool:Tool,math?:string,caption?:string):RevealStep=>({text,tool,math,caption});
const table=(headers:string[],rows:string[][],caption:string):Tool=>({kind:'table',headers,rows,caption});
const strips=(denominators:number[],shaded:number[]):Tool=>({kind:'fractions',denominators,shaded});
const bar=(whole:number,parts:number[],labels?:string[]):Tool=>({kind:'bar',whole,parts,labels});
const picture=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
const clock=(minutes:number,caption:string)=>picture({type:'clock',minutes},caption);

/** Specific objectives must not inherit a demonstration about a different operation or unit. */
export function alignedGuide(p:PlanEntry):VisualGuide|null{
 const c=p.code,o=p.objective.toLowerCase();
 if(c==='FRAC'&&/simplif/.test(o))return {title:'Fewer parts, the same share',setup:'Four of eight equal parts are shaded. Can we name that same share using fewer, larger equal parts?',frames:[
  {text:'Start with four shaded eighths. Count the unshaded parts too: all eight belong to our one whole.',tool:strips([8],[4]),math:'4/8',caption:'Four shaded parts out of eight equal parts.',because:'A simpler fraction must cover exactly this same length. We may regroup the pieces, but must not change the whole or its shaded share.'},
  {text:'Pair neighbouring eighths. Two small parts now make one larger part. Four shaded pieces become two shaded pairs; eight pieces become four pairs altogether.',tool:strips([8,4],[4,2]),math:'4/8 = (4 ÷ 2)/(8 ÷ 2) = 2/4',caption:'The lower strip groups the upper strip’s pieces in pairs. The blue lengths still match.'},
  {text:'Pair the quarters once more. Two shaded quarters become one half, and the four quarters become two halves.',tool:strips([4,2],[2,1]),math:'2/4 = (2 ÷ 2)/(4 ÷ 2) = 1/2',caption:'The top has two shaded quarters. The bottom has one shaded half.',because:'Divide both counts by the same number because we regroup the shaded pieces and all the pieces in exactly the same way.'},
  {text:'We can stop at one half: 1 and 2 have no common factor greater than 1. Check the first strip against the last. Their shaded lengths have not changed.',tool:strips([8,2],[4,1]),math:'4/8 = 1/2',caption:'Different counts of parts; one unchanged shaded amount.',because:'Simplifying changes the fraction’s name, not its size. Dividing only the bottom number would change the share.'}
 ]};
 if(c==='TIME'&&/second/.test(o))return {title:'Sixty seconds make one minute',setup:'A timer runs for 2 minutes and 15 seconds. How many seconds pass altogether?',frames:[
  step('Seconds measure short stretches of time. Six groups of ten seconds make one minute.',bar(60,[10,10,10,10,10,10],Array(6).fill('10 s')),'60 s = 1 min','The whole bar is one minute. Each section is ten seconds.'),
  step('Our timer runs for two whole minutes first. Each minute contains 60 seconds.',bar(120,[60,60],['first minute','second minute']),'2 × 60 = 120 s'),
  step('The extra 15 seconds are already in seconds. Add them to the 120.',bar(135,[60,60,15],['60 s','60 s','15 s']),'120 + 15 = 135 s'),
  step('Check by taking out two complete groups of 60. We get two minutes, with 15 seconds left.',table(['Minutes','Extra seconds','Total seconds'],[['2','15','135']],'The same duration in two forms'),'135 s = 2 min 15 s')
 ]};
 if(c==='TIME'&&/24-hour/.test(o))return {title:'Name the hour without am or pm',setup:'A clock shows 9 o’clock in the evening. How do we write that time using the 24-hour clock?',frames:[
  step('In the morning, nine o’clock is written 09:00. The two digits after the colon count minutes.',clock(540,'9:00 am = 09:00'),'09:00'),
  step('After noon, keep counting the hours beyond twelve. Nine in the evening is twelve plus nine: 21.',clock(1260,'9:00 pm = 21:00'),'12 + 9 = 21; 9:00 pm = 21:00'),
  step('The minutes do not change. A quarter past nine in the evening is 21:15.',clock(1275,'9:15 pm = 21:15'),'9:15 pm = 21:15'),
  step('Remember the two boundary times: midnight begins the day at 00:00; noon is 12:00.',table(['Time of day','24-hour time'],[['Midnight','00:00'],['Noon','12:00'],['9 pm','21:00']],'Hours since the start of the day'))
 ]};
 if(c==='TIME'&&/read clocks/.test(o)){
  const minute=/to the minute/.test(o)?27:25;
  return {title:'Count the minute spaces',setup:`It is ${minute} minutes past three in the afternoon. What do the two hands tell us?`,frames:[
   step('Start at three o’clock. The short hand shows the hour; the long hand begins at twelve.',clock(180,'3:00: the hour is three.')),
   step('Each big number marks five minutes. Count five, ten, fifteen, twenty, twenty-five to reach the 5.',clock(205,'The minute hand at 5 means 25 minutes.'),'5 × 5 = 25 minutes'),
   ...(minute===27?[step('Move two small minute spaces further. The minute hand now shows 27 minutes past the hour.',clock(207,'Two more minute spaces after 25.'),'25 + 2 = 27 minutes')]:[]),
   step(`The short hand is part of the way from three to four. Read the time as 3:${minute}. Because our story says afternoon, use pm.`,clock(180+minute,`3:${minute} pm`),`3:${minute} pm`)
  ]};
 }
 if(c==='GRAPH'&&/table/.test(o)){
  const complete=/complete/.test(o),rows=[['Apples','3'],['Pears',complete?'?':'5'],['Total','8']];
  return {title:complete?'Complete the missing table entry':'Find where the row and column meet',setup:complete?'There are 8 pieces of fruit. Three are apples; the rest are pears. Fill in the missing count.':'A table records 3 apples and 5 pears. How do we find the number of pears?',frames:[
   step('Read the headings first. The first column names the fruit; the second gives its count.',table(['Fruit','Number of pieces'],rows,'Fruit counts')),
   step('Find the Pears row, then move across to the count column. Keep the row and heading together.',table(['Fruit','Number of pieces'],[rows[1]],'The row we are reading')),
   step(complete?'The total is 8 and the apple part is 3. The pear part must be 8 − 3.':'The entry is 5, so there are five pears. The heading tells us that 5 counts pieces of fruit.',bar(8,[3,5],['apples','pears']),complete?'8 − 3 = 5':'3 + 5 = 8'),
   step('Check the completed table: both fruit counts add to the total.',table(['Fruit','Number of pieces'],[['Apples','3'],['Pears','5'],['Total','8']],'Check the total'),'3 + 5 = 8')
  ]};
 }
 if(c==='FACT'&&/multiple/.test(o))return {title:'Count equal jumps to find multiples',setup:'Which numbers can we reach by counting in threes? Which can also be reached by counting in fours?',frames:[
  step('A multiple of three is the total of some whole groups of three. One, two, three and four groups give 3, 6, 9 and 12.',{kind:'line',min:0,max:24,start:0,jumps:[3,3,3,3],step:1},'3, 6, 9, 12, …'),
  step('Counting in fours gives a different list: 4, 8, 12, 16, 20, 24.',{kind:'line',min:0,max:24,start:0,jumps:[4,4,4,4,4,4],step:1},'4, 8, 12, 16, 20, 24'),
  step('A common multiple belongs to both lists. Twelve and twenty-four appear in both.',table(['Multiples of 3','Multiples of 4'],[['3, 6, 9, 12','4, 8, 12'],['15, 18, 21, 24','16, 20, 24']],'Look for values shared by both lists'),'12 = 4 × 3 = 3 × 4')
 ]};
 if(c==='FACT'&&/common/.test(o))return {title:'Find factors that fit both numbers',setup:'We want equal group sizes that divide both 12 and 18 without leftovers.',frames:[
  step('Twelve counters fit into four rows of three. So three is a factor of twelve.',{kind:'array',rows:4,cols:3},'12 ÷ 3 = 4'),
  step('Eighteen counters also fit into rows of three, this time six rows. Three is a factor of both numbers.',{kind:'array',rows:6,cols:3},'18 ÷ 3 = 6'),
  step('List the factors of each number and keep the values in both lists. The common factors are 1, 2, 3 and 6.',table(['Number','Factors'],[['12','1, 2, 3, 4, 6, 12'],['18','1, 2, 3, 6, 9, 18']],'A common factor must fit both numbers'),'Common factors: 1, 2, 3, 6')
 ]};
 if(c==='FRAC'&&/like fractions/.test(o)&&/add|subtract/.test(o))return {title:'Join and remove pieces of the same size',setup:'One fifth of a strip is shaded. Shade two more fifths. What fraction is shaded now?',frames:[
  step('The whole strip has five equal parts. One part is shaded: one fifth.',strips([5],[1]),'1/5'),
  step('Shade two more parts of the same size. Count the shaded fifths: one, two, three.',strips([5],[3]),'1/5 + 2/5 = 3/5'),
  step('We did not cut the strip again, so each piece is still a fifth. That is why the denominator stays five.',strips([5],[3]),'Add the number of fifths: 1 + 2 = 3'),
  step('Now remove one shaded fifth. Two fifths remain. Subtraction counts how many of the same-sized pieces are left.',strips([5],[2]),'3/5 − 1/5 = 2/5')
 ]};
 if(c==='FRAC'&&/fraction as division|fractions as division|whole-number division|whole number division/.test(o))return {title:'Sharing explains the fraction',setup:'Three whole cakes are shared equally among four children. How much cake does each child get?',frames:[
  step('These are our three cakes. Cut each cake into four equal parts, one for each child.',strips([4,4,4],[4,4,4]),undefined,'Each strip is one cake. There are three cakes altogether.'),
  step('Give one child a quarter from each cake. The highlighted pieces are that child’s share.',strips([4,4,4],[1,1,1]),'1/4 + 1/4 + 1/4 = 3/4','Only one child’s share is highlighted. The other pieces go to the other three children.'),
  step('The three pieces together make three quarters of one cake. Every child receives the same share.',strips([4],[3]),'3 ÷ 4 = 3/4'),
  step('Four equal shares of three quarters put all three cakes back together. The numerator is the amount shared; the denominator is the number of equal shares.',{kind:'groups',groups:4,size:3},'4 × 3/4 = 3','Each dot is one quarter of a cake. Four groups of three quarters use twelve quarters: three whole cakes.')
 ]};
 if(c==='DEC'&&/place value/.test(o))return {title:'Each place is ten times smaller',setup:'What does each digit in 0.347 tell us about the amount?',frames:[
  step('Start with three tenths. The 3 belongs in the tenths column because it counts pieces of size one tenth.',{kind:'place',wholes:0,digits:[3]},'0.3 = 3 tenths'),
  step('Split a tenth into ten hundredths. Add four hundredths; the three tenths stay where they are.',{kind:'place',wholes:0,digits:[3,4]},'0.34 = 0.3 + 0.04'),
  step('Split a hundredth into ten thousandths. Add seven thousandths in the next column.',{kind:'place',wholes:0,digits:[3,4,7]},'0.347 = 0.3 + 0.04 + 0.007'),
  step('A digit tells us how many; its column tells us the size of each piece. Here the 7 means seven thousandths, not seven ones.',{kind:'place',wholes:0,digits:[3,4,7]},'Value of 7: 0.007')
 ]};
 if((c==='DEC'||c==='FRAC')&&/convert fractions.*decimal|fractions to decimals/.test(o))return {title:'Rename the fraction in tenths or hundredths',setup:'How can we write three quarters as a decimal?',frames:[
  step('Three of four equal pieces are shaded. This is three quarters of the whole.',strips([4],[3]),'3/4'),
  step('Each quarter is 25 hundredths. Three quarters therefore cover 75 of the hundred small squares.',{kind:'hundred',shaded:75},'3/4 = 75/100','The grid is the same whole, cut into one hundred equal pieces.'),
  step('Seventy-five hundredths means seven tenths and five more hundredths. Write 0.75.',{kind:'place',wholes:0,digits:[7,5]},'75/100 = 0.75'),
  step('We have changed the name, not the amount: the fraction and decimal describe the same shaded share.',{kind:'hundred',shaded:75},'3/4 = 0.75')
 ]};
 if(c==='DEC'&&/express decimals as fractions/.test(o))return {title:'Read the last decimal place to name the fraction',setup:'How can we write 0.35 as a fraction?',frames:[
  step('The last digit is in the hundredths column. So 0.35 means thirty-five hundredths.',{kind:'place',wholes:0,digits:[3,5]},'0.35 = 35/100'),
  step('Shade 35 squares of a hundred-square whole. This shows why the denominator is one hundred.',{kind:'hundred',shaded:35},'35 shaded parts out of 100'),
  step('If we simplify, divide both numbers by five. Seven groups of five shaded squares are out of twenty groups of five.',bar(100,Array(20).fill(5)),'35/100 = 7/20'),
  step('Both fractions describe the same amount. Simplifying changes the size and count of parts together.',{kind:'hundred',shaded:35},'0.35 = 35/100 = 7/20')
 ]};
 if(c==='DEC'&&/quotient/.test(o))return {title:'Keep sharing into smaller decimal units',setup:'Three litres are shared equally among four containers. How many litres go in each?',frames:[
  step('Three litres cannot give each of four containers a whole litre. We need smaller units.',{kind:'bar',whole:3,parts:[null,null,null,null],labels:['container 1','container 2','container 3','container 4']},'3 ÷ 4'),
  step('Rename three litres as 300 hundredths of a litre. Now share the 300 hundredths equally into four groups.',bar(300,[75,75,75,75],['75 hundredths','75 hundredths','75 hundredths','75 hundredths']),'300 ÷ 4 = 75 hundredths'),
  step('Each container receives 75 hundredths of a litre. Write this as 0.75 litre.',{kind:'place',wholes:0,digits:[7,5]},'3 ÷ 4 = 0.75'),
  step('If an answer to one decimal place is needed, round 0.75 to 0.8. Keep the exact quotient separate from its rounded value.',{kind:'line',min:.7,max:.8,start:.75,jumps:[.05],step:.01},'Exact: 0.75 · To 1 decimal place: 0.8')
 ]};
 if(c==='DEC'&&/multiply|divide/.test(o)&&!/powers|10 100|10,|measurement/.test(o))return {title:'Multiply and share decimal pieces',setup:'Three ribbons are each 0.4 metre long. What length do they make altogether?',frames:[
  step('Each ribbon is four tenths of a metre. We have three equal amounts.',strips([10,10,10],[4,4,4]),'0.4 × 3','Each strip is a one-metre reference. The shaded four tenths show one ribbon.'),
  step('Three groups of four tenths give twelve tenths. Ten tenths make one whole metre.',{kind:'place',wholes:1,digits:[2]},'4 tenths × 3 = 12 tenths = 1.2'),
  step('The total length is 1.2 metres. The decimal point records the unit size; it is not an extra object.',bar(1.2,[.4,.4,.4],['0.4 m','0.4 m','0.4 m']),'0.4 × 3 = 1.2'),
  step('Reverse the story: share the 1.2 metres into three equal lengths. Each is 0.4 metre again.',bar(1.2,[.4,.4,.4],['0.4 m','0.4 m','0.4 m']),'1.2 ÷ 3 = 0.4')
 ]};
 if(c==='AREA'&&/perimeters of rectilinear/.test(o))return {title:'Trace the outside, including the notch',setup:'A 6 cm by 4 cm rectangle has a 2 cm square removed from its top-right corner. What is the new perimeter?',frames:[
  step('Perimeter measures the distance around the outside. For the full rectangle, add its four sides.',picture({type:'area',a:6,b:4},'The original rectangle'),'6 + 4 + 6 + 4 = 20 cm'),
  step('Removing the corner removes two outer lengths of 2 cm. But the notch adds two new boundary lengths of 2 cm.',picture({type:'area',a:6,b:4,cut:2},'Trace the solid boundary, not the dashed missing corner.')),
  step('Walk clockwise from the top-left corner: 4, 2, 2, 2, 6, 4 centimetres. Count every solid edge once.',picture({type:'area',a:6,b:4,cut:2},'The new path has six edges.'),'4 + 2 + 2 + 2 + 6 + 4 = 20 cm'),
  step('The area became smaller, but this corner cut did not change the perimeter. We replaced equal horizontal and vertical distances.',picture({type:'area',a:6,b:4,cut:2},'Perimeter is a boundary length, measured in cm.'),'Perimeter = 20 cm')
 ]};
 return null;
}
