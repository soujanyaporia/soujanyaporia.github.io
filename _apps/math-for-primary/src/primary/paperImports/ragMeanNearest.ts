import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-direct-mean-nearest-and-age-mean',
 level:6,
 title:'Find a mean age and compare with it',
 objective:'Find the mean of listed ages, then choose the entry nearest the mean or give a mean age in years and months.',
 skillIds:['P6.S.AVG.01'],
 canonicalPatternId:'p6-direct-mean-and-mean-comparison',
};

const NAMES=['Aiden','Bella','Chen','Devi','Eli','Farah','Gita','Hugo','Iris','Jonas'];
const fmt=(n:number)=>Number(n.toFixed(4)).toString();

function nearestEntry(r:Rng,key:string):Question{
 let ages:number[]=[12,14,15,19];
 for(let attempt=0;attempt<500;attempt++){
  const candidate=[0,1,2,3].map(()=>r.int(9,21));
  const sum=candidate.reduce((a,b)=>a+b,0),diffs=candidate.map(a=>Math.abs(4*a-sum)),min=Math.min(...diffs);
  if(new Set(candidate).size===4&&diffs.filter(d=>d===min).length===1){ages=candidate;break;}
 }
 const names=r.shuffle([...NAMES]).slice(0,4);
 const sum=ages.reduce((a,b)=>a+b,0),mean=sum/4;
 const diffs=ages.map(a=>Math.abs(a-mean)),best=diffs.indexOf(Math.min(...diffs));
 return {
  key,
  context:['A club records the ages of four friends.',...names.map((n,i)=>`${n} is ${ages[i]} years old.`)],
  prompt:'Whose age is closest to the mean age of the four friends?',
  answer:names[best],
  choices:r.shuffle([...names]),
  hint:'First find the mean age. Then see how far each age is from the mean.',
  workedSteps:[
   {text:'Add the four ages.',equation:`${ages.join(' + ')} = ${sum}`},
   {text:'Divide by the number of friends.',equation:`${sum} ÷ 4 = ${fmt(mean)}`},
   {text:'Find each distance from the mean.',equation:names.map((n,i)=>`${n}: ${fmt(diffs[i])}`).join('; ')},
   {text:`The smallest distance belongs to ${names[best]}.`},
  ],
  explanation:`The mean age is ${sum} ÷ 4 = ${fmt(mean)} years. ${names[best]} is ${fmt(diffs[best])} years from the mean, which is the smallest distance.`,
  picture:{type:'paper',layout:'cards',heading:'Ages of the friends',cards:names.map((n,i)=>({label:n,value:`${ages[i]} years`,icon:'child' as const}))},
 };
}

function meanAge(r:Rng,key:string):Question{
 let count=r.pick([3,4]);
 let people:[number,number][]=[[9,2],[9,7],[10,3]];
 let found=false;
 for(let attempt=0;attempt<500&&!found;attempt++){
  const candidate:[number,number][]=Array.from({length:count},()=>[r.int(8,14),r.int(0,11)] as [number,number]);
  const total=candidate.reduce((a,[y,m])=>a+y*12+m,0);
  if(total%count===0&&new Set(candidate.map(([y,m])=>y*12+m)).size>1){people=candidate;found=true;}
 }
 if(!found)count=3;
 const names=r.shuffle([...NAMES]).slice(0,count);
 const months=people.map(([y,m])=>y*12+m),total=months.reduce((a,b)=>a+b,0),mean=total/count;
 const years=Math.floor(mean/12),rest=mean%12;
 return {
  key,
  context:[`The ages of ${count} children are given in years and months.`,...names.map((n,i)=>`${n} is ${people[i][0]} years ${people[i][1]} months old.`)],
  prompt:'What is the mean age of the children? Give your answer in years and months.',
  answer:JSON.stringify([String(years),String(rest)]),
  structuredResponse:{kind:'number-pair',firstLabel:'Years',secondLabel:'Months'},
  hint:'Change every age to months first. Then find the mean and change it back.',
  workedSteps:[
   {text:'Write each age in months.',equation:people.map(([y,m],i)=>`${y} × 12 + ${m} = ${months[i]}`).join('; ')},
   {text:'Add the months.',equation:`${months.join(' + ')} = ${total}`},
   {text:'Divide by the number of children.',equation:`${total} ÷ ${count} = ${mean} months`},
   {text:'Change back to years and months.',equation:`${mean} months = ${years} years ${rest} months`},
  ],
  explanation:`The total is ${total} months. ${total} ÷ ${count} = ${mean} months, which is ${years} years ${rest} months.`,
 };
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-mean-nearest:${seed}:${index}`));
 const key=`rag-mean-nearest:${seed}:${index}`;
 const variant=(((Math.trunc(seed)+index)%2)+2)%2;
 return variant===0?nearestEntry(r,key):meanAge(r,key);
}
