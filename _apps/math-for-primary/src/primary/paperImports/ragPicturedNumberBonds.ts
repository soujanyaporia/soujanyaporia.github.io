import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-pictured-number-bonds',
  level: 1 as const,
  title: 'Find both parts of a number bond',
  objective: 'Count two pictured groups or choose two numbers that make a given whole.',
  skillIds: ['P1.S.WN.01', 'P1.S.AS.03'],
  canonicalPatternId: 'p1-pictured-number-bonds',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  if ((hashString(String(seed)) + index) % 2 === 0) {
    const whole = rng.pick([5, 6, 8, 9, 10]);
    const traySizes = [1, 2, 3, 4, 5, 6].filter(size => {
      const other = whole - size;
      return other >= 1 && other <= 6 && other !== size;
    });
    const a = rng.pick(traySizes);
    const b = whole - a;
    const check = `${a} + ${b} = ${whole}`;
    return {
      key,
      prompt: 'Count the pencils in each tray. Fill in both parts of the number bond.',
      picture: {
        type: 'paper',
        layout: 'cards',
        heading: `Whole: ${whole} pencils`,
        cards: [
          { label: 'Tray A', value: 'Pencils', icon: 'pencil', count: a },
          { label: 'Tray B', value: 'Pencils', icon: 'pencil', count: b },
        ],
      },
      structuredResponse: { kind: 'number-pair', firstLabel: 'Tray A', secondLabel: 'Tray B' },
      answer: JSON.stringify([String(a), String(b)]),
      hint: 'Count each pencil in tray A once. Start again at one for tray B.',
      workedSteps: [
        { text: `Count tray A. Its part is ${a}.` },
        { text: `Count tray B. Its part is ${b}.` },
        { text: 'Add the two parts to check the whole.', equation: check },
      ],
      explanation: `Tray A has ${a} and tray B has ${b}. Together they hold ${whole} pencils.`,
    };
  }

  const whole = 10;
  const first = rng.pick([1, 2, 4]);
  const partner = whole - first;
  // Take at most one distractor from each other bond. A single 5 cannot pair with itself.
  const otherBonds = rng.shuffle([1, 2, 3, 4].filter(n => n !== first));
  const distractors = otherBonds.slice(0, 2).map(n => rng.pick([n, whole - n]));
  const options = rng.shuffle([first, partner, 5, ...distractors]).map(String);
  const check = `${first} + ${partner} = ${whole}`;
  return {
    key,
    prompt: `Which two numbers add up to ${whole}? Pick both.`,
    structuredResponse: { kind: 'named-pair', options },
    answer: JSON.stringify([String(first), String(partner)]),
    hint: `Try one number. How many more would make ${whole}? Look for that number too.`,
    workedSteps: [
      { text: `Try ${first}. Find how many more it needs.`, equation: `${whole} − ${first} = ${partner}` },
      { text: `Find ${partner} in the list and check the pair.`, equation: check },
    ],
    explanation: `${first} needs ${partner} more to reach ${whole}. Pick ${first} and ${partner}.`,
  };
}
