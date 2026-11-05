import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH9_EARLY_PARTS} from './batch9EarlyMeta';
import {BATCH9_MIDDLE_PARTS} from './batch9MiddleMeta';
import {BATCH9_UPPER_PARTS} from './batch9UpperMeta';
const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE|SOLID|SYM|CIRCLE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
/** Source-page references are provisional and never count as full-paper conversion. */
export const BATCH9_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH9_EARLY_PARTS.map(p=>({...p,parameter:`b9e-${p.id}`})),
 ...BATCH9_MIDDLE_PARTS.map(p=>({...p,parameter:`b9m-${p.id}`})),
 ...BATCH9_UPPER_PARTS.map(p=>({...p,parameter:`b9u-${p.id}`})),
].map(p=>({parameter:p.parameter,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage,sourceMappingStatus:'unaudited'}));
