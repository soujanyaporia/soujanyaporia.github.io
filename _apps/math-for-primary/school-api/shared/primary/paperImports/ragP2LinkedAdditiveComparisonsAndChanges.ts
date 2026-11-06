import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-linked-number-clues',
  level: 2,
  title: 'Solve two number clues',
  objective: 'Use one clue to find a total or an earlier count, then use it to find the missing number.',
  skillIds: ['P2.S.AS.01'],
  canonicalPatternId: 'p2-linked-additive-comparisons-and-changes',
};

type Move = [text: string, op: '+' | '-', amount: number];
const apply = (a: number, op: Move[1], b: number) => op === '+' ? a + b : a - b;
const sign = (op: Move[1]) => op === '+' ? '+' : '−';

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = (hashString(String(seed)) % 3 + ((Math.trunc(index) % 3 + 3) % 3)) % 3;

  function build(clues: Pick<Question, 'prompt' | 'context' | 'display' | 'unit' | 'hint'>,
    start: number, [label1, op1, n1]: Move, [label2, op2, n2]: Move): Question {
    const middle = apply(start, op1, n1);
    const answer = apply(middle, op2, n2);
    const workedSteps = [
      { text: label1, equation: `${start} ${sign(op1)} ${n1} = ${middle}` },
      { text: label2, equation: `${middle} ${sign(op2)} ${n2} = ${answer}` },
    ];
    return {
      key, ...clues, answer: String(answer), workedSteps,
      explanation: workedSteps.map(s => `${s.text} ${s.equation}.`).join(' '),
      proof: { op: op2, a: { op: op1, a: start, b: n1 }, b: n2 },
    };
  }

  if (form === 0) {
    const base = 10 * r.int(12, 28), extra = r.int(16, 29), added = r.pick([30, 50, 60, 70]);
    return build({
      context: [`I add ${added} to the number on my card.`, `My answer is ${extra} more than ${base}.`],
      prompt: 'What number is on my card?',
      hint: 'Find the answer after adding. How can you work back to the card?',
    }, base, ['Find the answer after adding.', '+', extra],
    ['Take away what was added to find the number on the card.', '-', added]);
  }

  if (form === 1) {
    const left = r.int(11, 26), taken = r.int(10, 18), extra = r.int(4, 14);
    return build({
      context: [`At first, a tray had ${extra} more red buttons than blue buttons.`,
        `Mei took ${taken} blue buttons off the tray. This left ${left} blue buttons.`],
      prompt: 'How many red buttons were on the tray at first?', unit: 'buttons',
      hint: 'The colours are compared before Mei takes any buttons. How many blue buttons were there then?',
    }, left, ['Count the blue buttons that stayed and the ones Mei took.', '+', taken],
    ['Add the extra red buttons to the first blue count.', '+', extra]);
  }

  const base = 10 * r.int(52, 82), gap = r.int(23, 79), shown = 10 * r.int(12, 32);
  return build({
    context: [`The two numbers add up to ${gap} less than ${base}.`],
    display: `${shown} + □`, prompt: 'Which number belongs in the box?',
    hint: 'Find the total first. One of the two numbers is already shown.',
  }, base, ['Take the gap away from the larger number to find the total.', '-', gap],
  ['Take the number shown away from the total to find the missing part.', '-', shown]);
}
