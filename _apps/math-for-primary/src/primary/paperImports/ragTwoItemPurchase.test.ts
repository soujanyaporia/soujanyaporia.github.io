import { expect, it } from 'vitest';
import { validNumberSentence } from '../answerFormat';
import { makeRagQuestion } from './ragTwoItemPurchase';

it('solves the shopping list from the names and visible price tags', () => {
  const layouts = new Set<string>();
  const skippedRows = new Set<number>();
  for (let seed = -8; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const shopping = /^Siti buys one (.+?) and one (.+?)\./.exec(q.prompt);
      if (!shopping || !q.context) throw new Error('Missing shopping list or price tags');
      const tags = q.context.map(line => {
        const match = /^(.+?): (?:\$(\d+)|(\d+)¢)$/.exec(line);
        if (!match) throw new Error(`Unreadable price tag: ${line}`);
        return { name: match[1], price: Number(match[2] ?? match[3]), unit: match[2] ? 'dollars' : 'cents' };
      });
      const unit = tags[0].unit;
      expect(tags).toHaveLength(unit === 'cents' ? 2 : 3);
      expect(new Set(tags.map(tag => tag.name)).size).toBe(tags.length);
      expect(new Set(tags.map(tag => tag.price)).size).toBe(tags.length);
      for (const tag of tags) {
        expect(tag.unit).toBe(unit);
        expect(tag.price).toBeGreaterThan(0);
        if (unit === 'cents') expect(tag.price % 5).toBe(0);
      }
      const [, first, second] = shopping;
      expect(first).not.toBe(second);
      const a = tags.find(tag => tag.name === first)?.price;
      const b = tags.find(tag => tag.name === second)?.price;
      if (a === undefined || b === undefined) throw new Error('A purchase has no price');
      const sum = a + b;
      expect(sum).toBeLessThanOrEqual(100);
      expect(q.unit).toBe(unit);
      expect(q.prompt).toContain(`in ${unit}`);
      const forward = `${a} + ${b} = ${sum}`;
      const reverse = `${b} + ${a} = ${sum}`;
      expect([forward, reverse]).toContain(q.answer);
      const spec = q.numberSentence;
      if (!spec) throw new Error('Missing number-sentence response');
      expect(spec).toMatchObject({ chooseOperation: true, freeEntry: true, missingResult: true });
      expect(validNumberSentence(spec, forward)).toBe(true);
      expect(validNumberSentence(spec, reverse)).toBe(true);
      expect(validNumberSentence(spec, `${a} + ${b} = ${sum + 1}`)).toBe(false);
      expect(validNumberSentence(spec, `${Math.max(a, b)} - ${Math.min(a, b)} = ${Math.abs(a - b)}`)).toBe(false);
      const format = (n: number) => unit === 'cents' ? `${n}¢` : `$${n}`;
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${format(a)} + ${format(b)} = ${format(sum)}`);
      layouts.add(`${unit}-${tags.length}`);
      const skipped = tags.findIndex(tag => tag.name !== first && tag.name !== second);
      if (skipped >= 0) {
        skippedRows.add(skipped);
        const other = tags[skipped].price;
        expect(validNumberSentence(spec, `${a} + ${other} = ${a + other}`)).toBe(false);
      }
    }
  }
  expect(layouts).toEqual(new Set(['cents-2', 'dollars-3']));
  expect(skippedRows).toEqual(new Set([0, 1, 2]));
});

it('replays a seed and varies the visible purchases across question indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const tasks = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    tasks.add(JSON.stringify([q.prompt, q.context]));
  }
  expect(tasks.size).toBeGreaterThan(1);
});
