import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-category-count-fraction',
  level: 4,
  title: 'What fraction of the set?',
  objective: 'Find the number in one group and write it as a fraction of the whole set in simplest form.',
  skillIds: ['P4.S.FRAC.03', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p4-category-count-as-fraction-of-whole',
};

// Scaling a reduced share keeps every count whole and gives pupils a fraction to simplify.
const shares = [
  [2, 5], [3, 5], [2, 7], [3, 7], [4, 7],
  [3, 8], [5, 8], [4, 9], [7, 10], [5, 12],
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const story = rng.pick(['tiles', 'postcards', 'roll', 'badges'] as const);
  const [numerator, denominator] = rng.pick(shares);
  const factor = rng.int(4, 6);
  const target = numerator * factor;
  const total = denominator * factor;
  const other = total - target;
  const answer = `${numerator}/${denominator}`;

  let context: string[];
  let question: string;
  let hint: string;
  const steps: NonNullable<Question['workedSteps']> = [];

  if (story === 'roll') {
    context = [`A new roll held ${total} stickers. There are ${target} stickers left on it now.`];
    question = 'What fraction of the original stickers is left on the roll?';
    hint = 'Think about which count describes the whole roll when it was new.';
  } else if (story === 'badges') {
    const kites = rng.int(2, Math.min(target - 2, other - 2));
    const boats = other - kites;
    const gap = target - kites;
    context = [
      'Each badge shows just one picture. It shows a kite, a boat or a train.',
      `There are ${kites} kite badges and ${boats} boat badges. There are ${gap} more train badges than kite badges.`,
    ];
    question = 'What fraction of all the badges show a train?';
    hint = 'Use the kite count to find the train count. Include the boat badges when you find the total.';
    steps.push(
      {text: 'Add the extra badges to the kite count to find the train count.', equation: `${kites} + ${gap} = ${target}`},
      {text: 'Count all three kinds of badges.', equation: `${kites} + ${boats} + ${target} = ${total}`},
    );
  } else {
    const first = rng.int(2, other - 2);
    const second = other - first;
    if (story === 'tiles') {
      context = [
        `A tray holds ${total} tiles. Each tile has one picture.`,
        `${first} tiles show a leaf and ${second} show a flower. All the other tiles show a tree.`,
      ];
      question = 'What fraction of the tiles show a tree?';
      hint = 'Count the leaf and flower tiles together. Which tiles does that leave?';
      steps.push({text: 'Count the tiles with leaves or flowers.', equation: `${first} + ${second} = ${other}`});
    } else {
      context = [
        `At first, a box holds ${total} postcards. Mira takes ${first} postcards from the box. Dan then takes ${second} postcards from the same box.`,
      ];
      question = 'What fraction of the original postcards is still in the box?';
      hint = 'Find how many postcards the children took altogether. Use the starting count for the whole.';
      steps.push({text: 'Add the two counts of postcards taken.', equation: `${first} + ${second} = ${other}`});
    }
    steps.push({
      text: story === 'tiles' ? 'Find the number of tree tiles.' : 'Find how many postcards are still in the box.',
      equation: `${total} − ${other} = ${target}`,
    });
  }

  steps.push(
    {text: 'Write the count you want over the count for the whole set.', equation: `${target} out of ${total} = ${target}/${total}`},
    {text: `Divide both numbers by ${factor}.`, equation: `${target}/${total} = ${answer}`},
  );
  return {
    key, context, prompt: `${question} Write your fraction in simplest form.`,
    answer, requireSimplified: true, hint, workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: {op: '/', a: target, b: total},
  };
}
