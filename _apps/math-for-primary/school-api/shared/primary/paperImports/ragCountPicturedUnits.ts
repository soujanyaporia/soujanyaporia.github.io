import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-count-pictured-units',
  level: 1 as const,
  title: 'Count two collections',
  objective: 'Record each pictured collection separately and use both counts when sharing is requested.',
  skillIds: ['P1.S.WN.01', 'P1.S.WN.02', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-count-pictured-units',
};

type Cards = Extract<PaperPicture, { layout: 'cards' }>['cards'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  if ((hashString(String(seed)) + index) % 2 === 0) {
    const boxCounts = rng.shuffle([1, 2, 3, 4]);
    const tables = ['Table A', 'Table B'].map((label, i) => {
      const boxes = boxCounts[i];
      const loose = rng.int(1, 8);
      return { label, boxes, loose, total: 10 * boxes + loose };
    });
    const cards: Cards = tables.flatMap(({ label, boxes, loose }): Cards => [
      { label, value: 'Boxes of 10 pencils', icon: 'box', count: boxes },
      { label, value: 'Loose pencils', icon: 'pencil', count: loose },
    ]);
    const workedSteps = tables.map(({ label, boxes, loose, total }) => ({
      text: `On ${label}, count ten for each box. Then count the loose pencils.`,
      equation: [...Array<string>(boxes).fill('10'), String(loose)].join(' + ') + ` = ${total}`,
    }));
    return {
      key,
      context: ['Each box holds 10 pencils. A pencil outside a box counts as one.'],
      prompt: 'How many pencils are on each table? Write one number for each table.',
      picture: { type: 'paper', layout: 'cards', cards },
      structuredResponse: { kind: 'number-pair', firstLabel: 'Table A', secondLabel: 'Table B' },
      answer: JSON.stringify(tables.map(table => String(table.total))),
      hint: 'Finish counting one table before you start on the other.',
      workedSteps,
      explanation: `Table A has ${tables[0].total} pencils. Table B has ${tables[1].total} pencils.`,
    };
  }

  const kim = rng.int(16, 22);
  const moved = rng.int(2, 5);
  const dev = kim + 2 * moved;
  const equal = kim + moved;
  return {
    key,
    prompt: 'Count the tickets each child has. How many tickets should Dev give Kim so they both have the same number?',
    picture: {
      type: 'paper', layout: 'cards',
      cards: [
        { label: 'Kim', value: 'Tickets', icon: 'ticket', count: kim },
        { label: 'Dev', value: 'Tickets', icon: 'ticket', count: dev },
      ],
    },
    structuredResponse: { kind: 'number-fields', fields: [
      { label: 'Kim’s tickets at the start' },
      { label: 'Dev’s tickets at the start' },
      { label: 'Tickets Dev gives Kim' },
    ] },
    answer: JSON.stringify([kim, dev, moved].map(String)),
    hint: 'Mark each ticket once. Imagine moving one ticket at a time from Dev to Kim.',
    workedSteps: [
      { text: `Count each pile. Kim has ${kim} tickets and Dev has ${dev}.` },
      { text: 'Find how many more tickets Dev has.', equation: `${dev} − ${kim} = ${dev - kim}` },
      { text: 'Each ticket Dev gives away closes the gap by two. Half the gap is the number to give.', equation: `${moved} + ${moved} = ${dev - kim}` },
      { text: 'Check both piles after the move.', equation: `${dev} − ${moved} = ${equal}, ${kim} + ${moved} = ${equal}` },
    ],
    explanation: `Dev gives Kim ${moved} tickets. Each child then has ${equal} tickets.`,
  };
}
