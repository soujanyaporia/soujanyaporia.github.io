import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-repeated-sum',
  level: 1 as const,
  title: 'One addend for each group',
  objective: 'Read equal groups, write one addend for each group and find the total.',
  skillIds: ['P1.S.MD.01', 'P1.S.AS.04'],
  canonicalPatternId: 'write-or-evaluate-a-repeated-sum',
};

const groupWords: Record<number, string> = { 3: 'threes', 4: 'fours', 5: 'fives', 6: 'sixes' };

function makeMatches(key: string, rng: Rng): Question {
  const small = rng.int(3, 4);
  const large = rng.int(5, 6);
  const sizes = [small, large];
  const rows = rng.shuffle(sizes.flatMap(groups => sizes.map(size => ({
    groups,
    size,
    label: `${groups} ${groupWords[size]}`,
    sum: Array.from({ length: groups }, () => size).join(' + '),
  }))));
  const sums = rng.shuffle(rows.map(row => row.sum));
  if (rows.every((row, i) => row.sum === sums[i])) sums.push(sums.shift()!);
  const matches = rows.map(row => String(sums.indexOf(row.sum) + 1));

  return {
    key,
    prompt: 'Which sum goes with each group of words? Write its number beside the words. Use each sum once.',
    context: sums.map((sum, i) => `Sum ${i + 1}: ${sum}`),
    structuredResponse: { kind: 'number-fields', fields: rows.map(row => ({ label: row.label })) },
    answer: JSON.stringify(matches),
    hint: 'Read the first number to see how many copies you need. The word after it tells you which number to repeat.',
    explanation: rows.map((row, i) => `${row.label} goes with Sum ${matches[i]}.`).join(' '),
    workedSteps: rows.map((row, i) => ({
      text: `For ${row.label}, look for ${row.groups} copies of ${row.size}. Sum ${matches[i]} has exactly those addends.`,
      equation: `${row.sum} = ${row.groups * row.size}`,
    })),
  };
}

const traySizes: Record<number, number[]> = {
  3: [2, 3, 5],
  4: [2, 4, 5],
  5: [3, 4, 5],
};

function drawTrays(groups: number, size: number): PaperPicture {
  return {
    type: 'paper', layout: 'cards', heading: 'Pencil trays',
    cards: Array.from({ length: groups }, (_, i) => ({
      label: `Tray ${i + 1}`, value: 'Pencils', icon: 'pencil', count: size,
    })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = rng.pick(['match', 'write', 'evaluate', 'count'] as const);
  if (task === 'match') return makeMatches(key, rng);

  const groups = rng.int(3, 5);
  const size = rng.pick(traySizes[groups]);
  const terms = Array.from({ length: groups }, () => size);
  const total = groups * size;
  const equation = `${terms.join(' + ')} = ${total}`;
  const runningTotals = terms.map((_, i) => (i + 1) * size).join(', ');

  if (task === 'evaluate') {
    return {
      key, prompt: 'Add these numbers. What goes in the box?',
      display: `${terms.join(' + ')} = □`, answer: String(total),
      hint: 'Start with the first number. Count on by that same number for each new addend.',
      explanation: `There are ${groups} copies of ${size}. ${equation}.`,
      workedSteps: [
        { text: `Count the addends. There are ${groups}, and each one is ${size}.` },
        { text: `Count on in steps of ${size}: ${runningTotals}.`, equation },
      ],
    };
  }

  const explanation = `Each tray holds ${size} pencils. Adding one ${size} for each of the ${groups} trays gives ${total} pencils.`;
  const workedSteps = [
    { text: `One tray holds ${size} pencils. Each of the ${groups} trays gives us one addend.`, equation: terms.join(' + ') },
    { text: `Count on tray by tray: ${runningTotals}. There are ${total} pencils altogether.`, equation },
  ];
  if (task === 'count') {
    return {
      key, prompt: 'How many pencils are in one tray? How many are in all the trays?',
      context: [`There are ${groups} trays of pencils.`], picture: drawTrays(groups, size),
      structuredResponse: { kind: 'number-pair', firstLabel: 'Pencils in one tray', secondLabel: 'Pencils in all the trays' },
      answer: JSON.stringify([String(size), String(total)]),
      hint: 'Count the pencils in one tray first. Then add the same number for each tray.',
      explanation, workedSteps,
    };
  }

  const givens = rng.chance(0.5)
    ? { picture: drawTrays(groups, size) }
    : { context: [`There are ${groups} trays. Each tray holds ${size} pencils.`] };
  return {
    key, ...givens, prompt: 'Write an addition sentence for the pencils. Use one box for each tray, then fill in the total.',
    display: `${terms.map(() => '□').join(' + ')} = □`,
    structuredResponse: {
      kind: 'number-fields',
      fields: [...terms.map((_, i) => ({ label: `Tray ${i + 1}` })), { label: 'Total pencils' }],
    },
    answer: JSON.stringify([...terms, total].map(String)),
    hint: 'How many pencils does one tray contribute? Write that number once for every tray.',
    explanation, workedSteps,
  };
}
