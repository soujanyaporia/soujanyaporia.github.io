import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-compare-and-rank-categories',
  level: 1 as const,
  title: 'Compare rows in a picture graph',
  objective: 'Compare two named rows, decide whether a named row has the most or fewest objects, and order three labels by their counts.',
  skillIds: ['P1.S.GRAPH.01', 'P1.S.WN.04'],
  canonicalPatternId: 'p1-compare-and-rank-categories',
};

type Row = { label: string; count: number };
const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const describe = (rows: Row[]) => rows.map(row => `${row.label} (${row.count})`).join(', ');
const graph = (rows: Row[]): NonNullable<Question['picture']> => ({
  type: 'bars', pictures: true, scale: 1,
  labels: rows.map(row => row.label),
  values: rows.map(row => row.count),
});

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  // In each group of three, the two sticker questions share their starting graph.
  const group = Math.floor(index / 3);
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${group}`));
  const variant = (hashString(String(seed)) + index - 3 * group) % 3;

  if (variant === 2) {
    const games = r.shuffle(['Tag', 'Chess', 'Football', 'Skipping', 'Hopscotch', 'Tennis']);
    const values = r.shuffle(counts.slice(1));
    const named = games.slice(0, 3).map((label, i) => ({ label, count: values[i] }));
    const ranked = [...named].sort((a, b) => b.count - a.count);
    const rows = r.shuffle([...named,
      { label: games[3], count: values[3] },
      { label: games[4], count: ranked[1].count },
    ]);
    const labels = named.map(row => row.label);
    const result = ranked.map(row => row.label);
    return {
      key, picture: graph(rows),
      context: ['Each child voted for one game. Each dot shows 1 vote.'],
      prompt: `Put ${labels[0]}, ${labels[1]} and ${labels[2]} in order. Start with the game with the most votes.`,
      order: r.shuffle(labels), answer: result.join(','),
      hint: 'Find the three games in the question. Count their dots and put the biggest count first.',
      workedSteps: [
        { text: 'Count the votes for the three games in the question.', equation: describe(named) },
        { text: 'Put the counts in order from most to fewest.', equation: ranked.map(row => row.count).join(' > ') },
        { text: 'Use the game name for each count.', equation: result.join(' → ') },
      ],
      explanation: `From most votes to fewest, the three games are ${describe(ranked)}.`,
    };
  }

  const names = r.shuffle(['Mei', 'Ravi', 'Hana', 'Amir', 'Jia', 'Zara']);
  const low = r.int(1, 5);
  const high = low + r.pick([1, 3, 4]);
  const other = r.shuffle(counts.filter(n => n !== low && n !== high));
  const rows = r.shuffle([low, high, other[0], other[1]].map((count, i) => ({ label: names[i], count })));
  const common = { key, picture: graph(rows), context: ['The dots show the stickers each child has. Each dot shows 1 sticker.'] };

  if (variant === 0) {
    const pair = r.shuffle(rows.filter(row => row.count === low || row.count === high));
    const [first, second] = pair;
    const word = first.count > second.count ? 'more' : 'fewer';
    const gap = high - low;
    const items = gap === 1 ? 'sticker' : 'stickers';
    return {
      ...common,
      prompt: `Choose the missing word. ${first.label} has ${gap} ___ ${items} than ${second.label}.`,
      choices: ['more', 'fewer'], answer: word,
      hint: `Match the dots in the two rows. Does ${first.label} have dots left over, or does ${second.label}?`,
      workedSteps: [
        { text: 'Count the stickers for the two children.', equation: describe(pair) },
        { text: 'Find how many dots are left after matching.', equation: `${high} − ${low} = ${gap}` },
        { text: `Start the comparison with ${first.label}. The missing word is “${word}”.` },
      ],
      explanation: `${first.label} has ${first.count} and ${second.label} has ${second.count}. So ${first.label} has ${gap} ${word} ${items} than ${second.label}.`,
    };
  }

  const sorted = [...rows].sort((a, b) => a.count - b.count);
  const most = r.chance(0.5);
  const target = sorted[most ? sorted.length - 1 : 0];
  const word = most ? 'most' : 'fewest';
  const reason = `${target.label} has ${target.count} ${target.count === 1 ? 'sticker' : 'stickers'}. Every other child has ${most ? 'fewer' : 'more'}, so ${target.label} has the ${word} stickers.`;
  return {
    ...common,
    prompt: `Does ${target.label} have the most stickers or the fewest stickers?`,
    choices: ['most', 'fewest'], answer: word,
    hint: `Compare ${target.label}’s row with each of the other three rows.`,
    workedSteps: [
      { text: 'Count the stickers for each child.', equation: describe(rows) },
      { text: 'Compare all four counts.', equation: sorted.map(row => row.count).join(' < ') },
      { text: reason },
    ],
    explanation: reason,
  };
}
