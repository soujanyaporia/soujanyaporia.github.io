import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-missing-place-value-part',
  level: 1,
  title: 'Find the missing tens or ones',
  objective: 'Use a total and one known part to find how many tens or ones make up the other part.',
  skillIds: ['P1.S.WN.02', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-missing-place-value-part',
};

function counted(count: number, unit: 'one' | 'ten'): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['given-tens-count', 'given-tens-value', 'given-ones']);
  const tens = rng.int(1, 8);
  const tensValue = 10 * tens;
  const keepExtraTen = form === 'given-ones' || rng.chance(0.5);
  const looseOnes = (keepExtraTen ? 10 : 0) + rng.pick([0, 1, 2, 3, 4, 6, 7, 8]);
  const total = tensValue + looseOnes;
  const tensLabel = counted(tens, 'ten');
  const onesLabel = counted(looseOnes, 'one');
  const explanation = `${tensLabel} and ${onesLabel} make ${total}, because ${tensValue} + ${looseOnes} = ${total}.`;

  if (form === 'given-ones') {
    return {
      key,
      prompt: 'How many tens go in the box?',
      display: `${total} ones = □ tens + ${onesLabel}`,
      answer: String(tens),
      hint: 'Set aside the ones shown. Make groups of ten with the rest.',
      workedSteps: [
        { text: `Set aside ${onesLabel}.`, equation: `${total} − ${looseOnes} = ${tensValue}` },
        { text: 'Each group of ten ones makes one ten.', equation: `${tensValue} ones = ${tensLabel}` },
      ],
      explanation,
      proof: { op: '/', a: { op: '-', a: total, b: looseOnes }, b: 10 },
    };
  }

  const givenCount = form === 'given-tens-count';
  const firstStep = givenCount
    ? { text: 'Count ten ones for each ten shown.', equation: `${tensLabel} = ${tensValue} ones` }
    : { text: 'Take the value of the tens away from the total.', equation: `${total} − ${tensValue} = ${looseOnes}` };
  const secondStep = givenCount
    ? { text: 'Take those ones away to find the ones left over.', equation: `${total} − ${tensValue} = ${looseOnes}` }
    : { text: 'Check that the two parts make the total.', equation: `${tensValue} + ${looseOnes} = ${total}` };

  return {
    key,
    prompt: givenCount ? 'How many ones go with these tens?' : 'The first number is the value of the tens. How many ones must you add?',
    display: givenCount ? `${total} = ${tensLabel} + □ ones` : `${tensValue} + □ = ${total}`,
    answer: String(looseOnes),
    hint: givenCount ? 'Count the tens in tens. Then see how many ones are left.' : 'Count on from the value of the tens to the total.',
    workedSteps: [firstStep, secondStep],
    explanation,
    proof: { op: '-', a: total, b: tensValue },
  };
}
