/** Raffles Girls P6 WA1: 11 questions and 16 separately assessed responses. */
export const BATCH6_UPPER_SOURCE={paperId:'d07175bcd190d819',title:'2025 Raffles Girls Primary 6 Weighted Assessment 1',numberedQuestions:11,responseUnits:16,physicalPages:12} as const;
const rows=[
 ['1a',2,'Missing term in a number pattern','number-pattern-gap',['P4.S.WN.05']],
 ['1b',2,'First two common multiples','two-common-multiples',['P4.S.FACT.03']],
 ['2',3,'Water in a partly filled tank','subtract-mixed-fractions',['P5.S.FRAC.04']],
 ['3',3,'Find a whole number from its fraction','fraction-of-number-reverse',['P5.S.FRAC.04']],
 ['4',4,'Fraction spent on one item','fraction-of-remainder-equal-share',['P5.S.FRAC.04']],
 ['5',4,'Find an amount transferred','transfer-reduces-difference',['P4.S.MD.03']],
 ['6',5,'Pack identical gift packs','greatest-common-factor-packing',['P4.S.FACT.02']],
 ['7a',6,'Maximum number of bags','fractional-bag-maximum',['P5.S.FRAC.04']],
 ['7b',6,'Mass left unpacked','fractional-bag-remainder',['P5.S.FRAC.04']],
 ['8a',7,'Fraction spent each day','fraction-spent-equal-days',['P5.S.FRAC.04']],
 ['8b',7,'Find the allowance','equal-daily-spending-reverse',['P5.S.FRAC.04']],
 ['9',8,'Count items sold at two prices','two-prices-with-fractional-quantity',['P5.S.RATE.02']],
 ['10a',9,'Count notes saved','regular-notes-plus-periodic-notes',['P4.S.MD.03']],
 ['10b',9,'Count five-dollar notes','two-denominations-total-value',['P4.S.MD.03']],
 ['11a',10,'Boxes for an equal number of items','equal-item-count-difference-in-cost',['P5.S.RATE.02']],
 ['11b',10,'Compare items in equal numbers of boxes','equal-box-count-comparison',['P4.S.MD.03']],
] as const;
export type Batch6UpperPart=typeof rows[number][0];
export const BATCH6_UPPER_PARTS=rows.map(([id,sourcePage,title,canonicalPatternId,skillIds])=>({id,level:6 as const,sourcePage,title,canonicalPatternId,skillIds:[...skillIds],paperId:BATCH6_UPPER_SOURCE.paperId}));
