import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragOverlapUnionRatioUnits';

const gcd=(x:number,y:number):number=>y?gcd(y,x%y):x;
type Kind='fraction'|'ratio'|'unshaded'|'union';
type Q=ReturnType<typeof makeRagQuestion>;
const kindOf=(q:Q):Kind=>{
 if(q.prompt.startsWith('What fraction'))return 'fraction';
 if(q.prompt.startsWith('What is the ratio'))return 'ratio';
 if(q.prompt==='Find the shaded area.')return 'unshaded';
 if(q.prompt.startsWith('Find the area of the'))return 'union';
 throw new Error('unknown prompt '+q.prompt);
};
// Independent solver: reads only the visible context and prompt.
function solve(q:Q):string{
 const text=(q.context??[]).join(' ');
 const kind=kindOf(q);
 if(kind==='union'){
  const m=/area of the (\w+) : shaded area : area of the (\w+) = (\d+) : (\d+) : (\d+)\./.exec(text);
  const whole=/whole figure has area (\d+) cm²/.exec(text);
  expect(m).not.toBeNull();expect(whole).not.toBeNull();
  const [first,second,A,o,B]=[m![1],m![2],Number(m![3]),Number(m![4]),Number(m![5])];
  const target=/Find the area of the (\w+)\./.exec(q.prompt)![1];
  const unitArea=Number(whole![1])/(A+B-o);
  expect(Number.isInteger(unitArea)).toBe(true);
  expect([first,second]).toContain(target);
  return String((target===first?A:B)*unitArea);
 }
 const ratios=[...text.matchAll(/Shaded area : area of the (\w+) = (\d+) : (\d+)\./g)];
 expect(ratios.length).toBe(2);
 const [p1,q1,p2,q2]=[Number(ratios[0][2]),Number(ratios[0][3]),Number(ratios[1][2]),Number(ratios[1][3])];
 // Scale the shaded part to p1*p2 units in both ratios.
 const o=p1*p2,A=q1*p2,B=q2*p1,union=A+B-o,unshaded=A+B-2*o;
 if(kind==='fraction'){const g=gcd(o,union);return `${o/g}/${union/g}`;}
 if(kind==='ratio'){const g=gcd(o,unshaded);return `${o/g}:${unshaded/g}`;}
 const given=Number(/not shaded has area (\d+) cm²/.exec(text)![1]);
 return String(given*o/unshaded);
}

describe('ragOverlapUnionRatioUnits',()=>{
 it('exports consistent metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-overlap-union-ratio-units');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P6\.S\.RATIO\.0[1-5]$/);
 });
 it('uses all four variants and is deterministic',()=>{
  const kinds=new Set<Kind>();
  for(let i=0;i<12;i++){
   const q=makeRagQuestion(7,i);kinds.add(kindOf(q));
   expect(JSON.stringify(makeRagQuestion(7,i))).toBe(JSON.stringify(q));
  }
  expect([...kinds].sort()).toEqual(['fraction','ratio','union','unshaded']);
 });
 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let i=0;i<16;i++){
   const q=makeRagQuestion(seed,i);
   expect(q.answer).toBe(solve(q));
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.explanation.length).toBeGreaterThan(0);
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(3);
  }
 });
 it('keeps answers well formed and in bounds',()=>{
  for(let seed=1;seed<=40;seed++)for(let i=0;i<16;i++){
   const q=makeRagQuestion(seed,i),kind=kindOf(q);
   if(kind==='fraction'){
    const m=/^(\d+)\/(\d+)$/.exec(q.answer);expect(m).not.toBeNull();
    const n=Number(m![1]),d=Number(m![2]);expect(gcd(n,d)).toBe(1);expect(n).toBeLessThan(d);expect(q.requireSimplified).toBe(true);
   }else if(kind==='ratio'){
    expect(q.choices).toBeDefined();expect(q.choices!.length).toBe(4);
    expect(new Set(q.choices).size).toBe(4);expect(q.choices).toContain(q.answer);
    const m=/^(\d+):(\d+)$/.exec(q.answer);expect(m).not.toBeNull();expect(gcd(Number(m![1]),Number(m![2]))).toBe(1);
   }else{
    expect(Number.isInteger(Number(q.answer))).toBe(true);expect(Number(q.answer)).toBeGreaterThan(0);expect(q.unit).toBe('cm²');
   }
  }
 });
});
