/** OCR-inspired implementation-first expansion. These are not audited source mappings or complete papers. */
export const BATCH7_EARLY_MAPPING_STATUS='implementation-first; source mapping unaudited' as const;
const rows=[
 ['race-first',1,'Find the first runner','Infer a unique order from three positional clues.',['P1.S.WN.06'],'four-runner-order-clues','bd0d0f445808e996','15',8],
 ['queue-total',1,'Count everyone in the queue','Include both named children when counting people before and between them.',['P1.S.WN.06','P1.S.AS.06'],'queue-before-between-last-total','8dca2e4b381e6d9f','14',6],
 ['transfer-equal',1,'Move toys to make equal groups','Account for both collections changing during a transfer.',['P1.S.AS.02','P1.S.MD.02'],'small-transfer-to-equality','8f7aea7a7a0b2d5e','18',7],
 ['fewest-notes',1,'Pay with the fewest notes','Choose a minimum-count exact payment using explicitly supplied note values.',['P1.S.MONEY.02'],'minimum-exact-note-count','221eb122dc70efbf','10',8],
 ['digit-riddle',1,'Solve a two-digit number riddle','Combine a digit sum with the difference between the digits.',['P1.S.WN.02','P1.S.AS.03'],'two-digit-sum-and-difference','af0ece2d4698d012','26',35],
 ['animal-legs',1,'Count two kinds of animal legs','Combine two unequal group sizes with both leg counts explicitly given.',['P1.S.MD.01','P1.S.AS.06'],'two-species-weighted-leg-total','9ef9b2fa05986006','4(c)',15],
 ['alternating-pattern',2,'Follow two alternating changes','Infer alternating forward and backward changes and fill an internal gap.',['P2.S.WN.05'],'alternating-add-subtract-internal-gap','62394329848740a2','14',7],
 ['purchase-bonus',2,'Count gifts from a shop offer','Find complete purchase groups, then count several free items per group.',['P2.S.MD.01','P2.S.MD.02'],'purchase-groups-to-bonus-total','a478ef51119499b2','bonus-book story after Q10 (number not recovered)',5],
 ['equal-after-giving',2,'Combine the equal amounts left','Find one remaining amount, infer the equal other amount, and combine them.',['P2.S.AS.01'],'subtract-then-double-equal-remainders','3a05693319e4a10a','21',13],
 ['repack-share',2,'Share the contents of several boxes','Recover a total from equal boxes, then share it among a different number of children.',['P2.S.MD.01','P2.S.MD.02'],'multiply-before-resharing','b4507829149f7cb2','14',9],
 ['fraction-given-away',2,'Find the fraction given away','Recover the missing pieces and express their fraction of the original whole.',['P2.S.FRAC.01','P2.S.FRAC.05'],'remaining-piece-count-to-complement-fraction','14ec2e62a6d7f2b8','10',9],
 ['start-from-clock',2,'Work backwards from a finish clock','Read the finishing time, then subtract a given number of minutes.',['P2.S.TIME.01','P2.S.TIME.02'],'read-finish-clock-then-recover-start','94983cf40c52bffb','15',7],
] as const;
export type Batch7EarlyPart=typeof rows[number][0];
export const BATCH7_EARLY_PARTS=rows.map(([id,level,title,objective,skillIds,canonicalPatternId,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective,skillIds:[...skillIds],canonicalPatternId,sourceMappingStatus:BATCH7_EARLY_MAPPING_STATUS,sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));
