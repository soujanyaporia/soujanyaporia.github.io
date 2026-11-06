import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch4EarlyPicture } from './batch4EarlyPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-recover-a-missing-part',
  level: 2 as const,
  title: 'Find the missing badges',
  objective: 'Read a picture graph, subtract the known part from the whole and use the key to complete a missing row.',
  skillIds: ['P2.S.GRAPH.01', 'P2.S.AS.01', 'P2.S.MD.01', 'P2.S.MD.02'],
  canonicalPatternId: 'recover-a-missing-part',
};

type Steps = NonNullable<Question['workedSteps']>;
const clubs = ['Art', 'Chess', 'Choir', 'Dance', 'Drama'];
const months = ['January', 'February', 'March', 'April', 'May', 'June'];

function graph(heading: string, scale: number, labels: string[], dots: number[]): Batch4EarlyPicture {
  return {
    type: 'batch4-early', layout: 'pictograph', heading, scale,
    rows: labels.map((label, i) => ({ label, wholeSymbols: dots[i], halfSymbol: false })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['row', 'row', 'row', 'colour', 'colour', 'colour', 'months', 'complete']);
  const scale = r.pick([2, 3, 4, 5]);
  const make = (picture: Batch4EarlyPicture, context: string[], prompt: string, answer: number | string,
    hint: string, workedSteps: Steps): Question => ({
    key, picture, context, prompt, answer: String(answer), hint, workedSteps,
    ...(typeof answer === 'number' ? { unit: 'badges' } : {}),
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (form === 'months') {
    const start = r.int(0, months.length - 2);
    const labels = months.slice(start, start + 2);
    const dots = labels.map(() => r.int(2, 5));
    const amounts = dots.map(n => n * scale);
    const whole = amounts[0] + amounts[1];
    const red = r.int(1, whole - 1);
    return make(graph('Badges made each month', scale, labels, dots),
      ['All the badges were red or blue.', `The children made ${red} red badges over the two months.`],
      'How many blue badges did the children make over the two months?', whole - red,
      'Use the key to count all the badges for both months. Then take away the red badges.',
      [
        ...labels.map((label, i) => ({ text: `Read the row for ${label}.`, equation: `${dots[i]} × ${scale} = ${amounts[i]} badges` })),
        { text: 'Put the two months together.', equation: `${amounts[0]} + ${amounts[1]} = ${whole} badges` },
        { text: 'Take away the red badges. The rest were blue.', equation: `${whole} − ${red} = ${whole - red} blue badges` },
      ]);
  }

  const labels = r.shuffle(clubs).slice(0, r.int(3, 5));
  const target = r.int(0, labels.length - 1);
  const name = labels[target];
  const heading = 'Badges made by each club';

  if (form === 'colour') {
    const dots = labels.map(() => r.int(2, 6));
    const whole = dots[target] * scale;
    const red = r.int(1, whole - 1);
    return make(graph(heading, scale, labels, dots),
      ['All the badges were red or blue.', `The ${name} club made ${red} red badges.`],
      `How many blue badges did the ${name} club make?`, whole - red,
      `Use the ${name} row to count its badges of both colours. Then take away its red badges.`,
      [
        { text: `Count all the badges made by the ${name} club.`, equation: `${dots[target]} × ${scale} = ${whole} badges` },
        { text: 'Take away the red badges to find the blue ones.', equation: `${whole} − ${red} = ${whole - red} blue badges` },
      ]);
  }

  const known = r.shuffle([1, 2, 3, 4]).slice(0, labels.length - 1);
  const knownDots = known.reduce((sum, n) => sum + n, 0);
  const missingDots = r.int(1, 5);
  const total = (knownDots + missingDots) * scale;
  const shown = knownDots * scale;
  const missing = total - shown;
  const dots = [...known];
  dots.splice(target, 0, 0);
  const marked = labels.map((label, i) => i === target ? `${label} (?)` : label);
  const picture = graph(heading, scale, marked, dots);
  const context = [`The clubs made ${total} badges altogether.`, `The dots for the ${name} club are missing.`];
  const steps: Steps = [
    { text: 'Count the dots in the rows that are filled in.', equation: `${known.join(' + ')} = ${knownDots} dots` },
    { text: 'Use the key to count the badges shown.', equation: `${knownDots} × ${scale} = ${shown} badges` },
    { text: `The rest of the badges belong to the ${name} club.`, equation: `${total} − ${shown} = ${missing} badges` },
  ];
  const prompt = `How many badges did the ${name} club make?`;
  const hint = 'Count the dots you see. Use the key to find how many badges they show. Take those badges away from the total.';
  if (form === 'row') return make(picture, context, prompt, missing, hint, steps);

  const completed = [...dots];
  completed[target] = missing / scale;
  steps.push({
    text: `Put one dot in the ${name} row for every group of ${scale} badges.`,
    equation: `${missing} ÷ ${scale} = ${completed[target]} ${completed[target] === 1 ? 'dot' : 'dots'}`,
    picture: graph(heading, scale, labels, completed),
  });
  return make(picture, context,
    `${prompt} Complete its row. Type the number, a space, then one o for each dot. Keep the o's together.`,
    `${missing} ${'o'.repeat(completed[target])}`, `${hint} Use the key again to build the row.`, steps);
}
