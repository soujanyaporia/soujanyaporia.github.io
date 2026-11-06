import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark as Mark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-plane-shape-outline',
  level: 1 as const,
  title: 'Trace the outline',
  objective: 'Match an object to a plane shape or name the shape of a shaded face.',
  skillIds: ['P1.S.SHAPE.01'],
  canonicalPatternId: 'p1-recognize-plane-shape-by-outline',
};

type Shape = 'circle' | 'triangle' | 'square' | 'rectangle';
type Point = [number, number];

const clues: Record<Shape, string> = {
  circle: 'The edge curves all the way round with no corners.',
  triangle: 'Three straight sides meet at three corners.',
  square: 'There are four equal straight sides and four square corners.',
  rectangle: 'There are four square corners, two long sides and two short sides.',
};

function polygon(points: Point[], fill?: string): Mark {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';
  return { kind: 'path', d, fill };
}

function line(x1: number, y1: number, x2: number, y2: number): Mark {
  return { kind: 'line', x1, y1, x2, y2 };
}

function circle(cx: number, cy: number, r: number): Mark {
  return { kind: 'circle', cx, cy, r };
}

function objectQuestion(key: string, rng: Rng): Question {
  const shapes = rng.shuffle<Shape>(['circle', 'triangle', 'square', 'rectangle']);
  const target = rng.pick(shapes);
  const squareEnvelope = rng.chance(0.5);
  const marks: Mark[] = [];
  const descriptions: string[] = [];
  const labels = shapes.map((shape, i) => {
    const x = i % 2 === 0 ? 80 : 240;
    const y = i < 2 ? 46 : 144;
    const size = rng.int(19, 25);
    const label = String(i + 1);
    let name: string;
    if (shape === 'circle') {
      name = 'clock';
      marks.push(circle(x, y, size), line(x, y, x, y - 13), line(x, y, x + 10, y + 4));
    } else if (shape === 'triangle') {
      name = 'sign';
      marks.push(polygon([[x, y - size], [x + size + 6, y + size], [x - size - 6, y + size]]),
        line(x, y - 5, x, y + 7), circle(x, y + 13, 1.5));
    } else {
      const halfWidth = shape === 'square' ? size : size + 16;
      marks.push(polygon([[x - halfWidth, y - size], [x + halfWidth, y - size],
        [x + halfWidth, y + size], [x - halfWidth, y + size]]));
      if ((shape === 'square') === squareEnvelope) {
        name = 'envelope';
        marks.push(line(x - halfWidth, y - size, x, y + 4), line(x, y + 4, x + halfWidth, y - size));
      } else {
        name = 'cracker';
        for (const dx of [-8, 8]) for (const dy of [-8, 8]) marks.push(circle(x + dx, y + dy, 2));
      }
    }
    marks.push({ kind: 'text', x: x - 5, y: y + 43, text: label });
    descriptions.push(`Picture ${label}, a ${name}. ${clues[shape]}`);
    return label;
  });
  const answer = labels[shapes.indexOf(target)];
  const goal = target === 'rectangle' ? 'a rectangle with two long sides and two short sides' : `a ${target}`;
  const steps = [
    'Trace just the outside edge of each object. Leave out the lines inside it.',
    `Trace picture ${answer}. ${clues[target]} Its outline is a ${target}.`,
  ];
  return {
    key, prompt: `Look for ${goal}. Which numbered picture matches?`,
    picture: { type: 'batch11-upper', label: descriptions.join(' '), marks },
    choices: labels, answer, hint: 'Follow each outside edge with your finger.',
    explanation: steps.join(' '), workedSteps: steps.map(text => ({ text })),
  };
}

function faceQuestion(key: string, rng: Rng): Question {
  const height = rng.int(60, 85);
  const square = rng.chance(0.5);
  const width = square ? height : height + rng.int(29, 45);
  const left = (320 - width) / 2, right = left + width;
  const top = (200 - height) / 2 + 10, bottom = top + height;
  const dx = rng.pick([-1, 1]) * rng.int(22, 34), dy = -rng.int(18, 27);
  const side = dx > 0 ? right : left;
  const answer = square ? 'square' : 'rectangle';
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `A box with its front face shaded. ${clues[answer]} The top and side faces are unshaded.`,
    marks: [
      polygon([[left, top], [right, top], [right + dx, top + dy], [left + dx, top + dy]]),
      polygon([[side, top], [side + dx, top + dy], [side + dx, bottom + dy], [side, bottom]]),
      polygon([[left, top], [right, top], [right, bottom], [left, bottom]], '#789b90'),
    ],
  };
  const steps = [
    'Trace the shaded face. Each of its four corners is a square corner.',
    square ? 'All four sides are the same length, so its best name is square.'
      : 'Two sides are long and two are short, so the face is a rectangle.',
  ];
  return {
    key, prompt: 'What shape is the shaded face of the box? Write its best name.',
    picture, answer, hint: 'Look only at the shaded part. Compare its sides and corners.',
    explanation: steps.join(' '), workedSteps: steps.map(text => ({ text })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  return rng.int(1, 3) <= 2 ? objectQuestion(key, rng) : faceQuestion(key, rng);
}
