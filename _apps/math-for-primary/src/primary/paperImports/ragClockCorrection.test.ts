import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragClockCorrection';

function match(text: string, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Missing visible given in ${text}`);
  return result;
}

function readTime(text: string): number {
  const [, hour, minute, period] = match(text, /\b(1[0-2]|[1-9]):([0-5]\d) (am|pm)\b/);
  return (Number(hour) % 12) * 60 + Number(minute) + (period === 'pm' ? 720 : 0);
}

function solveVisible({ prompt, context = [], picture }: Pick<Question, 'prompt' | 'context' | 'picture'>) {
  const facts = context.join(' ');
  if (picture?.type === 'clock') {
    expect(facts).toContain('morning');
    expect(picture.minutes).toBeGreaterThanOrEqual(0);
    expect(picture.minutes).toBeLessThan(720);
    const hours = Number(match(prompt, /in (\d+) hours?\?/)[1]);
    const lead = Number(match(facts, /(\d+) minutes fast/)[1]);
    // Advance the displayed hands first, then undo the fast clock's lead.
    return { kind: 'dial', minutes: picture.minutes + 60 * hours - lead };
  }

  expect(picture).toBeUndefined();
  if (facts.includes('behind')) {
    const lag = Number(match(facts, /(\d+) minutes behind/)[1]);
    const wait = Number(match(prompt, /in (\d+) minutes\?/)[1]);
    const futureHallTime = readTime(facts) + wait;
    return { kind: 'watch', minutes: futureHallTime - lag };
  }

  const first = Number(match(facts, /first hour it loses (\d+) minutes/)[1]);
  const second = Number(match(facts, /next hour it loses another (\d+) minutes/)[1]);
  const start = readTime(facts);
  expect(readTime(prompt)).toBe(start + 120);
  // Follow the watch hands one hour at a time from the synchronised start.
  const afterFirstHour = start + (60 - first);
  return { kind: 'losses', minutes: afterFirstHour + (60 - second) };
}

it('solves each form from the pupil’s givens and grades one time', () => {
  const kinds = new Set<string>();
  const answers = new Set<number>();
  for (let seed = -5; seed < 90; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const expected = solveVisible(question);
      kinds.add(expected.kind);
      answers.add(expected.minutes);
      expect(question.workedSteps?.length).toBeGreaterThanOrEqual(2);
      if (expected.kind === 'dial') {
        expect(question.choices).toBeUndefined();
        const [, hour, minute] = match(question.answer, /^(1[0-2]|[1-9]):([0-5]\d)$/);
        expect((Number(hour) % 12) * 60 + Number(minute)).toBe(expected.minutes % 720);
      } else {
        expect(question.choices).toHaveLength(4);
        const choices = question.choices ?? [];
        expect(new Set(choices.map(readTime)).size).toBe(4);
        expect(choices.filter(choice => readTime(choice) === expected.minutes)).toEqual([question.answer]);
      }
    }
  }
  expect([...kinds].sort()).toEqual(['dial', 'losses', 'watch']);
  expect(answers.size).toBeGreaterThan(30);
});

it('reproduces a seed and index and varies visible givens between questions', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  const givens = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    givens.add(JSON.stringify([q.context, q.picture, q.prompt]));
  }
  expect(givens.size).toBeGreaterThan(8);
});
