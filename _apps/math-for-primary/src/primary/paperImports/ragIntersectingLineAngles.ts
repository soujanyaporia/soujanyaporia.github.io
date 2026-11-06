import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-intersecting-line-angle-calculation',
  level: 5,
  title: 'Find a missing angle at a crossing',
  objective: 'Use straight-line and vertically opposite angle facts to find a missing part of an angle.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.03', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'intersecting-line-angle-calculation',
};

type Ray = {name: string; angle: number};
type Annotation = {from: string; to: string; text: string; arcRadius: number; textRadius: number};

function point(angle: number, radius: number): [number, number] {
  const radians = angle * Math.PI / 180;
  return [160 + radius * Math.cos(radians), 100 + radius * Math.sin(radians)];
}

function makeDiagram(
  rays: Ray[],
  annotations: Annotation[],
  context: string[],
  rightAngle: boolean,
): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  const direction = (name: string): number => {
    const ray = rays.find(r => r.name === name);
    if (!ray) throw new Error('Missing diagram ray');
    return ray.angle;
  };
  for (const ray of rays) {
    const [x2, y2] = point(ray.angle, 76);
    marks.push({kind: 'line', x1: 160, y1: 100, x2, y2});
  }
  for (const annotation of annotations) {
    const start = direction(annotation.from);
    let end = direction(annotation.to);
    while (end <= start) end += 360;
    const [x1, y1] = point(start, annotation.arcRadius);
    const [x2, y2] = point(end, annotation.arcRadius);
    marks.push({
      kind: 'path',
      d: `M ${x1} ${y1} A ${annotation.arcRadius} ${annotation.arcRadius} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`,
    });
    const [x, y] = point((start + end) / 2, annotation.textRadius);
    marks.push({kind: 'text', x: x - (annotation.text === '?' ? 5 : 14), y: y + 6, text: annotation.text});
  }
  if (rightAngle) {
    const [ax, ay] = point(direction('A'), 14);
    const [fx, fy] = point(direction('F'), 14);
    marks.push({kind: 'path', d: `M ${ax} ${ay} L ${ax + fx - 160} ${ay + fy - 100} L ${fx} ${fy}`});
  }
  for (const ray of rays) {
    const [x, y] = point(ray.angle, 89);
    marks.push({kind: 'text', x: x - 5, y: y + 6, text: ray.name});
  }
  marks.push({kind: 'text', x: 166, y: 108, text: 'O'});
  return {
    type: 'batch11-upper',
    label: `${context.join(' ')} Starting at OA and moving clockwise: ${rays.map(ray => `O${ray.name}`).join(', ')}. The unknown angle is EOD.`,
    marks,
  };
}

function fourChoices(r: Rng, answer: number, alternatives: number[]): string[] {
  const values = [...new Set([answer, ...alternatives])]
    .filter(value => Number.isInteger(value) && value > 0 && value < 180)
    .slice(0, 4);
  if (values.length !== 4) throw new Error('Four distinct angle choices are required');
  return r.shuffle(values.map(String));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const withRightAngle = r.int(0, 1) === 1;
  const lineStatement = 'A, O and B form a straight line. C, O and D form a straight line.';
  const base = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'Find the size of angle EOD.',
    unit: 'degrees',
  };

  if (!withRightAngle) {
    const whole = r.pick([64, 67, 70, 73, 76, 79, 82, 85]);
    const part = r.int(24, 36);
    const answer = whole - part;
    const context = [
      lineStatement,
      'OE lies inside angle BOD.',
      `Angle AOC = ${whole}°. Angle BOE = ${part}°.`,
      'The sketch is not drawn to scale.',
    ];
    const rays: Ray[] = [
      {name: 'A', angle: 235},
      {name: 'C', angle: 235 + whole},
      {name: 'B', angle: 55},
      {name: 'E', angle: 55 + part},
      {name: 'D', angle: 55 + whole},
    ];
    const workedSteps = [
      {text: `Angle BOD = ${whole}° because it is vertically opposite angle AOC.`},
      {text: `OE splits angle BOD into angles BOE and EOD. Angle EOD = ${whole}° − ${part}° = ${answer}°.`},
    ];
    const multipleChoice = r.int(0, 1) === 1;
    return {
      ...base,
      context,
      answer: String(answer),
      hint: 'Find the whole angle opposite AOC. Then take away the known part.',
      workedSteps,
      explanation: workedSteps.map(step => step.text).join(' '),
      picture: makeDiagram(rays, [
        {from: 'A', to: 'C', text: `${whole}°`, arcRadius: 23, textRadius: 43},
        {from: 'B', to: 'E', text: `${part}°`, arcRadius: 38, textRadius: 64},
        {from: 'E', to: 'D', text: '?', arcRadius: 24, textRadius: 42},
      ], context, false),
      ...(multipleChoice ? {choices: fourChoices(r, answer, [whole, 180 - whole, whole + part, part, 180 - whole - part])} : {}),
    };
  }

  const upperPart = r.int(34, 44);
  const lowerPart = r.int(26, 32);
  const adjacent = 180 - 90 - upperPart;
  const answer = 180 - adjacent - lowerPart;
  const context = [
    lineStatement,
    'OF lies inside angle AOC. OE lies inside angle BOD.',
    'Angle AOF is a right angle.',
    `Angle FOC = ${upperPart}°. Angle BOE = ${lowerPart}°.`,
    'The sketch is not drawn to scale.',
  ];
  const rays: Ray[] = [
    {name: 'A', angle: 200},
    {name: 'F', angle: 290},
    {name: 'C', angle: 290 + upperPart},
    {name: 'B', angle: 20},
    {name: 'E', angle: 20 + lowerPart},
    {name: 'D', angle: 110 + upperPart},
  ];
  const workedSteps = [
    {text: `Angle AOF is 90°. On straight line COD, angle AOD = 180° − 90° − ${upperPart}° = ${adjacent}°.`},
    {text: `Angle BOC = ${adjacent}° because angles BOC and AOD are vertically opposite.`},
    {text: `Angles COB, BOE and EOD make a straight angle. Angle EOD = 180° − ${adjacent}° − ${lowerPart}° = ${answer}°.`},
  ];
  return {
    ...base,
    context,
    answer: String(answer),
    choices: fourChoices(r, answer, [90 + upperPart, 90 - lowerPart, 180 - upperPart - lowerPart]),
    hint: 'Use the right angle and straight line COD to find AOD. Which angle is vertically opposite AOD?',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
    picture: makeDiagram(rays, [
      {from: 'F', to: 'C', text: `${upperPart}°`, arcRadius: 31, textRadius: 65},
      {from: 'B', to: 'E', text: `${lowerPart}°`, arcRadius: 38, textRadius: 67},
      {from: 'E', to: 'D', text: '?', arcRadius: 25, textRadius: 43},
    ], context, true),
  };
}
