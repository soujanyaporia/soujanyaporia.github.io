import { Rng, hashString } from '../../engine/random';
import { fraction, type Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-three-fractional-shares',
  level: 3,
  title: 'Add three parts of one whole',
  objective: 'Add three shares of the same whole using a common denominator and give the total in simplest form.',
  skillIds: ['P3.S.FRAC.05', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p3-fraction-arithmetic',
};

const denominatorSets = [
  [2, 4, 8],
  [2, 3, 12], [2, 4, 12], [2, 6, 12],
  [3, 4, 12], [3, 6, 12], [4, 6, 12],
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const denominators = rng.shuffle(rng.pick(denominatorSets));
  const common = Math.max(...denominators);
  const counts = denominators.map(d => common / d);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const sum = `${total}/${common}`;
  const answer = fraction(total, common);
  const factor = common / Number(answer.split('/')[1]);
  const projects = ['a kite', 'a flag', 'a bookmark'];
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: `Count each piece in ${common === 8 ? 'eighths' : 'twelfths'} of the roll.`,
      equation: denominators.filter(d => d !== common)
        .map(d => `1/${d} = ${common / d}/${common}`).join(', '),
    },
    {
      text: 'Add the three counts. Each part is the same size.',
      equation: `${counts.map(n => `${n}/${common}`).join(' + ')} = ${sum}`,
    },
    factor > 1 ? {
      text: `Divide the top and bottom numbers by ${factor}.`,
      equation: `${sum} = (${total} ÷ ${factor})/(${common} ÷ ${factor}) = ${answer}`,
    } : {
      text: `Only 1 divides both ${total} and ${common} exactly, so ${answer} is already in simplest form.`,
    },
  ];
  return {
    key,
    context: [
      'Nila cuts three pieces from one roll of ribbon.',
      ...projects.map((project, i) => `The piece for ${project} is 1/${denominators[i]} of the full roll.`),
    ],
    prompt: 'What fraction of the roll does Nila cut off in all? Write your fraction in simplest form.',
    answer,
    requireSimplified: true,
    hint: 'Use the largest bottom number to write all three pieces as parts of the same size.',
    workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}
