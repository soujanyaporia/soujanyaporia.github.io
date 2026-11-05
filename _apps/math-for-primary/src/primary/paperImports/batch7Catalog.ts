import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH7_EARLY_PARTS} from './batch7EarlyMeta';
import {BATCH7_MIDDLE_PARTS} from './batch7MiddleMeta';
import {BATCH7_UPPER_PARTS} from './batch7UpperMeta';
import {ARITHMETIC_FAMILIES} from './arithmeticTemplateData';
const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
/** Original implementations from extracted references; source-by-source audit is deferred. */
export const BATCH7_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH7_EARLY_PARTS.map(p=>({...p,parameter:`b7e-${p.id}`})),
 ...BATCH7_MIDDLE_PARTS.map(p=>({...p,parameter:`b7m-${p.id}`})),
 ...BATCH7_UPPER_PARTS.map(p=>({...p,parameter:`b7u-${p.id}`})),
 ...ARITHMETIC_FAMILIES.map(p=>({...p,parameter:`b7a-${p.id}`})),
].map(p=>({parameter:p.parameter,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage,sourceMappingStatus:'unaudited'}));
