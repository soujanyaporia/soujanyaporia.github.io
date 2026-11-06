import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridPoint, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p2-rag-plane-shape-boundary',
  level: 2 as const,
  title: 'Sides and corners of a flat shape',
  objective: 'Name a flat shape from clues about its sides, or trace its outline to count its corners.',
  skillIds: ['P1.S.SHAPE.01'],
  canonicalPatternId: 'p2-plane-shape-sides-and-corners',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 2);
  const finish = (prompt: string, context: string[], answer: string, hint: string, steps: string[], extra: Pick<Question, 'picture' | 'unit'> = {}): Question => ({
    key, prompt, context, answer, hint,
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '), ...extra,
  });

  if (variant === 2) {
    const x = r.int(1, 2), y = r.int(1, 2), w = r.int(2, 5), h = r.int(2, 3);
    let points: GridPoint[];
    if (r.chance(0.5)) {
      const tipAtTop = r.chance(0.5);
      const base = tipAtTop ? y + h : y, tip = tipAtTop ? y : y + h;
      points = [[x, base], [x + w, base], [x + r.int(0, w), tip]];
    } else {
      points = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    }
    const segments: GridSegment[] = points.map((p, i) => [p, points[(i + 1) % points.length]]);
    const count = points.length;
    return finish('How many corners does the outlined shape have?', ['Follow the outline, ignoring the grid lines.'], String(count),
      'Start at one corner. Count each place where the outline turns.',
      ['Count your starting corner as 1.', `Follow the outline. You reach ${count - 1} other corners before you get back to the start.`, `Do not count the start twice: 1 + ${count - 1} = ${count} corners.`],
      { picture: { type: 'grid-drawing', columns: 8, rows: 6, segments }, unit: 'corners' });
  }

  const prompt = 'Write the most specific name for the tile. Use one word.';
  if (variant === 0) {
    return finish(prompt, ['A flat tile has 3 sides. Each side is straight.'], 'triangle',
      'Think of a closed shape you can make with three straight sticks.',
      ['The whole edge is made of three straight sides.', 'Joining three straight sides into a closed shape makes a triangle.']);
  }

  const a = r.int(2, 6), b = r.chance(0.5) ? a : a + r.int(1, 3);
  const lengths = [a, b, a, b].map(n => `${n} cm`).join(', ');
  const equal = a === b;
  return finish(prompt, ['A flat tile has 4 straight sides. Each corner fits exactly over the corner of a sheet of paper.', `Going round the tile, the side lengths are ${lengths}.`],
    equal ? 'square' : 'rectangle', 'Check the corners first. Then check whether all four sides have the same length.',
    ['The tile has four square corners, so it is a rectangle.', equal ? `All four sides are ${a} cm long. The special name for this rectangle is square.` : `The ${a} cm side and the ${b} cm side are different lengths. The tile is a rectangle but cannot be a square.`]);
}
