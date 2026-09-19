import type {RevealStep,Tool} from '../model';
/** Captions explain what a model represents; they are visible, not just screen-reader labels. */
export function modelCaption(t?:Tool):string|undefined{
 if(!t)return;
 switch(t.kind){
 case 'focus':return modelCaption(t.source);
 case 'diagram':return undefined; // The diagram component already shows its caption.
 case 'table':return `${t.caption.replace(/[.]+$/,'')}. Read each value with the heading above its column.`;
 case 'counters':return 'Each dot stands for one object. A full row holds five; two full rows make ten.';
 case 'bond':if(t.covered)return `Start with the whole ${t.whole}. Take away the ${t.covered==='a'?'left':'right'} part of ${t.parts[t.covered==='a'?0:1]}. The other part stays.`;return `The whole is ${t.hide==='whole'?'hidden':t.whole}. The two branches show the parts that belong to that whole.`;
 case 'fractions':return 'Each strip is one whole of the same size. Count all the equal parts, then count the shaded parts.';
 case 'hundred':return 'The whole grid has 100 equal squares. One full row is 10 hundredths, or one tenth.';
 case 'groups':return `${t.groups===1?'There is 1 group':`There are ${t.groups} groups`}, with ${t.size} objects in each group. Count a group before counting them all.`;
 case 'array':return `${t.rows} rows run across the picture; each row contains ${t.cols} objects.`;
 case 'share':return t.mode==='share'?'Each plate is one share. Counters outside the plates have not been shared yet.':'Each bag is one group. Counters outside the bags are left over.';
 case 'line':return 'Read from left to right. The starting dot tells us where to begin; an arrow shows a change.';
 case 'bar':return t.compare?'Both bars use the same scale. Compare their lengths and read the names beside them.':'The complete bar is the whole. Each labelled section is one part of it.';
 case 'ratio':return 'All the small boxes represent equally sized units, even when they belong to different rows.';
 case 'percent':return `The full bar represents ${t.unit??''}${t.whole}, which is 100%. The shaded share is ${t.percent}%.`;
 case 'balance':return 'Matching bags hold the same amount. A level balance means both sides have equal value.';
 case 'place':return 'Read the place heading before the digit. A counter in a different column has a different value.';
 case 'net-model':return `The flat shapes are the faces of a ${t.shape}. The joined edges are the folds.`;
 case 'geometry':return {angle:'The two rays meet at a vertex. The angle measures the opening between them.',clock:'The short hand shows the hour; the long hand shows the minutes.',rectangle:'Width counts squares across. Height counts rows upwards.',ruler:'The length is the distance from zero to the end, measured in equal spaces.',solid:'Count cubes across a layer, then count the layers. Some cubes are hidden.',mirror:'The dotted line is the fold. Matching points must be equally far from it.',lines:'Look at how the two lines meet, or whether the space between them stays constant.'}[t.mode];
 case 'foundation-visual':{
  if(t.visual.type!=='counters')return;
  const groups=t.visual.groups;
  if(groups.some(g=>g.ghost))return 'Solid counters show the known part. Dashed counters mark the part we still need to find.';
  const total=groups.reduce((n,g)=>n+g.count,0),removed=groups.reduce((n,g)=>n+(g.crossed??0),0);
  if(removed)return `The picture starts with ${total} counters. Crosses mark ${removed} taken away. Count only the counters without crosses to find what remains.`;
  if(groups.length>2&&groups.every(g=>g.count===groups[0].count))return `There are ${groups.length} equal groups, with ${groups[0].count} counters in each. Count one group, then count in equal steps to find the total.`;
  return groups.length>1?'Each counter stands for one object. The separate groups are parts; count all the groups to find the whole.':'Each counter stands for one object. Count each counter once to find how many there are.';
 }

 case 'scene':{
 const [a,b,c,d]=t.values;
 const notes:Record<string,string>={
 'triangle':`Base = ${a} units. Perpendicular height = ${b} units. The little square marks a right angle.`,
 'area':`Each little square is one square unit. There are ${a} squares across and ${b} rows.`,
 'fraction-product':`The whole rectangle has ${b} equal rows and ${d} equal columns. We are finding ${a}/${b} of ${c}/${d}.`,
 'fraction':'Both strips show equal wholes. Colour shows the amount; the dividing lines show the size of each part.',
 'circle':'The centre is the middle point. A radius joins it to the edge; a diameter passes through it.',
 'circle-area':'The blue and orange pieces all came from the same circle. Rearranging them does not add or remove area.',
 'regroup':'Blue and orange show the two starting amounts. A long block is ten ones joined together.',
 'average':'The three trays belong to three children. Moving counters between trays keeps the total the same.',
 'timeline':'The dots are times of day. Each curved arrow is a number of minutes passing.',
 'place':'The number at the top of each column is the value of one counter in that column.',
 'angles':'The straight line is the whole half-turn. The coloured arcs show its two parts.',
 'crossing':'Angles directly across the crossing are opposite angles. Angles side by side complete a straight turn.',
 'triangle-angles':'The labels belong to the inside corners. The question mark is the corner we still need to find.',
 'house':'The dashed line separates the rectangular wall from the triangular roof; it is inside the house.',
 'scale':`Each space between neighbouring marks is ${a} units. The pointer is ${b} spaces from zero.`,
 'ratio':'A small box represents one equal unit. Read the number inside to find the value of that unit.',
 'money':t.phase>=3?'These are model notes. Read the dollar value printed on each note.':'These are model coins. Read the cent value on each coin; counting coins alone will not give their value.'
 };
 return notes[t.scene];
 }
 }
}
function modelReason(t?:Tool):string|undefined{
 if(!t)return;
 if(t.kind==='focus')return 'Turning a figure changes where it points. It keeps its side lengths and corner angles, so it is still the same shape.';
 if(t.kind==='fractions')return 'The size of a fraction depends on both numbers: how many equal parts make the whole, and how many of those parts we take.';
 if(t.kind==='hundred')return 'One small square is one hundredth of the whole. Ten small squares make one tenth, so the same shaded amount can be described in more than one way.';
 if(t.kind==='share')return 'Equal sharing means every share has the same amount. Check both conditions: the shares match, and all the starting objects are accounted for.';
 if(t.kind==='ratio')return 'One unit must have the same value in every row. That lets us compare amounts by counting their units.';
 if(t.kind==='balance')return 'Equality is a relationship between both sides. Adding or removing the same amount on both sides keeps that relationship true.';
 if(t.kind==='scene'){
 const p=t.phase;
 return ({'fraction-product':p===0?'Start with the fraction after “of”. This shaded part is the amount we are taking a share of.':p===1?'Taking a fraction of an amount means sharing that amount into equal parts, then choosing some of them. Only the overlap belongs to both selections.':'The overlap counts the parts we kept. Count it against every equal part in the original whole, not just the originally shaded part.',
 'regroup':p<2?'Keep tens with tens and ones with ones so we add units of the same size.':'Exchanging ten ones for one ten changes the arrangement, but it keeps the total value the same.',
 'average':p<2?'We are redistributing the same total. Giving one counter away means another tray must receive that counter.':'The average describes the fair share of the original total. It need not be an amount anyone had at the start.',
 'circle-area':'Area counts all the surface inside the circle. Moving its pieces without gaps or overlaps keeps that surface unchanged.',
 'timeline':'Split a long wait into easier jumps. Add the durations of the jumps, not the clock readings at their ends.',
 'place':'A digit tells us how many units there are. Its position tells us what size those units are; that is why a zero can matter.',
 'angles':'The unknown angle must fill exactly the part of the straight turn that the known angle does not use.',
 'ratio':'Keep the number of units separate from the value of one unit. Multiplying them gives the amount in that row.'} as Record<string,string>)[t.scene];
 }
}
export function annotateSteps(frames:RevealStep[]):RevealStep[]{return frames.map(f=>({...f,caption:f.caption??modelCaption(f.tool),because:f.because??modelReason(f.tool)}));}
export function friendly(text:string):string{
 return text.replace('preserving the same elapsed time','without changing how much time has passed').replace('Time conversion and duration calculations use 60-based units','We count 60 minutes in one hour').replace('quantities','amounts').replace('quantity','amount').replace('Determine whether','Decide whether').replace('perpendicular distance','distance at a right angle').replace('Unit conversion changes how many equal units describe the same amount','Changing units changes the number we count, while the measured amount stays the same');
}
