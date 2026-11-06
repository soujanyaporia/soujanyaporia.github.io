import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1s-rag-equal-group-equation',
  level: 1,
  title: 'Write an equal-group equation',
  objective: 'Use the number of groups and the number in each group to write a multiplication equation within 40.',
  skillIds: ['P1.S.MD.01'],
  canonicalPatternId: 'write-an-equal-group-equation',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['picture', 'picture', 'story', 'story-with-total'] as const);
  const shelves = rng.int(3, 8);
  const booksPerShelf = rng.pick([3, 5, 7].filter(n => shelves * n <= 40));
  const total = shelves * booksPerShelf;
  const equation = `${shelves} × ${booksPerShelf} = ${total}`;
  const addition = `${Array(shelves).fill(booksPerShelf).join(' + ')} = ${total}`;
  const common = {
    key,
    hint: form === 'picture'
      ? 'Count the shelves. Then count the books on just one shelf.'
      : 'Find the number of shelves and the number of books on each shelf.',
    workedSteps: [
      { text: `There are ${shelves} shelves with ${booksPerShelf} books on each shelf.` },
      { text: 'Add one equal group for every shelf.', equation: addition },
      { text: 'Write the number of shelves times the number of books on each shelf.', equation },
    ],
    explanation: `${shelves} groups of ${booksPerShelf} books make ${total} books altogether.`,
  };
  const context = form === 'picture' ? undefined : [
    `The bookcase has ${shelves} shelves.`,
    `There are ${booksPerShelf} books on each shelf.`,
  ];

  if (form === 'story-with-total') {
    return {
      ...common,
      context,
      prompt: 'Fill in the multiplication equation. Then use your answer to finish the sentence.',
      display: '□ × □ = □',
      workedSteps: [...common.workedSteps, { text: `Use the number after the equals sign. There are ${total} books altogether.` }],
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          { label: 'First box (shelves)' },
          { label: 'Second box (books on each shelf)' },
          { label: 'Box after the equals sign' },
          { label: 'There are ___ books altogether.' },
        ],
      },
      answer: JSON.stringify([shelves, booksPerShelf, total, total].map(String)),
    };
  }

  return {
    ...common,
    context,
    prompt: 'Write a multiplication equation to show how many books there are altogether.',
    picture: form === 'picture' ? {
      type: 'paper',
      layout: 'cards',
      heading: 'Books on the shelves',
      cards: Array.from({ length: shelves }, (_, i) => ({
        label: `Shelf ${i + 1}`,
        value: '',
        icon: 'book',
        count: booksPerShelf,
      })),
    } : undefined,
    numberSentence: {
      numbers: rng.shuffle([shelves, booksPerShelf]),
      operation: '*',
      missingResult: true,
      chooseOperation: true,
      freeEntry: form === 'picture',
    },
    answer: equation,
  };
}
