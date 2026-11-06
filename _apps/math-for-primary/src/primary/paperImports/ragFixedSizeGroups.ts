import { hashString, Rng } from '../../engine/random';
import type { Picture, Question } from '../generate';
import { exampleGrouping, groupingValue, type GroupingSpec } from '../groupingAnswer';

export const RAG_PATTERN = {
  id: 'p1s-rag-fixed-size-groups',
  level: 1,
  title: 'Make groups of the same size',
  objective: 'Use every object once to make groups of a given size and count the groups.',
  skillIds: ['P1.S.MD.02'],
  canonicalPatternId: 'form-or-count-groups-of-a-fixed-size',
};

type Task = 'sort' | 'pack' | 'bags' | 'loops' | 'badges';
const activities: Task[][] = [['sort'], ['pack', 'bags'], ['loops'], ['badges']];

export function makeRagQuestion(seed: number, index = 0): Question {
  const block = Math.floor(index / 5);
  const stream = (label: string) => new Rng(hashString([RAG_PATTERN.id, seed, block, label].join(':')));
  // Shuffle the activities while keeping each construction beside its count.
  const task = stream('order').shuffle(activities).flat()[index - block * 5];
  const linked = task === 'pack' || task === 'bags';
  const rng = stream(linked ? 'gift-bags' : task);
  const total = rng.pick([6, 8, 9, 10, 12, 14, 16, 18]);
  const size = rng.pick([2, 3, 4, 6].filter(n => n < total && total % n === 0));
  const groups = total / size;
  const full: Picture = { type: 'counters', count: total, group: size };
  const loose: Picture = { type: 'counters', count: total };
  const tally = Array.from({ length: groups }, (_, i) => (i + 1) * size).join(', ');
  const check = Array(groups).fill(size).join(' + ') + ' = ' + total;
  const story = 'Nia has ' + total + ' gifts. She packs ' + size + ' gifts in each bag.';
  const key = [RAG_PATTERN.id, seed, index].join(':');

  if (task === 'sort' || task === 'pack') {
    const grouping: GroupingSpec = { total, objectLabel: 'gift', target: { kind: 'size', value: size } };
    return {
      key, grouping, answer: groupingValue(exampleGrouping(grouping)),
      context: linked ? [story] : undefined,
      prompt: linked ? 'Show how Nia packs all the gifts. Make one group for each bag.'
        : 'Sort all the gifts into groups of ' + size + '.',
      hint: 'Choose ' + size + ' gifts for the first group. Start a new group with gifts you have not used.',
      workedSteps: [
        { text: 'Set aside ' + size + ' gifts at a time. Count how many gifts you have used after each group.', equation: tally },
        { text: 'Count the groups. Check that together they hold all ' + total + ' gifts.', equation: check },
      ],
      explanation: 'There are ' + groups + ' groups with ' + size + ' gifts in each. No gifts are left over.',
    };
  }

  if (task === 'bags') {
    return {
      key, context: [story, 'Each star stands for one gift. Each loop shows one packed bag.'],
      prompt: 'How many bags does Nia fill?', picture: full, answer: String(groups), unit: 'bags',
      hint: 'Count each loop once. Each loop stands for one bag.',
      workedSteps: [
        { text: 'Check that each loop has ' + size + ' stars. That is enough for one bag.', picture: full },
        { text: 'Count the loops to find the number of bags.', equation: groups + ' bags' },
      ],
      explanation: groups + ' bags hold all ' + total + ' gifts, with ' + size + ' gifts in each bag.',
    };
  }

  if (task === 'loops') {
    return {
      key, prompt: 'How many groups of ' + size + ' stars are inside the loops?',
      picture: full, answer: String(groups), unit: 'groups',
      hint: 'Count the stars in one loop first. Then count the loops.',
      workedSteps: [
        { text: 'Each loop has ' + size + ' stars, so each loop is one whole group.' },
        { text: 'Count the loops, one group at a time.', equation: Array.from({ length: groups }, (_, i) => i + 1).join(', ') },
      ],
      explanation: 'The loops show ' + groups + ' complete groups of ' + size + ' stars.',
    };
  }

  return {
    key, context: ['Put ' + size + ' stars on each badge. Use every star.'],
    prompt: 'How many badges can you make?', picture: loose, answer: String(groups), unit: 'badges',
    hint: 'Count the stars. Take enough for one badge at a time.',
    workedSteps: [
      { text: 'Count all the stars in the picture.', equation: total + ' stars' },
      { text: 'Take ' + size + ' stars for each badge. Count one badge for each group.', picture: full, equation: check },
    ],
    explanation: 'All ' + total + ' stars fit on ' + groups + ' badges with ' + size + ' stars on each.',
  };
}
