import {activityById} from '../primary/catalog';
import type {LessonMeta} from './handIndex';
import {FOUR_ADDENDS_ID} from './lessons/fourAddendsMeta';
import {practiceTopicHref,PRACTICE_TOPIC_NAMES} from '../primary/topicPractice';

type PracticeLesson=Pick<LessonMeta,'id'|'level'|'track'|'activityId'|'skillIds'>;
export function lessonTopicPractice(lesson:PracticeLesson){
 const topic=lesson.skillIds[0]?.split('.')[2];
 if(!topic||!PRACTICE_TOPIC_NAMES[topic])return undefined;
 return {href:practiceTopicHref(lesson.level,lesson.track==='foundation'?'foundation':'standard',topic),label:`Try a varied ${PRACTICE_TOPIC_NAMES[topic].toLowerCase()} set`};
}
/** A fallback route is useful, but must not imply it drills this lesson's exact objective. */
export function lessonPractice(lesson:PracticeLesson){
 const activity=activityById(lesson.activityId);
 if(!activity)return undefined;
 // Four-addend enrichment deliberately links back to the three-addend prerequisite.
 const exact=lesson.id!==FOUR_ADDENDS_ID&&activity.level===lesson.level
  &&(lesson.track==='both'||activity.track===lesson.track)
  &&lesson.skillIds.length>0&&lesson.skillIds.every(id=>activity.skillIds.includes(id));
 return {activity,exact,label:`${exact?'Practise':'Related practice'}: ${activity.title}`};
}
