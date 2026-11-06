import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2UnknownPriceAfterRepeatedPurchases';

// Read only the shopping story. Treat every amount as cents and remove one
// purchase at a time, independently of how the generator builds its bill.
function solveVisible(lines: string[]) {
  const story = lines.join(' ');
  const basket = /buys (\d+) (stickers|paintbrushes) and one (bookmark|sketchbook)\./.exec(story);
  const tag = /Each (sticker|paintbrush) costs \$(\d+)(?:\.(\d{2}))?\./.exec(story);
  const bill = /Her bill is (?:(\d+)¢|\$(\d+)) in all\./.exec(story);
  if (!basket || !tag || !bill) throw new Error('Cannot identify the purchases, unit price and bill in the visible story');
  const count = Number(basket[1]);
  const eachCents = 100 * Number(tag[2]) + Number(tag[3] ?? 0);
  const centsBill = bill[1] !== undefined;
  const total = centsBill ? Number(bill[1]) : 100 * Number(bill[2]);
  let remaining = total;
  for (let i = 0; i < count; i++) remaining -= eachCents;
  return { count, target: basket[3], centsBill, decimalTag: tag[3] !== undefined, eachCents, subtotal: total - remaining, remaining, total };
}

it('grades the prices recovered from visible purchases in both unit variants', () => {
  const stories = { cents: new Set<string>(), dollars: new Set<string>() };
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const s = solveVisible(q.context ?? []);
      expect(s.count).toBeGreaterThanOrEqual(2);
      expect(s.count).toBeLessThanOrEqual(4);
      expect(s.remaining).toBeGreaterThan(0);
      expect(q.prompt).toContain(s.target);
      expect(q.picture).toBeUndefined();
      expect(s.decimalTag).toBe(s.centsBill);
      if (s.centsBill) {
        stories.cents.add(q.context!.join(' '));
        expect(s.total).toBeLessThan(100);
        expect(q.structuredResponse?.kind).toBe('number-fields');
        const entries = [s.eachCents, s.subtotal, s.remaining].map(String);
        expect(correctAnswer(q, JSON.stringify(entries))).toBe(true);
        // A correct final price must not hide a wrong conversion or subtotal.
        for (let field = 0; field < entries.length; field++) {
          const wrong = [...entries];
          wrong[field] = String(Number(wrong[field]) + 1);
          expect(correctAnswer(q, JSON.stringify(wrong))).toBe(false);
        }
      } else {
        stories.dollars.add(q.context!.join(' '));
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('dollars');
        expect(s.remaining % 100).toBe(0);
        expect(correctAnswer(q, String(s.remaining / 100))).toBe(true);
        // Subtracting the price of just one paintbrush leaves too much.
        expect(correctAnswer(q, String((s.total - s.eachCents) / 100))).toBe(false);
      }
    }
  }
  expect(stories.cents.size).toBeGreaterThan(8);
  expect(stories.dollars.size).toBeGreaterThan(8);
});

it('reproduces a question from its seed and index, including the default index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(17, 3)).toEqual(makeRagQuestion(17, 3));
});
