import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {GridPoint, GridSegment, GridDrawingPicture} from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'rag-prism-pyramid-net-recognition-repair',
  level: 6,
  title: 'Which nets make the prism?',
  objective: 'Check matching edges and opposite ends to recognise nets of a triangular prism.',
  skillIds: ['P4.S.SOLID.03'],
  canonicalPatternId: 'prism-pyramid-net-recognition-repair',
} as const;

type Arrangement = 'opposite-same-panel' | 'opposite-different-panels' | 'reversed-triangle' | 'same-end';
const LABELS = ['A', 'B', 'C', 'D'];
const POSITIONS = 'A: upper left; B: upper right; C: lower left; D: lower right.';

function drawNet(kind: Arrangement, depth: number, mirror: boolean, ox: number, oy: number): GridSegment[] {
  const widths = kind === 'opposite-same-panel' || kind === 'reversed-triangle'
    ? [3, 4, 5] : [4, 5, 3];
  const boundaries = [0];
  for (const width of widths) boundaries.push(boundaries[boundaries.length - 1] + width);
  const edges = new Map<string, GridSegment>();
  const transform = ([x, y]: GridPoint): GridPoint => [ox + (mirror ? 12 - x : x), oy + y];
  const polygon = (points: GridPoint[]) => {
    points.forEach((point, i) => {
      const a = transform(point), b = transform(points[(i + 1) % points.length]);
      const key = [a.join(','), b.join(',')].sort().join('|');
      edges.set(key, [a, b]);
    });
  };
  widths.forEach((_, i) => polygon([
    [boundaries[i], 0], [boundaries[i + 1], 0],
    [boundaries[i + 1], depth], [boundaries[i], depth],
  ]));
  const triangle = (panel: number, side: 'top' | 'bottom', apex: 'left' | 'right', rise: number) => {
    const left = boundaries[panel], right = boundaries[panel + 1];
    const y = side === 'top' ? 0 : depth;
    polygon([[left, y], [right, y], [apex === 'left' ? left : right, y + (side === 'top' ? -rise : rise)]]);
  };
  if (kind === 'opposite-same-panel' || kind === 'reversed-triangle') {
    triangle(1, 'top', 'left', 3);
    triangle(1, 'bottom', kind === 'reversed-triangle' ? 'right' : 'left', 3);
  } else {
    triangle(0, 'top', 'left', 3);
    triangle(2, kind === 'same-end' ? 'top' : 'bottom', 'right', 4);
  }
  return [...edges.values()];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const scale = r.pick([2, 3, 4]);
  const depth = r.pick([2, 3, 4]);
  const kinds: Arrangement[] = r.shuffle<Arrangement>([
    'opposite-same-panel', 'opposite-different-panels', 'reversed-triangle', 'same-end',
  ]);
  const segments = kinds.flatMap((kind, i) =>
    drawNet(kind, depth, r.chance(0.5), 1 + (i % 2) * 15, 5 + Math.floor(i / 2) * 16));
  const picture: GridDrawingPicture = {
    type: 'grid-drawing', columns: 29, rows: 30, segments, caption: POSITIONS,
  };
  const goodLabels = LABELS.filter((_, i) => kinds[i].startsWith('opposite-'));
  const answer = goodLabels.join(' and ');
  const allPairs: string[] = [];
  for (let a = 0; a < LABELS.length; a++) {
    for (let b = a + 1; b < LABELS.length; b++) allPairs.push(`${LABELS[a]} and ${LABELS[b]}`);
  }
  const choices = r.shuffle([answer, ...r.shuffle(allPairs.filter(pair => pair !== answer)).slice(0, 3)]);
  const details: Record<Arrangement, string> = {
    'opposite-same-panel': 'The triangles close opposite ends. Their edges match the widths of the rectangles, including where the strip joins up.',
    'opposite-different-panels': 'The triangles are attached to different rectangles, but they still close opposite ends with matching edges.',
    'reversed-triangle': 'The lower triangle faces the wrong way. Its two free edges do not match the neighbouring rectangle widths when the strip wraps around.',
    'same-end': 'Both triangles are on the same side of the strip. They would cover the same end, leaving the other end open.',
  };
  const workedSteps = [
    {text: 'A triangular prism needs three rectangular side faces and two matching triangular end faces.'},
    {text: `The rectangle widths must match the ${3 * scale} cm, ${4 * scale} cm and ${5 * scale} cm sides of a triangle. The two triangles must close different ends.`},
    ...kinds.map((kind, i) => ({text: `${LABELS[i]}: ${details[kind]}`})),
    {text: `${answer} are the two nets that make the prism.`},
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `The triangular prism has two right-angled triangular end faces with side lengths ${3 * scale} cm, ${4 * scale} cm and ${5 * scale} cm. Its length is ${depth * scale} cm.`,
      `Each grid step represents ${scale} cm in all four diagrams.`,
      POSITIONS,
    ],
    prompt: 'Which two diagrams fold into this triangular prism without overlapping faces or leaving gaps?',
    picture,
    answer,
    choices,
    hint: 'Imagine wrapping the three rectangles around the prism. Check which end each triangle closes and whether its edges fit.',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
