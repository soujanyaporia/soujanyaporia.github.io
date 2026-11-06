import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-reference-fraction-selection',
  level: 3,
  title: 'Find fractions below a given fraction',
  objective: 'Use equal-sized parts to find every listed fraction smaller than one third or one half.',
  skillIds: ['P3.S.FRAC.03'],
  canonicalPatternId: 'p3-comparison-with-a-reference-fraction',
};

type Fraction = { numerator: number; denominator: number };
const label = (f: Fraction) => `${f.numerator}/${f.denominator}`;
const denominators = {
  written: [4, 5, 8, 12],
  choice: [3, 4, 5, 6, 10, 12],
  pair: [4, 5, 6, 7, 11],
};

function comparisonStep(f: Fraction, referenceDenominator: number) {
  let parts = f.denominator;
  while (parts % referenceDenominator !== 0) parts += f.denominator;
  const count = f.numerator * (parts / f.denominator);
  const referenceCount = parts / referenceDenominator;
  const sign = count < referenceCount ? '<' : count > referenceCount ? '>' : '=';
  return {
    text: `Divide the same whole into ${parts} equal parts. ${label(f)} covers ${count} of them and 1/${referenceDenominator} covers ${referenceCount}.`,
    equation: `${count}/${parts} ${sign} ${referenceCount}/${parts}, so ${label(f)} ${sign} 1/${referenceDenominator}`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['written', 'choice', 'pair'] as const);
  const referenceDenominator = form === 'written' ? 3 : 2;
  const reference = `1/${referenceDenominator}`;
  const pool: Fraction[] = [];
  for (const denominator of denominators[form]) {
    for (let numerator = 1; numerator < denominator; numerator++) {
      // Keep the single-choice distractors at or just either side of one half.
      if (form === 'choice' && Math.abs(2 * numerator - denominator) > 2) continue;
      pool.push({ numerator, denominator });
    }
  }

  // Each sign is the required comparison of one option with the reference.
  const signs = form === 'written' ? [-1, 1, 1] : form === 'choice' ? [0, -1, 1, 1] : [-1, -1, 1, 1];
  const selected: Fraction[] = [];
  for (const sign of signs) {
    const available = pool.filter(f =>
      Math.sign(f.numerator * referenceDenominator - f.denominator) === sign &&
      selected.every(previous => previous.denominator !== f.denominator &&
        previous.numerator * f.denominator !== f.numerator * previous.denominator),
    );
    selected.push(rng.pick(available));
  }
  const listed = rng.shuffle(selected);
  const options = listed.map(label);
  const smaller = listed.filter(f => f.numerator * referenceDenominator < f.denominator).map(label);
  const explanation = form === 'pair'
    ? `${smaller.join(' and ')} are both less than ${reference}.`
    : `${smaller[0]} is the only fraction in the list less than ${reference}.`;
  const base = {
    key,
    hint: `Compare each fraction with ${reference}. Write the two fractions with the same bottom number. Which has the smaller top number?`,
    workedSteps: [...listed.map(f => comparisonStep(f, referenceDenominator)), { text: explanation }],
    explanation,
  };

  if (form === 'choice') {
    return { ...base, prompt: `Pick the fraction that is less than ${reference}.`, choices: options, answer: smaller[0] };
  }
  const display = options.join(', ');
  if (form === 'pair') {
    return {
      ...base, display, prompt: `Find the two fractions less than ${reference}. Choose both.`,
      structuredResponse: { kind: 'named-pair', options }, answer: JSON.stringify(smaller),
    };
  }
  return { ...base, display, prompt: `Write the fraction in this list that is less than ${reference}.`, answer: smaller[0] };
}
