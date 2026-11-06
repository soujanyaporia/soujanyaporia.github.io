import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-odd-even-candidates',
  level: 2,
  title: 'Choose and count odd numbers',
  objective: 'Use the ones digit to find odd numbers, then check their size, compare them or count them within a range.',
  skillIds: ['P2.S.WN.06', 'P2.S.WN.04', 'P2.S.WN.01'],
  canonicalPatternId: 'p2-odd-and-even-candidates',
};

const oddNumbers = Array.from({ length: 450 }, (_, i) => 101 + 2 * i);
const evenNumbers = Array.from({ length: 450 }, (_, i) => 100 + 2 * i);
const shortOdds = Array.from({ length: 45 }, (_, i) => 11 + 2 * i);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = (Math.trunc(seed) % 4 + Math.trunc(index) % 4 + 8) % 4;
  function question(prompt: string, answer: string, hint: string, steps: string[], choices?: string[]): Question {
    return { key, prompt, answer, hint, workedSteps: steps.map(text => ({ text })),
      explanation: steps.join(' '), ...(choices ? { choices: r.shuffle(choices) } : {}) };
  }

  if (variant === 0) {
    const bound = r.pick([200, 400, 500, 600, 700, 800]);
    const above = bound + 2 * r.int(0, 74) + 1;
    const even = bound + 2 * r.int(1, 75);
    const near = bound - (2 * r.int(0, 14) + 1);
    const far = bound - (2 * r.int(15, 49) + 1);
    return question(`I am odd and greater than ${bound}. Which number am I?`, String(above),
      'First find the numbers above the given number. Then check their ones digits.', [
        `Only ${above} and ${even} are greater than ${bound}.`,
        `${even} ends in ${even % 10}, so it is even. ${above} ends in ${above % 10}, so it is odd. Choose ${above}.`,
      ], [above, even, near, far].map(String));
  }

  if (variant === 1) {
    const [a, b, c, d] = r.shuffle([...oddNumbers]);
    const [x, y, z] = r.shuffle([...shortOdds]);
    const even = r.pick(evenNumbers);
    const pair = (u: number, v: number) => r.shuffle([u, v]).join(' and ');
    const answer = `${a} and ${b}`;
    const mixed = pair(c, even);
    return question('Pick the pair where both numbers are odd and both have three digits.', answer,
      'Check both numbers in each pair. Does each one have three digits and an odd ones digit?', [
        `Leave out pairs with a two-digit number. The pairs left are ${answer}, and ${mixed}.`,
        `${even} ends in ${even % 10}, so its pair cannot be right.`,
        `${a} ends in ${a % 10} and ${b} ends in ${b % 10}. Both are odd, so choose ${answer}.`,
      ], [answer, mixed, pair(x, y), pair(d, z)]);
  }

  if (variant === 2) {
    const [small, large] = r.shuffle([...oddNumbers]).slice(0, 2).sort((a, b) => a - b);
    const lowerEven = 2 * r.int(50, (small - 1) / 2);
    const otherEven = r.pick(evenNumbers.filter(n => n !== lowerEven));
    return question('Find the odd numbers in the list. Which of them is the smallest?', String(small),
      'Look at the ones digits before comparing sizes.', [
        `${small} ends in ${small % 10} and ${large} ends in ${large % 10}. These are the two odd numbers.`,
        `${small} < ${large}, so ${small} is the smaller odd number. ${lowerEven} is smaller still, but it is even.`,
      ], [small, large, lowerEven, otherEven].map(String));
  }

  const low = r.int(100, 970);
  const high = low + r.int(6, 17);
  const first = low + (low % 2 === 0 ? 1 : 2);
  const odds: number[] = [];
  for (let n = first; n < high; n += 2) odds.push(n);
  return question(`How many odd numbers are between ${low} and ${high}? Do not count either end.`, String(odds.length),
    'Start with the first odd number after the lower end. Count in twos and stop before the upper end.', [
      `The first odd number after ${low} is ${first}.`,
      `Count in twos, stopping before ${high}: ${odds.join(', ')}.`,
      `There are ${odds.length} numbers in the list.`,
    ]);
}
