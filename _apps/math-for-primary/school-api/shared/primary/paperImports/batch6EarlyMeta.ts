/** Complete cached P2 paper:14 numbered questions,16 logical response units and17 answer slots. */
export const BATCH6_EARLY_SOURCE={paperId:'1ecd894b28a9aa05',sourceTitle:'2025 Maha Bodhi Primary 2 Topical Review 2',sourceUrl:'https://sgexam.com/subject/maths/2025-p2-maths-term-2-revision-maha-bodhi-pdf/',numberedQuestions:14,responseUnits:16,physicalPages:8} as const;
const rows=[
 ['1',1,'Read the analogue clock','p2-clock-minute','P2.S.TIME.01'],
 ['2',2,'Convert hours and minutes','mixed-duration-to-minutes','P2.S.TIME.02'],
 ['3',2,'Count repeated addends','repeated-addition-missing-group-count','P2.S.MD.01'],
 ['4',2,'Count notes and coins','mixed-notes-coins-dollar-carry','P2.S.MONEY.04'],
 ['5',3,'Find the afternoon duration','twelve-hour-pm-duration','P2.S.TIME.02'],
 ['6',3,'Find a morning finish time','finish-time-from-start-and-duration','P2.S.TIME.01','P2.S.TIME.02'],
 ['7',4,'Share a collection equally','equal-sharing','P2.S.MD.02'],
 ['8',4,'Write cents as dollars','cents-to-dollars-two-place','P2.S.MONEY.03'],
 ['9',4,'Find how many remain','three-digit-remaining-borrow-zero','P2.S.AS.01'],
 ['10',5,'Join two daily counts','three-digit-join-no-carry','P2.S.AS.01'],
 ['11',5,'Find the equal-group total','equal-groups-total','P2.S.MD.01'],
 ['12',5,'Use money left to find two purchases','whole-dollar-change-pair','P2.S.MONEY.04','P2.S.AS.01'],
 ['13a',6,'Find the smaller spending amount','three-digit-comparison-smaller','P2.S.AS.01'],
 ['13b',6,'Combine both spending amounts','comparison-then-combined-total','P2.S.AS.01'],
 ['14a',7,'Recover the missing daily amount','three-digit-missing-day','P2.S.AS.01'],
 ['14b',7,'Compare the two daily amounts','missing-day-then-difference','P2.S.AS.01'],
] as const;
export type Batch6EarlyPart=typeof rows[number][0];
export const BATCH6_EARLY_PARTS=rows.map(([id,page,title,family,...skillIds])=>({id,title,family,level:2 as const,skillIds:[...skillIds],objective:title,sourceUnits:[{...BATCH6_EARLY_SOURCE,sourceQuestion:id,sourcePage:page}]}));
