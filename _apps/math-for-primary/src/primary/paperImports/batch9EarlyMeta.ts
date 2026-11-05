/** Selected source patterns only. No whole-paper inventory or corpus-wide novelty claim. */
const rows=[
 ['draw-length',1,'Draw a measured line','Construct a horizontal segment by counting centimetre grid intervals.',['P1.S.LENGTH.02'],'construct-given-centimetre-length','7da4f6bddfdfe702','11',6],
 ['copy-grid',1,'Copy a grid figure','Reproduce every segment at the same grid coordinates.',['P1.S.SHAPE.03'],'copy-complete-figure-on-grid','bc1862e8d94b09c3','9',5],
 ['joined-shapes',1,'Name the joined shapes','Identify two component shapes in a partitioned composite figure.',['P1.S.SHAPE.02'],'identify-components-of-composite-shape','5f57963eeeee0b9c','17',6],
 ['circle-pieces',1,'Choose pieces for a circle','Select two matching semicircles, checking shape and size.',['P1.S.SHAPE.02'],'matching-pieces-compose-circle','e40adf7690f11878','6',9],
 ['schedule-hour',1,'Find the one-hour activity','Use consecutive schedule entries to identify a one-hour interval.',['P1.S.TIME.03'],'schedule-search-one-hour-activity','73ca0d218f5557a5','13(b)',8],
 ['ruler-total',1,'Combine two measured lengths','Read a zero and nonzero start on rulers, then combine both lengths.',['P1.S.LENGTH.01','P1.S.AS.05'],'read-two-rulers-then-total','f32900b2b55c5532','11',5],
 ['combine-group',1,'Pack two collections together','Combine two supplies before finding the number of equal-sized packets.',['P1.S.MD.02','P1.S.AS.01'],'combine-collections-before-group-count','af0ece2d4698d012','26',48],
 ['fill-baskets',1,'Finish filling the baskets','Derive a target from equal basket capacities before finding the shortage.',['P1.S.MD.01','P1.S.AS.03'],'group-capacity-target-shortage','c1b982c9cf847a42','6',3],
 ['mass-dial',2,'Read a weighing dial','Use labelled and intermediate tick values on a circular gram scale.',['P2.S.MEASURE.02'],'read-circular-mass-scale','a6b7bb5dacda90e7','4',5],
 ['contents-mass',2,'Remove the container mass','Distinguish gross mass from the mass of the empty container.',['P2.S.MEASURE.02','P2.S.AS.01'],'gross-minus-tare-contents-mass','596bccac0c527e40','23',13],
 ['identical-masses',2,'Weigh one identical item','Read the combined dial mass before sharing it between two identical items.',['P2.S.MEASURE.02','P2.S.MD.02'],'dial-total-to-identical-item-mass','07e60fd0f74508dd','6',14],
 ['nested-capacity',2,'Follow the container chain','Convert three nested equal-capacity relationships to litres.',['P2.S.MEASURE.03','P2.S.MD.01'],'nested-three-level-capacity','51e0f5311f81510c','5',3],
 ['unequal-pieces',2,'Find an equal-area fraction','Convert squares and half-square triangles to equal area units.',['P2.S.FRAC.01'],'unequal-pieces-to-equal-area-fraction','a3d08bbea76ae7c2','13(a)',7],
 ['slow-clock',2,'Correct a slow clock','Read the displayed time and advance it by the stated clock error.',['P2.S.TIME.01','P2.S.TIME.02'],'correct-slow-clock-reading','36367889a28739dc','9',22],
 ['price-from-change',2,'Find one price from change','Recover total spending before dividing by the equal item count.',['P2.S.MONEY.04','P2.S.MD.02'],'change-to-equal-item-unit-price','94c0c3436687e770','26',39],
 ['coin-claim',2,'Decide whether the money tells enough','Consider all legal coin combinations before judging a count comparison.',['P2.S.MONEY.04','P2.S.WN.04'],'coin-total-comparison-data-sufficiency','36367889a28739dc','15',8],
] as const;
export type Batch9EarlyPart=typeof rows[number][0];
export const BATCH9_EARLY_PARTS=rows.map(([id,level,title,objective,skillIds,canonicalPatternId,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective,skillIds:[...skillIds],canonicalPatternId,sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));
