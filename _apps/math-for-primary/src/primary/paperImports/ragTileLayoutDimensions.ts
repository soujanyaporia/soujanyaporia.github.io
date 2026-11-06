import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridDrawingPicture, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'rag-p3-tile-layout-dimensions',
  level: 3,
  title: 'Measure one tile or the whole square',
  objective: 'Use equal tile edges in a layout to find a missing length, then find an area or a perimeter.',
  skillIds: ['P3.S.AREA.02', 'P3.S.AREA.03', 'P3.S.MD.04', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-dimensions-from-a-tiled-or-partitioned-layout',
};

const horizontal = (x: number, y: number, length: number): GridSegment => [[x, y], [x + length, y]];
const vertical = (x: number, y: number, length: number): GridSegment => [[x, y], [x, y + length]];
function outline(x: number, y: number, width: number, height: number): GridSegment[] {
  return [horizontal(x, y, width), horizontal(x, y + height, width),
    vertical(x, y, height), vertical(x + width, y, height)];
}

function diagram(columns: number, rows: number, edges: GridSegment[], marks: GridSegment[], caption: string): GridDrawingPicture {
  return { type: 'grid-drawing', columns, rows, givenSegments: edges, segments: marks, caption };
}

function question(key: string, fields: Omit<Question, 'key' | 'explanation' | 'workedSteps'>,
  steps: { text: string; equation: string }[]): Question {
  return { ...fields, key, workedSteps: steps, explanation: steps.map(s => `${s.text} ${s.equation}`).join(' ') };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) % 4 + index) % 4 + 4) % 4;

  if (variant === 0) {
    const blocks = rng.int(3, 5);
    const span = 2 * rng.int(6, 17);
    const side = blocks * span;
    const tilesPerStrip = 2 * blocks;
    const tileCount = tilesPerStrip * blocks;
    const size = 2 * blocks;
    const edges = outline(1, 1, size, size);
    edges.push(vertical(3, 1, size));
    for (let band = 0; band < blocks; band++) {
      const y = 1 + 2 * band;
      if (band > 0) edges.push(horizontal(1, y, 2));
      edges.push(band % 2 === 0 ? horizontal(1, y + 1, 2) : vertical(2, y, 2));
    }
    const marks = [horizontal(1, 0, 2), vertical(0, 1, 2)];
    return question(key, {
      context: ['Identical rectangular tiles cover a square floor. The picture shows the tile edges in the first strip. The same pattern fills the rest of the floor.',
        `The two marks beside the top left corner are each ${span} cm long.`],
      picture: diagram(size + 1, size + 1, edges, marks, 'Left strip of a square floor with two measuring marks'),
      prompt: '(a) How many tiles cover the floor? (b) How far is it around the floor?',
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Tiles', secondLabel: '(b) Perimeter (cm)' },
      answer: JSON.stringify([String(tileCount), String(4 * side)]),
      hint: 'Look for pairs of tiles that make squares. Count those squares down the strip, then think about how many strips fit across.',
    }, [
      { text: `Each pair of tiles makes a square. There are ${blocks} such squares down the strip. Count the tiles in that strip.`,
        equation: `${blocks} × 2 = ${tilesPerStrip} tiles` },
      { text: `The floor is square, so ${blocks} strips fit across. Count the tiles in all the strips.`,
        equation: `${blocks} × ${tilesPerStrip} = ${tileCount} tiles` },
      { text: 'Each small square has the marked height. Add those heights down one side of the floor.', equation: `${blocks} × ${span} = ${side} cm` },
      { text: 'Count all four sides of the floor.', equation: `4 × ${side} = ${4 * side} cm` },
    ]);
  }

  if (variant === 1) {
    const strips = rng.int(3, 6);
    const breadth = rng.int(5, 9);
    const side = strips * breadth;
    const perimeter = 2 * (side + breadth);
    const edges = outline(0, 0, strips, strips);
    for (let y = 1; y < strips; y++) edges.push(horizontal(0, y, strips));
    return question(key, {
      context: [`A square garden is divided into ${strips} identical rectangular beds. The perimeter of the garden is ${4 * side} m.`],
      picture: diagram(strips, strips, edges, [], 'Square garden with full-width beds'),
      prompt: '(a) How long is one side of the garden? (b) What is the perimeter of one bed?',
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Side of garden (m)', secondLabel: '(b) Perimeter of bed (m)' },
      answer: JSON.stringify([String(side), String(perimeter)]),
      hint: 'Start with the four equal sides of the garden. Which side of a bed goes all the way across?',
    }, [
      { text: 'Share the distance around the garden among its four equal sides.', equation: `${4 * side} ÷ 4 = ${side} m` },
      { text: `Each bed stretches right across the garden. The ${strips} short sides together fill one side of the garden.`,
        equation: `${side} ÷ ${strips} = ${breadth} m` },
      { text: 'A bed has two long sides and two short sides.', equation: `2 × (${side} + ${breadth}) = ${perimeter} m` },
    ]);
  }

  const centre = rng.int(2, 5);
  const breadth = rng.pick([2, 4, 6, 7, 8, 9]);
  const length = centre * breadth;
  const edges = outline(0, 0, centre + 2, centre);
  edges.push(vertical(1, 0, centre), vertical(centre + 1, 0, centre));
  for (let y = 1; y < centre; y++) edges.push(horizontal(1, y, centre));
  const picture = diagram(centre + 3, centre, edges, [vertical(centre + 3, 0, centre)],
    'Tiles with a height mark on the right');
  const context = [`${centre + 2} identical rectangular tiles make this panel. The mark on the right is ${length} cm long.`];
  const hint = 'Look at an end tile, then count the tiles stacked between the two ends. Which sides share the marked height?';
  const steps = [
    { text: 'An end tile stands on its short side. Its long side matches the full height.', equation: `Length = ${length} cm` },
    { text: `The ${centre} short sides in the middle stack reach the same height. Find one short side.`,
      equation: `${length} ÷ ${centre} = ${breadth} cm` },
  ];
  if (variant === 2) {
    const perimeter = 2 * (length + breadth);
    return question(key, { context, picture, hint, prompt: 'What is the perimeter of one tile, in centimetres?', unit: 'cm', answer: String(perimeter) },
      [...steps, { text: 'Count both long sides and both short sides of one tile.', equation: `2 × (${length} + ${breadth}) = ${perimeter} cm` }]);
  }

  const area = length * breadth;
  return question(key, { context, picture, hint, prompt: 'How many square centimetres does one tile cover?', unit: 'cm²',
    answer: String(area), choices: rng.shuffle([area, breadth * breadth, 2 * area, (centre + 2) * area]).map(String) },
    [...steps, { text: 'Multiply the two side lengths of one tile.', equation: `${length} × ${breadth} = ${area} cm²` }]);
}
