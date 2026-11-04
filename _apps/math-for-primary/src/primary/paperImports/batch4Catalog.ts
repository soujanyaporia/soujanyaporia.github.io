import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH4_EARLY_PARTS} from './batch4EarlyMeta';
import {BATCH4_MIDDLE_PARTS} from './batch4MiddleMeta';
import {BATCH4_UPPER_PATTERNS} from './batch4UpperMeta';
const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
export const BATCH4_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH4_EARLY_PARTS.map(p=>({parameter:`b4e-${p.id}`,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.family,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage})),
 ...BATCH4_MIDDLE_PARTS.map(p=>({parameter:`b4m-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.source.paperId,sourceParts:[p.source.question],sourcePage:p.source.page})),
 ...BATCH4_UPPER_PATTERNS.map(p=>({parameter:`b4u-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.source.paperId,sourceParts:[p.source.question],sourcePage:p.source.page})),
];
