/** Local source-page references are provisional, not whole-paper coverage. */
const rows=[
 ['jug-cups',5,'Find the amount in each cup','two-equal-small-units-and-larger-difference',['P4.S.MD.03'],'07e9eba5a1a82fba','21',12],
 ['garden-lights',5,'Count lights along another side','rectangular-loop-equal-spacing-count-other-side',['P4.S.MD.03'],'03439328f0df32e8','11b',9],
 ['target-bonus',5,'Find the number of targets hit','score-per-hit-and-periodic-bonus-reverse',['P4.S.MD.03'],'0cd938cfb2d55c38','12',27],
 ['work-rates',5,'Find pay at two hourly rates','weekday-weekend-hours-different-pay-rates',['P5.S.RATE.02'],'f34f5eb2ea4e175c','16',9],
 ['tiered-mass',5,'Find the mass sold from tiered rates','reverse-two-tier-unit-price-threshold',['P5.S.RATE.02'],'f34f5eb2ea4e175c','4',21],
 ['tank-space',5,'Find water needed to fill a tank','cuboid-empty-height-to-volume',['P5.S.VOL.03'],'49ce36052c26f4d2','9',6],
 ['saving-rates',5,'Find a daily saving amount','equal-savings-after-delayed-start',['P5.S.RATE.02'],'27de0535dfb5bcca','26',23],
 ['rental-blocks',5,'Find the longest rental time','fixed-first-hour-rounded-additional-blocks',['P5.S.RATE.02'],'0101b054e77d10c7','6',23],
 ['chase-rounds',6,'Find complete rounds after a lead','relative-speed-difference-then-complete-laps',['P5.S.RATE.02'],'250cf8e67ebe0dbe','11b',27],
 ['fraction-two-colours',6,'Find the fraction of blue stars used','fraction-of-group-from-total-and-other-group-used',['P5.S.FRAC.04'],'2f1f41b0729593d8','30',17],
 ['drops-per-minute',6,'Find the volume from drops','drops-per-second-and-volume-per-group',['P5.S.RATE.02'],'33d194ab6a70a4a9','22',14],
 ['daily-use-fraction',6,'Find the starting volume','fixed-daily-use-fraction-and-later-remainder',['P5.S.FRAC.04'],'5fbc921e504c0195','28',20],
 ['closest-average',6,'Find two closest different numbers','three-number-average-closest-pair',['P6.S.AVG.02'],'6bf439a2fd86155e','28',17],
 ['percentage-difference-total',6,'Find a total from percentage difference','percentage-categories-known-difference-to-total',['P6.S.PCT.01'],'250cf8e67ebe0dbe','24b',14],
 ['mixed-unit-cuboid',6,'Find the height of a cuboid','cuboid-volume-mixed-unit-missing-height',['P5.S.VOL.03'],'5fbc921e504c0195','25',18],
 ['painted-cube-cuts',6,'Find the volume of each cube','unpainted-cube-cut-faces-to-volume',['P5.S.VOL.03'],'5fbc921e504c0195','29',20],
] as const;
export const BATCH10_UPPER_PARTS=rows.map(([id,level,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,canonicalPatternId,skillIds:[...skillIds],sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));
