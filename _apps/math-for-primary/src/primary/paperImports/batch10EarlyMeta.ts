/** Selected source-page patterns only; source associations are not whole-paper coverage. */
const rows=[
 ['coin-exchange',1,'Exchange a note for equal coins','Find the number of equal-value coins equivalent to a note.',['P1.S.MONEY.01','P1.S.MONEY.02'],'equal-value-note-to-coin-exchange','67046643540c8f40','8(a)',4],
 ['budget-item',1,'Choose an affordable item','Count equal notes before finding the only affordable item.',['P1.S.MONEY.02'],'note-budget-to-affordable-catalogue-item','67046643540c8f40','9(a)',5],
 ['known-item-partner',1,'Find the other purchase','Subtract a known item from total spending, then locate the matching price.',['P1.S.MONEY.02','P1.S.AS.05'],'known-purchase-and-total-to-catalogue-partner','67046643540c8f40','9(b)',5],
 ['shop-pair-total',1,'Choose two items for a total','Search pairs of distinct items for an exact total.',['P1.S.MONEY.02','P1.S.AS.05'],'pair-search-given-total','df0b40011a125fa0','12(d)',7],
 ['graph-equal-pair',1,'Find matching graph rows','Identify the two categories represented by equal symbol counts.',['P1.S.GRAPH.01'],'pictograph-equal-category-pair','bfc224738db7b6ec','13(b)',7],
 ['graph-extreme',1,'Find the most or the fewest','Identify a category from the largest or smallest symbol count.',['P1.S.GRAPH.01'],'pictograph-category-extremum','211caf8d478eeae7','10(a),(b)',10],
 ['am-pm',1,'Choose am or pm','Use an explicit part-of-day clue to interpret a clock time.',['P1.S.TIME.01'],'time-context-am-pm','4e0e2809f8e50674','10',6],
 ['reverse-ordinal',1,'Count from the other end','Count a pictured row and translate a position from right to left.',['P1.S.WN.06'],'reverse-end-ordinal-position','3746b2a3baf4392c','3',2],
 ['distant-pattern',2,'Find a later shape','Use a four-shape repeating group to find a position beyond the shown pattern.',['P2.S.SHAPE.01'],'distant-position-in-shape-cycle','14ec2e62a6d7f2b8','5',12],
 ['ticket-saving',2,'Compare family ticket costs','Compare equal family groups bought separately or as packages.',['P2.S.MONEY.04','P2.S.MD.01'],'family-package-versus-separate-ticket-saving','3bff7e572dd6aaf4','30(b)',14],
 ['solid-face-order',2,'Order solids by flat faces','Count all flat faces of solid figures before ordering their labels.',['P2.S.SHAPE.02'],'solid-flat-face-count-order','9d5c82409fa713ae','14',9],
 ['solid-property',2,'Solve a solid riddle','Deduce a solid from its curved surface and flat-face count.',['P2.S.SHAPE.02'],'solid-from-curved-and-flat-surface-properties','2fc0e57203509ccc','6',6],
 ['undo-sale-double',2,'Recover a starting group','Undo a sale before applying the original twice-as-many relationship.',['P2.S.AS.01','P2.S.MD.01'],'restore-original-group-before-doubling','8dc8798e84b48de3','16',50],
 ['double-share-total',2,'Share a total in unequal parts','Recognise three equal units when one recipient gets twice the other.',['P2.S.MD.02','P2.S.MONEY.04'],'two-to-one-share-from-total','7c1b4fe783b02ff8','28',13],
 ['length-estimate',2,'Choose a sensible length','Judge both a measurement unit and its magnitude for a familiar object.',['P2.S.MEASURE.01','P2.S.MEASURE.04'],'choose-plausible-length-unit-and-magnitude','aca7192800c05292','21',8],
 ['share-includes-owner',2,'Include everyone in a share','Include the owner among equal recipients before writing one share as a fraction.',['P2.S.FRAC.01','P2.S.FRAC.02'],'owner-plus-friends-to-unit-fraction','ce0c0da332014516','15(a)',6],
] as const;
export type Batch10EarlyPart=typeof rows[number][0];
export const BATCH10_EARLY_PARTS=rows.map(([id,level,title,objective,skillIds,canonicalPatternId,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective,skillIds:[...skillIds],canonicalPatternId,sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));
