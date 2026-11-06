import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p1-pictured-group-expression-check',
 level:1,
 title:'Check sentences against pictured groups',
 objective:'Count equal groups and the items in each group, then choose or reject a sentence that represents the total.',
 skillIds:['P1.S.MD.01'],
 canonicalPatternId:'p1-pictured-group-expression-check',
};

const PLURAL=['','','twos','threes','fours','fives','sixes','sevens','eights','nines'];
type Option={text:string;value:number};

/** All of these sentences have the value groups x size. */
function equalSentences(g:number,s:number):Option[]{
 const total=g*s;
 return [
  {text:`${g} × ${s}`,value:total},
  {text:`${s} × ${g}`,value:total},
  {text:`${g} groups of ${s}`,value:total},
  {text:`${s} groups of ${g}`,value:total},
  {text:`${g} ${PLURAL[s]}`,value:total},
  {text:`${s} ${PLURAL[g]}`,value:total},
  {text:Array(g).fill(s).join(' + '),value:total},
 ];
}

/** Plausible but different sentences. g and s are always different, so none equals the total. */
function differentSentences(g:number,s:number):Option[]{
 const total=g*s;
 const all:Option[]=[
  {text:`${g} + ${s}`,value:g+s},
  {text:`${s} × ${s}`,value:s*s},
  {text:`${g} × ${g}`,value:g*g},
  {text:`${g} groups of ${g}`,value:g*g},
  {text:`${s} groups of ${s}`,value:s*s},
 ];
 const seen=new Set<string>();
 return all.filter(o=>o.value!==total&&!seen.has(o.text)&&seen.add(o.text));
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p1-pictured-group-expression:${seed}:${index}`));
 const pairs:[number,number][]=[];
 for(let g=2;g<=5;g++)for(let s=2;s<=9;s++)if(g!==s&&g*s<=40)pairs.push([g,s]);
 const [g,s]=r.pick(pairs),total=g*s;
 const unequalVariant=(((Math.trunc(seed)+index)%2)+2)%2===0;
 const equal=equalSentences(g,s),different=differentSentences(g,s);
 const picture:Question['picture']={type:'counters',count:total,group:s};
 const context=['The counters are arranged in equal groups.'];
 const countSteps=[
  {text:'Count the equal groups and the counters in one group.',equation:`${g} groups of ${s}`,picture},
  {text:'Multiply to find the total number of counters.',equation:`${g} × ${s} = ${total}`,picture},
 ];
 if(unequalVariant){
  const shown=r.shuffle(equal).slice(0,3),odd=r.pick(different);
  const choices=r.shuffle([...shown,odd].map(o=>o.text));
  return {
   key:`${RAG_PATTERN.id}:${seed}:${index}`,
   prompt:'Which sentence does NOT show the total number of counters?',
   context,picture,choices,answer:odd.text,
   hint:'Find the total first. Work out what each sentence is worth. Look for the one that is different.',
   workedSteps:[
    ...countSteps,
    {text:'Check the other sentences. Turning the groups round or adding the same number again keeps the same total.',equation:shown.map(o=>`${o.text} = ${total}`).join('; '),picture},
    {text:'One sentence has a different value, so it does not show the total.',equation:`${odd.text} = ${odd.value}, not ${total}`,picture},
   ],
   explanation:`There are ${g} groups of ${s}, which is ${total} counters. The sentence ${odd.text} is worth ${odd.value}, so it does not show the total.`,
  };
 }
 const right=r.pick(equal),wrong=r.shuffle(different).slice(0,3);
 const choices=r.shuffle([right,...wrong].map(o=>o.text));
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  prompt:'Which sentence matches the counters in the picture?',
  context,picture,choices,answer:right.text,
  hint:'Count the groups and how many are in each group. Then check each sentence.',
  workedSteps:[
   ...countSteps,
   {text:'Choose the sentence that has this same total.',equation:`${right.text} = ${total}`,picture},
  ],
  explanation:`There are ${g} groups of ${s}, which is ${total} counters. ${right.text} is worth ${total}. The other sentences have different values.`,
 };
}
