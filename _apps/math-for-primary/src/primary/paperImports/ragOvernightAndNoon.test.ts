import { expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragOvernightAndNoon';

function sample(): Question[] {
  const questions: Question[] = [];
  for (let seed = -12; seed <= 35; seed++) {
    for (let index = 0; index < 3; index++) questions.push(makeRagQuestion(seed, index));
  }
  return questions;
}

function readClocks(text: string): number[] {
  return Array.from(text.matchAll(/\b(\d{1,2}):(\d{2}) (am|pm)\b/g), match => {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    expect(hour).toBeGreaterThanOrEqual(1);
    expect(hour).toBeLessThanOrEqual(12);
    expect(minute).toBeLessThan(60);
    return (hour % 12 + (match[3] === 'pm' ? 12 : 0)) * 60 + minute;
  });
}

test('grades the next-day clock reading and the longer duration from the visible camera givens', () => {
  const distinct = new Set<string>();
  for (const q of sample().filter(item => item.prompt.startsWith('(a)'))) {
    const text = (q.context ?? []).join(' ');
    distinct.add(text);
    expect(text).toContain('both start recording');
    expect(text).toContain('All times use the same clock');
    expect(q.prompt).toMatch(/\(a\).*24-hour clock[\s\S]*\(b\).*hours and minutes/);
    const clocks = readClocks(text);
    expect(clocks).toHaveLength(1);
    const length = /owl camera records for (\d+) h (\d+) min/.exec(text);
    const later = /fox camera stops (\d+) minutes after the owl camera/.exec(text);
    if (!length || !later) throw new Error('Missing recording length or later-stop interval');

    const firstLength = Number(length[1]) * 60 + Number(length[2]);
    const firstFinish = clocks[0] + firstLength;
    expect(firstFinish).toBeGreaterThan(24 * 60);
    expect(firstFinish).toBeLessThan(36 * 60);
    const hour = Math.floor(firstFinish / 60) % 24;
    const minute = firstFinish % 60;
    // Equal starts make the difference between lengths equal to the difference between stops.
    const longer = firstLength + Number(later[1]);
    const values = [hour, minute, Math.floor(longer / 60), longer % 60];
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields') throw new Error('Both parts need labelled numeric fields');
    expect(spec.fields.map(field => field.label)).toEqual([
      '(a) Stop time — hour (24-hour clock)', '(a) Stop time — minute',
      '(b) Recording time — hours', '(b) Recording time — minutes',
    ]);
    expect(correctAnswer(q, JSON.stringify(values.map(String)))).toBe(true);
    expect(correctAnswer(q, JSON.stringify([hour + 12, ...values.slice(1)].map(String)))).toBe(false);
    expect(correctAnswer(q, JSON.stringify([hour, minute, Number(length[1]), Number(length[2])].map(String)))).toBe(false);
    expect(correctAnswer(q, JSON.stringify(values.slice(0, 2).map(String)))).toBe(false);
  }
  expect(distinct.size).toBeGreaterThan(12);
});

test('the morning and afternoon readings determine one total-minute answer', () => {
  const distinct = new Set<string>();
  for (const q of sample().filter(item => !item.prompt.startsWith('(a)'))) {
    const text = (q.context ?? []).join(' ');
    distinct.add(text);
    const clocks = readClocks(text);
    expect(clocks).toHaveLength(2);
    const [start, finish] = clocks;
    expect(start).toBeLessThan(12 * 60);
    expect(finish).toBeGreaterThan(12 * 60);
    expect(text).toContain('on the same day');
    const elapsed = finish - start;
    expect(elapsed).toBeGreaterThan(150);
    expect(q.prompt).toContain('how many minutes');
    expect(q.unit).toBe('minutes');
    expect(q.structuredResponse).toBeUndefined();
    expect(correctAnswer(q, String(elapsed))).toBe(true);
    expect(correctAnswer(q, String(elapsed % 60))).toBe(false);
  }
  expect(distinct.size).toBeGreaterThan(12);
});

test('seed and index reproduce the question and consecutive indices exercise both response formats', () => {
  for (const seed of [-5, 0, 7, 32]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const second = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 1)).toEqual(second);
    expect(Boolean(first.structuredResponse)).not.toBe(Boolean(second.structuredResponse));
  }
});
