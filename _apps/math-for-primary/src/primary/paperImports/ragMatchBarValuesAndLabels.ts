import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-match-bar-values-and-labels',
  level: 3,
  title: 'Find the children from their bars',
  objective: 'Name the two children with equal counts, then find a child from a difference in counts.',
  skillIds: ['P3.S.GRAPH.01'],
  canonicalPatternId: 'p3-match-bar-values-and-labels',
};

const names = ['Devi', 'Hana', 'Jia', 'Kai', 'Mei', 'Mira', 'Noor', 'Ravi', 'Siti', 'Zac'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const labels = rng.shuffle(names).slice(0, 5);
  const scale = rng.pick([2, 3, 5]);
  const tiedSteps = rng.int(3, 5);
  const extraSteps = rng.int(2, 3);
  const targetSteps = tiedSteps + extraSteps;
  const maxSteps = Math.min(12, Math.floor(40 / scale));
  const otherSteps = Array.from({ length: maxSteps - 1 }, (_, i) => i + 2)
    .filter(n => n !== tiedSteps && n !== targetSteps);
  const steps = rng.shuffle([tiedSteps, tiedSteps, targetSteps, ...rng.shuffle(otherSteps).slice(0, 2)]);
  const values = steps.map(n => n * scale);

  const pair = labels.filter((_, i) => steps[i] === tiedSteps);
  const reference = rng.pick(pair);
  const target = labels[steps.indexOf(targetSteps)];
  const tiedCount = tiedSteps * scale;
  const extra = extraSteps * scale;
  const targetCount = targetSteps * scale;
  const workedSteps = [
    { text: `Each space between grid lines stands for ${scale} cards.` },
    { text: `The bars for ${pair[0]} and ${pair[1]} both reach ${tiedSteps} spaces above zero.`,
      equation: `${tiedSteps} × ${scale} = ${tiedCount} cards each` },
    { text: `Start with ${reference}’s ${tiedCount} cards and add ${extra} cards.`,
      equation: `${tiedCount} + ${extra} = ${targetCount}` },
    { text: `The bar at ${targetCount} cards belongs to ${target}.` },
  ];

  return {
    key,
    context: [
      'The bars show how many cards each child packed for a game.',
      '(a) Which two children packed equal numbers of cards?',
      `(b) One child packed ${extra} more cards than ${reference}. Who was it?`,
    ],
    prompt: 'Write the two names for (a) from left to right on the graph. Then write the name for (b). Leave a space between names.',
    picture: { type: 'bars', labels, values, scale },
    answer: [...pair, target].join(' '),
    hint: 'Look for two bars that stop at the same line. For (b), read the named child’s bar, add the extra cards and look for that total.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
