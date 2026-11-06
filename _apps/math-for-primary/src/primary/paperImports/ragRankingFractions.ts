import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-ranking-fractions',
  level: 3,
  title: 'Rank fractions',
  objective: 'Compare unlike fractions to put them largest first or choose the largest share.',
  skillIds: ['P3.S.FRAC.03'],
  canonicalPatternId: 'ranking-fractions',
};

type Fraction = { numerator: number; denominator: number };
const label = (f: Fraction) => `${f.numerator}/${f.denominator}`;
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

function makeFractions(rng: Rng, count: number, equalNumerators: boolean): Fraction[] {
  if (equalNumerators) {
    const numerator = rng.int(3, 6);
    const denominators = Array.from({ length: 12 - numerator }, (_, i) => numerator + i + 1);
    return rng.shuffle(denominators).slice(0, count).map(denominator => ({ numerator, denominator }));
  }

  // Each pool has a common denominator of at most 24. Reduced fractions
  // with different denominators have different values, so ties are impossible.
  const pool = rng.pick([[2, 3, 4, 6], [2, 3, 6, 9], [2, 4, 8, 12], [3, 6, 8, 12]]);
  const fractions = rng.shuffle([...pool]).slice(0, count).map(denominator => {
    const candidates = Array.from({ length: denominator - 1 }, (_, i) => i + 1);
    const numerator = rng.pick(candidates.filter(n => gcd(n, denominator) === 1));
    return { numerator, denominator };
  });
  if (fractions.every(f => f.numerator === fractions[0].numerator)) {
    const adjustable = fractions.find(f => f.denominator > 2)!;
    adjustable.numerator = adjustable.numerator === 1 ? adjustable.denominator - 1 : 1;
  }
  return fractions;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(1, 11);
  const equalNumerators = variant === 11;
  const ordering = variant <= 6 || equalNumerators;
  const shown = makeFractions(rng, ordering ? 3 : 4, equalNumerators);
  const ranked = [...shown].sort((a, b) => equalNumerators
    ? a.denominator - b.denominator
    : b.numerator * a.denominator - a.numerator * b.denominator);
  if (ordering && shown.every((f, i) => f === ranked[i])) shown.push(shown.shift()!);
  const cards = shown.map(label);
  const ranking = ranked.map(label);
  const greatest = ranking[0];
  const steps: NonNullable<Question['workedSteps']> = [];
  let hint: string;

  if (equalNumerators) {
    hint = 'Each fraction counts the same number of pieces. Which denominator gives the biggest pieces?';
    steps.push({
      text: `Each fraction counts ${ranked[0].numerator} pieces. When the wholes are the same size, cutting a whole into fewer equal pieces makes each piece bigger. Start with the smallest denominator.`,
      equation: ranked.map(f => f.denominator).join(' < '),
    });
  } else {
    hint = 'Give the fractions the same denominator. Then compare how many parts each one has.';
    const common = shown.reduce((multiple, f) => multiple / gcd(multiple, f.denominator) * f.denominator, 1);
    steps.push({
      text: `Use ${common} as the denominator so the parts are the same size.`,
      equation: shown.map(f => `${label(f)} = ${f.numerator * (common / f.denominator)}/${common}`).join(', '),
    });
    steps.push({
      text: 'Compare the numbers of equal parts, starting with the largest.',
      equation: ranked.map(f => f.numerator * (common / f.denominator)).join(' > '),
    });
  }

  let response: Pick<Question, 'prompt' | 'answer' | 'choices' | 'order' | 'context'>;
  if (ordering) {
    response = { prompt: 'Put the three fraction cards in a row, largest first.', order: cards, answer: ranking.join(',') };
    steps.push({ text: 'Put the original cards in this order.', equation: ranking.join(' > ') });
  } else if (rng.chance(0.5)) {
    const names = ['Mei', 'Ravi', 'Ben', 'Asha'];
    const owner = names[cards.indexOf(greatest)];
    response = {
      prompt: 'Who colours the longest part of a ribbon?',
      context: ['Each child has one ribbon. All four ribbons are the same length.',
        ...names.map((name, i) => `${name} colours ${cards[i]} of a ribbon.`)],
      choices: names,
      answer: owner,
    };
    steps.push({ text: `${greatest} is the largest share. ${owner} colours that share.`, equation: ranking.join(' > ') });
  } else {
    response = { prompt: 'Pick the fraction with the largest value.', choices: cards, answer: greatest };
    steps.push({ text: `Choose ${greatest}.`, equation: ranking.join(' > ') });
  }

  return { key, ...response, hint, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ') };
}
