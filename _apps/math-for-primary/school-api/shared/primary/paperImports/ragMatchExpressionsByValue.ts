import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p2-match-expressions-by-value',
  level: 2 as const,
  title: 'Which totals match?',
  objective: 'Compare the values of calculations and equal groups to find a match or a different total.',
  skillIds: ['P2.S.MD.01', 'P2.S.MD.02'],
  canonicalPatternId: 'match-expressions-by-value',
};

type Expression = { text: string; value: number; calculation?: string };

function product(a: number, b: number): Expression {
  return { text: `${a} × ${b}`, value: a * b };
}

function group(count: number, size: number): Expression {
  return { text: `${count} groups of ${size}`, value: count * size, calculation: `${count} × ${size}` };
}

function repeated(count: number, size: number, sign: '+' | '×' = '+'): Expression {
  return {
    text: Array(count).fill(size).join(` ${sign} `),
    value: sign === '+' ? count * size : size ** count,
  };
}

function division(quotient: number, divisor: number): Expression {
  return { text: `${quotient * divisor} ÷ ${divisor}`, value: quotient };
}

function evaluation(form: Expression, text: string) {
  return { text, equation: `${form.calculation ?? form.text} = ${form.value}` };
}

const labels = ['A', 'B', 'C', 'D'];
const triple = (names: string[]) => `${names[0]}, ${names[1]} and ${names[2]}`;

function matchingCards(r: Rng, key: string): Question {
  const [count, size] = r.pick([[2, 3], [2, 5], [3, 2], [3, 5], [4, 3], [4, 5], [5, 2], [5, 3], [6, 4], [6, 5]]);
  const target = count * size;
  const otherForms = [group(count + 1, size), repeated(count + 1, size), product(size, count - 1)];
  // Use the sum-versus-product distractor only when every multiplication is a small table fact.
  if (count === 2 || (count === 3 && size * size <= 10)) {
    otherForms.push(repeated(count, size, '×'));
  }
  const cards = r.shuffle([product(size, count), repeated(count, size), group(count, size), r.pick(otherForms)]);
  const matchingLabels = labels.filter((_, i) => cards[i].value === target);
  const answer = triple(matchingLabels);
  const explanation = `Cards ${answer} each give ${target}. Card ${labels[cards.findIndex(card => card.value !== target)]} gives a different total.`;
  return {
    key,
    prompt: 'Which three cards give the same answer?',
    context: cards.map((card, i) => `Card ${labels[i]}: ${card.text}`),
    choices: r.shuffle(labels.map(omit => triple(labels.filter(label => label !== omit)))),
    answer,
    hint: 'For a sum, count how many times the number is added. Check the signs on each card.',
    explanation,
    workedSteps: [...cards.map((card, i) => evaluation(card, `Work out card ${labels[i]}.`)), { text: explanation }],
  };
}

const factors = Array.from({ length: 9 }, (_, i) => i + 2);
const tables = [2, 3, 4, 5, 10];
const plans = factors.flatMap(count => factors
  .filter(size => tables.includes(count) || tables.includes(size))
  .map(size => group(count, size)));

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) % 4 + 4) % 4;
  if (variant === 0) return matchingCards(r, key);

  const different = variant !== 1;
  let target: number;
  let display: string;
  let prompt: string;
  let hint: string;
  let forms: Expression[];
  let firstStep: NonNullable<Question['workedSteps']>[number];
  if (variant === 3) {
    const [a, b] = r.pick([[2, 2], [2, 3], [3, 2], [3, 3], [2, 5], [5, 2]]);
    const reference = product(a, b);
    target = reference.value;
    display = reference.text;
    const divisor = r.pick(tables);
    const other = r.pick([repeated(b + 1, a), division(target - 1, divisor), group(a + 1, b)]);
    forms = [repeated(a, b), a === b ? group(b, a) : repeated(b, a), division(target, divisor), other];
    prompt = 'Which choice gives a different answer from this multiplication?';
    hint = 'Work out the multiplication first. Compare each choice with that number.';
    firstStep = evaluation(reference, 'Find the number to compare with.');
  } else {
    // Each total has at least three distinct group descriptions within the P2 tables.
    target = r.pick([16, 18, 20, 24, 30, 40]);
    display = `${target} beads`;
    const matches = r.shuffle(plans.filter(plan => plan.value === target));
    const nearby = r.shuffle(plans.filter(plan => plan.value !== target && Math.abs(plan.value - target) <= 10));
    const otherTotals = [...new Map(nearby.map(plan => [plan.value, plan] as const)).values()];
    forms = different ? [...matches.slice(0, 3), otherTotals[0]] : [matches[0], ...otherTotals.slice(0, 3)];
    prompt = different ? 'Which plan uses a different number of beads?' : 'Which plan uses exactly this many beads?';
    hint = 'Multiply the number of groups by the number of beads in each group.';
    firstStep = { text: `Check each plan against ${target} beads. Count the beads in every group.` };
  }

  const options = r.shuffle(forms);
  const winners = options.filter(form => different ? form.value !== target : form.value === target);
  if (options.length !== 4 || winners.length !== 1) throw new Error('Expected four plans or expressions with one answer.');
  const [winner] = winners;
  const explanation = different
    ? `${winner.text} gives ${winner.value}. The other three choices each give ${target}.`
    : `Only ${winner.text} uses exactly ${target} beads.`;
  return {
    key, prompt, display, hint, explanation,
    choices: options.map(form => form.text),
    answer: winner.text,
    workedSteps: [firstStep, ...options.map(form => evaluation(form, `Check ${form.text}.`)), { text: explanation }],
  };
}
