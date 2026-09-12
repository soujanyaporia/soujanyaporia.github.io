import {annotateSteps} from './teachingNotes';
import {visualGuide} from './guides';
import type { Lesson } from '../model';
import {numberLesson,arithmeticLesson} from './families/numbers';
import {fractionLesson} from './families/fractions';
import {proportionLesson} from './families/proportion';
import {measureLesson} from './families/measure';
import {spaceLesson} from './families/space';
import {dataLesson} from './families/data';
import { avg } from './families/avg';
import type { Family } from './kit';
import { PLAN,type PlanEntry } from './plan';
/**
 * Lesson builders by syllabus topic code. `plan.ts` lists the codes that are built; the lesson tests
 * check that this registry and that list agree, so the lightweight index can never advertise a
 * lesson that cannot be built.
 */
export const FAMILIES:Record<string,Family>={AVG:avg,WN:p=>/order of operations|brackets|multiply and divide by/.test(p.objective.toLowerCase())?arithmeticLesson(p):numberLesson(p),AS:arithmeticLesson,MD:arithmeticLesson,FACT:arithmeticLesson,FRAC:fractionLesson,DEC:p=>/measurement|measurements/.test(p.objective)?measureLesson(p):proportionLesson(p),MONEY:proportionLesson,PCT:proportionLesson,RATE:proportionLesson,RATIO:proportionLesson,ALG:proportionLesson,LENGTH:measureLesson,MEASURE:measureLesson,TIME:measureLesson,AREA:measureLesson,VOL:measureLesson,ANGLE:spaceLesson,LINES:spaceLesson,SYM:spaceLesson,SHAPE:spaceLesson,SOLID:spaceLesson,CIRCLE:spaceLesson,GRAPH:dataLesson};
export const buildLesson=(p:PlanEntry):Lesson=>{
 const lesson=FAMILIES[p.code](p);
 if(p.code==='AVG'){
  const guide=visualGuide(p);
  lesson.stages=lesson.stages.map(s=>s.kind==='explain'?{...s,title:guide.title,text:guide.frames[0].text,frames:annotateSteps(guide.frames)}:s);
  lesson.revision='coached-2026-09-12';
 }
 return lesson;
};
/** Every generated lesson, in syllabus order. */
export const BUILT_LESSONS:Lesson[]=PLAN.map(buildLesson);
