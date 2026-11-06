import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragCombinedMeasurements';

it('solves each question from the distances or heights the pupil can see', () => {
  const seen = { ride: new Set<string>(), trails: new Set<string>(), towers: new Set<string>() };
  for (let seed = -12; seed <= 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = q.context?.join(' ') ?? '';
      const ride = /^On Monday, Jia cycled (\d+) m\. On Tuesday, she cycled (\d+) m farther than on Monday\.$/.exec(text);
      const trails = /^The hill trail is (\d+) m long\. It is (\d+) m longer than the pond trail\.$/.exec(text);
      const towers = /^The blue tower is (\d+) m (\d+) cm tall\. It is (\d+) cm taller than the red tower\. The yellow tower is half the height of the blue and red towers stacked together\.$/.exec(text);

      if (ride) {
        seen.ride.add(text);
        const monday = Number(ride[1]);
        const extra = Number(ride[2]);
        const bothDays = 2 * monday + extra;
        expect(q.prompt).toContain('over the two days');
        expect(q.unit).toBe('m');
        expect(extra).toBeGreaterThan(0);
        expect(bothDays).toBeLessThan(10000);
        expect(correctAnswer(q, String(bothDays))).toBe(true);
        expect(correctAnswer(q, String(monday + extra))).toBe(false);
      } else if (trails) {
        seen.trails.add(text);
        const hill = Number(trails[1]);
        const excess = Number(trails[2]);
        const pond = hill - excess;
        const total = 2 * hill - excess;
        const wholeKm = Math.floor(total / 1000);
        const leftover = total - 1000 * wholeKm;
        expect(pond).toBeGreaterThan(0);
        expect(pond).toBeLessThan(hill);
        expect(total).toBeLessThan(10000);
        expect(wholeKm).toBeGreaterThan(0);
        expect(leftover).toBeGreaterThan(0);
        expect(leftover).toBeLessThan(1000);
        expect(q.prompt).toMatch(/\(a\).*pond trail.*\n\(b\).*kilometres and metres/);
        expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [
          { label: '(a) Pond trail (m)' }, { label: '(b) Whole kilometres (km)' }, { label: '(b) Metres left over (m)' },
        ] });
        const entry = (values: number[]) => JSON.stringify(values.map(String));
        expect(correctAnswer(q, entry([pond, wholeKm, leftover]))).toBe(true);
        expect(correctAnswer(q, entry([hill, wholeKm, leftover]))).toBe(false);
        expect(correctAnswer(q, entry([pond, wholeKm - 1, leftover + 1000]))).toBe(false);
        expect(correctAnswer(q, entry([wholeKm, leftover]))).toBe(false);
      } else if (towers) {
        seen.towers.add(text);
        const blue = 100 * Number(towers[1]) + Number(towers[2]);
        const gap = Number(towers[3]);
        // Half the combined height lies halfway between the two heights.
        const halfway = blue - gap / 2;
        expect(gap).toBeGreaterThan(0);
        expect(blue - gap).toBeGreaterThan(0);
        expect(Number.isInteger(halfway)).toBe(true);
        expect(q.prompt).toContain('yellow tower in centimetres');
        expect(q.unit).toBe('cm');
        expect(correctAnswer(q, String(halfway))).toBe(true);
        expect(correctAnswer(q, String(2 * halfway))).toBe(false);
      } else {
        throw new Error(`Could not solve the visible givens: ${text}`);
      }
    }
  }
  for (const examples of Object.values(seen)) expect(examples.size).toBeGreaterThan(10);
});

it('repeats the same question for the same seed and index', () => {
  for (const seed of [0, 29, -83]) {
    for (const index of [0, 1, 7]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
  }
});
