import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {anglePoint,type AnglePoint,type Batch8AnglesPicture,type AngleConstructionSpec} from './batch8AnglesPicture';
import {BATCH8_ANGLES_PARTS} from './batch8AnglesMeta';
export {BATCH8_ANGLES_PARTS} from './batch8AnglesMeta';
export type Batch8AnglesQuestion=Omit<Question,'picture'>&{picture:Batch8AnglesPicture;angleConstruction?:AngleConstructionSpec};
export function makeBatch8Angles(part:string,seed:number,index=0):Batch8AnglesQuestion{
 if(!BATCH8_ANGLES_PARTS.some(p=>p.id===part))throw Error(`Unknown angle task: ${part}`);
 const r=new Rng(hashString(`batch8-angles:${part}:${seed}:${index}`)),key=`batch8-angles:${part}:${seed}:${index}`;
 const make=(prompt:string,answer:string|number,picture:Batch8AnglesPicture,hint:string,steps:string[],extra:Partial<Batch8AnglesQuestion>={}):Batch8AnglesQuestion=>({key,prompt,answer:String(answer),picture,hint,workedSteps:steps.map(text=>({text})),explanation:steps.join(' '),...extra});
 const endpoint=(v:AnglePoint,degrees:number,label:string,radius=200):AnglePoint=>{const [x,y]=anglePoint(v.x,v.y,radius,degrees);return {x,y,label};};
 if(part==='notation'){
  const labels=r.shuffle(['J','K','L','M']),points=[[85,180],[240,80],[390,145],[335,275]].map(([x,y],i)=>({x,y,label:labels[i]})),at=r.int(0,3),prev=points[(at+3)%4].label,vertex=points[at].label,next=points[(at+1)%4].label,other=points[(at+2)%4].label,answer=`${prev}${vertex}${next}`;
  return make('Which notation names the marked angle?',answer,{type:'batch8-angles',layout:'notation',points,markedVertex:at},'Find the marked corner. Its letter must be in the middle.',[`The marked vertex is ${vertex}.`,`Its two arms pass through ${prev} and ${next}, so the angle is ∠${answer}.`],{choices:r.shuffle([answer,`${vertex}${prev}${next}`,`${prev}${next}${vertex}`,`${prev}${other}${next}`])});
 }
 if(part==='protractor-scales'||part==='measure-oblique'){
  const vertex={x:250,y:245,label:'B'},degrees=r.pick([35,45,55,65,75,105,115,125]),left=part==='protractor-scales'&&r.chance(.5),baseline=part==='measure-oblique'?r.pick([15,25,30]):left?180:0,end=left?180-degrees:baseline+degrees,mark:[number,number]=left?[end,180]:[baseline,end],rotation=part==='measure-oblique'?baseline:0;
  return make(part==='protractor-scales'?'What is the size of ∠ABC?':'Measure ∠ABC in the triangle.',degrees,{type:'batch8-angles',layout:'rays',vertex,ends:[endpoint(vertex,baseline,'A'),endpoint(vertex,end,'C')],mark,protractorRotation:rotation,closeShape:part==='measure-oblique'},'Use B as the centre. Start at zero on ray BA and follow that same scale to ray BC.',[`The vertex is B; ray BA is the starting arm.`,`Use the scale whose zero lies on BA. Ray BC meets ${degrees}°.`],{unit:'degrees'});
 }
 if(part==='join-target'||part==='right-angle-point'){
  const right=part==='right-angle-point',vertex={x:225,y:255,label:'A'},baseline=right?r.pick([-10,0,10]):r.pick([0,15]),sweeps=r.shuffle(right?[45,70,90,115]:[35,65,110,140]),target=right?90:r.pick(sweeps),dots=sweeps.map((angle,i)=>endpoint(vertex,baseline+angle,['K','L','M','N'][i],170)),answer=dots[sweeps.indexOf(target)].label;
  return make(right?'Which point should be joined to A to form a right angle with AB?':`Which point should be joined to A to make a ${target}° angle with AB?`,answer,{type:'batch8-angles',layout:'dots',vertex,base:endpoint(vertex,baseline,'B',205),dots,...(!right?{protractorRotation:baseline}:{})},right?'A right angle is a square corner. Find the point in a direction perpendicular to AB.':'Start at zero on AB and locate the required mark before choosing a point.',[right?'A right angle measures 90°.':`The required turn from AB is ${target}°.`,`The ray from A through ${answer} makes this angle with AB.`],{choices:r.shuffle(dots.map(p=>p.label))});
 }
 if(part==='square-corner'){
  const nearHorizontal=r.int(3,7)*5,nearVertical=r.int(2,6)*5,answer=90-nearHorizontal-nearVertical;
  return make('ABCD is a square. Find angle y.',answer,{type:'batch8-angles',layout:'square-corner',nearHorizontal,nearVertical},'The three marked angles together fill one right angle of the square.',[`Every corner of a square is 90°.`,`${nearHorizontal}° + y + ${nearVertical}° = 90°.`,`y = 90° − ${nearHorizontal}° − ${nearVertical}° = ${answer}°.`],{unit:'degrees'});
 }
 const baseline=r.pick([0,20,160,180]),direction:1|-1=baseline>90?-1:1,target=r.pick([35,45,55,65,75,105,115,125]),vertex={x:250,y:240,label:'D'},spec:AngleConstructionSpec={baseline,direction,vertexLabel:'D',baseLabel:'C',endLabel:'E'};
 const endAngle=baseline+direction*target,solution:Batch8AnglesPicture={type:'batch8-angles',layout:'rays',vertex,ends:[endpoint(vertex,baseline,'C',195),endpoint(vertex,endAngle,'E',195)],mark:direction===1?[baseline,endAngle]:[endAngle,baseline],markLabel:`${target}°`},steps=[`D is the vertex, and DC is the given starting ray.`,`Use the semicircle shown by the protractor. Locate ${target}° from DC and draw ray DE through that mark.`,'The completed angle has both arms and the new endpoint labelled.'];
 const q=make(`Draw and label ∠CDE = ${target}°.`,target,{type:'batch8-angles',layout:'rays',vertex,ends:[endpoint(vertex,baseline,'C',195)],mark:[baseline,baseline],protractorRotation:baseline>90?baseline-180:baseline},'Keep the centre at D and zero on DC. Draw ray DE through the required degree mark.',steps,{context:['Use the side of the baseline covered by the protractor. The moving ray must be labelled E.'],unit:'degrees',angleConstruction:spec});
 return {...q,workedSteps:q.workedSteps!.map((step,i)=>i===steps.length-1?{...step,picture:solution}:step)};
}
