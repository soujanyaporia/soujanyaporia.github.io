import { Rng,hashString } from '../engine/random';
import { numberValue } from '../primary/generate';
import type { Item } from './model';
/** A seeded random stream for one lesson item. */
export const rngFor=(lessonId:string,seed:number,index:number,salt='')=>new Rng(hashString(`${lessonId}:${salt}:${seed}:${index}`));
export const fmt=(n:number)=>Number(n.toFixed(6)).toString();
export const money=(n:number)=>'$'+n.toFixed(2);
/** House style for a numeral in prose: four digits run together (8084), five or more take commas (45,230). */
export const numeral=(n:number)=>Math.abs(n)>=10000?n.toLocaleString('en-SG'):fmt(n);
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
export const simplest=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
export const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
/** Choices: the answer plus distinct distractors, in a seeded order. */
export function choicesOf(r:Rng,answer:string,wrong:string[]){return r.shuffle([...new Set([answer,...wrong.filter(w=>w!==answer)])].slice(0,4));}
const NUMBER_WORDS=new Set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million'.split(' '));
/** Hyphens and the optional British “and” do not change the number being named. */
export function normaliseNumberWords(text:string):string|null{
 const tokens=text.trim().toLowerCase().replace(/[‐‑‒–—-]/g,' ').replace(/,/g,' ').replace(/\.$/,'').split(/\s+/).filter(t=>t&&t!=='and');
 return tokens.length&&tokens.every(t=>NUMBER_WORDS.has(t))?tokens.join(' '):null;
}
/** Is `input` the answer? Exact text for choices or `exact` items; otherwise equal numerical value. */
export function isCorrect(item:Pick<Item,'answer'|'choices'|'exact'>,input:string){
 const typed=input.trim();if(!typed)return false;
 if(item.exact&&!item.choices){const expected=normaliseNumberWords(item.answer);if(expected!==null)return normaliseNumberWords(typed)===expected;}
 if(item.choices||item.exact)return typed.replace(/\s+/g,'').toLowerCase()===item.answer.replace(/\s+/g,'').toLowerCase();
 const a=numberValue(item.answer),b=numberValue(typed.replace(/^\$/,'').replace(/%$/,''));
 return a!==null&&b!==null?Math.abs(a-b)<1e-9:typed.toLowerCase()===item.answer.toLowerCase();
}
/** Targeted feedback for a wrong answer, if the item names that answer. */
export function feedbackFor(item:Item,input:string){if(!item.wrong)return null;const v=numberValue(input.replace(/^\$/,'').replace(/%$/,''));for(const [wrong,text] of Object.entries(item.wrong)){const w=numberValue(wrong);if(input.trim()===wrong||(v!==null&&w!==null&&Math.abs(v-w)<1e-9))return text;}return null;}
