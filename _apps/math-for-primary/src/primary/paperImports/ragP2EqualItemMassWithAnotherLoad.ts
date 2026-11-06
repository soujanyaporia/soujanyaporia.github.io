import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-equal-item-mass-with-another-load',
  level: 2,
  title: 'Weigh the other load',
  objective: 'Use the mass of equal items and a second weighing or comparison to find one missing mass.',
  skillIds: ['P2.S.MEASURE.02', 'P2.S.MD.02', 'P2.S.AS.01', 'P2.S.MD.01'],
  canonicalPatternId: 'p2-equal-item-mass-with-another-load',
};

type MassTask = Pick<Question, 'prompt' | 'answer' | 'context' | 'hint' | 'picture'> & {
  unit: 'kg' | 'g';
  workedSteps: { text: string; equation: string }[];
};

function heavierSack(r: Rng): MassTask {
  const pairMass = 2 * r.int(3, 9);
  const extra = r.int(2, 7);
  const small = pairMass / 2;
  const large = small + extra;
  return {
    context: [
      `2 small sacks of rice weigh ${pairMass} kg altogether. They both weigh the same.`,
      `A large sack weighs ${extra} kg more than one small sack.`,
    ],
    prompt: 'How much does the large sack weigh?',
    answer: String(large),
    unit: 'kg',
    hint: 'The first mass is for both small sacks. How much does just one weigh?',
    workedSteps: [
      { text: 'Share the mass equally between the two small sacks.', equation: `${pairMass} kg ÷ 2 = ${small} kg` },
      { text: 'Add the extra mass to the mass of one small sack.', equation: `${small} kg + ${extra} kg = ${large} kg` },
    ],
  };
}

function parcelBalances(r: Rng): MassTask {
  const count = r.pick([2, 3, 4]);
  const weight = count * r.int(2, 4);
  const small = weight / count;
  const combined = weight + weight;
  const long = combined - small;
  return {
    context: ['The small parcels all weigh the same. Each card shows a load and the weights that balance it.'],
    picture: {
      type: 'paper', layout: 'cards', heading: 'Level balances',
      cards: [
        { label: `${count} small parcels`, value: `${weight} kg` },
        { label: '1 small parcel and 1 long parcel', value: `${weight} kg and ${weight} kg` },
      ],
    },
    prompt: 'How much does the long parcel weigh?',
    answer: String(long),
    unit: 'kg',
    hint: 'Start with the balance that holds only small parcels. Then look at both weights on the other balance.',
    workedSteps: [
      { text: 'Find the mass of one small parcel.', equation: `${weight} kg ÷ ${count} = ${small} kg` },
      { text: 'Add the two weights that balance the mixed load.', equation: `${weight} kg + ${weight} kg = ${combined} kg` },
      { text: 'Take away the mass of the small parcel. The rest is the long parcel.', equation: `${combined} kg − ${small} kg = ${long} kg` },
    ],
  };
}

function cubesOnScale(r: Rng): MassTask {
  const count = r.pick([2, 3, 4]);
  const marble = r.int(2, 4);
  const bothMarbles = 2 * marble;
  const reading = count * r.int(5, 9) + bothMarbles;
  const cubes = reading - bothMarbles;
  const oneCube = cubes / count;
  return {
    context: ['The cubes all weigh the same. The marbles also weigh the same as each other.'],
    picture: {
      type: 'paper', layout: 'cards', heading: 'Scale readings',
      cards: [
        { label: `${count} cubes and 2 marbles`, value: `${reading} g` },
        { label: '1 marble', value: `${marble} g` },
      ],
    },
    prompt: 'How much does one cube weigh?',
    answer: String(oneCube),
    unit: 'g',
    hint: 'Use the reading for one marble to find how much both marbles weigh. What is left for the cubes?',
    workedSteps: [
      { text: 'Find the mass of the two marbles on the first scale.', equation: `2 × ${marble} g = ${bothMarbles} g` },
      { text: 'Take away the marbles to find the mass of all the cubes.', equation: `${reading} g − ${bothMarbles} g = ${cubes} g` },
      { text: 'Share that mass equally among the cubes.', equation: `${cubes} g ÷ ${count} = ${oneCube} g` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const builders = [heavierSack, parcelBalances, cubesOnScale];
  const start = new Rng(hashString(`${RAG_PATTERN.id}:${seed}`)).int(0, builders.length - 1);
  const offset = (start + Math.trunc(index)) % builders.length;
  const build = builders[(offset + builders.length) % builders.length];
  const task = build(new Rng(hashString(key)));
  return {
    ...task,
    key,
    explanation: task.workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
