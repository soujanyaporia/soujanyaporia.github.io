import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-greatest-and-smallest-values', level: 1,
  title: 'Find the greatest or smallest number',
  objective: 'Read four values and identify the one that is greatest or smallest.',
  skillIds: ['P1.S.WN.04', 'P1.S.WN.02', 'P1.S.WN.03'],
  canonicalPatternId: 'greatest-and-smallest-values',
};

type Card = { value: number; label: string };
const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const names = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const count = (n: number, place: 'ten' | 'one') => `${n} ${place}${n === 1 ? '' : 's'}`;
const tens = (n: number) => Math.floor(n / 10);
const parts = (t: number, u: number) => `${count(t, 'ten')} and ${count(u, 'one')}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = ((seed + index) >>> 0) % 4;
  const smallest = mode === 0 || mode === 3;
  const direction = smallest ? 'smallest' : 'greatest';
  const steps: NonNullable<Question['workedSteps']> = [];
  let cards: Card[];
  let hint: string;

  if (mode === 3) {
    const anchor = r.pick([1, 2, 4, 7, 9]);
    const values = r.shuffle([anchor, ...r.shuffle(digits.filter(d => d !== anchor)).slice(0, 3)]);
    cards = values.map(value => ({ value, label: names[value] }));
    hint = 'Say the numbers as you count up from one. Which choice do you say first?';
  } else {
    const ones = r.shuffle([0, ...r.shuffle([...digits]).slice(0, 3)]);
    if (mode === 2) {
      const t = r.int(2, 9);
      const values = ones.map(u => 10 * t + u);
      const loose = 10 + ones[3];
      const labels = [String(values[0]), count(values[1], 'one'), parts(t, ones[2]), parts(t - 1, loose)];
      cards = r.shuffle(values.map((value, i) => ({ value, label: labels[i] })));
      hint = 'Make a ten from each group of ten ones. Then compare the numbers.';
      steps.push({ text: `Take 10 of the ${loose} ones to make one more ten.`, equation: `${labels[3]} = ${parts(t, ones[3])} = ${values[3]}` });
      steps.push({ text: 'Read the four choices as numbers, in the order shown.', equation: cards.map(c => String(c.value)).join(', ') });
    } else {
      const places = r.shuffle([...digits]).slice(0, 4).sort((a, b) => a - b);
      if (r.chance(0.5)) {
        if (smallest) places[1] = places[0];
        else places[2] = places[3];
      }
      cards = r.shuffle(places.map((t, i) => {
        const value = 10 * t + ones[i];
        return { value, label: String(value) };
      }));
      hint = `Look for the ${direction} tens digit first. If two numbers have the same tens digit, look at their ones.`;
    }
  }

  const winner = cards.reduce((a, b) => (smallest ? b.value < a.value : b.value > a.value) ? b : a);
  if (mode === 3) {
    steps.push({ text: 'Match each word to its number.', equation: cards.map(c => `${c.label} = ${c.value}`).join('; ') });
    steps.push({ text: `When you count up, you reach ${winner.label} before the other three numbers.`, equation: cards.map(c => c.value).sort((a, b) => a - b).join(' < ') });
  } else {
    const t = tens(winner.value);
    const peers = cards.filter(c => tens(c.value) === t);
    steps.push({ text: peers.length === 4 ? `All four numbers have ${count(t, 'ten')}.` : `Compare the tens digits. The ${direction} tens digit is ${t}.`, equation: peers.map(c => String(c.value)).join(', ') });
    steps.push({ text: peers.length === 1 ? `Only ${winner.value} has ${count(t, 'ten')}, so it is the ${direction}.` : `Among the numbers with ${count(t, 'ten')}, ${winner.value} has the ${direction} ones digit: ${winner.value % 10}.` });
    if (mode === 2) steps.push({ text: `Choose ${winner.label}. Its value is ${winner.value}.` });
  }

  const choice = mode >= 2;
  return {
    key, prompt: choice ? `Choose the ${direction} of these four numbers.` : `Write the ${direction} number in this list.`,
    ...(choice ? { choices: cards.map(c => c.label) } : { display: cards.map(c => c.label).join(', ') }),
    answer: winner.label, hint, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}
