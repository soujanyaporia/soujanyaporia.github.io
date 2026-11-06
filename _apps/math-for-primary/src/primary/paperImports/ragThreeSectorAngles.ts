import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-three-sector-angles',
  level: 5,
  title: 'Find the missing angle in a full turn',
  objective: 'Use two known angles to find the third angle around a point, including a reflex angle.',
  skillIds: ['P5.S.ANGLE.02', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'angles-around-point-three-sectors-two-known',
};

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  }
  return result >>> 0;
}

const centre = {x: 160, y: 100};
const rounded = (value: number) => Number(value.toFixed(3));
function point(degrees: number, radius: number) {
  const radians = degrees * Math.PI / 180;
  return {
    x: rounded(centre.x + radius * Math.cos(radians)),
    y: rounded(centre.y + radius * Math.sin(radians)),
  };
}

function ray(degrees: number): Batch11UpperMark {
  const end = point(degrees, 82);
  return {kind: 'line', x1: centre.x, y1: centre.y, x2: end.x, y2: end.y};
}

function arc(start: number, width: number, radius = 27): Batch11UpperMark {
  const from = point(start, radius);
  const to = point(start + width, radius);
  return {
    kind: 'path',
    d: `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${width > 180 ? 1 : 0} 1 ${to.x} ${to.y}`,
  };
}

function label(degrees: number, value: string): Batch11UpperMark {
  const location = point(degrees, 54);
  return {
    kind: 'text',
    x: rounded(location.x - value.length * 3.5),
    y: rounded(location.y + 5),
    text: value,
  };
}

function squareCorner(start: number): Batch11UpperMark {
  const first = point(start, 14);
  const last = point(start + 90, 14);
  const corner = {
    x: rounded(first.x + last.x - centre.x),
    y: rounded(first.y + last.y - centre.y),
  };
  return {
    kind: 'path',
    d: `M ${first.x} ${first.y} L ${corner.x} ${corner.y} L ${last.x} ${last.y}`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  let state = hash(key);
  const next = (limit: number): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 4294967296 * limit);
  };
  const pick = (values: readonly number[]) => values[next(values.length)];
  const rightAngle = (hash(String(seed)) + (index >>> 0)) % 2 === 0;
  const first = rightAngle ? 90 : pick([108, 112, 116, 120, 124, 128, 132, 136, 144, 148]);
  const second = rightAngle
    ? pick([42, 46, 51, 54, 58, 62, 67, 69, 72, 76, 79, 82])
    : pick([76, 78, 80, 82, 84, 86, 88]);
  const knownTotal = first + second;
  const missing = 360 - knownTotal;
  const start = rightAngle ? -135 : pick([-155, -85]);
  const marks: Batch11UpperMark[] = [
    ray(start),
    ray(start + first),
    ray(start + knownTotal),
  ];
  if (rightAngle) {
    marks.push(squareCorner(start));
  } else {
    marks.push(arc(start, first), label(start + first / 2, `${first}°`));
  }
  marks.push(
    arc(start + first, second),
    label(start + first + second / 2, `${second}°`),
    arc(start + knownTotal, missing, 32),
    label(start + knownTotal + missing / 2, 'x'),
  );
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: rightAngle
      ? `Three rays meet at a point. Clockwise, the marked angles are a right angle shown by a square, ${second} degrees, and x. The arc for x marks the reflex angle.`
      : `Three rays meet at a point. Clockwise, the marked angles are ${first} degrees, ${second} degrees, and x. Their three sectors make a full turn.`,
    marks,
  };
  const steps = [
    'Angles around a point add up to 360°.',
    ...(rightAngle ? ['The square marks a right angle, which is 90°.'] : []),
    `The two known angles total ${first}° + ${second}° = ${knownTotal}°.`,
    `Angle x = 360° − ${knownTotal}° = ${missing}°.`,
    ...(rightAngle ? ['This is a reflex angle because it is greater than 180°.'] : []),
  ];
  const question: Question = {
    key,
    prompt: rightAngle ? 'Which value is the size of angle x?' : 'Work out the size of angle x.',
    context: [
      'Three rays meet at one point. The three marked angles make one full turn.',
      rightAngle ? 'The square marks a right angle.' : 'Use the two given angle sizes.',
      'Calculate using the angle markings rather than measuring the drawing.',
    ],
    answer: String(missing),
    unit: 'degrees',
    picture,
    hint: 'Add the two known angles, then subtract their total from one full turn.',
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
  };
  if (rightAngle) {
    const choices = [missing, knownTotal, 270, 360 - second].map(String);
    for (let i = choices.length - 1; i > 0; i--) {
      const j = next(i + 1);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    question.choices = choices;
  }
  return question;
}
