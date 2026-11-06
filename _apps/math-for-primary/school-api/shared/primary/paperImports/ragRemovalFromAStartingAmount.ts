import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-removal-from-a-starting-amount',
  level: 1,
  title: 'Taking objects away',
  objective: 'Find the starting count after two groups were taken away, or choose the calculation shown by crossed-out objects.',
  skillIds: ['P1.S.AS.02', 'P1.S.AS.03', 'P1.S.AS.04', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-removal-from-a-starting-amount',
};

function beadJar(key: string, rng: Rng): Question {
  const lina = rng.int(5, 9);
  const ben = rng.int(11, 15);
  const left = rng.int(17, 25);
  const beforeBen = left + ben;
  const start = beforeBen + lina;

  return {
    key,
    context: [
      `Lina took ${lina} beads from a jar.`,
      `Then Ben took ${ben} beads from the same jar.`,
      `${left} beads were still in the jar.`,
    ],
    prompt: 'How many beads were in the jar at the start? Type the whole number sentence without spaces. Use the numbers in story order and choose + or - for each circle.',
    display: '□ ○ □ ○ □ = □',
    answer: `${lina}+${ben}+${left}=${start}`,
    unit: 'beads',
    hint: 'Imagine putting the beads back. Which beads go back into the jar?',
    explanation: `The jar started with the beads Lina took, the beads Ben took and the ${left} beads still inside. There were ${start} beads at the start.`,
    workedSteps: [
      { text: 'Put back the beads Ben took to find how many were there just before his turn.', equation: `${left} + ${ben} = ${beforeBen}` },
      { text: 'Put back the beads Lina took to find the starting count.', equation: `${beforeBen} + ${lina} = ${start}` },
      { text: 'Write the three counts in story order. Each bead belongs to just one of these groups.', equation: `${lina} + ${ben} + ${left} = ${start}` },
    ],
  };
}

function pencilCase(key: string, rng: Rng): Question {
  const start = rng.int(9, 12);
  const packed = rng.int(3, Math.floor((start - 1) / 2));
  const left = start - packed;
  const answer = `${start} − ${packed}`;

  return {
    key,
    prompt: 'Which calculation shows how many pencils are still on the desk?',
    picture: {
      type: 'paper',
      layout: 'cards',
      heading: 'Pencils on the desk',
      cards: [{ label: 'Each cross marks a pencil put into a case.', value: 'Each picture stands for one pencil.', icon: 'pencil', count: start, removed: packed }],
    },
    choices: rng.shuffle([answer, `${left} − ${packed}`, `${left} + ${packed}`, `${start} + ${packed}`]),
    answer,
    hint: 'Count all the pencils first, including the crossed-out ones. Then count just the crosses.',
    explanation: `There were ${start} pencils on the desk. Packing ${packed} of them left ${left} on the desk.`,
    workedSteps: [
      { text: 'Count both the crossed-out pencils and the pencils without crosses to find the starting count.', equation: `${left} + ${packed} = ${start}` },
      { text: 'Take away just the pencils that went into the case.', equation: `${start} − ${packed} = ${left}` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const storyTurn = (hashString(`${RAG_PATTERN.id}:${seed}`) + index) % 2 === 0;
  return storyTurn ? beadJar(key, rng) : pencilCase(key, rng);
}
