import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragFindElapsedTime';

function readClockPair(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw new Error('Expected two analogue clock faces');
  const readings = new Map<string, number>();
  for (const rim of picture.marks) {
    if (rim.kind !== 'circle' || rim.r < 10) continue;
    const labels = picture.marks.flatMap(m =>
      m.kind === 'text' && Math.abs(m.x - rim.cx) < rim.r ? [m] : []);
    const below = labels.filter(m => m.y > rim.cy + rim.r);
    expect(below).toHaveLength(1);
    const numerals = labels.filter(m => m.y <= rim.cy + rim.r);
    expect(numerals.map(m => Number(m.text)).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1));
    const hands = picture.marks.flatMap(m => {
      if (m.kind !== 'line' || m.x1 !== rim.cx || m.y1 !== rim.cy) return [];
      const dx = m.x2 - rim.cx;
      const dy = m.y2 - rim.cy;
      const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
      return [{ length: Math.hypot(dx, dy), turn }];
    }).sort((a, b) => a.length - b.length);
    expect(hands).toHaveLength(2);
    const [short, long] = hands;
    expect(short.length).toBeLessThan(long.length);
    const hourReading = Math.round(short.turn * 720) % 720;
    const minute = Math.round(long.turn * 60) % 60;
    expect(hourReading % 60).toBe(minute);
    expect(minute % 5).toBe(0);
    readings.set(below[0].text, hourReading);
  }
  expect([...readings.keys()].sort()).toEqual(['Finish', 'Start']);
  const start = readings.get('Start')!;
  const finish = readings.get('Finish')!;
  expect(Math.floor(start / 60)).toBe(Math.floor(finish / 60));
  expect(finish).toBeGreaterThan(start);
  return finish - start;
}

function walkDial(q: Question) {
  const match = /starts at (\d+)\. It moves clockwise until it first reaches (\d+)\./.exec(
    (q.context ?? []).join(' '));
  if (!match) throw new Error('Both hand positions must be given');
  const start = Number(match[1]);
  const finish = Number(match[2]);
  expect([start, finish].every(n => n >= 1 && n <= 12)).toBe(true);
  let mark = start;
  for (let minutes = 5; minutes <= 55; minutes += 5) {
    mark = mark === 12 ? 1 : mark + 1;
    if (mark === finish) return { minutes, start, finish };
  }
  throw new Error('The hand must stop before it completes one turn');
}

it('solves all three response forms using the drawn hands or the stated dial positions', () => {
  let passedTwelve = false;
  let singleGap = false;
  const clockAnswers = new Set<number>();
  for (let seed = -8; seed <= 63; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      let expected: number;
      if (q.picture) {
        expected = readClockPair(q);
        clockAnswers.add(expected);
        forms.add(q.choices ? 'clock choice' : 'clock entry');
      } else {
        const walk = walkDial(q);
        expected = walk.minutes;
        singleGap ||= expected === 5;
        passedTwelve ||= walk.start < 12 && walk.finish < walk.start;
        expect(q.choices).toBeDefined();
        forms.add('minute hand choice');
      }
      expect(q.unit).toBe('minutes');
      expect(q.answer).toBe(String(expected));
      expect(q.workedSteps?.at(-1)?.equation).toMatch(new RegExp(`= ${expected} minutes$`));
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(expected));
      }
    }
    expect(forms.size).toBe(3);
  }
  expect(clockAnswers.size).toBeGreaterThan(5);
  expect(passedTwelve && singleGap).toBe(true);
});

it('reproduces the givens and the order of choices from the seed and index', () => {
  for (let index = 0; index < 3; index++) {
    expect(makeRagQuestion(29, index)).toEqual(makeRagQuestion(29, index));
  }
});
