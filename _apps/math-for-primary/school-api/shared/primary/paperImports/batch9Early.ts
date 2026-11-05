import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {gridDrawingValue,type GridDrawingSpec,type GridSegment} from '../gridDrawingModel';
import type {Batch9EarlyPicture,Batch9EarlyModel,Batch9Point} from './batch9EarlyPicture';
import {BATCH9_EARLY_PARTS} from './batch9EarlyMeta';
export {BATCH9_EARLY_PARTS,type Batch9EarlyPart} from './batch9EarlyMeta';
type Step=[string,string?];
const clock=(t:number)=>`${Math.floor(t/60)%12||12}:${String(t%60).padStart(2,'0')} ${t>=720?'pm':'am'}`;
export function makeBatch9Early(part:string,seed:number,index=0):Question{
 if(!BATCH9_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown batch9 early pattern ${part}`);
 const r=new Rng(hashString(`batch9-early-original-v1:${part}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:Step[],extra:Partial<Question>={}):Question=>({key:`batch9-early-${part}:${seed}:${index}`,prompt,answer:String(answer),context,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra});
 const picture=(p:Batch9EarlyModel):Batch9EarlyPicture=>({type:'batch9-early',...p});
 if(part==='draw-length'){
  const length=r.int(3,7),edges:GridSegment[]=[[[0,0],[length,0]]],spec:GridDrawingSpec={kind:'segment-length',columns:10,rows:1,unit:'cm'};
  const q=make(`Draw one horizontal line ${length} cm long.`,gridDrawingValue(edges),['Each horizontal grid gap represents 1 cm.'],
   'Count the spaces between grid points, then join the two endpoints.',[['Choose a starting point and count the grid spaces.',`${length} spaces = ${length} cm`],['Draw one straight line between the start and finish points.']],{gridDrawing:spec});
  q.workedSteps!.at(-1)!.picture={type:'grid-drawing',columns:10,rows:1,segments:edges,caption:`One possible ${length} cm line`};return q;
 }
 if(part==='copy-grid'){
  const x=r.int(0,1),y=r.int(0,1),w=r.int(2,3),h=r.int(2,3),house=r.chance(.5);
  const points:Batch9Point[]=house?[[x,y+1],[x+1,y],[x+w,y+1],[x+w,y+h],[x,y+h]]:[[x,y],[x+w,y],[x+w,y+1],[x+1,y+1],[x+1,y+h],[x,y+h]];
  const edges:GridSegment[]=points.map((point,i)=>[point,points[(i+1)%points.length]]),spec:GridDrawingSpec={kind:'copy-grid',columns:5,rows:4,referenceSegments:edges};
  const q=make('Copy the whole figure onto the blank grid.',gridDrawingValue(edges),['Keep every line in the same position on the grid.'],
   'Count across and down to locate each endpoint. Join the matching endpoints.',[['Locate each corner by its grid position.'],['Copy every line, including sloping lines.'],['Check that the copied figure has the same position, size and shape.']],{gridDrawing:spec});
  q.workedSteps!.at(-1)!.picture={type:'grid-drawing',columns:5,rows:4,segments:edges,caption:'The complete copied figure'};return q;
 }
 if(part==='joined-shapes'){
  const cap=r.pick(['semicircle','triangle'] as const),model=picture({layout:'shape-parts',cap,width:r.int(75,95),height:r.int(105,125),rotation:r.pick([0,90,180,270])}),names=['rectangle','triangle','semicircle','circle'];
  return make('Which two shapes are joined in this figure?',JSON.stringify(['rectangle',cap]),['The thin line separates the two shapes.'],
   'Look at each side of the separating line.',[['One part has four straight sides and four square corners.','rectangle'],['Identify the shape on the other side of the line.',cap]],{picture:model,structuredResponse:{kind:'named-pair',options:r.shuffle(names)}});
 }
 if(part==='circle-pieces'){
  const radius=r.int(35,46),items=r.shuffle([{shape:'semicircle' as const,radius},{shape:'semicircle' as const,radius},{shape:'semicircle' as const,radius:radius-12},{shape:'quarter-circle' as const,radius}]),pieces=items.map((p,i)=>({...p,label:String.fromCharCode(65+i),rotation:r.pick([0,90,180,270])})),answer=pieces.filter(p=>p.shape==='semicircle'&&p.radius===radius).map(p=>p.label);
  return make('Which two pieces can join to make one circle?',JSON.stringify(answer),['You may turn the pieces. Do not stretch or overlap them.'],
   'A whole circle needs two matching half circles.',[['Find two semicircles of the same size.'],['Join their straight edges to make the complete circle.',answer.join(' and ')]],{picture:picture({layout:'circle-pieces',pieces}),structuredResponse:{kind:'named-pair',options:pieces.map(p=>p.label)}});
 }
 if(part==='schedule-hour'){
  const durations=r.shuffle([30,60,90]),start=r.int(8,9)*60,labels=r.shuffle(['Art','Games','Reading']),times=[start];for(const d of durations)times.push(times.at(-1)!+d);const at=durations.indexOf(60),answer=labels[at];
  return make('Which activity lasts exactly one hour?',answer,['Each activity ends when the next entry begins.',...labels.map((name,i)=>`${clock(times[i])}: ${name}`),`${clock(times[3])}: End`],
   'Compare each start time with the next time in the schedule.',[['Find an interval of 60 minutes.',`${clock(times[at])} to ${clock(times[at+1])} = 1 hour`],['Read the activity at the start of that interval.',answer]],{choices:labels});
 }
 if(part==='ruler-total'){
  const a=r.pick([4,5]),b=r.pick([2,4]),start=r.pick([3,5]),answer=a+b,objects=[{label:'Ribbon A',start:0,end:a},{label:'Ribbon B',start,end:start+b}];
  return make('What is the total length of the two ribbons?',answer,[],
   'Find each length from its own start and end, then add both lengths.',[['Read Ribbon A.',`${a} − 0 = ${a} cm`],['Measure Ribbon B from its nonzero start.',`${start+b} − ${start} = ${b} cm`],['Add the two lengths.',`${a} + ${b} = ${answer} cm`]],{picture:picture({layout:'ruler-total',maximum:10,objects}),unit:'cm'});
 }
 if(part==='combine-group'){
  const per=r.pick([2,3,4]),groups=r.int(3,Math.floor(20/per)),total=per*groups,a=r.int(2,total-2),b=total-a;
  return make('How many packets do they fill?',groups,[`Mei has ${a} beads and Ravi has ${b} beads. They combine all their beads and put ${per} beads in each packet.`],
   'Combine both collections before making equal-sized packets.',[['Find the total number of beads.',`${a} + ${b} = ${total}`],['Make packets using all the beads.',`${total} ÷ ${per} = ${groups}`]],{unit:'packets'});
 }
 if(part==='fill-baskets'){
  const baskets=r.pick([3,5]),per=r.pick([2,3,4]),target=baskets*per,missing=r.int(1,Math.min(7,target-2)),have=target-missing;
  return make('How many more balls are needed?',missing,[`There are ${baskets} baskets. Each basket must hold ${per} balls. There are ${have} balls ready.`],
   'Find how many balls would fill all the baskets, then compare with the balls ready.',[['Find the number needed for all the baskets.',`${baskets} × ${per} = ${target}`],['Find the shortage.',`${target} − ${have} = ${missing}`]],{unit:'balls'});
 }
 if(part==='mass-dial'||part==='identical-masses'){
  const paired=part==='identical-masses',reading=r.int(7,43)*20,answer=paired?reading/2:reading,model=picture({layout:'mass-dial',maximum:1000,minorStep:20,labelStep:100,reading});
  return make(paired?'What is the mass of one bar of soap?':'What mass does the scale show?',answer,paired?['The scale holds two identical bars of soap.']:['The dial measures mass in grams.'],
   paired?'Read the combined mass, then share it equally between the two identical bars.':'Find the value of a small mark before reading the pointer.',
   paired?[['Read the total mass on the dial.',`${reading} g`],['Find the mass of each identical bar.',`${reading} ÷ 2 = ${answer} g`]]:[['Read the scale intervals.','Each small interval represents 20 g.'],['Count to the pointer.',`${reading} g`]],{picture:model,unit:'g'});
 }
 if(part==='contents-mass'){
  const empty=r.int(120,340),contents=r.int(180,490),total=empty+contents;
  return make('What is the mass of the rice without the bowl?',contents,[`A bowl containing rice has a total mass of ${total} g. The empty bowl has a mass of ${empty} g.`],
   'The total includes both the bowl and the rice.',[['Separate the container from its contents.',`${total} − ${empty} = ${contents} g`],['Check by putting the two masses together.',`${empty} + ${contents} = ${total} g`]],{unit:'g'});
 }
 if(part==='nested-capacity'){
  const bottles=r.pick([3,4]),jars=r.pick([2,3]),tubs=r.pick([2,3]),perJar=bottles,perTub=bottles*jars,total=perTub*tubs;
  return make('How many litres does the full barrel hold?',total,[`Each bottle holds 1 litre. A jar holds ${bottles} bottles. A tub holds ${jars} jars. A barrel holds ${tubs} tubs.`],
   'Follow the chain one container size at a time.',[['Find the capacity of a jar.',`${bottles} × 1 = ${perJar} litres`],['Find the capacity of a tub.',`${jars} × ${perJar} = ${perTub} litres`],['Find the capacity of the barrel.',`${tubs} × ${perTub} = ${total} litres`]],{unit:'litres'});
 }
 if(part==='unequal-pieces'){
  const squares=2,shadedTriangles=r.pick([[true,false,false],[true,false,true],[false,true,true]]),shadedSquares=r.pick([[true,false],[false,true],[true,true]]),pieces:Extract<Batch9EarlyPicture,{layout:'area-fraction'}>['pieces']=[];
  pieces.push({label:'Triangle A',kind:'triangle',points:[[0,0],[0,2],[2,2]],shaded:shadedTriangles[0]},{label:'Triangle B',kind:'triangle',points:[[0,0],[2,0],[2,2]],shaded:shadedTriangles[1]});
  for(let i=0;i<squares;i++){const x=2+i*2;pieces.push({label:`Square ${i+1}`,kind:'square',points:[[x,0],[x+2,0],[x+2,2],[x,2]],shaded:shadedSquares[i]});}
  pieces.push({label:'Triangle C',kind:'triangle',points:[[6,0],[6,2],[8,2]],shaded:shadedTriangles[2]});
  const shaded=pieces.reduce((sum,p)=>sum+(p.shaded?(p.kind==='square'?2:1):0),0),total=2*squares+3;
  return make('What fraction of the whole figure is shaded?',`${shaded}/${total}`,['The triangles are equal in size. Each triangle has half the area of one square.'],
   'Imagine splitting each square into two equal triangles. Count equal areas, not differently sized pieces.',[['Express the whole figure in equal triangle-sized areas.',`${squares} × 2 + 3 = ${total}`],['Count the shaded areas in those same units.',`${shaded} out of ${total} = ${shaded}/${total}`]],{picture:picture({layout:'area-fraction',pieces})});
 }
 if(part==='slow-clock'){
  const shown=r.int(8,10)*60+r.int(0,59),error=r.pick([5,10,15,25]),correct=shown+error;
  return make('What is the correct time?',clock(correct),[`The clock is ${error} minutes slow. It is morning.`],
   'A slow clock is behind the correct time, so count forwards.',[['Read the time the clock shows.',clock(shown)],['Add the missing minutes.',`${clock(shown)} + ${error} minutes = ${clock(correct)}`]],{picture:{type:'clock',minutes:shown},choices:r.shuffle([clock(correct),clock(shown),clock(shown-error),clock(correct+5)])});
 }
 if(part==='price-from-change'){
  const count=r.int(2,5),price=r.int(3,9),paid=r.pick([50,80]),change=paid-count*price;
  return make('How much does one notebook cost?',price,[`Hana pays $${paid} for ${count} identical notebooks and receives $${change} change. Every notebook costs the same.`],
   'Find the amount spent before dividing by the number of notebooks.',[['Find the total spent.',`$${paid} − $${change} = $${paid-change}`],['Find one equal price.',`$${paid-change} ÷ ${count} = $${price}`]],{unit:'dollars'});
 }
 const total=r.pick([30,40,50,70,90,110]),claim=r.pick([10,20]),solutions:{ten:number;twenty:number;truth:boolean}[]=[];
 for(let twenty=1;twenty*20<total;twenty++){const ten=(total-twenty*20)/10;if(Number.isInteger(ten)&&ten>0)solutions.push({ten,twenty,truth:claim===10?ten>twenty:twenty>ten});}
 const truths=new Set(solutions.map(s=>s.truth)),answer=truths.size>1?'Not enough information':truths.has(true)?'True':'False',other=claim===10?20:10;
 return make(`Is this statement true: Asha has more ${claim}-cent coins than ${other}-cent coins?`,answer,[`Asha has ${total} cents, using only 10-cent and 20-cent coins. She has at least one coin of each kind.`],
  'Try every coin combination that makes the total. Check whether the statement always has the same result.',[['List the possible coin counts.',solutions.map(s=>`${s.ten} ten-cent and ${s.twenty} twenty-cent coins`).join('; ')],['Compare the counts in every possible combination.',truths.size>1?'The statement is true for some combinations and false for others.':`Every possible combination makes the statement ${answer.toLowerCase()}.`]],{choices:['True','False','Not enough information']});
}
