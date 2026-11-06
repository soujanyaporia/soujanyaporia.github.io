import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { gridDrawingValue, type GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p2-rag-construct-specified-segment',
  level: 2,
  title: 'Draw a longer or shorter line',
  objective: 'Use a known length and a difference to draw a horizontal segment of the required length.',
  skillIds: ['P2.S.AS.01', 'P1.S.LENGTH.02'],
  canonicalPatternId: 'p2-construct-specified-segment',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const base = rng.int(4, 8);
  const difference = rng.int(1, 3);
  const longer = rng.chance(0.5);
  const required = longer ? base + difference : base - difference;
  const grid = { kind: 'segment-length', unit: 'cm', columns: 11, rows: 1 } as const;
  const example: GridSegment[] = [[[0, 0], [required, 0]]];
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: longer ? 'Add the extra length to AB.' : 'Take the difference away from the length of AB.',
      equation: `${base} ${longer ? '+' : '−'} ${difference} = ${required} cm`},
    {text: `Choose a starting dot. Count ${required === 1 ? 'one gap' : `${required} gaps`} along the same row and join the two ends.`,
      picture: {type: 'grid-drawing', columns: grid.columns, rows: grid.rows, segments: example,
        caption: `One possible line of length ${required} cm`}},
  ];
  return {
    key, context: [`Line AB is ${base} cm long.`],
    prompt: `Draw a horizontal line ${difference} cm ${longer ? 'longer' : 'shorter'} than AB. Each gap is 1 cm.`,
    gridDrawing: grid, answer: gridDrawingValue(example),
    hint: 'Find the new length first. Count gaps between the dots, starting at zero.',
    workedSteps, explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}
