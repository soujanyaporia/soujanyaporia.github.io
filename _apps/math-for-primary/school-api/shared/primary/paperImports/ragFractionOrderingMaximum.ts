import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-fraction-ordering-maximum',
  level: 6,
  title: 'Order fractions and find the greatest',
  objective: 'Compare equivalent fraction values to order three numbers or identify the greatest of four.',
  skillIds: ['P3.S.FRAC.01', 'P3.S.FRAC.03', 'P4.S.FRAC.01', 'P4.S.FRAC.02'],
  canonicalPatternId: 'fraction-ordering-and-maximum',
};

type Variant = 'ascending' | 'descending' | 'largest';
type Part = {n: number; d: number};
type Term = Part & {label: string};

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variants: Variant[] = ['descending', 'descending', 'ascending', 'largest'];
  const variant = variants[r.int(0, variants.length - 1)]!;
  const count = variant === 'largest' ? 4 : 3;
  // Each denominator family has a small common multiple suitable for mental work.
  const denominators = r.pick([
    [4, 8, 12], [4, 5, 10], [5, 8, 10],
    [5, 10, 12], [4, 7], [7, 8],
  ]);
  const pool: Part[] = [];
  for (const d of denominators) {
    for (let n = 1; n < d; n++) {
      if (gcd(n, d) === 1) pool.push({n, d});
    }
  }
  const shuffled = r.shuffle(pool);
  const first = shuffled[0]!;
  const second = shuffled.find(part => part.d !== first.d)!;
  const parts = [first, second, ...shuffled.filter(part => part !== first && part !== second)].slice(0, count);

  // Include proper fractions, values on either side of 1, and values sharing a whole part.
  const profile = r.int(0, 2);
  const sharedWhole = r.int(1, 3);
  const terms: Term[] = parts.map((part, i) => {
    const whole = profile === 0 ? 0 : profile === 1 ? (i === 0 ? 0 : 1) : sharedWhole;
    const n = whole * part.d + part.n;
    const showMixed = whole > 0 && (i === 1 || (count === 4 && i === 3));
    return {
      n,
      d: part.d,
      label: showMixed ? `${whole} ${part.n}/${part.d}` : `${n}/${part.d}`,
    };
  });
  const displayed = r.shuffle(terms);
  const common = terms.reduce((multiple, term) => multiple / gcd(multiple, term.d) * term.d, 1);
  const scaledNumerator = (term: Term) => term.n * (common / term.d);
  const ascending = [...terms].sort((a, b) => scaledNumerator(a) - scaledNumerator(b));
  const ranked = variant === 'ascending' ? ascending : [...ascending].reverse();
  const answer = variant === 'largest' ? ranked[0]!.label : ranked.map(term => term.label).join(', ');

  let choices: string[];
  if (variant === 'largest') {
    choices = r.shuffle(displayed.map(term => term.label));
  } else {
    const [a, b, c] = ranked.map(term => term.label);
    // Reverse the direction or swap one adjacent pair to create distinct distractors.
    choices = r.shuffle([
      answer,
      [b, a, c].join(', '),
      [a, c, b].join(', '),
      [c, b, a].join(', '),
    ]);
  }

  const workedSteps: NonNullable<Question['workedSteps']> = [];
  const mixed = displayed.filter(term => term.label.includes(' '));
  if (mixed.length > 0) {
    workedSteps.push({
      text: 'Write each mixed number as an improper fraction.',
      equation: mixed.map(term => {
        const whole = Math.floor(term.n / term.d);
        const remainder = term.n % term.d;
        return `${term.label} = (${whole} × ${term.d} + ${remainder})/${term.d} = ${term.n}/${term.d}`;
      }).join('; '),
    });
  }
  workedSteps.push({
    text: `Use ${common} as a common denominator.`,
    equation: displayed.map(term => `${term.label} = ${scaledNumerator(term)}/${common}`).join('; '),
  });
  workedSteps.push({
    text: 'The denominators match, so compare the numerators.',
    equation: ranked.map(term => `${scaledNumerator(term)}/${common}`).join(variant === 'ascending' ? ' < ' : ' > '),
  });
  workedSteps.push({
    text: variant === 'largest'
      ? `${answer} has the greatest value.`
      : `From ${variant === 'ascending' ? 'least to greatest' : 'greatest to least'}, the order is ${answer}.`,
  });

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: variant === 'largest'
      ? 'Which of these numbers has the greatest value?'
      : `Choose the row that puts these numbers in order, from ${variant === 'ascending' ? 'least to greatest' : 'greatest to least'}.`,
    display: displayed.map(term => term.label).join(', '),
    answer,
    choices,
    hint: 'Change any mixed numbers to improper fractions. Then make the denominators the same and compare the numerators.',
    workedSteps,
    explanation: workedSteps.map(step => step.equation ? `${step.text} ${step.equation}.` : step.text).join(' '),
  };
}
