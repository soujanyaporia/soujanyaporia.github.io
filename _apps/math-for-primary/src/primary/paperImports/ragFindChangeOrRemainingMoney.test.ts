import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragFindChangeOrRemainingMoney';

function read(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing money given in "${text}"`);
  return Number(match[1]);
}

function checkResponse(q: Question, expected: string, wrong: string) {
  expect(q.answer).toBe(expected);
  expect(correctAnswer(q, expected)).toBe(true);
  expect(correctAnswer(q, wrong)).toBe(false);
}

it('solves each purchase from the displayed money and price', () => {
  const observations = { purse: new Set<string>(), notes: new Set<string>(), cents: new Set<string>() };
  for (let seed = -4; seed < 36; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const story = [...(q.context ?? []), q.prompt].join(' ');
      expect(q.workedSteps).toHaveLength(2);

      if (q.picture?.type === 'pattern') {
        const pieces = q.picture.items.map(tile => {
          const face = read(tile, /^\$(\d+) (?:coin|note)$/);
          expect(tile).toBe(`$${face} ${face === 1 ? 'coin' : 'note'}`);
          expect([1, 2, 5, 10, 50]).toContain(face);
          return face;
        });
        expect(pieces).toContain(1);
        expect(pieces.some(value => value > 1)).toBe(true);
        const total = pieces.reduce((sum, value) => sum + value, 0);
        const price = read(story, /rope for \$(\d+)\./);
        const left = total - price;
        expect(total).toBeLessThanOrEqual(100);
        expect(price).toBeGreaterThan(0);
        expect(left).toBeGreaterThan(0);
        expect(q.unit).toBe('dollars');
        expect(q.numberSentence).toMatchObject({ operation: '-', freeEntry: true, chooseOperation: true, missingResult: true });
        checkResponse(q, `${total} - ${price} = ${left}`, `${total} + ${price} = ${total + price}`);
        expect(q.workedSteps?.[0].equation).toBe(`${pieces.map(n => '$' + n).join(' + ')} = $${total}`);
        expect(q.workedSteps?.[1].equation).toBe(`$${total} − $${price} = $${left}`);
        observations.purse.add(`${total}/${price}`);
      } else if (story.includes('Each note')) {
        const count = read(story, /hands over (\d+) notes/);
        const face = read(story, /Each note is worth \$(\d+)\./);
        const price = read(story, /puzzle for \$(\d+)\./);
        const paid = Array<number>(count).fill(face).reduce((sum, value) => sum + value, 0);
        const change = paid - price;
        expect([2, 5, 10]).toContain(face);
        expect(count).toBeGreaterThan(1);
        expect(paid).toBeLessThanOrEqual(40);
        expect(price).toBeGreaterThan(0);
        expect(change).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toMatchObject({ kind: 'number-pair', firstLabel: 'Value of all the notes ($)', secondLabel: 'Change ($)' });
        checkResponse(q, JSON.stringify([String(paid), String(change)]), JSON.stringify([String(change), String(paid)]));
        expect(q.workedSteps?.[0].equation).toBe(`${count} × $${face} = $${paid}`);
        expect(q.workedSteps?.[1].equation).toBe(`$${paid} − $${price} = $${change}`);
        observations.notes.add(`${count}/${face}/${price}`);
      } else {
        const dollars = read(story, /has \$(\d+)\./);
        const price = read(story, /sticker for (\d+) cents/);
        const start = dollars * 100;
        const left = start - price;
        expect(start).toBe(100);
        expect(price).toBeGreaterThan(0);
        expect(left).toBeGreaterThan(0);
        expect(q.unit).toBe('cents');
        expect(q.picture).toBeUndefined();
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(left));
        checkResponse(q, String(left), String(price));
        expect(q.workedSteps?.[0].equation).toBe(`$${dollars} = ${start} cents`);
        expect(q.workedSteps?.[1].equation).toBe(`${start} cents − ${price} cents = ${left} cents`);
        observations.cents.add(String(price));
      }
    }
  }
  for (const examples of Object.values(observations)) expect(examples.size).toBeGreaterThan(3);
});

it('replays the same question and presents all three forms in three consecutive slots', () => {
  for (const seed of [0, 1, 27, 513]) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      forms.add(q.picture ? 'picture' : q.choices ? 'choice' : 'written');
    }
    expect(forms).toEqual(new Set(['picture', 'choice', 'written']));
  }
});
