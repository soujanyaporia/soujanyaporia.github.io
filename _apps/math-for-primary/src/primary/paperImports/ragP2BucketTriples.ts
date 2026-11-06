import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-bucket-triples',
  level: 2,
  title: 'Choose three buckets',
  objective: 'Choose three different full buckets whose volumes add up to the required number of litres.',
  skillIds: ['P2.S.MEASURE.03', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-combination-with-a-target-sum',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const letters = ['A', 'B', 'C', 'D'];
  const volumes = rng.shuffle([2, 4, 5, 9, 11, 13, 16]).slice(0, 4);
  const buckets = letters.map((letter, i) => ({ letter, litres: volumes[i] }));
  const total = volumes.reduce((sum, litres) => sum + litres, 0);
  const spare = rng.int(0, buckets.length - 1);
  const target = total - volumes[spare];

  // Each possible group leaves out one bucket. Distinct volumes give distinct group totals.
  const groups = buckets.map((_, omitted) => buckets.filter((_, i) => i !== omitted));
  const choices = groups.map(([first, second, third]) => `${first.letter}, ${second.letter} and ${third.letter}`);
  const answer = choices[spare];
  const selectedSum = groups[spare].map(bucket => `${bucket.litres} L`).join(' + ');

  return {
    key,
    prompt: 'Which three buckets should Lina choose?',
    context: [
      `Lina wants to pour exactly ${target} L of water into an empty tub.`,
      'All four buckets are full. She pours out all the water from each bucket she chooses and uses it only once.',
    ],
    picture: {
      type: 'paper',
      layout: 'cards',
      heading: 'Water in each bucket',
      cards: buckets.map(bucket => ({ label: `Bucket ${bucket.letter}`, value: `${bucket.litres} L` })),
    },
    answer,
    choices: rng.shuffle(choices),
    hint: 'One bucket stays behind. How much more water do all four buckets hold than Lina needs?',
    workedSteps: [
      { text: 'Add the water in all four buckets.', equation: `${volumes.map(v => `${v} L`).join(' + ')} = ${total} L` },
      { text: `Find how much water to leave behind. Bucket ${letters[spare]} holds that amount.`, equation: `${total} L − ${target} L = ${volumes[spare]} L` },
      { text: `Check buckets ${answer}.`, equation: `${selectedSum} = ${target} L` },
    ],
    explanation: `Leave bucket ${letters[spare]} behind. Buckets ${answer} give Lina exactly ${target} L because ${selectedSum} = ${target} L.`,
  };
}
