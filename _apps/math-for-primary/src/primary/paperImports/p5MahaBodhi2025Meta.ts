/** Pure inventory; each row is one response unit, including linked subparts. */
export type MahaBodhiPart={id:string;sourceQuestion:string;sourcePage:number;title:string;skillIds:string[];canonicalPatternId:string};
export const P5_MAHA_BODHI_2025_SOURCE={paperId:'fc86e57a9a66d7fd',title:'2025 Maha Bodhi Primary 5 Weighted Assessment 2',sourceUrl:'https://sgexam.com/subject/maths/2025-p5-maths-weighted-assessment-2-maha-bodhi-pdf/',questionPages:9,answerPages:[11],blankPages:[10,12],numberedQuestions:10,mainAnswerParts:13} as const;
const row=(id:string,sourcePage:number,title:string,canonicalPatternId:string,...skillIds:string[]):MahaBodhiPart=>({id,sourceQuestion:id,sourcePage,title,canonicalPatternId,skillIds});
export const P5_MAHA_BODHI_2025_PARTS:MahaBodhiPart[]=[
 row('1',1,'Convert hourly flow to a minute rate','rate-hour-to-minute','P5.S.RATE.02'),
 row('2a',1,'Add two decimals','decimal-addition','P4.S.DEC.05'),
 row('2b',1,'Round a decimal to the nearest tenth','decimal-round-tenth','P4.S.DEC.04'),
 row('3',2,'Charge for each started mass block','stepped-parcel-charge','P5.S.RATE.02'),
 row('4',3,'Triangle spanning two related squares','two-squares-triangle-area','P5.S.AREA.02','P5.S.AREA.03'),
 row('5',4,'Shaded area in a rectangle and triangle','composite-area-subtract-triangle','P5.S.AREA.03'),
 row('6a',5,'Capacity from a related square-base tank','square-base-capacity-multiple','P5.S.VOL.03'),
 row('6b',5,'Water needed after a transfer','tank-capacity-minus-water','P5.S.VOL.03','P5.S.VOL.04'),
 row('7',6,'Find the value of one coin group','chained-coin-units','P4.S.MD.03','P3.S.MONEY.01'),
 row('8a',7,'Extend a growing cube solid','cube-cross-section-growth','P5.S.VOL.01','P5.S.VOL.02'),
 row('8b',7,'Complete the growing solid to a cube','cube-completion-minimum','P5.S.VOL.03'),
 row('9',8,'Compare swapped purchases','equal-purchases-unit-price','P5.S.RATE.02'),
 row('10',9,'Cancel a shared area','overlap-square-triangle-difference','P5.S.AREA.03'),
];
