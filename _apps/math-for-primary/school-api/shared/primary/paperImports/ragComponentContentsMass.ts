import {Rng, hashString} from '../../engine/random';
import type {Picture, Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-component-contents-mass',
  level: 2,
  title: 'Find the mass of part of a load',
  objective: 'Read or use a total mass, take away the known masses, and count equal containers when needed.',
  skillIds: ['P2.S.MEASURE.02', 'P2.S.AS.01', 'P2.S.MD.01'],
  canonicalPatternId: 'component-or-contents-mass-by-subtraction',
};

type Dial = Extract<Picture, {layout: 'mass-dial'}>;
type Step = {text: string; equation: string};

function dial(reading: number): Dial {
  return {type: 'batch9-early', layout: 'mass-dial', maximum: 500, minorStep: 10, labelStep: 100, reading};
}

function readPointer(load: string, grams: number): Step {
  const start = Math.floor(grams / 100) * 100;
  const marks = (grams - start) / 10;
  const spaces = marks === 1 ? 'space' : 'spaces';
  return {
    text: `${load}: count ${marks} small ${spaces} past ${start} g. Each space is 10 g.`,
    equation: `${start} g + ${marks * 10} g = ${grams} g`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + (index >>> 0)) % 7;
  function finish(q: Omit<Question, 'key' | 'explanation' | 'workedSteps'> & {workedSteps: Step[]}): Question {
    return {...q, key, explanation: q.workedSteps.map(s => `${s.text} ${s.equation}.`).join(' ')};
  }

  if (slot === 6) {
    const boxes = rng.pick([2, 3, 5, 10]);
    const empty = rng.int(1, 3);
    const potatoes = rng.int(3, 9);
    const full = empty + potatoes;
    const answer = boxes * potatoes;
    return finish({
      context: [`A stall receives ${boxes} boxes of potatoes.`, `Each full box weighs ${full} kg. Each empty box weighs ${empty} kg.`],
      prompt: 'How many kilograms of potatoes does the stall receive altogether?',
      unit: 'kg', answer: String(answer),
      choices: rng.shuffle([answer, potatoes, boxes * full, boxes * full - empty].map(String)),
      hint: 'Start with one box. Which part of its mass belongs to the potatoes?',
      workedSteps: [
        {text: 'Take away the box to find the potatoes in one box.', equation: `${full} kg − ${empty} kg = ${potatoes} kg`},
        {text: `Count ${boxes} equal lots of potatoes.`, equation: `${boxes} × ${potatoes} kg = ${answer} kg`},
      ],
    });
  }

  const total = 100 * rng.int(2, 4) + 10 * rng.int(1, 9);
  if (slot === 4) {
    const empty = 10 * rng.int(3, 9);
    const flour = total - empty;
    const dials = rng.shuffle([
      {label: 'Empty tub', model: dial(empty)},
      {label: 'Tub with flour', model: dial(total)},
    ]);
    return finish({
      context: ['Lina weighs the same tub twice, once empty and once with flour in it.'],
      prompt: 'How many grams of flour did Lina put in the tub?',
      picture: {type: 'batch10-middle', layout: 'mass-pair', dials},
      unit: 'g', answer: String(flour),
      hint: 'Use the labels to find the two readings. Which reading includes the flour?',
      workedSteps: [
        readPointer('Tub with flour', total), readPointer('Empty tub', empty),
        {text: 'Take away the mass of the tub itself.', equation: `${total} g − ${empty} g = ${flour} g`},
      ],
    });
  }

  if (slot === 5) {
    const cup = 5 * rng.int(12, 23);
    const spoon = 5 * rng.int(3, 9);
    const known = cup + spoon;
    const pouches = total - known;
    return finish({
      context: ['A red pouch, a blue pouch, a cup and a spoon are on the scale together.', `The cup weighs ${cup} g. The spoon weighs ${spoon} g.`],
      prompt: 'How many grams do the red and blue pouches weigh together?',
      picture: dial(total), unit: 'g', answer: String(pouches),
      hint: 'Which two things can you take off the scale to leave just the pouches?',
      workedSteps: [
        readPointer('All four things', total),
        {text: 'Add the masses of the cup and spoon.', equation: `${cup} g + ${spoon} g = ${known} g`},
        {text: 'Remove both from the total to leave the two pouches.', equation: `${total} g − ${known} g = ${pouches} g`},
      ],
    });
  }

  const inBag = slot % 2 === 0;
  const known = inBag ? 5 * rng.int(8, 19) : 5 * rng.int(18, 35);
  const remaining = total - known;
  return finish({
    context: inBag
      ? ['A bag of buttons is on the scale.', `The empty bag weighs ${known} g.`]
      : ['A pear and an orange are together on the scale.', `The orange weighs ${known} g.`],
    prompt: inBag ? 'How many grams do the buttons weigh on their own?' : 'Show your working on paper. How many grams does the pear weigh?',
    picture: dial(total), unit: 'g', answer: String(remaining),
    ...(inBag ? {choices: rng.shuffle([remaining, total, known, total + known].map(String))} : {}),
    hint: 'The pointer shows the whole load. Which part of that load do you already know?',
    workedSteps: [
      readPointer('Whole load', total),
      {text: inBag ? 'Take away the empty bag to leave only the buttons.' : 'Take away the orange to leave only the pear.',
        equation: `${total} g − ${known} g = ${remaining} g`},
    ],
  });
}
