import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1s-rag-target-difference-pair',
  level: 1,
  title: 'Find two numbers a given distance apart',
  objective: 'Select two numbers whose difference matches a given number.',
  skillIds: ['P1.S.AS.05', 'P1.S.WN.04'],
  canonicalPatternId: 'p1-select-pair-with-target-difference',
};

function smallRow(r: Rng) {
  const values = r.shuffle(Array.from({ length: 11 }, (_, i) => i)).slice(0, 6).sort((a, b) => a - b);
  const pairs = values.flatMap((low, i) => values.slice(i + 1).map(high => ({ low, high, gap: high - low })));
  // At least the distance between the two ends occurs exactly once.
  const unique = pairs.filter(p => pairs.filter(q => q.gap === p.gap).length === 1);
  return { values, ...r.pick(unique) };
}

function twoDigitRow(r: Rng) {
  const gap = r.int(11, 26);
  const low = r.int(10, 99 - gap);
  const high = low + gap;
  const spare = r.pick(Array.from({ length: 90 }, (_, i) => i + 10).filter(n =>
    n !== low && n !== high && Math.abs(n - low) !== gap && Math.abs(n - high) !== gap));
  return { values: r.shuffle([low, high, spare]), low, high, gap };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const { values, low, high, gap } = r.chance(0.5) ? smallRow(r) : twoDigitRow(r);
  const trial = values.find(n => n < low);
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (trial !== undefined) {
    workedSteps.push({ text: `Start at ${trial} and count on ${gap}. There is no ${trial + gap} in the row.`,
      equation: `${trial} + ${gap} = ${trial + gap}` });
  }
  workedSteps.push(
    { text: `Start at ${low} and count on ${gap}. You reach ${high}, which is in the row.`,
      equation: `${low} + ${gap} = ${high}` },
    { text: 'Check the pair by taking the smaller number from the larger number.',
      equation: `${high} − ${low} = ${gap}` },
  );
  return {
    key,
    prompt: `Which two numbers are ${gap} apart? Choose both.`,
    structuredResponse: { kind: 'named-pair', options: values.map(String) },
    answer: JSON.stringify([String(low), String(high)]),
    hint: 'Start with one number. Count on by the given amount. Is the number you reach also there?',
    workedSteps,
    explanation: `${high} is ${gap} more than ${low}. Choose ${low} and ${high}.`,
  };
}
