import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p4-nonfactor-factor-claims',
  level: 4,
  title: 'Check which numbers are not factors',
  objective: 'Test factor claims by division and use the remainder to identify nonfactors.',
  skillIds: ['P4.S.FACT.01'],
  canonicalPatternId: 'p4-nonfactor-factor-claims',
};

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const permute = <T,>(items: T[], shift: number): T[] =>
  items.map((_, i) => items[(i + shift) % items.length]);

export function makeRagQuestion(seed: number, index = 0): Question {
  const selector = Math.abs(Math.trunc(seed + index)) % 3;
  const number = [36, 48, 60][selector];
  const divisors = Array.from({ length: number - 1 }, (_, i) => i + 2)
    .filter(n => number % n === 0);
  const nonfactors = Array.from({ length: 13 }, (_, i) => i + 2)
    .filter(n => number % n !== 0);
  const shift = Math.abs(Math.trunc(seed * 3 + index)) % 4;

  if (selector === 2) {
    const pair = nonfactors.slice(shift, shift + 2);
    const candidates = [
      [divisors[0], divisors[1]],
      [divisors[2], nonfactors[(shift + 2) % nonfactors.length]],
      pair,
      [nonfactors[(shift + 3) % nonfactors.length], divisors[3]],
    ];
    const choices = permute(candidates, shift).map(([a, b]) => `${a} and ${b}`);
    const answer = `${pair[0]} and ${pair[1]}`;
    const steps = pair.map(n => `${number} ÷ ${n} = ${Math.floor(number / n)} remainder ${number % n}`);
    return {
      key: `${RAG_PATTERN.id}:${seed}:${index}`,
      prompt: `Which pair has two numbers that are not factors of ${number}?`,
      choices,
      answer,
      hint: 'Divide each number by the stated number. A factor leaves no remainder.',
      explanation: `${steps.join('; ')}. Both divisions have remainders, so both numbers are not factors.`,
      workedSteps: steps.map((equation, i) => ({ text: `Check ${pair[i]} by division.`, equation })),
    };
  }

  const nonfactor = nonfactors[shift];
  const candidates = [nonfactor, ...divisors.slice(0, 3)];
  const choices = permute(candidates, shift).map(String);
  const equation = `${number} ÷ ${nonfactor} = ${Math.floor(number / nonfactor)} remainder ${number % nonfactor}`;
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `Which number is not a factor of ${number}?`,
    choices,
    answer: String(nonfactor),
    hint: 'Divide each choice by the stated number. A factor leaves no remainder.',
    explanation: `${equation}. The remainder shows that ${nonfactor} is not a factor.`,
    workedSteps: [{ text: 'Check the number that leaves a remainder.', equation }],
  };
}
