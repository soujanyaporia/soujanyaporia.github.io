import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragCompleteOneWhole';

it('finds the unique share that fits the visible story and completes a whole', () => {
  const forms = new Set<string>();
  const stories = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const story = (question.context ?? []).join(' ');
      stories.add(story);
      const fractions = Array.from(story.matchAll(/(\d+)\/(\d+)/g));
      if (!fractions.length) throw new Error('The story needs a visible fraction.');
      const denominator = Number(fractions[0][2]);
      expect(denominator).toBeGreaterThanOrEqual(2);
      expect(denominator).toBeLessThanOrEqual(12);
      const shares = fractions.map(([, top, bottom]) => {
        expect(Number(bottom)).toBe(denominator);
        expect(Number(top)).toBeGreaterThan(0);
        expect(Number(top)).toBeLessThan(denominator);
        return Number(top);
      });

      const games = story.includes('chose just one game');
      if (story.includes('Each piece')) {
        expect(story).toMatch(/cuts two pieces from one ribbon/i);
        expect(shares).toHaveLength(1);
        shares.push(shares[0]);
        forms.add('two equal cuts');
      } else if (shares.length === 1) {
        expect(story).toContain('full ribbon left');
        expect(question.prompt).toContain('cut off');
        forms.add('piece cut off');
      } else {
        expect(shares).toHaveLength(2);
        expect(shares[0]).not.toBe(shares[1]);
        forms.add(games ? 'third group' : 'two unequal cuts');
      }
      if (shares.length === 2) expect(question.prompt).toContain(games ? 'chose catch' : 'is left');

      // Try each proper fraction with the displayed denominator as the missing share.
      const accounted = shares.reduce((total, share) => total + share, 0);
      const solutions = Array.from({ length: denominator - 1 }, (_, i) => i + 1)
        .filter(candidate => candidate + accounted === denominator);
      expect(solutions).toHaveLength(1);
      const expected = `${solutions[0]}/${denominator}`;
      expect(question.answer).toBe(expected);
      const equations = question.workedSteps?.map(step => step.equation);
      if (shares.length === 2) {
        expect(equations).toContain(`${shares[0]}/${denominator} + ${shares[1]}/${denominator} = ${accounted}/${denominator}`);
      }
      expect(equations?.at(-1)).toBe(`${denominator}/${denominator} − ${accounted}/${denominator} = ${expected}`);
      if (games) {
        const choices = question.choices ?? [];
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices.filter(option => option === expected)).toHaveLength(1);
        for (const choice of choices) {
          expect(choice).toMatch(new RegExp(`^[1-9]\\d*/${denominator}$`));
          expect(Number(choice.split('/')[0])).toBeLessThan(denominator);
        }
      } else {
        expect(question.choices).toBeUndefined();
        expect(question.requireSimplified).toBeFalsy();
      }
    }
  }
  expect(forms).toEqual(new Set(['piece cut off', 'two equal cuts', 'two unequal cuts', 'third group']));
  expect(stories.size).toBeGreaterThan(12);
});

it('replays a seed and index exactly and varies the visible story across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const question = makeRagQuestion(73, index);
    expect(makeRagQuestion(73, index)).toEqual(question);
    stories.add((question.context ?? []).join(' '));
  }
  expect(stories.size).toBeGreaterThan(1);
});
