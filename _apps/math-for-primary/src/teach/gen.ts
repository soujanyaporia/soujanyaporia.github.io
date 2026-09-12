import { Rng,hashString } from '../engine/random';
import { numberValue } from '../primary/generate';
import type { Item } from './model';
/** A seeded random stream for one lesson item. */
export const rngFor=(lessonId:string,seed:number,index:number,salt='')=>new Rng(hashString(`${lessonId}:${salt}:${seed}:${index}`));
export const fmt=(n:number)=>Number(n.toFixed(6)).toString();
export const money=(n:number)=>'$'+n.toFixed(2);
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
export const simplest=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
export const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
/** Choices: the answer plus distinct distractors, in a seeded order. */
export function choicesOf(r:Rng,answer:string,wrong:string[]){return r.shuffle([...new Set([answer,...wrong.filter(w=>w!==answer)])].slice(0,4));}
/** Is `input` the answer? Exact text for choices or `exact` items; otherwise equal numerical value. */
export function isCorrect(item:Pick<Item,'answer'|'choices'|'exact'>,input:string){
 const typed=input.trim();if(!typed)return false;
 if(item.choices||item.exact)return typed.replace(/\s+/g,'').toLowerCase()===item.answer.replace(/\s+/g,'').toLowerCase();
 const a=numberValue(item.answer),b=numberValue(typed.replace(/^\$/,'').replace(/%$/,''));
 return a!==null&&b!==null?Math.abs(a-b)<1e-9:typed.toLowerCase()===item.answer.toLowerCase();
}
/** Targeted feedback for a wrong answer, if the item names that answer. */
export function feedbackFor(item:Item,input:string){if(!item.wrong)return null;const v=numberValue(input.replace(/^\$/,'').replace(/%$/,''));for(const [wrong,text] of Object.entries(item.wrong)){const w=numberValue(wrong);if(input.trim()===wrong||(v!==null&&w!==null&&Math.abs(v-w)<1e-9))return text;}return null;}
