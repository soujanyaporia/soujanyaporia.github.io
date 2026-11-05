/** Sixteen reasoning configurations; private provenance distinguishes new work from rejected reuse leads. */
const rows:[string,number,string,string,string[],string,string,number][]=[
 ['wire-square',3,'Rebend a rectangle into a square','same-wire-rectangle-to-square-area',['P3.S.AREA.02','P3.S.AREA.03'],'b379fee5b18d92cd','25b',17],
 ['change-notes',3,'Count notes in the change','money-change-as-fixed-denomination-count',['P3.S.MONEY.01','P3.S.MD.04'],'c6e7006acb574324','12',10],
 ['balance-chain',3,'Use three balanced scales','cancel-common-objects-and-chain-balanced-masses',['P3.S.MEASURE.02','P3.S.MD.03'],'124bb3609bb0ec69','23b',12],
 ['chain-total',3,'Recover a middle quantity from a total','chained-multiplicative-comparisons-total',['P3.S.MD.03','P3.S.MD.04'],'736cb6f3d439eefb','23',13],
 ['graph-claims',3,'Check two claims about a graph','bar-chart-ratio-and-sum-statement-verification',['P3.S.GRAPH.01'],'d3f6c37824befd1d','21',11],
 ['equal-start-changes',3,'Compare equal starts after different changes','equal-start-independent-loss-gain-difference',['P3.S.AS.01'],'124bb3609bb0ec69','17',9],
 ['unknown-purchase',3,'Find an unknown purchase using change','unknown-item-from-payment-change-and-known-cost',['P3.S.MONEY.01'],'736cb6f3d439eefb','21',11],
 ['two-rectangles',3,'Use a dimension relationship before finding area','identical-rectangles-dimension-ratio-total-area',['P3.S.AREA.03','P3.S.MD.03'],'d3f6c37824befd1d','22',12],
 ['symmetry-choice',4,'Find a symmetric grid shape','nonstandard-grid-shape-line-symmetry-search',['P4.S.SYM.01'],'c5c7ea0d6e00684b','16',8],
 ['cube-opposite',4,'Find the opposite face on a cube net','cube-net-opposite-face-after-folding',['P4.S.SOLID.03'],'f461b5badafd9bfe','34a',19],
 ['overlap-area',4,'Find the overlap of crossed rectangles','perpendicular-identical-rectangle-intersection-area',['P4.S.AREA.02'],'5aa2a68871aba2a9','41a',22],
 ['square-completion',4,'Complete the smallest larger square','fixed-unit-squares-minimum-larger-square-completion',['P4.S.SHAPE.01','P3.S.AREA.03'],'5aa2a68871aba2a9','34',16],
 ['reverse-cut',4,'Recover a dimension after a square is cut away','remaining-area-plus-square-cut-recover-rectangle-length',['P4.S.AREA.01'],'6b441437183935a9','46',22],
 ['notch-perimeter',4,'Find a perimeter with an internal notch','internal-square-notch-perimeter-increase',['P4.S.AREA.02'],'ceb89637cd54b2bc','20',10],
 ['vehicle-capacity',4,'Use an assume-all comparison','two-type-count-and-total-capacity-assumption',['P4.S.MD.03'],'f461b5badafd9bfe','37',22],
 ['equal-cut-logic',4,'Decide what equal cuts do and do not tell us','equal-removal-order-invariance-and-undetermined-multiple',['P4.S.FRAC.04'],'145d3896e8edd36d','43b',24],
];
export const BATCH9_MIDDLE_PARTS=rows.map(([id,level,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,canonicalPatternId,skillIds,sourceUnits:[{paperId,sourceQuestion,sourcePage}],sourceReviewStatus:'partial-pattern-review-no-whole-paper-claim'}));
