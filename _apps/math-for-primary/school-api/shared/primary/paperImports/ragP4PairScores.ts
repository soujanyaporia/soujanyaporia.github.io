import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p4-three-pairwise-region-scores',level:4,title:'Find the points for a target region',
 objective:'Use the scores for three different pairs to find the value of one region.',
 skillIds:['P3.S.AS.01','P4.S.MD.03'],canonicalPatternId:'three-pairwise-sums-find-common-value',
};

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const a=r.int(12,80),b=r.int(12,80),c=r.int(12,80);
 // Do not reproduce the source's three region values.
 if(a===80&&b===45&&c===20)return makeRagQuestion(seed,index+1);
 const ab=a+b,bc=b+c,ac=a+c;
 const workedSteps=[
  {text:'Add Mira’s and Noor’s scores. This includes one hit in A, two hits in B and one hit in C.',equation:`${ab} + ${bc} = ${ab+bc}`},
  {text:'Subtract Vik’s score for A and C. The result is the score for two hits in B.',equation:`${ab+bc} − ${ac} = ${2*b}`},
  {text:'Divide by two to find the score for one hit in B.',equation:`${2*b} ÷ 2 = ${b} points`},
 ];
 return {key:`${RAG_PATTERN.id}:${seed}:${index}`,
  context:['A fair game awards a fixed number of points for each hit in region A, B or C. Each player hits exactly the two regions shown.'],
  prompt:'How many points does one hit in region B earn?',
  picture:{type:'paper',layout:'cards',heading:'Two-hit scores',cards:[{label:'Mira: A and B',value:`${ab} points`},{label:'Noor: B and C',value:`${bc} points`},{label:'Vik: A and C',value:`${ac} points`}]},
  answer:String(b),unit:'points',hint:'Add the two scores that contain B, then remove the score for A and C.',
  workedSteps,explanation:workedSteps.map(s=>`${s.text} ${s.equation}`).join(' ')};
}
