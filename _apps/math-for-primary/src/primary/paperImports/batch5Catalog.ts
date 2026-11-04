import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH5_EARLY_PARTS} from './batch5EarlyMeta';
import {BATCH5_MIDDLE_P3_PARTS} from './batch5MiddleMeta';
import {BATCH5_UPPER_PATTERNS,type Batch5UpperId} from './batch5UpperMeta';

const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
const upper:Record<Batch5UpperId,[string,string[]]>={
 'divide-hundreds':['divide-whole-number-by-hundreds',['P5.S.DEC.02']],
 'reading-rate':['constant-rate-output',['P5.S.RATE.02']],
 'cuboid-volume':['cuboid-volume',['P5.S.VOL.03']],
 'tank-to-fill':['tank-capacity-minus-water',['P5.S.VOL.03','P5.S.VOL.04']],
 'book-mass':['decimal-total-less-container-equal-share',['P5.S.DEC.02','P4.S.MD.03']],
 'packing-time':['constant-rate-time',['P5.S.RATE.02']],
 'parking-charge':['first-hour-plus-started-time-blocks',['P5.S.RATE.02','P3.S.TIME.02']],
 'pail-difference':['transfer-from-one-pail-difference',['P5.S.DEC.02']],
 'pail-bottles':['transferred-remainder-to-complete-containers',['P5.S.VOL.04','P4.S.MD.03']],
 'tank-poured':['fraction-filled-cuboid-drain-to-depth',['P5.S.VOL.03','P5.S.VOL.04']],
 'tank-shorter':['fraction-filled-cuboid-drain-to-depth',['P5.S.VOL.03','P5.S.VOL.04']],
 'tank-fraction':['fraction-filled-cuboid-drain-to-depth',['P5.S.VOL.03','P5.S.VOL.04']],
};
/** Complete source inventories; several responses reuse the same mathematical structure. */
export const BATCH5_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH5_EARLY_PARTS.map(p=>({parameter:`b5e-${p.id}`,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.family,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage})),
 ...BATCH5_MIDDLE_P3_PARTS.map(p=>({parameter:`b5m-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.paperId,sourceParts:[p.sourceQuestion],sourcePage:p.sourcePage})),
 ...BATCH5_UPPER_PATTERNS.map(p=>({parameter:`b5u-${p.id}`,level:5,title:p.title,objective:p.title,strand:strand(upper[p.id][1]),skillIds:upper[p.id][1],icon:'✦',canonicalPatternId:upper[p.id][0],sourcePaper:'f2a812a6326c3e75',sourceParts:[p.question],sourcePage:p.page})),
];
