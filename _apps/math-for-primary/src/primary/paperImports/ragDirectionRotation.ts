import {Rng,hashString} from '../../engine/random';
import type {Picture,Question} from '../generate';
import type {Batch11UpperMark,Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN={
 id:'p5-direction-and-rotation',
 level:5,
 title:'Directions and turns',
 objective:'Use clockwise and anticlockwise turns, including fractions of a full turn, to find angles, directions and clock positions.',
 skillIds:['P5.S.ANGLE.04'],
 canonicalPatternId:'p5-direction-and-rotation',
};

const PLACES=['Library','Park','Pool','Market','School','Cafe','Bank','Temple','Museum','Clinic','Stadium','Garden'];
const CHILDREN=['Mei','Ravi','Aisha','Ben','Chen','Devi'];
const FRACTIONS:[number,number][]=[[1,6],[1,4],[1,3],[1,2],[2,3],[3,4],[5,6]];

function at<T>(items:readonly T[],i:number):T{
 const value=items[i];
 if(value===undefined)throw new Error(`Missing item ${i}`);
 return value;
}
const round=(n:number)=>Number(n.toFixed(1));
const line=(x1:number,y1:number,x2:number,y2:number):Batch11UpperMark=>({kind:'line',x1,y1,x2,y2});
const text=(x:number,y:number,label:string):Batch11UpperMark=>({kind:'text',x,y,text:label});
const figure=(label:string,marks:Batch11UpperMark[])=>({type:'batch11-upper',label,marks} satisfies Batch11UpperPicture) as unknown as Picture;

function placeFigure(names:string[]):Picture{
 const marks:Batch11UpperMark[]=[];
 names.forEach((name,i)=>{
  const t=i*Math.PI/4,s=Math.sin(t),c=Math.cos(t);
  marks.push(line(round(160+s*28),round(100-c*18),round(160+s*88),round(100-c*56)));
  marks.push(text(round(160+s*115-name.length*3.2),round(100-c*72+4),name));
 });
 return figure(`Eight equally spaced places around a pupil, going clockwise from the top: ${names.join(', ')}.`,marks);
}

function clockFigure(n:number):Picture{
 const marks:Batch11UpperMark[]=[{kind:'circle',cx:160,cy:100,r:84,fill:'white'}];
 for(let k=1;k<=12;k++){
  const t=k*Math.PI/6,label=String(k);
  marks.push(text(round(160+Math.sin(t)*68-label.length*3.5),round(100-Math.cos(t)*68+5),label));
 }
 const t=n*Math.PI/6;
 marks.push(line(160,100,round(160+Math.sin(t)*52),round(100-Math.cos(t)*52)));
 return figure(`A clock face with the minute hand pointing to the ${n}.`,marks);
}

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`rag-direction-rotation:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=((Math.trunc(seed)+index)%3+3)%3;
 const child=r.pick(CHILDREN);

 if(variant===2){
  const n=r.int(1,12),[num,den]=r.pick(FRACTIONS),degrees=360*num/den,steps=degrees/30,answer=(n-1+steps)%12+1;
  return {
   key,
   context:[`The minute hand of a clock points to the ${n}.`,`It turns ${num}/${den} of a full turn clockwise.`],
   prompt:'Which number does the minute hand point to now?',
   answer:String(answer),
   hint:'A full turn is 360°. Two neighbouring clock numbers are 30° apart.',
   explanation:`${num}/${den} of 360° is ${degrees}°. That is ${steps} numbers clockwise from ${n}, which reaches ${answer}.`,
   picture:clockFigure(n),
   workedSteps:[
    {text:'Change the fraction of a turn into degrees.',equation:`360° × ${num}/${den} = ${degrees}°`},
    {text:'Each step from one clock number to the next is 30°.',equation:`${degrees} ÷ 30 = ${steps} numbers`},
    {text:`Count ${steps} numbers clockwise from ${n}, going back to 1 after 12.`,equation:`The hand points to ${answer}.`},
   ],
  };
 }

 const names=r.shuffle([...PLACES]).slice(0,8);
 const placesLine=`Going clockwise from the top, the places are: ${names.join(', ')}.`;
 const spacing='The places are equally spaced around the pupil.';

 if(variant===0){
  const from=r.int(0,7),steps=r.int(1,7),to=(from+steps)%8,degrees=steps*45;
  return {
   key,
   context:[placesLine,spacing,`${child} is facing the ${at(names,from)}.`,`${child} turns clockwise until facing the ${at(names,to)}.`],
   prompt:`Through what angle does ${child} turn?`,
   answer:String(degrees),
   unit:'degrees',
   hint:'Eight equal turns make 360°. Count the clockwise steps between the two places.',
   explanation:`Neighbouring places are 360° ÷ 8 = 45° apart. Going clockwise needs ${steps} steps: ${steps} × 45° = ${degrees}°.`,
   picture:placeFigure(names),
   workedSteps:[
    {text:'Find the angle between neighbouring places.',equation:'360° ÷ 8 = 45°'},
    {text:`Count the steps clockwise from the ${at(names,from)} to the ${at(names,to)}.`,equation:`${steps} steps`},
    {text:'Multiply the steps by 45°.',equation:`${steps} × 45° = ${degrees}°`},
   ],
  };
 }

 const final=r.int(0,7),steps=r.int(1,7),anti=r.chance(0.5),degrees=steps*45;
 const initial=anti?(final+steps)%8:(final-steps+8)%8;
 const direction=anti?'anticlockwise':'clockwise';
 return {
  key,
  context:[placesLine,spacing,`After turning ${degrees}° ${direction}, ${child} is facing the ${at(names,final)}.`],
  prompt:`Which place was ${child} facing before the turn?`,
  answer:at(names,initial),
  choices:[...names],
  hint:`Undo the turn: turn ${anti?'clockwise':'anticlockwise'} by the same angle from the place now being faced.`,
  explanation:`${degrees}° is ${steps} steps of 45°. Going back ${steps} steps ${anti?'clockwise':'anticlockwise'} from the ${at(names,final)} reaches the ${at(names,initial)}.`,
  picture:placeFigure(names),
  workedSteps:[
   {text:'Change the turn into steps of 45°.',equation:`${degrees}° ÷ 45° = ${steps} steps`},
   {text:`To undo a ${direction} turn, move the opposite way by ${steps} steps from the ${at(names,final)}.`},
   {text:`The starting place was the ${at(names,initial)}.`},
  ],
 };
}
