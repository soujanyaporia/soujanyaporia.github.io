import { ACTIVITIES } from '../../primary/catalog';
import { CURRICULUM_SKILLS,type CurriculumSkill,type Track } from '../../school/curriculum';
import type { WorldId } from '../model';
/**
 * The teaching plan: one dedicated entry for every mapped syllabus objective. Broad exemplar lessons
 * remain available alongside these focused sequences. Entries carry only metadata, so the lightweight lesson index can be built
 * from them without loading any lesson content. `build/index.ts` turns an entry into a full lesson
 * using the builder registered for its topic code.
 */
const WORLD_BY_CODE:Record<string,WorldId>={
 WN:'number-kingdom',FACT:'number-kingdom',
 AS:'operation-station',MD:'operation-station',
 FRAC:'fraction-forest',DEC:'decimal-depths',
 PCT:'ratio-realm',RATE:'ratio-realm',RATIO:'ratio-realm',ALG:'algebra-academy',
 MONEY:'measurement-metro',LENGTH:'measurement-metro',MEASURE:'measurement-metro',TIME:'measurement-metro',
 AREA:'measurement-metro',VOL:'measurement-metro',
 SHAPE:'geometry-galaxy',ANGLE:'geometry-galaxy',LINES:'geometry-galaxy',SYM:'geometry-galaxy',
 SOLID:'geometry-galaxy',CIRCLE:'geometry-galaxy',
 GRAPH:'data-city',AVG:'data-city',
};
export interface PlanEntry {
 id:string;code:string;level:number;track:Track|'both';world:WorldId;title:string;minutes:number;
 activityId:string;skillIds:string[];objective:string;prerequisites:string[];skill:CurriculumSkill;
}
/**
 * The practice activity a lesson prepares for: the activity mapped to this objective when one
 * exists, otherwise the closest activity in the same topic, strand and year. Every objective
 * resolves, so a lesson always has somewhere to practise afterwards.
 */
function activityFor(s:CurriculumSkill){
 const here=ACTIVITIES.filter(a=>a.level===s.level&&a.track===s.track);
 return (ACTIVITIES.find(a=>a.skillIds.includes(s.id))
  ??here.find(a=>a.skillIds.some(x=>x.split('.')[2]===s.subtopic))
  ??here.find(a=>a.strand===s.strand)
  ??here[0])?.id??'';
}
/** Lesson length: shorter for the youngest pupils, longer where the reasoning is heavier. */
const minutesFor=(level:number)=>level<=2?8:level<=4?10:12;
export function planFor(s:CurriculumSkill):PlanEntry{
 const nn=s.id.split('.')[3];
 return {
  id:`p${s.level}${s.track==='foundation'?'f':'s'}-${s.subtopic.toLowerCase()}-${nn}`,
  code:s.subtopic,level:s.level,track:s.level<5?'both':s.track,
  world:WORLD_BY_CODE[s.subtopic]??'number-kingdom',
  title:s.title,minutes:minutesFor(s.level),activityId:activityFor(s),
  skillIds:[s.id],objective:s.title,prerequisites:s.prerequisites,skill:s,
 };
}
/** Every mapped objective, in syllabus order. */
export const ALL_PLAN:PlanEntry[]=CURRICULUM_SKILLS.map(planFor);
/**
 * Topic codes with a lesson builder. Kept as plain strings so the lightweight index can be built
 * without importing any lesson content; `build/index.ts` is tested against this list.
 */
export const FAMILY_CODES:string[]=['WN','AS','MD','FACT','FRAC','DEC','MONEY','PCT','RATE','RATIO','ALG','LENGTH','MEASURE','TIME','AREA','VOL','ANGLE','LINES','SYM','SHAPE','SOLID','CIRCLE','GRAPH','AVG'];
/** The objectives that are actually built today. */
export const PLAN:PlanEntry[]=ALL_PLAN.filter(p=>FAMILY_CODES.includes(p.code));
/** Objectives with no lesson yet, for the coverage map to report honestly. */
export const UNPLANNED:PlanEntry[]=ALL_PLAN.filter(p=>!FAMILY_CODES.includes(p.code));
