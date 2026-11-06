import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {Batch9EarlyPicture} from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'p3-rag-grouped-scale-masses',
  level: 3,
  title: 'Find masses from weighing scales',
  objective: 'Use equal pan loads or two scale readings to find the mass of one object or a group.',
  skillIds: ['P2.S.MEASURE.02', 'P3.S.MD.04', 'P3.S.AS.01', 'P3.S.MD.03'],
  canonicalPatternId: 'mass-from-grouped-objects-on-scales',
};

type Steps = NonNullable<Question['workedSteps']>;
type PanPart = Extract<PaperPicture, {layout: 'bars'}>['rows'][number]['parts'][number];
type Dial = Extract<Batch9EarlyPicture, {layout: 'mass-dial'}>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = (hashString(String(seed)) % 6 + Math.trunc(index) % 6 + 6) % 6;
  const finish = (body: Omit<Question, 'key' | 'explanation' | 'workedSteps'>, steps: Steps): Question => ({
    ...body, key, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (slot % 2 === 0) {
    const count = rng.int(2, 4);
    const each = rng.pick([5, 7, 8, 9]);
    const equivalentCount = count + count;
    const kg = equivalentCount * each;
    const bags: PanPart[] = Array.from({length: count}, () => ({label: 'Bag', size: 1, tone: 'blue'}));
    const crate: PanPart = {label: 'Crate', size: count, tone: 'green'};
    return finish({
      context: ['The bars show what is on each pan of two level balances. All the bags have the same mass. The same crate is used both times.'],
      picture: {type: 'paper', layout: 'bars', rows: [
        {label: 'Balance 1, left', parts: bags},
        {label: 'Balance 1, right', parts: [crate]},
        {label: 'Balance 2, left', parts: [crate, ...bags]},
        {label: 'Balance 2, right', parts: [{label: `${kg} kg`, size: equivalentCount, tone: 'orange'}]},
      ]},
      prompt: 'How many kilograms does one bag weigh?', answer: String(each), unit: 'kg',
      hint: 'Use the first balance to work out how many bags could take the place of the crate on the second balance.',
    }, [
      {text: `The crate balances ${count} bags on the first balance.`},
      {text: 'Replace the crate on the second balance and count all the bags.', equation: `${count} + ${count} = ${equivalentCount} bags`},
      {text: 'Share the mass equally among those bags.', equation: `${kg} kg ÷ ${equivalentCount} = ${each} kg`},
    ]);
  }

  if (slot === 1) {
    const bags = rng.int(2, 4);
    const weights = bags + rng.int(1, 2);
    const weight = bags * rng.int(3, 7) * 5;
    const total = weights * weight;
    const each = total / bags;
    return finish({
      context: ['The two pans balance. The sandbags all weigh the same. Each picture stands for one object.'],
      picture: {type: 'paper', layout: 'cards', cards: [
        {label: 'Left pan', value: 'Sandbags', icon: 'bag', count: bags},
        {label: 'Right pan', value: `Each weight is ${weight} g`, icon: 'box', count: weights},
      ]},
      prompt: 'How many grams does one sandbag weigh?',
      answer: String(each), unit: 'g',
      choices: rng.shuffle([each, total, weight, total - weight].map(String)),
      hint: 'Find the mass of all the weights on the right pan. The sandbags on the left share that mass equally.',
    }, [
      {text: 'Count the weights and find their total mass.', equation: `${weights} × ${weight} g = ${total} g`},
      {text: `The ${bags} sandbags together weigh ${total} g. Divide to find the mass of one sandbag.`, equation: `${total} g ÷ ${bags} = ${each} g`},
    ]);
  }

  const balls = rng.int(2, 4);
  const ball = rng.int(2, 8) * 10;
  const boat = rng.int(4, 13) * 10 + 5;
  const groupReading = balls * ball;
  const mixedReading = ball + boat;
  const wanted = slot === 3 ? 1 : rng.int(2, 4);
  const first: Dial = {type: 'batch9-early', layout: 'mass-dial', maximum: 500, labelStep: 100, minorStep: 10, reading: groupReading};
  const second: Dial = {type: 'batch9-early', layout: 'mass-dial', maximum: 250, labelStep: 50, minorStep: 5, reading: mixedReading};
  const steps: Steps = [
    {text: `On the ball scale, ten spaces span 100 g. Each space is 10 g. The balls together weigh ${groupReading} g.`},
    {text: 'Divide the reading by the number of balls.', equation: `${groupReading} g ÷ ${balls} = ${ball} g`},
    {text: `On the boat scale, ten spaces span 50 g. Each space is 5 g. The boat and ball together weigh ${mixedReading} g.`},
    {text: 'Take away the mass of one ball to find the mass of the boat.', equation: `${mixedReading} g − ${ball} g = ${boat} g`},
  ];
  if (wanted > 1) steps.push({
    text: 'Each boat has the same mass. Multiply by the number of boats.',
    equation: `${wanted} × ${boat} g = ${wanted * boat} g`,
  });
  return finish({
    context: ['All the balls have the same mass.'],
    picture: {type: 'batch10-middle', layout: 'mass-pair', dials: [
      {label: `${balls} balls`, model: first}, {label: '1 ball and 1 toy boat', model: second},
    ]},
    prompt: wanted === 1 ? 'How many grams does the toy boat weigh?' :
      `What is the total mass in grams of ${wanted} boats like this one if they all weigh the same?`,
    answer: String(wanted * boat), unit: 'g',
    hint: 'Start with the scale that holds only balls. How much of the other reading belongs to the ball?',
  }, steps);
}
