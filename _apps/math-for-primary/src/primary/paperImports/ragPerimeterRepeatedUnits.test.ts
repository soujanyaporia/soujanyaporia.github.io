import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragPerimeterRepeatedUnits';
import {correctAnswer,numberValue} from '../generate';

const seeds=Array.from({length:60},(_,i)=>i*7+1);
const kind=(prompt:string)=>prompt.includes('row of tables')?'tables':prompt.includes('figure?')?'squares':'polygon';

function solveTables(context:string[]):number{
 const dims=/(\d+(?:\.\d+)?) m long and (\d+(?:\.\d+)?) m wide/.exec(context[0])!;
 const length=Number(dims[1]),width=Number(dims[2]);
 const chairs=[...context[1].matchAll(/Figure (\d+) has (\d+) tables? and (\d+) chairs/g)].map(m=>[Number(m[2]),Number(m[3])]);
 const step=chairs[1][1]-chairs[0][1],target=Number(/uses (\d+) chairs/.exec(context[2])![1]);
 const tables=(target-chairs[0][1])/step+1;
 return 2*(tables*width+length);
}

function solveSquares(context:string[],cells:[number,number][]):number{
 const m=/(\d+) identical squares in a line measure (\d+) cm/.exec(context[0])!;
 const side=Number(m[2])/Number(m[1]);
 const rows=Math.max(...cells.map(c=>c[0]))+2,cols=Math.max(...cells.map(c=>c[1]))+2;
 const grid=Array.from({length:rows+1},()=>Array<number>(cols+1).fill(0));
 for(const [a,b] of cells)grid[a+1][b+1]=1;
 let edges=0;
 for(let a=0;a<=rows;a++)for(let b=0;b<cols;b++)if(grid[a][b]!==grid[a][b+1])edges++;
 for(let b=0;b<=cols;b++)for(let a=0;a<rows;a++)if(grid[a][b]!==grid[a+1][b])edges++;
 return edges*side;
}

function solvePolygon(context:string[]):number{
 const sides=Number(/all (\d+) sides/.exec(context[0])![1]);
 const f=/(\d+)\/(\d+) m long/.exec(context[0])!;
 return sides*Number(f[1])/Number(f[2]);
}

describe('P5 perimeter from repeated units',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-perimeter-repeated-units');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('is deterministic and uses all three variants',()=>{
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
  const kinds=new Set(seeds.map(s=>kind(makeRagQuestion(s,0).prompt)));
  expect(kinds).toEqual(new Set(['tables','squares','polygon']));
 });

 it('answers match an independent solution from the visible givens',()=>{
  for(const seed of seeds)for(const index of [0,1,2]){
   const q=makeRagQuestion(seed,index),context=q.context??[];
   const expected=kind(q.prompt)==='tables'?solveTables(context)
    :kind(q.prompt)==='squares'?solveSquares(context,(q.picture as {type:'net';cells:[number,number][]}).cells)
    :solvePolygon(context);
   expect(numberValue(q.answer)).not.toBeNull();
   expect(Math.abs(numberValue(q.answer)!-expected)).toBeLessThan(1e-9);
   expect(correctAnswer(q,q.answer)).toBe(true);
   expect(correctAnswer(q,'0')).toBe(false);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.unit).toBeTruthy();
  }
 });

 it('keeps the square figure connected, within the grid and valid',()=>{
  for(const seed of seeds){
   const q=makeRagQuestion(seed,0);
   if(kind(q.prompt)!=='squares')continue;
   const cells=(q.picture as {type:'net';cells:[number,number][]}).cells;
   const keys=new Set(cells.map(c=>c.join(',')));
   expect(keys.size).toBe(cells.length);
   const seen=new Set<string>([cells[0].join(',')]),queue=[cells[0]];
   while(queue.length){const [a,b]=queue.pop()!;for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${a+da},${b+db}`;if(keys.has(k)&&!seen.has(k)){seen.add(k);queue.push([a+da,b+db]);}}}
   expect(seen.size).toBe(cells.length);
   expect(cells.every(([a,b])=>a>=0&&b>=0&&b<=5)).toBe(true);
  }
 });

 it('requires a simplified mixed number for the polygon variant',()=>{
  let checked=0;
  for(const seed of seeds){
   const q=makeRagQuestion(seed,0);
   if(kind(q.prompt)!=='polygon')continue;
   const m=/^(\d+) (\d+)\/(\d+)$/.exec(q.answer)!;
   expect(m).not.toBeNull();
   const improper=`${Number(m[1])*Number(m[3])+Number(m[2])}/${m[3]}`;
   expect(correctAnswer(q,improper)).toBe(false);
   expect(correctAnswer(q,q.answer)).toBe(true);
   checked++;
  }
  expect(checked).toBeGreaterThan(0);
 });

 it('does not copy source wording',()=>{
  for(const seed of seeds){
   const q=makeRagQuestion(seed,0),text=[q.prompt,...(q.context??[]),q.explanation].join(' ');
   expect(text).not.toMatch(/restaurant|Maris|Tao Nan|Ai Tong|sgexam/i);
  }
 });
});
