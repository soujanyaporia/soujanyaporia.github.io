/** Source-page references are provisional and do not imply paper-level coverage. */
const rows=[
 ['ribbon-plan','Plan equal ribbon pieces','mixed-unit-equal-ribbon-length-and-shortfall',['P5.S.DEC.02','P4.S.MD.03'],'46ee2ef255cd1c8f','11a,b',6],
 ['berry-boxes','Buy enough boxes of fruit','decimal-mass-minimum-boxes-and-excess',['P5.S.DEC.02','P4.S.MD.03'],'c252f11a71f5d0f0','12',6],
 ['two-batches','Compare two sets of bags','two-decimal-mass-groups-total-and-difference',['P5.S.DEC.01'],'0e726c8c032d231a','14',4],
 ['tomato-price','Buy produce by mass','price-per-100g-decimal-kg-conversion',['P5.S.DEC.02','P3.S.MONEY.01'],'184ce7a74a7b43d7','2a,b',23],
 ['tank-overflow','Fill a tank and find the overflow','cuboid-capacity-litre-conversion-rate-overflow',['P5.S.DEC.02','P5.S.VOL.03'],'130bd163dbdaf846','8a,b',25],
 ['bottle-share','Share juice equally into cups','decimal-litres-divide-powers-ten-and-convert',['P5.S.DEC.01','P5.S.DEC.02'],'27de0535dfb5bcca','16',13],
 ['daily-saving-gap','Find starting money from daily spending','equal-start-decimal-daily-difference-reverse',['P5.S.DEC.01','P3.S.MONEY.01'],'03439328f0df32e8','12',10],
 ['parcel-difference','Compare parcels with mixed mass units','mixed-unit-mass-extremes-difference',['P5.S.DEC.02'],'dd99a053b66a48cc','23',15],
 ['file-length','Find a rectangular file length','decimal-perimeter-ratio-to-length',['P5.S.DEC.02','P4.S.AREA.01'],'130bd163dbdaf846','1',20],
 ['conversion-mistake','Correct a mass conversion','kg-grams-decimal-place-error-correction',['P5.S.DEC.02'],'130bd163dbdaf846','21b',13],
 ['soup-packets','Compare two ways to pack soup','equal-decimal-volume-packets-extra-and-leftover',['P5.S.DEC.02','P4.S.MD.03'],'27de0535dfb5bcca','17',13],
 ['bakery-orders','Plan a bakery delivery','decimal-daily-batches-times-ten-shortfall',['P5.S.DEC.01'],'184ce7a74a7b43d7','13',7],
] as const;
export const BATCH12_DECIMAL_PARTS=rows.map(([id,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level:5,title,objective:title,canonicalPatternId,skillIds:[...skillIds],sourceUnits:[{paperId,sourceQuestion,sourcePage}],sourceMappingStatus:'provisional-page-reference'}));
