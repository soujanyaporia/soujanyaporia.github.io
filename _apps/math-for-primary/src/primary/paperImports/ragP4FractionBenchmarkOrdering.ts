import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p4-fraction-benchmark-selection-and-ordering',
  level: 4,
  title: 'Compare and order fractions',
  objective: 'Select fractions above or below a given value and order three numbers using equal-sized parts.',
  skillIds: ['P3.S.FRAC.03', 'P4.S.FRAC.02'],
  canonicalPatternId: 'p4-fraction-benchmark-selection-and-ordering',
};

type Card = { label: string; parts: number };
type Fraction = Card & { n: number; d: number };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// One card per value. All cards count parts of the same size.
function properFractions(scale: number): Fraction[] {
  const pool: Fraction[] = [];
  for (let parts = 1; parts < scale; parts++) {
    const factor = gcd(parts, scale);
    const n = parts / factor;
    const d = scale / factor;
    if (d <= 12) pool.push({ n, d, parts, label: `${n}/${d}` });
  }
  return pool;
}

function equivalents(cards: Card[], scale: number): string {
  return cards.map(c => `${c.label} = ${c.parts}/${scale}`).join(', ');
}

function benchmarkQuestion(key: string, rng: Rng, pool: Fraction[], scale: number, above: boolean): Question {
  const d = above ? rng.pick([2, 3]) : 2;
  const n = rng.int(1, d - 1);
  const mark = n * scale / d;
  const benchmark = `${n}/${d}`;
  const factor = rng.pick([2, 3, 4, 5, 6].filter(k => k * d <= 12 && scale % (k * d) === 0));
  const equal = { label: `${n * factor}/${d * factor}`, parts: mark };
  const lower = rng.shuffle(pool.filter(c => c.parts < mark)).slice(0, 2);
  const higher = rng.pick(pool.filter(c => c.parts > mark));
  const cards = rng.shuffle([...lower, equal, higher]);
  const options = cards.map(c => c.label);
  const selected = cards.filter(c => above ? c.parts > mark : c.parts < mark);
  const names = selected.map(c => c.label);
  const relation = above ? '>' : '<';
  return {
    key,
    prompt: above ? `Which fraction is greater than ${benchmark}?` : `Pick the two fractions that are less than ${benchmark}.`,
    ...(above ? { choices: options } : { structuredResponse: { kind: 'named-pair' as const, options } }),
    answer: above ? names[0] : JSON.stringify(names),
    hint: `Try writing each fraction with ${scale} as its denominator. Then compare the numerators.`,
    workedSteps: [
      { text: 'Write the fraction in the question using the common denominator.', equation: `${benchmark} = ${mark}/${scale}` },
      { text: 'Use parts of the same size for each choice.', equation: equivalents(cards, scale) },
      { text: `Leave out ${equal.label} because it equals ${benchmark}.`, equation: selected.map(c => `${c.label} = ${c.parts}/${scale} ${relation} ${mark}/${scale}`).join(', ') },
    ],
    explanation: `With ${scale} equal parts in a whole, ${benchmark} has ${mark} parts. ${above ? `${names[0]} has more` : `${names.join(' and ')} each have fewer`}.`,
  };
}

function orderingQuestion(key: string, rng: Rng, pool: Fraction[], scale: number, mixed: boolean): Question {
  let cards: Card[];
  const steps: NonNullable<Question['workedSteps']> = [];
  if (mixed) {
    const whole = rng.int(1, 3);
    const tail = rng.pick(pool);
    const otherTail = rng.pick(pool.filter(c => c.d !== tail.d));
    const proper = rng.pick(pool);
    const top = whole * tail.d + tail.n;
    const improper = { label: `${top}/${tail.d}`, parts: whole * scale + tail.parts };
    const mixedNumber = { label: `${whole} ${otherTail.label}`, parts: whole * scale + otherTail.parts };
    cards = [proper, improper, mixedNumber];
    steps.push(
      { text: `Find how many wholes are in ${improper.label}.`, equation: `${top} = ${whole} × ${tail.d} + ${tail.n}, so ${improper.label} = ${whole} ${tail.label}` },
      { text: `${proper.label} is less than 1, so it comes first. The other two numbers have the same whole part. Compare their fractional parts.`, equation: equivalents([tail, otherTail], scale) },
    );
  } else {
    const first = rng.pick(pool.filter(a => a.n > 1 && pool.some(b => a.n === b.n && a.d !== b.d)));
    const second = rng.pick(pool.filter(b => b.n === first.n && b.d !== first.d));
    const unitFraction = rng.pick(pool.filter(c => c.n === 1 && c.d !== first.d && c.d !== second.d));
    cards = [first, second, unitFraction];
    steps.push({ text: 'Write all three fractions with the same denominator.', equation: equivalents(cards, scale) });
  }
  const ranked = [...cards].sort((a, b) => mixed ? a.parts - b.parts : b.parts - a.parts);
  const labels = ranked.map(c => c.label);
  const answer = labels.join(',');
  const order = rng.shuffle(cards.map(c => c.label));
  if (order.join(',') === answer) [order[0], order[1]] = [order[1], order[0]];
  const chain = labels.join(mixed ? ' < ' : ' > ');
  steps.push({ text: mixed ? 'Put the original numbers in order, smallest first.' : 'More equal-sized parts make a larger fraction. Start with the largest.', equation: chain });
  return {
    key,
    prompt: mixed ? 'Place the three numbers in order from smallest to largest.' : 'Place the three fractions in order from largest to smallest.',
    order,
    answer,
    hint: mixed ? 'Count the wholes first. If two whole parts match, compare the parts left over.' : `Use ${scale} as a common denominator. Which fraction has the most parts?`,
    workedSteps: steps,
    explanation: mixed ? `Compare the whole parts first, then the parts left over. This gives ${chain}.` : `With denominator ${scale}, the numerators are ordered ${ranked.map(c => c.parts).join(' > ')}, so ${chain}.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;
  const scale = rng.pick([12, 18, 24, 30, 36]);
  const pool = properFractions(scale);
  if (variant === 0 || variant === 2) return benchmarkQuestion(key, rng, pool, scale, variant === 2);
  return orderingQuestion(key, rng, pool, scale, variant === 3);
}
