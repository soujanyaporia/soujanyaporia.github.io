import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-missing-denomination-count',
  level: 2,
  title: 'Find the missing number of notes or coins',
  objective: 'Find how much money is left, then use the value of one note or coin to count how many fit.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.AS.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-missing-denomination-count',
};

type Step = { text: string; equation: string };
type Story = {
  total: number;
  known: number;
  face: number;
  currency: 'dollars' | 'cents';
  unit: 'notes' | 'coins';
  context: string[];
  prompt: string;
  hint: string;
  subtraction: string;
  knownSteps: Step[];
  picture?: Question['picture'];
};

function amount(value: number, currency: Story['currency']) {
  return currency === 'cents' ? `${value} cents` : `$${value}`;
}

function finish(key: string, story: Story): Question {
  const { total, known, face, currency, unit } = story;
  const left = total - known;
  const count = left / face;
  const workedSteps = [
    ...story.knownSteps,
    { text: story.subtraction, equation: `${amount(total, currency)} − ${amount(known, currency)} = ${amount(left, currency)}` },
    { text: `Count groups of ${amount(face, currency)} in ${amount(left, currency)}.`, equation: `${left} ÷ ${face} = ${count}` },
  ];
  return {
    key, prompt: story.prompt, context: story.context, unit, answer: String(count),
    hint: story.hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    ...(story.picture ? { picture: story.picture } : {}),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['envelope', 'tin', 'shop', 'tray'] as const);

  if (form === 'envelope') {
    const fives = r.int(3, 5);
    const tens = r.int(2, 4);
    const known = 5 * fives + 10 * tens;
    const total = known + 2 * r.int(1, 10);
    return finish(key, {
      total, known, face: 2, currency: 'dollars', unit: 'notes',
      context: [`An envelope holds $${total}.`, `Inside are ${fives} $5 notes and ${tens} $10 notes. The rest of the money is in $2 notes.`],
      prompt: 'How many $2 notes are in the envelope?',
      hint: 'Find what the $5 notes and the $10 notes are worth together.',
      knownSteps: [
        { text: 'Find the value of the $5 notes.', equation: `${fives} × $5 = $${5 * fives}` },
        { text: 'Find the value of the $10 notes.', equation: `${tens} × $10 = $${10 * tens}` },
        { text: 'Add the two amounts.', equation: `$${5 * fives} + $${10 * tens} = $${known}` },
      ],
      subtraction: 'Find how much is in $2 notes.',
    });
  }

  if (form === 'tin') {
    const coinsOnly = r.chance(0.5);
    const currency = coinsOnly ? 'cents' : 'dollars';
    const knownFace = coinsOnly ? 10 : 1;
    const knownGroup = coinsOnly ? '10-cent coins' : '$1 coins';
    const face = coinsOnly ? 5 : r.pick([2, 5]);
    const missingGroup = coinsOnly ? '5-cent coins' : `$${face} notes`;
    const knownCount = r.int(3, 7);
    const known = knownCount * knownFace;
    const total = known + face * r.int(1, coinsOnly ? 6 : 10);
    return finish(key, {
      total, known, face, currency, unit: coinsOnly ? 'coins' : 'notes',
      context: [`A tin holds ${amount(total, currency)}.`, `It has ${knownCount} ${knownGroup}. The rest of the money is in ${missingGroup}.`],
      prompt: `How many ${missingGroup} are in the tin?`,
      hint: `Count the value of the ${knownGroup} first.`,
      knownSteps: [{ text: `Find the value of the ${knownGroup}.`, equation: `${knownCount} × ${amount(knownFace, currency)} = ${amount(known, currency)}` }],
      subtraction: `Find how much is in ${missingGroup}.`,
    });
  }

  if (form === 'shop') {
    const paid = r.pick([10, 50]);
    const face = paid === 10 ? 2 : r.pick([2, 5]);
    const noteCount = paid === 10 ? r.int(1, 4) : r.pick([2, 3, 4, 5, 7, 8, 9]);
    const price = paid - face * noteCount;
    return finish(key, {
      total: paid, known: price, face, currency: 'dollars', unit: 'notes',
      context: [`A kite costs $${price}.`, `Dev pays with one $${paid} note. All his change is in $${face} notes.`],
      prompt: `How many $${face} notes does Dev get back?`,
      hint: 'Work out the change before you count the notes.',
      knownSteps: [], subtraction: 'Take the price of the kite away from the amount Dev pays.',
    });
  }

  const shown = r.shuffle([5, 10, r.pick([5, 10, 20]), r.pick([5, 10, 20])]);
  const known = shown.reduce((sum, coin) => sum + coin, 0);
  const face = r.pick([5, 10]);
  const maxExtra = Math.min(10, Math.floor((100 - known) / face));
  const total = known + face * r.int(1, maxExtra);
  return finish(key, {
    total, known, face, currency: 'cents', unit: 'coins',
    context: ['Each label shows one coin on a tray.', `Lina wants ${total} cents on the tray.`],
    prompt: `How many more ${face}-cent coins must Lina add?`,
    picture: { type: 'pattern', items: shown.map(value => `${value}¢`) },
    hint: 'Count the money on the tray. How much more does Lina need?',
    knownSteps: [{ text: 'Add the values of the coins on the tray.', equation: `${shown.join(' + ')} = ${known} cents` }],
    subtraction: 'Find how much more money Lina needs.',
  });
}
