import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-fraction-relationship',
  level: 3,
  title: 'Fill the gaps in equal fractions',
  objective: 'Use a known fraction or one whole to find missing top and bottom numbers.',
  skillIds: ['P3.S.FRAC.04', 'P3.S.FRAC.01'],
  canonicalPatternId: 'p3-missing-entries-in-a-fraction-relationship',
} as const;

const namedParts = [[3, 'third'], [4, 'quarter'], [5, 'fifth'], [7, 'seventh'], [8, 'eighth'], [10, 'tenth'], [12, 'twelfth']] as const;
const reducedFractions = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6]] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;

  function question(prompt: string, display: string, answer: string, hint: string,
    workedSteps: NonNullable<Question['workedSteps']>, controls: Pick<Question, 'choices' | 'structuredResponse'> = {}): Question {
    return {
      key, prompt, display, answer, hint, workedSteps, ...controls,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 0) {
    const [parts, name] = rng.pick(namedParts);
    return question(`How many ${name}s make one whole?`, `1 whole = □/${parts}`, String(parts),
      `Think about how many equal parts there are when each part is one ${name}.`, [
        { text: `One ${name} is one of ${parts} equal parts.`, equation: `1 ${name} = 1/${parts}` },
        { text: 'Use all the parts to make the whole.', equation: `${parts}/${parts} = 1` },
      ]);
  }

  if (variant === 1) {
    const bottom = rng.pick([3, 4, 6, 7, 8]);
    const factor = rng.int(2, Math.min(4, Math.floor(24 / bottom)));
    const answer = bottom * factor;
    return question('What number belongs below the bar in the second fraction?', `1/${bottom} = ${factor}/□`, String(answer),
      'Find what the top number was multiplied by. Use the same factor below the bar.', [
        { text: 'Look at the two top numbers.', equation: `1 × ${factor} = ${factor}` },
        { text: 'Multiply the bottom number by the same factor.', equation: `${bottom} × ${factor} = ${answer}` },
        { text: 'Both fractions now name the same amount.', equation: `1/${bottom} = ${factor}/${answer}` },
      ]);
  }

  const [top, bottom] = rng.pick(reducedFractions);
  const [smallFactor, largeFactor] = rng.pick([[2, 3], [3, 4]] as const);
  const smallTop = top * smallFactor;
  const smallBottom = bottom * smallFactor;
  const largeTop = top * largeFactor;
  const largeBottom = bottom * largeFactor;

  if (variant === 2) {
    const choices = rng.shuffle([smallBottom, largeBottom, largeBottom - (largeTop - smallTop), smallTop].map(String));
    return question('Which bottom number makes the two fractions equal?', `${largeTop}/${largeBottom} = ${smallTop}/□`, String(smallBottom),
      'Try writing the first fraction in its simplest form. Then look for the top number you need.', [
        { text: `Divide both numbers in the first fraction by ${largeFactor}.`, equation: `${largeTop}/${largeBottom} = ${top}/${bottom}` },
        { text: 'Find the factor that gives the new top number.', equation: `${smallTop} ÷ ${top} = ${smallFactor}` },
        { text: 'Use that factor on the bottom number too.', equation: `${bottom} × ${smallFactor} = ${smallBottom}` },
      ], { choices });
  }

  return question('Fill in A and B so that all three fractions are equal.', `${top}/A = ${smallTop}/${smallBottom} = B/${largeBottom}`,
    JSON.stringify([String(bottom), String(largeTop)]),
    'Start in the middle. Match the top number on the left first. Then use the completed left fraction to find B.', [
      { text: 'Find how many times the left top number fits into the middle top number.', equation: `${smallTop} ÷ ${top} = ${smallFactor}` },
      { text: 'Divide the middle bottom number by that factor to find A.', equation: `${smallBottom} ÷ ${smallFactor} = ${bottom}` },
      { text: 'Compare the bottom numbers on the right and left.', equation: `${largeBottom} ÷ ${bottom} = ${largeFactor}` },
      { text: 'Multiply the left top number by that factor to find B.', equation: `${top} × ${largeFactor} = ${largeTop}` },
      { text: 'Put both numbers back in their places.', equation: `${top}/${bottom} = ${smallTop}/${smallBottom} = ${largeTop}/${largeBottom}` },
    ], { structuredResponse: { kind: 'number-pair', firstLabel: 'A', secondLabel: 'B' } });
}
