import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p3-bar-graph-pair-with-target-sum',
 level:3,
 title:'Find two bars with a target total',
 objective:'Read a bar graph and choose two different bars whose values add to a named bar or to a stated total.',
 skillIds:['P3.S.GRAPH.01','P3.S.AS.01'],
 canonicalPatternId:'p3-bar-graph-pair-with-target-sum',
};

type Mode='target'|'total';
interface Theme{context:string;pool:string[];count:number;ordered:boolean;scales:number[];target:(label:string)=>string;total:(n:number)=>string}

const THEMES:Theme[]=[
 {
  context:'The bar graph shows how many stamps Mei has from different places.',
  pool:['Brazil','Kenya','Peru','Spain','Korea','Egypt'],count:5,ordered:false,scales:[10,20],
  target:label=>`The number of ${label} stamps equals the total of which two other kinds of stamps?`,
  total:n=>`Which two places have ${n} stamps altogether?`,
 },
 {
  context:'The bar graph shows how many bicycles a shop sold in each month from January to June.',
  pool:['January','February','March','April','May','June'],count:6,ordered:true,scales:[2,5],
  target:label=>`The number of bicycles sold in ${label} equals the total sold in which two other months?`,
  total:n=>`Which two months had ${n} bicycles sold altogether?`,
 },
];

function pairsWithSum(values:number[],target:number,skip:number):[number,number][]{
 const found:[number,number][]=[];
 for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){
  if(i!==skip&&j!==skip&&values[i]+values[j]===target)found.push([i,j]);
 }
 return found;
}

function build(r:Rng,theme:Theme,mode:Mode){
 for(let attempt=0;attempt<2000;attempt++){
  const scale=r.pick(theme.scales);
  const labels=theme.ordered?[...theme.pool]:r.shuffle([...theme.pool]).slice(0,theme.count);
  const units=labels.map(()=>r.int(1,12));
  let targetIndex=-1,pair:[number,number];
  if(mode==='target'){
   targetIndex=r.int(0,labels.length-1);
   const others=r.shuffle(labels.map((_,i)=>i).filter(i=>i!==targetIndex));
   pair=[others[0],others[1]];
   units[targetIndex]=units[pair[0]]+units[pair[1]];
   if(units[targetIndex]>20)continue;
  }else{
   const all=r.shuffle(labels.map((_,i)=>i));
   pair=[all[0],all[1]];
  }
  const total=mode==='target'?units[targetIndex]:units[pair[0]]+units[pair[1]];
  const found=pairsWithSum(units,total,targetIndex);
  if(found.length!==1)continue;
  const [i,j]=found[0];
  return {scale,labels,values:units.map(u=>u*scale),targetIndex,total:total*scale,pair:[i,j] as [number,number]};
 }
 throw new Error('No unique pair configuration found');
}

/** Four deterministic variants: two modes (named bar or stated total) in two themes. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p3-bar-pair-target:${seed}:${index}`));
 const variant=r.int(0,3),theme=THEMES[variant%2],mode:Mode=variant<2?'target':'total';
 const d=build(r,theme,mode);
 const [i,j]=d.pair,answerPair=[d.labels[i],d.labels[j]].sort();
 const prompt=mode==='target'?theme.target(d.labels[d.targetIndex]):theme.total(d.total);
 const readStep={text:'Read every bar using the scale on the side.',equation:d.labels.map((l,k)=>`${l} ${d.values[k]}`).join('; ')};
 const candidates=d.labels.map((_,k)=>k).filter(k=>k!==d.targetIndex);
 const complementStep={
  text:mode==='target'?`Subtract each other bar from the ${d.labels[d.targetIndex]} bar to see which partner it needs.`:'Subtract each bar from the stated total to see which partner it needs.',
  equation:candidates.map(k=>`${d.total} − ${d.values[k]} = ${d.total-d.values[k]}`).join('; '),
 };
 const matchStep={
  text:'Only one pair of different bars has partners that match.',
  equation:`${d.labels[i]} ${d.values[i]} + ${d.labels[j]} ${d.values[j]} = ${d.total}`,
 };
 const workedSteps=[readStep,complementStep,matchStep];
 return {
  key:`rag-p3-bar-pair-target:${seed}:${index}`,
  prompt,
  context:[theme.context],
  answer:JSON.stringify(answerPair),
  structuredResponse:{kind:'named-pair',options:[...d.labels]},
  picture:{type:'bars',labels:d.labels,values:d.values,scale:d.scale},
  hint:mode==='target'?'Read the target bar. Subtract each other bar from it and look for a partner with the leftover value.':'Subtract each bar from the total and look for another bar with the leftover value.',
  explanation:workedSteps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
  workedSteps,
 };
}
