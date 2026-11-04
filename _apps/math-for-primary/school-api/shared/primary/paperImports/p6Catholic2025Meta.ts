import type {PaperPattern} from '../paperCatalog';
export interface P6ImportedPattern extends PaperPattern {sourceParts:string[];sourcePage:number;group:string;canonicalPatternId:string;coverage:'complete'}
export const P6_CATHOLIC_2025_SOURCE={paperId:'0b3ae31bd258e3b8',title:'2025 Catholic High Primary 6 Assessment 2',printedTitle:'Non-Weighted Weighted Assessment 2',sourceUrl:'https://sgexam.com/subject/maths/2025-p6-maths-weighted-assessment-2-catholic-high-pdf/',questionPages:8,answerPages:[9,10],numberedQuestions:11,mainAnswerParts:12} as const;
type Row=[string,number,string,string,string,string[]];
const rows:Row[]=[
 ['01',1,'1','Recover a price before tax','reverse-percent-price',['P6.S.PCT.01']],
 ['02',1,'2','Circumference in terms of pi','circle-circumference-symbolic',['P6.S.CIRCLE.01']],
 ['03',2,'3','Angles after folding a rectangle','fold-reflection-angle',['P6.S.SHAPE.01']],
 ['04',2,'4','Find the sale price','discount-price',['P5.S.PCT.04']],
 ['05',3,'5','Use equal sides across two shapes','square-rhombus-isosceles-angle',['P6.S.SHAPE.01']],
 ['06',3,'6','Circle area from its diameter','circle-area-diameter',['P6.S.CIRCLE.01']],
 ['07',4,'7','Join a quarter circle and a square','quarter-circle-square-area',['P6.S.CIRCLE.02']],
 ['08',5,'8','Follow parallel lines through a figure','parallel-shape-angle-chain',['P6.S.SHAPE.01']],
 ['09',6,'9','Perimeter around rounded ends','stadium-perimeter',['P6.S.CIRCLE.02']],
 ['10',7,'10','Undo two percentage changes','reverse-successive-percent-changes',['P6.S.PCT.01','P6.S.PCT.02']],
 ['11-a',8,'11.a','Find the unchanged group','percentage-complement-quantity',['P5.S.PCT.03']],
 ['11-b',8,'11.b','Follow a percentage when the whole changes','changing-whole-constant-group',['P6.S.PCT.01','P6.S.PCT.02']],
];
export const P6_CATHOLIC_2025_PATTERNS:P6ImportedPattern[]=rows.map(([id,page,part,title,canonical,skillIds])=>({parameter:`ch6a2-${id}`,level:6,strand:skillIds.some(s=>/CIRCLE|SHAPE/.test(s))?'Measurement & Geometry':'Number & Algebra',title,objective:title,icon:'✦',sourceParts:[part],sourcePage:page,group:id.startsWith('11')?'11':id,canonicalPatternId:canonical,coverage:'complete',skillIds}));
