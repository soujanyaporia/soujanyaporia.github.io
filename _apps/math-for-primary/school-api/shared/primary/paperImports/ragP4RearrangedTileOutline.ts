import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p4-rearranged-tile-outline',
  level: 4,
  title: 'Around the tiles',
  objective: 'Find a tile width from matching sides, then trace the outside edges after the tiles move.',
  skillIds: ['P4.S.SHAPE.01', 'P4.S.AREA.02'],
  canonicalPatternId: 'p4-infer-tile-width-trace-rearranged-outline',
};

function tile(x: number, y: number, w: number, h: number): GridSegment[] {
  return [
    [[x, y], [x + w, y]],
    [[x + w, y], [x + w, y + h]],
    [[x + w, y + h], [x, y + h]],
    [[x, y + h], [x, y]],
  ];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  // Draw in whole grid steps. The centimetre lengths are given in the question.
  const widthSteps = rng.int(2, 4);
  const squareSteps = rng.int(1, Math.min(2, widthSteps - 1));
  const longSteps = widthSteps + squareSteps;
  const cmPerStep = rng.int(3, 7);
  const width = widthSteps * cmPerStep;
  const side = squareSteps * cmPerStep;
  const length = longSteps * cmPerStep;
  const span = 2 * (width + length);
  const horizontal = 2 * span;
  const vertical = 2 * length + 4 * side;
  const perimeter = horizontal + vertical;

  const topSize = widthSteps + longSteps;
  const columns = 2 * topSize;
  const topLeft = Math.floor((columns - topSize) / 2);
  const bottomY = topSize + 2;
  const inset = rng.int(1, widthSteps - 1);
  const segments = [
    // Top design, with the small square between four identical tiles.
    ...tile(topLeft, 0, widthSteps, longSteps),
    ...tile(topLeft + widthSteps, 0, longSteps, widthSteps),
    ...tile(topLeft + longSteps, widthSteps, widthSteps, longSteps),
    ...tile(topLeft, longSteps, longSteps, widthSteps),
    ...tile(topLeft + widthSteps, widthSteps, squareSteps, squareSteps),
    // Bottom design. Leave space on both sides of the little square.
    ...tile(0, bottomY, widthSteps, longSteps),
    ...tile(widthSteps, bottomY + squareSteps, longSteps, widthSteps),
    ...tile(widthSteps + inset, bottomY, squareSteps, squareSteps),
    ...tile(widthSteps + longSteps, bottomY, widthSteps, longSteps),
    ...tile(2 * widthSteps + longSteps, bottomY, longSteps, widthSteps),
  ];

  return {
    key,
    context: [
      'In the top design, four identical rectangular tiles fit around one small square tile.',
      `Each rectangle is ${length} cm long. Each side of the small square is ${side} cm.`,
      'The same five tiles make the bottom design.',
    ],
    prompt: '(a) How wide is one rectangular tile? (b) What is the perimeter of the bottom design?',
    picture: { type: 'grid-drawing', columns, rows: bottomY + longSteps, segments, caption: 'The five tiles form a square in the top drawing. In the bottom drawing there is a gap on each side of the small square.' },
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Tile width (cm)', secondLabel: '(b) Perimeter (cm)' },
    answer: JSON.stringify([String(width), String(perimeter)]),
    hint: 'Look at the upright tile on the left of the top design. What two sides line up along its long right edge?',
    workedSteps: [
      { text: 'A short side of a rectangle and one side of the small square fit along one long side. Subtract to get the tile width.', equation: `${length} − ${side} = ${width} cm` },
      { text: 'The bottom design stretches across two tile widths and two tile lengths.', equation: `${width} + ${length} + ${width} + ${length} = ${span} cm` },
      { text: 'The horizontal edges go all the way across and all the way back.', equation: `2 × ${span} = ${horizontal} cm` },
      { text: `The left edge is ${length} cm tall. The two downward edges on the right together cover the same height. Each gap beside the square adds a trip down and up by ${side} cm.`, equation: `${length} + ${length} + 4 × ${side} = ${vertical} cm` },
      { text: 'Add the horizontal and vertical distances around the outside.', equation: `${horizontal} + ${vertical} = ${perimeter} cm` },
    ],
    explanation: `The square fills the ${side} cm difference between a long side and a short side. The tile width is ${width} cm. The outside edges of the new design total ${horizontal} cm horizontally and ${vertical} cm vertically, giving a perimeter of ${perimeter} cm.`,
  };
}
