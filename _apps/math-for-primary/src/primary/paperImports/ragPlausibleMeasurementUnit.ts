import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-plausible-measurement-unit',
  level: 2 as const,
  title: 'Fill in the missing unit',
  objective: 'Use a familiar mass or length to choose the unit that fits a given number.',
  skillIds: ['P2.S.MEASURE.04', 'P2.S.MEASURE.02', 'P2.S.MEASURE.01'],
  canonicalPatternId: 'plausible-real-world-measurement',
};

type Unit = 'g' | 'kg' | 'cm' | 'm';
type Example = { lead: string; readings: [number, Unit][]; benchmark: string };

const masses: Example[] = [
  { lead: 'A tennis ball weighs', readings: [[56, 'g'], [57, 'g'], [58, 'g']], benchmark: 'A tennis ball is light enough to toss with one hand.' },
  { lead: 'A chicken egg weighs', readings: [[50, 'g'], [55, 'g'], [60, 'g']], benchmark: 'A chicken egg adds very little weight to your shopping bag.' },
  { lead: 'An adult bicycle weighs', readings: [[12, 'kg'], [14, 'kg'], [16, 'kg']], benchmark: 'A bicycle is much heavier than a pencil.' },
  { lead: 'The water in a full one-litre jug weighs', readings: [[1, 'kg'], [1000, 'g']], benchmark: 'A litre of water weighs about one kilogram.' },
];

const lengths: Example[] = [
  { lead: 'The length of a new crayon is', readings: [[8, 'cm'], [9, 'cm'], [10, 'cm']], benchmark: 'A crayon fits in a pencil case.' },
  { lead: 'The height of a classroom door is', readings: [[2, 'm'], [200, 'cm']], benchmark: 'A classroom door is a little taller than a grown-up.' },
  { lead: 'The length of a skipping rope is', readings: [[2, 'm'], [3, 'm'], [230, 'cm'], [250, 'cm'], [270, 'cm']], benchmark: 'A skipping rope has to reach over your head and under your feet.' },
  { lead: 'The length of a school bus is', readings: [[9, 'm'], [10, 'm'], [11, 'm']], benchmark: 'A school bus is long enough for several rows of seats.' },
];

const alternative = {
  g: ['kg', 'heavy'], kg: ['g', 'light'],
  cm: ['m', 'long'], m: ['cm', 'short'],
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mass = rng.chance(0.5);
  const items = mass ? [rng.pick(masses)] : rng.shuffle([...lengths]).slice(0, 2);
  const rows = items.map((item, i) => {
    const [value, unit] = rng.pick(item.readings);
    const [otherUnit, comparison] = alternative[unit];
    const label = mass ? '' : `${i === 0 ? '(a)' : '(b)'} `;
    return {
      given: `${label}${item.lead} about ${value} ___.`,
      unit,
      reason: `${label}${item.benchmark} ${value} ${otherUnit} would be far too ${comparison}, so ${value} ${unit} fits.`,
    };
  });
  return {
    key,
    prompt: mass ? 'Use g or kg to fill the gap. Type just the unit.' : 'Use cm or m for each gap. Type the units for (a) and (b) in order, with a space between them.',
    context: rows.map(row => row.given),
    answer: rows.map(row => row.unit).join(' '),
    hint: 'Keep the number in the gap sentence. Try saying it with each unit. Which measurement fits the object?',
    workedSteps: rows.map(row => ({ text: row.reason })),
    explanation: rows.map(row => row.reason).join(' '),
  };
}
