import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'p5-rag-composite-area-fractions',
  level: 5,
  title: 'Fractions of combined areas',
  objective: 'Compare shaded or unshaded area with the whole figure using a common area unit.',
  skillIds: ['P5.S.AREA.03', 'P5.S.FRAC.01', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p5-composite-area-fractions',
};

type AreaPicture = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>;
type Piece = AreaPicture['pieces'][number];
type Steps = NonNullable<Question['workedSteps']>;

function simplest(n: number, d: number): string {
  let a = n, b = d;
  while (b !== 0) { const remainder = a % b; a = b; b = remainder; }
  return `${n / a}/${d / a}`;
}

function explain(steps: Steps): string {
  return steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');
}

function drawSquare(x: number, y: number, name: string, shadedParts?: number[]): Piece[] {
  const corners: Batch9Point[] = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  if (!shadedParts) return [{ label: name, kind: 'square', points: corners, shaded: false }];
  const centre: Batch9Point = [x + 0.5, y + 0.5];
  return corners.map((corner, i) => ({
    label: `${name}, triangle ${i + 1}`,
    kind: 'triangle',
    points: [corner, corners[(i + 1) % 4], centre],
    shaded: shadedParts.includes(i),
  }));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((hashString(`${RAG_PATTERN.id}:${seed}`) + index) % 3 + 3) % 3;

  if (slot === 2) {
    const denominators = [3, 5, 7, 8, 9];
    const a = r.pick(denominators);
    const b = r.pick(denominators.filter(value => value !== a));
    const total = a + b - 1;
    const unshaded = total - 1;
    const answer = simplest(unshaded, total);
    const workedSteps: Steps = [
      { text: `Use the shared shaded area as 1 area unit. Rectangle A has ${a} units and rectangle B has ${b} units.` },
      { text: 'Adding both rectangles counts the shared part twice. Subtract it once to find the whole figure.', equation: `${a} + ${b} − 1 = ${total}` },
      { text: 'Remove the shaded unit to find the unshaded area.', equation: `${total} − 1 = ${unshaded}` },
      { text: 'Compare the unshaded area with the whole figure.', equation: `${unshaded}/${total} = ${answer}` },
    ];
    return {
      key,
      context: [
        'Two rectangular sheets, A and B, partly cover each other. Only the part shared by both sheets is shaded.',
        `The shaded part is 1/${a} of rectangle A and 1/${b} of rectangle B.`,
        'The complete figure includes all the area covered by either rectangle. The shared part belongs to the figure only once.',
      ],
      prompt: 'What fraction of the complete figure is unshaded? Give your answer in simplest form.',
      answer,
      requireSimplified: true,
      hint: 'Use the shared shaded area as one unit. Work out the area of each rectangle in these units.',
      workedSteps,
      explanation: explain(workedSteps),
      proof: { op: '/', a: unshaded, b: total },
    };
  }

  const squareCount = r.int(5, 7);
  const dividedCount = r.int(1, 2);
  const divided = r.shuffle(Array.from({ length: squareCount }, (_, i) => i))
    .slice(0, dividedCount).sort((a, b) => a - b);
  const shadedParts = new Map<number, number[]>();
  for (const square of divided) {
    shadedParts.set(square, r.shuffle([0, 1, 2, 3]).slice(0, r.int(1, 3)));
  }
  const stepped = r.chance(0.5);
  const columns = stepped ? Math.ceil(squareCount / 2) : squareCount;
  const offsetX = (8 - columns) / 2;
  const offsetY = stepped ? 0.5 : 1;
  const pieces: Piece[] = [];
  for (let i = 0; i < squareCount; i++) {
    const lowerRow = stepped && i >= columns;
    const x = offsetX + (lowerRow ? i - columns + 0.5 : i);
    const y = offsetY + (lowerRow ? 1 : 0);
    pieces.push(...drawSquare(x, y, `Square ${i + 1}`, shadedParts.get(i)));
  }
  const counts = divided.map(square => shadedParts.get(square)!.length);
  const shaded = counts.reduce((sum, count) => sum + count, 0);
  const total = 4 * squareCount;
  const answer = simplest(shaded, total);
  const workedSteps: Steps = [
    { text: 'Each identical square has the same area as 4 small triangles, including the squares without dividing lines.' },
    { text: 'Count the area of the whole patchwork in small-triangle units.', equation: `${squareCount} × 4 = ${total}` },
    {
      text: `There are ${shaded} shaded small triangles altogether.`,
      ...(counts.length === 2 ? { equation: `${counts.join(' + ')} = ${shaded}` } : {}),
    },
    { text: 'Put the shaded area over the total area, then simplify.', equation: `${shaded}/${total} = ${answer}` },
  ];
  const picture: AreaPicture = { type: 'batch9-early', layout: 'area-fraction', pieces };
  return {
    key,
    context: [
      `A patchwork is made from ${squareCount} identical squares joined along their edges, without any overlap.`,
      'Every square belongs to the whole patchwork. Each square with crossing lines is divided into 4 triangles of equal area. Only the blue triangles are shaded.',
    ],
    prompt: 'What fraction of the whole patchwork is shaded? Give your answer in simplest form.',
    picture,
    answer,
    requireSimplified: true,
    hint: 'Use one small triangle as your area unit. How many of these units fit into each square?',
    workedSteps,
    explanation: explain(workedSteps),
    proof: { op: '/', a: shaded, b: total },
  };
}
