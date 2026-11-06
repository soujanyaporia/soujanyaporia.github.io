import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-length-from-ruler-endpoints',
  level: 2,
  title: 'Read lengths on a ruler',
  objective: 'Use both end marks to measure a piece, identify the longest piece or find the total length of equal pieces.',
  skillIds: ['P2.S.AS.01', 'P2.S.WN.04', 'P2.S.MD.01'],
  canonicalPatternId: 'length-from-ruler-endpoints',
};

type Span = {label: string; start: number; end: number};
type Steps = NonNullable<Question['workedSteps']>;

function withSteps(key: string, item: Omit<Question, 'key' | 'workedSteps' | 'explanation'>, steps: Steps): Question {
  return {
    ...item, key, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}

// One shared scale keeps all three wires aligned, including the wire starting at zero.
function wirePicture(wires: Span[]): Batch11UpperPicture {
  const x = (mark: number) => 39 + 26 * mark;
  const marks: Batch11UpperPicture['marks'] = [
    {kind: 'text', x: 2, y: 27, text: 'cm'},
    {kind: 'line', x1: x(0), y1: 42, x2: x(10), y2: 42},
  ];
  for (let n = 0; n <= 10; n++) {
    marks.push({kind: 'text', x: x(n) - (n === 10 ? 10 : 5), y: 27, text: String(n)});
    marks.push({kind: 'line', x1: x(n), y1: 34, x2: x(n), y2: 42});
  }
  const wireMarks: Batch11UpperPicture['marks'] = [];
  wires.forEach(({label, start, end}, row) => {
    const y = 78 + row * 46;
    for (const reading of [start, end]) {
      marks.push({kind: 'line', x1: x(reading), y1: 42, x2: x(reading), y2: y, dashed: true});
      wireMarks.push({kind: 'circle', cx: x(reading), cy: y, r: 3, fill: '#235b4c'});
    }
    wireMarks.push({kind: 'line', x1: x(start), y1: y, x2: x(end), y2: y});
    wireMarks.push({kind: 'text', x: 6, y: y + 5, text: label});
  });
  return {
    type: 'batch11-upper',
    label: wires.map(w => `Wire ${w.label} runs from ${w.start} cm to ${w.end} cm.`).join(' '),
    marks: [...marks, ...wireMarks],
  };
}

function longestWire(key: string, r: Rng): Question {
  const sharedEnd = r.pick([5, 6, 8]);
  const inset = r.int(1, sharedEnd - 2);
  const farEnd = r.pick([9, 10]);
  const farStart = r.pick([1, 2, 3, 4, 5, 6, 7].filter(start => {
    const length = farEnd - start;
    return start !== inset && length !== sharedEnd && length !== sharedEnd - inset;
  }));
  const wires = r.shuffle([[0, sharedEnd], [inset, sharedEnd], [farStart, farEnd]])
    .map(([start, end], i) => ({label: ['A', 'B', 'C'][i], start, end}));
  const measured = wires.map(w => ({...w, length: w.end - w.start}));
  const ordered = [...measured].sort((a, b) => b.length - a.length);
  const steps: Steps = measured.map(w => ({
    text: `Find the length of wire ${w.label}.`,
    equation: `${w.end} − ${w.start} = ${w.length} cm`,
  }));
  steps.push({
    text: `Wire ${ordered[0].label} is the longest.`,
    equation: ordered.map(w => `${w.length} cm`).join(' > '),
  });
  return withSteps(key, {
    prompt: 'Which wire is longest? Write its letter.',
    picture: wirePicture(wires), answer: ordered[0].label,
    hint: 'Follow the ends of each wire to the ruler. Compare how many centimetres each wire covers.',
  }, steps);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.pick(['single', 'single', 'single', 'longest', 'repeated']);
  if (variant === 'longest') return longestWire(key, r);

  const start = r.int(1, 4);
  const length = r.pick([2, 3, 4, 5, 6, 7, 8].filter(n => start + n <= 10 && n !== start));
  const end = start + length;
  const label = variant === 'single' ? 'Card strip' : 'One piece of cord';
  const picture: Question['picture'] = {
    type: 'batch9-early', layout: 'ruler-total', maximum: 10,
    objects: [{label, start, end}],
  };
  const steps: Steps = [
    {text: 'Read the marks at the two ends.', equation: `From ${start} cm to ${end} cm`},
    {text: 'Subtract the start mark from the end mark to find the length.', equation: `${end} − ${start} = ${length} cm`},
  ];
  if (variant === 'single') {
    return withSteps(key, {
      prompt: 'How long is the card strip in centimetres?',
      picture, unit: 'cm', answer: String(length),
      choices: r.shuffle([length, start, end, end + start].map(String)),
      hint: 'Count the spaces from one end of the strip to the other.',
    }, steps);
  }

  const count = r.pick([2, 3, 4, 10]);
  const total = length * count;
  steps.push({text: 'Count the same length for every piece.', equation: `${count} × ${length} = ${total} cm`});
  return withSteps(key, {
    prompt: 'What is the total length of the cord pieces?',
    context: [`Mei has ${count} equal pieces of cord. The ruler shows one piece.`],
    picture, unit: 'cm', answer: String(total),
    hint: 'Measure one piece first. Each piece is that long.',
  }, steps);
}
