import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-adjust-total-before-division',
  level: 2,
  title: 'Share two amounts equally',
  objective: 'Add two amounts, then share their total equally.',
  skillIds: ['P2.S.AS.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-adjust-total-before-division',
} as const;

/** Create a whole-object sharing story with two visible amounts and an exact share. */
export function makeRagQuestion(seed: number, index = 0): Question {
  // Keep every choice deterministic while changing amounts across seeds and indices.
  const key = Math.abs(Math.trunc(seed * 31 + index * 17));
  const divisors = [2, 3, 4, 5, 10];
  const recipients = divisors[key % divisors.length];
  const perRecipient = 4 + ((key * 7) % 9);
  const total = recipients * perRecipient;
  const first = 1 + ((key * 11) % (total - 1));
  const second = total - first;

  return {
    key: `p2-adjust-total-before-division:${seed}:${index}`,
    prompt: `Mina has ${first} red beads and ${second} blue beads. She shares all the beads equally among ${recipients} children. How many beads does each child get?`,
    answer: String(perRecipient),
    unit: 'beads',
    hint: 'First find how many beads there are altogether. Then divide equally among the children.',
    explanation: `Add the two amounts to find the total. Then share the total equally among the children.`,
    workedSteps: [
      { text: 'Find the total number of beads.', equation: `${first} + ${second} = ${total}` },
      { text: 'Share the beads equally among the children.', equation: `${total} ÷ ${recipients} = ${perRecipient}` },
    ],
  };
}
