import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2FractionalShareToPieces';

 test('solve each entry from the whole, the visible share and any further removal', () => {
  const countCases = new Set<string>();
  const fractionCases = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (const index of [0, 1]) {
      const q = makeRagQuestion(seed, index);
      const story = q.context?.join(' ') ?? '';
      const whole = story.match(/into (\d+) equal pieces/);
      const share = story.match(/(\d+)\/(\d+) of the/);
      if (!whole || !share) throw new Error(`Missing equal-piece count or share in: ${story}`);
      const total = Number(whole[1]);
      const numerator = Number(share[1]);
      const denominator = Number(share[2]);
      expect(total).toBeGreaterThan(1);
      expect(total).toBeLessThanOrEqual(12);
      expect(denominator).toBe(total);
      expect(numerator).toBeGreaterThan(0);
      expect(numerator).toBeLessThan(denominator);
      const sharePieces = total * numerator / denominator;
      expect(q.choices).toBeUndefined();

      if (q.prompt.startsWith('How many pieces')) {
        expect(story).toContain(`${share[0]} ribbon was left`);
        expect(q.unit).toBe('pieces');
        const used = total - sharePieces;
        expect(q.answer).toBe(String(used));
        expect(correctAnswer(q, String(used))).toBe(true);
        expect(correctAnswer(q, `${used}/${total}`)).toBe(false);
        countCases.add(`${total},${sharePieces}`);
      } else {
        expect(q.prompt).toMatch(/What fraction.*original bar.*left/);
        const bar = q.picture;
        if (bar?.type !== 'paper' || bar.layout !== 'bars') throw new Error('Missing partitioned chocolate bar');
        expect(bar.rows[0].parts).toHaveLength(total);
        expect(bar.rows[0].parts.every(piece => piece.size === 1 && piece.label === '')).toBe(true);
        expect(story).toContain(`gave ${numerator}/${denominator} of the whole bar`);
        const furtherRemoval = story.match(/ate (\d+) of the other pieces/);
        if (!furtherRemoval) throw new Error(`Missing second removal in: ${story}`);
        const eaten = Number(furtherRemoval[1]);
        const left = total - (sharePieces + eaten);
        expect(eaten).toBeGreaterThan(0);
        expect(left).toBeGreaterThan(0);
        expect(q.unit).toBeUndefined();
        expect(q.answer).toBe(`${left}/${total}`);
        expect(correctAnswer(q, `${left * 2}/${total * 2}`)).toBe(true);
        expect(correctAnswer(q, `${total - sharePieces}/${total}`)).toBe(false);
        expect(correctAnswer(q, `${total - eaten}/${total}`)).toBe(false);
        fractionCases.add(`${total},${sharePieces},${eaten}`);
      }
    }
  }
  expect(countCases.size).toBeGreaterThan(4);
  expect(fractionCases.size).toBeGreaterThan(4);
});

test('a seed reproduces its question and successive indices practise both answer forms', () => {
  for (const seed of [0, 1, 24, 57]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const second = makeRagQuestion(seed, 1);
    expect(second.key).not.toBe(first.key);
    expect([first, second].filter(q => q.prompt.startsWith('How many pieces'))).toHaveLength(1);
    expect([first, second].filter(q => q.prompt.startsWith('What fraction'))).toHaveLength(1);
  }
});
