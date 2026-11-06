import {hashString, Rng} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';
import type {Batch9EarlyPicture} from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'p3-rag-graduated-scale-readings',
  level: 3,
  title: 'Read the spaces on a scale',
  objective: 'Use the labelled marks to read a scale, then add readings or change units.',
  skillIds: ['P3.S.MEASURE.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03', 'P3.S.AS.01', 'P2.S.MEASURE.02'],
  canonicalPatternId: 'p3-graduated-scale-readings',
};

type Steps = NonNullable<Question['workedSteps']>;
type Exercise = Omit<Question, 'key' | 'explanation'> & {workedSteps: Steps};
type GramDial = Extract<Batch9EarlyPicture, {layout: 'mass-dial'}>;
const gramChoices = (rng: Rng, values: number[]) => rng.shuffle(values.map(value => `${value} g`));

function gramDial(rng: Rng, band: number): GramDial {
  const minorStep = rng.pick([25, 40, 50]);
  const labelStep = 200;
  const reading = band * labelStep + rng.int(1, labelStep / minorStep - 1) * minorStep;
  return {type: 'batch9-early', layout: 'mass-dial', maximum: 1000, labelStep, minorStep, reading};
}

function readGramDial(name: string, dial: GramDial): Steps {
  const {labelStep, minorStep, reading} = dial;
  const lower = Math.floor(reading / labelStep) * labelStep;
  const gaps = (reading - lower) / minorStep;
  return [
    {text: `On the ${name} dial, count the spaces between 0 g and ${labelStep} g.`,
      equation: `${labelStep} g ÷ ${labelStep / minorStep} = ${minorStep} g per space`},
    {text: `From ${lower} g, count ${gaps} more ${gaps === 1 ? 'space' : 'spaces'} to the pointer.`,
      equation: `${lower} g + ${gaps} × ${minorStep} g = ${reading} g`},
  ];
}

function vegetableMasses(rng: Rng): Exercise {
  const onion = gramDial(rng, rng.int(1, 2));
  const squash = gramDial(rng, rng.int(3, 4));
  const total = onion.reading + squash.reading;
  return {
    prompt: 'How many grams do the onion and the squash weigh together?',
    picture: {type: 'batch10-middle', layout: 'mass-pair',
      dials: [{label: 'Onion', model: onion}, {label: 'Squash', model: squash}]},
    answer: `${total} g`,
    choices: gramChoices(rng, [total, total - onion.minorStep, total + squash.minorStep, squash.reading - onion.reading]),
    hint: 'Look at the spaces between two numbered marks on each dial. Read both masses before adding them.',
    workedSteps: [...readGramDial('onion', onion), ...readGramDial('squash', squash),
      {text: 'Add the two masses.', equation: `${onion.reading} g + ${squash.reading} g = ${total} g`}],
  };
}

function kilogramDial(gapsPerKg: number, tick: number): Batch11UpperPicture {
  const cx = 155, cy = 100, radius = 86;
  const tickCount = 4 * gapsPerKg;
  function point(i: number, distance: number) {
    const angle = 2 * Math.PI * i / tickCount;
    return {x: cx + distance * Math.sin(angle), y: cy - distance * Math.cos(angle)};
  }
  const marks: Batch11UpperMark[] = [
    {kind: 'circle', cx, cy, r: radius},
    {kind: 'text', x: 249, y: 106, text: 'kg'},
  ];
  for (let i = 0; i < tickCount; i++) {
    const numbered = i % gapsPerKg === 0;
    const outer = point(i, radius);
    const inner = point(i, numbered ? 70 : 77);
    marks.push({kind: 'line', x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y});
    if (numbered) {
      const label = point(i, 55);
      marks.push({kind: 'text', x: label.x - 5, y: label.y + 6, text: String(i / gapsPerKg)});
    }
  }
  const tip = point(tick, 77);
  marks.push({kind: 'line', x1: cx, y1: cy, x2: tip.x, y2: tip.y}, {kind: 'circle', cx, cy, r: 3, fill: '#235b4c'});
  return {type: 'batch11-upper', marks,
    label: `A dial marked in kilograms, with 0 at the top. Each kilogram has ${gapsPerKg} equal spaces. The pointer is ${tick} spaces clockwise from 0.`};
}

function soilMass(rng: Rng): Exercise {
  const gaps = rng.pick([4, 5]);
  const whole = rng.pick([1, 3]);
  const extra = rng.int(1, gaps - 1);
  const step = 1000 / gaps;
  const grams = 1000 * whole + extra * step;
  return {
    prompt: 'A bag of soil is on the scale. What is its mass in grams?',
    picture: kilogramDial(gaps, whole * gaps + extra),
    answer: `${grams} g`,
    choices: gramChoices(rng, [grams, grams - step, grams + step, grams / 10]),
    hint: 'How many spaces make one kilogram? Use 1000 grams for one kilogram.',
    workedSteps: [
      {text: `From 0 to 1 kg there are ${gaps} equal spaces. Find one space in grams.`,
        equation: `1000 g ÷ ${gaps} = ${step} g`},
      {text: `The numbered mark just before the pointer is ${whole} kg.`, equation: `${whole} kg = ${whole * 1000} g`},
      {text: `Count ${extra} more ${extra === 1 ? 'space' : 'spaces'} from that mark.`,
        equation: `${whole * 1000} g + ${extra} × ${step} g = ${grams} g`},
    ],
  };
}

function jug(name: string, x: number, gaps: number, step: number, tick: number) {
  const bottom = 164, right = x + 56;
  const yAt = (n: number) => bottom - 120 * n / gaps;
  const marks: Batch11UpperMark[] = [
    {kind: 'path', d: `M ${x} ${yAt(tick)} H ${right} V ${bottom} H ${x} Z`, fill: '#b9e1ed'},
    {kind: 'path', d: `M ${x} 32 V ${bottom} H ${right} V 32`},
    {kind: 'text', x, y: 190, text: name},
  ];
  for (let i = 0; i <= gaps; i++) {
    const y = yAt(i);
    const numbered = i % (gaps / 2) === 0;
    marks.push({kind: 'line', x1: right, y1: y, x2: right + (numbered ? 13 : 8), y2: y});
    if (numbered) marks.push({kind: 'text', x: right + 16, y: y + 5, text: `${i * step} ml`});
  }
  const halfway = gaps / 2;
  return {
    marks, reading: step * tick,
    description: `${name}: ${gaps} equal spaces from 0 ml to ${gaps * step} ml. The water is ${tick} spaces above zero.`,
    workedStep: {text: `On ${name}, ${halfway} spaces reach ${halfway * step} ml. Count ${tick} spaces from zero to the water.`,
      equation: `${halfway * step} ml ÷ ${halfway} = ${step} ml per space. ${tick} × ${step} ml = ${tick * step} ml.`},
  };
}

function waterForPlants(rng: Rng): Exercise {
  const first = jug('Jug A', 16, 8, rng.pick([20, 25]), rng.pick([2, 3, 5, 6, 7]));
  const second = jug('Jug B', 172, 10, rng.pick([50, 100]), rng.pick([2, 3, 4, 6, 7]));
  const litres = rng.pick([2, 4, 5]);
  const sum = first.reading + second.reading;
  const more = litres * 1000 - sum;
  const whole = Math.floor(more / 1000), ml = more % 1000;
  return {
    context: [`Mei needs ${litres} litres of water for her plants. She has the water in these two jugs.`],
    prompt: '(a) How many millilitres of water does Mei have? (b) How much more water does she need? Give the extra amount in litres and millilitres.',
    picture: {type: 'batch11-upper', marks: [...first.marks, ...second.marks], label: `${first.description} ${second.description}`},
    structuredResponse: {kind: 'number-fields', fields: [
      {label: '(a) Water in both jugs (ml)'}, {label: '(b) Extra water (litres)'}, {label: '(b) Remaining millilitres'},
    ]},
    answer: JSON.stringify([sum, whole, ml].map(String)),
    hint: 'Read each jug using its own marks. Add the readings, then compare the total with the water Mei needs.',
    workedSteps: [
      first.workedStep, second.workedStep,
      {text: 'Add the water in both jugs.', equation: `${first.reading} ml + ${second.reading} ml = ${sum} ml`},
      {text: 'Write the water needed in millilitres.', equation: `${litres} L = ${litres * 1000} ml`},
      {text: 'Take away the water Mei already has.', equation: `${litres * 1000} ml − ${sum} ml = ${more} ml`},
      {text: 'Group the extra water into whole litres and the millilitres left over.', equation: `${more} ml = ${whole} L ${ml} ml`},
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variants = [vegetableMasses, soilMass, waterForPlants];
  const variant = (hashString(String(seed)) + (index >>> 0)) % variants.length;
  const question = variants[variant](rng);
  return {...question, key, explanation: question.workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ')};
}
