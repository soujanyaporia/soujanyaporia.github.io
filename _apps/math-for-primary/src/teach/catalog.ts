import {CURRICULUM_SKILLS} from '../school/curriculum';
import {planFor} from './build/plan';
import {annotateSteps} from './build/teachingNotes';
import {visualGuide} from './build/guides';
import type { Track } from '../school/curriculum';
import { BUILT_LESSONS } from './build';
import type { Lesson } from './model';
import { P1_LESSONS } from './lessons/p1';
import { P2_LESSONS } from './lessons/p2';
import { P3_LESSONS } from './lessons/p3';
import { P4_LESSONS } from './lessons/p4';
import { P5_LESSONS } from './lessons/p5';
import { P6_LESSONS } from './lessons/p6';
/**
 * Every Learn lesson, in teaching order: the hand-written exemplars for each year, then the lessons
 * built from the teaching plan. Curriculum objectives come from the curated MOE map in both cases.
 */
const HAND:Lesson[]=[...P1_LESSONS,...P2_LESSONS,...P3_LESSONS,...P4_LESSONS,...P5_LESSONS,...P6_LESSONS];
const VISUAL_HAND=HAND.map(lesson=>{
 const skill=CURRICULUM_SKILLS.find(s=>s.id===lesson.skillIds[0]);if(!skill)return lesson;
 const guide=visualGuide(planFor(skill));
 // Keep authored activities and examples; replace the dense conceptual paragraph with pictures.
 return {...lesson,revision:'coached-2026-09-12',stages:lesson.stages.map(s=>s.kind==='explain'?{...s,frames:annotateSteps(guide.frames),alternatives:guide.alternatives?.map(a=>({...a,frames:annotateSteps(a.frames)}))}:s)};
});
export const LESSONS:Lesson[]=[...VISUAL_HAND,...BUILT_LESSONS].sort((a,b)=>a.level-b.level);
export const lessonById=(id:string)=>LESSONS.find(l=>l.id===id);
export const lessonsFor=(level:number,track:Track)=>LESSONS.filter(l=>l.level===level&&(l.track==='both'||l.track===track));
export function nextLessonAfter(lesson:Lesson){const same=LESSONS.filter(l=>l.level===lesson.level&&(l.track==='both'||lesson.track==='both'||l.track===lesson.track));return same[same.indexOf(lesson)+1]??null;}
