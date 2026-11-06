import type { Question } from '../generate';
import { Rng, hashString } from '../../engine/random';

export const RAG_PATTERN = {
  id: 'rag-p4-graph-factor-match',
  level: 4,
  title: 'Which reading fits?',
  objective: 'Use a multiplication or division clue to find the matching label or pair of labels on a graph.',
  skillIds: ['P3.S.GRAPH.01', 'P4.S.GRAPH.02', 'P4.S.MD.01', 'P4.S.MD.03'],
  canonicalPatternId: 'p4-graph-factor-match',
};

const modes = ['month', 'half', 'month', 'total', 'month', 'half', 'month', 'pair', 'month', 'half', 'month'] as const;
const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const descending = (a: number, b: number) => b - a;
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + Math.trunc(index)) % modes.length;
  const mode = modes[(slot + modes.length) % modes.length];
  const scale = r.pick([2, 5, 10]);
  const finish = (q: Omit<Question, 'key' | 'explanation' | 'workedSteps'>, steps: Steps): Question => ({
    ...q, key, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (mode === 'half') {
    const firstHour = r.int(10, 13);
    const labels = range(firstHour, firstHour + 5).map(h => String(h * 100));
    const halfTick = r.int(6, 9);
    const halfAt = r.int(2, 4);
    const sample = (lo: number, hi: number, n: number) => r.shuffle(range(lo, hi)).slice(0, n).sort(descending);
    const ticks = [2 * halfTick, ...sample(halfTick + 1, 2 * halfTick - 1, halfAt - 1), halfTick,
      ...sample(1, halfTick - 1, 5 - halfAt)];
    const values = ticks.map(t => t * scale);
    const [capacity] = values, half = capacity / 2, left = values[5];
    const divisor = gcd(left, capacity), n = left / divisor, d = capacity / divisor;
    return finish({
      picture: { type: 'bars', line: true, labels, values, scale },
      context: [`A rain barrel was full at ${labels[0]}. The line graph shows how much water was left each hour.`,
        `Times use the 24-hour clock. Each small step up the graph stands for ${scale} litres.`],
      prompt: `(a) When was the barrel half full? Write the time as four digits. (b) What fraction of the full amount of water remained at ${labels[5]}? Give the fraction in simplest form.`,
      structuredResponse: { kind: 'number-fields', fields: [
        { label: '(a) Time (24-hour clock)' }, { label: '(b) Numerator' }, { label: '(b) Denominator' },
      ] },
      answer: JSON.stringify([labels[halfAt], String(n), String(d)]),
      hint: 'The first point shows the full capacity. Use it to find the halfway mark and as the whole for your fraction.',
    }, [
      { text: `The barrel held ${capacity} litres when it was full. Find half of that amount.`, equation: `${capacity} ÷ 2 = ${half} L` },
      { text: `At ${half} litres, follow the point down to the time axis. It shows ${labels[halfAt]}.` },
      { text: `At ${labels[5]} there were ${left} litres left out of ${capacity}. Divide both numbers in the fraction by ${divisor}.`, equation: `${left}/${capacity} = ${n}/${d}` },
    ]);
  }

  if (mode === 'total') {
    const middle = r.int(6, 12), gap = r.int(1, 4);
    const given = r.shuffle([middle - gap, middle + gap]);
    const core = [...given, middle];
    const rest = r.shuffle(range(1, 20).filter(t => !core.includes(t))).slice(0, 3);
    const ticks = r.shuffle([...core, ...rest]), values = ticks.map(t => t * scale);
    const day = (t: number) => days[ticks.indexOf(t)];
    const [a, b] = given.map(day), answer = day(middle);
    const [x, y] = given.map(t => t * scale), total = x + y;
    return finish({
      picture: { type: 'bars', labels: [...days], values, scale },
      context: [`The graph shows how many badges a stall sold each day. Each small step stands for ${scale} badges.`],
      prompt: `Which day’s sales were half the total for ${a} and ${b}?`,
      choices: days.filter(label => label !== a && label !== b),
      answer, hint: 'Read the two bars named in the question. What is half their combined height?',
    }, [
      { text: `Add the badges sold on ${a} and ${b}.`, equation: `${x} + ${y} = ${total}` },
      { text: 'Find half that many badges.', equation: `${total} ÷ 2 = ${middle * scale}` },
      { text: `The bar for ${answer} shows ${middle * scale} badges.` },
    ]);
  }

  const factor = r.pick([2, 3, 4]), base = r.int(3, 6);
  const chosen = [base, factor * base];
  for (const t of r.shuffle(range(1, 24))) {
    if (chosen.includes(t)) continue;
    // Only the unnamed-pair problem needs uniqueness over every pair of bars.
    if (mode === 'pair' && chosen.some(v => v === factor * t || t === factor * v)) continue;
    chosen.push(t);
    if (chosen.length === months.length) break;
  }
  const ticks = r.shuffle(chosen), values = ticks.map(t => t * scale);
  const ref = months[ticks.indexOf(base)], match = months[ticks.indexOf(factor * base)];
  const x = base * scale, y = x * factor;
  const graph = {
    picture: { type: 'bars' as const, labels: [...months], values, scale },
    context: [`The bars show the number of visitors to a museum each month. Each small step stands for ${scale} visitors.`],
  };
  if (mode === 'pair') {
    const trials = months.filter((_, i) => values[i] * factor <= Math.max(...values));
    return finish({
      ...graph, prompt: `Which two months had visitor counts where one was ${factor} times the other? Select both months.`,
      structuredResponse: { kind: 'named-pair', options: [...months] },
      answer: JSON.stringify([ref, match]),
      hint: 'Try a bar as the smaller count. Multiply it and look for a bar at the new count.',
    }, [
      { text: 'Try each month as the smaller count. Skip it if its product would be above the tallest bar.',
        equation: trials.map(m => `${m}: ${values[months.indexOf(m)]} × ${factor} = ${values[months.indexOf(m)] * factor}`).join('; ') },
      { text: `${ref} had ${x} visitors. Multiplying this count gives the height of the ${match} bar.`, equation: `${x} × ${factor} = ${y}` },
      { text: `The two months are ${ref} and ${match}.` },
    ]);
  }
  return finish({
    ...graph, prompt: `Which month had ${factor} times as many visitors as ${ref}? Write the short month name shown on the graph.`,
    answer: match, hint: `Read the bar for ${ref}. Multiply that count before looking for a month.`,
  }, [
    { text: `Read the ${ref} bar using the scale.`, equation: `${base} × ${scale} = ${x} visitors` },
    { text: `Find ${factor} times that count.`, equation: `${x} × ${factor} = ${y}` },
    { text: `The bar at ${y} visitors is labelled ${match}.` },
  ]);
}
