export type ColumnOperation='+'|'-';
export interface ColumnTool {kind:'column-algorithm';a:number;b:number;operation:ColumnOperation;step:number;hideValue?:boolean}
export interface ColumnStep {
 phase:'align'|'exchange'|'write'|'complete';column:number|null;text:string;equation?:string;
 top:number[];bottom:number[];result:(number|null)[];carry:number[];
 exchange?:{from:number;to:number};answer?:string;prompt?:string;
}
const PLACES=['ones','tens','hundreds','thousands','ten thousands'];
const SINGULAR=['one','ten','hundred','thousand','ten thousand'];
export const columnPlace=(width:number,column:number)=>PLACES[width-column-1]??`units of ${10**(width-column-1)}`;
export const columnValue=(digits:number[])=>digits.reduce((n,d)=>n*10+d,0);

/** One deterministic written algorithm. Every exchange preserves the value of the top row. */
export function columnSteps(a:number,b:number,operation:ColumnOperation):ColumnStep[]{
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>9999||b>9999||!['+','-'].includes(operation)||operation==='-'&&b>a)throw Error('Use non-negative whole numbers up to 9999 and a non-negative difference.');
 const answer=operation==='+'?a+b:a-b,width=Math.max(2,String(a).length,String(b).length,String(answer).length);
 const digits=(n:number)=>String(n).padStart(width,'0').split('').map(Number);
 const top=digits(a),bottom=digits(b),result:(number|null)[]=Array(width).fill(null),carry=Array(width).fill(0),steps:ColumnStep[]=[];
 const add=(s:Omit<ColumnStep,'top'|'bottom'|'result'|'carry'>)=>steps.push({...s,top:[...top],bottom:[...bottom],result:[...result],carry:[...carry]});
 add({phase:'align',column:width-1,text:'Line up ones under ones and tens under tens. Start on the right.',equation:`${a} ${operation==='+'?'+':'−'} ${b}`});
 for(let column=width-1;column>=0;column--){
  const place=columnPlace(width,column);
  // A leading result-only column needs no calculation until a carried unit arrives.
  if(column===0&&top[column]===0&&bottom[column]===0&&carry[column]===0){result[column]=0;continue;}
  if(operation==='+'){
   const incoming=carry[column],sum=top[column]+bottom[column]+incoming,digit=sum%10;
   result[column]=digit;
   if(sum>=10){
    carry[column-1]=Math.floor(sum/10);
    const next=SINGULAR[width-column]??columnPlace(width,column-1);
    add({phase:'exchange',column,exchange:{from:column,to:column-1},text:`${sum} ${place} make 1 ${next} and ${digit} ${place}. Write ${digit} here. Carry 1 to the next column.`,equation:`${top[column]} + ${bottom[column]}${incoming?' + '+incoming:''} = ${sum}`,prompt:`What digit do we write in the ${place} column?`,answer:String(digit)});
   }else{
    add({phase:'write',column,text:`Add the ${place}${incoming?', including the carried 1':''}. Write ${digit} in this column.`,equation:`${top[column]} + ${bottom[column]}${incoming?' + '+incoming:''} = ${sum}`,prompt:`What digit belongs in the ${place} column?`,answer:String(digit)});
   }
  }else{
   if(top[column]<bottom[column]){
    let donor=column-1;while(donor>=0&&top[donor]===0)donor--;
    if(donor<0)throw Error('No place available for the exchange.');
    // Passing through zero columns is a sequence of adjacent ten-for-one exchanges.
    for(let from=donor;from<column;from++){
     top[from]--;top[from+1]+=10;
     const larger=SINGULAR[width-from-1],smaller=columnPlace(width,from+1);
     add({phase:'exchange',column:from+1,exchange:{from,to:from+1},text:`Exchange 1 ${larger} for 10 ${smaller}. The top number still has the same value.`,equation:`1 ${larger} = 10 ${smaller}`});
    }
   }
   const digit=top[column]-bottom[column];result[column]=digit;
   add({phase:'write',column,text:`Now subtract the ${place}. Write ${digit} in this column.`,equation:`${top[column]} − ${bottom[column]} = ${digit}`,prompt:`What digit belongs in the ${place} column?`,answer:String(digit)});
  }
 }
 add({phase:'complete',column:null,text:operation==='+'?'Read the answer from left to right. Subtract one addend to check.':'Read the answer from left to right. Add back the amount taken away to check.',equation:operation==='+'?`${answer} − ${b} = ${a}`:`${answer} + ${b} = ${a}`});
 return steps;
}
