import type { Track } from '../school/curriculum';
import { PLAN } from './build/plan';
import { HAND_INDEX,type LessonMeta } from './handIndex';
/**
 * Lightweight lesson index for the home and curriculum screens (the full lesson content loads on
 * demand). Hand-written exemplars come first in each year, then the lessons generated from the
 * teaching plan. The lesson tests check that this index matches the lesson catalog exactly.
 */
export type { LessonMeta };
const fromPlan:LessonMeta[]=PLAN.map(p=>({id:p.id,level:p.level,track:p.track,title:p.title,world:p.world,minutes:p.minutes,activityId:p.activityId,skillIds:p.skillIds,objective:p.objective}));
export const LESSON_INDEX:LessonMeta[]=[...HAND_INDEX,...fromPlan].sort((a,b)=>a.level-b.level);
export const lessonMeta=(id:string)=>LESSON_INDEX.find(l=>l.id===id);
export const lessonsForLevel=(level:number,track:Track)=>LESSON_INDEX.filter(l=>l.level===level&&(l.track==='both'||l.track===track));
export const lessonsForActivity=(activityId:string)=>LESSON_INDEX.filter(l=>l.activityId===activityId);
export const lessonsForSkill=(skillId:string)=>LESSON_INDEX.filter(l=>l.skillIds.includes(skillId));
