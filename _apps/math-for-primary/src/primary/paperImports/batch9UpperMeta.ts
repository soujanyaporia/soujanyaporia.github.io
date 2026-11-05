/** Source pages inspected as task references; these do not claim complete paper coverage. */
const rows=[
 ['weighted-chart',5,'Find a total from a frequency graph','frequency-bars-weighted-total',['P4.S.GRAPH.01','P4.S.MD.02'],'fa250d8f6a8d7878','11',5],
 ['annual-interest',5,'Find a balance after one year','simple-interest-one-year-total',['P5.S.PCT.04'],'fa250d8f6a8d7878','27',13],
 ['extra-items-cost',5,'Find a number of cheaper items','unequal-item-counts-with-price-total',['P4.S.MD.03','P3.S.MONEY.01'],'9519947b04059271','11',6],
 ['fixed-then-fraction',5,'Recover money before two purchases','fixed-then-remainder-fraction-known-original-left',['P5.S.FRAC.04'],'67b04a11587ca68a','14c',18],
 ['fraction-rest-of-rest',5,'Find a fraction of the original','complement-fraction-of-complement',['P5.S.FRAC.04'],'4dae8b8320fa7d9a','10',5],
 ['shared-pizzas',5,'Share whole items equally','whole-number-division-to-improper-fraction',['P5.S.FRAC.01'],'7c57db1d4caf880e','9',5],
 ['related-prices',5,'Find the price of two different items','equal-value-bundles-mixed-purchase',['P5.S.RATE.02'],'07e9eba5a1a82fba','12',28],
 ['quiz-penalty',5,'Find the number correct','two-outcome-score-with-penalty',['P4.S.MD.03'],'9519947b04059271','12',6],
 ['average-correction',6,'Find the group size from an average correction','average-change-from-one-corrected-value',['P6.S.AVG.02'],'72fa06bc6b411da1','10',27],
 ['future-age-ratio',6,'Find when an age ratio changes','age-difference-constant-future-ratio',['P6.S.RATIO.01'],'72fa06bc6b411da1','8',25],
 ['ratio-after-addition',6,'Find the unchanged amount from two ratios','ratio-one-increased-other-unchanged',['P6.S.RATIO.01'],'72fa06bc6b411da1','25',14],
 ['percent-remainder-reverse',6,'Recover a starting quantity','fixed-sale-percent-remainder-known-final-percent',['P6.S.PCT.01'],'6f131f81befc577a','11b',8],
 ['linked-team-ratios',6,'Link three ratios across teams','linked-cross-group-ratios',['P6.S.RATIO.01'],'43b6cc3105270977','14',8],
 ['discount-plus-fixed',6,'Find the total percentage discount','percent-discount-then-fixed-discount',['P6.S.PCT.02'],'7bb9efa4d797e251','28',15],
 ['tank-rate-fraction',6,'Find the time to partly fill a tank','cuboid-fraction-capacity-flow-time',['P5.S.VOL.03','P5.S.RATE.02'],'72fa06bc6b411da1','14',6],
 ['weighted-group-average',6,'Find an average for one group','weighted-average-groups-known-difference',['P6.S.AVG.02'],'7bb9efa4d797e251','15',29],
] as const;
export const BATCH9_UPPER_PARTS=rows.map(([id,level,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,skillIds:[...skillIds],canonicalPatternId,sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));
