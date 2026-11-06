import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-straight-and-full-angle-arithmetic',
  level: 5,
  title: 'Find angles using straight lines and full turns',
  objective: 'Combine adjacent angles using right angles, straight lines and full turns.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'p5-straight-and-full-angle-arithmetic',
};

type Diagram = Extract<NonNullable<Question['picture']>, { type: 'batch11-upper' }>;
type Mark = Diagram['marks'][number];
type Ray = [name: string, degrees: number, length?: number];
const ox = 150;
const oy = 105;

function point(degrees: number, radius: number): [number, number] {
  const radians = degrees * Math.PI / 180;
  return [ox + radius * Math.cos(radians), oy - radius * Math.sin(radians)];
}

function text(x: number, y: number, value: string): Mark {
  return { kind: 'text', x: x - value.length * 3.2, y: y + 4, text: value };
}

function angleLabel(degrees: number, radius: number, value: string): Mark {
  const [x, y] = point(degrees, radius);
  return text(x, y, value);
}

// Increasing angles run anticlockwise in mathematical coordinates.
function arc(from: number, to: number, radius: number): Mark {
  const [x1, y1] = point(from, radius);
  const [x2, y2] = point(to, radius);
  return {
    kind: 'path',
    d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 0 ${x2} ${y2}`,
  };
}

function rightMarker(first: number, second: number): Mark {
  const [ax, ay] = point(first, 16);
  const [bx, by] = point(second, 16);
  return { kind: 'path', d: `M ${ax} ${ay} L ${ax + bx - ox} ${ay + by - oy} L ${bx} ${by}` };
}

function diagram(label: string, rays: Ray[], annotations: Mark[]): Diagram {
  const marks: Mark[] = [];
  for (const [name, degrees, length = 84] of rays) {
    const [x2, y2] = point(degrees, length);
    marks.push({ kind: 'line', x1: ox, y1: oy, x2, y2 });
    marks.push(angleLabel(degrees, length + 17, name));
  }
  marks.push(...annotations, text(ox, oy + 20, 'O'));
  return { type: 'batch11-upper', label, marks };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = (hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) % 3;
  const variant = (offset + ((Math.trunc(index) % 3 + 3) % 3)) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const straight = 'P, O and Q lie on a straight line, with O between P and Q.';
  const sketch = 'Use the angle facts, rather than measuring the sketch.';

  const make = (
    context: string[], target: string, answer: number,
    hint: string, steps: string[], picture: Diagram,
  ): Question => ({
    key,
    prompt: `What is the size of angle ${target}?`,
    context: [...context, sketch],
    answer: String(answer),
    unit: 'degrees',
    hint,
    workedSteps: steps.map(value => ({ text: value })),
    explanation: steps.join(' '),
    picture,
  });

  if (variant === 0) {
    const a = r.pick([32, 35, 38, 41, 44, 47, 50, 53]);
    const b = r.pick([18, 21, 24, 27, 30, 33]);
    const directionR = 180 - a;
    const directionS = directionR - b;
    const answer = 180 - a - b;
    return make(
      [
        straight,
        'Above the line, the rays are in the order OP, OR, OS, OQ.',
        `Angle POR = ${a}°.`,
        `Angle ROS = ${b}°.`,
      ],
      'SOQ', answer,
      'Add the two known neighbouring angles. A straight angle is 180°.',
      [
        `Angle POS = ${a}° + ${b}° = ${a + b}°.`,
        `Angles POS and SOQ form a straight angle. Angle SOQ = 180° − ${a + b}° = ${answer}°.`,
      ],
      diagram(
        `P, O, Q form a straight line. Above it the rays are OP, OR, OS, OQ in order. POR is ${a} degrees, ROS is ${b} degrees and SOQ is unknown.`,
        [['P', 180, 126], ['Q', 0, 126], ['R', directionR], ['S', directionS]],
        [
          arc(directionR, 180, 28),
          arc(directionS, directionR, 36),
          arc(0, directionS, 27),
          angleLabel(180 - a / 2, 73, `${a}°`),
          angleLabel(directionR - b / 2, 61, `${b}°`),
          angleLabel(directionS / 2, 54, '?'),
        ],
      ),
    );
  }

  if (variant === 1) {
    const a = r.pick([25, 30, 35, 40, 45, 50, 55]);
    const b = r.pick([26, 31, 36, 41, 46, 51, 56]);
    const directionR = 180 - a;
    const directionS = 90 - b;
    const answer = 180 - a - directionS;
    return make(
      [
        straight,
        'Above the line, the rays are in the order OP, OR, OS, OQ. Ray OT is below OQ.',
        'Angle SOT is a right angle, with OQ inside it.',
        `Angle POR = ${a}°.`,
        `Angle QOT = ${b}°.`,
      ],
      'ROS', answer,
      'First find angle SOQ inside the right angle. Then use the straight line.',
      [
        `Angles SOQ and QOT make 90°. Angle SOQ = 90° − ${b}° = ${directionS}°.`,
        `Angles POR, ROS and SOQ make 180°. Angle ROS = 180° − ${a}° − ${directionS}° = ${answer}°.`,
      ],
      diagram(
        `P, O, Q form a straight line. Above it the rays are OP, OR, OS, OQ in order; OT is below OQ. SOT is a right angle containing OQ. POR is ${a} degrees, QOT is ${b} degrees and ROS is unknown.`,
        [['P', 180, 126], ['Q', 0, 126], ['R', directionR], ['S', directionS], ['T', -b]],
        [
          arc(directionR, 180, 28),
          arc(directionS, directionR, 36),
          arc(-b, 0, 32),
          rightMarker(directionS, -b),
          angleLabel(180 - a / 2, 73, `${a}°`),
          angleLabel(-b / 2, 68, `${b}°`),
          angleLabel((directionS + directionR) / 2, 55, '?'),
        ],
      ),
    );
  }

  const reflex = r.pick([206, 209, 212, 218, 221, 224, 227, 230, 233, 236, 239, 242, 245, 248]);
  const directionQ = reflex - 135;
  const smaller = 360 - reflex;
  const answer = smaller - 90;
  return make(
    [
      'Three rays OP, OR and OQ meet at O.',
      'Ray OR is inside the smaller angle POQ.',
      'Angle POR is a right angle.',
      `The reflex angle POQ = ${reflex}°.`,
    ],
    'ROQ', answer,
    'A full turn is 360°. Find the smaller angle POQ, then remove its right-angle part.',
    [
      `The smaller angle POQ = 360° − ${reflex}° = ${smaller}°.`,
      `Angle ROQ = ${smaller}° − 90° = ${answer}°.`,
    ],
    diagram(
      `Three rays meet at O. OR is inside the smaller angle POQ. POR is a right angle, the outside reflex angle POQ is ${reflex} degrees, and ROQ is unknown.`,
      [['P', 225], ['R', 135], ['Q', directionQ]],
      [
        rightMarker(135, 225),
        arc(directionQ, 135, 28),
        arc(225, directionQ + 360, 42),
        angleLabel((directionQ + 135) / 2, 49, '?'),
        angleLabel(330, 67, `${reflex}°`),
      ],
    ),
  );
}
