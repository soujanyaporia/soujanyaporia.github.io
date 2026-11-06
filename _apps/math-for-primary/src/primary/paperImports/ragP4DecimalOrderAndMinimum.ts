import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-decimal-order-and-minimum',
  level: 4,
  title: 'Put decimals in order',
  objective: 'Use place value to order numbers or find the smallest one. Write a fraction as a decimal when it helps.',
  skillIds: ['P4.S.DEC.02', 'P4.S.DEC.03'],
  canonicalPatternId: 'p4-decimal-order-and-minimum',
};

type Form = 'ascending' | 'mixed' | 'descending' | 'minimum';
type Card = { label: string; thousandths: number };

function decimal(thousandths: number): Card {
  return { label: String(thousandths / 1000), thousandths };
}

function makeCards(r: Rng, form: Form): Card[] {
  if (form === 'mixed') {
    const [n, d] = r.pick([[1, 4], [3, 4], [2, 5], [3, 5], [7, 20], [9, 20], [8, 25], [13, 25]]);
    const centre = n * (1000 / d);
    const close = r.pick([-1, 1]) * r.int(1, 8);
    const farther = r.pick([-1, 1]) * (10 * r.int(3, 8) + r.int(1, 9));
    return [{ label: `${n}/${d}`, thousandths: centre }, decimal(centre + close), decimal(centre + farther)];
  }

  const whole = r.int(2, 6);
  const tenth = whole * 1000 + r.int(2, 8) * 100;
  const hundredth = tenth + r.pick([-1, 1]) * 10 * r.int(1, 5);
  if (form === 'descending') {
    const lowerBase = r.int(0, whole - 1) * 1000;
    const a = r.int(2, 5);
    const b = r.int(a + 1, 8);
    return [tenth, hundredth, lowerBase + 100 * a + 10 * b, lowerBase + 100 * b + 10 * a].map(decimal);
  }

  const neighbour = r.pick([tenth, hundredth]);
  const sign = r.pick([-1, 1]);
  const values = [tenth, hundredth, neighbour + sign * r.int(1, 9)];
  if (form === 'minimum') values.push(neighbour - sign * r.int(1, 9));
  return values.map(decimal);
}

function swapNeighbours(labels: string[], at: number): string[] {
  const result = [...labels];
  [result[at], result[at + 1]] = [result[at + 1], result[at]];
  return result;
}

function aligned(card: Card): string {
  return (card.thousandths / 1000).toFixed(3);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick<Form>(['ascending', 'ascending', 'mixed', 'descending', 'minimum']);
  const cards = makeCards(r, form);
  const sorted = [...cards].sort((a, b) => a.thousandths - b.thousandths);
  const ascending = sorted.map(card => card.label);
  const descending = [...ascending].reverse();
  let shown = r.shuffle(cards.map(card => card.label));
  if ([ascending.join(','), descending.join(',')].includes(shown.join(','))) shown = swapNeighbours(shown, 0);

  const workedSteps: NonNullable<Question['workedSteps']> = [];
  const fraction = cards.find(card => card.label.includes('/'));
  if (fraction) {
    workedSteps.push({
      text: 'Write the fraction in hundredths so you can compare it with the decimals.',
      equation: `${fraction.label} = ${fraction.thousandths / 10}/100 = ${aligned(fraction)}`,
    });
  }
  workedSteps.push({ text: 'Line up the decimal points. Zeros at the end of a decimal keep its value the same.' });
  const places = ['ones', 'tenths', 'hundredths', 'thousandths'];
  for (let i = 1; i < sorted.length; i++) {
    const left = aligned(sorted[i - 1]);
    const right = aligned(sorted[i]);
    const a = left.replace('.', '');
    const b = right.replace('.', '');
    const first = [...a].findIndex((digit, place) => digit !== b[place]);
    workedSteps.push({
      text: `The first different digits are in the ${places[first]} place. ${a[first]} is smaller than ${b[first]}.`,
      equation: `${left} < ${right}`,
    });
  }
  const labels = form === 'descending' ? descending : ascending;
  const conclusion = form === 'minimum' ? `${ascending[0]} is the smallest.` : labels.join(form === 'descending' ? ' > ' : ' < ');
  workedSteps.push({ text: conclusion });
  const base = {
    key,
    workedSteps,
    hint: (fraction ? 'Write the fraction as a decimal first. ' : '') + 'Start at the ones place. If the digits match, move one place to the right. Use a zero for an empty decimal place.',
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
  if (form === 'mixed') {
    return { ...base, prompt: 'Put the three numbers in order, starting with the smallest.', order: shown, answer: labels.join(',') };
  }
  if (form === 'minimum') {
    return { ...base, prompt: 'Which number has the smallest value?', choices: shown, answer: ascending[0] };
  }
  const rows = [labels, [...labels].reverse(), swapNeighbours(labels, 0), swapNeighbours(labels, labels.length - 2)];
  return {
    ...base,
    prompt: form === 'descending' ? 'Which row lists the numbers from largest to smallest?' : 'Which row lists the numbers from smallest to largest?',
    display: shown.join(', '),
    choices: r.shuffle(rows.map(row => row.join(', '))),
    answer: labels.join(', '),
  };
}
