import type {Tool} from './model';

export interface ModelReading {parts:[string,string][];look:string}
/** Explain the notation, never calculate a hidden quantity or disclose xValue. */
export function modelReading(tool:Tool):ModelReading|null{
 const t=tool.kind==='focus'?tool.source:tool;
 switch(t.kind){
 case 'balance':{
  const x=t.letter??'x';
  return {parts:[[`${x} on a bag`,'The number inside one bag. Matching bags hold the same number.'],['A loose square','One counter, outside the bags.'],['=','Both sides have the same value.']],look:`A number just before ${x} counts bags: 2${x} means two equal bags, not 2 + ${x}. Find the bags and the loose counters separately.`};
 }
 case 'bond':return {parts:[['Whole','All the counters together.'],['Parts','The two groups that make that whole.']],look:'Follow each branch from the whole to a part. The whole already includes both parts; it is not an extra group.'};
 case 'take-away':return {parts:[['Every position','One counter that was here at the start.'],['A cross','A counter that has been taken away.']],look:'Find the starting group first. Only counters without crosses stay.'};
 case 'fractions':case 'fraction-pieces':return {parts:[['Whole','The complete strip or circle, including the uncoloured parts.'],['Equal parts','Pieces that each have the same size.'],['Fraction','The bottom number counts all equal parts; the top counts the chosen parts.']],look:'Check that the parts are equal before naming a fraction. When comparing strips, check that their wholes are the same size.'};
 case 'groups':case 'array':case 'share':return {parts:[['A group','One plate, bag or row of objects.'],['In each group','How many objects belong to just one group.'],['Altogether','How many objects belong to all the groups combined.']],look:'Point to one group. Is the question asking for the size of a group, the number of groups, or the total?'};
 case 'ratio':return {parts:[['One box','One unit. Every box stands for the same amount.'],['A row','All the units belonging to the name beside it.'],['The colon :','“To”. It compares the numbers of equal units, in the order of the names.']],look:'Read the names in order. A ratio counts units; each unit may stand for more than one object.'};
 case 'percent':return {parts:[['The full bar','The whole amount named in the question. It is 100%.'],['%','Per cent: a share out of one hundred equal parts.'],['The shaded part','The share of that whole that we are interested in.']],look:'Read what 100% stands for first. The percentage and the number of objects are different kinds of information.'};
 case 'place':case 'hundred':return {parts:[['One whole','The complete unit we are measuring.'],['A tenth','One of ten equal parts of a whole.'],['A hundredth','One of one hundred equal parts of a whole.']],look:t.kind==='place'?'Read each column heading. A thousandth is one of one thousand equal parts. The digit counts pieces; its place tells you their size.':'Each small square is a hundredth. A complete row holds ten hundredths, which makes one tenth.'};
 case 'bar':return {parts:[['A bar','An amount; a longer bar represents a larger amount on the same scale.'],['A label','What that amount belongs to.'],['?','The amount we need to find.']],look:t.compare?'Compare the ends of the bars. The extra length is the difference, not the combined total.':'Trace the full bar, then its parts. Decide whether the unknown is a part or the whole.'};
 case 'line':return {parts:[['A mark','A number at a position on the line.'],['A jump','A change from one number to another.']],look:'Read the distance between neighbouring marks. Count the spaces you move across, not the starting mark.'};
 case 'triangle-pair':return {parts:[['Base','The side we use as the bottom for measuring.'],['Perpendicular height','The distance to the opposite corner, measured at a right angle to the base.'],['Area','How much flat surface a shape covers, measured in square units.']],look:'Look for the right-angle mark. The height is not always the sloping side.'};
 case 'counters':return {parts:[['A dot','One object.'],['An empty space','Room for a counter; it does not count as an object.']],look:'Touch or point to each dot once. Five spaces make a row; two full rows hold ten counters.'};
 case 'table':return {parts:[['Heading','What the values in that column mean.'],['Row','Values that belong together.']],look:'Read a value with its heading and unit. Numbers on their own do not tell the whole story.'};
 case 'net-model':return {parts:[['Face','One flat surface of a solid.'],['Net','The faces opened out flat while still joined along some edges.']],look:'Imagine folding at each joined edge. A face must not overlap another face when the solid closes.'};
 case 'geometry':{
  const guides:Record<string,ModelReading>={
   angle:{parts:[['Vertex','The point where the two rays meet.'],['Degrees (°)','Units for measuring the size of a turn.']],look:'Look at the opening between the rays. Longer rays do not make a larger angle.'},
   rectangle:{parts:[['Length and width','Distances along two sides meeting at a right angle.'],['Area','The number of unit squares covering the inside.']],look:'Distinguish the distance around the edge from the surface inside.'},
   solid:{parts:[['Unit cube','One cube measuring one unit along every edge.'],['Volume','How many unit cubes fill the solid.']],look:'Count the cubes in one layer, then count the layers. Include cubes hidden behind the ones you can see.'},
   clock:{parts:[['Short hand','The hour, including how far we have moved past it.'],['Long hand','The minutes after the hour.']],look:'Each number-to-number space is five minutes. Read the two hands together.'},
   ruler:{parts:[['Zero','Where the measurement starts.'],['Unit','The length of one equal measuring space.']],look:'Count the spaces from start to finish. If the object does not start at zero, subtract the starting reading.'},
   mirror:{parts:[['Mirror line','The line where a reflection folds.'],['Matching points','Points on opposite sides, the same distance from the line.']],look:'Measure across to the line at a right angle. A reflection reverses which way the shape faces.'},
   lines:{parts:[['Parallel','Lines that stay the same distance apart.'],['Perpendicular','Lines that meet at a right angle.']],look:'Imagine extending the lines. Their relationship does not depend on which way the page is turned.'}
  };return guides[t.mode]??null;
 }
 default:return null;
 }
}
