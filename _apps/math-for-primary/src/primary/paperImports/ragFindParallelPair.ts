import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-rag-find-parallel-pair',
  level: 3,
  title: 'Find the parallel pair',
  objective: 'Identify and name both lines that stay the same distance apart.',
  skillIds: ['P3.S.LINES.01'],
  canonicalPatternId: 'p3-parallel-line-identification',
};

type Point = [number, number];
type Edge = [number, number];
type Scene = {
  kind: 'crossing' | 'shape' | 'grid';
  points: Point[];
  edges: Edge[];
  pair: [number, number];
};

function makeScene(r: Rng): Scene {
  const kind = r.pick(['crossing', 'shape', 'grid'] as const);
  if (kind === 'crossing') {
    const drop = r.int(1, 2);
    return {
      kind,
      points: [[0, 1], [12, 1 + drop], [0, 4], [12, 4 + drop],
        [4, 0], [2, 7], [6, 0], [r.int(6, 7), 7], [9, 0], [11, 7]],
      edges: [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]], pair: [0, 1],
    };
  }
  if (kind === 'shape') {
    const right = r.int(9, 11), top = r.int(1, 2), bottom = r.int(5, 6);
    return {
      kind,
      points: [[r.int(3, 5), top], [right, top], [right, bottom], [r.int(0, 2), bottom]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0]], pair: [0, 2],
    };
  }
  const across = r.int(2, 3), down = r.int(3, 4), odd = r.int(0, 2);
  // Sometimes all three lines have the same length, so length alone cannot identify the pair.
  const swap = across !== down && r.chance(0.5);
  const oddAcross = swap ? down : 1, oddDown = swap ? across : 4;
  const points: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const x = 4 * i, y = r.int(1, 2);
    points.push([x, y], [x + (i === odd ? oddAcross : across), y + (i === odd ? oddDown : down)]);
  }
  const [first, second] = [0, 1, 2].filter(i => i !== odd);
  return { kind, points, edges: [[0, 1], [2, 3], [4, 5]], pair: [first, second] };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const scene = makeScene(r);
  const names = r.shuffle(Array.from('ABCDEFGHJKLMNPRSTUVWXYZ')).slice(0, scene.points.length);
  const flipX = r.chance(0.5), flipY = r.chance(0.5);
  const points = scene.points.map(([x, y]): Point => [flipX ? 12 - x : x, flipY ? 7 - y : y]);
  const screen = points.map(([x, y]): Point => [40 + 20 * x, 30 + 20 * y]);
  const lines = scene.edges.map(([a, b]) => names[a] + names[b]);
  const parallel = scene.pair.map(i => lines[i]);
  const [one, two] = parallel;
  const marks: Batch11UpperMark[] = [];
  // Place each letter beyond its endpoint, away from neighbouring vertices.
  const labels = screen.map(([x, y], i) => {
    const neighbours = scene.edges.filter(e => e.includes(i)).map(([a, b]) => screen[i === a ? b : a]);
    const dx = neighbours.reduce((sum, p) => sum + x - p[0], 0);
    const dy = neighbours.reduce((sum, p) => sum + y - p[1], 0);
    const length = Math.hypot(dx, dy);
    return { kind: 'text' as const, text: names[i], x: x + 15 * dx / length - 6, y: y + 15 * dy / length + 6 };
  });
  if (scene.kind === 'grid') {
    for (let x = 40; x <= 280; x += 20) {
      for (let y = 30; y <= 170; y += 20) {
        if (labels.some(t => x >= t.x - 2 && x <= t.x + 17 && y >= t.y - 16 && y <= t.y + 3)) continue;
        marks.push({ kind: 'circle', cx: x, cy: y, r: 0.5 });
      }
    }
  }
  for (const [a, b] of scene.edges) {
    marks.push({ kind: 'line', x1: screen[a][0], y1: screen[a][1], x2: screen[b][0], y2: screen[b][1] });
  }
  let observation: string;
  let cornerDescription = '';
  if (scene.kind === 'shape') {
    for (const [corner, other] of [[1, 2], [2, 1]]) {
      const [x, y] = screen[corner];
      const dx = Math.sign(screen[0][0] - x) * 11;
      const dy = Math.sign(screen[other][1] - y) * 11;
      marks.push({ kind: 'path', d: `M ${x + dx} ${y} v ${dy} h ${-dx}` });
    }
    cornerDescription = ` Square corners are marked at ${names[1]} and ${names[2]}.`;
    observation = `The square corners show that ${one} and ${two} each meet ${lines[1]} at a right angle.`;
  } else if (scene.kind === 'grid') {
    const [a, b] = scene.edges[scene.pair[0]];
    const dx = points[b][0] - points[a][0], dy = points[b][1] - points[a][1];
    observation = `Follow ${one} and ${two} from left to right. Each goes ${Math.abs(dx)} spaces across and ${Math.abs(dy)} spaces ${dx * dy > 0 ? 'down' : 'up'}.`;
  } else {
    observation = `Trace ${one} and ${two} from left to right. Their ends are just as far apart on the right as on the left.`;
  }
  marks.push(...labels);
  const locations = points.map(([x, y], i) => `${names[i]} (${x}, ${y})`).sort().join(', ');
  const workedSteps = [
    { text: observation },
    { text: 'These lines run in the same direction. They would stay the same distance apart if you made them longer.', equation: `${one} ∥ ${two}` },
  ];
  const base = {
    key, picture: { type: 'batch11-upper' as const, marks,
      label: `The lines are ${[...lines].sort().join(', ')}. Endpoint positions in equal steps right and down from the top left are ${locations}.${cornerDescription}` },
    hint: 'Imagine making each line longer. Look for two that would keep the same gap.',
    workedSteps, explanation: workedSteps.map(s => s.text).join(' '),
  };
  if (scene.kind === 'crossing') {
    const [a, b, c] = r.shuffle(lines.filter(line => !parallel.includes(line)));
    const together = (u: string, v: string) => [u, v].sort().join(' and ');
    const answer = together(one, two);
    return { ...base, prompt: 'Which pair of lines is parallel?', answer,
      choices: r.shuffle([answer, together(one, a), together(two, b), together(a, c)]) };
  }
  return { ...base, prompt: 'Select the names of the two parallel lines.', answer: JSON.stringify(parallel),
    structuredResponse: { kind: 'named-pair', options: r.shuffle(lines) } };
}
