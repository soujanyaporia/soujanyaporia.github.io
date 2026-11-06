import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch4EarlyPicture } from './batch4EarlyPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-read-or-draw-one-row',
  level: 2,
  title: 'Read or finish a picture graph',
  objective: 'Use the key to read one row or build its circles from a count, including a count found from the total.',
  skillIds: ['P2.S.GRAPH.01', 'P2.S.MD.01', 'P2.S.MD.02', 'P2.S.AS.01'],
  canonicalPatternId: 'read-or-draw-one-row',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.pick(['read', 'read', 'read', 'given', 'total'] as const);
  const scale = mode === 'read' ? r.pick([2, 4, 10]) : r.pick([2, 3, 5]);
  const names = r.shuffle(['Ayu', 'Isha', 'Jia', 'Ravi', 'Ben', 'Zara']).slice(0, 4);
  const target = r.int(0, names.length - 1);
  const name = names[target];
  const rows = names.map((label, i) => ({
    label,
    wholeSymbols: i === target ? r.int(2, 7) : r.int(1, 5),
    halfSymbol: mode === 'read' && r.chance(i === target ? 0.75 : 0.25),
  }));
  const full: Batch4EarlyPicture = {
    type: 'batch4-early', layout: 'pictograph', heading: 'Beans planted by four children', scale, rows,
  };
  const row = rows[target];
  const wholeValue = row.wholeSymbols * scale;
  const steps: NonNullable<Question['workedSteps']> = [];
  const context = ['The picture graph shows how many beans each child planted.'];

  if (mode === 'read') {
    const amount = wholeValue + (row.halfSymbol ? scale / 2 : 0);
    steps.push(
      { text: `Count the whole circles beside ${name}.`, equation: `${row.wholeSymbols} whole circles` },
      { text: `Each whole circle stands for ${scale} beans.`, equation: `${row.wholeSymbols} × ${scale} = ${wholeValue}` },
    );
    if (row.halfSymbol) {
      steps.push(
        { text: 'Find how many beans the half circle stands for.', equation: `${scale} ÷ 2 = ${scale / 2}` },
        { text: 'Add those beans to the beans shown by the whole circles.', equation: `${wholeValue} + ${scale / 2} = ${amount}` },
      );
    }
    return {
      key, prompt: `How many beans did ${name} plant?`, context, picture: full,
      answer: String(amount), unit: 'beans',
      hint: 'Count the circles in the named row and use the key. A half circle stands for half as many beans.',
      workedSteps: steps, explanation: `The whole circles show ${wholeValue} beans.${row.halfSymbol ? ` The half circle adds ${scale / 2} more.` : ''} ${name} planted ${amount} beans.`,
    };
  }

  const picture: Batch4EarlyPicture = {
    ...full, rows: rows.map((item, i) => i === target ? { ...item, wholeSymbols: 0 } : item),
  };
  let prompt: string;
  let hint: string;
  const marks = 'O'.repeat(row.wholeSymbols);
  let answer = marks;
  if (mode === 'total') {
    const counts = picture.rows.filter(item => item.wholeSymbols > 0).map(item => item.wholeSymbols);
    const circles = counts.reduce((sum, value) => sum + value, 0);
    const subtotal = circles * scale;
    const total = subtotal + wholeValue;
    context.push(`The four children planted ${total} beans altogether.`);
    prompt = `How many beans did ${name} plant? Then make the missing row for ${name}.`;
    context.push('In the answer box, type the number of beans, one space, then the row. Use one letter O per circle and keep the Os together.');
    hint = 'Use the key to count the beans in the three finished rows. Take those beans away from the total, then use the key again.';
    answer = `${wholeValue} ${marks}`;
    steps.push(
      { text: 'Count the circles in the three finished rows.', equation: `${counts.join(' + ')} = ${circles}` },
      { text: 'Use the key to find the number of beans in those rows.', equation: `${circles} × ${scale} = ${subtotal}` },
      { text: `Find the beans planted by ${name}.`, equation: `${total} − ${subtotal} = ${wholeValue}` },
    );
  } else {
    context.push(`${name} planted ${wholeValue} beans.`);
    prompt = `Make the missing row for ${name} in the answer box. Type one letter O per circle and keep the Os together.`;
    hint = 'Each circle shows one group of beans. How many such groups make the given number of beans?';
  }
  steps.push(
    { text: `Find how many circles belong beside ${name}.`, equation: `${wholeValue} ÷ ${scale} = ${row.wholeSymbols}` },
    { text: `Put ${row.wholeSymbols} circles in the row and check their value.`, equation: `${row.wholeSymbols} × ${scale} = ${wholeValue}`, picture: full },
  );
  return {
    key, prompt, context, picture, answer, hint, workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
