import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragExactGrouping';

function readCount(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible quantity in ${text}`);
  return Number(match[1]);
}

function canShare(total: number, children: number): boolean {
  expect(children).toBeGreaterThan(1);
  const hands = Array<number>(children).fill(0);
  for (let i = 0; i < total; i++) hands[i % children] += 1;
  return hands.every(count => count === hands[0]);
}

function looseObjects(total: number, capacity: number): number {
  expect(capacity).toBeGreaterThan(1);
  let loose = total;
  while (loose >= capacity) loose -= capacity;
  return loose;
}

it('solves each task from the words and tray contents shown to the child', () => {
  const trayResults = new Set<string>();
  const sharingResults = new Set<string>();
  const leftoverResults = new Set<number>();
  for (let seed = 0; seed < 100; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      let total: number;
      let expected: string;
      if (q.picture) {
        if (q.picture.type !== 'paper' || q.picture.layout !== 'cards') throw new Error('Expected countable trays');
        expect(q.picture.cards.length).toBeGreaterThan(1);
        total = q.picture.cards.reduce((sum, tray) => {
          expect(tray.icon).toBe('fruit');
          expect(tray.removed ?? 0).toBe(0);
          const count = tray.count ?? 0;
          expect(Number.isInteger(count) && count > 0).toBe(true);
          return sum + count;
        }, 0);
        const children = readCount(story, /among (\d+) children/);
        const capacity = readCount(story, /bags of (\d+) apples/);
        const a = canShare(total, children) ? 'True' : 'False';
        const b = looseObjects(total, capacity) === 0 ? 'True' : 'False';
        expected = `A: ${a}, B: ${b}`;
        expect(new Set(q.choices)).toEqual(new Set(['A: True, B: True', 'A: True, B: False', 'A: False, B: True', 'A: False, B: False']));
        trayResults.add(expected);
      } else if (story.includes('beads')) {
        total = readCount(story, /(\d+) beads/);
        const children = readCount(story, /for (\d+) children/);
        expected = canShare(total, children) ? 'Yes' : 'No';
        expect(q.choices).toEqual(['Yes', 'No']);
        sharingResults.add(expected);
      } else {
        total = readCount(story, /There are (\d+) buttons/);
        const capacity = readCount(story, /holds (\d+) buttons/);
        const loose = looseObjects(total, capacity);
        expected = String(loose);
        expect(loose).toBeGreaterThan(0);
        expect(q.unit).toBe('buttons');
        expect(q.choices).toBeUndefined();
        expect(q.workedSteps?.map(step => step.equation)).toContain(`${total} − ${total - loose} = ${loose}`);
        leftoverResults.add(loose);
      }
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(20);
      expect(q.answer).toBe(expected);
    }
  }
  expect(trayResults.size).toBe(4);
  expect(sharingResults.size).toBe(2);
  expect(leftoverResults.size).toBeGreaterThan(1);
});

it('replays the same question and varies the visible givens across indices', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 32; index++) {
    const q = makeRagQuestion(27, index);
    expect(makeRagQuestion(27, index)).toEqual(q);
    givens.add(JSON.stringify([q.context, q.picture]));
  }
  expect(givens.size).toBeGreaterThan(3);
});
