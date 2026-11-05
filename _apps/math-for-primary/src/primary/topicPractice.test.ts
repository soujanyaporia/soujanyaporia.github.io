import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {practiceTopicHref,topicPracticeChoices} from './topicPractice';
import {ACTIVITIES} from './catalog';
import {parseRoute,href} from '../app/router';
import {lessonMeta,LESSON_INDEX} from '../teach/index';
import {lessonApplication} from '../teach/lessonApplicationSelection';
import {LessonApplication} from '../teach/LessonApplicationCard';
import {lessonTopicPractice} from '../teach/lessonPractice';
import {correctAnswer} from './generate';
import {responseReady} from './answerFormat';
import {makeQuestion} from './generate';
import {paperReasoningFamily} from './paperBlueprints';
it('links grade-specific topics to paper setup without losing the selected path',()=>{
 for(const [level,track] of [[1,'standard'],[5,'standard'],[6,'foundation']] as const){const link=practiceTopicHref(level,track,'DEC');expect(parseRoute(link)).toEqual({name:'papers',level,track,topic:'DEC'});expect(href(parseRoute(link))).toBe(link);}
 expect(parseRoute('#/papers/p2f/DEC')).toEqual({name:'papers'});expect(parseRoute('#/papers')).toEqual({name:'papers'});
 const choices=topicPracticeChoices(ACTIVITIES.filter(a=>a.level===5&&a.track==='standard'));expect(choices.find(t=>t.code==='DEC')?.examples).toContain('Plan equal ribbon pieces');
 expect(lessonTopicPractice(lessonMeta('p5s-dec-01')!)?.href).toBe('#/papers/p5s/DEC');
});
it('adds source-based applications only for the lesson skills and earlier-grade prerequisites',()=>{
 let available=0;
 for(const lesson of LESSON_INDEX){const e=lessonApplication(lesson,17);if(!e)continue;available++;expect(e.activity.level).toBe(lesson.level);expect(e.activity.skillIds.some(id=>lesson.skillIds.includes(id))).toBe(true);expect(e.activity.skillIds.every(id=>lesson.skillIds.includes(id)||Number(id.match(/^P(\d+)/)?.[1])<lesson.level)).toBe(true);expect(correctAnswer(e.question,e.question.answer),lesson.id).toBe(true);expect(responseReady(e.question,e.question.answer),lesson.id).toBe(true);expect(e.question.workedSteps?.length,lesson.id).toBeGreaterThan(0);}
 expect(available).toBeGreaterThan(40);
 const lesson=lessonMeta('p5s-dec-01')!;const a=lessonApplication(lesson,17);expect(a).toEqual(lessonApplication(lesson,17));expect(a?.question.context?.length).toBeGreaterThan(0);
 const html=renderToStaticMarkup(createElement(LessonApplication,{lesson,seed:17}));expect(html).toContain('Use what you learned');expect(html).toContain('Check this question');
});
it('does not count correction wording as a second compound-mass conversion pattern',()=>{
 const plain=ACTIVITIES.find(a=>a.parameter==='p5-convert')!,correction=ACTIVITIES.find(a=>a.parameter==='b12d-conversion-mistake')!;
 expect(paperReasoningFamily(plain,makeQuestion(plain,17,0))).toBe(paperReasoningFamily(correction,makeQuestion(correction,17,0)));
});
