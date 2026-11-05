import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH9_MIDDLE_PARTS} from './batch9MiddleMeta';
import type {Batch9MiddlePicture,GridCell} from './batch9MiddlePicture';
export {BATCH9_MIDDLE_PARTS} from './batch9MiddleMeta';
export type Batch9MiddleQuestion=Omit<Question,'picture'>&{picture?:Question['picture']|Batch9MiddlePicture};
const money=(cents:number)=>(cents/100).toFixed(2);
const fraction=(n:number,d:number)=>{let a=n,b=d;while(b){const t=a%b;a=b;b=t;}return `${n/a}/${d/a}`;};
export function makeBatch9Middle(part:string,seed:number,index=0):Batch9MiddleQuestion{
 if(!BATCH9_MIDDLE_PARTS.some(p=>p.id===part))throw Error(`Unknown middle reasoning task: ${part}`);
 const r=new Rng(hashString(`batch9-middle:${part}:${seed}:${index}`)),key=`batch9-middle:${part}:${seed}:${index}`;
 const make=(context:string[],prompt:string,answer:string|number,hint:string,equations:string[],extra:Partial<Batch9MiddleQuestion>={}):Batch9MiddleQuestion=>({key,context,prompt,answer:String(answer),hint,workedSteps:equations.map(text=>({text})),explanation:equations.join(' '),...extra});
 if(part==='wire-square'){
  const width=r.int(3,7),length=width+2*r.int(2,6),wire=2*(length+width),side=wire/4;
  return make([`A wire forms a rectangle ${length} cm long and ${width} cm wide. The same wire is straightened and bent into a square without cutting or overlapping.`],'What is the area of the square?',side*side,'The wire length stays the same. Find the new side before finding area.',[`Wire length = 2 × (${length} + ${width}) = ${wire} cm.`,`Square side = ${wire} ÷ 4 = ${side} cm.`,`Area = ${side} × ${side} = ${side*side} cm².`],{unit:'cm²'});
 }
 if(part==='change-notes'){
  const paidNotes=r.int(2,4),face=r.pick([20,50]),changeFace=r.pick([2,5]),notes=r.int(3,Math.min(9,Math.floor((paidNotes*face-1)/changeFace))),cost=paidNotes*face-notes*changeFace;
  return make([`Lina buys a bag for $${cost}. She pays with ${paidNotes} $${face} notes. All her change is returned in $${changeFace} notes.`],'How many notes does Lina receive as change?',notes,'Find the payment and change first, then divide by the value of one change note.',[`Paid: ${paidNotes} × $${face} = $${paidNotes*face}.`,`Change: $${paidNotes*face} − $${cost} = $${notes*changeFace}.`,`Number of notes: ${notes*changeFace} ÷ ${changeFace} = ${notes}.`],{unit:'notes'});
 }
 if(part==='balance-chain'){
  const left=r.pick([7,8,9,10]),right=r.int(1,3),ball=r.int(5,15)*5,known=(left-right)*ball,car=r.int(4,8),bear=r.int(2,4),answer=ball*car*bear,picture:Batch9MiddlePicture={type:'batch9-middle',layout:'balances',rows:[{left:[{kind:'ball',count:left}],right:[{kind:'weight',count:1,grams:known},{kind:'ball',count:right}]},{left:[{kind:'ball',count:car}],right:[{kind:'car',count:1}]},{left:[{kind:'bear',count:1}],right:[{kind:'car',count:bear}]}]};
  return make(['Every balance is level. All balls have the same mass, and all toy cars have the same mass.'],'What is the mass of the bear?',answer,'Cancel the matching balls first. Use one ball to find a car, then the bear.',[`${left} − ${right} = ${left-right} balls balance ${known} g.`,`One ball: ${known} ÷ ${left-right} = ${ball} g.`,`One car: ${car} × ${ball} = ${car*ball} g.`,`Bear: ${bear} × ${car*ball} = ${answer} g.`],{picture,unit:'g'});
 }
 if(part==='chain-total'){
  // Seven or nine total units keeps the final division within the P3 tables.
  const unit=r.int(18,65),first=2,second=r.int(2,3),total=unit*(1+first+first*second);
  return make([`Amir has ${first} times as many cards as Ben. Chloe has ${second} times as many cards as Amir. They have ${total} cards altogether.`],'How many cards does Amir have?',unit*first,'Use Ben as one unit. Build Chloe’s units through Amir before using the total.',[`Ben: 1 unit; Amir: ${first} units; Chloe: ${first} × ${second} = ${first*second} units.`,`Total units = 1 + ${first} + ${first*second} = ${1+first+first*second}.`,`One unit = ${total} ÷ ${1+first+first*second} = ${unit}.`,`Amir = ${first} × ${unit} = ${first*unit} cards.`],{unit:'cards'});
 }
 if(part==='graph-claims'){
  const a=r.int(3,8)*5,b=r.int(4,10)*5,c=r.int(3,7)*5,first=r.chance(.5),second=r.chance(.5),d=c*2+(first?0:5),e=a+b+(second?0:10),answer=`A: ${first?'True':'False'}; B: ${second?'True':'False'}`;
  return make(['The graph shows cups sold from Monday to Friday.','Statement A: Thursday’s sales are twice Wednesday’s sales.','Statement B: Monday’s and Tuesday’s sales together equal Friday’s sales.'],'Are statements A and B true or false?',answer,'Check each claim separately against the scale; do not decide from one bar alone.',[`A: Thursday ${d}; twice Wednesday = 2 × ${c} = ${2*c}. The claim is ${first?'true':'false'}.`,`B: Monday + Tuesday = ${a} + ${b} = ${a+b}; Friday ${e}. The claim is ${second?'true':'false'}.`],{picture:{type:'bars',labels:['Mon','Tue','Wed','Thu','Fri'],values:[a,b,c,d,e],scale:5},choices:r.shuffle(['A: True; B: True','A: True; B: False','A: False; B: True','A: False; B: False'])});
 }
 if(part==='equal-start-changes'){
  const lost=r.int(25,145),gained=r.int(45,220);
  return make([`Dion and Hana start with equal numbers of beads. Dion gives away ${lost} beads. Hana buys ${gained} more beads.`],'How many more beads does Hana have than Dion now?',lost+gained,'The unknown equal starting amounts cancel. Both changes widen the difference.',[`Initial difference = 0.`,`Dion’s loss increases Hana’s lead by ${lost}; Hana’s purchase adds ${gained}.`,`Final difference = ${lost} + ${gained} = ${lost+gained} beads.`],{unit:'beads'});
 }
 if(part==='unknown-purchase'){
  const paid=r.pick([5000,10000]),known=r.int(125,1750),unknown=r.int(650,2100),change=paid-known-unknown;
  return make([`Noor pays $${money(paid)} for a scarf and a cap. She receives $${money(change)} change. The scarf costs $${money(known)}.`],'How much does the cap cost?',money(unknown),'Subtract the change to recover the total spent, then remove the known item’s price.',[`Spent: $${money(paid)} − $${money(change)} = $${money(known+unknown)}.`,`Cap: $${money(known+unknown)} − $${money(known)} = $${money(unknown)}.`],{unit:'dollars'});
 }
 if(part==='two-rectangles'){
  const width=r.int(3,8),times=r.int(2,4),length=width*times;
  return make([`Two identical rectangles are placed edge to edge without overlapping. Each is ${width} cm wide. Each rectangle’s length is ${times} times its width.`],'What is the total area of both rectangles?',2*length*width,'Recover the length of one rectangle before finding both areas.',[`Length = ${times} × ${width} = ${length} cm.`,`One area = ${length} × ${width} = ${length*width} cm².`,`Both rectangles = 2 × ${length*width} = ${2*length*width} cm².`],{unit:'cm²'});
 }
 if(part==='symmetry-choice'){
  const symmetric:GridCell[]=[[0,0],[1,0],[2,0],[1,1],[1,2]],others:GridCell[][]=[[[0,0],[0,1],[0,2],[0,3],[1,3]],[[0,0],[1,0],[0,1],[1,1],[0,2]],[[0,0],[0,1],[1,1],[1,2],[1,3]]],shapes=r.shuffle([symmetric,...others]),correct=shapes.indexOf(symmetric),transform=(cells:GridCell[])=>{const turns=r.int(0,3),flip=r.chance(.5),points=cells.map(([x0,y0])=>{let x=flip?-x0:x0,y=y0;for(let n=0;n<turns;n++){const old=x;x=-y;y=old;}return [x,y] as GridCell;}),minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));return points.map(([x,y])=>[x-minX,y-minY] as GridCell);},options=shapes.map((cells,i)=>({label:['A','B','C','D'][i],cells:transform(cells)}));
  return make(['Only the shaded squares form each shape. The surrounding grid is a measuring guide.'],'Which shaded shape has a line of symmetry?',options[correct].label,'Imagine folding each shaded shape so that the two halves match exactly.',[`Shape ${options[correct].label} has matching shaded squares on either side of its mirror line.`,`The other shapes have an unmatched arm or square, so their halves do not coincide.`],{picture:{type:'batch9-middle',layout:'symmetry-options',options},choices:r.shuffle(options.map(o=>o.label))});
 }
 if(part==='cube-opposite'){
  const positions:GridCell[]=[[0,0],[1,0],[1,1],[2,1],[3,1],[3,2]],labels=r.shuffle(['U','V','W','X','Y','Z']),turns=r.int(0,3),faces=positions.map(([x0,y0],i)=>{let x=x0,y=y0;for(let n=0;n<turns;n++){const old=x;x=-y;y=old;}return {x,y,label:labels[i]};}),bottom=r.int(0,5),opposite=[3,5,4,0,2,1][bottom],answer=labels[opposite];
  return make([`The net is folded into a cube. Face ${labels[bottom]} rests on the table.`],'Which face is on top?',answer,'Fold the net mentally; the top face is opposite the face resting on the table.',[`Track the faces as their shared edges fold through right angles.`,`Face ${answer} folds opposite face ${labels[bottom]}, so ${answer} is on top.`],{picture:{type:'batch9-middle',layout:'cube-net',faces},choices:r.shuffle([answer,...r.shuffle(labels.filter(v=>v!==answer&&v!==labels[bottom])).slice(0,3)])});
 }
 if(part==='overlap-area'){
  const short=r.int(4,8)*2,long=short+r.int(2,5)*2;
  return make([`Two identical ${long} cm by ${short} cm rectangles cross at right angles and have the same centre. Their sides remain horizontal or vertical.`],'What is the area where the rectangles overlap?',short*short,'Find the width and height of the shared central region.',[`Each rectangle supplies a ${short} cm side of the overlap.`,`Overlap is a ${short} cm square: ${short} × ${short} = ${short*short} cm².`],{picture:{type:'batch9-middle',layout:'crossed-rectangles',long,short},unit:'cm²'});
 }
 if(part==='square-completion'){
  const height=r.int(3,6),extra=r.chance(.5),turns=r.int(0,3),cells:GridCell[]=[[1,0],...Array.from({length:height-1},(_,i)=>[0,i+1] as GridCell),...(extra?[[1,height-1] as GridCell]:[])].map(([a,b])=>{let x=a,y=b;for(let i=0;i<turns;i++){const old=x;x=-y;y=old;}return [x,y] as GridCell;}),count=cells.length,needed=height*height-count;
  return make(['All small squares are identical. Keep every existing square fixed. New squares must align with them and must not overlap.'],'What is the least number of squares to add to form one solid larger square?',needed,'Count the greatest span first. The completed square must be at least that many small squares wide and high.',[`The arrangement spans ${height} unit lengths in its longer direction.`,`The smallest possible larger square has ${height} × ${height} = ${height*height} spaces.`,`There are ${count} squares already, so add ${height*height} − ${count} = ${needed}.`],{picture:{type:'batch9-middle',layout:'unit-squares',cells},unit:'squares'});
 }
 if(part==='reverse-cut'){
  const side=r.int(3,8),length=r.int(18,40),removedArea=side*side,remainingArea=length*side*2-removedArea;
  return make(['WXCY is the square cut from rectangle ABCD. BX = XC. The diagram is not drawn to scale.'],'What is the length of AB?',length,'Recover the square side, restore its area, then divide the original area by the rectangle’s height.',[`The removed square has area ${removedArea} cm², so its side is ${side} cm.`,`BC = BX + XC = ${side} + ${side} = ${2*side} cm.`,`Original area = ${remainingArea} + ${removedArea} = ${length*side*2} cm².`,`AB = ${length*side*2} ÷ ${2*side} = ${length} cm.`],{picture:{type:'batch9-middle',layout:'cut-rectangle',removedArea,remainingArea},unit:'cm'});
 }
 if(part==='notch-perimeter'){
  const width=r.int(20,30),height=r.int(8,12),depth=r.int(2,4),rightFoot=r.int(3,5),perimeter=2*(width+height)+2*depth;
  return make(['Every corner is a right angle. The inward notch is a square.'],'What is the perimeter of the figure?',perimeter,'The notch replaces a horizontal segment of equal width but adds two vertical sides.',[`Outer rectangle: 2 × (${width} + ${height}) = ${2*(width+height)} cm.`,`The notch adds two depths: 2 × ${depth} = ${2*depth} cm.`,`Perimeter = ${2*(width+height)} + ${2*depth} = ${perimeter} cm.`],{picture:{type:'batch9-middle',layout:'notch',width,height,depth,rightFoot},unit:'cm'});
 }
 if(part==='vehicle-capacity'){
  const small=r.int(4,6),large=small+r.int(3,5),cars=r.int(4,10),vans=r.int(3,8),total=cars+vans,seats=cars*small+vans*large;
  return make([`There are ${total} cars and vans altogether. A car holds ${small} passengers and a van holds ${large}. Together they hold ${seats} passengers when full.`],'How many cars are there?',cars,'Assume every vehicle is a van. The missing seats reveal how many vans must be replaced by cars.',[`If all were vans: ${total} × ${large} = ${total*large} seats.`,`Excess seats = ${total*large} − ${seats} = ${cars*(large-small)}.`,`Each replacement removes ${large} − ${small} = ${large-small} seats.`,`Cars = ${cars*(large-small)} ÷ ${large-small} = ${cars}.`],{unit:'cars'});
 }
 const red=r.int(4,6),green=red+r.int(1,2),blue=green+r.int(1,2),mode=r.int(0,2),answer=mode===0?'True':mode===1?'False':'Cannot tell',claim=mode===0?'The blue ribbon remains longer than the red ribbon.':mode===1?'The blue ribbon becomes shorter than the red ribbon.':'The green ribbon remaining is twice as long as the red ribbon remaining.';
 return make([`Leena has ${fraction(blue,12)} m of blue ribbon, ${fraction(red,12)} m of red ribbon and ${fraction(green,12)} m of green ribbon.`,`She cuts the same unknown positive length from every ribbon, leaving some of each.`,claim],'Is the statement true, false, or impossible to tell?',answer,'Equal cuts preserve a difference, but may change a multiple. Check whether the statement holds for every allowed cut.',mode<2?[`Blue starts longer than red because ${fraction(blue,12)} > ${fraction(red,12)}.`,`Subtracting the same length preserves their difference, so blue stays longer. The statement is ${answer.toLowerCase()}.`]:[`A cut of ${fraction(2*red-green,12)} m makes green exactly twice red.`,`A cut of ${fraction(2*red-green,24)} m also leaves every ribbon positive, but green is not twice red.`,`Both cuts fit the givens, so the actual result cannot be determined.`],{choices:r.shuffle(['True','False','Cannot tell'])});
}
