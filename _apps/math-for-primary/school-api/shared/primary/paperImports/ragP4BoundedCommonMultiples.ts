import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-bounded-common-multiples',
  level: 4,
  title: 'Find common multiples within limits',
  objective: 'Use the spacing between common multiples to find the numbers that fit the given limits.',
  skillIds: ['P4.S.FACT.03'],
  canonicalPatternId: 'p4-common-multiples-within-bounds',
};

const factorSets = [[3, 4], [4, 6], [4, 5], [5, 6], [6, 8], [2, 4, 5], [3, 4, 8], [2, 6, 9]];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.int(0, 6);
  const factors = rng.pick(factorSets);
  const names = `${factors.slice(0, -1).join(', ')} and ${factors[factors.length - 1]}`;
  const largest = Math.max(...factors);
  const tried = [largest];
  let step = largest;
  while (!factors.every(factor => step % factor === 0)) {
    step += largest;
    tried.push(step);
  }
  const startWork = [
    { text: `List multiples of ${largest} in order until one can be divided exactly by every given factor.`, equation: tried.join(', ') },
    { text: `${step} is the first common multiple. Count on in steps of ${step} to find the others.`, equation: factors.map(factor => `${step} ÷ ${factor} = ${step / factor}`).join(', ') },
  ];
  const hint = `Start with the ${largest} times table. Which is the first number in it that all the given factors divide exactly?`;

  if (mode < 5) {
    const total = step * rng.int(2, Math.floor(99 / step));
    const lower = total - rng.int(largest, step);
    const upper = total + rng.int(largest, step);
    const story = mode < 3;
    const context = story ? [
      `A jar holds more than ${lower} beads but fewer than ${upper} beads.`,
      ...factors.map(size => `Mira can arrange all the beads in rows of ${size} with none left over.`),
    ] : [
      `My number is greater than ${lower} and less than ${upper}.`,
      `${names} are factors of my number.`,
    ];
    return {
      key, context, hint,
      prompt: story ? 'How many beads are in the jar?' : 'What is my number?',
      ...(story ? { unit: 'beads' } : {}),
      answer: String(total),
      workedSteps: [...startWork,
        { text: 'Look at these consecutive common multiples near the two limits.', equation: `${total - step}, ${total}, ${total + step}` },
        { text: 'Only the middle one is strictly between the limits.', equation: `${lower} < ${total} < ${upper}` },
      ],
      explanation: `The common multiples are spaced ${step} apart. Only ${total} lies above ${lower} and below ${upper}.`,
    };
  }

  if (mode === 5) {
    const digits = rng.pick([2, 3]);
    const lower = digits === 2 ? rng.int(step, 99 - step) : rng.int(70, 160);
    const digitFloor = 10 ** (digits - 1);
    const minimum = Math.max(lower + 1, digitFloor);
    const answer = Math.ceil(minimum / step) * step;
    return {
      key, hint,
      context: [`My number is greater than ${lower}.`, `${names} are factors of my number.`],
      prompt: `What is the smallest ${digits}-digit number that fits these clues?`,
      answer: String(answer),
      workedSteps: [...startWork,
        { text: `The first ${digits}-digit number is ${digitFloor}. The number must also be at least ${lower + 1}, so start looking at ${minimum}.` },
        { text: 'These are neighbouring common multiples. The smaller one falls short.', equation: `${answer - step} < ${minimum} ≤ ${answer}` },
      ],
      explanation: `${answer} has ${digits} digits and is greater than ${lower}. The preceding common multiple, ${answer - step}, is below ${minimum}.`,
    };
  }

  const count = rng.int(2, 4);
  const terms = Array.from({ length: count }, (_, i) => (i + 1) * step);
  const last = terms[terms.length - 1];
  const upper = last + rng.pick([step, rng.int(1, step - 1)]);
  return {
    key, hint,
    context: [`Each number must be positive and less than ${upper}.`, `Each number must have ${names} as factors.`],
    prompt: 'Write all the numbers that fit, from smallest to largest.',
    structuredResponse: { kind: 'number-fields', fields: terms.map((_, i) => ({ label: `Number ${i + 1}` })) },
    answer: JSON.stringify(terms.map(String)),
    workedSteps: [...startWork,
      { text: `Start at ${step} and count on by ${step} while the numbers are below ${upper}.`, equation: terms.join(', ') },
      { text: `The next common multiple reaches or passes ${upper}, so stop before it.`, equation: `${last} + ${step} = ${last + step}` },
    ],
    explanation: `The positive common multiples below ${upper} are ${terms.join(', ')}. The next one is ${last + step}.`,
  };
}
