/** Selected linked source tasks. Original variants; no whole-paper or unique-pattern census claim. */
const rows=[
 ['coin-shortfall',3,'Count coins and recover a price','Count mixed coin values, then use a shortfall to recover the full price.',['P3.S.MONEY.01'],'mixed-coins-total-then-shortfall-price-pair','f624e30d35056b6c','40(a),(b)',16],
 ['compare-shortfall',3,'Compare prices and find missing money','Distinguish a price difference from the shortfall for buying both items.',['P3.S.MONEY.01'],'price-difference-and-two-item-shortfall-pair','7dc32380d646f2df','35(a),(b)',17],
 ['compound-mass-share',3,'Remove a box before sharing a mass','Convert a compound mass, remove the container and share the contents.',['P3.S.MEASURE.02','P3.S.MEASURE.03','P3.S.MD.04'],'compound-mass-less-container-then-unit-mass-pair','86a2c3bf3ccbe3c7','36(a),(b)',17],
 ['working-hours',3,'Find daily and several weeks of work','Find one day’s work duration before repeating it over days and weeks.',['P3.S.TIME.02','P3.S.MD.03'],'daily-duration-then-weekly-repeat-total-pair','9b31bea5b245eb1f','37(a),(b)',18],
 ['shared-mass-totals',4,'Recover masses from overlapping totals','Account for one mass counted in both pair totals, then find another mass.',['P4.S.DEC.05'],'overlapping-pair-and-grand-mass-totals-pair','09efe1f49abd45ff','39(a),(b)',15],
 ['ribbon-change',4,'Recover original ribbon lengths','Use an unchanged ribbon to relate the initial and final multiplicative comparisons.',['P4.S.DEC.05','P4.S.DEC.06','P4.S.MD.03'],'unchanged-length-two-multiple-comparisons-pair','7f7bb23a8ad460ba','42(a),(b)',19],
 ['bakery-bills',4,'Compare two bakery bills','Cancel a common item, price an added group, then recover a repeated purchase.',['P4.S.DEC.05','P4.S.DEC.06','P4.S.MD.03'],'common-item-bill-difference-to-second-item-pair','74e77db24e338702','40(a),(b)',27],
 ['fraction-repack',4,'Use a fraction and repack the rest','Find a fractional remainder of a decimal mass, then share it into equal packets.',['P4.S.FRAC.03','P4.S.DEC.06'],'decimal-mass-complement-then-repack-pair','fc167cfccd27b1b8','44(a),(b)',22],
] as const;
export type Batch12MiddlePart=typeof rows[number][0];
export const BATCH12_MIDDLE_PARTS=rows.map(([id,level,title,objective,skillIds,canonicalPatternId,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective,skillIds:[...skillIds],canonicalPatternId,sourceUnits:[{paperId,sourceQuestion,sourcePage}],sourceMappingStatus:'selected-page-pattern-review; no whole-paper coverage'}));
