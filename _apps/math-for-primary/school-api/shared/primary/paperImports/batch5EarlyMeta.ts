/** Complete16-question early-P1 source inventory:22 response units,35 printed response slots. */
export const BATCH5_EARLY_SOURCE={paperId:'83f52da6fb608310',sourceTitle:'2025 Henry Park Primary 1 Quiz 1',sourceUrl:'https://sgexam.com/subject/maths/2025-p1-maths-quiz-1-henry-park-pdf/',numberedQuestions:16,responseUnits:22,physicalPages:10} as const;
const rows=[
 ['1',1,'Count a collection','count-small','P1.S.WN.01'],
 ['2',2,'Count and write the number name','count-name-small','P1.S.WN.01','P1.S.WN.03'],
 ['3',2,'Choose the set with more','compare-counted-sets','P1.S.WN.04'],
 ['4a',3,'Count Set A','count-compared-sets','P1.S.WN.01'],['4b',3,'Count Set B','count-compared-sets','P1.S.WN.01'],
 ['4c',3,'Complete the smaller-number box','compare-counted-sets','P1.S.WN.04'],['4d',3,'Complete the larger-number box','compare-counted-sets','P1.S.WN.04'],
 ['5',3,'Add within ten','small-addition','P1.S.AS.05'],['6',4,'Build an addition equation from cards','small-card-addition','P1.S.AS.04'],
 ['7',4,'Find a missing addend','small-missing-addend','P1.S.AS.03'],['8',4,'Subtract with crossed-out objects','small-take-away','P1.S.AS.05'],
 ['9',5,'Find how many were removed','small-missing-subtrahend','P1.S.AS.03'],['10',5,'Build a subtraction for a pictured whole and its parts','small-counted-subtraction','P1.S.AS.04'],
 ['11',5,'Choose a sum with the same answer','equal-addition-expression-search','P1.S.AS.05'],['12',6,'Find how many remain','small-take-away-story','P1.S.AS.02'],
 ['13',6,'Fill an internal pattern gap','small-increasing-pattern-gap','P1.S.WN.05'],
 ['14-equation',7,'Build an equation after more are given','small-joining-change-story','P1.S.AS.01','P1.S.AS.04'],['14-answer',7,'Find how many after more are given','small-joining-change-story','P1.S.AS.01'],
 ['15-equation',8,'Build an equation for two collections','small-static-joining-story','P1.S.AS.01','P1.S.AS.04'],['15-answer',8,'Find the combined collection','small-static-joining-story','P1.S.AS.01'],
 ['16-equation',9,'Build an equation for the missing category','small-part-whole-story','P1.S.AS.03','P1.S.AS.04'],['16-answer',9,'Find the missing category','small-part-whole-story','P1.S.AS.03'],
] as const;
export type Batch5EarlyPart=typeof rows[number][0];
export const BATCH5_EARLY_PARTS=rows.map(([id,page,title,family,...skillIds])=>({id,title,family,level:1 as const,skillIds:[...skillIds],sourceUnits:[{...BATCH5_EARLY_SOURCE,sourceQuestion:id,sourcePage:page}],objective:title}));
