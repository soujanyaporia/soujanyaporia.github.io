import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragTwoMeasuredAmounts';

function read(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing given in: ${text}`);
  return Number(match[1]);
}

it('solves every response from the amounts, comparison and target shown to the pupil', () => {
  const seen = new Map<string, Set<string>>();
  for (let seed = -10; seed <= 24; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      const k = read(text, /(\d+) times/);
      expect(k).toBeGreaterThan(1);
      expect(k).toBeLessThan(10);
      let form: string;
      if (q.prompt.includes('two kites') || q.prompt.includes('oats and peas')) {
        const mass = q.prompt.includes('oats and peas');
        form = mass ? 'mass total' : 'length total';
        const known = read(text, mass ? /has (\d+) g of oats/ : /has (\d+) m of string/);
        expect(text).toMatch(mass ? /His oats weigh \d+ times as much as his peas/ : /Its string is \d+ times as long as the red kite's string/);
        expect(known).toBeLessThan(1000);
        expect(known % k).toBe(0);
        const total = (k + 1) * (known / k);
        if (mass) {
          const correct = `${total} g`;
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toHaveLength(4);
          expect(q.choices?.every(c => /^\d+ g$/.test(c))).toBe(true);
          expect(q.choices?.filter(c => c === correct)).toEqual([correct]);
          expect(q.answer).toBe(correct);
        } else {
          expect(q.unit).toBe('m');
          expect(q.choices).toBeUndefined();
          expect(q.answer).toBe(String(total));
        }
      } else {
        const spec = q.structuredResponse;
        if (!spec) throw new Error('Missing fields for a compound answer');
        let expected: number[];
        if (q.prompt.includes('heavier')) {
          form = 'mass difference';
          expect(text).toMatch(/mass of her beans is \d+ times the mass of her rice/);
          const rice = read(text, /(\d+) g of rice/);
          const extra = (k - 1) * rice;
          expect(extra).toBeGreaterThan(1000);
          expect(extra % 1000).toBeGreaterThan(0);
          expected = [Math.floor(extra / 1000), extra % 1000];
          expect(spec).toMatchObject({ kind: 'number-pair', firstLabel: 'Kilograms', secondLabel: 'Grams' });
        } else {
          form = 'both lengths';
          expect(text).toMatch(/green strip is \d+ times as long as the yellow strip/);
          expect(q.prompt).toMatch(/\(a\).*yellow strip[\s\S]*\(b\).*green strip/);
          const whole = read(text, /(\d+) cm altogether/);
          expect(whole).toBeLessThan(1000);
          expect(whole % (k + 1)).toBe(0);
          const yellow = whole / (k + 1), green = k * yellow;
          expected = [Math.floor(yellow / 100), yellow % 100, Math.floor(green / 100), green % 100];
          expect(expected.every(n => n > 0)).toBe(true);
          expect(spec).toEqual({ kind: 'number-fields', fields: [
            { label: '(a) Yellow strip: metres' }, { label: '(a) Yellow strip: centimetres' },
            { label: '(b) Green strip: metres' }, { label: '(b) Green strip: centimetres' },
          ] });
        }
        const response = JSON.stringify(expected.map(String));
        expect(q.answer).toBe(response);
        expect(structuredResponseCorrect(spec, q.answer, response)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected.slice(1).map(String)))).toBe(false);
      }
      const samples = seen.get(form) ?? new Set<string>();
      samples.add(text);
      seen.set(form, samples);
    }
  }
  expect(seen.size).toBe(4);
  for (const samples of seen.values()) expect(samples.size).toBeGreaterThan(5);
});

it('replays the same question for the same seed and index', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  expect(makeRagQuestion(-7, 12)).toEqual(makeRagQuestion(-7, 12));
});
