import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { gridDrawingValue, type GridPoint, type GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'rag-p4-extend-tessellation',
  level: 4,
  title: 'Extend a row of interlocking tiles',
  objective: 'Slide a tile along a row and draw matching edges so the new tiles fit together.',
  skillIds: ['P2.S.SHAPE.01', 'P1.S.SHAPE.03'],
  canonicalPatternId: 'p4-extend-tessellation-by-translating-a-unit-tile',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const extra = rng.int(1, 3);
  const starter = rng.int(2, Math.min(3, 5 - extra));
  const total = starter + extra;
  const width = rng.int(2, 3);
  const height = rng.int(2, 4);
  const top = rng.int(1, 2);
  const bottom = top + height;
  const tipDepth = rng.int(1, height - 1);
  const tipOffset = rng.pick([-1, 1]);
  const right = rng.chance(0.5);
  const direction = right ? 'right' : 'left';
  const columns = total * width + 2;
  const rows = bottom + 1;
  const xAt = (i: number) => right ? 1 + i * width : columns - 1 - i * width;

  const sides: GridSegment[][] = Array.from({ length: total + 1 }, (_, i): GridSegment[] => {
    const x = xAt(i);
    const tip: GridPoint = [x + tipOffset, top + tipDepth];
    return [[[x, top], tip], [tip, [x, bottom]]];
  });
  const borders = (from: number, to: number): GridSegment[] => [
    [[xAt(from), top], [xAt(to), top]],
    [[xAt(from), bottom], [xAt(to), bottom]],
  ];
  const given = [...borders(0, starter), ...sides.slice(0, starter + 1).flat()];
  const added = [...borders(starter, total), ...sides.slice(starter + 1).flat()];
  const complete = [...borders(0, total), ...sides.flat()];
  const steps = [
    `Look at two bent sides next to each other. Their top dots are ${width} spaces apart.`,
    `Each bend has its tip ${tipDepth} ${tipDepth === 1 ? 'row' : 'rows'} down and one space to the ${tipOffset > 0 ? 'right' : 'left'} of its top dot. Its bottom dot is straight below its top dot.`,
    `Slide the end tile ${width} spaces to the ${direction} for each new tile. Draw the next bent side. The side shared with the previous tile is already in place.`,
    `Join the tops and join the bottoms. The ${starter} starting tiles and ${extra} new ${extra === 1 ? 'tile' : 'tiles'} make a row of ${total}, with no gaps or overlaps.`,
  ];
  return {
    key,
    prompt: `Copy the blue tiles onto the matching dots. Extend the same row with ${extra} more ${extra === 1 ? 'tile' : 'tiles'} on the ${direction}.`,
    context: ['Keep every tile the same size and facing the same way. Draw the top of the finished row in one straight line and the bottom in another.'],
    gridDrawing: { kind: 'copy-grid', columns, rows, referenceSegments: given },
    answer: gridDrawingValue(complete),
    hint: 'Count the spaces between matching corners. Slide each corner that far along the row, including the point of the bend.',
    explanation: steps.join(' '),
    workedSteps: steps.map((text, i) => i < steps.length - 1 ? { text } : {
      text,
      picture: { type: 'grid-drawing', columns, rows, givenSegments: given, segments: added, caption: 'Starting tiles and their continuation' },
    }),
  };
}
