import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {gridDrawingValue,reflectedSegments,type GridPoint,type GridSegment,type GridAxis} from '../gridDrawingModel';
import {BATCH10_MIDDLE_PARTS} from './batch10MiddleMeta';
import type {Batch10MiddlePicture,B10Point} from './batch10MiddlePicture';
export {BATCH10_MIDDLE_PARTS} from './batch10MiddleMeta';
export type Batch10MiddleQuestion=Omit<Question,'picture'>&{picture?:Question['picture']|Batch10MiddlePicture};
const directions=['North','North-east','East','South-east','South','South-west','West','North-west'];
const mod=(n:number)=>((n%8)+8)%8;
const clockwise=(p:GridPoint):GridPoint=>[6-p[1],p[0]];
function acuteCount(points:B10Point[]){
 const area=points.reduce((s,[x,y],i)=>{const n=points[(i+1)%points.length];return s+x*n[1]-y*n[0];},0),sign=Math.sign(area);let count=0;
 for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],v=points[i],b=points[(i+1)%points.length],u=[a[0]-v[0],a[1]-v[1]],w=[b[0]-v[0],b[1]-v[1]],turn=(v[0]-a[0])*(b[1]-v[1])-(v[1]-a[1])*(b[0]-v[0]);if(turn*sign>0&&u[0]*w[0]+u[1]*w[1]>1e-8)count++;}
 return count;
}
export function makeBatch10Middle(part:string,seed:number,index=0):Batch10MiddleQuestion{
 if(!BATCH10_MIDDLE_PARTS.some(p=>p.id===part))throw Error(`Unknown batch10 middle task: ${part}`);
 const r=new Rng(hashString(`batch10-middle:${part}:${seed}:${index}`)),key=`batch10-middle:${part}:${seed}:${index}`;
 const make=(context:string[],prompt:string,answer:string|number,hint:string,steps:string[],extra:Partial<Batch10MiddleQuestion>={}):Batch10MiddleQuestion=>({key,context,prompt,answer:String(answer),hint,workedSteps:steps.map(text=>({text})),explanation:steps.join(' '),...extra});
 if(part==='draw-parallel'||part==='draw-perpendicular'){
  const templates:{given:GridSegment;point:GridPoint;parallel:GridSegment;perpendicular:GridSegment}[]=[{given:[[1,1],[5,3]],point:[2,4],parallel:[[0,3],[6,6]],perpendicular:[[1,6],[4,0]]},{given:[[1,1],[5,1]],point:[3,4],parallel:[[0,4],[6,4]],perpendicular:[[3,0],[3,6]]},{given:[[1,1],[5,5]],point:[2,4],parallel:[[0,2],[4,6]],perpendicular:[[0,6],[6,0]]}],base=r.pick(templates),turns=r.int(0,3),transform=(p:GridPoint)=>{let q=p;for(let i=0;i<turns;i++)q=clockwise(q);return q;},map=(s:GridSegment)=>s.map(transform) as GridSegment,relation=part==='draw-parallel'?'parallel':'perpendicular',given=map(base.given),point=transform(base.point),solution=[map(base[relation])],answer=gridDrawingValue(solution),steps=[`The dark line is the reference. The new line must pass through P.`,relation==='parallel'?'Keep the same grid direction as the reference, so the lines never meet.':'Use a direction making a square corner with the reference when the lines meet.',`The blue worked drawing is one valid answer. Other lengths through P are also accepted.`];
  const q=make([],`Draw a line through P that is ${relation} to the dark line.`,answer,'Count the horizontal and vertical grid steps. Keep the same direction for parallel lines, or turn it through a right angle for perpendicular lines.',steps,{gridDrawing:{kind:'line-relation',columns:6,rows:6,givenSegment:given,throughPoint:point,relation}});
  return {...q,workedSteps:q.workedSteps!.map((s,i)=>i===steps.length-1?{...s,picture:{type:'grid-drawing',columns:6,rows:6,givenSegments:[given],throughPoint:point,segments:solution}}:s)};
 }
 if(part==='acute-count'){
  const tip=r.pick([6,7,9]),tail=r.pick([.5,1,1.5]),turns=r.int(0,3),original:B10Point[]=[[0,2],[4,2],[4,0],[tip,3],[4,6],[4,4],[0,4],[tail,3]],points=original.map(([a,b])=>{let x=a,y=b;for(let i=0;i<turns;i++){const old=x;x=-y;y=old;}return [x,y] as B10Point;}),answer=acuteCount(points);
  return make([],'How many acute angles are inside the figure?',answer,'Visit every corner once. Count only inside corners smaller than a square corner; inward bends are not acute.',[`An acute angle is smaller than a right angle.`,`Check the inside of each boundary corner, including both pointed ends.`,`There are ${answer} acute inside corners.`],{picture:{type:'batch10-middle',layout:'concave-polygon',points}});
 }
 if(part==='dial-difference'){
  const a=r.pick([310,330,350,370,390,410,430]),b=r.pick([120,140,160,180,220,240,260]),dials=[{label:'Can A',model:{type:'batch9-early' as const,layout:'mass-dial' as const,maximum:500,minorStep:10,labelStep:100,reading:a}},{label:'Can B',model:{type:'batch9-early' as const,layout:'mass-dial' as const,maximum:500,minorStep:10,labelStep:100,reading:b}}];
  return make(['The two dials show the masses of Can A and Can B.'],'How much heavier is Can A than Can B?',a-b,'Read both pointers using the small divisions, then subtract the lighter mass.',[`Can A reads ${a} g. Can B reads ${b} g.`,`Difference = ${a} − ${b} = ${a-b} g.`],{picture:{type:'batch10-middle',layout:'mass-pair',dials},unit:'g'});
 }
 if(part==='double-jar-mass'){
  const reading=r.pick([1150,1250,1350,1450,1650,1750]),total=reading*2,kg=Math.floor(total/1000),g=total%1000;
  return make(['The dial shows the mass of one jar. The second jar has exactly the same mass.'],'What is the combined mass in kilograms and grams?',JSON.stringify([String(kg),String(g)]),'Read the mass of one jar in grams. Double it before separating kilograms and remaining grams.',[`One jar: ${reading} g. Two jars: 2 × ${reading} = ${total} g.`,`${total} g = ${kg} kg ${g} g.`],{picture:{type:'batch9-early',layout:'mass-dial',maximum:4000,minorStep:50,labelStep:1000,reading},structuredResponse:{kind:'number-pair',firstLabel:'Kilograms',secondLabel:'Grams'}});
 }
 if(part==='elapsed-seconds'){
  const hour=r.int(7,17),minute=r.int(0,57),second=r.int(45,58),duration=r.int(25,80),start=hour*3600+minute*60+second,end=start+duration,time=(s:number)=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`,first=60-second,rest=duration-first;
  return make([`Faye starts crossing a bridge at ${time(start)} and reaches the other side at ${time(end)}. The displays show hours, minutes and seconds.`],'How many seconds does the crossing take?',duration,'Count to the next minute first, then add any whole minutes and seconds remaining.',[`To the next minute: 60 − ${second} = ${first} seconds.`,`After that: ${Math.floor(rest/60)} whole minute(s) and ${rest%60} seconds.`,`Elapsed time = ${first} + ${Math.floor(rest/60)} × 60 + ${rest%60} = ${duration} seconds.`],{unit:'seconds'});
 }
 if(part==='jug-bottle-difference'){
  const multiple=r.int(2,5),unit=r.int(70,Math.min(180,Math.floor(999/(multiple+1)))),total=unit*(multiple+1),first=r.int(50,total-50),second=total-first;
  return make([`A cook makes ${first} ml of juice in the morning and ${second} ml later. All the juice exactly fills one jug and one bottle. The jug holds ${multiple} times as much as the bottle.`],'How much more juice is in the jug than the bottle?',unit*(multiple-1),'Combine the two amounts. Divide into the jug’s units and the bottle’s one unit, then compare.',[`Total juice = ${first} + ${second} = ${total} ml.`,`Total units = ${multiple} + 1 = ${multiple+1}.`,`Bottle = ${total} ÷ ${multiple+1} = ${unit} ml.`,`Difference = (${multiple} − 1) × ${unit} = ${unit*(multiple-1)} ml.`],{unit:'ml'});
 }
 if(part==='reverse-freebie'){
  const bought=r.pick([4,5,6,8]),gifts=r.int(2,4),groups=r.int(2,8),received=gifts*groups;
  return make([`For every ${bought} boxes of pens bought, a shop gives ${gifts} free markers. Owen receives ${received} free markers from this offer and no other free markers.`],'What is the least number of boxes Owen bought?',bought*groups,'Use the number of free markers to count complete offer groups, then recover the minimum purchase.',[`Offer groups = ${received} ÷ ${gifts} = ${groups}.`,`Each complete group requires ${bought} bought boxes.`,`Least purchase = ${groups} × ${bought} = ${groups*bought} boxes.`],{unit:'boxes'});
 }
 if(part==='complete-reflection'){
  const points:GridPoint[]=[[1,4],[2,2],[3,3],[4,1],[5,1],[5,3],[7,4]],vertical=r.chance(.5),map=([x,y]:GridPoint):GridPoint=>vertical?[y,x]:[x,y],shift=r.int(0,1),m=(p:GridPoint):GridPoint=>{const [x,y]=map(p);return vertical?[x,y+shift]:[x+shift,y];},given:GridSegment[]=[...points.slice(1).map((p,i)=>[m(points[i]),m(p)] as GridSegment),[m([5,7]),m([5,5])],[m([4,7]),m([5,7])]],axis:GridAxis={orientation:vertical?'vertical':'horizontal',coordinate:4},solution=reflectedSegments(given,axis),answer=gridDrawingValue(solution),steps=['Match each endpoint with a point the same number of grid spaces on the other side of the dashed line.','Keep the dark segments already drawn. Add only the missing reflected lines.','The blue lines complete a mirror image of the given outline.'];
  const q=make([],'Complete the outline so the dashed line is a line of symmetry.',answer,'Reflect each corner across the mirror line, then join the matching corners.',steps,{gridDrawing:{kind:'complete-reflection',columns:8,rows:8,axis,givenSegments:given}});
  return {...q,workedSteps:q.workedSteps!.map((s,i)=>i===steps.length-1?{...s,picture:{type:'grid-drawing',columns:8,rows:8,segments:solution,givenSegments:given,axis}}:s)};
 }
 if(part==='complete-cube-net'){
  const flap=r.pick([1,2]),base:B10Point[]=[[0,0],[1,0],[2,0],[3,0],[flap,-1]],good:B10Point=[r.int(0,3),1],bad:B10Point[]=r.shuffle([...Array.from({length:4},(_,x)=>[x,-1] as B10Point).filter(([x])=>x!==flap),[-1,0] as B10Point,[4,0] as B10Point]).slice(0,3),points=r.shuffle([good,...bad]),at=points.indexOf(good),turns=r.int(0,3),map=([a,b]:B10Point):B10Point=>{let x=a,y=b;for(let i=0;i<turns;i++){const old=x;x=-y;y=old;}return [x,y];},candidates=points.map((cell,i)=>({label:['A','B','C','D'][i],cell:map(cell)}));
  return make(['The shaded squares stay fixed. Add exactly one dashed square to make a net that folds into a cube.'],'Which square should be added?',candidates[at].label,'A cube needs six faces that fold to six different sides without overlap.',[`Fold the four-square strip around the sides of the cube.`,`The existing flap supplies one remaining face.`,`Square ${candidates[at].label} supplies the other face; the wrong choices would overlap a face or extend the strip too far.`],{picture:{type:'batch10-middle',layout:'cube-completion',cells:base.map(map),candidates},choices:r.shuffle(candidates.map(c=>c.label))});
 }
 if(part==='compass-turns'){
  const original=r.int(0,7),first=r.int(1,7),second=r.int(1,7),after=mod(original+first),answer=directions[mod(original-second)];
  return make([`Two pupils start facing the same direction. After turning ${first*45}° clockwise, Iris faces ${directions[after].toLowerCase()}. Noah turns ${second*45}° anticlockwise from the original direction.`],'Which direction does Noah face?',answer,'Undo Iris’s turn to find the starting direction, then apply Noah’s turn from that start.',[`Each move between neighbouring compass directions is 45°.`,`Undo ${first} clockwise step(s): the original direction was ${directions[original]}.`,`Move ${second} step(s) anticlockwise from there to face ${answer}.`],{picture:{type:'batch10-middle',layout:'compass'},choices:r.shuffle([answer,...r.shuffle(directions.filter(d=>d!==answer)).slice(0,3)])});
 }
 if(part==='both-line-properties'){
  const figures:B10Point[][]=[[[0,2],[2,0],[4,2],[2,4]],[[0,3],[1,1],[3,1],[4,3]],[[0,0],[0,4],[4,4]],[[0,0],[2,2],[3,0]]],closed=[true,true,true,false],order=r.shuffle([0,1,2,3]),turns=r.int(0,3),map=([a,b]:B10Point):B10Point=>{let x=a,y=b;for(let i=0;i<turns;i++){const old=x;x=4-y;y=old;}return [x+.5,y+.5];},options=order.map((n,i)=>{const p=figures[n].map(map),segments=p.slice(1).map((v,j)=>[p[j],v] as [B10Point,B10Point]);if(closed[n])segments.push([p.at(-1)!,p[0]]);return {label:['A','B','C','D'][i],segments};}),answer=options[order.indexOf(0)].label;
  return make([],'Which figure has both parallel sides and perpendicular sides?',answer,'Check both conditions in the same figure. One parallel pair alone, or one right angle alone, is not enough.',[`The opposite sides of figure ${answer} run in the same direction.`,`Its neighbouring sides meet at right angles.`,`The other figures do not satisfy both conditions together.`],{picture:{type:'batch10-middle',layout:'line-options',options},choices:r.shuffle(options.map(o=>o.label))});
 }
 if(part==='three-shape-area'){
  const side=r.int(6,12),drop=r.int(3,6),height=side+drop,width=3*side,answer=2*side*height+side*side;
  return make(['ABIJ and EFGH are identical rectangles. CDHI is a square. AB = CD = EF. J, I, H and G lie on one straight line.'],'What is the total area of the figure?',answer,'Use the height and step to find the square side. The equal horizontal lengths then give both rectangle widths.',[`Square side CH = ${height} − ${drop} = ${side} cm.`,`AB = CD = EF = ${side} cm; check: 3 × ${side} = ${width} cm.`,`Two rectangles: 2 × ${side} × ${height} = ${2*side*height} cm².`,`Square: ${side} × ${side} = ${side*side} cm². Total = ${answer} cm².`],{picture:{type:'batch10-middle',layout:'three-shape-area',width,height,drop},unit:'cm²'});
 }
 if(part==='pie-sector-count'){
  let known=r.int(20,60)*2;if(known===80)known=82;const labels=r.shuffle(['Mango','Guava','Lychee','Banana']),answer=known*1.5;
  return make([`The pie chart shows pupils’ favourite fruits. ${known} pupils chose ${labels[0]}. Twice as many chose ${labels[2]} as ${labels[3]}. The small squares mark right angles.`],`How many pupils chose ${labels[1]}?`,answer,'Use the marked quarter sectors to find equal counts. Use the given multiple for the smaller sector, then subtract from the total.',[`${labels[0]} and ${labels[2]} are each a quarter, so each has ${known} pupils.`,`Whole survey: 4 × ${known} = ${known*4} pupils.`,`${labels[3]}: ${known} ÷ 2 = ${known/2} pupils.`,`${labels[1]}: ${known*4} − ${known} − ${known} − ${known/2} = ${answer} pupils.`],{picture:{type:'batch10-middle',layout:'pie-sectors',labels,knownCount:known,rotation:r.int(0,7)*45},unit:'pupils'});
 }
 if(part==='common-recipients'){
  const [a,b]=r.pick([[3,4],[4,6],[6,8],[4,5]]),common=Array.from({length:a*b},(_,i)=>i+1).find(n=>n%a===0&&n%b===0)!,groups=r.int(2,5),total=groups*common+r.int(1,common-1),ordinal=(n:number)=>`${n}${n===3?'rd':'th'}`;
  return make([`${total} pupils are in a queue. Every ${ordinal(a)} pupil receives a sticker, and every ${ordinal(b)} pupil receives a pencil. The pupils keep their original queue positions.`],'How many pupils receive both rewards?',groups,'List positions that are multiples of both intervals, stopping at the last pupil.',[`The first shared position is ${common}.`,`Shared positions: ${Array.from({length:groups},(_,i)=>(i+1)*common).join(', ')}.`,`The next shared position is ${(groups+1)*common}, beyond the queue. Therefore ${groups} pupils receive both.`],{unit:'pupils'});
 }
 const place=r.pick([100,1000]);let rounded=(place===100?r.int(120,800):r.int(12,80))*place;if(rounded===26100)rounded=26200;const greatest=rounded+place/2-1;
 return make([`The attendance at a fair rounds to ${rounded} when rounded to the nearest ${place}.`],'What is the greatest possible whole-number attendance?',greatest,'Find the halfway point to the next rounded value. The greatest valid integer is one below that midpoint.',[`The next rounded value is ${rounded+place}.`,`The halfway point is ${rounded} + ${place/2} = ${rounded+place/2}.`,`That midpoint rounds up, so the greatest attendance rounding to ${rounded} is ${rounded+place/2} − 1 = ${greatest}.`],{unit:'people'});
}
