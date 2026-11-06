import { Rng, hashString } from '../../engine/random';
import { fraction, type Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-fraction-representation-conversion',
  level: 5,
  title: 'Change fraction representations',
  objective: 'Write decimals as simplified mixed numbers and regroup whole units into fractional parts.',
  skillIds: ['P4.S.FRAC.01', 'P4.S.FRAC.02', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p5-fraction-representation-conversion',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const mode = ((hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) + (index >>> 0)) % 4;

  if (mode < 3) {
    const whole = random.int(6, 14);
    const possibleHundredths = Array.from({ length: 99 }, (_, position) => position + 1)
      .filter(value => value % 10 !== 0 && (value % 2 === 0 || value % 5 === 0));
    const hundredths = random.pick(possibleHundredths);
    const decimal = `${whole}.${String(hundredths).padStart(2, '0')}`;
    const simplifiedPart = fraction(hundredths, 100);
    const reducedNumerator = Number(simplifiedPart.split('/')[0]);
    const commonFactor = hundredths / reducedNumerator;
    const answer = `${whole} ${simplifiedPart}`;
    const workedSteps = [
      {
        text: 'Keep the whole part and write the two decimal digits as hundredths.',
        equation: `${decimal} = ${whole} + ${hundredths}/100`,
      },
      {
        text: `Divide the numerator and denominator by their greatest common factor, ${commonFactor}.`,
        equation: `${hundredths}/100 = ${simplifiedPart}`,
      },
      {
        text: 'Combine the whole part with the simplified fraction.',
        equation: `${decimal} = ${answer}`,
      },
    ];
    const question: Question = {
      key,
      prompt: 'Write the decimal as a mixed number. Reduce the fraction part as far as possible.',
      display: decimal,
      answer,
      requireMixed: true,
      requireSimplified: true,
      hint: 'Keep the whole part. Write the decimal part over 100, then simplify that fraction.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
      proof: { op: '/', a: whole * 100 + hundredths, b: 100 },
    };

    if (mode === 1) {
      question.prompt = 'Which mixed number matches the decimal and has its fraction part in simplest form?';
      question.choices = random.shuffle([
        answer,
        `${whole} ${hundredths}/100`,
        `${whole} ${fraction(100 - hundredths, 100)}`,
        `${whole + 1} ${simplifiedPart}`,
      ]);
    }
    return question;
  }

  const whole = random.int(6, 12);
  const denominator = random.int(2, 12);
  const numerator = random.int(1, denominator - 1);
  const regroupedWholes = random.int(1, 3);
  const remainingWholes = whole - regroupedWholes;
  const extraParts = regroupedWholes * denominator;
  const missingNumerator = extraParts + numerator;
  const workedSteps = [
    {
      text: 'Find how many whole units are regrouped.',
      equation: `${whole} − ${remainingWholes} = ${regroupedWholes}`,
    },
    {
      text: `Each whole contains ${denominator} parts of size 1/${denominator}.`,
      equation: `${regroupedWholes} = ${extraParts}/${denominator}`,
    },
    {
      text: 'Add these parts to the fractional part already present.',
      equation: `${extraParts}/${denominator} + ${numerator}/${denominator} = ${missingNumerator}/${denominator}`,
    },
    {
      text: `Keep the remaining whole units. The number in the box is ${missingNumerator}.`,
      equation: `${whole} ${numerator}/${denominator} = ${remainingWholes} + ${missingNumerator}/${denominator}`,
    },
  ];
  return {
    key,
    prompt: 'Regroup the mixed number to complete the equality. What whole number belongs in the box?',
    display: `${whole} ${numerator}/${denominator} = ${remainingWholes} + □/${denominator}`,
    answer: String(missingNumerator),
    hint: 'Count the whole units that are regrouped. Change them into fractional parts using the given denominator.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: {
      op: '-',
      a: { op: '+', a: whole * denominator, b: numerator },
      b: remainingWholes * denominator,
    },
  };
}
