/** Complete P4 source inventory; only fourteen entries needed a missing configuration. */
const rows:[string,number,string,string,string[],boolean][]=[
 ['1',2,'Complete a four-digit increasing pattern','constant-increasing-internal-gap',['P4.S.WN.05'],true],
 ['2',2,'Convert a mixed number to an improper fraction','mixed-to-improper-fraction',['P4.S.FRAC.02'],false],
 ['3',2,'Round to the nearest hundred','integer-round-power-ten',['P4.S.WN.02'],false],
 ['4',2,'Write a five-digit number in words','five-digit-number-name-zero-hundreds',['P4.S.WN.04'],true],
 ['5',3,'Find the least common multiple','least-common-multiple',['P4.S.FACT.03'],true],
 ['6',3,'Find a four-digit division remainder','four-digit-division-remainder',['P4.S.MD.03'],true],
 ['7',3,'Multiply four digits by one digit','four-digit-by-one-digit-product',['P4.S.MD.01'],true],
 ['8',4,'Subtract two fractions from one whole','fraction-complement-two-consumptions',['P4.S.FRAC.04'],true],
 ['9',4,'Identify two equivalent fractions','identify-equivalent-fraction-pair',['P3.S.FRAC.01'],true],
 ['10',5,'Find the remaining fraction of a quantity','fraction-complement-quantity',['P4.S.FRAC.03'],false],
 ['11',5,'Find a smaller quantity from a multiple and difference','multiplicative-comparison-difference-to-smaller',['P4.S.MD.03'],true],
 ['12a',6,'Complete a missing table part','table-row-missing-part',['P4.S.GRAPH.01','P4.S.GRAPH.04','P3.S.AS.01'],true],
 ['12b',6,'Complete a table total','table-row-total',['P4.S.GRAPH.01','P4.S.GRAPH.04','P3.S.AS.01'],true],
 ['13',7,'Give three distinct equal groupings','three-distinct-equal-groupings',['P4.S.FACT.01','P4.S.MD.03'],true],
 ['14',7,'Recover one of three related amounts','three-quantities-additive-offsets-total',['P4.S.MD.03','P3.S.AS.01'],false],
 ['15',8,'Recover a whole from two fractional parts','whole-from-two-fraction-difference',['P4.S.FRAC.03'],true],
 ['16a',9,'Find the greatest increase on a line graph','line-chart-largest-adjacent-increase',['P4.S.GRAPH.02'],true],
 ['16b',9,'Find a decrease on the same line graph','line-chart-difference',['P4.S.GRAPH.02'],true],
 ['17',10,'Recover a starting amount from equal remainders','equal-remainders-fraction-and-fixed-use',['P4.S.FRAC.03','P4.S.MD.03'],false],
];
export const BATCH6_MIDDLE_P4_PARTS=rows.map(([id,sourcePage,title,canonicalPatternId,skillIds,neededConfiguration])=>({id,sourceQuestion:id,sourcePage,title,canonicalPatternId,skillIds,neededConfiguration,level:4,paperId:'09144ff47dbdd61e'}));
