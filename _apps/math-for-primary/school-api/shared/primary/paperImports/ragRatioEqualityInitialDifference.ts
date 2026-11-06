import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-ratio-equality-initial-difference',
 level:6,
 title:'Equal amounts reveal the starting difference',
 objective:'Use changes that make two ratio amounts equal to find the starting difference, one ratio unit, and the starting amounts.',
 skillIds:['P6.S.RATIO.01','P6.S.RATIO.04'],
 canonicalPatternId:'p6-equality-reveals-initial-difference',
};

const RATIOS:[number,number][]=[[2,3],[3,4],[2,5],[3,5],[3,7],[4,7],[5,7],[5,8],[3,8],[4,9],[5,9]];
const PAIRS:[string,string][]=[['cookies','muffins'],['seashells','pebbles'],['stickers','badges'],['pencils','markers'],['tulips','roses'],['cards','marbles']];
const units=(n:number)=>`${n} unit${n===1?'':'s'}`;

/** Four variants: opposite changes or unequal removals, each asking for one starting amount or the starting total. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=(((Math.floor(seed)+index)%4)+4)%4;
 const opposite=variant<2,askTotal=variant%2===1;
 const [a,b]=r.pick(RATIOS),d=b-a,unit=r.int(4,20),gap=d*unit;
 const [small,large]=r.pick(PAIRS);
 const flip=r.chance(.5),askLarge=r.chance(.5);
 const ratioText=flip?`${b} : ${a}`:`${a} : ${b}`;
 const first=flip?large:small,second=flip?small:large;
 const context=[`A craft box has some ${small} and some ${large}.`,`The ratio of the number of ${first} to the number of ${second} is ${ratioText}.`];
 const steps:string[]=[];
 if(opposite){
  const x=r.int(2,gap-2),y=gap-x;
  context.push(`${x} more ${small} were put in and ${y} ${large} were taken out.`);
  steps.push(`Adding ${x} ${small} and taking away ${y} ${large} closes the gap by ${x} + ${y} = ${gap}.`);
 }else{
  const r1=r.int(2,a*unit-1),r2=r1+gap;
  context.push(`${r1} ${small} and ${r2} ${large} were given away.`);
  steps.push(`${large} lost ${r2} − ${r1} = ${gap} more than ${small}, and then the amounts were equal, so the starting gap was ${gap}.`);
 }
 context.push(`After that, the number of ${small} and the number of ${large} are the same.`);
 steps.push(`At the start, ${large} were ${units(d)} more than ${small} (${b} − ${a} = ${d}), so ${units(d)} = ${gap} and 1 unit = ${unit}.`);
 const askName=askLarge?large:small,k=askLarge?b:a;
 const answer=askTotal?(a+b)*unit:k*unit;
 steps.push(askTotal?`The total is ${a} + ${b} = ${a+b} units, and ${a+b} × ${unit} = ${answer}.`:`${askName} are ${units(k)} at the start: ${k} × ${unit} = ${answer}.`);
 return {
  key:`rag:${RAG_PATTERN.id}:${seed}:${index}`,
  context,
  prompt:askTotal?'How many items were there altogether at first?':`How many ${askName} were there at first?`,
  answer:String(answer),
  unit:askTotal?'items':askName,
  hint:'Work out how much the changes close the gap between the two amounts. That gap is a whole number of ratio units.',
  explanation:steps.join(' '),
  workedSteps:steps.map(text=>({text})),
 };
}
