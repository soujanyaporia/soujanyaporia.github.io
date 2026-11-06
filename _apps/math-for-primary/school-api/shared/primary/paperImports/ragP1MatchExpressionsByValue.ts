import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1s-rag-match-expressions-by-value',
  level: 1,
  title: 'Find the matching cards',
  objective: 'Compare the values on number cards to find matches or the one that differs.',
  skillIds: ['P1.S.AS.07', 'P1.S.MD.01'],
  canonicalPatternId: 'select-equal-sums-differences-and-small-group-totals',
};

type Card = { label: string; value: number; working: string };
type Steps = NonNullable<Question['workedSteps']>;
type Sign = '+' | '−';
const targets = [6, 7, 9, 10, 12, 13, 15];

function calculation(a: number, sign: Sign, b: number): Card {
  const label = `${a} ${sign} ${b}`;
  const value = sign === '+' ? a + b : a - b;
  return { label, value, working: `${label} = ${value}` };
}

// Build facts with positive operands and no number above 20. Exclusions
// keep two cards distinct even when their results are the same.
function fact(r: Rng, value: number, sign: Sign, excluded: string[] = []): Card {
  const pool: Card[] = [];
  const limit = sign === '+' ? value - 1 : 20 - value;
  for (let b = 1; b <= limit; b++) {
    const card = calculation(sign === '+' ? value - b : value + b, sign, b);
    if (!excluded.includes(card.label)) pool.push(card);
  }
  return r.pick(pool);
}

function groupCards(r: Rng, target: number): Card[] {
  const pool: Card[] = [];
  for (let groups = 2; groups <= 6; groups++) {
    for (let size = 2; size <= 10; size++) {
      const value = groups * size;
      if (value > 40 || Math.abs(value - target) > 6) continue;
      pool.push({ label: `${groups} groups of ${size}`, value,
        working: `${Array(groups).fill(size).join(' + ')} = ${value}` });
    }
  }
  return [...r.shuffle(pool.filter(c => c.value === target)).slice(0, 2),
    ...r.shuffle(pool.filter(c => c.value !== target)).slice(0, 2)];
}

function solution(steps: Steps) {
  return { workedSteps: steps, explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ') };
}

function pairRows(r: Rng, key: string): Question {
  const left = r.shuffle(targets).slice(0, 3).map(n => fact(r, n, '−'));
  const right = r.shuffle(left.map(c => fact(r, c.value, '−', [c.label])));
  const numbers = left.map(c => String(1 + right.findIndex(other => other.value === c.value)));
  const steps = left.map((c, i) => {
    const other = right[Number(numbers[i]) - 1];
    return { text: `For ${c.label}, use card ${numbers[i]}. Both give ${c.value}.`,
      equation: `${c.working}; ${other.working}` };
  });
  return { key, prompt: 'Match each subtraction below to a numbered card with the same answer. Write its card number in the box. Use each card once.',
    context: right.map((c, i) => `Card ${i + 1}: ${c.label}`),
    structuredResponse: { kind: 'number-fields', fields: left.map(c => ({ label: c.label })) },
    answer: JSON.stringify(numbers), hint: 'Work out the numbered cards first. Then look for the same number as each subtraction.',
    ...solution(steps) };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = (((hashString(`match:${seed}`) % 6 + index % 6) % 6) + 6) % 6;
  if (form === 5) return pairRows(r, key);

  const target = form === 2 ? r.pick([12, 18, 20, 24, 30, 36]) : r.pick(targets);
  const two = form === 1 || form === 2;
  const odd = form === 3;
  let cards: Card[];
  let given: Card | undefined;
  if (form === 0) {
    // Holding the amount taken away fixed makes the neighbouring answers useful distractors.
    const take = r.int(2, 19 - target);
    cards = [-1, 0, 1].map(d => calculation(target + take + d, '−', take));
  } else if (form === 1) {
    cards = [fact(r, target, '+'), fact(r, target, '−'), fact(r, target - 1, '+'), fact(r, target + 1, '−')];
  } else if (form === 2) {
    cards = groupCards(r, target);
  } else if (odd) {
    const first = fact(r, target, '+');
    cards = [first, fact(r, target, '−'), fact(r, target, '+', [first.label]), fact(r, target + r.pick([-1, 1]), '−')];
  } else {
    given = fact(r, target, '−');
    const sign: Sign = r.pick(['+', '−'] as Sign[]);
    cards = [fact(r, target, sign, [given.label]), fact(r, target - 1, '+'), fact(r, target + 1, '−')];
  }
  cards = r.shuffle(cards);
  const options = cards.map(c => c.label);
  const selected = cards.filter(c => odd ? c.value !== target : c.value === target).map(c => c.label);
  const steps: Steps = [];
  if (given) steps.push({ text: 'First find the number to match.', equation: given.working });
  for (const c of cards) steps.push({ text: form === 2 ? `Count ${c.label}.` : `Work out ${c.label}.`, equation: c.working });
  steps.push({ text: odd ? `Only ${selected[0]} gives a number other than ${target}.` : `${selected.join(' and ')} ${two ? 'both make' : 'makes'} ${target}.` });
  return { key,
    prompt: given ? 'Which card has the same answer as this subtraction?' : odd ? `Which card does not make ${target}?` : two ? `Which two cards each make ${target}?` : `Which card makes ${target}?`,
    ...(given ? { display: given.label } : {}),
    ...(two ? { structuredResponse: { kind: 'named-pair' as const, options }, answer: JSON.stringify(selected) } : { choices: options, answer: selected[0] }),
    hint: form === 2 ? 'Count by the number in each group. Check every card.' : given ? 'Work out the subtraction first. Look for that answer on the cards.' : odd ? 'Work out each card. Look for the one with a different answer.' : 'Work out each card and compare its answer with the number in the question.',
    ...solution(steps) };
}
