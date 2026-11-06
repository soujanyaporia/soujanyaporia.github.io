import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragCombiningSubgroups';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import type {Question} from '../generate';

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const simplify=(a:number,b:number):[number,number]=>{const g=gcd(a,b);return [a/g,b/g];};
const ctx=(q:Question)=>(q.context??[]).join(' ');
const kindOf=(q:Question)=>/to the total number of children/.test(q.prompt)?'equal':/who wear glasses to the number of girls/.test(q.prompt)?'subgroup':/^How many girls/.test(q.prompt)?'total':'unknown';

function solveEqual(q:Question):[number,number]{
 const ratios=[...ctx(q).matchAll(/ratio of boys to girls is (\d+) : (\d+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 expect(ratios).toHaveLength(2);
 const i=/number of (boys|girls) to the total/.exec(q.prompt)![1]==='boys'?0:1;
 const [x,y]=ratios;
 return simplify(x[i]*(y[0]+y[1])+y[i]*(x[0]+x[1]),2*(x[0]+x[1])*(y[0]+y[1]));
}
function solveSubgroup(q:Question):[number,number]{
 const c=ctx(q),ratio=/boys to the number of girls is (\d+) : (\d+)/.exec(c)!,b=/(\d+)\/(\d+) of the boys/.exec(c)!,g=/(\d+)\/(\d+) of the girls/.exec(c)!;
 const [m,n,p1,d1,p2,d2]=[ratio[1],ratio[2],b[1],b[2],g[1],g[2]].map(Number);
 return simplify(m*p1*d2,n*p2*d1);
}
function solveTotal(q:Question):number{
 const c=ctx(q),k=Number(/girls is (\d+) times/.exec(c)![1]),f=/(\d+)\/(\d+) are girls/.exec(c)!,w=/(\d+) girls and (\d+) boys do not wear glasses/.exec(c)!;
 const p=Number(f[1]),n=Number(f[2]),G0=Number(w[1]),B0=Number(w[2]);
 const solutions:number[]=[];
 for(let boys=1;boys<=5000;boys++){
  const girls=k*boys,gGlasses=girls-G0,bGlasses=boys-B0;
  if(gGlasses>0&&bGlasses>0&&gGlasses*n===p*(gGlasses+bGlasses))solutions.push(girls);
 }
 expect(solutions).toHaveLength(1);
 return solutions[0];
}

describe('RAG combining subgroup compositions',()=>{
 it('declares matching metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-combining-subgroup-compositions');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('answers match an independent solution of the visible givens across seeds',()=>{
  const seen=new Set<string>();
  for(let seed=0;seed<150;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),kind=kindOf(q);
   seen.add(kind);
   expect(kind).not.toBe('unknown');
   if(kind==='total'){
    expect(Number(q.answer)).toBe(solveTotal(q));
    expect(q.unit).toBe('girls');
    expect(q.workedSteps!.at(-1)!.equation).toMatch(new RegExp(`= ${q.answer}$`));
   }else{
    const [a,b]=kind==='equal'?solveEqual(q):solveSubgroup(q);
    expect(JSON.parse(q.answer)).toEqual([String(a),String(b)]);
    expect(gcd(a,b)).toBe(1);
    expect(q.structuredResponse?.kind).toBe('number-pair');
    expect(q.workedSteps!.at(-1)!.equation).toContain(`${a} : ${b}`);
   }
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.prompt).not.toContain(q.answer);
  }
  expect([...seen].sort()).toEqual(['equal','subgroup','total']);
 });

 it('is deterministic and varies across indexes',()=>{
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
  const prompts=new Set(Array.from({length:30},(_,i)=>JSON.stringify([makeRagQuestion(3,i).prompt,makeRagQuestion(3,i).context])));
  expect(prompts.size).toBeGreaterThan(10);
 });

 it('keeps givens in valid bounds',()=>{
  for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   if(kindOf(q)==='equal'){
    const nums=[...ctx(q).matchAll(/is (\d+) : (\d+)/g)].flatMap(m=>[Number(m[1]),Number(m[2])]);
    expect(nums).toHaveLength(4);
    expect(nums.every(v=>v>=1&&v<=6)).toBe(true);
    expect(nums[0]+nums[1]).not.toBe(nums[2]+nums[3]);
   }
   if(kindOf(q)==='total'){
    const w=/(\d+) girls and (\d+) boys/.exec(ctx(q))!;
    expect(Number(w[1])).toBeGreaterThan(0);
    expect(Number(w[2])).toBeGreaterThan(0);
   }
  }
 });

 it('accepts only the simplest-form pair for ratio responses',()=>{
  const q=makeRagQuestion(0,0),spec=q.structuredResponse!,[a,b]=JSON.parse(q.answer) as string[];
  expect(structuredResponseCorrect(spec,q.answer,JSON.stringify([a,b]))).toBe(true);
  expect(structuredResponseCorrect(spec,q.answer,JSON.stringify([String(Number(a)*2),String(Number(b)*2)]))).toBe(false);
 });
});
