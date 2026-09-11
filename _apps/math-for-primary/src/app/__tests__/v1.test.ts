import { describe, expect, it } from 'vitest';
import { href, parseRoute, type Route } from '../router';
import { LESSONS } from '../../content/lessons';
import { ENABLED_TOPICS, topicById } from '../../content/topics';
import { generateProblem } from '../../engine/skills';
import { buildSession } from '../../engine/session';
import { checkAnswer } from '../../engine/validate';
import { explain } from '../../engine/explain';
import { mixedPool } from '../../lib/mastery';
import { initialProgress } from '../../state/progress';
import type { LevelId } from '../../engine/types';

describe('complete V1 experience', () => {
  it('round-trips every visible route and safely handles malformed links', () => {
    const routes: Route[] = [{name:'home'}, {name:'learn'}, {name:'words'}, {name:'mixed'}, {name:'progress'},
      {name:'practice'}, {name:'practice-topic',topic:'stories-build'}, {name:'lesson',id:'add-10'}];
    for (const route of routes) expect(parseRoute(href(route))).toEqual(route);
    expect(parseRoute('#/%E0%A4%A')).toEqual({name:'home'});
    expect(parseRoute('#/lesson/')).toEqual({name:'learn'});
  });
  it('generates every lesson with five examples and five distinct practice questions', () => {
    for (const lesson of LESSONS) {
      expect(lesson.examples).toHaveLength(5);
      expect(lesson.practice).toHaveLength(5);
      expect(topicById(lesson.topic)).toBeDefined();
      for (let seed=1; seed<=50; seed++) {
        const problems=buildSession([...lesson.examples,...lesson.practice],seed);
        expect(new Set(problems.map(p=>p.id)).size, `${lesson.id} seed ${seed}`).toBe(10);
        for (const p of problems) {
          expect(['+','-']).toContain(p.fact.op);
          expect(explain(p).steps.length).toBeGreaterThan(1);
        }
      }
    }
  });
  it('keeps every enabled topic additive, including high-level story tiles', () => {
    for (const topic of ENABLED_TOPICS) for (const skill of topic.skills) for (const level of [1,2,3,4,5] as LevelId[]) for (let seed=1;seed<=40;seed++) {
      const p=generateProblem({skill,level},seed);
      expect(['+','-']).toContain(p.fact.op);
      if (p.kind==='translate') {
        for (const tile of p.tiles) if(tile.kind==='op') expect(['+','-']).toContain(tile.op);
        expect(p.actionChoices).not.toContain('groups');
        expect(p.actionChoices).not.toContain('share');
      }
    }
    const state=initialProgress();
    state.nodes['mul-groups']={completions:1,bestStars:3,lastStars:3,bestAccuracy:1,lastAt:1};
    expect(mixedPool(state).every(skill=> !skill.startsWith('mul.') && !skill.startsWith('div.'))).toBe(true);
    expect(topicById('mul-facts')).toBeUndefined();
  });
  it('can fill ten-question sessions for every enabled topic and number range', () => {
    for (const topic of ENABLED_TOPICS) for (const level of [1,2,3,4,5] as LevelId[]) for (let seed=1;seed<=10;seed++) {
      const requests=Array.from({length:10},(_,i)=>({skill:topic.skills[i%topic.skills.length],level}));
      const problems=buildSession(requests,seed);
      expect(new Set(problems.map(p=>p.id)).size, `${topic.id}/${level}/${seed}`).toBe(10);
    }
  });
  it('does not diagnose multiplication or division in additive feedback', () => {
    const p=generateProblem({skill:'add.result',level:2,constraints:{fixed:{a:4,b:4}}},1);
    const result=checkAnswer(p,{kind:'number',value:1});
    expect(JSON.stringify(result)).not.toMatch(/divid|multipl/);
    expect(result.correct).toBe(false);
  });
});
