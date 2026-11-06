import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-equal-reference-units',
  level: 2,
  title: 'Measure with equal units',
  objective: 'Use equal lengths or equal masses to find a total or the number of units that fit.',
  skillIds: ['P2.S.MD.01', 'P2.S.MD.02', 'P2.S.AS.01', 'P2.S.MEASURE.02'],
  canonicalPatternId: 'equal-reference-units',
};

type Steps = NonNullable<Question['workedSteps']>;
type Item = Omit<Question, 'key' | 'explanation' | 'workedSteps'>;

function finish(key: string, item: Item, steps: Steps): Question {
  return {...item, key, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ')};
}

function tiledStrip(key: string, r: Rng, askLength: boolean): Question {
  const count = r.int(4, 8);
  const each = r.pick([2, 4, 5]);
  const total = count * each;
  const steps: Steps = [
    {text: 'The tiles touch end to end. The row starts and finishes at the ends of the strip.'},
    {text: 'Count each tile once as you move along the row.', equation: `${count} tiles`},
  ];
  if (askLength) {
    steps.push({text: 'Count the same number of centimetres for every tile.', equation: `${count} × ${each} cm = ${total} cm`});
  }
  return finish(key, {
    context: askLength ? [`Each tile is ${each} cm long.`] : ['All the tiles are the same length.'],
    prompt: askLength ? 'How long is the strip in centimetres?' : 'How many tiles long is the strip?',
    picture: {type: 'paper', layout: 'bars', rows: [
      {label: 'Strip', parts: [{size: count, label: '', tone: 'blue'}]},
      {label: 'Tiles', parts: Array.from({length: count}, () => ({size: 1, label: 'tile', tone: 'green' as const}))},
    ]},
    answer: String(askLength ? total : count), unit: askLength ? 'cm' : 'tiles',
    hint: askLength ? 'Count the tiles under the strip. How much length does each tile add?' : 'Count the tiles between the two ends of the strip.',
  }, steps);
}

function equalCopies(key: string, r: Rng): Question {
  const start = r.int(2, 4);
  const length = r.pick([2, 3, 5]);
  const end = start + length;
  const copies = r.pick([2, 3, 5].filter(n => n * length !== end));
  const total = copies * length;
  const choices = r.shuffle([total, end * copies, length, end].map(n => `${n} cm`));
  return finish(key, {
    context: [`There are ${copies} equal pieces of tape. The ruler shows one piece.`],
    prompt: 'How long would the pieces be if you laid them end to end?',
    picture: {type: 'batch9-early', layout: 'ruler-total', maximum: 10,
      objects: [{label: 'One piece of tape', start, end}]},
    answer: `${total} cm`, choices,
    hint: 'Read both end marks to find the length of one piece. Use that length for every piece.',
  }, [
    {text: 'Count the centimetres between the two marks.', equation: `${end} − ${start} = ${length} cm`},
    {text: 'Join the equal lengths.', equation: `${copies} × ${length} cm = ${total} cm`},
  ]);
}

function unitsThatFit(key: string, r: Rng): Question {
  const shortLength = r.pick([2, 3, 4]);
  const count = r.int(2, Math.floor(10 / shortLength));
  const length = shortLength * count;
  return finish(key, {
    prompt: 'How many strips like the short one would fit end to end along the long strip?',
    picture: {type: 'batch9-early', layout: 'ruler-total', maximum: 10, objects: [
      {label: 'Long strip', start: 0, end: length}, {label: 'Short strip', start: 0, end: shortLength},
    ]},
    answer: String(count), unit: 'strips',
    hint: 'Read both lengths. Count along the long strip in steps the size of one short strip.',
  }, [
    {text: 'Both strips start at zero. Read their lengths at the other ends.', equation: `Long: ${length} cm. Short: ${shortLength} cm.`},
    {text: 'Find how many short lengths make the long length.', equation: `${length} ÷ ${shortLength} = ${count} strips`},
  ]);
}

function balancingMarbles(key: string, r: Rng): Question {
  const count = r.int(3, 6);
  const each = r.pick([5, 10]);
  const mass = count * each;
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper', label: `A level balance holds a box on one pan and ${count} marbles on the other.`,
    marks: [
      {kind: 'path', d: 'M20 112 H110 Q65 142 20 112 Z M200 112 H290 Q245 142 200 112 Z', fill: '#ecf1f4'},
      {kind: 'path', d: 'M65 127 V148 H245 V127 M155 148 L137 175 H173 Z'},
      {kind: 'path', d: 'M40 112 V76 H90 V112 Z', fill: '#f3dfa9'},
      {kind: 'text', x: 49, y: 100, text: 'Box'},
      ...Array.from({length: count}, (_, i) => ({
        kind: 'circle' as const, cx: 245 + (i - (count - 1) / 2) * 15, cy: 105, r: 7, fill: '#aecfdc',
      })),
    ],
  };
  return finish(key, {
    context: [`Each marble weighs ${each} g.`], prompt: 'How many grams does the box weigh?',
    picture, answer: String(mass), unit: 'g',
    hint: 'The pans balance. Count the marbles and use the mass of one marble.',
  }, [
    {text: 'The pans are level, so the box weighs as much as all the marbles together.', equation: `1 box balances ${count} marbles`},
    {text: 'Count the mass of each marble once.', equation: `${count} × ${each} g = ${mass} g`},
  ]);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const method = r.pick(['measure', 'measure', 'measure', 'measure', 'balance', 'balance', 'fit', 'count'] as const);
  if (method === 'balance') return balancingMarbles(key, r);
  if (method === 'fit') return unitsThatFit(key, r);
  if (method === 'measure' && r.chance(0.4)) return equalCopies(key, r);
  return tiledStrip(key, r, method === 'measure');
}
