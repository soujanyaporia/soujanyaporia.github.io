import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-place-value-differences',
  level: 3,
  title: 'How far apart are the values?',
  objective: 'Read two amounts from their place values and subtract the smaller amount from the larger.',
  skillIds: ['P3.S.WN.01', 'P3.S.AS.01'],
  canonicalPatternId: 'difference-of-place-value-quantities',
};

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const places = ['thousands', 'hundreds', 'tens', 'ones'];
const sizes = [1000, 100, 10, 1];
type Term = { count: number; column: number; note: string };
const value = (t: Term) => t.count * sizes[t.column];
const label = (t: Term) => `${t.count} ${places[t.column]}`;

function numeral(r: Rng, fixed: Record<number, number>): string {
  // Fill other places without introducing a second copy of a named digit.
  const reserved = Object.values(fixed);
  return Array.from({ length: 4 }, (_, i) => fixed[i] ?? r.pick(digits.filter(d =>
    !reserved.includes(d) && (d !== 0 || i === 1 || i === 2)
  ))).join('');
}

function digitTerm(n: string, column: number): Term {
  const count = Number(n[column]);
  return { count, column, note: `In ${n}, the ${count} is in the ${places[column]} place.` };
}

function unitTerm(count: number, column: number): Term {
  return { count, column, note: `Count ${count} groups of ${sizes[column]}.` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = (hashString(String(seed)) % 3 + index % 3 + 6) % 3;
  let first: Term, second: Term, prompt: string;
  if (form === 0) {
    const tens = unitTerm(r.chance(0.5) ? r.int(2, 9) : r.int(21, 69), 2);
    const hundreds = unitTerm(r.int(12, 39), 1);
    [first, second] = r.chance(0.5) ? [tens, hundreds] : [hundreds, tens];
    prompt = `Compare ${label(first)} with ${label(second)}. What is the difference between these amounts?`;
  } else {
    const [i, j] = r.shuffle([0, 1, 2, 3]);
    const [a, b] = r.shuffle(digits.slice(1));
    if (form === 1) {
      const left = numeral(r, { [i]: a });
      const right = numeral(r, { [j]: a });
      first = digitTerm(left, i);
      second = digitTerm(right, j);
      prompt = `Look at the ${a} in ${left} and the ${a} in ${right}. How much do their values differ?`;
    } else {
      const n = numeral(r, { [i]: a, [j]: b });
      first = digitTerm(n, i);
      second = digitTerm(n, j);
      prompt = `In ${n}, look at the digits ${a} and ${b}. What is the difference between their values?`;
    }
  }

  const [large, small] = value(first) > value(second) ? [first, second] : [second, first];
  const high = value(large), low = value(small), gap = high - low;
  const workedSteps = [first, second].map(t => ({
    text: t.note, equation: `${t.count} × ${sizes[t.column]} = ${value(t)}`,
  }));
  workedSteps.push({ text: 'Subtract the smaller value from the larger value.', equation: `${high} − ${low} = ${gap}` });
  return {
    key, prompt, answer: String(gap),
    ...(form === 1 ? { choices: r.shuffle([gap, high, low, high + low].map(String)) } : {}),
    hint: form === 0 ? 'How much is one group worth? Use that to find each amount first.' : 'Find the place of each named digit before you compare its value.',
    workedSteps,
    explanation: workedSteps.map(s => `${s.text} ${s.equation}.`).join(' '),
    proof: { op: '-', a: { op: '*', a: large.count, b: sizes[large.column] }, b: { op: '*', a: small.count, b: sizes[small.column] } },
  };
}
