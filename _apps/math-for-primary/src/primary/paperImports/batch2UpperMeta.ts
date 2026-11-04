/** Reviewed mathematical structures; isolated from routing until explicitly integrated. */
export const BATCH2_UPPER_PATTERNS=[
 {id:'three-square-area',level:5,title:'Three adjoining squares',canonicalPatternId:'three-square-area-from-extreme-areas',skillIds:['P5.S.AREA.03'],source:{paperId:'07e9eba5a1a82fba',question:'29',page:16,bankLine:2995}},
 {id:'linked-scores',level:4,title:'Three linked scores',canonicalPatternId:'three-quantities-pair-total-and-difference',skillIds:['P4.S.MD.03','P3.S.AS.01'],source:{paperId:'03acd0b04254e91c',question:'17',page:11,bankLine:6111}},
 {id:'mixed-purchase-more',level:5,title:'Buy supplies, then buy more',canonicalPatternId:'mixed-price-purchase-remainder-repeat-item',skillIds:['P5.S.RATE.02','P4.S.MD.03'],source:{paperId:'0101b054e77d10c7',question:'18',page:9,bankLine:3530}},
 {id:'nested-isosceles',level:6,title:'Two triangles share a base',canonicalPatternId:'nested-isosceles-base-angle-difference',skillIds:['P5.S.SHAPE.01'],source:{paperId:'29ba7702443df0b7',question:'13',page:8,bankLine:700}},
] as const;
export type Batch2UpperId=typeof BATCH2_UPPER_PATTERNS[number]['id'];
