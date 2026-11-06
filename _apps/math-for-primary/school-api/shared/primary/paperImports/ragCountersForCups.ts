import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-counters-for-cups',
  level: 1,
  title: 'Counters for cups',
  objective: 'Count a collection and find how many counters are left after filling a given number of equal groups.',
  skillIds: ['P1.S.WN.01', 'P1.S.MD.01', 'P1.S.AS.02'],
  canonicalPatternId: 'p1-adjust-supply-to-required-grouping',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const askToPutAway = (seed + index) % 2 === 0;
  const cups = rng.int(3, 5);
  const perCup = rng.int(2, Math.min(5, Math.floor(16 / cups)));
  const needed = cups * perCup;
  const maxExtra = Math.min(20 - needed, askToPutAway ? perCup + 2 : perCup - 1);
  const supply = rng.int(needed + 1, needed + maxExtra);
  const extra = supply - needed;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: `Count each counter on the mat once. There are ${supply} counters.` },
    {
      text: `Each of the ${cups} cups needs ${perCup} counters.`,
      equation: `${cups} × ${perCup} = ${needed}`,
      picture: { type: 'counters', count: needed, group: perCup },
    },
    {
      text: askToPutAway
        ? `Keep ${needed} counters for the cups. Put the rest away.`
        : `Take the ${needed} counters for the cups from the mat.`,
      equation: `${supply} − ${needed} = ${extra}`,
    },
  ];

  const question: Question = {
    key,
    context: [
      'All the counters start on the mat.',
      `There are ${cups} cups to fill. Each cup needs ${perCup} counters.`,
    ],
    picture: { type: 'counters', count: supply },
    prompt: askToPutAway
      ? 'How many counters should you put away to leave just enough for the cups?'
      : 'Fill the cups. How many counters are still on the mat?',
    unit: 'counters',
    answer: String(extra),
    hint: 'Count the counters on the mat. Then count how many you need for all the cups.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    proof: { op: '-', a: supply, b: { op: '*', a: cups, b: perCup } },
  };

  if (!askToPutAway) {
    const plausibleCounts = [extra - 1, extra + 1, cups, perCup, needed];
    const distractors = [...new Set(plausibleCounts.filter(count => count !== extra))];
    const options = [extra, ...rng.shuffle(distractors).slice(0, 3)];
    question.choices = rng.shuffle(options).map(String);
  }
  return question;
}
