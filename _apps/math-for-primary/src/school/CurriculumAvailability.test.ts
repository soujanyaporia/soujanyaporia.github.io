import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from './curriculum';
import {lessonsForSkill} from '../teach/index';
import {CurriculumAvailability} from './CurriculumAvailability';

describe('Curriculum availability labels',()=>{
 it('shows the number-names lesson even without a standalone practice activity',()=>{
  const skill=CURRICULUM_SKILLS.find(s=>s.id==='P1.S.WN.03')!;
  expect(skill.activityIds).toHaveLength(0);
  expect(lessonsForSkill(skill.id).map(l=>l.id)).toContain('p1s-wn-03');
  const html=renderToStaticMarkup(createElement(CurriculumAvailability,{lesson:lessonsForSkill(skill.id).length>0,activity:skill.activityIds.length>0}));
  expect(html).toContain('Lesson available');
  expect(html).not.toContain('not yet');
  expect(html).not.toContain('Practice activity');
  expect(html).not.toContain('✓');
 });
 it('names separate practice without implying completion',()=>{
  const html=renderToStaticMarkup(createElement(CurriculumAvailability,{lesson:true,activity:true}));
  expect(html).toContain('Lesson available');expect(html).toContain('Practice activity');
  expect(html).not.toMatch(/mastered|completed|✓/);
 });
});
