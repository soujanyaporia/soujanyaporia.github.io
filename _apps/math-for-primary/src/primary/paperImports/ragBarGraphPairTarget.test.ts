import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragBarGraphPairTarget';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

type Bars={type:'bars';labels:string[];values:number[];scale:number};

/** Solves from visible prompt and graph only; never reads q.answer. */
function solve(q:Question):string[][]{
 const pic=q.picture as Bars;
 const nums=q.prompt.match(/\d+/g);
 const targetIndex=nums?-1:pic.labels.findIndex(l=>new RegExp(`\\b${l}\\b`).test(q.prompt));
 const target=nums?Number(nums[0]):pic.values[targetIndex];
 const found:string[][]=[];
 for(let i=0;i<pic.labels.length;i++)for(let j=i+1;j<pic.labels.length;j++){
  if(i!==targetIndex&&j!==targetIndex&&pic.values[i]+pic.values[j]===target)found.push([pic.labels[i],pic.labels[j]].sort());
 }
 return found;
}

describe('bar graph pair with target sum',()=>{
 it('has valid metadata and curriculum skills',()=>{
  expect(RAG_PATTERN.level).toBe(3);
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p3-')).toBe(true);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('has exactly one visible pair and accepts it in either order',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),found=solve(q);
   expect(found).toHaveLength(1);
   const [a,b]=found[0];
   expect(correctAnswer(q,JSON.stringify([a,b]))).toBe(true);
   expect(correctAnswer(q,JSON.stringify([b,a]))).toBe(true);
   const pic=q.picture as Bars;
   const wrong=pic.labels.find(l=>l!==a&&l!==b)!;
   expect(correctAnswer(q,JSON.stringify([a,wrong]))).toBe(false);
   expect(correctAnswer(q,JSON.stringify([a,a]))).toBe(false);
  }
 });

 it('uses valid graph givens and never pairs the target bar with itself',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),pic=q.picture as Bars;
   expect(pic.type).toBe('bars');
   expect(pic.labels.length).toBeGreaterThanOrEqual(5);
   expect(new Set(pic.labels).size).toBe(pic.labels.length);
   expect(pic.values.every(v=>v>0&&v%pic.scale===0)).toBe(true);
   expect(q.structuredResponse).toEqual({kind:'named-pair',options:pic.labels});
   const targetLabel=pic.labels.find(l=>new RegExp(`\\b${l}\\b`).test(q.prompt));
   if(targetLabel)expect(JSON.parse(q.answer)).not.toContain(targetLabel);
  }
 });

 it('is deterministic and covers both modes and both themes',()=>{
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  const modes=new Set<string>(),themes=new Set<string>();
  for(let seed=1;seed<=40;seed++){
   const q=makeRagQuestion(seed,0);
   modes.add(/\d/.test(q.prompt)?'total':'target');
   themes.add(q.context![0]);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(0);
  }
  expect(modes.size).toBe(2);
  expect(themes.size).toBe(2);
 });
});
