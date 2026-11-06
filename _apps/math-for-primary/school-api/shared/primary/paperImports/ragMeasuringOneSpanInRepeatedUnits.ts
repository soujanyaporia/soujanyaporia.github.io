import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridDrawingPicture, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p1-rag-measuring-one-span-in-repeated-units',
  level: 1,
  title: 'Measure a string with tiles',
  objective: 'Estimate the length of a string to the nearest whole centimetre using both ends of the string.',
  skillIds: ['P1.S.LENGTH.01'],
  canonicalPatternId: 'measuring-one-span-in-repeated-units',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['blank', 'choice', 'pair'] as const);
  const pair = form === 'pair';
  const firstStart = form === 'choice' ? 0 : r.int(0, 2);
  const starts = pair ? [firstStart, r.pick([0, 1, 2, 3].filter(x => x !== firstStart))] : [firstStart];
  const lengths = r.shuffle([2, 3, 4, 5, 6, 7, 8]);
  const strings: GridSegment[] = starts.map((start, i) => {
    const y = i === 0 ? 0 : 3;
    return [[start, y], [start + lengths[i] + r.pick([-0.25, 0.25]), y]];
  });

  // All tiles share their vertical edges. Extra tiles can lie outside a string.
  const columns = Math.ceil(Math.max(...strings.map(([, end]) => end[0]))) + r.int(0, 1);
  const tiles: GridSegment[] = [[[0, 1], [columns, 1]], [[0, 2], [columns, 2]]];
  for (let x = 0; x <= columns; x++) tiles.push([[x, 1], [x, 2]]);
  const picture: GridDrawingPicture = {
    type: 'grid-drawing', columns, rows: pair ? 3 : 2, givenSegments: tiles, segments: strings,
    caption: pair ? 'Two strings, one above and one below the row of unit tiles' : 'A string above a row of one-centimetre tiles',
  };

  const estimates: number[] = [];
  const steps = strings.flatMap(([[left], [right]], i) => {
    const span = right - left;
    const full = Math.floor(span);
    const roundUp = span - full > 0.5;
    const estimate = full + (roundUp ? 1 : 0);
    estimates.push(estimate);
    const name = pair ? (i === 0 ? 'top string' : 'bottom string') : 'string';
    return [
      { text: `Start at the left end of the ${name}. Count the whole tiles it stretches across: ${Array.from({length: full}, (_, j) => j + 1).join(', ')}.` },
      { text: `Its right end is ${roundUp ? 'more' : 'less'} than halfway across the next tile. ${roundUp ? 'Count that tile too.' : 'Keep the whole-tile count.'} The ${name} is about ${estimate} cm long.` },
    ];
  });
  const answer = estimates.map(String);
  const q: Question = {
    key, picture,
    context: ['Each square tile is 1 cm wide. Each blue line shows a string.'],
    prompt: pair ? 'About how long is each string, in centimetres? Give the nearest whole number for each one.'
                 : 'About how long is the string, in centimetres? Give the nearest whole number.',
    hint: 'Begin counting where the string starts. See which tile edge is closest to its other end.',
    answer: pair ? JSON.stringify(answer) : answer[0],
    workedSteps: steps, explanation: steps.map(step => step.text).join(' '),
  };
  if (pair) {
    q.structuredResponse = {kind: 'number-pair', firstLabel: 'Top string (cm)', secondLabel: 'Bottom string (cm)'};
  } else {
    q.unit = 'cm';
    if (form === 'choice') {
      const low = Math.max(1, estimates[0] - r.int(0, 3));
      q.choices = Array.from({length: 4}, (_, i) => String(low + i));
    }
  }
  return q;
}
