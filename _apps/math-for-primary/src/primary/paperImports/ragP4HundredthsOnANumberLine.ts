import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-hundredths-on-a-number-line',
  level: 4,
  title: 'Find the decimal at a marked tick',
  objective: 'Count equal gaps between labelled tenths to read a point in hundredths.',
  skillIds: ['P4.S.DEC.01'],
  canonicalPatternId: 'p4-read-hundredths-between-adjacent-tenths',
};

const hundredths = (count: number) => (count / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const style = rng.pick(['entry', 'extended-entry', 'choice']);
  const lowerTenth = rng.chance(0.5) ? rng.int(1, 5) : rng.int(12, 29);
  const left = (lowerTenth / 10).toFixed(1);
  const right = ((lowerTenth + 1) / 10).toFixed(1);
  const offset = rng.int(1, 9);
  const value = lowerTenth * 10 + offset;
  const answer = hundredths(value);
  const name = rng.pick(['K', 'M', 'T']);
  const gapCount = `${offset} ${offset === 1 ? 'gap' : 'gaps'}`;

  // Tick zero is the left numbered tick, even if the line extends beyond it.
  const first = style === 'extended-entry' ? -1 : 0;
  const last = style === 'extended-entry' ? 11 : 10;
  const x = (tick: number) => 40 + 24 * tick;
  const y = 100;
  const marks: Batch11UpperMark[] = [
    {kind: 'line', x1: x(first) - 8, x2: x(last) + 8, y1: y, y2: y},
  ];
  for (let tick = first; tick <= last; tick++) {
    const height = tick % 5 === 0 ? 13 : 7;
    marks.push({kind: 'line', x1: x(tick), x2: x(tick), y1: y - height, y2: y + height});
  }
  marks.push(
    {kind: 'text', text: left, x: x(0) - 10, y: y + 36},
    {kind: 'text', text: right, x: x(10) - 10, y: y + 36},
    {kind: 'circle', cx: x(offset), cy: y, r: 5, fill: '#235b4c'},
    {kind: 'text', text: name, x: x(offset) - 6, y: y - 22},
  );
  const workedSteps = [
    {text: 'Find the change from the left number to the right number.', equation: `${right} − ${left} = 0.10`},
    {text: 'Count the ten equal gaps between the two numbers. Find the size of one gap.', equation: '0.10 ÷ 10 = 0.01'},
    {text: `From ${left}, move ${gapCount} to the right to reach ${name}.`, equation: `${left} + (${offset} × 0.01) = ${answer}`},
  ];

  return {
    key,
    prompt: style === 'choice' ? `Which decimal is at the dot labelled ${name}?` : `Write the decimal at the dot labelled ${name}.`,
    picture: {
      type: 'batch11-upper',
      marks,
      label: `The number line goes up from left to right. There are ten equal gaps between ${left} and ${right}. The dot labelled ${name} is ${gapCount} to the right of ${left}.`,
    },
    answer,
    ...(style === 'choice' ? {choices: rng.shuffle([
      answer, hundredths(value - 1), hundredths(value + 1), hundredths(lowerTenth * 10 + offset * 10),
    ])} : {}),
    hint: 'Count the gaps between the numbered ticks. How much does the number go up in one gap?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: {op: '+', a: lowerTenth / 10, b: {op: '/', a: offset, b: 100}},
  };
}
