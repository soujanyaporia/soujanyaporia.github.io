import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { makeBatch5Early } from './batch5Early';

export const RAG_PATTERN = {
  id: 'p1-rag-picture-equations',
  level: 1 as const,
  title: 'Read a picture and make an equation',
  objective: 'Count pictured objects and use their groups or marks to build or choose a matching equation.',
  skillIds: ['P1.S.WN.01', 'P1.S.AS.02', 'P1.S.AS.04', 'P1.S.MD.01'],
  canonicalPatternId: 'p1-translate-a-picture-into-an-equation',
};

function shelfEquations(key: string, rng: Rng): Question {
  const each = rng.int(4, 9);
  const shelves = ['Shelf A', 'Shelf B'];
  const total = shelves.length * each;
  const addition = `${each} + ${each} = ${total}`;
  const product = `${shelves.length} × ${each} = ${total}`;
  const labels = ['Books on shelf A', 'Books on shelf B', 'Total using +',
    'Number of shelves', 'Books on one shelf', 'Total using ×'];
  return {
    key,
    prompt: 'Fill in both equations for the books on the shelves.',
    context: ['For +, use one box for each shelf before the equals sign. For ×, put the number of shelves first.'],
    display: '□ + □ = □     and     □ × □ = □',
    picture: { type: 'paper', layout: 'cards', cards: shelves.map(label => ({
      label, icon: 'book', value: 'Books', count: each,
    })) },
    structuredResponse: { kind: 'number-fields', fields: labels.map(label => ({ label })) },
    answer: JSON.stringify([each, each, total, shelves.length, each, total].map(String)),
    hint: 'Count one shelf. Does the other shelf hold the same number?',
    workedSteps: [
      { text: `Each shelf holds ${each} books. Add the two shelf counts.`, equation: addition },
      { text: `There are ${shelves.length} groups of ${each} books. Write that with a times sign.`, equation: product },
    ],
    explanation: `Both equations count the same books. ${addition} and ${product}.`,
  };
}

function usedTickets(key: string, rng: Rng): Question {
  const total = rng.int(5, 10);
  const possibleUsed = Array.from({ length: total - 1 }, (_, i) => i + 1)
    .filter(n => n !== total - n);
  const used = rng.pick(possibleUsed);
  const left = total - used;
  const answer = `${total} − ${used} = ${left}`;
  return {
    key,
    prompt: 'Which equation shows how many tickets are left to use?',
    context: ['Each crossed-out ticket has been used.'],
    picture: { type: 'paper', layout: 'cards', cards: [
      { label: 'Tickets', value: 'One ticket per picture', icon: 'ticket', count: total, removed: used },
    ] },
    choices: rng.shuffle([answer, `${left} + ${used} = ${total}`,
      `${total} − ${left} = ${used}`, `${total} − 0 = ${total}`]),
    answer,
    hint: 'Start with every ticket, including the crossed-out ones. Which tickets do you take away?',
    workedSteps: [
      { text: `Count all ${total} tickets. Of these, ${used} ${used === 1 ? 'has' : 'have'} a cross.` },
      { text: 'Take away the used tickets. The tickets without a cross are left.', equation: answer },
    ],
    explanation: `Start with ${total} tickets and take away ${used} used tickets. ${answer}.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) % 3 + 3) % 3;
  if (variant === 0) {
    // Use the existing free-entry subtraction, drawing a whole within nine.
    let draw = hashString(key);
    let question = makeBatch5Early('10', draw);
    while (question.numberSentence?.numbers.includes(10)) {
      draw = (draw + 1) >>> 0;
      question = makeBatch5Early('10', draw);
    }
    return { ...question, key };
  }
  return variant === 1 ? shelfEquations(key, rng) : usedTickets(key, rng);
}
