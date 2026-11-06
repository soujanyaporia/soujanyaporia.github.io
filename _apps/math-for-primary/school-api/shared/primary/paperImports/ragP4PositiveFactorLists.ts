import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-positive-factor-lists',
  level: 4,
  title: 'Find every factor',
  objective: 'Use multiplication pairs to find all the positive factors of a number and count each factor once.',
  skillIds: ['P4.S.FACT.01'],
  canonicalPatternId: 'p4-positive-factor-lists',
};

function factorCard(n: number) {
  const pairs: [number, number][] = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) pairs.push([d, n / d]);
  }
  const factors = [...new Set(pairs.flat())].sort((a, b) => a - b);
  return { n, pairs, factors };
}

const cards = [12, 14, 16, 20, 21, 23, 25, 27, 28, 30, 32, 36, 40, 42, 44, 49, 50, 54, 60, 63, 64, 72, 75, 81, 90, 96, 98, 100].map(factorCard);
const sixFactors = cards.filter(c => c.factors.length === 6);
const fitsList = cards.filter(c => c.factors.length <= 6);
const modes = ['missing', 'list', 'missing', 'sum', 'missing', 'pair', 'sum', 'list'] as const;
const positions = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
const pairText = (a: number, b: number) => `${Math.min(a, b)} and ${Math.max(a, b)}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = modes[((hashString(String(seed)) + index) >>> 0) % modes.length];
  const { n, pairs, factors } = r.pick(mode === 'sum' ? cards : mode === 'list' ? fitsList : sixFactors);
  const next = Math.floor(Math.sqrt(n)) + 1;
  const square = pairs.find(([a, b]) => a === b);
  const steps: NonNullable<Question['workedSteps']> = [
    { text: `Try 1 to ${next - 1} as the smaller number in each multiplication pair. Two numbers that are both ${next} or more would give a product greater than ${n}.` },
    { text: `These pairs make ${n}.`, equation: pairs.map(([a, b]) => `${a} × ${b} = ${n}`).join('; ') },
    { text: `${square ? `In ${square[0]} × ${square[0]}, list ${square[0]} only once. ` : ''}The factors in order are ${factors.join(', ')}.` },
  ];
  const finish = (prompt: string, answer: string, extra: Partial<Question> = {}): Question => ({
    key, prompt, answer, workedSteps: steps,
    hint: `Start with 1 × ${n}. Try 2, then 3, and keep the pairs that multiply to ${n}.`,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (mode === 'sum') {
    const sum = factors.reduce((a, b) => a + b, 0);
    steps.push({ text: 'Add each factor once.', equation: `${factors.join(' + ')} = ${sum}` });
    return finish(`What is the sum of all the positive factors of ${n}?`, String(sum));
  }
  if (mode === 'list') {
    return finish(`Write all the positive factors of ${n} in order, from smallest to largest.`, JSON.stringify(factors.map(String)), {
      structuredResponse: { kind: 'number-fields', fields: factors.map((_, i) => ({ label: `${positions[i]} factor` })) },
    });
  }

  const [a, b] = r.shuffle(factors.slice(1, -1)).slice(0, 2).sort((x, y) => x - y);
  const given = factors.filter(f => f !== a && f !== b);
  const context = [`Factors already listed: ${given.join(', ')}.`];
  steps.push({ text: `Cross out ${given.join(', ')} from the complete list. That leaves ${a} and ${b}.` });
  if (mode === 'missing') {
    return finish(`Which two factors of ${n} are missing from the list? Write the smaller one first.`, JSON.stringify([String(a), String(b)]), {
      context, structuredResponse: { kind: 'number-pair', firstLabel: 'Smaller factor', secondLabel: 'Larger factor' },
    });
  }

  const known = r.pick(given.filter(f => f !== 1 && f !== n));
  const [x, y] = r.shuffle(Array.from({ length: n - 2 }, (_, i) => i + 2).filter(v => n % v !== 0));
  const right = pairText(a, b);
  return finish(`Which pair gives two factors of ${n} that are not on the list?`, right, {
    context, choices: r.shuffle([right, pairText(a, known), pairText(b, x), pairText(x, y)]),
  });
}
