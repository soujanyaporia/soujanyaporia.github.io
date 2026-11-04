/** Configurations of existing generators; no new diagram or arithmetic family. */
export const BATCH3_UPPER_PATTERNS=[
 {id:'seven-digit-place-digit',level:6,title:'Read a digit in a large number',canonicalPatternId:'place-digit',skillIds:['P5.S.WN.01'],reuse:'generate.ts/place',source:{paperId:'29ba7702443df0b7',question:'1',page:3,bankLine:685,reviewOrder:6}},
 {id:'centimetres-to-metres',level:6,title:'Centimetres to decimal metres',canonicalPatternId:'centimetres-to-decimal-metres',skillIds:['P5.S.DEC.02'],reuse:'generate.ts/unitConvert',source:{paperId:'29ba7702443df0b7',question:'2',page:3,bankLine:686,reviewOrder:12}},
 {id:'three-digit-backward-pattern',level:4,title:'Complete a backward number pattern',canonicalPatternId:'constant-decreasing-pattern-internal-gap',skillIds:['P4.S.WN.05'],reuse:'p1HenryPark2025.ts/hp25-10',source:{paperId:'b784218df95edcbc',question:'20',page:13,bankLine:3453,reviewOrder:16}},
 {id:'square-base-volume',level:5,title:'Volume with a square base',canonicalPatternId:'square-base-cuboid-volume',skillIds:['P5.S.VOL.03'],reuse:'generate.ts/volume',source:{paperId:'0101b054e77d10c7',question:'10',page:5,bankLine:3522,reviewOrder:17}},
 {id:'percentage-unsold',level:6,title:'How many remain unsold?',canonicalPatternId:'percentage-complement-quantity',skillIds:['P5.S.PCT.03'],reuse:'p6Catholic2025.ts/ch6a2-11-a',source:{paperId:'29ba7702443df0b7',question:'8',page:6,bankLine:692,reviewOrder:36}},
] as const;
export type Batch3UpperId=typeof BATCH3_UPPER_PATTERNS[number]['id'];
