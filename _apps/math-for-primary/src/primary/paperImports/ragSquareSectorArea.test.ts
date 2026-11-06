import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragSquareSectorArea';

type Q=ReturnType<typeof makeRagQuestion>;
const PI=3.14;
const kindOf=(q:Q)=>{
 const t=(q.context??[]).join(' ');
 if(t.includes('touch the circle')&&t.includes('inside a circle'))return 'square-in-circle';
 if(t.includes('fits exactly inside a square'))return 'circle-in-square';
 if(t.includes('three-quarter circle'))return 'three-quarter';
 if(t.includes('OABC'))return 'corner-quadrant';
 throw new Error('unknown variant: '+t);
};
/** Independent solver: uses only the visible context and prompt, never the stored answer. */
const solve=(q:Q):number=>{
 const t=(q.context??[]).join(' ');
 const m=/area of the square is (\d+) cm²/.exec(t);
 if(!m)throw new Error('no area given');
 const area=Number(m[1]);
 switch(kindOf(q)){
  case 'square-in-circle':return PI*(area/2)-area;
  case 'circle-in-square':{const side=Math.sqrt(area),radius=side/2;return area-PI*radius*radius;}
  case 'three-quarter':return area+0.75*PI*area;
  case 'corner-quadrant':return area-0.25*PI*area;
 }
};

describe('square and sector area pattern',()=>{
 it('has consistent metadata without source text',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-square-and-sector-area');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(['P6.S.CIRCLE.01','P6.S.CIRCLE.02','P6.S.CIRCLE.03']).toContain(id);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/sgexam|Nanyang|Swastika/i);
 });

 it('answers match an independent solution of the visible givens across seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(Number(q.answer)).toBeCloseTo(solve(q),6);
   expect(q.unit).toBe('cm²');
   expect(/^\d+(\.\d{1,2})?$/.test(q.answer)).toBe(true);
   expect(q.context?.join(' ')).toContain('π = 3.14');
  }
 });

 it('covers all four variants in four consecutive indices and varies the givens',()=>{
  const kinds=new Set([0,1,2,3].map(i=>kindOf(makeRagQuestion(5,i))));
  expect(kinds.size).toBe(4);
  const areas=new Set<string>();
  for(let seed=1;seed<=30;seed++)areas.add(/area of the square is (\d+)/.exec((makeRagQuestion(seed,0).context??[]).join(' '))![1]);
  expect(areas.size).toBeGreaterThanOrEqual(5);
 });

 it('shaded answers are positive and smaller than the square where the square is the whole',()=>{
  for(let seed=1;seed<=30;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),area=Number(/area of the square is (\d+)/.exec((q.context??[]).join(' '))![1]),a=Number(q.answer);
   expect(a).toBeGreaterThan(0);
   if(kindOf(q)==='circle-in-square'||kindOf(q)==='corner-quadrant')expect(a).toBeLessThan(area);
   if(kindOf(q)==='three-quarter')expect(a).toBeGreaterThan(area);
  }
 });

 it('supplies a diagram showing the given area, hint, steps and a final step that states the answer',()=>{
  for(let index=0;index<4;index++){
   const q=makeRagQuestion(9,index),area=/area of the square is (\d+)/.exec((q.context??[]).join(' '))![1];
   expect(q.picture).toBeDefined();
   expect(JSON.stringify(q.picture)).toContain(`${area} cm²`);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.workedSteps![q.workedSteps!.length-1].text).toContain(q.answer);
   expect(q.prompt).toMatch(/^Find the area/);
  }
 });

 it('is deterministic for the same seed and index',()=>{
  expect(makeRagQuestion(12,3)).toEqual(makeRagQuestion(12,3));
  expect(makeRagQuestion(12,3).key).not.toBe(makeRagQuestion(12,4).key);
 });
});
