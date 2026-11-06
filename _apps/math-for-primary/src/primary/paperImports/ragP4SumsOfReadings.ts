import {Rng,hashString} from '../../engine/random';
import type {Proof,Question} from '../generate';
import type {PaperPicture} from '../paperPicture';

/**
 * Original generator: add the readings that belong to each label or pair, then compare the totals.
 * Four variants are chosen from seed and index. No source text or image is embedded.
 */
export const RAG_PATTERN = {
 id:'rag-p4-compare-sums-of-readings',
 level:4,
 title:'Compare sums of readings',
 objective:'Add the readings that belong to each label or pair, then compare the totals to find the greatest or smallest, a difference, or whether a statement is true.',
 skillIds:['P4.S.GRAPH.01','P3.S.GRAPH.01','P3.S.AS.01'],
 canonicalPatternId:'p4-compare-sums-of-readings',
};

const calc=(op:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op,a,b});

interface ClubTheme{names:string[];cols:string[];heading:string;prompt:string;context:string}
const CLUBS:ClubTheme[]=[
 {names:['Chess','Art','Choir','Robotics'],cols:['Boys','Girls'],heading:'Club members',prompt:'Which club has the most members altogether?',context:'Every member is either a boy or a girl.'},
 {names:['Mango','Papaya','Guava','Lychee'],cols:['Morning','Afternoon'],heading:'Fruit sold at a stall',prompt:'Which fruit sold the most kilograms in the whole day?',context:'The numbers show kilograms of fruit sold.'},
];

/** Variant 0: the label with the greatest combined count. */
function greatestLabel(r:Rng,key:string):Question{
 const th=r.pick(CLUBS),names=th.names;
 let a:number[]=[],b:number[]=[],t:number[]=[],w=0;
 for(let tries=0;;tries++){
  a=names.map(()=>r.int(15,48));b=names.map(()=>r.int(15,48));t=a.map((x,i)=>x+b[i]);
  const top=Math.max(...t);w=t.indexOf(top);
  const second=Math.max(...t.filter((_,i)=>i!==w));
  // A clear winner that is not simply the largest reading in the first column.
  if(top-second>=2&&a[w]<Math.max(...a))break;
  if(tries>5000)throw new Error('No valid readings');
 }
 const picture:PaperPicture={type:'paper',layout:'cards',heading:th.heading,cards:names.map((n,i)=>({label:n,value:`${th.cols[0]} ${a[i]} · ${th.cols[1]} ${b[i]}`}))};
 const steps=[
  ...names.map((n,i)=>({text:`Add the two readings for ${n}.`,equation:`${a[i]} + ${b[i]} = ${t[i]}`})),
  {text:`Compare the totals. The greatest total belongs to ${names[w]}.`,equation:names.map((n,i)=>`${n} ${t[i]}`).join(' · ')},
 ];
 return {key,prompt:th.prompt,context:[th.context],answer:names[w],choices:r.shuffle([...names]),picture,hint:'Add the two readings in each row. Do not compare only one column.',explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),workedSteps:steps};
}

interface BakeTheme{noun:string;kinds:string[]}
const BAKES:BakeTheme[]=[
 {noun:'tarts',kinds:['Lemon','Coconut','Pineapple']},
 {noun:'muffins',kinds:['Banana','Carrot','Chocolate']},
];

/** Variant 1: difference between two combined counts. */
function differenceOfTotals(r:Rng,key:string):Question{
 const th=r.pick(BAKES);
 let sold:number[]=[],left:number[]=[],x=0,y=1,d=0;
 for(let tries=0;;tries++){
  sold=th.kinds.map(()=>r.int(8,30));left=th.kinds.map(()=>r.int(2,15));
  const order=r.shuffle([0,1,2]);x=order[0];y=order[1];
  d=Math.abs(sold[x]+left[x]-sold[y]-left[y]);
  if(d>=2&&d!==Math.abs(sold[x]-sold[y])&&d!==Math.abs(left[x]-left[y]))break;
  if(tries>5000)throw new Error('No valid readings');
 }
 const tx=sold[x]+left[x],ty=sold[y]+left[y],hi=tx>ty?x:y,lo=tx>ty?y:x;
 const picture:PaperPicture={type:'paper',layout:'bars',heading:`${th.noun[0].toUpperCase()+th.noun.slice(1)} sold and left over`,caption:'Each bar has two parts: sold and left over.',unit:th.noun,rows:th.kinds.map((k,i)=>({label:k,parts:[{size:sold[i],label:`Sold ${sold[i]}`,tone:'blue' as const},{size:left[i],label:`Left over ${left[i]}`,tone:'orange' as const}]}))};
 const steps=[
  {text:`Find how many ${th.kinds[x]} ${th.noun} were made. Add sold and left over.`,equation:`${sold[x]} + ${left[x]} = ${tx}`},
  {text:`Find how many ${th.kinds[y]} ${th.noun} were made.`,equation:`${sold[y]} + ${left[y]} = ${ty}`},
  {text:'Subtract the smaller total from the larger total.',equation:`${Math.max(tx,ty)} − ${Math.min(tx,ty)} = ${d}`},
 ];
 return {key,prompt:`What is the difference between the number of ${th.kinds[x]} ${th.noun} and the number of ${th.kinds[y]} ${th.noun} that were made?`,context:[`Every one that was made was either sold or left over.`],answer:String(d),unit:th.noun,picture,hint:'Add the sold and left-over parts for each kind first. Then subtract the two totals.',explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),workedSteps:steps,proof:calc('-',calc('+',sold[hi],left[hi]),calc('+',sold[lo],left[lo]))};
}

const TEAMS=['Red','Blue','Green','Yellow'];
const EVENTS=['Relay','Jump','Throw'];
const SPEAKERS=['Sam','Mina','Raj','Lily'];

/** Variant 2: judge a statement about two group totals. */
function judgeTotals(r:Rng,key:string):Question{
 const teams=r.shuffle([...TEAMS]).slice(0,2),speaker=r.pick(SPEAKERS);
 let p:number[][]=[[],[]],totals=[0,0],higher=0;
 for(let tries=0;;tries++){
  p=teams.map(()=>EVENTS.map(()=>r.int(6,30)));totals=p.map(row=>row.reduce((a,b)=>a+b,0));
  higher=totals[0]>totals[1]?0:1;const lower=1-higher;
  const wins=p[higher].filter((v,i)=>v>p[lower][i]).length,ties=p[higher].filter((v,i)=>v===p[lower][i]).length;
  // Trap: the team with the higher total wins only one of the three events.
  if(Math.abs(totals[0]-totals[1])>=3&&ties===0&&wins===1)break;
  if(tries>20000)throw new Error('No valid readings');
 }
 const claimHigher=r.chance(.5),first=claimHigher?higher:1-higher,second=1-first;
 const yes=totals[first]>totals[second];
 const picture:PaperPicture={type:'paper',layout:'cards',heading:'Points scored in three events',cards:teams.map((t,i)=>({label:`Team ${t}`,value:`${EVENTS[0]} ${p[i][0]} · ${EVENTS[1]} ${p[i][1]} · ${EVENTS[2]} ${p[i][2]}`}))};
 const steps=[
  {text:`Add Team ${teams[first]}'s points from the three events.`,equation:`${p[first].join(' + ')} = ${totals[first]}`},
  {text:`Add Team ${teams[second]}'s points from the three events.`,equation:`${p[second].join(' + ')} = ${totals[second]}`},
  {text:`Compare the totals. ${totals[first]} is ${yes?'greater than':'not greater than'} ${totals[second]}.`,equation:`${totals[first]} ${yes?'>':'<'} ${totals[second]}`},
 ];
 return {key,prompt:`${speaker} says that Team ${teams[first]} scored more points than Team ${teams[second]} altogether. Is ${speaker} correct?`,context:['Each team adds its points from the three events to get its total.'],answer:yes?'Yes':'No',choices:r.shuffle(['Yes','No']),picture,hint:'Find each team total before deciding. Winning more single events does not decide the total.',explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),workedSteps:steps};
}

const CHILDREN=['Ben','Alicia','Hari','Mei','Zane','Priya','Jun','Elsa'];

/** Variant 3: the pair with the smallest combined reading, read from a bar graph. */
function lowestPair(r:Rng,key:string):Question{
 const labels=r.shuffle([...CHILDREN]).slice(0,5);
 let values:number[]=[];
 for(let tries=0;;tries++){
  values=labels.map(()=>r.int(2,10)*10);
  const s=[...values].sort((a,b)=>a-b);
  // The two smallest bars form the one strictly smallest pair.
  if(s[1]<s[2])break;
  if(tries>5000)throw new Error('No valid readings');
 }
 const order=values.map((_,i)=>i).sort((i,j)=>values[i]-values[j]||i-j);
 const minPair=[order[0],order[1]].sort((i,j)=>i-j),trap=[order[0],order[4]].sort((i,j)=>i-j);
 const same=(u:number[],v:number[])=>u[0]===v[0]&&u[1]===v[1];
 const all:number[][]=[];for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)all.push([i,j]);
 const pool=all.filter(pr=>!same(pr,minPair)&&!same(pr,trap));
 const offered=r.shuffle([minPair,trap,...r.shuffle(pool).slice(0,2)]);
 const name=(pr:number[])=>`${labels[pr[0]]} and ${labels[pr[1]]}`,sum=(pr:number[])=>values[pr[0]]+values[pr[1]];
 const steps=[
  ...offered.map(pr=>({text:`Read the two bars and add them for ${name(pr)}.`,equation:`${values[pr[0]]} + ${values[pr[1]]} = ${sum(pr)}`})),
  {text:`The smallest total is ${sum(minPair)}, for ${name(minPair)}. These are the two shortest bars, so no other pair can be lower.`,equation:`${sum(minPair)} is the smallest`},
 ];
 return {key,prompt:'Which two children have the lowest combined weekly allowance?',context:['The bar graph shows the weekly allowance, in dollars, of five children.'],answer:name(minPair),choices:offered.map(name),picture:{type:'bars',labels,values,scale:10},hint:'Read each bar. Add the two readings for every pair you are offered.',explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),workedSteps:steps};
}

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(((Math.trunc(seed)+index)%4)+4)%4;
 const r=new Rng(hashString(`rag-p4-compare-sums-of-readings:${seed}:${index}`));
 const key=`rag-p4-compare-sums-of-readings:${variant}:${seed}:${index}`;
 switch(variant){
  case 0:return greatestLabel(r,key);
  case 1:return differenceOfTotals(r,key);
  case 2:return judgeTotals(r,key);
  default:return lowestPair(r,key);
 }
}
