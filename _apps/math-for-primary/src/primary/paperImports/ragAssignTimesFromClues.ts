import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { fourClocks } from './ragLabelledClockFaces';

export const RAG_PATTERN = {
  id: 'p1-rag-assign-times-from-clues',
  level: 1,
  title: 'Who came at each time?',
  objective: 'Read four clock faces and use before, after and last to match each child to a time.',
  skillIds: ['P1.S.TIME.01', 'P1.S.WN.06'],
  canonicalPatternId: 'p1-assign-times-from-clues',
};

function reading(minutes: number) {
  return `${Math.floor(minutes / 60)}:${minutes % 60 === 0 ? '00' : '30'} am`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const names = rng.shuffle(['Asha', 'Ben', 'Faye', 'Irfan', 'Jia', 'Kai', 'Ravi', 'Zara']).slice(0, 4);
  const [first, second, third, last] = names;

  // Include a whole hour and its half hour so the long hand matters.
  const hour = 60 * rng.int(8, 11);
  const morning = Array.from({ length: 8 }, (_, i) => 480 + 30 * i);
  const otherTimes = rng.shuffle(morning.filter(t => t !== hour && t !== hour + 30)).slice(0, 2);
  const times = [hour, hour + 30, ...otherTimes].sort((a, b) => a - b);
  const ranks = rng.shuffle([0, 1, 2, 3]);
  if (ranks.every((rank, i) => rank === i)) [ranks[0], ranks[1]] = [ranks[1], ranks[0]];

  const clocks = ranks.map((rank, i) => ({ name: 'ABCD'[i], minutes: times[rank] }));
  const matches = ranks.map(rank => names[rank]);
  const tiles = rng.shuffle(names);
  if (tiles.every((name, i) => name === matches[i])) [tiles[0], tiles[1]] = [tiles[1], tiles[0]];

  const clues = rng.shuffle([
    `${first} arrived before ${second}.`,
    `${third} arrived after ${second}.`,
    `${last} arrived last.`,
  ]);
  const workedSteps = [
    { text: 'Read each clock. The long hand points to 12 for o’clock and to 6 for half past.',
      equation: clocks.map(clock => `${clock.name} = ${reading(clock.minutes)}`).join(', ') },
    { text: `${second} came between ${first} and ${third}. ${last} came after all three.`,
      equation: names.join(' → ') },
    { text: 'Give the first child the earliest time, then match the others in turn.',
      equation: names.map((name, i) => `${name} at ${reading(times[i])}`).join(', ') },
    { text: 'Now read the names in clock order.',
      equation: clocks.map((clock, i) => `${clock.name} — ${matches[i]}`).join(', ') },
  ];
  return {
    key,
    context: ['Four friends came to the library one morning. Each clock shows when a different friend arrived.', ...clues],
    prompt: 'Tap the name for clock A, then the names for clocks B, C and D.',
    picture: fourClocks(clocks),
    order: tiles,
    answer: matches.join(','),
    hint: 'Find the order of the friends first. Read the clocks to find which one belongs to the first friend.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
