import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-decimal-number-line-reading',
  level: 5,
  title: 'Read a decimal number line',
  objective: 'Find the size of an equal interval, read a marked decimal and round when asked.',
  skillIds: ['P4.S.DEC.01', 'P5.S.FRAC.03', 'P4.S.DEC.04'],
  canonicalPatternId: 'p5-decimal-number-line-reading',
} as const;

// Integer thousandths keep both the diagram labels and rounding exact.
function decimal(milli: number): string {
  const whole = Math.floor(milli / 1000);
  const tail = String(milli % 1000).padStart(3, '0').replace(/0+$/, '');
  return tail ? `${whole}.${tail}` : String(whole);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.int(0, 4);
  const rounded = mode === 4;
  const multipleChoice = mode < 2;
  let total: number;
  let left: number;
  let right: number;
  let target: number;
  let start: number;
  let step: number;

  if (multipleChoice) {
    total = 8;
    left = 0;
    right = 8;
    start = r.pick([1000, 2000, 3000, 4000, 8000, 9000]);
    step = 125;
    target = r.int(1, 7);
  } else if (!rounded) {
    total = 10;
    left = r.int(0, 1);
    right = left + r.pick([4, 5, 6]);
    target = r.int(right + 1, 9);
    start = r.pick([150, 250, 350, 650, 750, 850, 950, 1150]);
    step = r.pick([25, 50, 75]);
  } else {
    total = 10;
    left = 2;
    right = 10;
    start = r.pick([1, 2, 3, 4, 8]) * 1000 + r.pick([0, 100, 300, 800]);
    step = r.pick([25, 75, 125]);
    // Every selected point requires a genuine rounding decision.
    target = left + r.pick([1, 2, 3, 5, 6, 7]);
  }

  const gaps = right - left;
  const offset = target - left;
  const span = gaps * step;
  const upper = start + span;
  const value = start + offset * step;
  const exact = decimal(value);
  const answer = rounded
    ? (Math.floor((value + 50) / 100) / 10).toFixed(1)
    : exact;
  const x = (tick: number) => 24 + 240 * tick / total;
  const marks: Batch11UpperMark[] = [
    {kind: 'line', x1: 12, y1: 112, x2: 296, y2: 112},
    {kind: 'line', x1: 289, y1: 108, x2: 296, y2: 112},
    {kind: 'line', x1: 289, y1: 116, x2: 296, y2: 112},
  ];
  for (let tick = 0; tick <= total; tick++) {
    marks.push({kind: 'line', x1: x(tick), y1: 104, x2: x(tick), y2: 120});
  }
  marks.push(
    {kind: 'text', x: x(left) - 5, y: 148, text: decimal(start)},
    {kind: 'text', x: x(right) - 5, y: 148, text: decimal(upper)},
    {kind: 'text', x: x(target) - 5, y: 55, text: 'P'},
    {kind: 'line', x1: x(target), y1: 68, x2: x(target), y2: 98},
    {kind: 'line', x1: x(target) - 5, y1: 91, x2: x(target), y2: 98},
    {kind: 'line', x1: x(target) + 5, y1: 91, x2: x(target), y2: 98},
  );

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Find the difference between the two labelled values.',
      equation: `${decimal(upper)} − ${decimal(start)} = ${decimal(span)}`,
    },
    {
      text: `There are ${gaps} equal gaps between the labelled marks. Divide to find one gap.`,
      equation: `${decimal(span)} ÷ ${gaps} = ${decimal(step)}`,
    },
    {
      text: `P is ${offset} gaps to the right of ${decimal(start)}.`,
      equation: `${decimal(start)} + ${offset} × ${decimal(step)} = ${exact}`,
    },
  ];
  if (rounded) {
    const hundredths = Math.floor(value / 10) % 10;
    workedSteps.push({
      text: `The hundredths digit is ${hundredths}, so ${hundredths >= 5 ? 'round up to the next tenth' : 'keep the tenths digit'}.`,
      equation: `${exact} ≈ ${answer}`,
    });
  }

  const choices = multipleChoice
    ? r.shuffle([...new Set([
        value,
        value - step,
        value + step,
        start + offset * 100,
        value + 2 * step,
      ].map(decimal))].slice(0, 4))
    : undefined;

  return {
    key,
    prompt: rounded
      ? 'Find the decimal at P, then round it to 1 decimal place.'
      : multipleChoice ? 'Which decimal belongs at P?' : 'Write the decimal at P.',
    context: ['Each gap between neighbouring marks has the same size.'],
    picture: {
      type: 'batch11-upper',
      label: `A number line with ${total + 1} equally spaced marks. Counting marks from the left starting at 1, mark ${left + 1} is labelled ${decimal(start)}, mark ${right + 1} is labelled ${decimal(upper)}, and P points to mark ${target + 1}.`,
      marks,
    },
    answer,
    ...(choices ? {choices} : {}),
    hint: 'Count the gaps between the two numbered marks. Use their difference to find the size of one gap.',
    workedSteps,
    explanation: workedSteps.map(s => `${s.text} ${s.equation ?? ''}`).join(' '),
  };
}
