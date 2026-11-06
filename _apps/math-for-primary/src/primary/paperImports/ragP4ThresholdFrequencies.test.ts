import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4ThresholdFrequencies';

function readSurvey(q: Question) {
  const p = q.picture;
  if (p?.type === 'bars') {
    expect(p.line).toBeFalsy();
    expect(p.pictures).toBeFalsy();
    expect(p.scale).toBeGreaterThan(0);
    expect(p.values.every(n => n % p.scale === 0)).toBe(true);
    expect(p.labels.length).toBe(p.values.length);
    return p.labels.map((label, i) => ({score: Number(label), pupils: p.values[i]}));
  }
  if (p?.type !== 'nanyang-p4' || p.layout !== 'table') throw new Error('Missing survey');
  expect(p.rowHeader).toBe('Hoops on target');
  expect(p.rows).toHaveLength(1);
  const [row] = p.rows;
  expect(row.label).toBe('Pupils');
  expect(row.values.length).toBe(p.columns.length);
  return p.columns.map((label, i) => {
    const pupils = row.values[i];
    if (pupils == null) throw new Error('Missing pupil count');
    return {score: Number(label), pupils};
  });
}

// Find the first denominator that gives an exact whole-number numerator.
function reducedShare(part: number, whole: number) {
  for (let d = 2; d <= whole; d++) {
    if ((part * d) % whole === 0) return `${part * d / whole}/${d}`;
  }
  throw new Error('Expected a proper fraction');
}

it('solves the prompt from the score labels and pupil counts', () => {
  const forms = new Set<string>();
  const formats = new Set<string>();
  for (let seed = -8; seed <= 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const rows = readSurvey(q);
      expect(rows.map(row => row.score)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(rows.every(row => Number.isSafeInteger(row.pupils) && row.pupils > 0)).toBe(true);
      const match = /landed (at least|fewer than|more than) (\d+) hoops? on the target/.exec(q.prompt);
      if (!match) throw new Error('Missing score condition');
      const [, rule, digits] = match;
      const cutoff = Number(digits);
      expect(rows.some(row => row.score === cutoff)).toBe(true);

      // Subtract the pupils on the other side of the cutoff from everyone surveyed.
      const excluded = rows.filter(({score}) => {
        if (rule === 'at least') return score < cutoff;
        if (rule === 'more than') return score <= cutoff;
        return score >= cutoff;
      });
      expect(excluded.length).toBeGreaterThanOrEqual(2);
      expect(rows.length - excluded.length).toBeGreaterThanOrEqual(2);
      const total = rows.reduce((s, row) => s + row.pupils, 0);
      const part = total - excluded.reduce((s, row) => s + row.pupils, 0);
      const fraction = q.prompt.startsWith('What fraction');
      const expected = fraction ? reducedShare(part, total) : String(part);
      expect(q.answer).toBe(expected);
      if (fraction) {
        expect(q.prompt).toContain('simplest form');
        expect(q.requireSimplified).toBe(true);
        expect(q.unit).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(Number(expected.split('/')[1])).toBeLessThanOrEqual(12);
      } else {
        expect(q.unit).toBe('pupils');
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(expected);
        }
      }
      forms.add(`${rule}/${fraction ? 'fraction' : 'count'}`);
      formats.add(`${q.picture!.type}/${q.choices ? 'choice' : 'entry'}`);
    }
  }
  expect(forms).toEqual(new Set(['at least/count', 'at least/fraction', 'more than/count', 'fewer than/count']));
  expect(formats).toEqual(new Set(['nanyang-p4/choice', 'nanyang-p4/entry', 'bars/choice', 'bars/entry']));
});

it('repeats a seed and index exactly and varies visible data across an indexed session', () => {
  const surveys = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(431, index);
    expect(makeRagQuestion(431, index)).toEqual(q);
    surveys.add(JSON.stringify(readSurvey(q)));
  }
  expect(surveys.size).toBeGreaterThan(1);
});
