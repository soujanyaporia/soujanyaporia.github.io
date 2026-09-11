import { describe, expect, it } from 'vitest';
import { applyAttempt, applySessionComplete, initialProgress, sanitize } from '../progress';
import { newBadges } from '../../content/badges';
const answer = {skill:'add.result' as const,level:2 as const,correct:true,firstTry:true,hints:0,tries:1,revealed:false,at:new Date(2026,8,11,12).getTime()};
describe('lesson progress persistence', () => {
  it('records totals, adaptive skill data, completion, and badges across reload', () => {
    let state=initialProgress(answer.at);
    for(let i=0;i<5;i++) state=applyAttempt(state,{...answer,at:answer.at+i});
    state=applySessionComplete(state,3,'add-10',answer.at);
    state.badges=newBadges(state).map(b=>b.id);
    const restored=sanitize(JSON.parse(JSON.stringify(state)))!;
    expect(restored.totals).toMatchObject({attempted:5,firstTry:5,correct:5,tries:5,sessions:1,stars:3});
    expect(restored.nodes['add-10'].completions).toBe(1);
    expect(restored.skills['add.result']?.attempts).toBe(5);
    expect(restored.streak.current).toBe(1);
    expect(restored.badges).toContain('first-lesson');
    expect(newBadges(restored)).toHaveLength(0);
  });
  it('preserves V1 lessons and badges during migration', () => {
    const restored=sanitize({version:1,lessons:{'add-10':{completions:2,bestStars:3}},badges:['first-lesson']})!;
    expect(restored.nodes['add-10'].completions).toBe(2);
    expect(restored.badges).toEqual(['first-lesson']);
    expect(restored.settings.readAloud).toBe(false);
    expect(sanitize({version:500})).toBeNull();
  });
  it('keeps revealed answers out of independent accuracy', () => {
    const state=applyAttempt(initialProgress(),{...answer,revealed:true,hints:3,tries:4});
    expect(state.totals).toMatchObject({correct:0,firstTry:0,hints:3,tries:4});
    expect(state.skills['add.result']?.reveals).toBe(1);
  });
});
