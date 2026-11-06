import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragCubePacking';

/** Independent solver: reads only the visible context text, not the stored answer. */
function solveVisible(context:string[]|undefined){
 const text=(context??[]).join(' ');
 const edgeMatch=/edges of (\d+) cm/.exec(text);
 if(!edgeMatch)throw new Error('no cube edge');
 const edge=Number(edgeMatch[1]);
 let dims:number[];
 const a=/(\d+) cm long, (\d+) cm wide and (\d+) cm high/.exec(text);
 const b=/base of a crate is (\d+) cm by (\d+) cm\. The crate is (\d+) cm high/.exec(text);
 const m=a??b;
 if(!m)throw new Error('no dimensions');
 dims=[Number(m[1]),Number(m[2]),Number(m[3])];
 let total=1;
 for(const d of dims)total*=Math.floor(d/edge);
 return {edge,dims,total};
}

describe('axis-aligned cube packing',()=>{
 it('has the required pattern metadata',()=>{
 expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
 expect(RAG_PATTERN.level).toBe(5);
 expect(RAG_PATTERN.canonicalPatternId).toBe('p5-axis-aligned-cube-packing');
 expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P5\.S\.VOL\.0[1-5]$/);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
 const variantsSeen=new Set<string>();
 for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
  const q=makeRagQuestion(seed,index);
  const {edge,dims,total}=solveVisible(q.context);
  expect(q.answer).toBe(String(total));
  expect([2,3,4,5]).toContain(edge);
  for(const d of dims){expect(d).toBeGreaterThanOrEqual(2*edge);expect(d).toBeLessThanOrEqual(40);}
  expect(dims.some(d=>d%edge!==0)).toBe(true);
  expect(total).toBeGreaterThanOrEqual(6);
  expect(total).toBeLessThanOrEqual(250);
  expect(q.picture).toEqual({type:'solid',shape:'cuboid',a:dims[0],b:dims[1],c:dims[2]});
  expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
  expect(q.workedSteps?.at(-1)?.equation).toContain(`= ${total}`);
  expect(q.hint.length).toBeGreaterThan(10);
  variantsSeen.add(q.prompt);
 }
 expect(variantsSeen.size).toBe(3);
 });

 it('is deterministic and differs from simple volume division in some cases',()=>{
 expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
 let different=0;
 for(let seed=1;seed<=60;seed++){
  const q=makeRagQuestion(seed,0);
  const {edge,dims,total}=solveVisible(q.context);
  if(Math.floor((dims[0]*dims[1]*dims[2])/(edge**3))!==total)different++;
 }
 expect(different).toBeGreaterThan(0);
 });
});
