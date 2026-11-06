import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-infer-pictograph-key',
  level: 2 as const,
  title: 'Find the value of one circle',
  objective: 'Find the value of a symbol in a picture graph from a total or a difference.',
  skillIds: ['P2.S.GRAPH.01', 'P2.S.AS.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-infer-the-pictograph-key',
};

type Row = { label: string; circles: number };
type Steps = NonNullable<Question['workedSteps']>;

function beadGraph(rows: Row[], caption = 'Every circle stands for the same number of beads.'): PaperPicture {
  return {
    type: 'paper', layout: 'bars', heading: 'Beads sorted by each child', caption,
    rows: rows.map(({ label, circles }) => ({
      label, parts: Array.from({ length: circles }, () => ({ size: 1, label: '○', tone: 'blue' as const })),
    })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['total', 'difference'] as const);
  const scale = rng.pick([2, 3, 4, 5, 10]);
  const names = rng.shuffle(['Ayu', 'Ben', 'Jia', 'Kavi', 'Mei', 'Zara']);

  let rows: Row[];
  let clue: string;
  let amount: number;
  let divisor: number;
  let firstStep: Steps[number];
  if (form === 'total') {
    divisor = rng.pick([4, 6, 8, 10]);
    const first = rng.int(2, divisor - 2);
    rows = [{ label: names[0], circles: first }, { label: names[1], circles: divisor - first }];
    amount = divisor * scale;
    clue = `${names[0]} and ${names[1]} sorted ${amount} beads altogether.`;
    firstStep = { text: 'Count the circles in both rows.', equation: `${first} + ${divisor - first} = ${divisor} circles` };
  } else {
    divisor = rng.pick([3, 5]);
    const small = rng.int(1, 3);
    rows = rng.shuffle([
      { label: names[0], circles: small + divisor },
      { label: names[1], circles: small },
      { label: names[2], circles: small + rng.int(1, divisor - 1) },
    ]);
    amount = divisor * scale;
    clue = `${names[0]} sorted ${amount} more beads than ${names[1]}.`;
    firstStep = { text: `Match circles in ${names[0]}’s and ${names[1]}’s rows. Count the extra circles.`,
      equation: `${small + divisor} − ${small} = ${divisor} circles` };
  }

  const total = form === 'total';
  const workedSteps: Steps = [
    firstStep,
    { text: total ? 'Share all the beads equally among the circles.' : 'The extra circles show the extra beads. Find how many beads one circle shows.',
      equation: `${amount} ÷ ${divisor} = ${scale} beads` },
  ];
  return {
    key, context: [clue], prompt: 'How many beads does one circle show?', picture: beadGraph(rows),
    answer: String(scale), unit: 'beads',
    hint: total ? 'Which circles show all the beads together?' : 'Which two rows does the clue compare? Look for the circles that have no partner.',
    workedSteps, explanation: `The ${divisor}${total ? '' : ' extra'} circles show ${amount} beads, so one circle shows ${scale} beads.`,
  };
}
