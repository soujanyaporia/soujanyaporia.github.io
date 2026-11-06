import { expect, test } from 'vitest';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragP2BalancePanHeights';

type Line = Extract<Batch11UpperMark, {kind: 'line'}>;
type Label = Extract<Batch11UpperMark, {kind: 'text'}>;

test('solve from the labelled loads and the horizontal pans underneath them', () => {
  const cases = new Set<string>(), totals = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const pic = q.picture;
      if (pic?.type !== 'batch11-upper') throw Error('Missing balance drawing');
      const labels = pic.marks.filter((m): m is Label => m.kind === 'text');
      const item = labels.find(m => q.prompt.toLowerCase().includes('the ' + m.text.toLowerCase() + ' is true'));
      if (!item) throw Error('The question must name the load shown in the picture');
      const weights = labels.filter(m => /^\d+ kg$/.test(m.text));
      expect(weights).toHaveLength(2);
      const rims = pic.marks.filter((m): m is Line => m.kind === 'line' && m.y1 === m.y2);
      // Read the nearest horizontal surface below each label, even when the beam itself is horizontal.
      function panUnder(label: Label) {
        const rim = rims.filter(s => Math.min(s.x1,s.x2) <= label.x && label.x < Math.max(s.x1,s.x2)
          && s.y1 > label.y).sort((a,b) => a.y1-b.y1)[0];
        if (!rim) throw Error('A load has no pan under it');
        return rim;
      }
      const objectPan = panUnder(item), weightPan = panUnder(weights[0]);
      expect(panUnder(weights[1])).toBe(weightPan);
      expect(objectPan).not.toBe(weightPan);
      const total = weights.reduce((n,w) => n + Number.parseInt(w.text,10), 0);
      expect(total).toBeGreaterThanOrEqual(4);
      expect(total).toBeLessThanOrEqual(8);
      const sign = Math.sign(objectPan.y1-weightPan.y1);
      const relations = ['less than', 'exactly', 'more than'];
      const statements = relations.map(r => `It weighs ${r} ${total} kg.`);
      expect(q.choices?.slice().sort()).toEqual(statements.slice().sort());
      expect(q.answer).toBe(statements[sign+1]);
      const left = objectPan.x1 < weightPan.x1;
      cases.add(`${left}:${sign}`);
      totals.add(total);
      const lower = (sign > 0) === left ? 'left' : 'right';
      expect(pic.label).toContain(sign === 0 ? 'The two pans are level.' : `The ${lower} pan is lower`);
    }
  }
  expect(cases.size).toBe(6);
  expect(totals.size).toBeGreaterThan(1);
});

test('repeats the same drawing and choices for the same seed and index', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  expect(makeRagQuestion(27, 3)).toEqual(makeRagQuestion(27, 3));
});
