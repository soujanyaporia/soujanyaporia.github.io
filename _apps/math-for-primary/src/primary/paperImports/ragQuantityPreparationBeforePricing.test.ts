import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragQuantityPreparationBeforePricing';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

const grab=(text:string,re:RegExp):string[]=>{const m=re.exec(text);if(!m)throw new Error(`Missing given: ${re}`);return m.slice(1);};
const centsOf=(s:string)=>Math.round(Number(s)*100);
type Kind='attendance'|'printers'|'stock';
const kindOf=(ctx:string):Kind=>ctx.includes('Tickets for')?'attendance':ctx.includes('Printer A')?'printers':'stock';

// Independent solvers: they read only the visible context text.
function solveAttendance(ctx:string):string[]{
 const ticket=Number(grab(ctx,/cost \$(\d+) each/)[0]),gap=Number(grab(ctx,/(\d+) more children than adults/)[0]);
 const up=Number(grab(ctx,/children was (\d+)% more/)[0]),down=Number(grab(ctx,/adults was (\d+)% less/)[0]),second=Number(grab(ctx,/total of (\d+) people/)[0]);
 for(let adults=1;adults<=20000;adults++){
  const children=adults+gap;
  if(children*(100+up)+adults*(100-down)===second*100)return [String(adults),String(ticket*(adults+children+second))];
 }
 throw new Error('No attendance solution');
}
function solvePrinters(ctx:string):string[]{
 const gap=Number(grab(ctx,/Printer A prints (\d+) more brochures/)[0]),waste=Number(grab(ctx,/and (\d+) brochures from each printer are thrown away/)[0]);
 const [a,b]=grab(ctx,/Printer A makes (\d+) good brochures and Printer B makes (\d+) good ones/).map(Number);
 const cost=centsOf(grab(ctx,/costs \$(\d+\.\d{2})/)[0]);
 for(let months=1;months<=200;months++){
  if(a%months===0&&b%months===0&&a/months-b/months===gap){
   const printed=a/months+waste+b/months+waste;
   return [String(months),((printed*cost)/100).toFixed(2)];
  }
 }
 throw new Error('No printer solution');
}
function solveStock(ctx:string):string{
 const start=Number(grab(ctx,/has (\d+) /)[0]),removed=Number(grab(ctx,/(\d+) of them are given away/)[0]);
 const [pack,price]=grab(ctx,/packs of (\d+) for \$(\d+\.\d{2})/);
 const rest=start-removed;
 expect(rest%Number(pack)).toBe(0);
 return ((rest/Number(pack))*centsOf(price)/100).toFixed(2);
}

describe('rag quantity preparation before pricing',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toMatch(/^p5-[a-z0-9-]+$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/Nanyang|Raffles|Henry Park|sgexam/i);
 });

 it('solves every variant from the visible givens across seeds',()=>{
  const seen=new Set<Kind>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),ctx=(q.context??[]).join(' '),kind=kindOf(ctx);
   seen.add(kind);
   expect(q.workedSteps?.length).toBeGreaterThan(1);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
   if(kind==='stock'){
    expect(q.structuredResponse).toBeUndefined();
    expect(q.unit).toBe('dollars');
    expect(Number(q.answer)).toBeCloseTo(Number(solveStock(ctx)),6);
   }else{
    const expected=kind==='attendance'?solveAttendance(ctx):solvePrinters(ctx);
    const spec=q.structuredResponse!;
    expect(spec.kind).toBe('number-fields');
    const stored=JSON.parse(q.answer) as string[];
    expect(Number(stored[0])).toBe(Number(expected[0]));
    expect(Number(stored[1])).toBeCloseTo(Number(expected[1]),6);
    expect(structuredResponseCorrect(spec,q.answer,JSON.stringify(expected))).toBe(true);
    expect(structuredResponseCorrect(spec,q.answer,JSON.stringify([String(Number(expected[0])+1),expected[1]]))).toBe(false);
    expect(structuredResponseCorrect(spec,q.answer,JSON.stringify([expected[0],String(Number(expected[1])+1)]))).toBe(false);
   }
  }
  expect(seen.size).toBe(3);
 });

 it('keeps givens whole-number and sensible',()=>{
  for(let seed=1;seed<=80;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),ctx=(q.context??[]).join(' ');
   for(const m of ctx.matchAll(/\b(\d+) (?:people|brochures|more children)/g))expect(Number.isInteger(Number(m[1]))).toBe(true);
   const kind=kindOf(ctx);
   if(kind==='attendance'){const [adults,total]=solveAttendance(ctx).map(Number);expect(adults).toBeGreaterThan(0);expect(total).toBeGreaterThan(0);}
   if(kind==='printers'){const [months,cost]=solvePrinters(ctx).map(Number);expect(Number.isInteger(months)).toBe(true);expect(cost).toBeGreaterThan(0);}
  }
 });

 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set<string>();
  for(let seed=1;seed<=60;seed++){const q=makeRagQuestion(seed,0);prompts.add(JSON.stringify([q.prompt,q.context]));}
  expect(prompts.size).toBeGreaterThan(40);
  expect(makeRagQuestion(3,0).key).not.toBe(makeRagQuestion(3,1).key);
 });
});
