import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch4EarlyPicture } from './batch4EarlyPicture';

export const RAG_PATTERN = {
  id: 'p2-graph-count-qualifying-categories',
  level: 2 as const,
  title: 'Count the labels in a picture graph',
  objective: 'Count each label once, either across the whole graph or for rows above a given amount.',
  skillIds: ['P2.S.GRAPH.01'],
  canonicalPatternId: 'p2-count-qualifying-categories',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const countAll = (hashString(String(seed)) + index) % 2 === 0;

  if (countAll) {
    const games = rng.shuffle(['Tag', 'Hopscotch', 'Football', 'Skipping', 'Catch', 'Badminton']).slice(0, rng.int(3, 5));
    const scale = rng.pick([2, 5]);
    const votesInDots = games.map(() => rng.int(1, 3));
    const total = votesInDots.reduce((sum, dots) => sum + dots * scale, 0);
    const missing = rng.int(0, games.length - 1);
    const picture: Batch4EarlyPicture = {
      type: 'batch4-early', layout: 'pictograph', heading: 'Votes for games', scale,
      rows: games.map((label, i) => ({label, wholeSymbols: i === missing ? 0 : votesInDots[i], halfSymbol: false})),
    };
    return {
      key, picture,
      context: [
        `At sports day, ${total} children each voted for one game.`,
        `The dots for ${games[missing]} are missing from the graph.`,
      ],
      prompt: 'How many different games are shown in the graph?',
      unit: 'games', answer: String(games.length),
      hint: 'Look at the game names down the side. The row waiting for its dots has a name too.',
      workedSteps: [
        {text: `Read the names down the side of the graph: ${games.join(', ')}.`},
        {text: 'Count one game for each name, including the name beside the blank row.', equation: `${games.map(() => '1').join(' + ')} = ${games.length}`},
      ],
      explanation: `Each of the ${games.length} labels names a different game. ${games[missing]} counts even though its dots are missing.`,
    };
  }

  const children = rng.shuffle(['Asha', 'Ben', 'Mei', 'Ravi', 'Zara', 'Dan']).slice(0, 4);
  const scale = rng.pick([2, 3, 4, 5]);
  const cutoffDots = rng.int(2, 3);
  const cutoff = cutoffDots * scale;
  const dots = rng.shuffle([rng.int(1, cutoffDots - 1), cutoffDots, rng.int(cutoffDots + 1, 6), rng.int(1, 6)]);
  const rows = children.map((label, i) => ({label, wholeSymbols: dots[i], halfSymbol: false}));
  const picture: Batch4EarlyPicture = {
    type: 'batch4-early', layout: 'pictograph', heading: 'Paper stars folded by each child', scale, rows,
  };
  const above = rows.filter(row => row.wholeSymbols * scale > cutoff);
  const names = above.map(row => row.label).join(' and ');
  const readings = rows.map(row => `${row.label}: ${row.wholeSymbols} × ${scale} = ${row.wholeSymbols * scale}`);
  return {
    key, picture,
    prompt: `How many children folded more than ${cutoff} stars?`,
    unit: 'children', answer: String(above.length),
    hint: 'Use the key to find how many stars each row shows. Count a child only if the total is bigger than the number in the question.',
    workedSteps: [
      {text: `Multiply the dots in each row by ${scale} to get the number of stars.`, equation: readings.join(' · ')},
      {text: `Skip totals of ${cutoff} or fewer. The names left are ${names}.`},
      {text: 'Count one child for each name left.', equation: `${above.map(() => '1').join(' + ')} = ${above.length}`},
    ],
    explanation: `Counting the rows above ${cutoff} stars gives ${above.length}. A row with exactly ${cutoff} stars is outside that group.`,
  };
}
