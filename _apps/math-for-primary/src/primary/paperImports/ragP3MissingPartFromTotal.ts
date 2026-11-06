import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-chart-missing-part',
  level: 3 as const,
  title: 'Find the part missing from a chart',
  objective: 'Read the known groups, use the graph key when needed, and subtract their sum from the whole.',
  skillIds: ['P3.S.GRAPH.01', 'P2.S.GRAPH.01', 'P3.S.AS.01', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-find-a-missing-part-from-the-total',
};

type Item = Required<Pick<Question, 'prompt' | 'context' | 'unit' | 'hint' | 'picture' | 'workedSteps'>> & Pick<Question, 'choices'>;

const sum = (counts: number[]) => counts.reduce((total, count) => total + count, 0);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['bars', 'bars', 'table', 'dots'] as const);

  function finish(total: number, known: number, item: Item): Question {
    const missing = total - known;
    const workedSteps = [
      ...item.workedSteps,
      { text: 'Subtract the part you have counted from the whole.', equation: `${total} − ${known} = ${missing} ${item.unit}` },
    ];
    return {
      ...item, key, workedSteps, answer: String(missing),
      explanation: workedSteps.map(step => step.equation ? `${step.text} ${step.equation}.` : step.text).join(' '),
    };
  }

  if (form === 'dots') {
    const labels = ['Hoops', 'Skittles', 'Ring toss', 'Darts'];
    const scale = r.pick([2, 4, 5]);
    const dots = r.shuffle([1, 2, 3, 4, 5, 6]).slice(0, labels.length);
    const dotCount = sum(dots);
    const players = dotCount * scale;
    const total = players + r.int(6, 23);
    return finish(total, players, {
      context: [
        `${total} children visited the games tent. Each child could play one game or watch without playing.`,
        'The picture graph shows everyone who played, grouped by the game they chose.',
      ],
      picture: { type: 'bars', pictures: true, labels, scale, values: dots.map(n => n * scale) },
      prompt: 'How many children watched without playing?',
      unit: 'children',
      hint: 'Count the dots in all four rows. Use the key to find how many children played.',
      workedSteps: [
        { text: 'Count the dots for the four games.', equation: `${dots.join(' + ')} = ${dotCount} dots` },
        { text: `Each dot stands for ${scale} children. Find how many children played.`, equation: `${dotCount} × ${scale} = ${players} children` },
      ],
    });
  }

  if (form === 'table') {
    const sales = Array.from({ length: 3 }, () => r.int(210, 315));
    const known = sum(sales);
    const lastDay = r.int(370, 410);
    const total = known + lastDay;
    return finish(total, known, {
      context: [`A garden shop sold ${total} seed packets over four days.`],
      picture: {
        type: 'nanyang-p4', layout: 'table', caption: 'Seed packets sold', rowHeader: 'Day', columns: ['Packets sold'],
        rows: [...sales, null].map((n, i) => ({ label: `Day ${i + 1}`, values: [n] })),
      },
      prompt: 'How many seed packets did the shop sell on Day 4?',
      unit: 'seed packets',
      choices: r.shuffle([lastDay, known, lastDay + sales[0], total - sales[2]].map(String)),
      hint: 'Add the sales for the first three days. How many more packets would make the four-day total?',
      workedSteps: [
        { text: 'Add the sales for Days 1, 2 and 3.', equation: `${sales.join(' + ')} = ${known} seed packets` },
      ],
    });
  }

  const labels = ['Jun', 'Jul', 'Aug', 'Sep'];
  const scale = r.pick([2, 4, 5]);
  const intervals = r.shuffle([r.pick([3, 5, 7]), r.pick([8, 10, 12]), r.pick([2, 4, 6]), r.pick([9, 11])]);
  const savings = intervals.map(count => count * scale);
  const known = sum(savings);
  const total = known + r.int(3, 9) * scale;
  return finish(total, known, {
    context: [
      `From June to October, Isha saved $${total} altogether.`,
      'The bar graph shows the dollars she saved each month from June to September. October is missing.',
    ],
    picture: { type: 'bars', labels, values: savings, scale },
    prompt: 'How many dollars did Isha save in October?',
    unit: 'dollars',
    hint: 'Read the scale and add the amounts for the four months shown. Use the five-month total to find October’s savings.',
    workedSteps: [
      { text: `Each grid interval is $${scale}. Read the four bars from left to right.`, equation: labels.map((label, i) => `${label} $${savings[i]}`).join(', ') },
      { text: 'Add the savings from June to September.', equation: `${savings.map(n => `$${n}`).join(' + ')} = $${known}` },
    ],
  });
}
