import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-positions-and-sizes-of-groups',
  level: 1,
  title: 'Positions and sizes of groups',
  objective: 'Count from a marked end to connect each card’s position with its number of dots.',
  skillIds: ['P1.S.WN.06', 'P1.S.WN.01'],
  canonicalPatternId: 'p1-positions-and-sizes-of-groups',
};

const places = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const schedules = [
  ['size', 'position', 'equal'], ['position', 'size', 'equal'],
  ['equal', 'size', 'position'], ['equal', 'position', 'size'],
] as const;

function dotCard(count: number, first: boolean) {
  const lines = Array<string>(Math.floor(count / 2)).fill('● ●');
  if (count % 2) lines.push('●');
  if (first) lines.push('1st');
  return { size: 1, label: lines.join('\n') };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const block = Math.floor(index / 3);
  const plan = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${block}`));
  const mode = plan.pick(schedules)[index - 3 * block];
  // Both lookup tasks reproduce the same row. The equal-pair task has its own row.
  const rng = plan.fork(mode === 'equal' ? 'equal' : 'lookup');
  const length = rng.int(4, 6);
  const sizes = rng.shuffle([3, 4, 5, 6, 7, 8]).slice(0, length);
  const ranks = places.slice(1, length).map((_, i) => i + 2)
    .filter(rank => 2 * rank !== length + 1);
  const readRank = rng.pick(ranks);
  const findRank = rng.pick(ranks.filter(rank => rank !== readRank && rank + readRank !== length + 1));
  if (mode === 'equal') sizes[readRank - 1] = sizes[findRank - 1];

  // sizes is in counting order. The picture renderer lays cells out from left to right.
  const picture: Question['picture'] = {
    type: 'paper', layout: 'bars',
    rows: [{ label: '', parts: sizes.map((count, i) => dotCard(count, i === 0)).reverse() }],
  };
  const context = ['Begin at the card marked 1st.'];
  const steps: NonNullable<Question['workedSteps']> = [];
  const countsByPlace = (stop: number) => sizes.slice(0, stop)
    .map((count, i) => `${places[i]} (${count} dots)`).join(', ');
  let prompt: string, answer: string, hint: string;
  const response: Pick<Question, 'unit' | 'structuredResponse'> = {};

  if (mode === 'size') {
    const place = places[readRank - 1];
    const size = sizes[readRank - 1];
    prompt = `How many dots can you count on the ${place} card?`;
    answer = String(size);
    response.unit = 'dots';
    hint = 'Point to one card for each place you say. Stop at the place in the question.';
    steps.push({ text: `Start on the right and move left until you reach the ${place} card.`, equation: places.slice(0, readRank).join(' → ') });
    steps.push({ text: `Count just the dots on that card. There are ${size} dots.`, equation: Array.from({ length: size }, (_, i) => i + 1).join(', ') });
  } else if (mode === 'position') {
    const size = sizes[findRank - 1];
    prompt = `One card shows ${size} dots. What is its position?`;
    context.push('Write the position in words.');
    answer = places[findRank - 1];
    hint = 'Look for the card with that many dots. Then count its place from the marked end.';
    steps.push({ text: `Move left from the first card. Count the dots on each card until you find ${size}.`, equation: countsByPlace(findRank) });
    steps.push({ text: `The card with ${size} dots is ${answer} from the right.` });
  } else {
    const pair = [readRank, findRank].sort((a, b) => a - b).map(rank => places[rank - 1]);
    prompt = 'Which two cards have the same number of dots? Choose their positions.';
    answer = JSON.stringify(pair);
    response.structuredResponse = { kind: 'named-pair', options: places.slice(0, length) };
    hint = 'Count the dots on each card. Look for a count you get twice.';
    steps.push({ text: 'Start on the right. Say each card’s place and count its dots.', equation: countsByPlace(length) });
    steps.push({ text: `The ${pair[0]} and ${pair[1]} cards each have ${sizes[findRank - 1]} dots.` });
  }

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`, prompt, context, picture, answer, hint,
    ...response, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
