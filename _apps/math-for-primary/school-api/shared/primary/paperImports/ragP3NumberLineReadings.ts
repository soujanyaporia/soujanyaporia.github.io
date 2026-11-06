import {hashString, Rng} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p3-number-line-readings',
  level: 3,
  title: 'Read the marked ticks',
  objective: 'Find the value of one gap between numbered ticks, then use it to read marked numbers.',
  skillIds: ['P3.S.WN.03', 'P3.S.MD.04', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-number-line-readings',
};

const gapSizes = [5, 10, 20, 25, 50];
type Target = {letter: string; tick: number};
type Line = {start: number; step: number; gaps: number; targets: Target[]};

function buildLine(r: Rng, letter: string, step: number, paired: boolean): Line {
  const gaps = r.int(4, paired ? 6 : 8);
  // Put a whole thousand at the middle label of a paired reading.
  const start = paired
    ? r.pick([2000, 3000, 5000, 6000, 7000, 8000, 9000]) - gaps * step
    : r.int(12, 360) * 10;
  const targets = [{letter, tick: r.int(1, gaps - 1)}];
  if (paired) targets.push({letter: 'Q', tick: gaps + r.int(1, gaps - 1)});
  return {start, step, gaps, targets};
}

function drawLine(line: Line, y: number) {
  const {start, step, gaps, targets} = line;
  const paired = targets.length === 2;
  const anchors = paired ? [0, gaps, 2 * gaps] : [0, gaps];
  const first = paired ? -1 : 0;
  const last = anchors[anchors.length - 1] + (paired ? 1 : 0);
  const x = (tick: number) => 32 + (tick - first) * 252 / (last - first);
  const marks: Batch11UpperMark[] = [
    {kind: 'line', x1: x(first), y1: y, x2: x(last), y2: y},
  ];
  for (let tick = first; tick <= last; tick++) {
    const height = anchors.includes(tick) ? 11 : 6;
    marks.push({kind: 'line', x1: x(tick), x2: x(tick), y1: y - height, y2: y + height});
  }
  const descriptions: string[] = [];
  for (const tick of anchors) {
    const text = String(start + tick * step);
    marks.push({kind: 'text', x: x(tick) - 5 * text.length, y: y + 32, text});
    descriptions.push(`tick ${tick - first + 1} shows ${text}`);
  }
  for (const {letter, tick} of targets) {
    marks.push({kind: 'circle', cx: x(tick), cy: y, r: 4, fill: '#235b4c'},
      {kind: 'text', x: x(tick) - 6, y: y - 18, text: letter});
    descriptions.push(`${letter} is at tick ${tick - first + 1}`);
  }
  return {marks, label: `Counting the ${last - first + 1} equally spaced ticks from the left, ${descriptions.join(', ')}.`};
}

function readLine({start, step, gaps, targets}: Line) {
  const span = gaps * step;
  const steps = [
    {text: `On the line with ${targets[0].letter}, find the difference between the first two numbered ticks.`,
      equation: `${start + span} − ${start} = ${span}`},
    {text: `Count the ${gaps} equal gaps between those ticks. Divide the difference to find one gap.`,
      equation: `${span} ÷ ${gaps} = ${step}`},
  ];
  const readings = targets.map(({letter, tick}) => {
    const anchorTick = tick < gaps ? 0 : gaps;
    const anchor = start + anchorTick * step;
    const count = tick - anchorTick;
    const value = anchor + count * step;
    steps.push({text: `From ${anchor}, move ${count} ${count === 1 ? 'gap' : 'gaps'} right to ${letter}.`,
      equation: `${anchor} + ${count} × ${step} = ${value}`});
    return value;
  });
  return {steps, readings};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.pick(['single', 'single', 'pair', 'sum'] as const);
  const step = r.pick(gapSizes);
  const lines = [buildLine(r, 'P', step, mode === 'pair')];
  if (mode === 'sum') {
    lines.push(buildLine(r, 'Q', r.pick(gapSizes.filter(size => size !== step)), false));
  }
  const drawings = lines.map((line, i) => drawLine(line, mode === 'sum' ? 55 + 95 * i : 100));
  const solutions = lines.map(readLine);
  const readings = solutions.flatMap(solution => solution.readings);
  const workedSteps = solutions.flatMap(solution => solution.steps);
  let answer = String(readings[0]);
  if (mode === 'pair') answer = JSON.stringify(readings.map(String));
  if (mode === 'sum') {
    const [p, q] = readings;
    answer = String(p + q);
    workedSteps.push({text: 'Add the two numbers you read.', equation: `${p} + ${q} = ${answer}`});
  }
  const prompts = {
    single: 'What number is at P?',
    pair: 'Which numbers belong at P and Q? Fill in both boxes.',
    sum: 'What do you get when you add the number at P to the number at Q?',
  };
  return {
    key, prompt: prompts[mode], answer,
    picture: {type: 'batch11-upper', marks: drawings.flatMap(d => d.marks), label: drawings.map(d => d.label).join(' ')},
    ...(mode === 'pair' ? {structuredResponse: {kind: 'number-pair' as const, firstLabel: 'P', secondLabel: 'Q'}} : {}),
    hint: 'Count the gaps between two numbered ticks. How much does the number go up in one gap?',
    workedSteps,
    explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '),
  };
}
