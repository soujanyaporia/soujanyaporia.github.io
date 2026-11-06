import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';

export const RAG_PATTERN={
 id:'p2-rag-full-groups-leftovers',
 level:2,
 title:'Count containers for everyone',
 objective:'Use full groups and leftovers to find the smallest number of equal-capacity containers or trips that fits everyone.',
 skillIds:['P2.S.MD.01','P2.S.MD.02'],
 canonicalPatternId:'p2-full-groups-leftovers',
};

type Scene={unit:string;units:string;verb:string;one:string;many:string};
const SCENES:Scene[]=[
 {unit:'van',units:'vans',verb:'carry',one:'child',many:'children'},
 {unit:'boat',units:'boats',verb:'carry',one:'visitor',many:'visitors'},
 {unit:'box',units:'boxes',verb:'hold',one:'pencil',many:'pencils'},
 {unit:'tray',units:'trays',verb:'hold',one:'muffin',many:'muffins'},
 {unit:'bag',units:'bags',verb:'hold',one:'orange',many:'oranges'},
 {unit:'table',units:'tables',verb:'seat',one:'pupil',many:'pupils'},
];
const CAPACITIES=[3,4,5,10];
const count=(n:number,one:string,many:string)=>`${n} ${n===1?one:many}`;
const hint='Count in equal groups: one container, two containers, and so on. Stop at the first count whose total capacity reaches the number to fit. Check whether any are left over.';

/** Original variants: the smallest number of equal-capacity groups whose capacity reaches a total. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p2-full-groups-leftovers-v1:${seed}:${index}`));
 const variant=Math.abs(Math.trunc(seed+index))%3;
 const cap=r.pick(CAPACITIES);
 let full=r.int(2,9);
 const left=r.int(1,cap-1);
 if(cap===5&&full*cap+left===24)full+=1;
 const total=full*cap+left,answer=full+1;
 let context:string[],prompt:string,unit:string;
 if(variant===0){
  const s=r.pick(SCENES);
  context=[`Each ${s.unit} can ${s.verb} ${cap} ${s.many}.`,`There are ${total} ${s.many} altogether.`];
  prompt=`What is the smallest number of ${s.units} needed for all the ${s.many}?`;unit=s.units;
 }else if(variant===1){
  const s=r.pick(SCENES);
  context=[`Each ${s.unit} can ${s.verb} ${cap} ${s.many}.`,`${full} full ${s.units} have ${cap} ${s.many} in each one.`,`${count(left,s.one,s.many)} ${left===1?'is':'are'} still waiting for a ${s.unit}.`];
  prompt=`What is the smallest number of ${s.units} needed for all the ${s.many}, including those still waiting?`;unit=s.units;
 }else{
  const lift=r.chance(.5);
  context=lift?[`A lift can carry ${cap} people at one time.`,`${total} people need to go up to the roof.`]:[`A small boat can take ${cap} people across the river at one time.`,`${total} people are waiting on the bank.`];
  prompt=lift?'What is the smallest number of lift trips needed?':'What is the smallest number of boat trips needed?';unit='trips';
 }
 const proof:Proof={op:'+',a:full,b:1};
 const steps:[string,string][]=[
  ['Write the total as full groups and leftovers.',`${total} = ${full} × ${cap} + ${left}`],
  [`The ${left} left over cannot be left behind, so they need one more group. ${left} is less than ${cap}, so one more group is enough.`,`${full} + 1 = ${answer}`],
  ['Check that the capacity reaches the total.',`${answer} × ${cap} = ${answer*cap}, and ${answer*cap} ≥ ${total}`],
 ];
 return {key:`rag-p2-full-groups-leftovers:${seed}:${index}`,prompt,context,answer:String(answer),unit,hint,
  workedSteps:steps.map(([text,equation])=>({text,equation})),
  explanation:steps.map(([text,equation])=>`${text} ${equation}.`).join(' '),proof};
}
