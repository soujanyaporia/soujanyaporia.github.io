import {BATCH10_EARLY_PARTS} from './batch10EarlyMeta';
import {BATCH11_UPPER_PARTS} from './batch11UpperMeta';
import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH10_MIDDLE_PARTS} from './batch10MiddleMeta';
import {BATCH10_UPPER_PARTS} from './batch10UpperMeta';
const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE|SOLID|SYM|CIRCLE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
/** Partial source-pattern adaptations; no whole-paper coverage is inferred. */
export const BATCH10_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH10_EARLY_PARTS.map(p=>({...p,parameter:`b10e-${p.id}`})),
 ...BATCH10_MIDDLE_PARTS.map(p=>({...p,parameter:`b10m-${p.id}`})),
 ...BATCH10_UPPER_PARTS.map(p=>({...p,parameter:`b10u-${p.id}`})),
 ...BATCH11_UPPER_PARTS.map(p=>({...p,parameter:`b11u-${p.id}`})),
].map(p=>({parameter:p.parameter,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage,sourceMappingStatus:'unaudited'}));
