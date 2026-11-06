import {expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragLineTallies';

function readBadges(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw new Error('Missing badge drawing');
  const labels = picture.marks.filter(m => m.kind === 'text');
  const tallies = new Map<string, {curved: number; straight: number}>();
  for (const name of labels.length ? labels.map(m => m.text) : ['only']) {
    tallies.set(name, {curved: 0, straight: 0});
  }
  for (const mark of picture.marks) {
    if (mark.kind === 'text') continue;
    let x: number, y: number, curved: boolean;
    if (mark.kind === 'circle') {
      expect(mark.r).toBeGreaterThan(0);
      x = mark.cx;
      y = mark.cy;
      curved = true;
    } else {
      let x1: number, y1: number, x2: number, y2: number;
      if (mark.kind === 'line') {
        ({x1, y1, x2, y2} = mark);
        curved = false;
      } else {
        // A quadratic with a control point on its chord would draw a straight line.
        const tokens = mark.d.trim().split(/\s+/);
        expect([tokens.length, tokens[0], tokens[3]]).toEqual([8, 'M', 'Q']);
        const [ax, ay, cx, cy, bx, by] = tokens.filter(t => t !== 'M' && t !== 'Q').map(Number);
        [x1, y1, x2, y2] = [ax, ay, bx, by];
        curved = (bx - ax) * (cy - ay) !== (by - ay) * (cx - ax);
        expect(curved).toBe(true);
      }
      expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThan(0);
      x = (x1 + x2) / 2;
      y = (y1 + y2) / 2;
    }
    // The name printed immediately below an outline identifies its strokes.
    const below = labels.filter(label => label.y > y);
    const distance = (label: {x: number; y: number}) => Math.hypot(label.x - x, label.y - y);
    below.sort((a, b) => distance(a) - distance(b));
    const owner = labels.length ? below[0]?.text : 'only';
    if (!owner) throw new Error('Stroke without a badge');
    const counts = tallies.get(owner)!;
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(320);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(200);
    if (curved) counts.curved++;
    else counts.straight++;
  }
  return tallies;
}

it('solves each prompt from the visible strokes, labels and requested counts', () => {
  const seen = new Set<string>();
  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const badges = readBadges(q);
      const entries = [...badges.values()];
      const first = entries[0];
      if (q.prompt.startsWith('Which badge')) {
        seen.add('match');
        const target = /has (\d+) straight lines and (\d+) curved lines/.exec(q.prompt);
        if (!target) throw new Error('Missing target counts');
        const straight = Number(target[1]), curved = Number(target[2]);
        expect([...badges.keys()].sort()).toEqual(['A', 'B', 'C', 'D']);
        expect(entries.filter(t => t.straight === straight)).toHaveLength(2);
        expect(entries.filter(t => t.curved === curved)).toHaveLength(2);
        const hits = [...badges].filter(([, t]) => t.straight === straight && t.curved === curved);
        expect(hits).toHaveLength(1);
        expect(q.answer).toBe(hits[0][0]);
        expect(q.choices).toEqual(['A', 'B', 'C', 'D']);
      } else if (q.structuredResponse?.kind === 'number-pair') {
        seen.add('pair');
        expect(entries).toHaveLength(1);
        const spec = q.structuredResponse;
        expect([spec.firstLabel, spec.secondLabel]).toEqual(['Curved lines', 'Straight lines']);
        const expected = JSON.stringify([String(first.curved), String(first.straight)]);
        expect(q.answer).toBe(expected);
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(first.curved)]))).toBe(false);
        if (first.curved !== first.straight) {
          const swapped = JSON.stringify([String(first.straight), String(first.curved)]);
          expect(structuredResponseCorrect(spec, q.answer, swapped)).toBe(false);
        }
      } else if (q.prompt.includes('more straight lines than curved lines')) {
        seen.add('difference');
        expect(entries).toHaveLength(1);
        const gap = first.straight - first.curved;
        expect(gap).toBeGreaterThan(0);
        expect(q.answer).toBe(String(gap));
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toHaveLength(4);
        expect(q.choices?.filter(choice => Number(choice) === gap)).toHaveLength(1);
      } else {
        seen.add('total');
        expect(q.prompt).toContain('altogether');
        expect([...badges.keys()].sort()).toEqual(['A', 'B', 'C']);
        expect(q.answer).toBe(String(entries.reduce((sum, t) => sum + t.curved, 0)));
      }
    }
  }
  expect(seen.size).toBe(4);
});

it('repeats the same question and varies the drawing across seeds', () => {
  const pictures = new Set<string>();
  for (let seed = 0; seed < 16; seed++) {
    const q = makeRagQuestion(seed, 2);
    expect(makeRagQuestion(seed, 2)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(8);
});
