import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { GridDrawingPicture, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'rag-p4-adjoining-rectangle-and-squares',
  level: 4,
  title: 'Measure a panel made of squares and a rectangle',
  objective: 'Use shared edges to find the size of a panel and work out its area or perimeter.',
  skillIds: ['P4.S.AREA.02', 'P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-adjoining-rectangle-and-squares-shared-edge-area',
};

function panel(columns: number, rows: number, joins: GridSegment[], caption: string): GridDrawingPicture {
  return {
    type: 'grid-drawing', columns, rows, caption,
    segments: [
      [[0, 0], [columns, 0]], [[columns, 0], [columns, rows]],
      [[columns, rows], [0, rows]], [[0, rows], [0, 0]], ...joins,
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = (hashString(String(seed)) % 3 + (index % 3) + 3) % 3;
  const cmPerGridSpace = rng.pick([3, 6, 7, 8, 9, 10, 11]);

  if (variant === 0) {
    const side = 2 * cmPerGridSpace;
    const middleColumns = rng.int(3, 6);
    const middle = middleColumns * cmPerGridSpace;
    const rightJoin = 2 + middleColumns;
    const squareArea = side * side;
    const middleArea = middle * side;
    const total = middleArea + 2 * squareArea;
    return {
      key,
      context: [
        'Two matching square tiles and a rectangular tile fit together in a strip. Use the measurements below for their lengths.',
        `The middle tile measures ${middle} cm from left to right. The bottom edge of the right square is ${side} cm long.`,
      ],
      picture: panel(rightJoin + 2, 2, [[[2, 0], [2, 2]], [[rightJoin, 0], [rightJoin, 2]]],
        'A rectangle with a square joined along each short side.'),
      prompt: 'How many square centimetres do the three tiles cover altogether?',
      answer: String(total), unit: 'cm²',
      choices: rng.shuffle([squareArea, middleArea, squareArea + middleArea, total].map(String)),
      hint: 'Look at the edge where the middle tile meets a square. How tall must the middle tile be?',
      workedSteps: [
        { text: `The tiles share a full edge, so the middle tile is ${side} cm tall.` },
        { text: 'Find the area of the middle tile.', equation: `${middle} × ${side} = ${middleArea} cm²` },
        { text: 'Find the area of one square tile.', equation: `${side} × ${side} = ${squareArea} cm²` },
        { text: 'Count the middle tile and both squares.', equation: `${middleArea} + ${squareArea} + ${squareArea} = ${total} cm²` },
      ],
      explanation: `The square side gives the height of the strip. The middle tile covers ${middleArea} cm² and the two squares cover ${2 * squareArea} cm² altogether.`,
    };
  }

  if (variant === 1) {
    const height = 2 * cmPerGridSpace;
    const spanColumns = rng.int(5, 9);
    const span = spanColumns * cmPerGridSpace;
    const length = height + span;
    const perimeter = 2 * (length + height);
    const area = length * height;
    return {
      key,
      context: [
        'A rectangular mat is sewn from two matching square patches and one rectangular patch. Only the join beside the left square is drawn. Use the given measurements.',
        `The mat is ${height} cm tall. From that join to the right end of the mat is ${span} cm.`,
      ],
      picture: panel(2 + spanColumns, 2, [[[2, 0], [2, 2]]],
        'A full-height square at the left end of a rectangular mat. The line marks its right edge.'),
      prompt: '(a) How far is it around the outside of the mat?\n(b) What area does the whole mat cover?',
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Perimeter (cm)', secondLabel: '(b) Area (cm²)' },
      answer: JSON.stringify([String(perimeter), String(area)]),
      hint: 'Start at the left end and trace the top edge. Which part of that edge is as long as the mat is tall?',
      workedSteps: [
        { text: `The left patch is a square that fills the height of the mat. Its top edge is ${height} cm long.` },
        { text: 'Add the square side and the distance from the join to the right end.', equation: `${height} + ${span} = ${length} cm` },
        { text: '(a) Count two long edges and two short edges.', equation: `2 × (${length} + ${height}) = ${perimeter} cm` },
        { text: '(b) Multiply the full length by the height.', equation: `${length} × ${height} = ${area} cm²` },
      ],
      explanation: `Both answers use the full mat, which measures ${length} cm by ${height} cm. Only the four outside edges count towards its perimeter.`,
    };
  }

  const side = cmPerGridSpace;
  const tileHeight = 2 * side;
  const width = 4 * side;
  const height = 3 * side;
  const area = width * height;
  return {
    key,
    context: [
      'Six equal square tiles and one rectangular tile cover a board, with no spaces between them.',
      `The rectangular tile is ${tileHeight} cm tall.`,
    ],
    picture: panel(4, 3, [
      [[1, 0], [1, 3]], [[0, 1], [1, 1]], [[0, 2], [4, 2]],
      [[2, 2], [2, 3]], [[3, 2], [3, 3]],
    ], 'Four squares run along the bottom. Two more are stacked above the bottom left square. The rectangle fills the top right.'),
    prompt: 'What is the area of the board?',
    unit: 'cm²', answer: String(area),
    hint: 'Look to the left of the rectangular tile. How many square sides fit along its height?',
    workedSteps: [
      { text: 'Two square sides match the height of the rectangular tile. Find one side.', equation: `${tileHeight} ÷ 2 = ${side} cm` },
      { text: 'Four squares fit across the bottom of the board.', equation: `4 × ${side} = ${width} cm` },
      { text: 'Three squares fit up the left edge.', equation: `3 × ${side} = ${height} cm` },
      { text: 'Use the width and height of the whole board.', equation: `${width} × ${height} = ${area} cm²` },
    ],
    explanation: `Each square side is ${side} cm. The tiles fill a rectangle ${width} cm wide and ${height} cm tall.`,
  };
}
