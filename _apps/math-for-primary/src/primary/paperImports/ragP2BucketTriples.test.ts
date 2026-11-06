import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2BucketTriples';

it('grades exactly the triple that reaches the printed target', () => {
  for (let seed = 0; seed < 40; seed++) {
    for (const index of [0, 1, 7]) {
      const question = makeRagQuestion(seed, index);
      expect(question.prompt).toMatch(/which three buckets/i);
      const targetMatch = /exactly (\d+) L\b/.exec(question.context?.join(' ') ?? '');
      if (!targetMatch) throw new Error('Missing target in litres');
      const target = Number(targetMatch[1]);
      const picture = question.picture;
      if (picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing bucket cards');
      const buckets = picture.cards.map(card => {
        const label = /^Bucket ([A-D])$/.exec(card.label);
        const volume = /^(\d+) L$/.exec(card.value);
        if (!label || !volume) throw new Error('Each bucket needs a label and a whole-litre volume');
        return { letter: label[1], litres: Number(volume[1]) };
      });
      expect(buckets).toHaveLength(4);
      expect(new Set(buckets.map(b => b.letter)).size).toBe(4);
      expect(new Set(buckets.map(b => b.litres)).size).toBe(4);
      expect(buckets.every(b => b.litres > 0 && b.litres <= 20)).toBe(true);

      // Solve by adding every triple directly from its three visible cards.
      const totals = new Map<string, number>();
      for (let i = 0; i < buckets.length; i++) {
        for (let j = i + 1; j < buckets.length; j++) {
          for (let k = j + 1; k < buckets.length; k++) {
            const three = [buckets[i], buckets[j], buckets[k]];
            const group = three.map(b => b.letter).sort().join('');
            totals.set(group, three.reduce((sum, b) => sum + b.litres, 0));
          }
        }
      }
      const solutions = [...totals].filter(([, litres]) => litres === target);
      expect(solutions).toHaveLength(1);
      const choices = question.choices ?? [];
      expect(choices).toHaveLength(4);
      const offered = choices.map(choice => {
        const match = /^([A-D]), ([A-D]) and ([A-D])$/.exec(choice);
        if (!match) throw new Error('A choice must name three buckets');
        const group = match.slice(1).sort().join('');
        const shouldPass = group === solutions[0][0];
        expect(choice === question.answer).toBe(shouldPass);
        expect(correctAnswer(question, choice)).toBe(shouldPass);
        return group;
      });
      expect(offered.sort()).toEqual([...totals.keys()].sort());
    }
  }
});

it('repeats a seed and index while varying the visible exercise across indices', () => {
  const visible = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const question = makeRagQuestion(73, index);
    expect(makeRagQuestion(73, index)).toEqual(question);
    visible.add(JSON.stringify([question.picture, question.context]));
  }
  expect(visible.size).toBeGreaterThan(1);
});
