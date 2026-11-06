import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragClockEventOrder';

function readTiles(q: Question) {
  if (q.picture?.type !== 'pattern' || !q.context?.length) {
    throw new Error('Expected labelled clock tiles and a part-of-day clue');
  }
  const [scene, ...captions] = q.context;
  return q.picture.items.map(tile => {
    const match = /^([A-Za-z]+) ([\u{1F550}-\u{1F567}])$/u.exec(tile);
    if (!match) throw new Error(`Unreadable clock tile: ${tile}`);
    const [, label, face] = match;

    // Unicode lists the twelve whole hours from one to twelve, then the twelve half-hours.
    const faceIndex = face.codePointAt(0)! - 0x1f550;
    const hour = faceIndex % 12 + 1;
    const minute = faceIndex < 12 ? 0 : 30;
    const ownCaption = captions.find(line => line.startsWith(`${label}: `));
    const clue = `${scene} ${ownCaption ?? ''}`;
    let hourOfDay: number;
    if (clue.includes('midnight')) {
      expect(ownCaption).toBeDefined();
      hourOfDay = hour === 12 ? 24 : hour + 12;
    } else if (clue.includes('morning')) {
      hourOfDay = hour % 12;
    } else if (clue.includes('afternoon')) {
      hourOfDay = hour % 12 + 12;
    } else {
      throw new Error(`Missing part of day for ${label}`);
    }
    return { label, time: hourOfDay * 60 + minute };
  });
}

describe('ordering labelled clocks', () => {
  it('solves both response forms from the faces and their printed clues', () => {
    const forms = new Set<string>();
    const firstNames = new Set<string>();
    const orders = new Set<string>();
    for (let seed = -3; seed <= 31; seed++) {
      for (let index = 0; index < 7; index++) {
        const q = makeRagQuestion(seed, index);
        const events = readTiles(q);
        const sorted = events.slice().sort((a, b) => a.time - b.time);
        const labels = sorted.map(event => event.label);
        expect(new Set(labels).size).toBe(labels.length);
        expect(new Set(sorted.map(event => event.time)).size).toBe(labels.length);

        if (q.prompt.startsWith('Who')) {
          forms.add('first');
          expect(events).toHaveLength(4);
          expect(sorted.every(event => event.time < 12 * 60)).toBe(true);
          expect(Math.floor(sorted[0].time / 60)).toBe(Math.floor(sorted[1].time / 60));
          expect(q.choices?.slice().sort()).toEqual(labels.slice().sort());
          expect(q.order).toBeUndefined();
          expect(q.answer).toBe(labels[0]);
          firstNames.add(labels[0]);
        } else {
          expect(q.prompt).toMatch(/letters in order/i);
          expect(q.order?.slice().sort()).toEqual(labels.slice().sort());
          expect(q.choices).toBeUndefined();
          expect(q.answer).toBe(labels.join(','));
          orders.add(labels.join(','));
          if (q.context![0].includes('midnight')) {
            forms.add('one night');
            expect(events).toHaveLength(4);
            expect(sorted[0].time).toBeGreaterThanOrEqual(18 * 60);
            expect(sorted.at(-1)?.time).toBe(24 * 60);
          } else {
            forms.add('one day');
            expect(events).toHaveLength(3);
            expect(sorted.filter(event => event.time < 12 * 60)).toHaveLength(1);
            expect(sorted[2].time).toBeLessThan(18 * 60);
          }
          for (const label of labels) {
            expect(q.context!.filter(line => line.startsWith(`${label}: `))).toHaveLength(1);
          }
        }
      }
    }
    expect(forms.size).toBe(3);
    expect(firstNames.size).toBeGreaterThan(2);
    expect(orders.size).toBeGreaterThan(4);
  });

  it('reproduces a question for the same seed and index', () => {
    for (const index of [0, 3, 5, 8]) {
      expect(makeRagQuestion(73, index)).toEqual(makeRagQuestion(73, index));
    }
    expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73, 0));
  });
});
