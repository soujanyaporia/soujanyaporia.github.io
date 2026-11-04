import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH6_UPPER_PARTS} from './batch6UpperMeta';
import {BATCH6_EARLY_PARTS} from './batch6EarlyMeta';
import {BATCH6_MIDDLE_P4_PARTS} from './batch6MiddleMeta';
const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
/** Whole-paper response configurations; not a count of globally distinct patterns. */
export const BATCH6_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH6_EARLY_PARTS.map(p=>({parameter:`b6e-${p.id}`,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.family,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage})),
 ...BATCH6_MIDDLE_P4_PARTS.map(p=>({parameter:`b6m-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.paperId,sourceParts:[p.sourceQuestion],sourcePage:p.sourcePage})),
 ...BATCH6_UPPER_PARTS.map(p=>({parameter:`b6u-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.paperId,sourceParts:[p.id],sourcePage:p.sourcePage})),
];
