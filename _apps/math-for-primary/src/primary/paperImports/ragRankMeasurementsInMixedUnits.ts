import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { massOrderQuestion } from './ragMixedUnitDials';

export const RAG_PATTERN = {
  id: 'p2-rank-measurements-in-mixed-units',
  level: 2,
  title: 'Compare lengths and masses',
  objective: 'Compare lengths in metres and centimetres, or read weighing scales in kilograms and grams to order three items.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.MEASURE.02', 'P2.S.WN.04'],
  canonicalPatternId: 'p2-rank-measurements-in-mixed-units',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;
  if (variant === 3) return massOrderQuestion(key, rng);

  const first = rng.int(2, 5);
  const second = rng.int(first + 1, 9);
  const metres = [first, second];
  // Sometimes the same numeral appears with both units. Other sets straddle a metre mark.
  const centimetres = rng.chance(0.5) ? metres : metres.map(m =>
    m * 100 + rng.pick([-1, 1]) * rng.int(1, 35)
  );
  const lengths = [
    ...metres.map(m => ({ label: `${m} m`, cm: 100 * m })),
    ...centimetres.map(cm => ({ label: `${cm} cm`, cm })),
  ];
  const shortest = variant === 0;
  const ordering = variant === 2;
  const ranked = [...lengths].sort((a, b) => shortest ? a.cm - b.cm : b.cm - a.cm);
  const labels = ranked.map(item => item.label);
  const shown = rng.shuffle(lengths.map(item => item.label));
  if (ordering && shown.join(',') === labels.join(',')) [shown[0], shown[1]] = [shown[1], shown[0]];

  const chain = ranked.map(item => `${item.cm} cm`).join(shortest ? ' < ' : ' > ');
  const extreme = shortest ? 'shortest' : 'longest';
  const result = ordering
    ? `From longest to shortest, the lengths are ${labels.join(', ')}.`
    : `The ${extreme} string measures ${labels[0]}.`;
  return {
    key,
    prompt: ordering ? 'Put the four string lengths in order. Start with the longest.' : `Pick the length of the ${extreme} string.`,
    ...(ordering ? { order: shown } : { choices: shown }),
    answer: ordering ? labels.join(',') : labels[0],
    hint: 'One metre is 100 centimetres. Write the metre lengths in centimetres so you can compare all four.',
    workedSteps: [
      { text: 'Count 100 centimetres for each metre.', equation: metres.map(m => `${m} m = ${m * 100} cm`).join(', ') },
      { text: `Start with the ${extreme} length and compare all four in centimetres.`, equation: chain },
      { text: result },
    ],
    explanation: `${chain}. ${result}`,
  };
}
