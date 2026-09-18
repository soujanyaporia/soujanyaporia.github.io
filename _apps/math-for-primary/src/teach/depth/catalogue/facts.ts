import type {Example} from '../../build/sequence';
import type {PlanEntry} from '../../build/plan';
import type {Tool} from '../../model';
/**
 * What a generated question is actually asking. The lesson families write their questions from
 * fixed sentence templates; recognising the template recovers the situation (a percentage of a
 * whole, a share in a ratio, a duration across an hour) rather than only the arithmetic operation.
 * Misconceptions and alternative methods depend on the situation, so both are keyed on these facts.
 */
export interface Facts {kind:string;v:Record<string,number>;s:Record<string,string>}
const F=(kind:string,v:Record<string,number>={},s:Record<string,string>={}):Facts=>({kind,v,s});
/** Numbers in a sentence. 12,345 reads as one number; $4.50 reads as 4.5. */
export const nums=(text:string)=>(text.replace(/(\d),(?=\d{3}\b)/g,'$1').match(/\d+(?:\.\d+)?/g)??[]).map(Number);
const N=(s:string)=>Number(s.replace(/,/g,''));
/** Minutes after midnight for “9:45 am”, “2:05 pm” or “14:05”. */
export function minutesOf(t:string):number|null{
 const m=t.match(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?/);if(!m)return null;
 let h=Number(m[1]);if(m[3]){if(h===12)h=0;if(m[3]==='pm')h+=12;}
 return h*60+Number(m[2]);
}
/** A fraction or mixed number written as “3/4” or “1 2/3”. */
export function fractionOf(t:string):{w:number;n:number;d:number}|null{
 const m=t.trim().match(/^(?:(\d+) )?(\d+)(?:\/(\d+))?$/);if(!m)return null;
 return m[3]?{w:Number(m[1]??0),n:Number(m[2]),d:Number(m[3])}:m[1]?null:{w:0,n:Number(m[2]),d:1};
}
/** Category values from a bar, picture or pie graph, or from a two-column table. */
export function graphData(t:Tool):{labels:string[];values:number[];scale:number}|null{
 if(t.kind==='diagram'){const pic=t.picture as unknown as {type:string;labels?:string[];values?:number[];scale?:number};
  if((pic.type==='bars'||pic.type==='pie')&&pic.labels&&pic.values)return {labels:pic.labels,values:pic.values,scale:pic.scale??1};}
 if(t.kind==='table'&&t.headers.length===2)return {labels:t.rows.map(r=>r[0]),values:t.rows.map(r=>Number(r[1])),scale:1};
 return null;
}
type Rule=[RegExp,(m:RegExpMatchArray,e:Example,p:PlanEntry)=>Facts|null];
const RULES:Rule[]=[
 // Whole numbers
 [/^What is the value in the (.+?) column of ([\d,]+)\?/,m=>F('place',{n:N(m[2])},{column:m[1]})],
 [/^Write “.+” in numerals\.$/,(_,e)=>F('numeral',{n:Number(e.answer)})],
 [/^Write ([\d,]+) in words\.$/,m=>F('words',{n:N(m[1])})],
 [/^Which word describes position (\d+) from the front\?/,m=>F('ordinal',{pos:+m[1]})],
 [/^Is (\d+) odd or even\?/,m=>F('odd-even',{n:+m[1]})],
 [/^Round ([\d.]+) to the nearest (\d+)\./,m=>F('round',{x:+m[1],unit:+m[2]})],
 [/^Round ([\d.]+) to (\d) decimal places\./,m=>F('dec-round',{x:+m[1],places:+m[2]})],
 [/^Calculate (\d+) ÷ (\d+), rounded to (\d) decimal places\./,m=>F('dec-quotient',{a:+m[1],b:+m[2],places:+m[3]})],
 [/^Put (.+) in increasing order\./,m=>F('order',{},{list:m[1]})],
 [/^Continue the sequence: (.+), …/,m=>{const vals=m[1].split(', ').map(Number);return F('pattern',{first:vals[0],last:vals.at(-1)!,step:vals[1]-vals[0],count:vals.length});}],
 [/^Choose the correct relation: ([\d,]+) □ ([\d,]+)\./,m=>F('compare',{left:N(m[1]),right:N(m[2])})],
 // Factors and multiples
 [/^What is the smallest positive common multiple of (\d+) and (\d+)\?/,m=>F('lcm',{a:+m[1],b:+m[2]})],
 [/^What is the (\d+)(?:st|nd|rd|th) positive multiple of (\d+)\?/,m=>F('nth-multiple',{count:+m[1],a:+m[2]})],
 [/^Find the greatest common factor of (\d+) and (\d+)\./,m=>F('gcf',{x:+m[1],y:+m[2]})],
 [/^Which number is a factor of (\d+)\?/,m=>F('factor-choice',{n:+m[1]})],
 // Operations
 [/^Work out (\d+) \+ (\d+) × (\d+)\./,m=>F('order-ops',{a:+m[1],b:+m[2],c:+m[3]})],
 [/^What is the remainder in (\d+) ÷ (\d+)\?/,m=>F('remainder',{total:+m[1],b:+m[2]})],
 [/^Add (\d+) \+ (\d+) \+ (\d+)\./,m=>F('add3',{a:+m[1],b:+m[2],c:+m[3]})],
 [/^The two parts are (\d+) and (\d+)\. What is the whole\?/,m=>F('bond-whole',{a:+m[1],b:+m[2]})],
 [/^The whole is (\d+)\. One part is (\d+)\. What is the other part\?/,m=>F('bond-part',{whole:+m[1],part:+m[2]})],
 [/^The whole is (\d+)\. Take away the part (\d+)\. What is left\?/,m=>F('bond-part',{whole:+m[1],part:+m[2]})],
 // Fractions
 [/^Write (\d+)\/(\d+) as a decimal\./,m=>F('frac-dec',{n:+m[1],d:+m[2]})],
 [/^Compare (\d+)\/(\d+) □ (\d+)\/(\d+)\./,m=>F('frac-compare',{n1:+m[1],d1:+m[2],n2:+m[3],d2:+m[4]})],
 [/^Complete the equivalent fraction: (\d+)\/(\d+) = (\d+)\/□\./,m=>F('frac-missing',{n:+m[1],d:+m[2],given:+m[3]},{missing:'bottom'})],
 [/^Complete the equivalent fraction: (\d+)\/(\d+) = □\/(\d+)\./,m=>F('frac-missing',{n:+m[1],d:+m[2],given:+m[3]},{missing:'top'})],
 [/^Write (\d+)\/(\d+) in simplest form\./,m=>F('frac-simplify',{a:+m[1],b:+m[2]})],
 [/^Rename (\d+)\/(\d+) as a fraction with denominator (\d+)\./,m=>F('frac-rename',{n:+m[1],d:+m[2],b:+m[3]})],
 [/^Write (\d+)\/(\d+) as a mixed number/,m=>F('to-mixed',{total:+m[1],d:+m[2]})],
 [/^Write (\d+) (\d+)\/(\d+) as an improper fraction\./,m=>F('to-improper',{w:+m[1],n:+m[2],d:+m[3]})],
 [/^Share (\d+) whole cakes equally among (\d+) children\./,m=>F('frac-share',{w:+m[1],d:+m[2]})],
 [/^Find (\d+)\/(\d+) of (\d+)\./,m=>F('frac-of',{a:+m[1],d:+m[2],whole:+m[3]})],
 [/^Find (.+) × (.+)\.$/,m=>F('frac-times',{},{left:m[1],right:m[2]})],
 [/^What fraction of this whole is shaded\?/,(_,e)=>{const f=fractionOf(e.answer);return f?F('frac-name',{n:f.n,d:f.d}):null;}],
 // Money
 [/^Count these (dollar notes|coins in cents): (.+)\./,m=>F('money-count',{pieces:m[2].split(' + ').length},{unit:m[1].startsWith('dollar')?'dollars':'cents'})],
 [/^Count \$(\d+) and coins of ([\d, ]+) cents\. Give the total in dollars\./,m=>F('money-count2',{dollars:+m[1],cents:m[2].split(',').reduce((s,x)=>s+Number(x),0)})],
 [/^Calculate \$([\d.]+) ([+−]) \$([\d.]+)\./,m=>F(m[2]==='+'?'money-add':'money-sub',{a:+m[1],b:+m[3]})],
 [/^Write \$([\d.]+) in cents\./,m=>F('to-cents',{dollars:+m[1]})],
 [/^Write (\d+) cents in dollars\./,m=>F('to-dollars',{cents:+m[1]})],
 [/^Compare \$([\d.]+) □ \$([\d.]+)\./,m=>F('compare',{left:+m[1],right:+m[2]})],
 // Rate
 [/^(\d+) notebooks cost \$(\d+)\. What is the price per notebook\?/,m=>F('rate-per',{count:+m[1],total:+m[2]})],
 [/^One notebook costs \$(\d+)\. What do (\d+) notebooks cost\?/,m=>F('rate-total',{rate:+m[1],count:+m[2]})],
 [/^Notebooks cost \$(\d+) each\. How many can you buy for \$(\d+)\?/,m=>F('rate-count',{rate:+m[1],total:+m[2]})],
 // Percentage
 [/^(\d+)% of a quantity is ([\d.]+)\. What is the whole quantity\?/,m=>F('pct-original',{pct:+m[1],part:+m[2]})],
 [/^A quantity changes from (\d+) to (\d+)\. What is the percentage (increase|decrease)\?/,m=>F('pct-change',{from:+m[1],to:+m[2]})],
 [/^An item costs \$(\d+) before a (\d+)% discount/,m=>F('discount',{base:+m[1],rate:+m[2]})],
 [/^A pre-tax price is \$(\d+)\. Using the (\d+)% GST/,m=>F('gst',{base:+m[1],rate:+m[2]})],
 [/^A principal of \$(\d+) earns (\d+)% simple interest/,m=>F('interest',{base:+m[1],rate:+m[2]})],
 [/^Write (\d+)% as a fraction in simplest form\./,m=>F('pct-fraction',{pct:+m[1]})],
 [/^(\d+) of 100 equal squares are shaded\./,m=>F('pct-read',{pct:+m[1]})],
 [/^Find (\d+)% of (\d+)\./,m=>F('pct-of',{pct:+m[1],whole:+m[2]})],
 // Ratio
 [/= ([\d:]+)\. What fraction of all counters is red\?/,m=>{const u=m[1].split(':').map(Number);return F('ratio-fraction',{first:u[0],second:u[1],sum:u.reduce((a,b)=>a+b,0)});}],
 [/^Complete (\d+):(\d+) = (\d+):□\./,m=>F('ratio-missing',{a:+m[1],b:+m[2],scaled:+m[3]})],
 [/^Simplify ([\d:]+)\.$/,m=>F('ratio-simplify',{},{terms:m[1]})],
 [/^Share (\d+) counters in the ratio ([\d:]+)\./,m=>{const u=m[2].split(':').map(Number);return F('ratio-share',{total:+m[1],first:u[0],terms:u.length,sum:u.reduce((a,b)=>a+b,0)});}],
 [/^For every (\d+) red counters/,()=>F('ratio-write')],
 // Algebra
 [/^Each packet has x stickers\. Write an expression for (\d+) packets and (\d+) loose stickers\./,m=>F('alg-expr',{a:+m[1],b:+m[2]})],
 [/^Simplify (\d+)x \+ (\d+)x\./,m=>F('alg-simplify',{a:+m[1],b:+m[2]})],
 [/^Find (\d+)x \+ (\d+) when x = (\d+)\./,m=>F('alg-sub',{a:+m[1],b:+m[2],x:+m[3]})],
 [/^Solve (\d+)x \+ (\d+) = (\d+)\./,m=>F('alg-solve',{a:+m[1],b:+m[2],c:+m[3]})],
 // Decimals
 [/^What is the value of the (tenths|hundredths|thousandths) digit in ([\d.]+)\?/,m=>F('dec-place',{places:['tenths','hundredths','thousandths'].indexOf(m[1])+1,x:+m[2]},{place:m[1],text:m[2]})],
 [/^Write ([\d.]+) as a fraction in simplest form\./,m=>F('dec-to-frac',{x:+m[1]},{text:m[1]})],
 // Time
 [/^Convert (\d+) min (\d+) s to seconds\./,m=>F('time-sec',{m:+m[1],s:+m[2]})],
 [/^Write (\d+):(\d+) (am|pm) in 24-hour time\./,m=>F('time-24',{h:+m[1],m:+m[2],pm:m[3]==='pm'?1:0})],
 [/^Read the clock\./,()=>F('clock')],
 [/starts at (.+?) and ends at (.+?)\. How many minutes does it last\?/,m=>{const a=minutesOf(m[1]),b=minutesOf(m[2]);return a===null||b===null?null:F('duration',{start:a,end:b},{start:m[1],end:m[2]});}],
 [/starts at (.+?) and lasts (\d+) minutes\. When does it end\?/,m=>F('end-time',{duration:+m[2]},{start:m[1]})],
 [/ends at (.+?) after (\d+) minutes\. When did it start\?/,m=>F('start-time',{duration:+m[2]},{end:m[1]})],
 [/^Write (\d+) minutes in hours and minutes\./,m=>F('min-to-hm',{total:+m[1]})],
 [/^How many minutes are (\d+) h (\d+) min\?/,m=>F('hm-to-min',{h:+m[1],m:+m[2]})],
 // Length, measures and conversions
 [/must be (\d+) cm long|^Read the length of the ribbon\./,(_,e)=>F('length',{n:Number(e.answer)})],
 [/^Choose a suitable unit for the (.+)\./,m=>F('unit-choice',{},{what:m[1]})],
 [/^One \w+ measures (\d+) (\S+) and another (\d+) \S+\. What is the difference\?/,m=>F('measure-diff',{a:+m[1],b:+m[3]},{unit:m[2]})],
 [/^Convert ([\d.]+) litres to cubic centimetres\./,m=>F('vol-conv',{litres:+m[1]})],
 [/^Convert (.+) to (.+)\.$/,m=>{const u=(s:string)=>s.match(/\b(km|m|cm|kg|g|litres|ml)\b/g)??[];const from=u(m[1]),to=u(m[2]);return from.length?F('conv',{},{from:from.join(' '),to:to.join(' '),text:m[1]}):null;}],
 // Area and perimeter
 [/^Which measurement is the height/,()=>F('height-choice')],
 [/^A house-shaped figure has a (\d+) cm by (\d+) cm rectangle and a triangular roof with base (\d+) cm and height (\d+) cm/,m=>F('area-house',{a:+m[1],b:+m[2],base:+m[3],h:+m[4]})],
 [/^Find the triangle area with base (\d+) cm and perpendicular height (\d+) cm/,m=>F('area-tri',{b:+m[1],h:+m[2]})],
 [/^A house outline has a bottom edge (\d+) cm, two vertical walls (\d+) cm each and two roof slopes (\d+) cm each/,m=>F('perim-house',{bottom:+m[1],wall:+m[2],slope:+m[3]})],
 [/^A square has area (\d+) cm²\. Find its side length\./,m=>F('square-side',{area:+m[1]})],
 [/^A rectangle has perimeter (\d+) cm and width (\d+) cm\. Find its length\./,m=>F('len-from-perim',{perim:+m[1],w:+m[2]})],
 [/^A rectangle has area (\d+) cm² and width (\d+) cm\. Find its length\./,m=>F('len-from-area',{area:+m[1],w:+m[2]})],
 [/^A (\d+) cm by (\d+) cm rectangle has a (\d+) cm square corner removed\. Find the (perimeter|area)/,m=>F(m[4]==='area'?'L-area':'L-perim',{a:+m[1],b:+m[2],c:+m[3]})],
 [/^Find the (perimeter|area) of the (\d+) cm by (\d+) cm rectangle\./,m=>F(m[1]==='area'?'rect-area':'rect-perim',{a:+m[2],b:+m[3]})],
 // Volume
 [/^A cube has volume (\d+) cm³\. Find its edge length\./,m=>F('cube-root',{v:+m[1]})],
 [/^A square face has area (\d+) cm²\. Find its edge length\./,m=>F('square-root',{area:+m[1]})],
 [/^A cuboid has volume (\d+) cm³ and height (\d+) cm\. Find its base area\./,m=>F('vol-base',{v:+m[1],h:+m[2]})],
 [/^A cuboid has volume (\d+) cm³ and a base (\d+) cm by (\d+) cm\. Find its height\./,m=>F('vol-height',{v:+m[1],a:+m[2],b:+m[3]})],
 [/^A solid contains (\d+) equal layers, with (\d+) unit cubes in each layer\./,m=>F('vol-layers',{layers:+m[1],each:+m[2]})],
 [/(?:tank has a|volume of a cuboid) (\d+) cm (?:by|base by)? ?(\d+) cm (?:base and water depth|by) (\d+) cm/,m=>F('vol-box',{a:+m[1],b:+m[2],c:+m[3]})],
 // Circles
 [/^A rectangle (\d+) cm wide and (\d+) cm high has a semicircle of diameter \d+ cm on top\. Find the (outer perimeter|total area)/,m=>F('circle-composite',{w:+m[1],h:+m[2],r:+m[1]/2,perimeter:m[3]==='outer perimeter'?1:0})],
 [/^Find the (perimeter|area) of (a circle|a semicircle|a quarter-circle) with radius (\d+) cm/,m=>F('circle',{r:+m[3],part:m[2]==='a circle'?1:m[2]==='a semicircle'?2:4,perimeter:m[1]==='perimeter'?1:0})],
 // Geometry
 [/^Which relationship do the marked lines show\?/,()=>F('lines')],
 [/^A point is (\d+) grid squares to the left of a vertical mirror line\./,m=>F('mirror',{d:+m[1]})],
 [/^How many lines of symmetry does this (.+) have\?/,m=>F('sym-count',{},{shape:m[1]})],
 [/^In the angle name ∠ABC/,()=>F('angle-notation')],
 [/^Compare the marked angle with a right angle\./,()=>F('right-angle')],
 [/^Two straight lines cross\. One angle is (\d+)°/,m=>F('angle-opposite',{k:+m[1]})],
 [/^Angles (\d+)° and x° form a straight angle/,m=>F('angle-straight',{k:+m[1]})],
 [/^Angles (\d+)° and x° make a full turn/,m=>F('angle-point',{k:+m[1]})],
 [/protractor mark should the second ray|^Read the marked angle using the protractor\./,(_,e)=>F('protractor',{deg:Number(e.answer)})],
 [/^Which solid can be formed by folding this net\?/,()=>F('net')],
 [/^Name the solid/,()=>F('solid-name')],
 [/^How many equal quarter-circle pieces make (a semicircle|a complete circle)\?/,m=>F('compose',{},{target:m[1]})],
 [/^How can you copy a figure/,()=>F('copy')],
 [/^Name the shape shown\./,()=>F('shape-name')],
 [/^Continue the repeating pattern:/,()=>F('shape-pattern')],
 [/^Which property must every (square|rectangle) have\?/,m=>F('rect-property',{},{shape:m[1]})],
 [/^A given line splits a square corner into (\d+)°/,m=>F('corner-split',{k:+m[1]})],
 [/^Which property describes a (rhombus|trapezium)\?/,m=>F('quad-property',{},{shape:m[1]})],
 [/^In a parallelogram, one angle is (\d+)°/,m=>F('para-angle',{k:+m[1]})],
 [/^An isosceles triangle has vertex angle (\d+)°/,m=>F('isosceles',{k:+m[1]})],
 [/^A triangle has angles (\d+)° and 60°/,m=>F('tri-third',{k:+m[1]})],
 // Data
 [/^The total is (\d+)\. Complete the missing value for (\w+)\./,m=>F('table-missing',{total:+m[1]},{label:m[2]})],
 [/^The whole chart represents (\d+) votes\. How many voted for (\w+)\?/,m=>F('pie-count',{total:+m[1]},{label:m[2]})],
 [/^Which category has the greatest number of votes\?|^What is the greatest vote count/,()=>F('graph-max')],
 [/^What is the difference between the votes for (\w+) and (\w+)\?/,m=>F('graph-diff',{},{x:m[1],y:m[2]})],
 [/^Read the value for (\w+)\./,m=>F('graph-read',{},{label:m[1]})],
 [/^What is the total across the four categories\?/,()=>F('graph-total')],
 [/^How much did the value change from Monday to Tuesday\?/,()=>F('graph-diff',{},{x:'Mon',y:'Tue'})],
 [/^What is the difference between the greatest and least counts\?/,()=>F('graph-range')],
];
/** Recover the situation behind a generated question. */
export function factsOf(p:PlanEntry,e:Example):Facts{
 const q=e.prompt;
 if(p.code==='FRAC'){
  const m=q.match(/^Calculate (.+) ([+−÷]) (.+)\.$/);
  if(m){const a=fractionOf(m[1]),b=fractionOf(m[3]);if(a&&b)return F(m[2]==='+'?'frac-add':m[2]==='−'?'frac-sub':'frac-div',{w1:a.w,n1:a.n,d1:a.d,w2:b.w,n2:b.n,d2:b.d});}
 }
 if(p.code==='DEC'&&e.evidence&&/^Calculate/.test(q)&&e.evidence.op!=='round')return F({'+':'dec-add','-':'dec-sub','*':'dec-mul','/':'dec-div'}[e.evidence.op],{a:e.evidence.a,b:e.evidence.b});
 if((p.code==='DEC'||p.code==='MONEY')&&/^Compare ([\d.]+) □ ([\d.]+)\./.test(q)){const [l,r]=nums(q);return F('compare',{left:l,right:r});}
 for(const [re,make] of RULES){const m=q.match(re);if(m){const f=make(m,e,p);if(f)return f;}}
 const f=e.evidence;
 if(f&&f.op!=='round'&&['AS','MD','WN','FACT'].includes(p.code))return F({'+':'add','-':'sub','*':'mul','/':'div'}[f.op],{a:f.a,b:f.b});
 return F('other');
}
