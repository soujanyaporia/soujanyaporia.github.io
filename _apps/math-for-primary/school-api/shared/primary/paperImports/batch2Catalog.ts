import type {AdaptedPaperPattern} from './catalog';
import type {Strand} from '../../school/curriculum';
import {BATCH2_EARLY_PARTS} from './batch2EarlyMeta';
import {BATCH2_UPPER_PATTERNS} from './batch2UpperMeta';
import {BATCH3_UPPER_PATTERNS} from './batch3UpperMeta';
import {BATCH3_EARLY_PARTS} from './batch3EarlyMeta';

const strand=(ids:readonly string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
/** A shared structure may have several source references; this is not a unique-pattern count. */
export const BATCH2_PATTERNS:AdaptedPaperPattern[]=[
 ...BATCH2_EARLY_PARTS.map(p=>({parameter:`b2e-${p.id}`,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.family,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage})),
 ...BATCH3_EARLY_PARTS.map(p=>({parameter:`b3e-${p.id}`,level:p.level,title:p.title,objective:p.objective,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.family,sourcePaper:p.sourceUnits[0].paperId,sourceParts:[p.sourceUnits[0].sourceQuestion],sourcePage:p.sourceUnits[0].sourcePage})),
 ...BATCH2_UPPER_PATTERNS.map(p=>({parameter:`b2u-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.source.paperId,sourceParts:[p.source.question],sourcePage:p.source.page})),
 ...BATCH3_UPPER_PATTERNS.map(p=>({parameter:`b3u-${p.id}`,level:p.level,title:p.title,objective:p.title,strand:strand(p.skillIds),skillIds:[...p.skillIds],icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:p.source.paperId,sourceParts:[p.source.question],sourcePage:p.source.page})),
 ...[{level:4,paperId:'3b0181b50b0c1d82',part:'6',page:3},{level:6,paperId:'6bf439a2fd86155e',part:'23(b)',page:14}].map(p=>({parameter:`b2r-round-tenth-p${p.level}`,level:p.level,title:'Round hundredths to tenths',objective:'Round a two-decimal number to the nearest tenth, including carries.',strand:'Number & Algebra' as Strand,skillIds:['P4.S.DEC.04'],icon:'✦',canonicalPatternId:'decimal-round-tenth',sourcePaper:p.paperId,sourceParts:[p.part],sourcePage:p.page})),
];
