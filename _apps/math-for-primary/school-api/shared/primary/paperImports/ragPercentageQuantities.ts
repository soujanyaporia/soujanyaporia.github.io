import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-percentage-quantities',
  level: 5,
  title: 'Work with percentage quantities',
  objective: 'Find a percentage or its complement, share a percentage quantity equally, and update counts and percentages after adding one type of item.',
  skillIds: ['P5.S.PCT.03', 'P5.S.PCT.02'],
  canonicalPatternId: 'percentage-quantities',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 2);
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    steps: string[],
    extra: Partial<Question> = {},
  ): Question => ({
    key,
    context,
    prompt,
    answer,
    hint,
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
    ...extra,
  });

  if (variant === 0) {
    const total = r.pick([120, 160, 180, 220, 240, 260, 280, 320, 360, 420, 480, 540, 600]);
    const percent = r.pick([15, 20, 25, 35, 40, 45, 60, 65, 70, 80, 85]);
    const otherPercent = 100 - percent;
    const informationBooks = total * otherPercent / 100;
    return make(
      [
        `A school library receives ${total} new books.`,
        `${percent}% are storybooks. All the other new books are information books.`,
      ],
      'How many of the new books are information books?',
      String(informationBooks),
      'Find the percentage of information books, then find that percentage of the total.',
      [
        `Information books make up 100% − ${percent}% = ${otherPercent}% of the new books.`,
        `Number of information books = ${otherPercent} ÷ 100 × ${total} = ${informationBooks}.`,
      ],
      {unit: 'books'},
    );
  }

  if (variant === 1) {
    const totalMetres = r.pick([8, 12, 16, 20, 24]);
    const percent = r.pick([15, 20, 25, 40, 45, 50, 60, 75]);
    // Integer hundredths keep the used length and every share exact.
    const usedHundredths = totalMetres * percent;
    const possibleShares = [4, 6, 8].filter(count =>
      usedHundredths % count === 0 && usedHundredths / count <= 300,
    );
    const shares = r.pick(possibleShares);
    const usedMetres = usedHundredths / 100;
    const eachMetres = (usedHundredths / shares) / 100;
    return make(
      [
        `A craft class has ${totalMetres} m of cord.`,
        `It cuts ${percent}% of the cord into ${shares} equal pieces, with no waste. The rest of the cord is kept for another project.`,
      ],
      'What is the length of each cut piece, in metres?',
      String(eachMetres),
      'Find the length of cord used, then divide it by the number of equal pieces.',
      [
        `Length used = ${percent} ÷ 100 × ${totalMetres} = ${usedMetres} m.`,
        `Length of each piece = ${usedMetres} ÷ ${shares} = ${eachMetres} m.`,
      ],
      {unit: 'm'},
    );
  }

  const initialTotal = r.pick([120, 180, 240, 300, 360, 420, 480, 540]);
  const percent = r.pick([20, 25, 40, 50, 60, 65, 70, 75, 80]);
  // Every initial total is divisible by four. Restrict the addition so that
  // the percentage requested in part (b) is a whole number, without rounding.
  const quarterCounts = [1, 2, 4].filter(count =>
    ((100 - percent) * 4) % (4 + count) === 0,
  );
  const added = initialTotal * r.pick(quarterCounts) / 4;
  const initialStars = initialTotal * percent / 100;
  const finalStars = initialStars + added;
  const finalTotal = initialTotal + added;
  const roundBadges = finalTotal - finalStars;
  const roundPercent = roundBadges * 100 / finalTotal;
  return make(
    [
      `A class makes ${initialTotal} badges for a fair.`,
      `${percent}% of these badges are star-shaped and the rest are round.`,
      `The class then makes ${added} more star-shaped badges and no more round badges.`,
    ],
    '(a) How many star-shaped badges does the class make altogether?\n(b) What percentage of all the badges made are round?',
    JSON.stringify([String(finalStars), String(roundPercent)]),
    'Find the first group of star-shaped badges and add the extra badges. Use the new total when finding the percentage in part (b).',
    [
      `At first, the number of star-shaped badges is ${percent} ÷ 100 × ${initialTotal} = ${initialStars}.`,
      `(a) Star-shaped badges altogether = ${initialStars} + ${added} = ${finalStars}.`,
      `The new total is ${initialTotal} + ${added} = ${finalTotal} badges.`,
      `Round badges = ${finalTotal} − ${finalStars} = ${roundBadges}.`,
      `(b) Percentage that are round = ${roundBadges} ÷ ${finalTotal} × 100% = ${roundPercent}%.`,
    ],
    {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Star-shaped badges'},
          {label: '(b) Round badges (%)'},
        ],
      },
    },
  );
}
