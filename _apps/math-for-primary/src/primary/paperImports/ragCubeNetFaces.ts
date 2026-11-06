import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-cube-net-opposite-faces',
 level:6,
 title:'Faces of a folded cube net',
 objective:'Fold a cube net in your head to find opposite faces, and use an opposite-face sum to find missing numbers.',
 skillIds:['P4.S.SOLID.03'],
 canonicalPatternId:'p6-cube-net-opposite-faces',
};

/** Face order: four squares in the middle row (left to right), then the square above, then the square below. */
const OPPOSITE=[2,3,0,1,5,4];
const LETTERS='ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
const DESIGNS=['circle','triangle','star','heart','diamond','moon','cross','arrow'];

function netContext(labels:string[],above:number,below:number,extra:string[]):string[]{
 return [
  `A cube net has a middle row of four squares. From left to right, they are marked ${labels.slice(0,4).join(', ')}.`,
  `The square marked ${labels[4]} is joined above the square marked ${labels[above]}.`,
  `The square marked ${labels[5]} is joined below the square marked ${labels[below]}.`,
  'The net is folded so that the marks are on the outside of the cube.',
  ...extra,
 ];
}

function foldSteps(l:string[]):{text:string}[]{
 return [
  {text:`Wrap the middle row around like a belt. Squares two places apart face each other: ${l[0]} and ${l[2]}, and ${l[1]} and ${l[3]}.`},
  {text:`The squares joined above and below the row fold to the top and bottom, so ${l[4]} and ${l[5]} are opposite.`},
 ];
}

const HINT='Wrap the middle row of four squares around like a belt. Squares two places apart in the row end up opposite each other.';

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=((Math.abs(Math.trunc(seed))+index)%4+4)%4;
 const r=new Rng(hashString(`rag-cube-net:${seed}:${index}:${variant}`));
 const key=`rag-cube-net:${seed}:${index}`;
 const above=r.int(0,3),below=r.int(0,3);

 if(variant===0){
  const labels=r.shuffle([...LETTERS]).slice(0,6),t=r.int(0,5),answer=labels[OPPOSITE[t]];
  return {key,prompt:`When the net is folded into a cube, which face is opposite face ${labels[t]}?`,context:netContext(labels,above,below,['Every square has a different letter.']),answer,hint:HINT,
   explanation:`Face ${labels[t]} is opposite face ${answer}.`,
   workedSteps:[...foldSteps(labels),{text:`Face ${labels[t]} is opposite face ${answer}.`}]};
 }

 if(variant===1){
  const labels=r.shuffle([...LETTERS]).slice(0,6),pairs:[number,number][]=[];
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)pairs.push([i,j]);
  const opposite=pairs.filter(([i,j])=>OPPOSITE[i]===j),adjacent=pairs.filter(([i,j])=>OPPOSITE[i]!==j);
  const correct=r.pick(opposite),wrong=r.shuffle([...adjacent]).slice(0,3);
  const text=([i,j]:[number,number])=>`${labels[i]} and ${labels[j]}`;
  const answer=text(correct);
  return {key,prompt:'When the net is folded into a cube, which two faces are opposite each other?',context:netContext(labels,above,below,['Every square has a different letter.']),answer,choices:r.shuffle([answer,...wrong.map(text)]),hint:HINT,
   explanation:`${answer} are opposite faces. The other pairs share an edge on the cube.`,
   workedSteps:[...foldSteps(labels),{text:`Only ${answer} is one of these opposite pairs, so it is the answer.`}]};
 }

 if(variant===2){
  const sum=r.int(11,19),smalls=r.shuffle(Array.from({length:Math.floor((sum-1)/2)},(_,i)=>i+1)).slice(0,3);
  const positions=r.shuffle<[number,number]>([[0,2],[1,3],[4,5]]);
  const labels:string[]=Array(6).fill(''),unknown:{pos:number;value:number;known:number}[]=[];
  smalls.forEach((small,k)=>{
   const big=sum-small,[p1,p2]=positions[k],knownIsSmall=r.chance(.5),firstKnown=r.chance(.5);
   const known=knownIsSmall?small:big,missing=knownIsSmall?big:small,knownPos=firstKnown?p1:p2,missingPos=firstKnown?p2:p1;
   labels[knownPos]=String(known);unknown.push({pos:missingPos,value:missing,known});
  });
  unknown.sort((a,b)=>a.pos-b.pos);
  const names=['p','q','r'];
  unknown.forEach((u,i)=>{labels[u.pos]=names[i];});
  const answer=JSON.stringify(unknown.map(u=>String(u.value)));
  return {key,prompt:'Find the values of p, q and r.',
   context:netContext(labels,above,below,['The six faces show different whole numbers.',`The two numbers on opposite faces always add up to ${sum}.`]),
   answer,structuredResponse:{kind:'number-fields',fields:names.map(n=>({label:n}))},
   hint:'First find which face is opposite each letter. Then subtract the known number from the opposite-face sum.',
   explanation:unknown.map((u,i)=>`${names[i]} = ${sum} − ${u.known} = ${u.value}`).join('; ')+'.',
   workedSteps:[...foldSteps(labels),...unknown.map((u,i)=>({text:`${names[i]} is opposite ${u.known}.`,equation:`${names[i]} = ${sum} − ${u.known} = ${u.value}`}))]};
 }

 const labels=r.shuffle([...r.shuffle([...DESIGNS]).slice(0,5),'?']),t=labels.indexOf('?'),answer=labels[OPPOSITE[t]];
 const wrong=r.shuffle(labels.filter(l=>l!=='?'&&l!==answer)).slice(0,3);
 return {key,prompt:'Which design is opposite the face marked "?" on the cube?',context:netContext(labels,above,below,['Each of the five other squares has a different design.']),answer,choices:r.shuffle([answer,...wrong]),hint:HINT,
  explanation:`The face marked ? is opposite the ${answer} face.`,
  workedSteps:[...foldSteps(labels),{text:`The face marked ? is opposite the ${answer} face.`}]};
}
