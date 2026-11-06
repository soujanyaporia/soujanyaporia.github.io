import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-fraction-equivalence-to-target',
  level: 4 as const,
  title: 'Fractions that match a given value',
  objective: 'Scale both parts of a fraction to decide which choices have the target value.',
  skillIds: ['P3.S.FRAC.01', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p4-fraction-equivalence-to-target',
};

const targets: [number, number][] = [
  [1, 3], [3, 4], [1, 5], [2, 5], [4, 5], [1, 6], [5, 6],
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const selectBoth = (seed + index) % 2 === 0;
  const [numerator, denominator] = rng.pick(targets);
  const targetFactor = selectBoth ? rng.pick([1, 2]) : 1;
  const simplest = `${numerator}/${denominator}`;
  const target = `${numerator * targetFactor}/${denominator * targetFactor}`;

  // Use four distinct denominators, each different from the displayed target's.
  const factors = rng.shuffle([2, 3, 4, 5, 6].filter(k => k !== targetFactor)).slice(0, 4);
  const nearbyNumerator = rng.pick([numerator - 1, numerator + 1].filter(n => n > 0 && n < denominator));
  const rows = factors.map((factor, position) => {
    const bottom = denominator * factor;
    const expected = numerator * factor;
    let top = expected;
    if (selectBoth && position >= 2) top = nearbyNumerator * factor;
    if (!selectBoth && position === 3) top += rng.pick([-1, 1]);
    return { factor, bottom, expected, top, label: `${top}/${bottom}` };
  });
  const ordered = rng.shuffle(rows);
  const options = ordered.map(row => row.label);
  const selected = ordered
    .filter(row => selectBoth ? row.top === row.expected : row.top !== row.expected)
    .map(row => row.label);

  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (targetFactor > 1) {
    workedSteps.push({
      text: `Divide the top and bottom of ${target} by ${targetFactor}.`,
      equation: `${target} = ${simplest}`,
    });
  }
  for (const row of ordered) {
    const equivalent = `${row.expected}/${row.bottom}`;
    workedSteps.push({
      text: `To check ${row.label}, multiply the top and bottom of ${simplest} by ${row.factor}.`,
      equation: row.top === row.expected
        ? `${simplest} = ${row.label}`
        : `${simplest} = ${equivalent} ≠ ${row.label}`,
    });
  }
  workedSteps.push({ text: selectBoth
    ? `${selected.join(' and ')} both have the same value as ${target}.`
    : `Only ${selected[0]} has a different value from ${target}.`,
  });

  return {
    key,
    prompt: selectBoth
      ? 'Choose both fractions that have the same value as the fraction shown.'
      : 'Choose the one fraction that has a different value from the fraction shown.',
    display: target,
    ...(selectBoth
      ? { structuredResponse: { kind: 'named-pair' as const, options }, answer: JSON.stringify(selected) }
      : { choices: options, answer: selected[0] }),
    hint: 'Start with the fraction shown in simplest form. For each choice, find the number that multiplies the bottom number. Try the same multiplier on the top number.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
