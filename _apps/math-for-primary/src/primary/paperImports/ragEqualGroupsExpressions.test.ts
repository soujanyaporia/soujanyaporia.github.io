import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragEqualGroupsExpressions';

function value(text: string): number {
  if (/^\d+(?: \+ \d+)+$/.test(text)) {
    return text.split(' + ').reduce((sum, n) => sum + Number(n), 0);
  }
  if (/^\d+(?: × \d+)+$/.test(text)) {
    return text.split(' × ').reduce((product, n) => product * Number(n), 1);
  }
  throw new Error(`Unreadable option: ${text}`);
}

it('solves each form using only the displayed groups, terms and choices', () => {
  const forms = new Set<string>();
  const positions = new Set<number>();
  for (let seed = -4; seed < 40; seed++) {
    for (let index = 0; index < 10; index++) {
      const q = makeRagQuestion(seed, index);
      const given = q.display ?? '';
      if (given.includes('□')) {
        forms.add('partial');
        const m = /^(\d+) × (\d+) = (\d+(?: \+ \d+)*) \+ \(□ × (\d+)\)$/.exec(given);
        if (!m) throw new Error(given);
        const [count, size, terms, factor] = [Number(m[1]), Number(m[2]), m[3], Number(m[4])] as const;
        const parts = terms.split(' + ').map(Number);
        expect(parts.every(n => n === size)).toBe(true);
        expect(factor).toBe(size);
        const left = count * size;
        const written = parts.reduce((a, b) => a + b, 0);
        const needed = (left - written) / factor;
        expect(Number.isInteger(needed) && needed > 0 && needed < count).toBe(true);
        expect(q.choices).toBeUndefined();
        expect(q.answer).toBe(String(needed));
        continue;
      }

      const sumGiven = given.includes('+');
      let count: number, size: number;
      if (sumGiven) {
        forms.add('sum');
        const terms = given.split(' + ').map(Number);
        count = terms.length;
        size = terms[0];
        expect(terms.every(n => n === size)).toBe(true);
      } else {
        const m = /^(\d+) (groups of|×) (\d+)$/.exec(given);
        if (!m) throw new Error(given);
        forms.add(m[2]);
        count = Number(m[1]);
        size = Number(m[3]);
      }
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      const matches = choices.filter(c => value(c) === count * size);
      expect(matches).toHaveLength(1);
      const solved = matches[0];
      if (sumGiven) {
        expect(solved.split(' × ').map(Number)).toEqual([count, size]);
      } else {
        const terms = solved.split(' + ').map(Number);
        expect(terms).toHaveLength(count);
        expect(terms.every(n => n === size)).toBe(true);
      }
      positions.add(choices.indexOf(solved));
      expect(q.answer).toBe(solved);
    }
  }
  expect(forms).toEqual(new Set(['groups of', '×', 'sum', 'partial']));
  expect(positions.size).toBe(4);
});

it('replays a seed and index exactly', () => {
  expect(makeRagQuestion(102, 7)).toEqual(makeRagQuestion(102, 7));
  expect(makeRagQuestion(102)).toEqual(makeRagQuestion(102, 0));
});
