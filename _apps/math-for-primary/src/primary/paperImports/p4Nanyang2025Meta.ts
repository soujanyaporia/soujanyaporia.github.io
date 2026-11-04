/** Pure inventory: complete 2025 Nanyang P4 WA2, not an end-of-year paper. */
export type NanyangPart={id:string;sourceQuestion:string;sourcePage:number;title:string;skillIds:string[];canonicalPatternId:string};
const row=(id:string,sourcePage:number,title:string,canonicalPatternId:string,...skillIds:string[]):NanyangPart=>({id,sourceQuestion:id,sourcePage,title,canonicalPatternId,skillIds});
export const NANYANG_2025_PARTS:NanyangPart[]=[
 row('1',1,'A fraction of separate objects','fraction-of-set-identify','P4.S.FRAC.03'),
 row('2',2,'Find a missing table entry','table-missing-part','P4.S.GRAPH.01','P3.S.AS.01'),
 row('3',2,'Read a table and find one equal unit','table-unitary-remainder','P4.S.GRAPH.01','P3.S.AS.01','P4.S.MD.03'),
 row('4',3,'Compare points on a line graph','line-graph-difference','P4.S.GRAPH.02'),
 row('5',3,'Money left after spending a fraction','fraction-complement-quantity','P4.S.FRAC.03'),
 row('6a',4,'Two fractional masses exceed a whole','fraction-pair-threshold','P4.S.FRAC.04'),
 row('6b',4,'Subtract a fraction from a whole number','whole-minus-fraction','P4.S.FRAC.04'),
 row('7',4,'Compare volumes, then combine them','fraction-comparison-then-total','P4.S.FRAC.01','P4.S.FRAC.04'),
 row('8a',5,'Subtract unlike fractional lengths','fraction-smaller-from-difference','P4.S.FRAC.04'),
 row('8b',5,'Use two fractional length differences','fraction-two-comparisons','P4.S.FRAC.04'),
 row('9a',6,'Find a quantity from a fractional difference','fraction-difference-to-category','P4.S.FRAC.03'),
 row('9b',6,'Find the whole from a fractional difference','fraction-difference-to-whole','P4.S.FRAC.03'),
];
