import {Rng,hashString} from '../engine/random';
import type {Activity} from './catalog';
import type {Picture,Proof,Question} from './generate';
import type {PaperPicture} from './paperPicture';

type Step={text:string;equation?:string;picture?:Picture};
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const dollars=(cents:number)=>`$${(cents/100).toFixed(2)}`;
const clock=(minutes:number)=>`${Math.floor(minutes/60)%12||12}:${String(minutes%60).padStart(2,'0')} ${minutes>=720?'pm':'am'}`;
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards'],caption?:string):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items,caption});

/** Original problems informed by the structures in two user-provided P3 papers, never copied questions. */
export function makeP3PaperQuestion(activity:Activity,seed:number,index=0):Question{
 const r=new Rng(hashString(`${activity.id}:${seed}:${index}:paper-p3-v1`));
 const base={key:`${activity.id}:${seed}:${index}`};
 const make=(prompt:string,answer:number,unit:string,picture:Picture,hint:string,steps:Step[],proof:Proof,extra:Partial<Question>={}):Question=>({
  ...base,prompt,answer:unit==='dollars'?answer.toFixed(2):String(answer),unit,picture,hint,
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),workedSteps:steps,proof,...extra,
 });
 switch(activity.parameter){
  case 'p3-transfer':{
   const transfer=r.int(6,29),gap=2*transfer+r.int(12,55),answer=gap-2*transfer;
   const picture:PaperPicture={type:'paper',layout:'bars',heading:'1. Before sharing',unit:'badges',rows:[
    {label:'Lina',parts:[{size:2,label:'same amount',tone:'blue'},{size:1,label:`${gap} more`,tone:'orange'}]},
    {label:'Noor',parts:[{size:2,label:'same amount',tone:'green'}]},
   ],caption:'Bar lengths are not to scale.',transfer:{from:'Lina',to:'Noor',amount:transfer,unit:'badges',after:'How many more badges does Lina have than Noor?'}};
   const after=cards('Both collections change',[
    {label:'Lina gives away',value:String(transfer),icon:'child'},
    {label:'Noor receives',value:String(transfer),icon:'child'},
   ]);
   return make('How many more badges does Lina have than Noor after sharing?',answer,'badges',picture,
    'Lina loses badges while Noor gains the same number. Both changes close the gap.',[
     {text:'Start with the difference between the two collections.',equation:`Difference = ${gap} badges`,picture},
     {text:'The same transfer changes both collections.',equation:`${transfer} + ${transfer} = ${2*transfer}`,picture:after},
     {text:'Take both changes away from the original gap.',equation:`${gap} − ${2*transfer} = ${answer}`,picture:after},
     {text:`Lina now has ${answer} more badges. Undo both changes to check.`,equation:`${answer} + ${transfer} + ${transfer} = ${gap}`,picture},
    ],op('-',gap,op('*',2,transfer)),{context:[`Lina has ${gap} more badges than Noor.`,`Lina gives Noor ${transfer} badges.`]});
  }
  case 'p3-gaps':{
   const shown=r.int(6,8),knownEnd=r.int(3,5),gap=r.int(3,12),knownDistance=(knownEnd-1)*gap;
   const from=r.int(2,3),to=shown,answer=(to-from)*gap;
   const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Evenly spaced trail markers',
    points:Array.from({length:shown},(_,i)=>({label:String(i+1),icon:'number'})),
    gaps:Array(shown-1).fill('equal')};
   return make(`How far is marker ${from} from marker ${to}?`,answer,'m',picture,
    'Count the spaces between the markers. Two markers have just one space between them.',[
     {text:'Count the gaps in the distance we know.',equation:`${knownEnd} − 1 = ${knownEnd-1} gaps`,picture},
     {text:'Share the known distance equally among those gaps.',equation:`${knownDistance} ÷ ${knownEnd-1} = ${gap} m`,picture},
     {text:'Count the gaps between the two requested markers.',equation:`${to} − ${from} = ${to-from} gaps`,picture},
     {text:'Every requested gap has the same length.',equation:`${to-from} × ${gap} = ${answer} m`,picture},
    ],op('*',op('-',to,from),op('/',knownDistance,knownEnd-1)),{context:[`The distance from marker 1 to marker ${knownEnd} is ${knownDistance} m.`,`All gaps between neighbouring markers are equal.`]});
  }
  case 'p3-boxes':{
   const size=r.int(4,9),full=r.int(7,32),remainder=index%3===0?0:r.int(1,size-1),shortage=full*size+remainder;
   const stock=r.int(12,140),target=stock+shortage,answer=full+(remainder?1:0);
   const picture=cards('Pencils for the art fair',[
    {label:'Pencils needed',value:String(target),icon:'pencil'},
    {label:'Already packed',value:String(stock),icon:'bag'},
    {label:'In each new box',value:String(size),icon:'box'},
   ]);
   const grouping=cards('Fill the shortage',[
    {label:'Still needed',value:String(shortage),icon:'pencil'},
    {label:'Pencils per box',value:String(size),icon:'box'},
   ]);
   return make('What is the fewest new boxes we must buy?',answer,'boxes',picture,
    'Find how many pencils are missing. If complete boxes leave a shortage, buy one more.',[
     {text:'Subtract the pencils already packed.',equation:`${target} − ${stock} = ${shortage}`,picture},
     {text:'Find how many complete groups fit.',equation:`${shortage} ÷ ${size} = ${full}${remainder?` remainder ${remainder}`:''}`,picture:grouping},
     {text:remainder?'The remaining pencils need one more whole box.':'There is no remainder, so no extra box is needed.',equation:remainder?`${full} + 1 = ${answer} boxes`:`${full} boxes`,picture:grouping},
     {text:'Check: this many boxes are enough; one fewer is not.',equation:`${stock} + ${answer} × ${size} = ${stock+answer*size} ≥ ${target}`,picture},
    ],op('/',{op:'floor',a:shortage+size-1,b:size},size),{context:['We can buy whole boxes only. There must be enough pencils for everyone.']});
  }
  case 'p3-bundle':{
   const bundle=r.int(3,5),single=r.pick([150,200,250,300]),bundleCost=bundle*single-r.int(1,3)*50;
   const wanted=bundle*r.int(2,4)+(index%3===0?0:r.int(1,bundle-1));
   const bundles=Math.floor(wanted/bundle),loose=wanted%bundle,cents=bundles*bundleCost+loose*single;
   const picture=cards('Muffin stall',[
    {label:'One muffin',value:dollars(single),icon:'muffin'},
    {label:`Bundle of ${bundle}`,value:dollars(bundleCost),icon:'bag'},
    {label:'Buy exactly',value:`${wanted} muffins`,icon:'number'},
   ],'Choose singles, bundles, or both.');
   const selection=cards('Our basket',[
    {label:`Bundles of ${bundle}`,value:String(bundles),icon:'bag'},
    {label:'Single muffins',value:String(loose),icon:'muffin'},
   ]);
   return make('What is the lowest cost for exactly this many muffins?',cents/100,'dollars',picture,
    'Compare a bundle with the same number of singles. Then check how many muffins you need.',[
     {text:'A full bundle costs less than the same number of singles.',equation:`${bundle} × ${dollars(single)} = ${dollars(bundle*single)} > ${dollars(bundleCost)}`,picture},
     {text:bundles?'Use full bundles without buying more than requested.':'We need fewer than one bundle, so choose singles.',equation:`${wanted} = ${bundles} × ${bundle} + ${loose}`,picture:selection},
     {text:'Add the cost of the bundles and the remaining singles.',equation:`${bundles} × ${dollars(bundleCost)} + ${loose} × ${dollars(single)} = ${dollars(cents)}`,picture:selection},
     {text:'Check the basket has exactly the requested number.',equation:`${bundles*bundle} + ${loose} = ${wanted} muffins`,picture:selection},
    ],op('/',op('+',op('*',bundles,bundleCost),op('*',loose,single)),100));
  }
  case 'p3-timeline':{
   const arrival=r.int(8,15)*60+r.pick([5,15,25,35,45]),wait=r.pick([15,20,25,30,35]);
   const start=arrival+wait,duration=r.int(7,19)*10,end=start+duration;
   const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Discovery centre visit',
    points:[{label:`Arrive ${clock(arrival)}`,icon:'clock'},{label:'Activity starts ?',icon:'clock'},{label:`Finish ${clock(end)}`,icon:'clock'}],
    gaps:[`Wait ${wait} min`,'Activity ? min']};
   const started:PaperPicture={...picture,points:[picture.points[0],{label:`Start ${clock(start)}`,icon:'clock'},picture.points[2]]};
   const toHour=60-start%60,nextHour=start+toHour,after=end-nextHour;
   return make('How many minutes did the activity last?',duration,'minutes',picture,
    'The activity starts after the wait. Leave the waiting time out of its duration.',[
     {text:'Move from arrival through the waiting time.',equation:`${clock(arrival)} + ${wait} min = ${clock(start)}`,picture:started},
     {text:'Count from the start to the next whole hour.',equation:`${clock(start)} → ${clock(nextHour)} = ${toHour} min`,picture:started},
     {text:'Count from that hour to the finish.',equation:`${clock(nextHour)} → ${clock(end)} = ${after} min`,picture:started},
     {text:'Join the two activity intervals. Do not include the wait.',equation:`${toHour} + ${after} = ${duration} min`,picture:started},
    ],op('-',end,op('+',arrival,wait)));
  }
  case 'p3-chart':{
   const scale=r.pick([5,10,20]),labels=['Books','Puzzles','Balls','Kites'];
   const values=r.shuffle([r.int(2,3),r.int(4,5),r.int(6,7),r.int(8,9)]).map(n=>n*scale);
   const first=r.int(0,3),other=(first+r.int(1,3))%4,mode=index%3;
   const picture:Picture={type:'bars',labels,values,scale};
   if(mode===0)return make(`How many ${labels[first].toLowerCase()} were collected?`,values[first],'items',picture,
    'Find the named bar. Follow its top across to the scale.',[
     {text:`Find the ${labels[first].toLowerCase()} bar.`,picture},
     {text:'Read the size of one interval on the scale.',equation:`One interval = ${scale} items`,picture},
     {text:'Count intervals from zero to the top of that bar.',equation:`${values[first]/scale} intervals`,picture},
     {text:'Multiply the interval count by its value.',equation:`${values[first]/scale} × ${scale} = ${values[first]} items`,picture},
    ],op('*',values[first]/scale,scale));
   const hi=values[first]>values[other]?first:other,lo=hi===first?other:first;
   const sum=mode===2,answer=sum?values[first]+values[other]:values[hi]-values[lo];
   return make(sum?`How many ${labels[first].toLowerCase()} and ${labels[other].toLowerCase()} were collected altogether?`:`How many more ${labels[hi].toLowerCase()} than ${labels[lo].toLowerCase()} were collected?`,answer,'items',picture,
    sum?'Read the two named bars, then add only those two values.':'Read both named bars. Subtract the smaller count from the larger count.',[
     {text:'Start at zero and read the scale.',equation:`One interval = ${scale} items`,picture},
     {text:`Read the ${labels[sum?first:hi].toLowerCase()} bar.`,equation:`${values[sum?first:hi]} items`,picture},
     {text:`Read the ${labels[sum?other:lo].toLowerCase()} bar.`,equation:`${values[sum?other:lo]} items`,picture},
     {text:sum?'Combine the two counts.':'Find the difference between the counts.',equation:sum?`${values[first]} + ${values[other]} = ${answer}`:`${values[hi]} − ${values[lo]} = ${answer}`,picture},
    ],op(sum?'+':'-',values[sum?first:hi],values[sum?other:lo]));
  }
  default:throw new Error(`Unknown P3 paper practice: ${activity.parameter}`);
 }
}
