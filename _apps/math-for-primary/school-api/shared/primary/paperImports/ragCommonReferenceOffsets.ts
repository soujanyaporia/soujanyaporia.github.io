import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-common-reference-offsets',
  level: 3,
  title: 'Compare amounts using a common reference',
  objective: 'Use how much more or less each group has than one group to find the largest amount, a missing count or a total.',
  skillIds: ['P3.S.AS.01', 'P3.S.WN.03'],
  canonicalPatternId: 'p3-offsets-from-a-common-reference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const series = `${RAG_PATTERN.id}:${seed}`;
  const key = `${series}:${index}`;
  const rng = new Rng(hashString(key));
  const start = (hashString(series) >>> 0) % 3;
  const variant = (start + Math.trunc(index) % 3 + 3) % 3;

  if (variant === 0) {
    const [base, middle, direct, linked] = rng.shuffle(['Nila', 'Ben', 'Ravi', 'Mei']);
    const firstGap = rng.int(18, 24);
    const nextGap = rng.int(16, 22);
    const linkedGap = firstGap + nextGap;
    const margin = rng.int(1, 5);
    const directGap = linkedGap + (rng.chance(0.5) ? margin : -margin);
    const winner = linkedGap > directGap ? linked : direct;
    const largerGap = Math.max(linkedGap, directGap);
    const smallerGap = Math.min(linkedGap, directGap);

    return {
      key,
      context: [
        `${middle} has ${firstGap} more beads than ${base}.`,
        `${base} has ${directGap} fewer beads than ${direct}.`,
        `${linked} has ${nextGap} more beads than ${middle}.`,
      ],
      prompt: 'Who has the most beads?',
      choices: rng.shuffle([base, middle, direct, linked]),
      answer: winner,
      hint: `Compare each collection with ${base}'s. How many extra beads does ${linked} have?`,
      workedSteps: [
        { text: `${linked} has ${nextGap} more beads than ${middle}, who already has ${firstGap} more than ${base}. Add the two differences.`, equation: `${firstGap} + ${nextGap} = ${linkedGap}` },
        { text: `${direct} has ${directGap} more beads than ${base}. The two largest collections belong to ${linked} and ${direct}.` },
        { text: `Compare their extra beads. ${winner} has the larger collection.`, equation: `${largerGap} > ${smallerGap}` },
      ],
      explanation: `${linked} has ${linkedGap} more beads than ${base}, and ${direct} has ${directGap} more than ${base}. So ${winner} has the most beads.`,
    };
  }

  if (variant === 1) {
    const sun = rng.int(1390, 2640);
    const sunLead = rng.int(210, 320);
    const starLead = rng.int(360, 550);
    const moon = sun - sunLead;
    const star = moon + starLead;

    return {
      key,
      context: [
        `Team Sun has ${sun} points.`,
        `Team Sun has ${sunLead} more points than Team Moon.`,
        `Team Star has ${starLead} more points than Team Moon.`,
      ],
      prompt: '(a) How many points does Team Moon have? (b) How many points does Team Star have?',
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Team Moon (points)',
        secondLabel: '(b) Team Star (points)',
      },
      answer: JSON.stringify([String(moon), String(star)]),
      hint: 'Work back from Team Sun to Team Moon. Then use Team Moon’s score for part (b).',
      workedSteps: [
        { text: '(a) Take Team Sun’s extra points away to find Team Moon’s score.', equation: `${sun} − ${sunLead} = ${moon}` },
        { text: '(b) Start with Team Moon’s score and add Team Star’s extra points.', equation: `${moon} + ${starLead} = ${star}` },
      ],
      explanation: `Team Moon has ${moon} points. Team Star has ${starLead} more than Team Moon, giving Team Star ${star} points.`,
    };
  }

  const fern = rng.int(245, 365) * 10;
  const pineShortfall = rng.int(30, 49) * 10;
  const lakeExtra = rng.int(8, 24) * 10;
  const pine = fern - pineShortfall;
  const lake = fern + lakeExtra;
  const total = pine + lake;
  const twiceFern = fern + fern;

  return {
    key,
    context: [
      `Fern Library has ${fern} books.`,
      `Fern Library has ${pineShortfall} more books than Pine Library.`,
      `Fern Library has ${lakeExtra} fewer books than Lake Library.`,
    ],
    prompt: 'How many books do Pine Library and Lake Library have in all?',
    choices: rng.shuffle([
      total,
      twiceFern + pineShortfall - lakeExtra,
      twiceFern + pineShortfall + lakeExtra,
      twiceFern - pineShortfall - lakeExtra,
    ].map(String)),
    answer: String(total),
    unit: 'books',
    hint: 'Both clues compare a library with Fern. Which library has fewer books than Fern, and which has more?',
    workedSteps: [
      { text: 'Pine has fewer books than Fern. Subtract to find Pine’s count.', equation: `${fern} − ${pineShortfall} = ${pine}` },
      { text: 'Lake has more books than Fern. Start again with Fern’s count and add the difference.', equation: `${fern} + ${lakeExtra} = ${lake}` },
      { text: 'Add the books at Pine and Lake.', equation: `${pine} + ${lake} = ${total}` },
    ],
    explanation: `Pine has ${pine} books and Lake has ${lake}. Together they have ${total} books.`,
  };
}
