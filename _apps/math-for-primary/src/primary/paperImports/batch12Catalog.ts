import type {AdaptedPaperPattern} from './catalog';
import {BATCH12_DECIMAL_PARTS} from './batch12DecimalMeta';
import {BATCH12_MIDDLE_PARTS} from './batch12MiddleMeta';
/** Selected source-inspired scenarios, not whole-paper completion receipts. */
export const BATCH12_PATTERNS:AdaptedPaperPattern[]=[...BATCH12_DECIMAL_PARTS.map(p=>({...p,parameter:`b12d-${p.id}`})),...BATCH12_MIDDLE_PARTS.map(p=>({...p,parameter:`b12m-${p.id}`}))].map(p=>({
 parameter:p.parameter,level:p.level,title:p.title,objective:p.objective,strand:/\.(MEASURE|TIME)\./.test(p.skillIds[0])?'Measurement & Geometry':'Number & Algebra',skillIds:p.skillIds,icon:'✦',canonicalPatternId:p.canonicalPatternId,
 sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage,sourceMappingStatus:'unaudited',
}));
