import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-part-to-whole-counts',
  level: 3 as const,
  title: 'Which count makes the whole?',
  objective: 'Use counts to write a fraction for the requested part of a whole or collection, and simplify it when asked.',
  skillIds: ['P3.S.FRAC.02', 'P2.S.FRAC.01', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-part-to-whole-fractions-from-quantities',
};

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function list(items: string[]): string {
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['one colour', 'two colours', 'given away', 'kept']);
  const buttons = form === 'one colour' || form === 'two colours';
  const total = r.pick(buttons ? [12, 15, 16, 18, 20] : form === 'kept' ? [6, 9, 10, 12] : [6, 9, 12]);
  const possible = Array.from({ length: total - 3 }, (_, i) => i + 2).filter(n =>
    gcd(n, total) > 1 && 2 * n !== total && (form !== 'two colours' || n >= 4) && (form !== 'kept' || 2 * n < total));
  const part = r.pick(possible);
  const other = total - part;
  const raw = `${part}/${total}`;
  const divisor = gcd(part, total);
  const reduced = `${part / divisor}/${total / divisor}`;
  const steps: NonNullable<Question['workedSteps']> = [];
  let context: string[], prompt: string, hint: string;
  let choices: string[] | undefined;

  if (buttons) {
    const colours = r.shuffle(['blue', 'pink', 'green', 'yellow']);
    const first = form === 'two colours' ? r.int(2, part - 2) : part;
    const selected = form === 'two colours' ? [first, part - first] : [first];
    const groups = r.shuffle([...selected, other].map((count, i) => ({ count, colour: colours[i] })));
    context = [`These are all the buttons in a tin: ${list(groups.map(g => `${g.count} ${g.colour} buttons`))}. Each button has just one colour.`];
    const target = selected.length === 1 ? colours[0] : `either ${colours[0]} or ${colours[1]}`;
    prompt = `What fraction of the buttons are ${target}? Write the fraction in simplest form.`;
    hint = 'Count all the buttons for the bottom number. For the top number, count only the colours in the question.';
    steps.push({ text: 'Count every colour to find the whole collection.', equation: `${groups.map(g => g.count).join(' + ')} = ${total}` });
    if (selected.length === 2) steps.push({ text: `Count the ${colours[0]} and ${colours[1]} buttons together.`, equation: `${selected.join(' + ')} = ${part}` });
    steps.push({ text: `${part} of the ${total} buttons match the question.`, equation: raw });
  } else if (form === 'given away') {
    context = [`Amir cuts a melon into ${total} equal slices. He gives ${part} slices to his neighbours.`];
    prompt = 'What fraction of the melon does Amir give his neighbours? Write the fraction in simplest form.';
    hint = 'Use the number of slices he gives away and the number in the whole melon.';
    steps.push({ text: `The whole melon has ${total} equal slices. Amir gives away ${part} of them.`, equation: `Fraction given away = ${raw}` });
  } else {
    context = [`Jia cuts a flatbread into equal pieces. She packs ${other} pieces for lunch and saves the last ${part} pieces for dinner.`];
    prompt = 'Which fraction of the whole flatbread does Jia save for dinner?';
    hint = 'Count the lunch pieces and the dinner pieces together to find how many pieces made the whole flatbread.';
    steps.push({ text: 'Both meals came from the same flatbread.', equation: `${other} + ${part} = ${total}` },
      { text: `The ${part} dinner pieces are out of all ${total} pieces, not just the lunch pieces.`, equation: `Fraction saved = ${raw}` });
    choices = r.shuffle([raw, `${other}/${total}`, `${part}/${other}`, `${part - 1}/${total}`]);
  }

  if (!choices) steps.push({ text: `Divide the top and bottom by ${divisor}.`, equation: `${part} ÷ ${divisor} = ${part / divisor}; ${total} ÷ ${divisor} = ${total / divisor}. So ${raw} = ${reduced}.` });
  return {
    key, prompt, context, hint, answer: choices ? raw : reduced,
    ...(choices ? { choices } : { requireSimplified: true }),
    proof: { op: '/', a: part, b: total }, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
