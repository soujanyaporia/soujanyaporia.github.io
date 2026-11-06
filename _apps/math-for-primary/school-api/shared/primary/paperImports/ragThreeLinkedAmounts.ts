import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-three-linked-amounts',
  level: 3,
  title: 'Follow three money clues',
  objective: 'Use a price difference and a multiple to find three amounts, compare them and find their total.',
  skillIds: ['P3.S.MONEY.01', 'P3.S.AS.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-three-amounts-linked-by-gaps-and-multiples',
};

const cash = (n: number) => `$${n.toFixed(2)}`;
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.int(0, 2);
  const finish = (context: string[], prompt: string, hint: string, steps: Steps,
    response: Pick<Question, 'answer' | 'unit' | 'structuredResponse'>): Question => ({
    key, context, prompt, hint, workedSteps: steps, ...response,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join('\n'),
  });

  if (form === 0) {
    const puzzle = r.int(12, 21), factor = r.int(2, 3);
    const kit = factor * puzzle;
    // Choose a gap on either side of the tie, so either related item can win.
    const gap = kit - puzzle + r.pick([-1, 1]) * r.int(1, 3);
    const game = puzzle + gap, total = puzzle + game + kit;
    const labels = r.shuffle(['puzzle', 'board game', 'model kit']);
    const winner = game > kit ? 'board game' : 'model kit';
    const high = Math.max(game, kit), other = Math.min(game, kit);
    return finish([
      `Item labels: ${labels.map((item, i) => `${i + 1} = ${item}`).join('; ')}.`,
      `The puzzle costs ${cash(puzzle)}.`,
      `The board game costs ${cash(gap)} more than the puzzle.`,
      `The model kit costs ${factor} times as much as the puzzle.`,
    ], '(a) Which item costs the most? Write its label number and its price.\n(b) How much would one of each item cost altogether?',
    'Work out both missing prices. Compare the three prices before adding them.', [
      { text: 'Add the extra cost to find the price of the board game.', equation: `${cash(puzzle)} + ${cash(gap)} = ${cash(game)}` },
      { text: 'Use the puzzle price again to find the price of the model kit.', equation: `${cash(puzzle)} × ${factor} = ${cash(kit)}` },
      { text: `The ${winner}, label ${labels.indexOf(winner) + 1}, costs the most.`, equation: `${cash(puzzle)} < ${cash(other)} < ${cash(high)}` },
      { text: 'Count the price of each item once.', equation: `${cash(puzzle)} + ${cash(game)} + ${cash(kit)} = ${cash(total)}` },
    ], {
      structuredResponse: { kind: 'number-fields', fields: [
        { label: '(a) Item label number' }, { label: '(a) Price of that item ($)', decimal: true },
        { label: '(b) Total price ($)', decimal: true },
      ] },
      answer: JSON.stringify([String(labels.indexOf(winner) + 1), String(high), String(total)]),
    });
  }

  if (form === 1) {
    const noor = r.int(61, 84), factor = r.int(2, 4), gap = r.int(11, 38);
    const mei = noor * factor, ravi = noor + gap, total = mei + noor + ravi;
    return finish([
      `Mei saved ${cash(mei)}.`,
      `Mei saved ${factor} times as much as Noor.`,
      `Ravi saved ${cash(gap)} more than Noor.`,
    ], 'How much did Mei, Noor and Ravi save in all?',
    'Mei’s savings are made up of equal parts. One part is Noor’s savings.', [
      { text: 'Divide Mei’s savings to find Noor’s savings.', equation: `${cash(mei)} ÷ ${factor} = ${cash(noor)}` },
      { text: 'Ravi saved more than Noor, so add the extra money.', equation: `${cash(noor)} + ${cash(gap)} = ${cash(ravi)}` },
      { text: 'Put all three savings together.', equation: `${cash(mei)} + ${cash(noor)} + ${cash(ravi)} = ${cash(total)}` },
    ], { answer: String(total), unit: 'dollars' });
  }

  const bench = r.int(95, 260), gap = r.int(21, 69), factor = r.int(2, 4);
  const table = bench + gap, cabinet = table * factor, total = bench + table + cabinet;
  return finish([
    `The bench costs ${cash(bench)}.`,
    `The bench costs ${cash(gap)} less than the table.`,
    `The cabinet costs ${factor} times as much as the table.`,
  ], 'What would it cost to buy one bench, one table and one cabinet?',
  'The table costs more than the bench. Find its price before working out the cabinet price.', [
    { text: 'Add the difference because the table is dearer than the bench.', equation: `${cash(bench)} + ${cash(gap)} = ${cash(table)}` },
    { text: 'Use the table price to find the cabinet price.', equation: `${cash(table)} × ${factor} = ${cash(cabinet)}` },
    { text: 'Add the prices of the three pieces of furniture.', equation: `${cash(bench)} + ${cash(table)} + ${cash(cabinet)} = ${cash(total)}` },
  ], { answer: String(total), unit: 'dollars' });
}
