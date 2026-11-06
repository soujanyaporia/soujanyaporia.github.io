import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {AnglePoint, Batch8AnglesPicture} from './batch8AnglesPicture';

export const RAG_PATTERN = {
  id: 'rag-protractor-measurement',
  level: 6,
  title: 'Measure a drawn angle',
  objective: 'Place a protractor at the vertex, align its zero with one arm and measure an obtuse angle.',
  skillIds: ['P4.S.ANGLE.01', 'P4.S.ANGLE.02'],
  canonicalPatternId: 'protractor-measurement',
};

type Rays = Extract<Batch8AnglesPicture, {layout: 'rays'}>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString('rag-protractor-measurement:' + seed + ':' + index));
  const degrees = rng.pick([100, 110, 115, 120, 125, 140, 145, 150]);
  const leftStart = rng.chance(0.5);
  const baseline = rng.pick(leftStart ? [155, 165, 180] : [0, 15, 25]);
  const other = baseline + (leftStart ? -degrees : degrees);
  const named = rng.chance(0.5);
  const vertex: AnglePoint = {x: 250, y: 245, label: 'Q'};
  const endpoint = (angle: number, label: string): AnglePoint => {
    const radians = angle * Math.PI / 180;
    const length = rng.int(175, 195);
    return {
      x: vertex.x + length * Math.cos(radians),
      y: vertex.y - length * Math.sin(radians),
      label,
    };
  };
  const picture: Rays = {
    type: 'batch8-angles',
    layout: 'rays',
    vertex,
    ends: [endpoint(baseline, 'P'), endpoint(other, 'R')],
    mark: [Math.min(baseline, other), Math.max(baseline, other)],
    markLabel: named ? '?' : 'x',
  };
  const aligned: Rays = {
    ...picture,
    protractorRotation: leftStart ? baseline - 180 : baseline,
  };
  const solved: Rays = {...aligned, markLabel: degrees + '°'};
  const target = named ? '∠PQR' : 'x';
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: 'Put the centre mark of the protractor exactly on Q.', picture},
    {
      text: 'Turn the protractor until its straight edge lies along QP. Find the scale with 0 on the arm QP.',
      picture: aligned,
    },
    {
      text: 'Follow that same scale from QP to QR. The reading is ' + degrees + '°. It is between 90° and 180°, which fits the wide opening.',
      equation: target + ' = ' + degrees + '°',
      picture: solved,
    },
  ];
  return {
    key: RAG_PATTERN.id + ':' + seed + ':' + index,
    prompt: named
      ? 'Use your protractor to measure ∠PQR. Give the angle to the nearest degree.'
      : 'Use your protractor to measure the angle marked x. Give the angle to the nearest degree.',
    context: ['The angle is drawn accurately. Use your own protractor on the diagram.'],
    picture,
    answer: String(degrees),
    unit: '°',
    hint: 'Q is the vertex. Centre your protractor there and line up its zero with QP. Keep to that scale when you read QR.',
    workedSteps,
    explanation: workedSteps.map(step => step.text + (step.equation ? ' ' + step.equation : '')).join(' '),
  };
}
