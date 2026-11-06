import { Rng, hashString } from '../../engine/random';
import { fraction, type Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-repeated-equal-shares',
  level: 3,
  title: 'Equal shares of one whole',
  objective: 'Combine equal unit fractions, find the fraction left, and count how many unit fractions make one whole.',
  skillIds: ['P3.S.FRAC.05', 'P3.S.FRAC.02', 'P2.S.FRAC.01'],
  canonicalPatternId: 'p3-repeated-equal-shares',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));

  if ((seed + index) % 2 === 0) {
    const denominator = rng.pick([2, 3, 4, 5, 7, 8, 9, 10, 11, 12]);
    return {
      key,
      context: [`A strip of paper is cut into equal pieces. Each piece is 1/${denominator} of the strip.`],
      prompt: 'How many pieces make one whole strip?',
      answer: String(denominator),
      unit: 'pieces',
      hint: 'What does the bottom number tell you about the whole strip?',
      workedSteps: [
        { text: `Each piece is one of ${denominator} equal parts.` },
        { text: 'Count all the parts to make one whole strip.', equation: `${denominator}/${denominator} = 1` },
      ],
      explanation: `It takes ${denominator} pieces of size 1/${denominator} of the strip to make the whole strip.`,
    };
  }

  const denominator = rng.pick([5, 6, 7, 8, 9, 10, 11, 12]);
  const children = rng.int(2, Math.min(5, denominator - 1));
  const remaining = denominator - children;
  const share = `1/${denominator}`;
  const usedFraction = fraction(children, denominator);
  const leftFraction = fraction(remaining, denominator);
  const usedFields = usedFraction.split('/');
  const leftFields = leftFraction.split('/');
  const workedSteps = [
    {
      text: '(a) Add one share for each child. Each share comes from the same roll.',
      equation: `${Array(children).fill(share).join(' + ')} = ${children}/${denominator}`,
    },
    {
      text: '(b) Write the whole roll in equal parts and take away the fraction the children cut off.',
      equation: `${denominator}/${denominator} − ${children}/${denominator} = ${remaining}/${denominator}`,
    },
  ];
  const divisor = denominator / Number(usedFields[1]);
  if (divisor > 1) {
    workedSteps.push({
      text: `Write both answers in simplest form. Divide the top and bottom of each fraction by ${divisor}.`,
      equation: `${children}/${denominator} = ${usedFraction},   ${remaining}/${denominator} = ${leftFraction}`,
    });
  }

  return {
    key,
    context: ['The craft club starts with one full roll of ribbon.', `${children} children each cut off ${share} of the original roll.`],
    prompt: '(a) What fraction of the roll do the children cut off altogether?\n(b) What fraction of the roll is left?\nWrite both fractions in simplest form.',
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        { label: '(a) Cut off — top number' },
        { label: '(a) Cut off — bottom number' },
        { label: '(b) Left — top number' },
        { label: '(b) Left — bottom number' },
      ],
    },
    answer: JSON.stringify([...usedFields, ...leftFields]),
    hint: 'Count one share for each child. Then find how many equal parts of the original roll are still there.',
    workedSteps,
    explanation: `Together the children cut off ${usedFraction} of the roll. The ${leftFraction} left on the roll makes up the rest of the whole.`,
  };
}
