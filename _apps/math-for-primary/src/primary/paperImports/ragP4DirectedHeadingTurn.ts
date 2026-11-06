import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-directed-heading-turn',
  level: 4,
  title: 'How far do you turn?',
  objective: 'Find the angle of a turn between two headings and choose a turn that reaches a stated heading.',
  skillIds: ['P4.S.ANGLE.02'],
  canonicalPatternId: 'p4-directed-turn-between-headings',
};

const headings = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const places = ['hut', 'pond', 'gate', 'mill', 'well', 'pier', 'tent', 'oak'];
const counts = [1, 2, 3, 4, 5, 6, 7];

function drawPaths(names: string[]): Batch11UpperPicture {
  const cx = 145;
  const cy = 100;
  const marks: Batch11UpperPicture['marks'] = [
    { kind: 'text', x: 279, y: 26, text: 'N' },
    { kind: 'line', x1: 285, y1: 67, x2: 285, y2: 35 },
    { kind: 'path', d: 'M279 44 L285 35 L291 44' },
  ];
  names.forEach((name, i) => {
    const angle = i * Math.PI / 4;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    marks.push(
      { kind: 'line', x1: cx, y1: cy, x2: cx + Math.round(55 * dx), y2: cy + Math.round(55 * dy) },
      { kind: 'text', x: cx + Math.round(92 * dx) - 4 * name.length, y: cy + Math.round(79 * dy) + 5, text: name },
    );
  });
  marks.push({ kind: 'circle', cx, cy, r: 3, fill: '#235b4c' });
  return { type: 'batch11-upper', marks, label: `Eight paths meet at the centre. North is up. From the top, going clockwise, the paths lead to the ${names.join(', ')}.` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.weighted([['paths', 3], ['headings', 2], ['destination', 1], ['pair', 1]] as const);
  const start = rng.int(0, 7);
  const gaps = rng.pick(form === 'pair' ? counts.filter(n => n !== 4) : counts);
  const sign = rng.pick([1, -1]);
  const sense = sign === 1 ? 'clockwise' : 'anticlockwise';
  const otherSense = sign === 1 ? 'anticlockwise' : 'clockwise';
  const route = Array.from({ length: gaps + 1 }, (_, i) => headings[(start + sign * i + 8) % 8]);
  const finish = (start + sign * gaps + 8) % 8;
  const degrees = gaps * 45;
  const mapped = form === 'paths' || form === 'destination';
  const names = rng.shuffle(places);
  const from = form === 'paths' ? `the ${names[start]}` : headings[start];
  const to = mapped ? `the ${names[finish]}` : headings[finish];
  const context = mapped ? ['You stand where eight equally spaced paths meet.'] : [];
  context.push(`You are facing ${from}.`);

  let prompt = `Turn ${sense} and stop when you first face ${to}. How many degrees do you turn?`;
  let answer = String(degrees);
  let choices: string[] | undefined;
  const steps: string[] = [];
  if (form === 'paths') steps.push(`From the centre, ${from} is ${headings[start]} and ${to} is ${headings[finish]}.`);
  if (form === 'destination') steps.push(`Use the north arrow. The path to ${to} points ${headings[finish]}.`);
  steps.push(
    'Eight equal gaps make a full turn. Each gap is 360° ÷ 8 = 45°.',
    `Moving ${sense}, trace ${route.join(' → ')}. That is ${gaps} ${gaps === 1 ? 'gap' : 'gaps'}.`,
    `${gaps} × 45° = ${degrees}°, so the turn is ${degrees}° ${sense}.`,
  );

  if (form === 'paths') {
    const wrong = [...new Set([8 - gaps, ...rng.shuffle(counts)])].filter(n => n !== gaps).slice(0, 3);
    choices = rng.shuffle([gaps, ...wrong].map(n => `${n * 45}°`));
    answer = `${degrees}°`;
  }
  if (form === 'pair') {
    prompt = `Which of these turns will make you face ${to}?`;
    // The complementary turn also works. Keep it off the list.
    const decoy = 45 * rng.pick(counts.filter(n => n !== gaps && n !== 8 - gaps && n !== 4));
    answer = `${degrees}° ${sense}`;
    choices = rng.shuffle([answer, `${degrees}° ${otherSense}`, `${decoy}° ${sense}`, `${decoy}° ${otherSense}`]);
    steps.push(`Going ${otherSense} would take ${8 - gaps} gaps, or ${360 - degrees}°. Of the turns listed, only ${answer} reaches ${to}.`);
  }
  return {
    key, context, prompt, answer, choices, unit: choices ? undefined : 'degrees',
    picture: mapped ? drawPaths(names) : undefined,
    hint: form === 'pair'
      ? 'Try each turn from the starting direction. One gap between compass points is 45°.'
      : 'Start at the direction you face. Count the gaps in the direction of the turn, then multiply by 45°.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}
