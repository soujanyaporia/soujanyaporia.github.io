import { expect, test } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragClockPhrases';

// Decode a pupil-facing option into a dial position, independently of the generator.
function readPhrase(text: string): number {
  const match = /^(5|10|15|20|25) minutes (past|to) (1[0-2]|[1-9])$/.exec(text);
  if (!match) throw new Error(`Unreadable time phrase: ${text}`);
  const distance = Number(match[1]);
  const hourMark = Number(match[3]) * 60;
  return (720 + hourMark + (match[2] === 'past' ? distance : -distance)) % 720;
}

test('the hands determine exactly one choice or one ordered pair', () => {
  const modes = new Set<string>();
  const nextHours = new Set<number>();
  const faces = new Set<number>();
  for (let seed = 0; seed < 128; seed++) {
    for (let index = 0; index < 3; index++) {
      const question = makeRagQuestion(seed, index);
      if (question.picture?.type !== 'clock') throw new Error('Expected an analogue face');
      const face = question.picture.minutes;
      faces.add(face);
      expect(Number.isInteger(face)).toBe(true);
      expect(face).toBeGreaterThanOrEqual(0);
      expect(face).toBeLessThan(720);
      expect(face % 5).toBe(0);
      expect(face % 30).not.toBe(0);
      expect([35, 290, 545]).not.toContain(face);

      if (question.choices) {
        expect(question.structuredResponse).toBeUndefined();
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        const matches = question.choices.filter(option => readPhrase(option) === face);
        expect(matches).toHaveLength(1);
        expect(question.answer).toBe(matches[0]);
        const direction = face % 60 < 30 ? 'past' : 'to';
        expect(matches[0]).toContain(` minutes ${direction} `);
        modes.add(direction);
      } else {
        const spec = question.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Expected two number boxes');
        expect(question.prompt).toContain('___ minutes to ___');
        expect(face % 60).toBeGreaterThan(30);
        const nextHour = Math.ceil(face / 60);
        const minutesLeft = nextHour * 60 - face;
        const encode = (minutes: number, hour: number) => JSON.stringify([String(minutes), String(hour)]);
        const expected = encode(minutesLeft, nextHour);
        expect(question.answer).toBe(expected);
        expect(structuredResponseCorrect(spec, question.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, encode(face % 60, nextHour))).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, encode(minutesLeft, nextHour - 1 || 12))).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([String(minutesLeft), '']))).toBe(false);
        nextHours.add(nextHour);
        modes.add('fields');
      }
    }
  }
  expect(modes).toEqual(new Set(['past', 'to', 'fields']));
  expect(nextHours.has(12)).toBe(true);
  expect(nextHours.has(1)).toBe(true);
  expect(faces.size).toBeGreaterThan(30);
});

test('a seed and index reproduce the same face and response order', () => {
  expect(makeRagQuestion(42, 7)).toEqual(makeRagQuestion(42, 7));
  expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
});
