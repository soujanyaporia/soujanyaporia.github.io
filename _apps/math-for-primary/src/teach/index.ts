import type { Track } from '../school/curriculum';
/**
 * Lightweight lesson index for the home and curriculum screens (the full lesson content loads on
 * demand). The lesson tests check that this index matches the lesson catalog exactly.
 */
export interface LessonMeta {id:string;level:number;track:Track|'both';title:string;world:string;minutes:number;activityId:string;skillIds:string[];objective:string}
export const LESSON_INDEX:LessonMeta[]=[
 {id:'p1-missing-parts',level:1,track:'both',title:'Find the missing part',world:'operation-station',minutes:10,activityId:'p1s-missing-n9',skillIds:['P1.S.AS.03','P1.S.AS.04'],objective:'Find a missing part when the whole and one part are known'},
 {id:'p1-missing-take-away',level:1,track:'both',title:'Missing numbers in take-away',world:'operation-station',minutes:10,activityId:'p1s-missing-n9',skillIds:['P1.S.AS.02','P1.S.AS.04'],objective:'Find the starting number when the parts are known'},
 {id:'p2-equal-groups',level:2,track:'both',title:'Equal groups become multiplication',world:'operation-station',minutes:12,activityId:'p2s-multiply-n7',skillIds:['P2.S.MD.01','P2.S.MD.04'],objective:'Recognise equal groups and describe them as groups of'},
 {id:'p2-sharing-and-grouping',level:2,track:'both',title:'Two kinds of division',world:'operation-station',minutes:12,activityId:'p2s-divide-n8',skillIds:['P2.S.MD.02','P2.S.MD.03'],objective:'Share a quantity equally and say how many each'},
 {id:'p3-equivalent-fractions',level:3,track:'both',title:'Equivalent fractions',world:'fraction-forest',minutes:12,activityId:'p3s-fractionEquivalent-n9',skillIds:['P3.S.FRAC.01','P3.S.FRAC.04'],objective:'Recognise that different fractions can name the same amount'},
 {id:'p3-simplest-form',level:3,track:'both',title:'Simplest form',world:'fraction-forest',minutes:10,activityId:'p3s-fractionSimplify-n10',skillIds:['P3.S.FRAC.02'],objective:'Find a common factor of the numerator and denominator'},
 {id:'p4-decimal-place-value',level:4,track:'both',title:'Tenths, hundredths and thousandths',world:'decimal-depths',minutes:12,activityId:'p4s-decimalPlace-n10',skillIds:['P4.S.DEC.01','P4.S.DEC.02','P4.S.DEC.03'],objective:'Read the value of each digit in a decimal'},
 {id:'p4-decimal-add-subtract',level:4,track:'both',title:'Adding and subtracting decimals',world:'decimal-depths',minutes:12,activityId:'p4s-decimalAdd-n14',skillIds:['P4.S.DEC.05'],objective:'Add and subtract decimals with up to two decimal places'},
 {id:'p5-percent-meaning',level:5,track:'standard',title:'Percentage means per hundred',world:'ratio-realm',minutes:12,activityId:'p5s-percent-n10',skillIds:['P5.S.PCT.01','P5.S.PCT.02'],objective:'Read a percentage as a number of parts per hundred'},
 {id:'p5-percent-of-quantity',level:5,track:'standard',title:'A percentage of a quantity',world:'ratio-realm',minutes:12,activityId:'p5s-percent-quantity-n11',skillIds:['P5.S.PCT.03','P5.S.PCT.04'],objective:'Find a percentage of a quantity'},
 {id:'p6-ratio-meaning',level:6,track:'standard',title:'What a ratio compares',world:'ratio-realm',minutes:12,activityId:'p6s-ratio-n3',skillIds:['P6.S.RATIO.01','P6.S.RATIO.02'],objective:'Read a ratio as a comparison in equal units'},
 {id:'p6-ratio-share',level:6,track:'standard',title:'Dividing a quantity in a ratio',world:'ratio-realm',minutes:12,activityId:'p6s-ratioShare-n5',skillIds:['P6.S.RATIO.03','P6.S.RATIO.04'],objective:'Find the value of one unit from a total'},
 {id:'p6-algebra-equations',level:6,track:'standard',title:'Letters and balanced equations',world:'algebra-academy',minutes:14,activityId:'p6s-equation-n8',skillIds:['P6.S.ALG.01','P6.S.ALG.04','P6.S.ALG.05'],objective:'Use a letter for an unknown number'},
];
export const lessonMeta=(id:string)=>LESSON_INDEX.find(l=>l.id===id);
export const lessonsForLevel=(level:number,track:Track)=>LESSON_INDEX.filter(l=>l.level===level&&(l.track==='both'||l.track===track));
export const lessonsForActivity=(activityId:string)=>LESSON_INDEX.filter(l=>l.activityId===activityId);
export const lessonsForSkill=(skillId:string)=>LESSON_INDEX.filter(l=>l.skillIds.includes(skillId));
