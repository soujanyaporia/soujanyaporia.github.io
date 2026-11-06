import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-additive-comparison',
  level: 2,
  title: 'Compare two amounts',
  objective: 'Use the smaller amount and the extra part to explain the larger amount.',
  skillIds: ['P2.S.AS.01'],
  canonicalPatternId: 'additive-comparison',
};

type Step = {text: string; equation?: string};

function finish(key: string, task: Omit<Question, 'key' | 'workedSteps' | 'explanation'>, steps: Step[]): Question {
  return {
    ...task, key, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const kind = r.weighted([
    ['larger', 12], ['model-smaller', 2], ['model-larger', 2], ['equation', 1],
  ] as const);
  const item = r.pick(['buttons', 'tiles', 'beads']);

  if (kind === 'larger') {
    const litres = r.chance(0.5);
    const smaller = litres ? r.int(74, 88) : r.int(31, 49) * 10 + r.int(1, 9);
    const extra = litres ? r.int(26, 32) : r.pick([100, 200]);
    const larger = smaller + extra;
    const unit = litres ? 'litres' : item;
    const calculation = `${smaller} + ${extra} = ${larger}`;
    return finish(key, {
      context: litres ? [
        `The green tank holds ${smaller} litres of water.`,
        `It holds ${extra} litres less than the yellow tank.`,
      ] : [
        `A box holds ${smaller} red ${item}.`,
        `There are ${extra} more blue ${item} than red ${item}.`,
      ],
      prompt: litres ? 'How many litres of water does the yellow tank hold?'
        : `Write a number sentence on paper. How many blue ${item} are in the box?`,
      answer: String(larger), unit,
      ...(litres ? {choices: r.shuffle([larger, smaller, extra, smaller - extra]).map(String)} : {}),
      hint: litres ? 'Which tank holds more water?' : 'Which colour has the extra pieces?',
      proof: {op: '+', a: smaller, b: extra},
    }, [
      {text: litres ? 'The yellow tank holds more. Add the extra litres to the green tank’s amount.'
        : 'Match one blue piece to each red piece, then include the extra blue pieces.', equation: calculation},
      {text: `Check that the two amounts differ by ${extra} ${unit}.`, equation: `${larger} − ${smaller} = ${extra}`},
    ]);
  }

  const smaller = r.int(214, 342);
  const extra = r.int(104, 148);
  const larger = smaller + extra;
  if (kind === 'equation') {
    const answer = `${larger} − ${smaller} = ${extra}`;
    return finish(key, {
      context: [`There are ${larger} blue ${item} and ${smaller} red ${item} in a box.`],
      prompt: `Which subtraction sentence finds how many more blue ${item} there are than red ${item}?`,
      answer,
      choices: r.shuffle([answer, `${larger} + ${smaller} = ${larger + smaller}`,
        `${larger} − ${extra} = ${smaller}`, `${smaller} + ${extra} = ${larger}`]),
      hint: 'Imagine pairing each red piece with a blue piece. Which pieces would be left over?',
    }, [
      {text: 'Take the matching red count away from the blue count.', equation: answer},
      {text: `There are ${extra} extra blue ${item}. Adding them to the red count gives the blue count.`,
        equation: `${smaller} + ${extra} = ${larger}`},
    ]);
  }

  const findSmaller = kind === 'model-smaller';
  const owner = findSmaller ? 'Kai' : 'Zara';
  const given = findSmaller ? `Zara has ${larger} ${item}.` : `Kai has ${smaller} ${item}.`;
  const correctSentence = findSmaller ? 'C − B = A' : 'A + B = C';
  const otherSentence = findSmaller ? 'C + B = A' : 'A − B = C';
  const sentences = r.shuffle([correctSentence, otherSentence]);
  const choice = sentences.indexOf(correctSentence) + 1;
  const calculation = findSmaller ? `${larger} − ${extra} = ${smaller}` : `${smaller} + ${extra} = ${larger}`;

  return finish(key, {
    context: [given, `Zara has ${extra} more ${item} than Kai.`],
    prompt: `How many ${item} does ${owner} have? Fill in the bar labels. Choose the matching sentence and write it with your numbers on paper.`,
    picture: {
      type: 'paper', layout: 'bars', unit: item,
      rows: [
        {label: 'Zara (C)', parts: [{size: smaller, label: '', tone: 'green'}, {size: extra, label: 'B', tone: 'orange'}]},
        {label: 'Kai', parts: [{size: smaller, label: 'A', tone: 'green'}]},
      ],
      caption: 'C labels Zara’s whole bar.',
    },
    display: sentences.map((sentence, i) => `(${i + 1}) ${sentence}`).join('     '),
    structuredResponse: {kind: 'number-fields', fields: [
      {label: 'A (Kai’s bar)'}, {label: 'B (extra part)'}, {label: 'C (Zara’s whole bar)'}, {label: 'Sentence number (1 or 2)'},
    ]},
    answer: JSON.stringify([smaller, extra, larger, choice].map(String)),
    hint: 'Look at where Kai’s bar ends. Which part of Zara’s bar sticks out?',
  }, [
    {text: findSmaller ? 'Label Zara’s whole bar and her extra part.' : 'Label Kai’s bar and Zara’s extra part.',
      equation: findSmaller ? `C = ${larger}, B = ${extra}` : `A = ${smaller}, B = ${extra}`},
    {text: findSmaller ? 'Take away the extra part. The part left is as long as Kai’s bar.' : 'Add the extra part to the matching part to find Zara’s whole bar.',
      equation: calculation},
    {text: `Sentence ${choice} gives ${owner}’s count. ${owner} has ${findSmaller ? smaller : larger} ${item}.`,
      equation: correctSentence},
  ]);
}
