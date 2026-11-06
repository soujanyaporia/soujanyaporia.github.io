import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-difference-between-readings',
  level: 2,
  title: 'Compare distances, heights and masses',
  objective: 'Use a diagram to find the measurements you need, then compare them in the same unit.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.MEASURE.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-difference-between-readings',
};

type Step = { text: string; equation: string };
type Task = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & { workedSteps: Step[] };

function route(r: Rng): Task {
  const near = r.int(162, 355);
  const extra = r.int(31, 186);
  const far = near + extra;
  const whole = near + far;
  return {
    context: ['Follow the path from left to right. It goes from the pond past the shelter to the gate.'],
    picture: {
      type: 'paper', layout: 'bars', totalLabel: `Pond to gate: ${whole} m`,
      rows: [{ label: 'Path', parts: [
        { size: near, label: `${near} m`, tone: 'blue' },
        { size: far, label: '?', tone: 'green' },
      ] }],
      caption: 'The two parts meet at the shelter.',
    },
    prompt: '(a) How far is the gate from the shelter? (b) From the shelter, how much farther is it to the gate than to the pond?',
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Shelter to gate (m)', secondLabel: '(b) Difference (m)' },
    answer: JSON.stringify([String(far), String(extra)]),
    hint: 'Take the pond part away from the whole path. Then compare the two parts.',
    workedSteps: [
      { text: 'Take away the part from the pond to the shelter to find the part from the shelter to the gate.', equation: `${whole} − ${near} = ${far} m` },
      { text: 'Both distances start at the shelter. Take the shorter distance away from the longer one.', equation: `${far} − ${near} = ${extra} m` },
    ],
  };
}

function parcels(r: Rng): Task {
  const small = r.int(8, 14) * 10;
  const lastLabel = 100 * r.int(5, 8);
  const ticks = r.int(1, 4);
  const total = lastLabel + 20 * ticks;
  const large = total - small;
  const difference = large - small;
  return {
    context: [`The small parcel has a mass of ${small} g.`, 'The scale shows the two parcels together.'],
    picture: { type: 'batch9-early', layout: 'mass-dial', maximum: 1000, minorStep: 20, labelStep: 100, reading: total },
    prompt: 'How much heavier is the large parcel than the small parcel?',
    choices: r.shuffle([difference, large, small, total].map(n => `${n} g`)),
    answer: `${difference} g`,
    hint: 'Read the total on the dial. Find the mass of the large parcel before you compare the parcels.',
    workedSteps: [
      { text: `Each small step is 20 g. Count ${ticks} ${ticks === 1 ? 'step' : 'steps'} past ${lastLabel} g to read the total.`, equation: `${lastLabel} + ${ticks * 20} = ${total} g` },
      { text: 'Take the small parcel off the scale to find what the large parcel alone would weigh.', equation: `${total} − ${small} = ${large} g` },
      { text: 'Find how much heavier the large parcel is.', equation: `${large} − ${small} = ${difference} g` },
    ],
  };
}

function trees(r: Rng): Task {
  const elm = r.int(10, 15);
  const lowerGap = r.int(3, 5);
  const upperGap = r.int(6, 10);
  const pine = elm + lowerGap;
  const oak = pine + upperGap;
  const fullGap = lowerGap + upperGap;
  const elmPart = { size: elm, label: '?', tone: 'green' as const };
  const pineParts = [elmPart, { size: lowerGap, label: `${lowerGap} m`, tone: 'blue' as const }];
  const selected = r.int(0, 3);
  const claims = [
    `The pine is ${selected === 0 ? pine : oak - lowerGap} m tall.`,
    `The elm is ${selected === 1 ? elm : lowerGap} m tall.`,
    `The oak is ${selected === 2 ? fullGap : upperGap} m taller than the elm.`,
    `The pine is ${selected === 3 ? upperGap : fullGap} m shorter than the oak.`,
  ];
  return {
    context: ['The trees grow on level ground. Each bar shows the height of one tree.'],
    picture: {
      type: 'paper', layout: 'bars', totalLabel: `Oak height: ${oak} m`,
      rows: [
        { label: 'Elm', parts: [elmPart] },
        { label: 'Pine', parts: pineParts },
        { label: 'Oak', parts: [...pineParts, { size: upperGap, label: `${upperGap} m`, tone: 'orange' }] },
      ],
    },
    prompt: 'Which sentence about the trees is true?',
    choices: r.shuffle(claims),
    answer: claims[selected],
    hint: 'Start with the oak. The last part of each longer bar shows how much taller that tree is.',
    workedSteps: [
      { text: 'Take the extra part of the oak bar away to find the height of the pine.', equation: `${oak} − ${upperGap} = ${pine} m` },
      { text: 'Take the extra part of the pine bar away to find the height of the elm.', equation: `${pine} − ${lowerGap} = ${elm} m` },
      { text: 'Find how much taller the oak is than the elm.', equation: `${oak} − ${elm} = ${fullGap} m` },
      { text: 'Compare these heights and gaps with the four sentences.', equation: claims[selected] },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + (index >>> 0)) % 4;
  const task = slot < 2 ? route(r) : slot === 2 ? parcels(r) : trees(r);
  return { ...task, key, explanation: task.workedSteps.map(step => `${step.text} ${step.equation}`).join(' ') };
}
