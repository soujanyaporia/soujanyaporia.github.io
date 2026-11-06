import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={id:'p3-rag-common-multiple-exact-grouping',level:3,title:'Find a number that groups exactly two ways',objective:'Use two multiplication tables to find a number that divides exactly by both group sizes, within any stated bounds.',skillIds:['P3.S.MD.01','P3.S.MD.02','P3.S.MD.04'],canonicalPatternId:'p3-common-multiple-exact-grouping'};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a*b/gcd(a,b);
/** Pairs of group sizes; PROPER pairs have neither size dividing the other. */
const PROPER:[number,number][]=[[3,4],[4,6],[3,5],[4,5],[6,8],[5,6],[6,7],[3,8],[5,8],[6,9],[9,4]];
const ALL:[number,number][]=[...PROPER,[4,8]];
const common=(l:number,min:number,max:number)=>{const out:number[]=[];for(let n=l;n<=max;n+=l)if(n>=min)out.push(n);return out;};
const between=(lo:number,hi:number)=>Array.from({length:Math.max(0,hi-lo-1)},(_,i)=>lo+1+i);
const NAMES=['Kai','Mei','Ravi','Sara','Omar','Lena'];
const ITEMS=['sweets','beads','stickers','pencils','marbles'];
const CONTAINERS=['bags','boxes','packs'];

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(Math.abs(Math.trunc(seed))+index)%3;
 const r=new Rng(hashString(`rag-p3-common-multiples:${seed}:${index}`));
 const [x,y]=r.pick(variant===1?PROPER:ALL),[a,b]=r.chance(.5)?[x,y]:[y,x],l=lcm(a,b);
 const name=r.pick(NAMES),item=r.pick(ITEMS),container=r.pick(CONTAINERS);
 const key=`rag-p3-common-multiples:${seed}:${index}`;
 const finish=(prompt:string,context:string[],answer:number,hint:string,steps:NonNullable<Question['workedSteps']>,extra:Partial<Question>={}):Question=>({key,prompt,context,answer:String(answer),hint,workedSteps:steps,explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra});
 const checkStep=(ans:number)=>({text:`Check the number with both group sizes.`,equation:`${ans} ÷ ${a} = ${ans/a} and ${ans} ÷ ${b} = ${ans/b}, with nothing left over`});
 if(variant===1){
  const ans=r.pick(common(l,24,180)),pool=(pred:(n:number)=>boolean)=>{const all=Array.from({length:181},(_,i)=>i+20).filter(pred),near=all.filter(n=>Math.abs(n-ans)<=40);return near.length?near:all;};
  const onlyA=r.pick(pool(n=>n%a===0&&n%b!==0)),onlyB=r.pick(pool(n=>n%b===0&&n%a!==0)),neither=r.pick(pool(n=>n%a!==0&&n%b!==0));
  const choices=[ans,onlyA,onlyB,neither].sort((p,q)=>p-q).map(String);
  return finish(`Which number of ${item} could ${name} have?`,[`${name} packs some ${item} into ${container} of ${a} and has none left.`,`${name} packs the same ${item} into ${container} of ${b} and also has none left.`],ans,`The number must be in the ${a} times table and in the ${b} times table.`,[{text:`The number must divide exactly by ${a} and by ${b}.`},{text:`Test the choices. ${onlyA} divides by ${a} but not by ${b}; ${onlyB} divides by ${b} but not by ${a}; ${neither} divides by neither.`,equation:`${onlyA} ÷ ${b}, ${onlyB} ÷ ${a} and ${neither} leave a remainder`},checkStep(ans)],{choices,unit:item});
 }
 const ans=r.pick(common(l,24,150)),top=Math.min(l-1,14),bottom=Math.min(4,l-1),d1=r.int(bottom,top),d2=r.int(bottom,top),lo=ans-d1,hi=ans+d2,range=between(lo,hi);
 const listA=range.filter(n=>n%a===0).join(', '),listB=range.filter(n=>n%b===0).join(', ');
 const steps=[{text:`The number must be in the ${a} times table and in the ${b} times table.`},{text:`List the numbers between ${lo} and ${hi} that divide exactly by each size.`,equation:`By ${a}: ${listA}. By ${b}: ${listB}.`},{text:`Only ${ans} is in both lists.`},checkStep(ans)];
 if(variant===0){
  const rest=range.filter(n=>n!==ans),near=rest.filter(n=>(n%a===0)!==(n%b===0)),others=rest.filter(n=>!near.includes(n));
  const wrong=[...r.shuffle(near),...r.shuffle(others)].slice(0,3),choices=[ans,...wrong].sort((p,q)=>p-q).map(String);
  return finish('Which number is it?',[`${name} thinks of a number between ${lo} and ${hi}.`,`When ${name} divides it by ${a}, there is no remainder.`,`When ${name} divides it by ${b}, there is no remainder.`],ans,`Look for a number in the ${a} times table and the ${b} times table that is between ${lo} and ${hi}.`,steps,{choices});
 }
 return finish(`How many ${item} does ${name} have?`,[`${name} has more than ${lo} ${item} but fewer than ${hi} ${item}.`,`The ${item} can be put into ${container} of ${a} with none left.`,`The same ${item} can also be put into ${container} of ${b} with none left.`],ans,`Look for a number in the ${a} times table and the ${b} times table between ${lo} and ${hi}.`,steps,{unit:item});
}
