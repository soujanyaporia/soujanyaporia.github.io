import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-round-calculated-counts',
  level: 4,
  title: 'Round a result or find a possible count',
  objective: 'Round an exact sum or product, or choose a count that rounds to a given number.',
  skillIds: ['P4.S.WN.02', 'P4.S.MD.01'],
  canonicalPatternId: 'p4-round-calculated-counts-and-match-rounded-values',
};

const format = (value: number) => value.toLocaleString('en-SG');
const roundTo = (value: number, place: number) => Math.round(value / place) * place;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['match', 'sum', 'double'] as const);

  if (variant === 'match') {
    const place = rng.pick([10, 100, 1000]);
    const target = rng.int(8, 80) * place;
    const half = place / 2;
    const smallest = target - half;
    const largest = target + half - 1;
    const interior = target + rng.pick([-1, 1]) * rng.int(1, half - 1);
    const match = rng.pick([smallest, largest, interior]);
    const extra = rng.pick([smallest - rng.int(2, half), largest + rng.int(2, half)]);
    const counts = rng.shuffle([match, smallest - 1, largest + 1, extra]);
    const explanation = `The whole numbers from ${format(smallest)} through ${format(largest)} round to ${format(target)}. Only ${format(match)} is in that range among the choices.`;
    return {
      key,
      prompt: `Round each choice to the nearest ${format(place)}. Which one gives ${format(target)}?`,
      choices: counts.map(String),
      answer: String(match),
      hint: 'Try rounding each number. When a number is halfway between two multiples, round up.',
      workedSteps: [
        ...counts.map(count => ({ text: `Round ${format(count)} to the nearest ${format(place)}.`, equation: `${format(count)} → ${format(roundTo(count, place))}` })),
        { text: `Choose ${format(match)} because it rounds to ${format(target)}.` },
      ],
      explanation,
    };
  }

  const double = variant === 'double';
  const place = double ? 1000 : rng.pick([10, 1000]);
  const lowerMultiple = place === 10 ? rng.int(84, 96) : double ? rng.int(12, 18) : rng.int(32, 64);
  const lower = lowerMultiple * place;
  const upper = lower + place;
  const halfway = lower + place / 2;
  // A doubled whole number must be even. Sample both sides of halfway as well as halfway itself.
  const stride = double ? 2 : 1;
  const offset = rng.pick([place / 2 - stride, place / 2, place / 2 + stride, stride * rng.int(1, place / stride - 1)]);
  const exact = lower + offset;
  const second = double ? 2 : place === 10 ? rng.int(321, 397) : rng.int(1300, 3970);
  const first = double ? exact / 2 : exact - second;
  const rounded = roundTo(exact, place);

  let task: Pick<Question, 'prompt' | 'context' | 'display' | 'unit' | 'choices'>;
  if (double) {
    task = {
      context: [`A printer made ${format(first)} leaflets on Monday. On Tuesday it made twice as many leaflets as on Monday.`],
      prompt: 'How many leaflets did the printer make on Tuesday? Choose the count rounded to the nearest 1,000.',
      unit: 'leaflets',
      choices: rng.shuffle([lower, upper, exact, first].map(String)),
    };
  } else if (place === 10) {
    task = { display: `${format(first)} + ${format(second)}`, prompt: 'Add the two numbers. Give the total to the nearest 10.' };
  } else {
    task = {
      context: [`A shop had ${format(first)} beads. A delivery brought ${format(second)} more beads.`],
      prompt: 'How many beads does the shop have now? Give the total to the nearest 1,000.',
      unit: 'beads',
    };
  }

  const relation = exact < halfway ? 'below' : exact === halfway ? 'at' : 'above';
  const calculation = `${format(first)} ${double ? '×' : '+'} ${format(second)} = ${format(exact)}`;
  const conclusion = `${format(exact)} is ${relation} the halfway point, so round ${exact < halfway ? 'down' : 'up'} to ${format(rounded)}.`;
  return {
    key,
    ...task,
    answer: String(rounded),
    hint: `Find the exact ${double ? 'count for Tuesday' : 'total'} first. Then look for the nearest multiple of ${format(place)}.`,
    workedSteps: [
      { text: double ? 'Double Monday’s count to find Tuesday’s count.' : 'Add the two amounts to find the exact total.', equation: calculation },
      { text: `The two neighbouring multiples of ${format(place)} are ${format(lower)} and ${format(upper)}. Halfway between them is ${format(halfway)}.` },
      { text: conclusion, equation: `${format(exact)} ≈ ${format(rounded)}` },
    ],
    explanation: `${calculation}. ${conclusion}`,
    proof: { op: 'round', a: { op: double ? '*' : '+', a: first, b: second }, b: place },
  };
}
