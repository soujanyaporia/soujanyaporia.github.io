/** Use a complete rectangle: a row with empty grid slots falsely adds unpartitioned area to a whole. */
export function fractionColumns(parts:number):number{
 if(parts===100)return 10;
 for(let columns=Math.min(6,parts);columns>=1;columns--)if(parts%columns===0)return columns;
 return 1;
}
