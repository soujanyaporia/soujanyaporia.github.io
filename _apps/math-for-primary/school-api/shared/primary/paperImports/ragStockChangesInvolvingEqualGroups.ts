import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-stock-changes-involving-equal-groups',
  level: 2,
  title: 'Count what was there and what is left',
  objective: 'Use equal groups to find how many items were there at first or how many are left.',
  skillIds: ['P2.S.MD.01', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-stock-changes-involving-equal-groups',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const series = `${RAG_PATTERN.id}:${seed}`;
  const key = `${series}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(series) % 3;
  const form = ((offset + index) % 3 + 3) % 3;
  const groups = rng.pick([2, 4, 5, 6, 7, 10]);
  const each = rng.pick([2, 3, 4, 5, 10]);
  const grouped = groups * each;

  if (form === 0) {
    const discarded = rng.int(4, 9);
    const start = grouped + discarded;
    return {
      key,
      context: [
        'Nila had a box of beads.',
        `She threw away ${discarded} cracked beads.`,
        `She packed all the remaining beads into ${groups} bags. Each bag held ${each} beads.`,
      ],
      prompt: 'How many beads were in the box before Nila threw any away?',
      answer: String(start),
      unit: 'beads',
      hint: 'Count the beads in all the bags first. Which beads were also in the box at the start?',
      workedSteps: [
        { text: 'Count the beads that went into the bags.', equation: `${groups} × ${each} = ${grouped}` },
        { text: 'Add back the beads Nila threw away.', equation: `${grouped} + ${discarded} = ${start}` },
      ],
      explanation: `The box once held both the ${grouped} beads Nila packed and the ${discarded} cracked beads. It held ${start} beads in all.`,
      proof: { op: '+', a: { op: '*', a: groups, b: each }, b: discarded },
    };
  }

  if (form === 1) {
    const start = rng.int(Math.max(45, grouped + 5), grouped + 85);
    const left = start - grouped;
    return {
      key,
      context: [
        `Ravi had ${start} bookmarks.`,
        `He gave ${each} bookmarks to each of ${groups} readers.`,
      ],
      prompt: '(a) How many bookmarks did Ravi give away altogether? (b) How many bookmarks did he have left?',
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Bookmarks given away', secondLabel: '(b) Bookmarks left' },
      answer: JSON.stringify([String(grouped), String(left)]),
      hint: 'Count one equal group for each reader. Use that total to find what Ravi kept.',
      workedSteps: [
        { text: 'Count the bookmarks for all the readers.', equation: `${groups} × ${each} = ${grouped}` },
        { text: 'Take the bookmarks given away from the starting pile.', equation: `${start} − ${grouped} = ${left}` },
      ],
      explanation: `The readers received ${grouped} bookmarks between them. Ravi kept the other ${left} bookmarks.`,
    };
  }

  const lina = rng.int(125, 175);
  const wei = lina + rng.int(21, 79);
  const combined = lina + wei;
  const difference = wei - lina;
  const left = lina - grouped;
  return {
    key,
    context: [
      `Lina and Wei had ${combined} stamps altogether. Lina had ${lina} stamps.`,
      `Later, Lina gave ${each} stamps to each of ${groups} friends.`,
    ],
    prompt: '(a) At first, how many more stamps did Wei have than Lina? (b) How many stamps did Lina keep?',
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Extra stamps Wei had at first', secondLabel: '(b) Stamps Lina kept' },
    answer: JSON.stringify([String(difference), String(left)]),
    hint: 'For (a), find Wei’s stamps and compare the two collections. For (b), start with Lina’s own collection.',
    workedSteps: [
      { text: 'Find how many stamps belonged to Wei.', equation: `${combined} − ${lina} = ${wei}` },
      { text: 'Compare Wei’s collection with Lina’s.', equation: `${wei} − ${lina} = ${difference}` },
      { text: 'Count the stamps Lina gave to all her friends.', equation: `${groups} × ${each} = ${grouped}` },
      { text: 'Take those stamps from Lina’s own collection.', equation: `${lina} − ${grouped} = ${left}` },
    ],
    explanation: `Wei began with ${difference} more stamps than Lina. Lina gave away ${grouped} of her ${lina} stamps, so she kept ${left}.`,
  };
}
