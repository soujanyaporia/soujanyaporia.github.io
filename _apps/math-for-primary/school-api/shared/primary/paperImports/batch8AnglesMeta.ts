/** Source pages checked for task format only; no whole-paper inventory or coverage claim. */
const rows:[string,string,string,string[],string,string,number][]=[
 ['notation','Name a marked angle','marked-polygon-angle-notation',['P4.S.ANGLE.01'],'d4b74369c5a70807','5a',3],
 ['protractor-scales','Read either protractor scale','dual-scale-protractor-measurement',['P4.S.ANGLE.02'],'d4b74369c5a70807','1a',1],
 ['measure-oblique','Measure an oblique triangle angle','measure-drawn-angle-rotated-baseline',['P4.S.ANGLE.02'],'145d3896e8edd36d','30b',15],
 ['join-target','Choose an endpoint for a given angle','join-dot-to-construct-specified-angle',['P4.S.ANGLE.03'],'34b1fa650b0f2aed','9',5],
 ['right-angle-point','Choose a perpendicular endpoint','join-point-to-form-right-angle',['P3.S.ANGLE.01','P4.S.ANGLE.03'],'145d3896e8edd36d','30a',15],
 ['square-corner','Find an angle inside a square corner','square-right-angle-split-three-parts',['P3.S.ANGLE.01','P4.S.ANGLE.01'],'0ffa04ed552be00f','11',6],
 ['construct-ray','Draw and label a specified angle','construct-angle-from-labelled-baseline',['P4.S.ANGLE.03'],'d4b74369c5a70807','5b',3],
];
export const BATCH8_ANGLES_PARTS=rows.map(([id,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level:4,title,objective:title,canonicalPatternId,skillIds,sourceUnits:[{paperId,sourceQuestion,sourcePage}],sourceReviewStatus:'format-page-checked-paper-unaudited'}));
