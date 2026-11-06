import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragRegroupingAProduct';

function readNumbers(pattern: RegExp, text: string): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens in ${text}`);
  return match.slice(1).map(Number);
}

test('solves each response from the displayed equation or the bead story', () => {
  const forms = new Set<string>();
  for (let seed = -12; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      let first: number, second: number, size: number;
      let form: 'factor' | 'count' | 'leftover';
      if (q.display) {
        form = 'factor';
        [first, second, size] = readNumbers(/^(\d+) × (\d+) = □ × (\d+)$/, q.display);
        expect(q.prompt).toContain('box');
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBeUndefined();
      } else {
        const story = (q.context ?? []).join(' ');
        [first, second] = readNumbers(/(\d+) bags with (\d+) beads in each bag/, story);
        if (q.prompt.includes('loose beads')) {
          form = 'leftover';
          [size] = readNumbers(/puts (\d+) beads in each tube/, story);
          expect(story).toContain('as many tubes as she can');
          expect(q.unit).toBe('beads');
          expect(q.choices).toHaveLength(4);
        } else {
          form = 'count';
          [size] = readNumbers(/Each child gets (\d+) beads/, story);
          expect(story).toContain('All the beads are given out');
          expect(q.prompt).toContain('How many children');
          expect(q.unit).toBe('children');
          if (!q.choices) expect(q.prompt).toContain('Show your working');
        }
      }

      expect(Math.min(first, second)).toBeGreaterThan(1);
      expect(Math.min(first, second)).toBeLessThanOrEqual(9);
      expect(size).toBeGreaterThan(1);
      expect(size).toBeLessThanOrEqual(9);
      let total = 0;
      for (let bag = 0; bag < first; bag++) total += second;
      expect(total).toBeLessThanOrEqual(999);
      let loose = total, filled = 0;
      while (loose >= size) {
        loose -= size;
        filled++;
      }
      expect(filled).toBeGreaterThan(0);
      if (form === 'leftover') {
        expect(loose).toBeGreaterThan(0);
        expect(loose).toBeLessThan(size);
      } else {
        expect(loose).toBe(0);
      }
      const expected = String(form === 'leftover' ? loose : filled);
      expect(q.answer).toBe(expected);
      expect(q.workedSteps?.[0]?.equation).toBe(`${first} × ${second} = ${total}`);
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(value => value === expected)).toHaveLength(1);
      }
      forms.add(`${form}-${q.choices ? 'choice' : 'entry'}`);
    }
  }
  expect(forms).toEqual(new Set(['count-choice', 'count-entry', 'leftover-choice', 'factor-entry']));
});

test('replays a seed and varies the visible givens across question indices', () => {
  const visible = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(83, index);
    expect(makeRagQuestion(83, index)).toEqual(q);
    visible.add(JSON.stringify(q.display ?? q.context));
  }
  expect(visible.size).toBeGreaterThan(8);
});
