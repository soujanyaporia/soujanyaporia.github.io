import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-triangle-as-fraction-of-enclosing-area',
  level: 5,
  title: 'Triangle areas inside squares and rectangles',
  objective: 'Use shared bases, heights and equal subdivisions to find triangle regions from a known enclosing area.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-triangle-as-fraction-of-enclosing-area',
} as const;

type Point = [number, number];
type Step = NonNullable<Question['workedSteps']>[number];

function polygon(points: Point[], fill = 'none'): Batch11UpperMark {
  return {
    kind: 'path',
    d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z',
    fill,
  };
}

function divider(a: Point, b: Point): Batch11UpperMark {
  return { kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], dashed: true };
}

function letter(text: string, point: Point, dx: number, dy: number): Batch11UpperMark {
  return { kind: 'text', text, x: point[0] + dx, y: point[1] + dy };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 3;
  const square = variant === 0;
  // Multiples of eight keep every square subdivision integral.
  // Even rectangle areas also keep the requested areas integral.
  const area = square ? 8 * rng.int(12, 100) : 2 * rng.int(36, 210);
  const left = square ? 90 : 40;
  const right = square ? 230 : 280;
  const top = square ? 30 : 50;
  const bottom = square ? 170 : 160;
  const P: Point = [left, top];
  const Q: Point = [right, top];
  const R: Point = [right, bottom];
  const S: Point = [left, bottom];
  const marks: Batch11UpperMark[] = [];
  let prompt: string;
  let context: string[];
  let answer: number;
  let hint: string;
  let workedSteps: Step[];

  if (square) {
    const E: Point = [left, (top + bottom) / 2];
    const F: Point = [(left + right) / 2, bottom];
    marks.push(
      polygon([Q, E, F], '#d5e8d7'),
      polygon([P, Q, R, S]),
      divider([left, E[1]], [right, E[1]]),
      divider([F[0], top], F),
      letter('E', E, -19, 6),
      letter('F', F, -5, 23),
    );
    context = [
      'PQRS is a square split into 4 equal smaller squares in 2 rows and 2 columns.',
      `Square PQRS has an area of ${area} cm².`,
      'E is halfway along PS and F is halfway along SR. EF is a diagonal of the lower-left small square.',
      'Only triangle QEF is shaded.',
    ];
    prompt = 'How much area does the shaded triangle QEF cover?';
    const smallArea = area / 4;
    const cornerArea = smallArea / 2;
    const outside = 2 * smallArea + cornerArea;
    answer = area - outside;
    hint = 'Find the areas of the three unshaded corner triangles, then take them away from the whole square.';
    workedSteps = [
      { text: 'Share the whole area equally among the four small squares.', equation: `${area} ÷ 4 = ${smallArea} cm²` },
      {
        text: 'Each of triangles PQE and QRF has a full square side as its base and half a side as its perpendicular height. Each covers one quarter of the whole square.',
        equation: `Area of PQE = area of QRF = ${smallArea} cm²`,
      },
      { text: 'The diagonal EF cuts the lower-left small square into two equal-area triangles.', equation: `Area of ESF = ${smallArea} ÷ 2 = ${cornerArea} cm²` },
      { text: 'Add the areas of the three unshaded triangles.', equation: `${smallArea} + ${smallArea} + ${cornerArea} = ${outside} cm²` },
      { text: 'Remove their total from the whole square.', equation: `${area} − ${outside} = ${answer} cm²` },
    ];
  } else {
    const position = rng.pick([0.25, 0.375, 0.625, 0.75]);
    const T: Point = [left + (right - left) * position, top];
    marks.push(
      polygon([S, T, R], '#d5e8d7'),
      polygon([P, Q, R, S]),
      letter('T', T, -5, -10),
    );
    context = [
      'PQRS is a rectangle. P and Q are the top corners.',
      `Rectangle PQRS has an area of ${area} cm².`,
      'T lies on PQ between P and Q. Only triangle STR is shaded.',
    ];
    const triangleArea = area / 2;
    workedSteps = [
      { text: 'Triangle STR uses the whole bottom side SR as its base. The perpendicular distance from T to SR equals the rectangle height QR.' },
      { text: 'A triangle has half the area of a rectangle with the same base and perpendicular height.', equation: `Area of STR = ${area} ÷ 2 = ${triangleArea} cm²` },
    ];
    if (variant === 1) {
      prompt = 'How much area does the shaded triangle STR cover?';
      answer = triangleArea;
      hint = 'Compare the base and perpendicular height of triangle STR with those of the rectangle.';
    } else {
      prompt = 'What is the combined area of the two unshaded triangles PST and TQR?';
      answer = area - triangleArea;
      hint = 'Find the shaded triangle area first. The two unshaded triangles fill the rest of the rectangle.';
      workedSteps.push({
        text: 'The two unshaded triangles together fill the area outside STR. Subtract the shaded area.',
        equation: `${area} − ${triangleArea} = ${answer} cm²`,
      });
    }
  }

  marks.push(
    letter('P', P, -17, -8),
    letter('Q', Q, 5, -8),
    letter('R', R, 5, 23),
    letter('S', S, -17, 23),
  );
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `${context.join(' ')} ${prompt}`,
    marks,
  };
  return {
    key,
    prompt,
    context,
    picture,
    answer: String(answer),
    unit: 'cm²',
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
