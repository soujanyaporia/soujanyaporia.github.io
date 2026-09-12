import type {PlanEntry} from './plan';
import type {VisualGuide} from './guides';
import type {RevealStep,Tool} from '../model';
const step=(text:string,tool:Tool,because:string,math?:string,wonder?:RevealStep['wonder']):RevealStep=>({text,tool,because,math,wonder});
const pic=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
const strips=(denominators:number[],shaded:number[]):Tool=>({kind:'fractions',denominators,shaded});
/** Focused introductions where a broad topic demonstration would obscure the actual objective. */
export function coachedGuide(p:PlanEntry):VisualGuide|null{
 const o=p.objective.toLowerCase(),c=p.code;
 if(c==='FRAC'&&/represent a fraction|notation|unit fractions/.test(o)){
 if(/compare/.test(o))return {title:'Same whole, different-sized pieces',frames:[
 step('Imagine sharing two identical cakes. Cut the first cake into two equal pieces and the second into four.',strips([2,4],[0,0]),'We must start with equal-sized cakes. Otherwise, comparing the fractions would not compare equal wholes.'),
 step('Take one piece from each cake. Which piece would you rather have?',strips([2,4],[1,1]),'More cuts make smaller pieces. A quarter is one of four equal pieces; a half is one of two.',undefined,{question:'Is one quarter larger than one half because 4 is larger than 2?',answer:'No. Four tells us how many pieces share the whole cake. Each of those pieces is smaller.'}),
 step('One half covers more of the same whole than one quarter.',strips([2,4],[1,1]),'With unit fractions, the numerator stays at one. So compare the size of that one piece.','1/2 > 1/4') ]};
 return {title:'Name the part we have chosen',frames:[
 step('Here is one whole sandwich. Cut it into four equal pieces.',strips([4],[0]),'A fraction describes part of a chosen whole. Equal pieces let us give every piece the same name.'),
 step('Choose one piece. It is one of the four equal pieces: one quarter.',strips([4],[1]),'The bottom number, 4, tells us how many equal pieces make the whole. We call it the denominator.','1/4'),
 step('Now choose three of those pieces. We have three quarters.',strips([4],[3]),'The top number, 3, counts the pieces we chose. We call it the numerator. The pieces are still quarters.','3/4',{question:'Why is the bottom number still 4 when only three pieces are shaded?',answer:'The bottom number counts every equal part of the whole, including the unshaded part.'}),
 step('Point to the three shaded pieces, then to all four pieces. That is what the two numbers tell us.',strips([4],[3]),'Read 3/4 as “three quarters”: three selected pieces, each one a quarter of the whole.','3 chosen parts / 4 equal parts in the whole') ]};
 }
 if(c==='AREA'&&/identify/.test(o)&&/triangle/.test(o))return {title:'Which height belongs to this base?',frames:[
 step('Choose the bottom edge as our base. It is 6 units long.',{kind:'scene',scene:'triangle',values:[6,4],phase:0},'A height belongs to a particular base. Choose the base before looking for its height.'),
 step('Look at the little square in the corner. The upright side meets the base at a right angle.',{kind:'scene',scene:'triangle',values:[6,4],phase:0},'The height is the straight distance from the opposite vertex to the base line, measured at a right angle.'),
 step('For this base, the height is 4 units. The sloping edge is not the matching height.',{kind:'scene',scene:'triangle',values:[6,4],phase:0},'The height tells us how far the triangle reaches away from its base.',undefined,{question:'Can we use whichever side looks longest as the height?',answer:'No. Check the right angle. The height must be perpendicular to the chosen base.'}) ]};
 if(c==='AREA'&&/triangle/.test(o)&&!/composite|identify/.test(o))return {title:'Two triangles explain the half',frames:[
 step('We want to find how much surface this blue triangle covers. Its base is 6 units and its height is 4 units.',{kind:'scene',scene:'triangle',values:[6,4],phase:0},'Area measures the inside surface. The right-angle mark shows that the height is perpendicular to the base.'),
 step('Make an identical copy of the blue triangle. Turn the copy to fill the empty half.',{kind:'scene',scene:'triangle',values:[6,4],phase:1},'The orange triangle has exactly the same area as the blue one. Together they fill a rectangle, with no gap or overlap.'),
 step('The rectangle is 6 units across and 4 units high. Its area is 24 square units.',{kind:'scene',scene:'area',values:[6,4],phase:1},'There are six squares in each of four equal rows. That is why we multiply the base and height.','6 × 4 = 24 square units',{question:'Is 24 the area of one triangle or of both triangles together?',answer:'Both triangles together. The rectangle contains two equal copies of our triangle.'}),
 step('Share that area equally between the two triangles. Each triangle covers 12 square units.',{kind:'scene',scene:'triangle',values:[6,4],phase:2},'We divide by two because our rectangle contains two matching triangles. The formula records what the picture showed us.','triangle area = base × height ÷ 2 = 12') ]};
 if(c==='TIME'&&/convert|relate hours/.test(o))return {title:'An hour is a bundle of 60 minutes',frames:[
 step('Watch one full trip of the minute hand. Sixty minutes pass while the hour hand moves to the next hour.',pic({type:'clock',minutes:180},'Start at 3 o’clock.'),'Clock numbers divide the circle into 12 big steps. Each big step is five minutes: 12 × 5 = 60.'),
 step('Two hours contain two bundles of 60 minutes.',{kind:'bar',whole:120,parts:[60,60],labels:['first hour','second hour']},'We count the minutes in each hour and join them. Time uses 60 minutes per hour, not 100.','2 × 60 = 120 minutes'),
 step('Two hours and 15 minutes contain those 120 minutes, plus 15 more.',{kind:'bar',whole:135,parts:[60,60,15],labels:['1 hour','1 hour','15 min']},'Only the hour part needs converting. The extra 15 minutes are already in the unit we want.','120 + 15 = 135 minutes',{question:'How could we turn 135 minutes back into hours and minutes?',answer:'Take out two complete groups of 60. That uses 120 minutes and leaves 15: 2 hours 15 minutes.'}) ]};
 if(c==='MEASURE'&&p.level>=3&&/convert/.test(o)||c==='DEC'&&/convert measurement/.test(o)){
 const mass=/mass/.test(o),liquid=/liquid/.test(o),large=mass?'kg':liquid?'litre':'m',small=mass?'g':liquid?'ml':'cm',factor=mass||liquid?1000:100;
 return {title:'A new unit for the same amount',frames:[
 step(`One ${large} contains ${factor} ${small}. We can measure the same amount using either unit.`,{kind:'bar',whole:factor,parts:[factor],labels:[`1 ${large} = ${factor} ${small}`]},'The amount does not grow when we change its name. Smaller units simply need a bigger count.'),
 step(`Two ${large} contain two groups of ${factor} ${small}.`,{kind:'bar',whole:2*factor,parts:[factor,factor],labels:[`1 ${large}`,`1 ${large}`]},`First convert the larger-unit part by multiplying by ${factor}.`,`2 × ${factor} = ${2*factor} ${small}`),
 step(`Add another ${factor/2} ${small}. The complete amount is ${2.5*factor} ${small}.`,{kind:'bar',whole:2.5*factor,parts:[factor,factor,factor/2],labels:[`1 ${large}`,`1 ${large}`,`${factor/2} ${small}`]},'The last part is already in small units. Add it after converting the larger units.',`${2*factor} + ${factor/2} = ${2.5*factor} ${small}`,{question:'Why do we need more small units than large units?',answer:'Each small unit measures less, so more of them are needed to describe the same amount.'}) ]};
 }
 if(c==='DEC'&&/round/.test(o))return {title:'Find the nearest tenth',frames:[
 step('We want to round 0.36 to one decimal place. It lies between 0.3 and 0.4.',{kind:'line',min:.3,max:.4,start:.36,jumps:[],step:.01},'One decimal place means tenths. So first find the two neighbouring tenths.'),
 step('The halfway point is 0.35. Our number, 0.36, is just past it towards 0.4.',{kind:'line',min:.3,max:.4,start:.35,mark:.36,jumps:[],step:.01},'Compare distances on the line: 0.36 is four hundredths from 0.4, but six hundredths from 0.3.'),
 step('The closer tenth is 0.4. That is our rounded number.',{kind:'line',min:.3,max:.4,start:.36,jumps:[.04],step:.01},'Rounding gives a nearby value at the precision requested. It does not mean 0.36 and 0.4 are exactly equal.','0.36 ≈ 0.4',{question:'What would happen at exactly 0.35?',answer:'That is halfway. Using the usual rounding rule, we choose the higher tenth, 0.4.'}) ]};
 if(c==='GRAPH'&&p.level===1)return {title:'Read the key, then count',frames:[
 step('Our class voted for fruit. The key tells us that one picture stands for one vote.',pic({type:'bars',pictures:true,labels:['Apples','Pears'],values:[3,2],scale:1},'Key: one picture = one vote.'),'A picture graph replaces a list of votes with pictures. The key tells us what each picture means.'),
 step('Follow the apple row. Count each picture once: one, two, three. Apples received three votes.',pic({type:'bars',pictures:true,labels:['Apples','Pears'],values:[3,2],scale:1},'Apples: 3 pictures, so 3 votes.'),'We read the fruit label first so we count the correct row.','3 pictures = 3 votes'),
 step('Pears received two votes. Match two apple pictures with the two pear pictures. One apple picture is left over.',{kind:'bar',whole:null,parts:[],compare:{top:3,bottom:2,names:['Apple votes','Pear votes']}},'The unmatched part shows how many more. It is the difference between the two totals.','3 − 2 = 1 more vote',{question:'How many children voted altogether?',answer:'Join the three apple votes and the two pear votes: 3 + 2 = 5 children.'}) ]};
 return null;
}
