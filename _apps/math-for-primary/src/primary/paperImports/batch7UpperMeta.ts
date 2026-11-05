/** Local OCR provides provisional inspiration only; source mapping is not audited. */
const rows=[
 ['remaining-percent',5,'Find the percentage remaining','percent-remaining-count','P5.S.PCT.02','130bd163dbdaf846','26',16],
 ['mass-share',5,'Share the mass left','mass-convert-subtract-share','P5.S.RATE.02','0101b054e77d10c7','17',8],
 ['rate-minute',5,'Find a one-minute total','rate-per-second-to-minute','P5.S.RATE.02','0cd938cfb2d55c38','21',11],
 ['ratio-transfer',6,'Equalise two amounts','ratio-transfer-to-equality','P6.S.RATIO.01','8c1490d6e6cf7366','10',7],
 ['sharing-cost',6,'Share a bill among fewer people','equal-share-fewer-people-difference','P5.S.RATE.02','8c1490d6e6cf7366','13',9],
 ['recipe-capacity',6,'Use the rest of the ingredients','two-products-common-resource','P6.S.RATIO.01','20ed5093ea430029','12',5],
 ['average-added',6,'Find the original number of items','average-after-addition-find-count','P6.S.AVG.02','2f1f41b0729593d8','29',17],
 ['successive-percent',6,'Find the amount left after two purchases','successive-percent-of-remainder','P5.S.PCT.02','1caad9c3daeea9a2','29',16],
 ['percent-growth',6,'Find a percentage increase','percent-increase-from-counts','P6.S.PCT.02','5fbc921e504c0195','11',8],
 ['average-missing',6,'Find a missing score from an average','missing-score-from-average','P6.S.AVG.02','f20d083007fbb2bd','19',10],
 ['two-stage-ratio',6,'Find the original length','ratio-split-then-split-shortest','P6.S.RATIO.02','250cf8e67ebe0dbe','11',6],
 ['meeting-speed',6,'Find a speed from a meeting','meeting-speeds-known-difference','P5.S.RATE.02','43b6cc3105270977','28',14],
] as const;
export const BATCH7_UPPER_PARTS=rows.map(([id,level,title,canonicalPatternId,skill,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,canonicalPatternId,skillIds:[skill],sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));
