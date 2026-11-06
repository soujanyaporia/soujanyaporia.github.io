import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p1-read-group-count-and-size',
  level: 1,
  title: 'How are the pencils grouped?',
  objective: 'Tell how many groups there are and how many objects are in each group.',
  skillIds: ['P1.S.MD.01'],
  canonicalPatternId: 'read-group-count-and-group-size',
};

const groupNames: Record<number, string> = { 2: 'twos', 3: 'threes', 4: 'fours', 5: 'fives' };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.pick(['choose', 'enter', 'mistake', 'multiply'] as const);
  const trays = rng.int(2, 5);
  const pencils = rng.pick([2, 3, 4, 5].filter(n => n !== trays));
  const description = `${trays} groups of ${pencils}`;
  const pair = {
    answer: JSON.stringify([String(trays), String(pencils)]),
    structuredResponse: {
      kind: 'number-pair' as const,
      firstLabel: 'Number of trays',
      secondLabel: 'Pencils on each tray',
    },
  };

  if (mode === 'multiply') {
    return {
      key, ...pair,
      prompt: 'How many trays are there? How many pencils go on each tray?',
      context: ['In this multiplication, the first number counts the trays. The second number tells how many pencils go on each tray.'],
      display: `${trays} × ${pencils}`,
      hint: 'Read the two numbers from left to right.',
      workedSteps: [
        { text: `The first number is ${trays}, so there are ${trays} trays.` },
        { text: `The second number is ${pencils}, so each tray holds ${pencils} pencils.` },
      ],
      explanation: `${trays} × ${pencils} describes ${description} here.`,
    };
  }

  const picture: PaperPicture = {
    type: 'paper', layout: 'cards', heading: 'Pencil trays',
    cards: Array.from({ length: trays }, (_, i) => ({
      label: `Tray ${String.fromCharCode(65 + i)}`, value: 'Pencils', icon: 'pencil' as const, count: pencils,
    })),
  };
  const base = {
    key, picture,
    context: ['Each tray is one group.'],
    hint: 'Count the trays first. Then count the pencils on just one tray.',
    workedSteps: [
      { text: `Count each tray once. The ${trays} trays make ${trays} groups.` },
      { text: `Count the pencils on tray A. It holds ${pencils}. Each other tray holds the same number.` },
    ],
    explanation: `There are ${trays} trays with ${pencils} pencils on each tray. That makes ${description}.`,
  };

  if (mode === 'enter') {
    return { ...base, ...pair, prompt: 'Count the trays and the pencils on each tray. Fill in both numbers.' };
  }

  if (mode === 'mistake') {
    const wrong = rng.int(0, 2);
    const statements = [
      `There are ${wrong === 0 ? pencils : trays} trays.`,
      `Each tray holds ${wrong === 1 ? trays : pencils} pencils.`,
      `The picture shows ${wrong === 2 ? `${pencils} groups of ${trays}` : description}.`,
    ];
    const answer = statements[wrong];
    const correction = `The sentence “${answer}” has a mistake. The picture shows ${description}.`;
    return {
      ...base, prompt: 'Which sentence has a mistake?', answer, choices: rng.shuffle(statements),
      workedSteps: [...base.workedSteps, { text: correction }],
      explanation: correction,
    };
  }

  const shortNames = rng.chance(0.5);
  const label = (groups: number, size: number) => shortNames
    ? `${groups} ${groupNames[size]}`
    : `${groups} groups of ${size}`;
  const answer = label(trays, pencils);
  const conclusion = shortNames ? `${description} can be called ${answer}.` : `The matching label is ${answer}.`;
  return {
    ...base, prompt: 'Which label describes the pencils on these trays?', answer,
    choices: rng.shuffle([answer, label(pencils, trays), label(trays, trays), label(pencils, pencils)]),
    workedSteps: [...base.workedSteps, { text: conclusion }],
    explanation: `${base.explanation} ${conclusion}`,
  };
}
