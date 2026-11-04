/** Original configurations informed by individually reviewed upper-primary source tasks. */
export const BATCH4_UPPER_PATTERNS=[
 {id:'fraction-of-remainder-reverse',level:5,title:'Work back through fractions',canonicalPatternId:'reverse-two-fraction-remainders',skillIds:['P5.S.FRAC.04'],source:{paperId:'07e9eba5a1a82fba',question:'12',page:6,bankLines:[2976]}},
 {id:'transfer-difference-ratio',level:5,title:'Find the amount before a transfer',canonicalPatternId:'transfer-then-ratio-with-initial-difference',skillIds:['P3.S.AS.01','P4.S.MD.03'],source:{paperId:'07e9eba5a1a82fba',question:'14',page:7,bankLines:[2977]}},
 {id:'overlap-three-groups',level:6,title:'Find an overlapping group',canonicalPatternId:'overlapping-sums-total-multiple',skillIds:['P6.S.ALG.01'],source:{paperId:'29ba7702443df0b7',question:'16',page:9,bankLines:[704]}},
 {id:'savings-change-percent',level:6,title:'Compare savings over two months',canonicalPatternId:'constant-income-savings-increase',skillIds:['P6.S.PCT.01','P6.S.PCT.02'],source:{paperId:'29ba7702443df0b7',question:'17',page:10,bankLines:[705]}},
 {id:'shortfall-leftover',level:6,title:'Find money from two buying plans',canonicalPatternId:'purchase-shortfall-and-leftover',skillIds:['P5.S.RATE.02'],source:{paperId:'827bd8a076ceb7b5',question:'13',page:8,bankLines:[2805]}},
 {id:'repeating-cycle-sum',level:6,title:'Add a repeating number pattern',canonicalPatternId:'repeating-cycle-prefix-sum',skillIds:['P4.S.WN.05'],source:{paperId:'827bd8a076ceb7b5',question:'15',page:9,bankLines:[2807]}},
] as const;
export type Batch4UpperId=typeof BATCH4_UPPER_PATTERNS[number]['id'];
