import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p6-intersecting-line-relationships',
  level: 6,
  title: 'Angles where lines cross',
  objective: 'Use straight-line and vertically opposite angle facts to calculate angles and check statements.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.03', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'intersecting-line-angle-relationships',
};

type Ray = {name: string; direction: number};
type Arc = {from: string; to: string; label: string; radius?: number};
const point = (direction: number, radius: number): [number, number] => {
  const t = direction * Math.PI / 180;
  return [160 + radius * Math.cos(t), 100 + radius * Math.sin(t)];
};

function diagram(rays: Ray[], arcs: Arc[], right: boolean, description: string): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  const direction = (name: string) => {
    const ray = rays.find(item => item.name === name);
    if (!ray) throw new Error('Unknown ray');
    return ray.direction;
  };
  const label = (direction: number, radius: number, text: string) => {
    const [x, y] = point(direction, radius);
    marks.push({kind: 'text', x: x - text.length * 4.5, y: y + 6, text});
  };
  for (const ray of rays) {
    const [x2, y2] = point(ray.direction, 73);
    marks.push({kind: 'line', x1: 160, y1: 100, x2, y2});
    label(ray.direction, 88, ray.name);
  }
  for (const arc of arcs) {
    const start = direction(arc.from);
    let end = direction(arc.to);
    while (end <= start) end += 360;
    const radius = arc.radius ?? 25;
    const [x1, y1] = point(start, radius), [x2, y2] = point(end, radius);
    marks.push({kind: 'path', d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`});
    label((start + end) / 2, radius + (arc.label.length > 1 ? 27 : 17), arc.label);
  }
  if (right) {
    const [ex, ey] = point(direction('E'), 13), [bx, by] = point(direction('B'), 13);
    marks.push({kind: 'path', d: `M ${ex} ${ey} L ${ex + bx - 160} ${ey + by - 100} L ${bx} ${by}`});
  }
  marks.push({kind: 'text', x: 149, y: 118, text: 'O'});
  return {
    type: 'batch11-upper',
    label: `Clockwise order of rays: ${rays.map(ray => 'O' + ray.name).join(', ')}. ${description}`,
    marks,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const rotation = r.pick([172, 180, 188]);
  const lineFact = 'A, O and B are on a straight line. C, O and D are on a straight line.';
  const context = [lineFact, 'Ray OE is inside angle COB.', 'The drawing is not to scale.'];
  const base = {key: `${RAG_PATTERN.id}:${seed}:${index}`};
  const rays = (small: number, endPart: number): Ray[] => [
    {name: 'A', direction: rotation},
    {name: 'C', direction: rotation + small},
    {name: 'E', direction: rotation + 180 - endPart},
    {name: 'B', direction: rotation + 180},
    {name: 'D', direction: rotation + 180 + small},
  ];

  if (variant === 0) {
    const small = r.int(28, 46), part = r.pick([62, 64, 66, 68, 70, 72, 74, 76, 78]), answer = 180 - small;
    context.push(`Angle AOC is ${small}°. Angle EOB is ${part}°.`);
    const workedSteps = [
      {text: 'Angles AOC and DOA fit together on straight line COD.', equation: '∠AOC + ∠DOA = 180°'},
      {text: 'Subtract the known angle from the straight angle.', equation: `∠DOA = 180° − ${small}° = ${answer}°`},
      {text: 'Check the two angles on line COD.', equation: `${small}° + ${answer}° = 180°`},
    ];
    const values = [...new Set([answer, small + part, 180 - small - part, 180 - part, small])].slice(0, 4);
    return {
      ...base, context, prompt: 'What is the size of angle DOA?', unit: 'degrees',
      answer: String(answer), choices: r.shuffle(values.map(String)),
      hint: 'Look for the two angles that share OA and make a straight angle.',
      workedSteps, explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
      picture: diagram(rays(small, part), [
        {from: 'A', to: 'C', label: `${small}°`},
        {from: 'E', to: 'B', label: `${part}°`},
        {from: 'D', to: 'A', label: '?'},
      ], false, `Angle AOC is ${small} degrees; angle EOB is ${part} degrees. Angle DOA is marked ?.`),
    };
  }

  if (variant === 1) {
    const small = r.int(30, 46);
    const part = r.pick([52, 56, 60]);
    const useOpposite = r.chance(0.5);
    const answer = useOpposite ? '∠q + ∠r = ∠s' : '∠p + ∠s = 180°';
    const workedSteps = useOpposite ? [
      {text: 'Angles q and r together form angle COB.', equation: '∠COB = ∠q + ∠r'},
      {text: 'Angles COB and DOA are vertically opposite, so they are equal.', equation: '∠q + ∠r = ∠s'},
    ] : [
      {text: 'Angles p and s share OA. Their other arms, OC and OD, point in opposite directions.', equation: '∠AOC + ∠DOA = 180°'},
      {text: 'These two labelled angles make a straight angle.', equation: '∠p + ∠s = 180°'},
    ];
    return {
      ...base, context, prompt: 'Which statement must be true?', answer,
      choices: r.shuffle([answer, '∠p = ∠r', '∠q = ∠s', '∠q + ∠r = 180°']),
      hint: 'Look at both straight lines. An extra ray splits one of the angles.',
      workedSteps, explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
      picture: diagram(rays(small, part), [
        {from: 'A', to: 'C', label: 'p'},
        {from: 'C', to: 'E', label: 'q'},
        {from: 'E', to: 'B', label: 'r'},
        {from: 'D', to: 'A', label: 's'},
      ], false, 'Angle labels: p = AOC; q = COE; r = EOB; s = DOA.'),
    };
  }

  const whole = r.pick([124, 128, 132, 136, 144, 148]), small = 180 - whole, answer = whole - 90;
  context.push(`Angle DOA is ${whole}°. Angle EOB is a right angle.`);
  const workedSteps = [
    {text: 'Angles COB and DOA are vertically opposite, so they are equal.', equation: `∠COB = ${whole}°`},
    {text: 'OE divides angle COB into angle COE and a right angle.', equation: '∠COE + 90° = ∠COB'},
    {text: 'Take away the right angle to find the missing part.', equation: `∠COE = ${whole}° − 90° = ${answer}°`},
  ];
  return {
    ...base, context, prompt: 'What is the size of angle COE?', unit: 'degrees', answer: String(answer),
    hint: 'Find angle COB using the opposite angle, then remove the right-angle part.',
    workedSteps, explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    picture: diagram(rays(small, 90), [
      {from: 'D', to: 'A', label: `${whole}°`},
      {from: 'C', to: 'E', label: '?'},
    ], true, `Angle DOA is ${whole} degrees. A square marks right angle EOB. Angle COE is marked ?.`),
  };
}
