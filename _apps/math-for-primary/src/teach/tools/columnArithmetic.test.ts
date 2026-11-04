import {describe,expect,it} from 'vitest';
import {columnPlace,columnSteps,columnValue,type ColumnOperation,type ColumnStep} from './columnArithmetic';

// Weighted place values independently reconstruct the state; no generator proof/equation is used.
const value=(digits:(number|null)[])=>digits.reduce<number>((sum,digit,i)=>sum+(digit??0)*10**(digits.length-i-1),0);
const assert=(condition:boolean,message:string)=>{if(!condition)throw Error(message);};
function verify(a:number,b:number,operation:ColumnOperation){
 const steps=columnSteps(a,b,operation),answer=operation==='+'?a+b:a-b,width=steps[0].top.length;
 const where=`${a} ${operation} ${b}`;
 assert(steps[0].phase==='align',`${where}: must start with alignment`);
 assert(steps.at(-1)?.phase==='complete',`${where}: must finish with a check`);
 let previous:ColumnStep|undefined;
 for(const [index,step] of steps.entries()){
  const label=`${where}, step ${index} (${step.phase})`;
  assert([step.top,step.bottom,step.result,step.carry].every(row=>row.length===width),`${label}: unequal row widths`);
  assert(step.bottom.every(d=>Number.isInteger(d)&&d>=0&&d<=9),`${label}: invalid bottom digit`);
  assert(value(step.bottom)===b,`${label}: subtrahend/addend changed`);
  assert(step.top.every(d=>Number.isInteger(d)&&d>=0&&d<=(operation==='+'?9:18)),`${label}: invalid top place count`);
  assert(step.carry.every(d=>d===0||d===1),`${label}: carry must be zero or one`);
  assert(step.result.every(d=>d===null||Number.isInteger(d)&&d>=0&&d<=9),`${label}: result outside digit range`);
  for(const [column,digit] of step.result.entries())if(digit!==null){
   const expected=Math.floor(answer/10**(width-column-1))%10;
   assert(digit===expected,`${label}: digit ${column} is ${digit}, expected ${expected}`);
  }
  if(operation==='-'){
   assert(value(step.top)===a,`${label}: exchange changed the starting amount`);
   assert(step.carry.every(d=>d===0),`${label}: subtraction introduced an addition carry`);
   if(step.phase==='exchange'){
    assert(!!previous&&!!step.exchange,`${label}: exchange has no prior state/source`);
    const {from,to}=step.exchange!;
    assert(to===from+1&&from>=0&&to<width,`${label}: exchange must move to the adjacent smaller place`);
    step.top.forEach((digit,i)=>assert(digit===previous!.top[i]+(i===from?-1:i===to?10:0),`${label}: not a ten-for-one exchange`));
    assert(JSON.stringify(step.result)===JSON.stringify(previous!.result),`${label}: exchange wrote a result prematurely`);
   }
  }else{
   assert(value(step.top)===a,`${label}: addition changed an addend`);
   if(step.phase==='write'||step.phase==='exchange'){
    const column=step.column!;
    const unprocessed=step.top.reduce((sum,d,i)=>sum+(i<column?(d+step.bottom[i])*10**(width-i-1):0),0);
    const waitingCarry=column>0?step.carry[column-1]*10**(width-column):0;
    assert(unprocessed+waitingCarry+value(step.result)===answer,`${label}: carried unit or written digit was lost/duplicated`);
    if(step.exchange)assert(step.exchange.from===column&&step.exchange.to===column-1&&column>0,`${label}: carry is outside the next place`);
   }
  }
  if(step.answer!==undefined){
   assert(step.column!==null,`${label}: checkpoint has no column`);
   assert(step.answer===String(step.result[step.column!]),`${label}: checkpoint answer disagrees with the active digit`);
   assert(!!step.prompt?.includes(columnPlace(width,step.column!)),`${label}: checkpoint does not name its place`);
  }
  previous=step;
 }
 const final=steps.at(-1)!;
 assert(final.result.every(d=>d!==null),`${where}: final row is incomplete`);
 assert(value(final.result)===answer,`${where}: final answer is incorrect`);
 assert(final.equation===(operation==='+'?`${answer} − ${b} = ${a}`:`${answer} + ${b} = ${a}`),`${where}: inverse check is incorrect`);
 return steps;
}

describe('Written column arithmetic',()=>{
 it('exhaustively checks P1 additions and subtractions with operands/results within 100',()=>{
  let checked=0;
  for(let a=0;a<=100;a++)for(let b=0;b<=100;b++){
   if(a+b<=100){verify(a,b,'+');checked++;}
   if(b<=a){verify(a,b,'-');checked++;}
  }
  expect(checked).toBe(10302);
 });
 it('checks 8000 deterministic P2/P3 addition and subtraction samples',()=>{
  let state=0x73294a11;
  const next=(limit:number)=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%(limit+1);};
  for(const limit of [999,9999])for(let i=0;i<2000;i++){
   const a=next(limit),b=next(limit);
   verify(a,b,'+');verify(Math.max(a,b),Math.min(a,b),'-');
  }
 });
 it('exchanges across zero columns without creating or removing value',()=>{
  const hundred=verify(100,37,'-');
  expect(hundred.filter(s=>s.phase==='exchange').map(s=>s.top)).toEqual([[0,10,0],[0,9,10]]);
  expect(hundred.at(-1)?.result).toEqual([0,6,3]);
  const hundreds=verify(302,178,'-');
  expect(hundreds.filter(s=>s.phase==='exchange').map(s=>s.top)).toEqual([[2,10,2],[2,9,12]]);
  expect(hundreds.at(-1)?.result).toEqual([1,2,4]);
  for(const [a,b] of [[1000,37],[1000,999],[9000,1789],[1001,999],[9090,8989],[3020,1789]])verify(a,b,'-');
 });
 it('carries through consecutive columns and creates the leading result place',()=>{
  for(const [a,b] of [[9,1],[99,1],[999,1],[9999,1],[9999,9999],[587,768],[2509,7491]])verify(a,b,'+');
  expect(verify(9999,9999,'+').at(-1)?.result).toEqual([1,9,9,9,8]);
 });
 it('handles zero, equal operands and a much shorter second number',()=>{
  for(const n of [0,1,9,10,99,100,999,1000,9999]){
   verify(n,0,'+');verify(0,n,'+');verify(n,0,'-');verify(n,n,'-');
  }
  verify(9001,7,'-');verify(9001,7,'+');
 });
 it('keeps immutable snapshots instead of changing earlier teaching pictures',()=>{
  const steps=columnSteps(100,37,'-');
  expect(steps[0].top).toEqual([1,0,0]);expect(steps[0].result).toEqual([null,null,null]);
  for(let i=1;i<steps.length;i++)for(const key of ['top','bottom','result','carry'] as const)expect(steps[i][key]).not.toBe(steps[i-1][key]);
  const before=JSON.stringify(steps);columnSteps(9999,9999,'+');expect(JSON.stringify(steps)).toBe(before);
 });
 it('names places and values for nonstandard exchanged counts',()=>{
  expect(columnPlace(5,0)).toBe('ten thousands');expect(columnPlace(3,2)).toBe('ones');
  expect(columnValue([0,9,10])).toBe(100);expect(columnValue([2,9,12])).toBe(302);
 });
 it('rejects unsupported numbers, operations and negative differences',()=>{
  for(const [a,b] of [[-1,2],[2,-1],[.5,1],[1,.5],[10000,0],[0,10000],[NaN,1],[1,Infinity]])expect(()=>columnSteps(a,b,'+')).toThrow();
  expect(()=>columnSteps(3,8,'-')).toThrow();expect(()=>columnSteps(3,2,'*' as ColumnOperation)).toThrow();
 });
});
