import { Rng, hashString } from '../../engine/random';
import type { Picture, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-mass-extremes',
  level: 2,
  title: 'Compare bags on weighing scales',
  objective: 'Read gram dials, choose the lightest and heaviest bags, and find their total mass or the difference between their masses.',
  skillIds: ['P2.S.MEASURE.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-calculate-with-the-two-extremes',
};

type ScaleGroup = Extract<Picture, { layout: 'mass-pair' }>;
const bagLabels = ['Red bag', 'Blue bag', 'Green bag', 'Yellow bag'];
const masses = Array.from({ length: 37 }, (_, i) => 15 + 5 * i)
  .filter(grams => grams % 50 !== 0);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const askTotal = (hashString(String(seed)) + Math.trunc(index)) % 2 === 0;
  const readings = rng.shuffle(masses).slice(0, askTotal ? 3 : 4);
  const dials: ScaleGroup['dials'] = readings.map((reading, i) => ({
    label: bagLabels[i],
    model: { type: 'batch9-early', layout: 'mass-dial', maximum: 200, minorStep: 5, labelStep: 50, reading },
  }));

  const ordered = [...dials].sort((a, b) => a.model.reading - b.model.reading);
  const lightest = ordered[0];
  const heaviest = ordered[ordered.length - 1];
  const low = lightest.model.reading;
  const high = heaviest.model.reading;
  const result = askTotal ? high + low : high - low;
  const workedSteps = [
    { text: 'Count the ten equal spaces between 0 and 50 g to find the mass for one space.', equation: '50 g ÷ 10 = 5 g' },
    { text: 'Count in fives to read each pointer.', equation: dials.map(d => `${d.label} = ${d.model.reading} g`).join(', ') },
    { text: `The ${lightest.label.toLowerCase()} is the lightest. The ${heaviest.label.toLowerCase()} is the heaviest.`, equation: ordered.map(d => `${d.model.reading} g`).join(' < ') },
    { text: askTotal ? 'Add the masses of those two bags.' : 'Take the smaller mass away from the larger mass.', equation: `${high} g ${askTotal ? '+' : '−'} ${low} g = ${result} g` },
  ];

  return {
    key,
    context: ['Each scale holds one bag of buttons.'],
    picture: { type: 'batch10-middle', layout: 'mass-pair', dials },
    prompt: askTotal ? 'How much do the lightest bag and the heaviest bag weigh together?' : 'How many grams heavier is the heaviest bag than the lightest bag?',
    answer: String(result),
    unit: 'g',
    hint: 'Start at zero and read clockwise. Which two bags have the smallest and largest readings?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: { op: askTotal ? '+' : '-', a: high, b: low },
  };
}
