import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { makeRagQuestion } from './ragReadClockInterval';

function printedTime(text: string) {
  const match = /\b(\d{1,2}):([0-5]\d) ([ap])\.m\./.exec(text);
  if (!match) throw Error('Missing written time and part of day');
  return (Number(match[1]) % 12 + (match[3] === 'p' ? 12 : 0)) * 60 + Number(match[2]);
}

function readPair(picture: Batch11UpperPicture) {
  const times = new Map<string, number>();
  for (const rim of picture.marks) {
    if (rim.kind !== 'circle' || rim.r < 10) continue;
    const text = picture.marks.flatMap(mark => mark.kind === 'text' && Math.abs(mark.x - rim.cx) < rim.r ? [mark] : []);
    const digits = text.filter(mark => mark.y <= rim.cy + rim.r).map(mark => Number(mark.text));
    expect(digits.sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const labels = text.filter(mark => mark.y > rim.cy + rim.r);
    expect(labels).toHaveLength(1);
    const hands = picture.marks.flatMap(mark => {
      if (mark.kind !== 'line' || mark.x1 !== rim.cx || mark.y1 !== rim.cy) return [];
      const dx = mark.x2 - rim.cx;
      const dy = mark.y2 - rim.cy;
      return [{ length: Math.hypot(dx, dy), turn: (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1 }];
    }).sort((a, b) => a.length - b.length);
    expect(hands).toHaveLength(2);
    expect(hands[0].length).toBeLessThan(hands[1].length);
    const shortHandTime = Math.round(hands[0].turn * 720) % 720;
    const minute = Math.round(hands[1].turn * 60) % 60;
    expect(shortHandTime % 60).toBe(minute);
    times.set(labels[0].text, 60 * Math.floor(shortHandTime / 60) + minute);
  }
  expect([...times.keys()].sort()).toEqual(['Finish', 'Start']);
  return { start: times.get('Start')!, finish: times.get('Finish')! };
}

function solve(question: Pick<Question, 'context' | 'picture'>) {
  const text = question.context?.join(' ') ?? '';
  const picture = question.picture;
  if (picture?.type === 'batch11-upper') {
    expect(text).toContain('one afternoon');
    const pair = readPair(picture);
    return { form: 'pair', start: pair.start + 720, finish: pair.finish + 720 };
  }
  if (picture?.type === 'clock') {
    expect(text).toContain('later that morning');
    return { form: 'single', start: printedTime(text), finish: picture.minutes % 720 };
  }
  expect(picture).toBeUndefined();
  const phrase = /It is (\d+) minutes (past|to) (\w+) in the afternoon/.exec(text);
  if (!phrase) throw Error('Missing relative time');
  const names = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  const hour = names.indexOf(phrase[3]);
  expect(hour).toBeGreaterThanOrEqual(0);
  const offset = Number(phrase[1]);
  const start = (12 + hour) * 60 + (phrase[2] === 'to' ? -offset : offset);
  return { form: phrase[2], start, finish: printedTime(text) };
}

it('finds durations from the printed words and the hands displayed to the pupil', () => {
  const phrasings = new Set<string>();
  const totals = new Set<number>();
  for (let seed = -6; seed < 54; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const question = makeRagQuestion(seed, index);
      const { form, start, finish } = solve(question);
      const minutes = finish - start;
      expect(start % 5).toBe(0);
      expect(finish % 5).toBe(0);
      expect(minutes).toBeGreaterThan(0);
      expect(question.prompt).toMatch(/how many minutes/i);
      expect(question.unit).toBe('minutes');
      expect(question.answer).toBe(String(minutes));
      expect(question.workedSteps?.at(-1)?.equation).toMatch(new RegExp(`= ${minutes} minutes$`));
      if (form === 'pair') {
        expect(question.choices).toBeUndefined();
        expect(Math.floor(finish / 60) - Math.floor(start / 60)).toBe(2);
        expect(minutes).toBeGreaterThan(60);
      } else {
        expect(Math.floor(finish / 60) - Math.floor(start / 60)).toBe(1);
        expect(minutes).toBeLessThan(60);
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices?.filter(option => Number(option) === minutes)).toHaveLength(1);
      }
      forms.add(form === 'to' || form === 'past' ? 'words' : form);
      phrasings.add(form);
      totals.add(minutes);
    }
    expect([...forms].sort()).toEqual(['pair', 'single', 'words']);
  }
  expect([...phrasings].sort()).toEqual(['pair', 'past', 'single', 'to']);
  expect(totals.size).toBeGreaterThan(8);
});

it('reproduces the same givens, diagrams and choice order', () => {
  for (let index = 0; index < 3; index++) {
    expect(makeRagQuestion(27, index)).toEqual(makeRagQuestion(27, index));
  }
});
