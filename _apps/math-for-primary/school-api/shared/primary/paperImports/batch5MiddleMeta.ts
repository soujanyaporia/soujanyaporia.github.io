/** Whole-paper source inventory; fifteen source responses, not fifteen new methods. */
export const BATCH5_TAO_NAN_P3_SOURCE={paperId:'242042bf41a05791',title:'2025 Tao Nan Primary 3 Weighted Assessment 1',pages:10,questionPages:[2,3,4,5,6,7,8],answerKeyPages:[9],blankPages:[10],numberedQuestions:15,responseUnits:15} as const;
const rows:[string,number,string,string,string[],string][]=[
 ['1',2,'Write a number with a zero place in words','number-name-zero-hundreds',['P3.S.WN.02'],'p3Raffles2025/11'],
 ['2',2,'Order four related four-digit numbers','number-order',['P3.S.WN.03'],'generate/order'],
 ['3',2,'Find an early gap in a decreasing pattern','decreasing-pattern-gap',['P3.S.WN.03'],'batch3Upper/three-digit-backward-pattern'],
 ['4',3,'Compare three prices','decimal-money-maximum',['P2.S.MONEY.02'],'p3Raffles2025/8 price givens'],
 ['5',3,'Exchange hundreds for tens','expanded-number-missing-tens',['P3.S.WN.01'],'generate/place'],
 ['6',3,'Count notes and coins','count-mixed-denominations',['P2.S.MONEY.04'],'Picture/pattern'],
 ['7',4,'Read a morning analogue clock','clock-read-12-hour',['P2.S.TIME.01'],'generate/clock'],
 ['8',4,'Convert hours and minutes to minutes','compound-hours-to-minutes',['P2.S.TIME.02'],'generate/duration at level2'],
 ['9',4,'Count equal bags','equal-groups-count',['P3.S.MD.04'],'batch4Middle/boxes-a'],
 ['10',5,'Find the other menu item','menu-total-known-item-find-other-label',['P3.S.MONEY.01'],'p3Raffles2025/8 price givens'],
 ['11',6,'Compare two money amounts','money-comparison-decimal-subtract',['P3.S.MONEY.01'],'generate/decimalAdd subtraction'],
 ['12',6,'Give a duration in hours and minutes','duration-hours-and-minutes',['P3.S.TIME.02'],'generate/duration'],
 ['13',7,'Combine two compared amounts','comparison-smaller-then-combined-total',['P3.S.AS.01'],'p3Raffles2025/21a'],
 ['14',7,'Follow three linked collections','three-quantities-multiple-then-less-total',['P3.S.MD.03','P3.S.AS.01'],'new configuration'],
 ['15',8,'Find the older age from a sum and difference','pair-sum-difference-older',['P3.S.AS.01','P3.S.MD.04'],'batch4Middle/age-sum-difference'],
];
export const BATCH5_MIDDLE_P3_PARTS=rows.map(([id,sourcePage,title,canonicalPatternId,skillIds,reuses])=>({id,level:3,sourceQuestion:id,sourcePage,title,canonicalPatternId,skillIds,reuses,paperId:BATCH5_TAO_NAN_P3_SOURCE.paperId}));
