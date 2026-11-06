import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'complete-number-bonds',
  level: 1,
  title: 'Find the missing bond numbers',
  objective: 'Find missing parts of number bonds and use them to make a new whole.',
  skillIds: ['P1.S.AS.03'],
  canonicalPatternId: 'complete-a-number-bond',
};

type BondPicture = Extract<PaperPicture, { layout: 'bars' }>;
type BondRow = BondPicture['rows'][number];

function bond(whole: string | number, left: string | number, right: string | number): BondRow {
  return {
    label: `Whole ${whole}`,
    parts: [left, right].map(value => ({ size: 1, label: String(value) })),
  };
}

function picture(rows: BondRow[]): BondPicture {
  return {
    type: 'paper',
    layout: 'bars',
    heading: 'Number bonds',
    caption: 'Read each row across. The two boxes hold the parts of that whole.',
    rows,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));

  if (rng.chance(0.5)) {
    const whole = rng.pick([6, 8, 10]);
    const bottomGiven = whole / 2;
    const otherParts = Array.from({ length: whole - 1 }, (_, i) => i + 1)
      .filter(part => part !== bottomGiven);
    const topGiven = rng.pick(otherParts);
    const topAnswer = whole - topGiven;
    const bottomAnswer = whole - bottomGiven;

    return {
      key,
      prompt: 'What goes in each empty box? Give the top row answer first.',
      picture: picture([bond(whole, topGiven, '?'), bond(whole, bottomGiven, '?')]),
      structuredResponse: { kind: 'number-pair', firstLabel: 'Top row', secondLabel: 'Bottom row' },
      answer: JSON.stringify([String(topAnswer), String(bottomAnswer)]),
      hint: 'Both rows have the same whole. In each row, count on from the part you can see.',
      workedSteps: [
        { text: 'Take the top row’s known part from the whole.', equation: `${whole} − ${topGiven} = ${topAnswer}` },
        { text: 'Start with the whole again for the bottom row.', equation: `${whole} − ${bottomGiven} = ${bottomAnswer}` },
      ],
      explanation: `The top parts are ${topGiven} and ${topAnswer}. The bottom parts are ${bottomGiven} and ${bottomAnswer}. Each pair makes ${whole}.`,
    };
  }

  const [firstGiven, diamond, secondGiven, triangle] = rng.shuffle([2, 3, 4, 5, 6, 7, 8]);
  const firstWhole = firstGiven + diamond;
  const secondWhole = secondGiven + triangle;
  const star = diamond + triangle;
  return {
    key,
    prompt: 'What number does the star (★) stand for?',
    context: ['A shape keeps its number wherever you see it.'],
    picture: picture([
      bond(firstWhole, firstGiven, '◆'),
      bond(secondWhole, '△', secondGiven),
      bond('★', '◆', '△'),
    ]),
    answer: String(star),
    hint: 'Find the diamond in the first row and the triangle in the second. Look for those shapes again in the last row.',
    workedSteps: [
      { text: 'Find the diamond’s part.', equation: `${firstWhole} − ${firstGiven} = ${diamond}` },
      { text: 'Find the triangle’s part.', equation: `${secondWhole} − ${secondGiven} = ${triangle}` },
      { text: 'Join the two parts to find the star.', equation: `${diamond} + ${triangle} = ${star}` },
    ],
    explanation: `The diamond stands for ${diamond} and the triangle stands for ${triangle}. Together they make ${star}, the value of the star.`,
    proof: { op: '+', a: { op: '-', a: firstWhole, b: firstGiven }, b: { op: '-', a: secondWhole, b: secondGiven } },
  };
}
