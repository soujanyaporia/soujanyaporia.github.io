/** Keyboard alternative to touching one cell in a dense grid. */
export function gridNext(index:number,key:string,columns:number,count:number):number|null {
  const moves:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns};
  if(key==='Home')return 0;
  if(key==='End')return count-1;
  return key in moves?Math.max(0,Math.min(count-1,index+moves[key])):null;
}
