import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-smallest-rectangle-area',
  level: 3 as const,
  title: 'Compare the areas of four cards',
  objective: 'Use the two side lengths of each rectangle to find which one covers the least space.',
  skillIds: ['P3.S.AREA.03'],
  canonicalPatternId: 'p3-comparing-figure-areas',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const length = rng.int(9, 11);
  const breadth = rng.int(4, 6);
  const narrowBreadth = breadth - 1;

  // Both a shorter card and a narrower card cover more space than the first.
  const sides = rng.shuffle([
    { length, breadth },
    { length: length - 1, breadth: breadth + 1 },
    { length: Math.floor(length * breadth / narrowBreadth) + 1, breadth: narrowBreadth },
    { length: rng.int(length, length + 2), breadth: rng.int(breadth + 1, breadth + 2) },
  ]);
  const labels = ['P', 'Q', 'R', 'S'];
  const cards = sides.map(({ length, breadth }, i) => ({
    label: labels[i], length, breadth, area: length * breadth,
  }));
  const smallest = cards.reduce((best, card) => card.area < best.area ? card : best);
  const conclusion = `Card ${smallest.label} covers the least space because ${smallest.area} cm² is the smallest of the four areas.`;
  const workedSteps = cards.map(card => ({
    text: `Multiply the length by the breadth of card ${card.label}.`,
    equation: `${card.length} × ${card.breadth} = ${card.area} cm²`,
  }));

  return {
    key,
    prompt: 'Four rectangular cards lie flat on a desk. Which card covers the least space?',
    picture: {
      type: 'nanyang-p4', layout: 'table', caption: 'Card sizes', rowHeader: 'Card',
      columns: ['Length (cm)', 'Breadth (cm)'],
      rows: cards.map(card => ({ label: card.label, values: [card.length, card.breadth] })),
    },
    choices: labels,
    answer: smallest.label,
    hint: 'Imagine each card covered with rows of 1 cm squares. How many squares would cover each card?',
    workedSteps: [...workedSteps, { text: conclusion }],
    explanation: `${cards.map(card => `${card.label} covers ${card.area} cm²`).join(', ')}. ${conclusion}`,
  };
}
