import type {PaperPattern} from '../paperCatalog';
export interface P2ImportedPattern extends PaperPattern {sourceParts:string[];sourcePage:number;group:string;canonicalPatternId:string;response:'number'|'choice'|'grouping'|'number-sentence';coverage:'complete'}
export const P2_HENRY_PARK_2025_SOURCE={paperId:'1a14bf2e2a4e6460',title:'2025 Henry Park Primary 2 Quiz 2',sourceUrl:'https://sgexam.com/subject/maths/2025-p2-maths-quiz-2-henry-park-pdf/',questionPages:9,blankPages:[10],answerPages:[11,12],numberedQuestions:19,mainAnswerParts:25,storyEquationTasks:4} as const;
type Row=[id:string,page:number,sourcePart:string,title:string,canonical:string,response:P2ImportedPattern['response'],skills:string[],group?:string];
const rows:Row[]=[
 ['01',1,'1','Describe the pictured groups','group-description','choice',['MD.01']],
 ['02',2,'2','Share the collection fairly','equal-sharing','choice',['MD.02']],
 ['03',2,'3','Count equal packages','equal-groups-total','choice',['MD.01']],
 ['04',2,'4','Two identical mystery factors','equal-factors-product','choice',['MD.01']],
 ['05',2,'5','Compare two equal-group totals','difference-equal-products','choice',['MD.01','AS.01']],
 ['06',3,'6','Choose the missing operation','choose-grouping-operation','choice',['MD.02']],
 ['07',3,'7','Make groups of the given size','construct-groups-size','grouping',['MD.02']],
 ['08',3,'8','Find the number before sharing','missing-dividend','number',['MD.01','MD.02']],
 ['09',4,'9','Reuse the mystery number','repeated-symbol-product','number',['MD.01','MD.02']],
 ['10',4,'10','Make the given number of groups','construct-groups-count','grouping',['MD.02']],
 ['11',4,'11','Share supplies equally','equal-sharing','number',['MD.02']],
 ['12-multiply',5,'12.multiply','Build a multiplication sentence','group-fact-construction','number-sentence',['MD.01'],'12'],
 ['12-divide',5,'12.divide','Build a division sentence','group-fact-construction','number-sentence',['MD.02'],'12'],
 ['13-a-factor',6,'13.a.factor','Find the number of equal packs','missing-group-factor','number',['MD.01','MD.02'],'13-a'],
 ['13-a-divisor',6,'13.a.divisor','Complete the related division','missing-group-factor','number',['MD.02'],'13-a'],
 ['13-b',6,'13.b','Count packs from a total','equal-groups-count','number',['MD.02']],
 ['14',6,'14','Join the contents, then repeat','sum-before-repeat','number',['MD.01','AS.01']],
 ['15-total',7,'15.total','Check a claim about the total','pictured-total-claim','choice',['MD.01'],'15'],
 ['15-friends',7,'15.friends','Can everyone share equally?','equal-sharing-claim','choice',['MD.02'],'15'],
 ['15-children',7,'15.children','Test another sharing claim','equal-sharing-claim','choice',['MD.02'],'15'],
 ['16',7,'16','Find the amount before buying more','reverse-join-after-packing','number',['MD.01','AS.01']],
 ['17-equation',8,'17.equation','Build a grouping story sentence','equal-groups-count','number-sentence',['MD.02'],'17'],
 ['17-answer',8,'17.answer','Find how many children receive a share','equal-groups-count','number',['MD.02'],'17'],
 ['18-equation',8,'18.equation','Build the starting-total sentence','equal-groups-total','number-sentence',['MD.01'],'18'],
 ['18-answer',8,'18.answer','Restore the starting collection','equal-groups-total','number',['MD.01'],'18'],
 ['19-a-equation',9,'19.a.equation','Build the equal-sharing sentence','equal-sharing','number-sentence',['MD.02'],'19'],
 ['19-a-answer',9,'19.a.answer','Find the number on each tray','equal-sharing','number',['MD.02'],'19'],
 ['19-b-equation',9,'19.b.equation','Build a sentence for the same trays','equal-groups-total','number-sentence',['MD.01'],'19'],
 ['19-b-answer',9,'19.b.answer','Use the same number of trays','equal-groups-total','number',['MD.01'],'19'],
];
export const P2_HENRY_PARK_2025_PATTERNS:P2ImportedPattern[]=rows.map(([id,page,sourcePart,title,canonical,response,skills,group])=>({parameter:`hp2q2-${id}`,level:2,strand:'Number & Algebra',title,objective:title,icon:'✦',sourceParts:[sourcePart],sourcePage:page,group:group??id,canonicalPatternId:canonical,response,coverage:'complete',skillIds:skills.map(s=>`P2.S.${s}`)}));
