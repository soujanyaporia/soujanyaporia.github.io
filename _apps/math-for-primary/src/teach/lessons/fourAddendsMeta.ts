import type {LessonMeta} from '../handIndex';

// Metadata only: home and curriculum screens do not load the lesson generators.
export const FOUR_ADDENDS_ID='p1-add-four-small-numbers';
export const FOUR_ADDENDS_AFTER='p1s-as-06';
export const FOUR_ADDENDS_META:LessonMeta={
 id:FOUR_ADDENDS_ID,level:1,track:'both',world:'operation-station',title:'Add four small numbers · extra practice',minutes:10,
 activityId:'p1s-add-three-n15',skillIds:['P1.S.AS.06'],
 objective:'Extend three-number addition by joining one more small group, with totals within 20',
};

/** Insert immediately after the three-addend lesson without changing any existing attempt. */
export function withFourAddends<T extends {id:string}>(lessons:T[],extension:T):T[]{
 return lessons.flatMap(lesson=>lesson.id===FOUR_ADDENDS_AFTER?[lesson,extension]:[lesson]);
}
