import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-dimensions-from-area-and-shape-proportions',
  level: 5,
  title: 'Find lengths from areas and arrangements',
  objective: 'Use equal pieces and area relationships to recover dimensions and calculate lengths or perimeters.',
  skillIds: ['P4.S.AREA.01', 'P3.S.AREA.02', 'P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-dimensions-from-area-and-shape-proportions',
};

type Point = [number, number];
type Diagram = Extract<NonNullable<Question['picture']>, { type: 'batch11-upper' }>;
type Mark = Diagram['marks'][number];
type Step = NonNullable<Question['workedSteps']>[number];

function polygon(points: Point[], fill = 'white'): Mark {
  return {
    kind: 'path',
    d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z',
    fill,
  };
}

function rectangle(x: number, y: number, width: number, height: number): Mark {
  return polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]]);
}

function label(x: number, y: number, text: string): Mark {
  return { kind: 'text', x, y, text };
}

function diagram(description: string, marks: Mark[]): Diagram {
  return { type: 'batch11-upper', label: description, marks };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 3;
  const finish = (
    context: string[], prompt: string, answer: string, picture: Diagram,
    hint: string, workedSteps: Step[], extra: Partial<Question> = {},
  ): Question => ({
    key, context, prompt, answer, picture, hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const breadth = rng.pick([2, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const area = 6 * breadth * breadth;
    const tileArea = area / 3;
    const squareArea = tileArea / 2;
    const width = 3 * breadth;
    const height = 2 * breadth;
    const perimeter = 2 * (width + height);
    const picture = diagram(
      'Rectangle ABCD is filled by three identical rectangles. One stands on the left; two lie one above the other on the right. The long side of the left tile meets the two short sides of the right tiles.',
      [
        rectangle(70, 40, 60, 120),
        rectangle(130, 40, 120, 60),
        rectangle(130, 100, 120, 60),
        label(53, 34, 'A'), label(255, 34, 'B'),
        label(255, 180, 'C'), label(53, 180, 'D'),
      ],
    );
    return finish(
      [
        'Three identical rectangular tiles fit together to make rectangle ABCD, as shown. There are no gaps or overlaps.',
        `Rectangle ABCD has an area of ${area} cm².`,
        'The length and breadth of each tile are whole numbers of centimetres.',
      ],
      'What is the perimeter of rectangle ABCD?', String(perimeter), picture,
      'Compare the long side of the standing tile with the two short sides beside it. Then think of each tile as two equal squares.',
      [
        { text: 'The standing tile is as tall as two tile breadths. Each tile is therefore twice as long as it is broad.' },
        { text: 'Find the area of one tile.', equation: `${area} ÷ 3 = ${tileArea} cm²` },
        { text: 'Each tile can be split into two equal squares. Find the area of one square.', equation: `${tileArea} ÷ 2 = ${squareArea} cm²` },
        { text: 'Find the whole number that gives this square area when multiplied by itself. This is the tile breadth.', equation: `${breadth} × ${breadth} = ${squareArea}; breadth = ${breadth} cm` },
        { text: 'The large rectangle is three tile breadths across and two tile breadths high.', equation: `3 × ${breadth} = ${width} cm; 2 × ${breadth} = ${height} cm` },
        { text: 'Add the four outside sides.', equation: `2 × (${width} + ${height}) = ${perimeter} cm` },
      ],
      { unit: 'cm' },
    );
  }

  if (variant === 1) {
    const side = rng.pick([6, 12, 15, 18, 21, 24]);
    const copies = rng.int(4, 18);
    const squareArea = side * side;
    const length = side * 3 / 2;
    const breadth = squareArea / length;
    const pathArea = copies * squareArea;
    const pathLength = pathArea / breadth;
    const perimeter = 2 * (pathLength + breadth);
    const picture = diagram(
      'A is a square made of two identical L-shaped tiles. Its dividing line runs right from the left edge, down, then right to the right edge. B shows the same tiles moved into a rectangle; its dividing line runs down from the top edge, right, then down to the bottom edge. Matching tile colours identify the same pieces in both arrangements.',
      [
        polygon([[20, 50], [110, 50], [110, 110], [65, 110], [65, 80], [20, 80]], '#d5e8f4'),
        polygon([[20, 80], [65, 80], [65, 110], [110, 110], [110, 140], [20, 140]]),
        polygon([[205, 65], [295, 65], [295, 125], [250, 125], [250, 95], [205, 95]], '#d5e8f4'),
        polygon([[160, 65], [205, 65], [205, 95], [250, 95], [250, 125], [160, 125]]),
        label(59, 30, 'A'), label(221, 30, 'B'),
      ],
    );
    return finish(
      [
        'Two identical L-shaped tiles make square A. The same two tiles are moved, without cutting, to make rectangle B as shown.',
        `Square A has an area of ${squareArea} m².`,
        'Copies of B are joined at their short sides in one straight row to make a rectangular path. There are no gaps or overlaps. The path has the same width as B.',
        `The path has an area of ${pathArea} m².`,
      ],
      '(a) How long is rectangle B? (b) What is the perimeter of the whole path?',
      JSON.stringify([String(length), String(perimeter)]), picture,
      'Find the side of square A. Compare the matching steps in the two arrangements, then use the path area.',
      [
        { text: 'Find the side of square A using a multiplication fact.', equation: `${side} × ${side} = ${squareArea}; side = ${side} m` },
        { text: 'In A, two matching horizontal steps span the square. B has three of these steps across its length. Find the length of B for part (a).', equation: `${side} ÷ 2 × 3 = ${length} m` },
        { text: 'Moving the tiles keeps their total area the same. Use this area to find the width of B.', equation: `${squareArea} ÷ ${length} = ${breadth} m` },
        { text: 'The path has this same width. Divide its area by its width to find its length.', equation: `${pathArea} ÷ ${breadth} = ${pathLength} m` },
        { text: 'For part (b), add all four outside sides of the path.', equation: `2 × (${pathLength} + ${breadth}) = ${perimeter} m` },
      ],
      {
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            { label: '(a) Length of B (m)', decimal: true },
            { label: '(b) Perimeter of the path (m)', decimal: true },
          ],
        },
      },
    );
  }

  const smallSide = rng.pick([3, 4, 5, 7, 8, 9, 10, 11, 12]);
  const shadedArea = smallSide * smallSide;
  const rectangleArea = 2 * shadedArea;
  const length = 2 * smallSide;
  const apexX = 90 + 26 * rng.int(1, 4);
  const picture = diagram(
    'A large square is filled by two equal smaller squares across the top and one rectangle underneath. T is on the top edge of the lower rectangle. The triangle joining T to both bottom corners of that rectangle is shaded.',
    [
      rectangle(90, 25, 65, 65), rectangle(155, 25, 65, 65),
      rectangle(90, 90, 130, 65),
      polygon([[apexX, 90], [220, 155], [90, 155]], '#d5e8f4'),
      label(apexX - 5, 82, 'T'),
    ],
  );
  return finish(
    [
      'The large square is filled by two identical smaller squares above one rectangle, as shown.',
      'T lies on the top edge of the lower rectangle, between its corners. The shaded triangle joins T to both bottom corners of the rectangle.',
      `The shaded triangle has an area of ${shadedArea} cm².`,
    ],
    'What is the length of the lower rectangle?', String(length), picture,
    'The shaded triangle and the lower rectangle have the same base and height. Compare the rectangle with the two small squares.',
    [
      { text: 'The triangle has the full rectangle length as its base and the rectangle breadth as its height. Its area is half the rectangle area.', equation: `${shadedArea} × 2 = ${rectangleArea} cm²` },
      { text: 'The large shape is a square. Its lower rectangle is one small-square side high and two small-square sides long, so it has the area of two small squares.', equation: `${rectangleArea} ÷ 2 = ${shadedArea} cm² per small square` },
      { text: 'Find the side of a small square using a multiplication fact.', equation: `${smallSide} × ${smallSide} = ${shadedArea}; side = ${smallSide} cm` },
      { text: 'The rectangle length is two small-square sides.', equation: `2 × ${smallSide} = ${length} cm` },
    ],
    { unit: 'cm' },
  );
}
