import {expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion} from './ragAdditiveComparison';

function given(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing comparison fact: ${pattern}`);
  return Number(match[1]);
}

function solveModel(q: Pick<Question, 'context' | 'prompt' | 'display'>) {
  const text = (q.context ?? []).join(' ');
  const extra = given(text, /Zara has (\d+) more (?:buttons|tiles|beads) than Kai/);
  const seekingKai = q.prompt.includes('does Kai have?');
  let kai: number;
  let zara: number;
  if (seekingKai) {
    zara = given(text, /^Zara has (\d+) (?:buttons|tiles|beads)\./);
    kai = zara - extra;
  } else {
    expect(q.prompt).toContain('does Zara have?');
    kai = given(text, /^Kai has (\d+) (?:buttons|tiles|beads)\./);
    zara = kai + extra;
  }

  const labels: Record<string, number> = {A: kai, B: extra, C: zara};
  const matches = [...(q.display ?? '').matchAll(/\(([12])\) ([ABC]) ([+−]) ([ABC]) = ([ABC])/g)];
  expect(matches).toHaveLength(2);
  const valid = matches.filter(([, , left, op, right, result]) => {
    const value = op === '+' ? labels[left] + labels[right] : labels[left] - labels[right];
    return result === (seekingKai ? 'A' : 'C') && value === labels[result];
  });
  expect(valid).toHaveLength(1);
  return {kai, extra, zara, choice: valid[0][1], seekingKai};
}

it('solves the visible comparisons, including both ways of stating which amount is larger', () => {
  const seen = new Set<string>();
  for (let seed = -8; seed < 100; seed++) {
    for (const index of [0, 1, 5]) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      const equations = q.workedSteps?.map(step => step.equation);
      let expected: string;

      if (q.prompt.includes('bar labels')) {
        const {kai, extra, zara, choice, seekingKai} = solveModel(q);
        seen.add(seekingKai ? 'short bar' : 'long bar');
        expected = JSON.stringify([String(kai), String(extra), String(zara), choice]);
        expect(kai).toBeGreaterThan(0);
        expect(zara).toBeLessThanOrEqual(999);
        expect(equations).toContain(seekingKai ? `${zara} − ${extra} = ${kai}` : `${kai} + ${extra} = ${zara}`);
        const pic = q.picture;
        if (pic?.type !== 'paper' || pic.layout !== 'bars') throw new Error('Comparison bars are missing');
        const [long, short] = pic.rows;
        expect(long.label).toBe('Zara (C)');
        expect(short.label).toBe('Kai');
        expect(long.parts.map(part => [part.size, part.label])).toEqual([[kai, ''], [extra, 'B']]);
        expect(short.parts.map(part => [part.size, part.label])).toEqual([[kai, 'A']]);
        expect(q.structuredResponse?.kind).toBe('number-fields');
        expect(correctAnswer(q, JSON.stringify([extra, kai, zara, choice].map(String)))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([kai, extra, zara, 3 - Number(choice)].map(String)))).toBe(false);
        expect(correctAnswer(q, String(zara))).toBe(false);
      } else if (q.prompt.startsWith('Which subtraction sentence')) {
        seen.add('difference equation');
        const big = given(text, /are (\d+) blue/);
        const small = given(text, /and (\d+) red/);
        expected = `${big} − ${small} = ${big - small}`;
        expect(equations).toContain(expected);
        expect(q.picture).toBeUndefined();
        expect(big).toBeGreaterThan(small);
        expect(big + small).toBeLessThanOrEqual(999);
      } else {
        const litres = q.prompt.includes('yellow tank');
        const small = litres ? given(text, /green tank holds (\d+) litres/) : given(text, /box holds (\d+) red/);
        const extra = litres ? given(text, /holds (\d+) litres less than the yellow tank/)
          : given(text, /are (\d+) more blue (?:buttons|tiles|beads) than red/);
        const big = small + extra;
        expected = String(big);
        seen.add(litres ? 'litre choice' : 'count entry');
        expect(big).toBeLessThanOrEqual(999);
        expect(equations).toContain(`${small} + ${extra} = ${big}`);
        expect(q.picture).toBeUndefined();
        if (litres) {
          expect(q.unit).toBe('litres');
          expect(q.choices).toContain(String(small - extra));
        } else {
          expect(q.prompt).toContain(`How many blue ${q.unit}`);
          expect(q.choices).toBeUndefined();
        }
      }

      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      if (q.choices) {
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(choice => correctAnswer(q, choice))).toEqual([expected]);
      }
    }
  }
  expect(seen.size).toBe(5);
});

it('reproduces a question by key and changes the visible givens across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(71, index);
    expect(makeRagQuestion(71, index)).toEqual(q);
    stories.add((q.context ?? []).join(' '));
  }
  expect(stories.size).toBeGreaterThan(12);
});
