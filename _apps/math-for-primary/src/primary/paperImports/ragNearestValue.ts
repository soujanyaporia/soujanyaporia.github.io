import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-nearest-value',
  level: 5,
  title: 'Find the nearest number',
  objective: 'Compare fractional distances from a whole-number target and choose the nearest value.',
  skillIds: ['P3.S.FRAC.03', 'P4.S.FRAC.01', 'P5.S.FRAC.04'],
  canonicalPatternId: 'p5-nearest-value',
};

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function formatFraction(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  const whole = Math.floor(n / d);
  const remainder = n % d;
  if (remainder === 0) return String(whole);
  return whole === 0 ? `${remainder}/${d}` : `${whole} ${remainder}/${d}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const target = r.int(0, 1) === 0 ? 1 : r.int(2, 5);
  const denominator = r.pick([8, 10, 12, 18, 20, 24]);
  // Distinct ticks give distinct distances. Reduction keeps every displayed
  // denominator within 12, while all gaps share a manageable denominator.
  const possibleGaps = Array.from({length: denominator - 1}, (_, i) => i + 1)
    .filter(gap => denominator / gcd(gap, denominator) <= 12);
  const selectedGaps = r.shuffle(possibleGaps).slice(0, 4);
  const candidates = selectedGaps.map((gap, position) => {
    const below = position < 2;
    return {
      gap,
      below,
      label: formatFraction(target * denominator + (below ? -gap : gap), denominator),
    };
  });
  const displayed = r.shuffle(candidates);
  const nearest = candidates.reduce((best, item) => item.gap < best.gap ? item : best);
  const ascendingGaps = selectedGaps.slice().sort((a, b) => a - b);
  const workedSteps: NonNullable<Question['workedSteps']> = displayed.map(item => ({
    text: `Find the gap between ${item.label} and ${target}. Subtract the smaller number from the larger.`,
    equation: `${item.below ? `${target} − ${item.label}` : `${item.label} − ${target}`} = ${formatFraction(item.gap, denominator)}`,
  }));
  workedSteps.push({
    text: 'Use a common denominator to put the four gaps in order, from smallest to largest.',
    equation: ascendingGaps.map(gap => `${gap}/${denominator}`).join(' < '),
  });
  workedSteps.push({
    text: `${nearest.label} has the smallest gap, so it is nearest to ${target}.`,
    equation: `Smallest gap = ${formatFraction(nearest.gap, denominator)}`,
  });

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `Choose the number nearest to ${target}.`,
    choices: displayed.map(item => item.label),
    answer: nearest.label,
    hint: `Find the difference between each choice and ${target}. Always subtract the smaller number from the larger, then compare the four gaps.`,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  };
}
