import {FOUR_ADDENDS_META,withFourAddends} from './lessons/fourAddendsMeta';
import type { Track } from '../school/curriculum';
import { PLAN } from './build/plan';
import { HAND_INDEX,type LessonMeta } from './handIndex';
import {activityById} from '../primary/catalog';
/**
 * Lightweight lesson index for the home and curriculum screens (the full lesson content loads on
 * demand). Hand-written exemplars come first in each year, then the lessons generated from the
 * teaching plan. The lesson tests check that this index matches the lesson catalog exactly.
 */
export type { LessonMeta };
const fromPlan:LessonMeta[]=PLAN.map(p=>({id:p.id,level:p.level,track:p.track,title:p.title,world:p.world,minutes:p.minutes,activityId:p.activityId,skillIds:p.skillIds,objective:p.objective}));
export const LESSON_INDEX:LessonMeta[]=withFourAddends([...HAND_INDEX,...fromPlan].sort((a,b)=>a.level-b.level),FOUR_ADDENDS_META);
export const lessonMeta=(id:string)=>LESSON_INDEX.find(l=>l.id===id);
export const lessonsForLevel=(level:number,track:Track)=>LESSON_INDEX.filter(l=>l.level===level&&(l.track==='both'||l.track===track));
export function lessonsForActivity(activityId:string){
 const activity=activityById(activityId);
 // Prefer an exact skill match. A generic post-lesson practice fallback must not
 // make that broader lesson the activity's recommended introduction.
 const related=activity?LESSON_INDEX.filter(l=>l.skillIds.some(id=>activity.skillIds.includes(id))):[];
 return [...related.filter(l=>l.activityId===activityId),...related.filter(l=>l.activityId!==activityId)];
}
export const lessonsForSkill=(skillId:string)=>LESSON_INDEX.filter(l=>l.skillIds.includes(skillId));
