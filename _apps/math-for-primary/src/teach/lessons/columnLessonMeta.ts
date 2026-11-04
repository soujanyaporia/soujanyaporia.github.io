import type {LessonMeta} from '../handIndex';

/** Metadata only: the home and curriculum screens need no column algorithm runtime. */
export const COLUMN_LESSON_META:LessonMeta[]=[
 {id:'p1-written-addition',level:1,track:'both',world:'operation-station',title:'Written addition within 100',minutes:10,activityId:'p1s-add-large-n10',skillIds:['P1.S.AS.05'],objective:'Line up tens and ones, exchange ten ones for one ten, and complete written addition within 100'},
 {id:'p1-written-subtraction',level:1,track:'both',world:'operation-station',title:'Written subtraction within 100',minutes:10,activityId:'p1s-subtract-large-n16',skillIds:['P1.S.AS.05'],objective:'Exchange one ten for ten ones and complete written subtraction within 100'},
 {id:'p2-written-addition',level:2,track:'both',world:'operation-station',title:'Written addition with three digits',minutes:12,activityId:'p2s-add-n5',skillIds:['P2.S.AS.01'],objective:'Align hundreds, tens and ones and include carried units in three-digit addition'},
 {id:'p2-written-subtraction',level:2,track:'both',world:'operation-station',title:'Written subtraction across a zero',minutes:12,activityId:'p2s-subtract-n6',skillIds:['P2.S.AS.01'],objective:'Use adjacent place-value exchanges, including across a zero, in three-digit subtraction'},
];
export const COLUMN_LESSON_PLACEMENTS:Record<string,string[]>={
 'p1s-as-05':['p1-written-addition','p1-written-subtraction'],
 'p2s-as-01':['p2-written-addition','p2-written-subtraction'],
};
/** Preserve existing lesson identities and insert each extension directly after its prerequisite. */
export function withColumnLessons<T extends {id:string}>(lessons:T[],extensions:T[]):T[]{
 const existing=new Set(lessons.map(l=>l.id)),byId=new Map(extensions.map(l=>[l.id,l]));
 return lessons.flatMap(lesson=>[lesson,...(COLUMN_LESSON_PLACEMENTS[lesson.id]??[]).flatMap(id=>{const next=byId.get(id);return next&&!existing.has(id)?[next]:[];})]);
}
