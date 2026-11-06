import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p5-classify-triangles-by-equality',
 level:5,
 title:'Classify triangles by equal angles and sides',
 objective:'Use the angle sum of a triangle and equal angles to decide which triangle is isosceles or equilateral, and which sides are equal',
 skillIds:['P5.S.SHAPE.01','P5.S.ANGLE.04'],
 canonicalPatternId:'p5-classify-triangles-by-equality',
};

type Body=Omit<Question,'key'>;
const LETTERS=['A','B','C','D'];
const steps=(texts:string[])=>texts.map(text=>({text}));
const side=(a:string,b:string)=>[a,b].sort().join('');
const anyEqual=(a:number,b:number,c:number)=>a===b||a===c||b===c;
const sig=(list:number[])=>[...list].sort((a,b)=>a-b).join(',');

function isoBody(r:Rng):Body{
 const x=r.pick([35,40,45,50,55,65,70,75]),apex=180-2*x,correctAt=r.int(0,3);
 const form=r.pick([0,1,2]);
 const correctPair:[number,number]=form===0?[x,x]:form===1?[x,apex]:[apex,x];
 const seen=new Set<string>([sig([x,x,apex])]);
 const distractors:[number,number][]=[];
 for(let tries=0;distractors.length<3&&tries<2000;tries++){
  const p=5*r.int(5,20),q=5*r.int(5,20),third=180-p-q;
  if(p===q||third<20||third===p||third===q)continue;
  const s=sig([p,q,third]);
  if(seen.has(s))continue;
  seen.add(s);distractors.push([p,q]);
 }
 if(distractors.length<3)throw new Error('Could not build distractor triangles');
 let d=0;
 const pairs:[number,number][]=LETTERS.map((_,i)=>i===correctAt?correctPair:distractors[d++]);
 const lines=pairs.map(([a,b],i)=>`Triangle ${LETTERS[i]} has angles of ${a}° and ${b}°.`);
 const work=pairs.map(([a,b],i)=>{
  const c=180-a-b,iso=anyEqual(a,b,c);
  return `Triangle ${LETTERS[i]}: 180° − ${a}° − ${b}° = ${c}°, so its angles are ${a}°, ${b}° and ${c}°. ${iso?'Two angles are equal, so it is isosceles.':'No two angles are equal, so it is not isosceles.'}`;
 });
 const answer=`Triangle ${LETTERS[correctAt]}`;
 return {
  context:['Each triangle shows two of its angles. The triangles are not drawn to scale.',...lines],
  prompt:'Which triangle is an isosceles triangle?',
  answer,
  choices:LETTERS.map(l=>`Triangle ${l}`),
  hint:'Find the third angle of each triangle. An isosceles triangle has two equal angles.',
  explanation:[...work,`The answer is ${answer}.`].join(' '),
  workedSteps:steps([...work,`Only ${answer} has two equal angles.`]),
 };
}

interface Item{text:string;angles:number[];work:string}
function equiBody(r:Rng):Body{
 const correctAt=r.int(0,3);
 const correct:Item=r.chance(.5)
  ?{text:'has two equal sides, and the angle between those two sides is 60°',angles:[60,60,60],work:'(180° − 60°) ÷ 2 = 60° for each of the other two angles'}
  :{text:'has angles of 60° and 60°',angles:[60,60,60],work:'180° − 60° − 60° = 60°'};
 const pool:Item[]=[];
 for(const x of [30,40,50,70,80,100,110]){const y=(180-x)/2;pool.push({text:`has two equal sides, and the angle between those two sides is ${x}°`,angles:[x,y,y],work:`(180° − ${x}°) ÷ 2 = ${y}° for each of the other two angles`});}
 for(const a of [40,45,50,55,65,70])pool.push({text:`has angles of ${a}° and ${a}°`,angles:[a,a,180-2*a],work:`180° − ${a}° − ${a}° = ${180-2*a}°`});
 for(const b of [40,45,50,70,80])pool.push({text:`has angles of 60° and ${b}°`,angles:[60,b,120-b],work:`180° − 60° − ${b}° = ${120-b}°`});
 pool.push({text:'has a right angle and a 60° angle',angles:[90,60,30],work:'180° − 90° − 60° = 30°'});
 const picks=r.shuffle(pool).slice(0,3);
 let d=0;
 const items=LETTERS.map((_,i)=>i===correctAt?correct:picks[d++]);
 const lines=items.map((it,i)=>`Triangle ${LETTERS[i]} ${it.text}.`);
 const work=items.map((it,i)=>{
  const eq=it.angles.every(a=>a===it.angles[0]);
  return `Triangle ${LETTERS[i]}: ${it.work}. Its angles are ${it.angles.join('°, ')}°. ${eq?'All three angles are equal, so it is equilateral.':'The three angles are not all equal, so it is not equilateral.'}`;
 });
 const answer=`Triangle ${LETTERS[correctAt]}`;
 return {
  context:['Work out all three angles of each triangle. The triangles are not drawn to scale.',...lines],
  prompt:'Which triangle is an equilateral triangle?',
  answer,
  choices:LETTERS.map(l=>`Triangle ${l}`),
  hint:'An equilateral triangle has three equal angles, each 60°. Find any angle you are not told.',
  explanation:[...work,`The answer is ${answer}.`].join(' '),
  workedSteps:steps([...work,`Only ${answer} has three equal angles.`]),
 };
}

function sidesBody(r:Rng):Body{
 const names=r.pick([['A','B','C'],['P','Q','R'],['D','E','F'],['X','Y','Z']]);
 const k=r.int(0,2),x=r.pick([35,40,45,50,55,65,70,75]),apex=180-2*x;
 const angles=names.map((_,i)=>i===k?apex:x);
 const missing=r.int(0,2),given=[0,1,2].filter(i=>i!==missing);
 const triName=names.join('');
 const sideList=[side(names[0],names[1]),side(names[0],names[2]),side(names[1],names[2])];
 const atApex=sideList.filter(s=>s.includes(names[k]));
 const answer=atApex.join(' and ');
 const choices=r.shuffle([[0,1],[0,2],[1,2]].map(([i,j])=>`${sideList[i]} and ${sideList[j]}`));
 const base=[0,1,2].filter(i=>i!==k);
 const opposite=(i:number)=>side(names[(i+1)%3],names[(i+2)%3]);
 const [g1,g2]=given;
 return {
  context:[`Triangle ${triName} is not drawn to scale.`,...given.map(i=>`Angle ${names[i]} = ${angles[i]}°.`)],
  prompt:`Which two sides of triangle ${triName} are equal in length?`,
  answer,
  choices,
  hint:'Find the third angle first. Sides opposite equal angles are equal.',
  explanation:`The third angle at ${names[missing]} is 180° − ${angles[g1]}° − ${angles[g2]}° = ${angles[missing]}°. The angles at ${names[base[0]]} and ${names[base[1]]} are both ${x}°, so the sides opposite them, ${opposite(base[0])} and ${opposite(base[1])}, are equal.`,
  workedSteps:steps([
   `Third angle: 180° − ${angles[g1]}° − ${angles[g2]}° = ${angles[missing]}°, at ${names[missing]}.`,
   `Angles at ${names[base[0]]} and ${names[base[1]]} are both ${x}°.`,
   `Side opposite ${names[base[0]]} is ${opposite(base[0])}; side opposite ${names[base[1]]} is ${opposite(base[1])}. These sides are equal.`,
  ]),
 };
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%3;
 const body=variant===0?isoBody(r):variant===1?equiBody(r):sidesBody(r);
 return {key:`${RAG_PATTERN.id}:${seed}:${index}`,...body};
}
