import type { Track } from '../school/curriculum';
import type { Lesson } from './model';
import { P1_LESSONS } from './lessons/p1';
import { P2_LESSONS } from './lessons/p2';
import { P3_LESSONS } from './lessons/p3';
import { P4_LESSONS } from './lessons/p4';
import { P5_LESSONS } from './lessons/p5';
import { P6_LESSONS } from './lessons/p6';
/** Every Learn lesson, in teaching order. Curriculum objectives come from the curated MOE map. */
export const LESSONS:Lesson[]=[...P1_LESSONS,...P2_LESSONS,...P3_LESSONS,...P4_LESSONS,...P5_LESSONS,...P6_LESSONS];
export const lessonById=(id:string)=>LESSONS.find(l=>l.id===id);
export const lessonsFor=(level:number,track:Track)=>LESSONS.filter(l=>l.level===level&&(l.track==='both'||l.track===track));
export function nextLessonAfter(lesson:Lesson){const same=LESSONS.filter(l=>l.level===lesson.level&&(l.track==='both'||lesson.track==='both'||l.track===lesson.track));return same[same.indexOf(lesson)+1]??null;}
