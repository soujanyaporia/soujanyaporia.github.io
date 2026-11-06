import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-compare-counts-and-totals',
  level: 2 as const,
  title: 'Compare amounts in a table or picture graph',
  objective: 'Read the rows needed for each amount, then find the difference.',
  skillIds: ['P2.S.AS.01', 'P2.S.WN.04', 'P2.S.GRAPH.01'],
  canonicalPatternId: 'p2-difference-between-counts-or-totals',
};

const names = ['Ayu', 'Ben', 'Jia', 'Kavi', 'Mei', 'Noor', 'Siti', 'Zac'];
const clubs = ['Art', 'Chess', 'Dance', 'Drama', 'Music', 'Robotics'];

function tableQuestion(rng: Rng, key: string, form: 'heights' | 'clubs'): Question {
  const heights = form === 'heights';
  const labels = rng.shuffle(heights ? names : clubs).slice(0, 4);
  let next = heights ? rng.int(115, 123) : rng.int(3, 8);
  const ordered = labels.map(label => {
    const row = { label, value: next };
    next += rng.int(2, 7);
    return row;
  });
  const higher = rng.pick(ordered.slice(1));
  const lower = heights ? ordered[0] : rng.pick(ordered.filter(row => row.value < higher.value));
  const difference = higher.value - lower.value;
  const subtraction = `${higher.value} − ${lower.value} = ${difference}`;
  const reading = heights
    ? { text: `${lower.label} is the shortest. Here are the heights in order, in centimetres.`,
        equation: ordered.map(row => row.value).join(' < ') }
    : { text: `${higher.value} children chose ${higher.label} and ${lower.value} chose ${lower.label}.` };
  const comparison = heights
    ? `Subtract ${lower.label}’s height from ${higher.label}’s height.`
    : 'Subtract the smaller number of children from the larger number.';
  return {
    key,
    prompt: heights
      ? `How many centimetres taller is ${higher.label} than the shortest child in the table?`
      : `How many more children chose ${higher.label} than chose ${lower.label}?`,
    picture: {
      type: 'nanyang-p4', layout: 'table',
      caption: heights ? 'Heights of four children' : 'Club choices at school',
      rowHeader: heights ? 'Name' : 'Club', columns: [heights ? 'Height (cm)' : 'Number of children'],
      rows: rng.shuffle(ordered).map(row => ({ label: row.label, values: [row.value] })),
    },
    answer: String(difference), unit: heights ? 'cm' : 'children',
    hint: heights ? 'Find the smallest height. Then look up the height of the child named in the question.'
      : 'Find the two clubs in the table. How far apart are their counts?',
    workedSteps: [reading, { text: comparison, equation: subtraction }],
    explanation: heights ? `${lower.label} is the shortest at ${lower.value} cm. ${higher.label} is ${higher.value} cm tall. The difference is ${difference} cm.`
      : `The two clubs have ${higher.value} and ${lower.value} children. ${subtraction}.`,
    proof: { op: '-', a: higher.value, b: lower.value },
  };
}

function pairQuestion(rng: Rng, key: string): Question {
  const scale = rng.pick([1, 2, 3, 4, 5]);
  const symbols = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4);
  if (symbols[0] + symbols[1] === symbols[2] + symbols[3]) {
    [symbols[1], symbols[2]] = [symbols[2], symbols[1]];
  }
  const rows = rng.shuffle(names).slice(0, 4).map((label, i) => ({
    label, wholeSymbols: symbols[i], halfSymbol: false,
  }));
  const pairs = [[rows[0], rows[1]], [rows[2], rows[3]]].map(([first, second]) => ({
    first, second, label: `${first.label} and ${second.label}`,
    total: (first.wholeSymbols + second.wholeSymbols) * scale,
  }));
  const [larger, smaller] = pairs.sort((a, b) => b.total - a.total);
  const difference = larger.total - smaller.total;
  const choices = [...new Set([difference, smaller.total, larger.total,
    larger.total + smaller.total, difference + scale])].slice(0, 4);
  const workedSteps = pairs.flatMap(({ first, second, label, total }) => {
    const a = first.wholeSymbols * scale;
    const b = second.wholeSymbols * scale;
    return [
      { text: `Use the key for ${first.label}’s row and ${second.label}’s row.`,
        equation: `${first.wholeSymbols} × ${scale} = ${a},   ${second.wholeSymbols} × ${scale} = ${b}` },
      { text: `Add the stamps collected by ${label}.`, equation: `${a} + ${b} = ${total}` },
    ];
  });
  const subtraction = `${larger.total} − ${smaller.total} = ${difference}`;
  workedSteps.push({ text: 'Find the difference between the two totals.', equation: subtraction });
  return {
    key,
    prompt: `How many more stamps did ${larger.label} collect together than ${smaller.label} did together?`,
    picture: { type: 'batch4-early', layout: 'pictograph', heading: 'Stamps collected', scale, rows: rng.shuffle(rows) },
    unit: 'stamps', choices: rng.shuffle(choices.map(String)), answer: String(difference),
    hint: 'Read each child’s row using the key. Add the two counts for each pair before you compare them.',
    workedSteps,
    explanation: `${larger.label} collected ${larger.total} stamps. ${smaller.label} collected ${smaller.total}. ${subtraction}.`,
    proof: { op: '-', a: larger.total, b: smaller.total },
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['heights', 'pairs', 'clubs'] as const);
  return form === 'pairs' ? pairQuestion(rng, key) : tableQuestion(rng, key, form);
}
