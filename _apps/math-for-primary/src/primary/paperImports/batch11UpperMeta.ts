/** Source pages inspected as references. These are not whole-paper coverage claims. */
const rows=[
 ['iso-split',5,'Find an angle in an isosceles triangle','isosceles-apex-split-known-base-angle',['P5.S.SHAPE.01','P5.S.SHAPE.03'],'dd99a053b66a48cc','25',16],
 ['parallel-equilateral',5,'Find an angle in a parallelogram and equilateral triangle','parallelogram-adjacent-minus-equilateral-angle',['P5.S.SHAPE.02','P5.S.SHAPE.03'],'07e9eba5a1a82fba','27',15],
 ['point-right',5,'Find an angle around a point','angles-around-point-two-given-and-right-angle',['P5.S.ANGLE.02'],'0066b51b0352ac82','20',10],
 ['iso-crossing',5,'Find an angle in linked triangles','isosceles-triangle-straight-line-and-third-triangle',['P5.S.SHAPE.01','P5.S.ANGLE.01','P5.S.ANGLE.04'],'f34f5eb2ea4e175c','7',24],
 ['crossing-equal',5,'Identify vertically opposite angles','identify-opposite-angles-from-four-labels',['P5.S.ANGLE.03'],'f34f5eb2ea4e175c','9',5],
 ['turns-compass',5,'Find a direction after two turns','compass-clockwise-then-anticlockwise',['P5.S.ANGLE.04'],'005aeade5c7f2103','23a',12],
 ['smallest-marked-angle',5,'Identify the smallest marked angle','compare-marked-angle-sizes-smallest',['P3.S.ANGLE.02','P4.S.ANGLE.01'],'0cd938cfb2d55c38','23a',12],
 ['two-obtuse-angles',5,'Identify two obtuse angles','identify-two-obtuse-marked-angles',['P3.S.ANGLE.02','P4.S.ANGLE.01'],'0cd938cfb2d55c38','23b',12],
 ['semicircles-area',6,'Find the area of three semicircles','three-equal-semicircles-overlapping-diameters-area',['P6.S.CIRCLE.03'],'c50082fd37635d5c','30',18],
 ['quadrant-union-area',6,'Find the combined area of overlapping quadrants','two-quarter-circles-union-known-overlap-area',['P6.S.CIRCLE.03'],'250cf8e67ebe0dbe','15a',31],
 ['quadrant-union-perimeter',6,'Find the perimeter of overlapping quadrants','two-quarter-circles-union-from-overlap-perimeter',['P6.S.CIRCLE.03'],'250cf8e67ebe0dbe','15b',31],
 ['triangle-cuts-area',6,'Find the area of each cut triangle','rectangle-minus-six-equal-triangle-cuts-area',['P5.S.AREA.02'],'0f995f41617a0418','16a',30],
 ['triangle-cuts-perimeter',6,'Find the perimeter of each cut triangle','repeated-triangle-cut-perimeter-increase',['P5.S.AREA.02'],'0f995f41617a0418','16b',30],
 ['stacked-semicircles-area',6,'Find the area of a semicircle figure','rectangle-and-three-semicircles-composite-area',['P6.S.CIRCLE.03'],'72fa06bc6b411da1','17b',35],
 ['stacked-semicircles-perimeter',6,'Find the perimeter of a semicircle figure','rectangle-and-three-semicircles-composite-perimeter',['P6.S.CIRCLE.03'],'72fa06bc6b411da1','17a',35],
 ['four-circles',6,'Find the area inside a square but outside four circles','four-identical-circles-in-square-unshaded-area',['P6.S.CIRCLE.03'],'beaa18e268b8797d','15',7],
] as const;
export const BATCH11_UPPER_PARTS=rows.map(([id,level,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,canonicalPatternId,skillIds:[...skillIds],sourceUnits:[{paperId,sourceQuestion,sourcePage}],sourceMappingStatus:'provisional-page-reference',...(id==='four-circles'?{sourceAdaptation:'Same four-circle figure; source asks perimeter, this original question asks area.'}:{})}));
