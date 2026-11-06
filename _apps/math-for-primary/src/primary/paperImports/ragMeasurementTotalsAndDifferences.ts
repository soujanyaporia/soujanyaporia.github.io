import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-measurement-totals-and-differences',
  level: 1,
  title: 'Compare two lengths or estimate their total',
  objective: 'Measure two lengths in centimetres, then find their difference or estimate their total.',
  skillIds: ['P1.S.LENGTH.01', 'P1.S.AS.05'],
  canonicalPatternId: 'totals-and-differences-of-two-measurements',
};

type Steps = NonNullable<Question['workedSteps']>;

function finish(key: string, picture: Batch11UpperPicture, context: string[], prompt: string,
  value: number, unit: string, hint: string, steps: Steps): Question {
  return { key, picture, context, prompt, answer: String(value), unit, hint, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ') };
}

function lengths(key: string, rng: Rng, estimate: boolean): Question {
  const short = estimate ? rng.pick([2, 3, 5]) : rng.int(2, 4);
  const long = short + rng.int(1, 4);
  const [a, b] = rng.shuffle([short, long]);
  const tiles = long + 1;
  const width = Math.floor(276 / tiles);
  const left = 20;
  const right = left + tiles * width;
  const marks: Batch11UpperMark[] = [
    { kind: 'line', x1: left, y1: 85, x2: right, y2: 85 },
    { kind: 'line', x1: left, y1: 109, x2: right, y2: 109 },
  ];
  for (let i = 0; i <= tiles; i++) {
    const x = left + i * width;
    marks.push({ kind: 'line', x1: x, y1: 85, x2: x, y2: 109 });
  }

  const descriptions = [a, b].map((whole, i) => {
    const name = i === 0 ? 'Cord A' : 'Cord B';
    const y = i === 0 ? 46 : 148;
    const offset = estimate ? rng.pick([-0.3, -0.2, 0.2, 0.3]) : 0;
    const end = left + (whole + offset) * width;
    marks.push(
      { kind: 'text', x: left, y: i === 0 ? 32 : 177, text: name },
      { kind: 'line', x1: left, y1: y, x2: end, y2: y },
      { kind: 'line', x1: end, y1: y, x2: end, y2: i === 0 ? 85 : 109, dashed: true },
    );
    const where = offset < 0 ? 'just before' : offset > 0 ? 'just after' : 'at';
    return `${name} ends ${where} the end of tile ${whole}.`;
  });
  const picture: Batch11UpperPicture = { type: 'batch11-upper', marks,
    label: ['Both cords start at the left edge of the tile row.', ...descriptions].join(' ') };
  const context = ['Each tile is 1 cm long. Both cords start at the left edge of the first tile.'];
  const longer = a > b ? 'A' : 'B';
  const shorter = a > b ? 'B' : 'A';
  const steps: Steps = [a, b].map((n, i) => {
    const cord = i === 0 ? 'Cord A' : 'Cord B';
    return { text: estimate ? `Find the tile end closest to the tip of ${cord}.` : `Count the tiles from the start to the end of ${cord}.`,
      equation: `${cord} is ${estimate ? 'about ' : ''}${n} cm long.` };
  });
  if (estimate) {
    context.push('Estimate each cord to the nearest whole centimetre first.');
    steps.push({ text: 'Add the two estimates.', equation: `${a} + ${b} = ${a + b} cm` });
    return finish(key, picture, context, 'About how many centimetres long are the two cords altogether?',
      a + b, 'cm', 'Follow each dashed line to the tiles. Which tile end is closest?', steps);
  }
  steps.push({ text: 'Take the shorter length away from the longer length.',
    equation: `${long} − ${short} = ${long - short} cm` });
  return finish(key, picture, context, `How much longer is Cord ${longer} than Cord ${shorter}?`,
    long - short, 'cm', 'Find where each cord ends. How many extra tiles does the longer cord cover?', steps);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  return lengths(key, rng, rng.int(1, 4) === 4);
}
