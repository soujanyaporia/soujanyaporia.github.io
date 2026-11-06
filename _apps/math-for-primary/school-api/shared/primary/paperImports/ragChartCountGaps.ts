import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch2EarlyPicture } from './batch2EarlyPicture';

export const RAG_PATTERN = {
  id: 'p3-chart-count-gaps',
  level: 3,
  title: 'Compare counts on a bar graph',
  objective: 'Find a gap between counts by reading a scale, combining groups or checking a claim.',
  skillIds: ['P3.S.GRAPH.01', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-compare-two-counts-by-subtraction',
};

type Task = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & {
  workedSteps: NonNullable<Question['workedSteps']>;
};

function rangeTask(r: Rng): Task {
  const labels = r.shuffle(['Boat', 'Star', 'Leaf', 'Shell']);
  const step = r.pick([2, 4, 10]);
  const counts = r.shuffle([3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3).map(n => n * step);
  // The last count falls halfway between ticks. It can change either end of the range.
  const last = r.int(2, 10) * step + step / 2;
  const all = [...counts, last];
  const low = Math.min(...all);
  const high = Math.max(...all);
  const picture: Batch2EarlyPicture = {
    type: 'batch2-early', layout: 'sales-bars', heading: 'Bookmarks made by design',
    days: labels, values: [...counts, 0], maximum: 12 * step, minorStep: step, labelStep: 2 * step,
  };
  return {
    context: [`The library made four bookmark designs. The row for ${labels[3]} is still blank. There are ${last} bookmarks with that design.`],
    picture, unit: 'bookmarks',
    prompt: 'How many more bookmarks are there of the most common design than of the least common design?',
    answer: String(high - low),
    hint: 'Include the design in the blank row before you choose the largest and smallest counts.',
    workedSteps: [
      { text: `Each small step stands for ${step} bookmarks. Read the three bars: ${counts.map((n, i) => labels[i] + ' ' + n).join(', ')}.` },
      { text: `The ${labels[3]} bar should end at ${last}, halfway between ${last - step / 2} and ${last + step / 2}.`, picture: { ...picture, values: all } },
      { text: `${labels[all.indexOf(high)]} has the most (${high}). ${labels[all.indexOf(low)]} has the fewest (${low}).`, equation: `${high} − ${low} = ${high - low} bookmarks` },
    ],
  };
}

function groupTask(r: Rng): Task {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const [high, low] = r.shuffle([0, 1, 2, 3]);
  const scale = r.pick([2, 5, 10]);
  const series = ['Notebooks', 'Cards'].map(label => ({
    label, values: days.map(() => r.int(4, 8) * scale),
  }));
  // One kind has fewer items on the busier day. Both bars matter.
  const [rising, falling] = r.shuffle(series);
  const drop = r.int(1, 2) * scale;
  const extra = r.int(1, 4) * scale;
  rising.values[high] = rising.values[low] + drop + extra;
  falling.values[high] = falling.values[low] - drop;
  const [books, cards] = series.map(s => s.values);
  const highTotal = books[high] + cards[high];
  const lowTotal = books[low] + cards[low];
  const cardTotal = cards[low] + cards[high];
  return {
    context: ['A class collected notebooks and cards. Each pair of bars shows what the class collected on one day.'],
    picture: { type: 'raffles-p3', layout: 'grouped-bars', days, series, scale },
    prompt: `(a) How many cards did the class collect on ${days[low]} and ${days[high]} altogether?\n(b) Counting both kinds of items, how many more items did the class collect on ${days[high]} than on ${days[low]}?`,
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Cards', secondLabel: '(b) Extra items' },
    answer: JSON.stringify([String(cardTotal), String(highTotal - lowTotal)]),
    hint: 'For (a), follow the same colour across the two days. For (b), add the two bars for each day first.',
    workedSteps: [
      { text: `Each small step is ${scale} items. Read the cards on ${days[low]} and ${days[high]}.`, equation: `${cards[low]} + ${cards[high]} = ${cardTotal} cards` },
      { text: `Count notebooks and cards on ${days[high]}.`, equation: `${books[high]} + ${cards[high]} = ${highTotal} items` },
      { text: `Count notebooks and cards on ${days[low]}.`, equation: `${books[low]} + ${cards[low]} = ${lowTotal} items` },
      { text: 'Find the gap between the two daily totals.', equation: `${highTotal} − ${lowTotal} = ${highTotal - lowTotal} items` },
    ],
  };
}

function claimsTask(r: Rng): Task {
  const labels = ['Clay', 'Dance', 'Chess', 'Art'];
  const scale = r.pick([2, 5, 10]);
  const base = r.int(2, 5);
  const values = r.shuffle([base, r.int(base + 1, 2 * base - 1), 2 * base, 2 * base + r.int(1, 3)]).map(n => n * scale);
  const total = values.reduce((sum, n) => sum + n, 0);
  const statedTotal = total + r.pick([0, scale]);
  const least = values.indexOf(Math.min(...values));
  const namedLeast = r.chance(0.5) ? least : r.pick([0, 1, 2, 3].filter(i => i !== least));
  const [i, j] = r.shuffle([0, 1, 2, 3]);
  const [larger, smaller] = values[i] > values[j] ? [i, j] : [j, i];
  const gap = values[larger] - values[smaller];
  const mode = r.pick(['exact', 'off', 'reversed']);
  const [first, second] = mode === 'reversed' ? [smaller, larger] : [larger, smaller];
  const statedGap = mode === 'off' ? gap + scale : gap;
  const double = values.indexOf(2 * base * scale);
  const namedDouble = r.chance(0.5) ? double : r.pick([0, 1, 2, 3].filter(k => k !== least && k !== double));
  const verdicts = [
    total === statedTotal, namedLeast === least,
    values[first] - values[second] === statedGap, values[namedDouble] === 2 * values[least],
  ];
  const marks = verdicts.map(yes => yes ? 'T' : 'F');
  return {
    context: [
      'Each pupil picked one club. The bars show their choices.',
      `(a) In all, ${statedTotal} pupils picked a club.`,
      `(b) ${labels[namedLeast]} had the fewest votes.`,
      `(c) ${statedGap} more pupils picked ${labels[first]} than ${labels[second]}.`,
      `(d) Twice as many pupils picked ${labels[namedDouble]} as ${labels[least]}.`,
    ],
    picture: { type: 'bars', labels, values, scale },
    prompt: 'Write T for each true statement and F for each false one. Type the four letters in order, with no spaces.',
    answer: marks.join(''),
    hint: 'Read the scale. For (c), check which club has more votes as well as how many more.',
    workedSteps: [
      { text: `(a) Each small step is ${scale} pupils. Add the four counts and compare with ${statedTotal}. Answer ${marks[0]}.`, equation: `${values.join(' + ')} = ${total}` },
      { text: `(b) The shortest bar is ${labels[least]}, with ${values[least]} votes. Answer ${marks[1]}.` },
      { text: `(c) ${labels[larger]} has ${gap} more votes than ${labels[smaller]}. The statement says ${labels[first]} has ${statedGap} more than ${labels[second]}. Answer ${marks[2]}.`, equation: `${values[larger]} − ${values[smaller]} = ${gap}` },
      { text: `(d) Double the ${labels[least]} count and compare it with the ${values[namedDouble]} votes for ${labels[namedDouble]}. Answer ${marks[3]}.`, equation: `2 × ${values[least]} = ${2 * values[least]}` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const task = r.weighted([[rangeTask, 3], [groupTask, 1], [claimsTask, 1]])(r);
  return { ...task, key, explanation: task.workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ') };
}
