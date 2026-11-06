import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-two-number-statements',
  level: 1,
  title: 'Fill both number gaps',
  objective: 'Place two given numbers in the gaps to make a comparison sentence true.',
  skillIds: ['P1.S.WN.04'],
  canonicalPatternId: 'p1-compare-two-given-quantities',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));

  // Use separate decades so neither line borrows a number from the other.
  const lowerTens = r.int(1, 2);
  const sharedTens = lowerTens === 1 ? 3 : 1;
  const [u, v] = r.shuffle([0, 2, 3, 4, 5, 7, 8]);
  const larger = 10 * sharedTens + Math.max(u, v);
  const smaller = 10 * sharedTens + Math.min(u, v);

  // The number with fewer tens has more ones: looking only at ones will not work.
  const below = 10 * lowerTens + r.int(5, 7);
  const above = 10 * (lowerTens + 1) + r.pick([0, 2, 3]);
  const firstPair = r.shuffle([larger, smaller]).join(' and ');
  const secondPair = r.shuffle([below, above]).join(' and ');
  const workedSteps = [
    { text: `Both numbers in (a) have the same tens digit. Look at the ones: ${larger % 10} is more than ${smaller % 10}.`, equation: `${larger} is greater than ${smaller}.` },
    { text: `In (b), ${below} has fewer tens than ${above}. That makes ${below} the smaller number.`, equation: `${below} is smaller than ${above}.` },
  ];

  return {
    key,
    prompt: 'Fill the gaps to make each sentence true. Use both numbers from that line, once each.',
    context: [
      `(a) Use ${firstPair}: □ is greater than □.`,
      `(b) Use ${secondPair}: □ is smaller than □.`,
    ],
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        { label: '(a) Left gap' }, { label: '(a) Right gap' },
        { label: '(b) Left gap' }, { label: '(b) Right gap' },
      ],
    },
    answer: JSON.stringify([larger, smaller, below, above].map(String)),
    hint: 'Look at the tens first. If they match, compare the ones. Read the words between the gaps to decide which number goes first.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
