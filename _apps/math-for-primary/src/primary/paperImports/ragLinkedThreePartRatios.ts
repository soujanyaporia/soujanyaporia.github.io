import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-linked-three-part-ratios',
  level: 6,
  title: 'Link three quantities',
  objective: 'Use two relationships to form a three-part ratio in simplest form.',
  skillIds: ['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-linked-three-part-ratios',
} as const;

type Label = 'A' | 'B' | 'C';
const FRACTIONS: readonly (readonly [number, number])[] = [
  [2, 3], [3, 5], [4, 5], [5, 6], [5, 7],
  [7, 8], [2, 5], [3, 8], [5, 9],
];
const PAIRS: readonly (readonly [number, number])[] = [
  [2, 3], [3, 2], [3, 5], [5, 3], [4, 7], [7, 4],
  [4, 5], [5, 4], [5, 8], [8, 5], [7, 9], [9, 7],
];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function simplest(terms: readonly number[]): number[] {
  const divisor = terms.reduce((a, b) => gcd(a, b));
  return terms.map(term => term / divisor);
}

const show = (terms: readonly number[]): string => terms.join(' : ');
const compact = (terms: readonly number[]): string => simplest(terms).join(':');

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 4;
  const choiceMode = ((seed >>> 2) + (index >>> 2)) % 2 === 0;
  let givens: string[];
  let raw: number[];
  let steps: NonNullable<Question['workedSteps']>;

  if (variant === 0) {
    const [n, d] = rng.pick(FRACTIONS);
    const [u, v] = rng.pick(FRACTIONS);
    givens = [
      `A's mass is ${n}/${d} of B's mass.`,
      `C's mass is ${u}/${v} of A's mass.`,
    ];
    raw = [n * v, d * v, n * u];
    steps = [
      { text: 'Turn the first fraction into a comparison of A and B.', equation: `A : B = ${n} : ${d}` },
      { text: 'Turn the second fraction into a comparison of A and C. Keep A first.', equation: `A : C = ${v} : ${u}` },
      {
        text: `Multiply the A-and-B ratio by ${v} and the A-and-C ratio by ${n}. A now has the same number of units in both.`,
        equation: `A : B = ${n * v} : ${d * v}; A : C = ${n * v} : ${n * u}`,
      },
    ];
  } else if (variant === 1) {
    const [a, b] = rng.pick(PAIRS);
    const [c, d] = rng.pick(PAIRS.filter(pair => pair[0] !== b));
    givens = [
      `A's mass : B's mass = ${a} : ${b}.`,
      `B's mass : C's mass = ${c} : ${d}.`,
    ];
    raw = [a * c, b * c, b * d];
    steps = [
      { text: 'B is the quantity shared by the two ratios.', equation: `A : B = ${a} : ${b}; B : C = ${c} : ${d}` },
      {
        text: `Multiply the first ratio by ${c} and the second by ${b}. Both now give B ${b * c} units.`,
        equation: `A : B = ${a * c} : ${b * c}; B : C = ${b * c} : ${b * d}`,
      },
    ];
  } else if (variant === 2) {
    const [a, b] = rng.pick(PAIRS);
    const [n, d] = rng.pick(FRACTIONS);
    givens = [
      `A's mass : B's mass = ${a} : ${b}.`,
      `C's mass is ${n}/${d} of B's mass.`,
    ];
    raw = [a * d, b * d, b * n];
    steps = [
      { text: 'Use the fraction to compare B with C.', equation: `B : C = ${d} : ${n}` },
      {
        text: `Multiply A : B by ${d} and B : C by ${b}. This gives B the same number of units in both ratios.`,
        equation: `A : B = ${a * d} : ${b * d}; B : C = ${b * d} : ${b * n}`,
      },
    ];
  } else {
    const parts = rng.pick([3, 4, 6]);
    const [n, d] = rng.pick(FRACTIONS);
    const multiple = rng.pick([3, 4]);
    const aUnits = parts * n;
    givens = [
      `1/${parts} of A's mass equals ${n}/${d} of B's mass.`,
      `A's mass is ${multiple} times C's mass.`,
    ];
    raw = [aUnits * multiple, d * multiple, aUnits];
    steps = [
      {
        text: `Multiply both equal amounts by ${parts}. All of A's mass equals ${parts} times ${n}/${d} of B's mass.`,
        equation: `A : B = ${parts} × ${n} : ${d} = ${aUnits} : ${d}`,
      },
      { text: 'The whole-number multiplier gives the comparison of A with C.', equation: `A : C = ${multiple} : 1` },
      {
        text: `Multiply A : B by ${multiple} and A : C by ${aUnits}. The two A terms now match.`,
        equation: `A : B = ${aUnits * multiple} : ${d * multiple}; A : C = ${aUnits * multiple} : ${aUnits}`,
      },
    ];
  }

  const reduced = simplest(raw);
  const divisor = raw[0] / reduced[0];
  steps.push({
    text: 'Combine the comparisons using the matching quantity.',
    equation: `A : B : C = ${show(raw)}`,
  });
  steps.push({
    text: divisor === 1
      ? 'No whole number greater than 1 divides all three terms, so this ratio is already in simplest form.'
      : `Divide all three terms by their greatest common factor, ${divisor}.`,
    equation: `A : B : C = ${show(reduced)}`,
  });

  const order = rng.shuffle<Label>(['A', 'B', 'C']);
  const values: Record<Label, number> = { A: reduced[0], B: reduced[1], C: reduced[2] };
  const ordered = order.map(label => values[label]);
  steps.push({
    text: `Write the terms in the requested order: ${order.join(', ')}.`,
    equation: `${order.join(' : ')} = ${show(ordered)}`,
  });

  const base = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: ['A delivery has three parcels labelled A, B and C.', ...givens],
    prompt: `What is the ratio ${order.join(' : ')} of the parcels' masses in simplest form?`,
    hint: 'Find the quantity shared by the two comparisons. Give it the same number of units in both, then combine the three terms.',
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
  };

  if (choiceMode) {
    const [x, y, z] = ordered;
    const answer = ordered.join(':');
    const alternatives = [
      [y, x, z], [x, z, y],
      [x + 1, y, z], [x, y + 1, z], [x, y, z + 1],
    ];
    const wrong = [...new Set(alternatives.map(compact))]
      .filter(value => value !== answer)
      .slice(0, 3);
    return {
      ...base,
      answer,
      choices: rng.shuffle([answer, ...wrong]),
    };
  }

  return {
    ...base,
    prompt: `${base.prompt} Write one whole-number term in each box.`,
    answer: JSON.stringify(ordered.map(String)),
    structuredResponse: {
      kind: 'number-fields',
      fields: order.map(label => ({ label: `${label}'s ratio term` })),
    },
  };
}
