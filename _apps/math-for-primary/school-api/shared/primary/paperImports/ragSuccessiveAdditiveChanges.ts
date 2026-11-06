import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-follow-successive-additive-changes',
  level: 1,
  title: 'Follow two counting clues',
  objective: 'Use one comparison to find a count, then use that count in the next comparison. Add the three counts only when asked for their total.',
  skillIds: ['P1.S.AS.05', 'P1.S.AS.04', 'P1.S.AS.06'],
  canonicalPatternId: 'p1-follow-successive-additive-changes',
};

const forms = ['rise', 'turn', 'fall', 'total'] as const;
const activities = [
  ['found', 'find', 'shells'],
  ['made', 'make', 'paper stars'],
  ['packed', 'pack', 'crayons'],
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  // A five-item round includes two consecutive equation entries for the turn.
  const order = new Rng(hashString(`clue-order:${seed}`)).shuffle(forms);
  const slots = order.flatMap(form => Array.from({ length: form === 'turn' ? 2 : 1 },
    (_, i) => ({ form, secondPart: i === 1 })));
  const { form, secondPart } = slots[((index % 5) + 5) % 5];
  const r = new Rng(hashString(`clue-story:${seed}:${Math.floor(index / 5)}:${form}`));
  const [a, b, c] = r.shuffle(['Nora', 'Ravi', 'Jia', 'Zara', 'Ben', 'Siti']);
  const [past, verb, unit] = r.pick(activities);
  let first: number, middle: number, last: number;
  if (form === 'total') {
    first = r.int(2, 4);
    middle = r.int(first + 3, 9);
    const cap = Math.min(middle - 2, 20 - first - middle);
    last = r.pick([2, 3, 4, 5, 6, 7].filter(n => n <= cap && n !== first));
  } else {
    first = form === 'fall' ? r.int(61, 96) : r.int(21, 36);
    middle = first + (form === 'fall' ? -1 : 1) * r.int(13, 23);
    last = middle + (form === 'rise' ? r.int(5, 17) : -r.int(3, 11));
  }

  function comparison(who: string, ref: string, from: number, to: number) {
    const gap = Math.abs(to - from);
    const word = to > from ? 'more' : 'fewer';
    const sign = to > from ? '+' : '-';
    return {
      clue: `${who} ${past} ${gap} ${word} ${unit} than ${ref}.`,
      step: {
        text: `Start with ${ref}’s count. ${to > from ? 'Add' : 'Subtract'} ${gap} to find how many ${unit} ${who} ${past}.`,
        equation: `${from} ${sign === '-' ? '−' : '+'} ${gap} = ${to}`,
      },
    };
  }
  const left = comparison(b, a, first, middle);
  const right = comparison(c, b, middle, last);
  const start = `${a} ${past} ${first} ${unit}.`;
  const context = form === 'total' ? [start, left.clue, right.clue] : [right.clue, left.clue, start];
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const workedSteps = [left.step, right.step];
  const explain = (steps: typeof workedSteps) => steps.map(s => `${s.text} ${s.equation}.`).join(' ');
  const hint = `Start with the number for ${a}. Which clue compares ${b} with ${a}?`;

  if (form === 'turn') {
    const target = secondPart ? c : b;
    const from = secondPart ? middle : first;
    const to = secondPart ? last : middle;
    const gap = Math.abs(to - from);
    const operation = secondPart ? '-' : '+';
    const steps = secondPart ? workedSteps : [left.step];
    return {
      key, context, hint, workedSteps: steps, explanation: explain(steps),
      prompt: `Part (${secondPart ? 'b' : 'a'}): How many ${unit} did ${target} ${verb}? Build a number sentence to show your answer.`,
      numberSentence: { numbers: [from, gap], operation, missingResult: true, chooseOperation: true, freeEntry: true },
      answer: `${from} ${operation} ${gap} = ${to}`,
    };
  }

  const total = form === 'total';
  const labels = total ? [a, b, c, 'All three together'] : [b, c];
  const values = total ? [first, middle, last, first + middle + last] : [middle, last];
  if (total) workedSteps.push({
    text: `Count each child’s ${unit} once.`,
    equation: `${first} + ${middle} + ${last} = ${first + middle + last}`,
  });
  return {
    key, context, hint, workedSteps, explanation: explain(workedSteps),
    prompt: total
      ? `How many ${unit} did the three children ${verb} altogether? Fill in each child’s count and the total.`
      : `How many ${unit} did ${b} ${verb}? How many did ${c} ${verb}? Write a number sentence for each child, then fill in both counts.`,
    structuredResponse: { kind: 'number-fields', fields: labels.map(label => ({ label: `${label} (${unit})` })) },
    answer: JSON.stringify(values.map(String)),
  };
}
