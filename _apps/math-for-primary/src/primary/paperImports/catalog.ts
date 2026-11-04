import type {PaperPattern} from '../paperCatalog';
import type {Strand} from '../../school/curriculum';
import {P1_HENRY_PARK_2025_PATTERNS} from './p1HenryPark2025Meta';
import {P2_HENRY_PARK_2025_PATTERNS} from './p2HenryPark2025Meta';
import {NANYANG_2025_PARTS} from './p4Nanyang2025Meta';
import {P5_MAHA_BODHI_2025_PARTS} from './p5MahaBodhi2025Meta';
import {P6_CATHOLIC_2025_PATTERNS} from './p6Catholic2025Meta';
import {RAFFLES_2025_PARTS} from './p3Raffles2025Meta';
import {BATCH2_PATTERNS} from './batch2Catalog';
import {BATCH4_PATTERNS} from './batch4Catalog';
import {BATCH5_PATTERNS} from './batch5Catalog';
import {BATCH6_PATTERNS} from './batch6Catalog';

/** Tasks are response variants, not a count of distinct mathematical structures. */
export interface AdaptedPaperPattern extends PaperPattern {canonicalPatternId:string;sourcePaper:string;sourceParts:string[];sourcePage:number}
const strandFor=(ids:string[]):Strand=>ids.some(id=>/\.(GRAPH|AVG)\./.test(id))?'Statistics':ids.some(id=>/\.(MEASURE|LENGTH|TIME|LINES|ANGLE|AREA|VOL|SHAPE)\./.test(id))?'Measurement & Geometry':'Number & Algebra';
export const ADAPTED_PAPER_PATTERNS:AdaptedPaperPattern[]=[
 ...P1_HENRY_PARK_2025_PATTERNS.map(p=>({...p,sourcePaper:'0fa004d1786d5dd9'})),
 ...P2_HENRY_PARK_2025_PATTERNS.map(p=>({...p,sourcePaper:'1a14bf2e2a4e6460'})),
 ...RAFFLES_2025_PARTS.map(p=>({parameter:`rg25-${p.id}`,level:3,title:p.title,objective:p.title,strand:strandFor(p.skillIds),skillIds:p.skillIds,icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:'79c1903cf02bf7a9',sourceParts:[p.sourceQuestion],sourcePage:p.sourcePage})),
 ...NANYANG_2025_PARTS.map(p=>({parameter:`ny425-${p.id}`,level:4,title:p.title,objective:p.title,strand:strandFor(p.skillIds),skillIds:p.skillIds,icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:'95d75c946fbfbc5a',sourceParts:[p.sourceQuestion],sourcePage:p.sourcePage})),
 ...P5_MAHA_BODHI_2025_PARTS.map(p=>({parameter:`mb525-${p.id}`,level:5,title:p.title,objective:p.title,strand:strandFor(p.skillIds),skillIds:p.skillIds,icon:'✦',canonicalPatternId:p.canonicalPatternId,sourcePaper:'fc86e57a9a66d7fd',sourceParts:[p.sourceQuestion],sourcePage:p.sourcePage})),
 ...P6_CATHOLIC_2025_PATTERNS.map(p=>({...p,sourcePaper:'0b3ae31bd258e3b8'})),
 ...BATCH2_PATTERNS,
 ...BATCH4_PATTERNS,
 ...BATCH5_PATTERNS,
 ...BATCH6_PATTERNS,
];
export const adaptedPattern=(parameter:string|undefined)=>ADAPTED_PAPER_PATTERNS.find(p=>p.parameter===parameter);
