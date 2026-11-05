/** Source-supported configurations; the private provenance records reuse comparisons and partial review limits. */
const rows:[string,number,string,string,string[],string,string,number][]=[
 ['draw-parallel',3,'Draw a parallel line through a point','construct-parallel-line-through-given-point',['P3.S.LINES.02'],'ddce58e9c1fae02b','19',10],
 ['draw-perpendicular',3,'Draw a perpendicular line through a point','construct-perpendicular-line-through-given-point',['P3.S.LINES.02'],'b379fee5b18d92cd','15',10],
 ['acute-count',3,'Count acute corners in a concave shape','count-acute-interior-corners-concave-polygon',['P3.S.ANGLE.02'],'b379fee5b18d92cd','9',6],
 ['dial-difference',3,'Compare two weighing dials','two-circular-scale-readings-mass-difference',['P3.S.MEASURE.02'],'dfc481277d72af33','22',12],
 ['double-jar-mass',3,'Find two jars in kilograms and grams','dial-single-mass-double-compound-unit-pair',['P3.S.MEASURE.02','P3.S.MEASURE.03'],'4bb7f7cda12390d2','10',5],
 ['elapsed-seconds',3,'Find a duration in seconds','digital-hms-elapsed-seconds',['P3.S.TIME.01'],'1926e4eec05eed79','11',7],
 ['jug-bottle-difference',3,'Compare two shares of combined juice','combine-volumes-multiple-split-difference',['P3.S.MD.04','P3.S.MEASURE.02'],'5a44d95d3c2a1619','27b',15],
 ['reverse-freebie',3,'Work back from free gifts','free-item-entitlement-minimum-purchase-reverse',['P3.S.MD.04','P3.S.MD.03'],'c6e7006acb574324','19',15],
 ['complete-reflection',4,'Complete a reflected outline','complete-partly-given-outline-reflection',['P4.S.SYM.02'],'ceb89637cd54b2bc','28b',14],
 ['complete-cube-net',4,'Finish a valid cube net','one-square-addition-cube-net-validity',['P4.S.SOLID.03'],'145d3896e8edd36d','15',8],
 ['compass-turns',4,'Undo and apply compass turns','reverse-known-compass-turn-then-second-turn',['P4.S.ANGLE.02'],'c650ab5bdd846a3c','27',13],
 ['both-line-properties',4,'Find both line properties in one figure','conjunction-parallel-perpendicular-side-search',['P3.S.LINES.01','P4.S.SHAPE.01'],'c650ab5bdd846a3c','9',5],
 ['three-shape-area',4,'Recover shared dimensions before adding areas','two-equal-rectangles-square-shared-width-area',['P4.S.AREA.01','P4.S.AREA.02'],'c8829df2ae7b86ef','40a',26],
 ['pie-sector-count',4,'Use quarter sectors and a category multiple','pie-equal-quarter-count-other-sector-multiple',['P4.S.GRAPH.03'],'f461b5badafd9bfe','35',20],
 ['common-recipients',4,'Count recipients of both repeating rewards','common-multiple-event-intersections-up-to-bound',['P4.S.FACT.03'],'d2dd31011f35d26d','4',2],
 ['rounding-upper-bound',4,'Find the greatest possible original count','inverse-rounding-greatest-integer-bound',['P4.S.WN.02'],'d2dd31011f35d26d','9',4],
];
export const BATCH10_MIDDLE_PARTS=rows.map(([id,level,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,canonicalPatternId,skillIds,sourceUnits:[{paperId,sourceQuestion,sourcePage}],sourceReviewStatus:'partial-source-pattern-review'}));
