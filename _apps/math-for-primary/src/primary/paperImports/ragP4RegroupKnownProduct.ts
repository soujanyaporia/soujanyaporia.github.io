import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-regroup-known-product',
  level: 4 as const,
  title: 'Make new groups',
  objective: 'Find a total by multiplying, then use it to find a new group count, share or quotient.',
  skillIds: ['P4.S.MD.02', 'P4.S.MD.01', 'P4.S.MD.03'],
  canonicalPatternId: 'p4-regroup-known-product-by-exact-division',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const start = (hashString(String(seed)) >>> 0) % 3;
  const form = (start + (Math.trunc(index) % 3) + 3) % 3;
  const divisor = r.int(2, 9);

  if (form === 2) {
    const firstDivisor = r.pick([2, 3, 4, 5, 6, 7, 8, 9].filter(n => n !== divisor));
    const firstQuotient = r.int(32, 640);
    const original = firstDivisor * firstQuotient;
    const nextMultiple = Math.ceil(original / divisor) * divisor;
    const increased = nextMultiple + r.int(2, 16) * divisor;
    const added = increased - original;
    const result = increased / divisor;
    return {
      key,
      context: [
        `I divide my starting number by ${firstDivisor} and get ${firstQuotient} with no remainder.`,
        `I go back to my starting number, add ${added} to it and divide the result by ${divisor}.`,
      ],
      prompt: 'What is the result of my second division? Show your working on paper.',
      answer: String(result),
      hint: 'Which number, divided by the first divisor, would give the first answer?',
      workedSteps: [
        { text: 'Multiply to find the starting number.', equation: `${firstQuotient} × ${firstDivisor} = ${original}` },
        { text: 'Add to the starting number.', equation: `${original} + ${added} = ${increased}` },
        { text: 'Divide the increased number by the new divisor.', equation: `${increased} ÷ ${divisor} = ${result}` },
      ],
      explanation: `The starting number is ${original}. Adding ${added} gives ${increased}, which makes ${result} groups of ${divisor}.`,
      proof: { op: '/', a: { op: '+', a: { op: '*', a: firstQuotient, b: firstDivisor }, b: added }, b: divisor },
    };
  }

  const perBox = r.int(12, 38);
  // Only the combined stock must divide evenly; a single box need not do so.
  const counts = Array.from({ length: 139 }, (_, i) => 12 + i)
    .filter(n => (n * perBox) % divisor === 0);
  const boxes = r.pick(counts);
  const total = boxes * perBox;
  const result = total / divisor;
  const countTubes = form === 0;
  const unit = countTubes ? 'tubes' : 'beads';
  return {
    key,
    context: [
      `A craft shop has ${boxes} boxes of beads. Each box holds ${perBox} beads.`,
      countTubes
        ? `The shop puts all the beads into tubes with ${divisor} beads in each tube.`
        : `The shop gives all the beads to ${divisor} clubs. Each club gets the same number of beads.`,
    ],
    prompt: (countTubes ? 'How many tubes does the shop fill?' : 'How many beads does each club get?') + ' Show your working and write the unit on paper.',
    answer: String(result), unit,
    hint: countTubes ? 'Start with all the boxes. How many sets of one tube’s worth of beads can you make?' : 'Find how many beads the clubs have to share altogether.',
    workedSteps: [
      { text: 'Find the number of beads in all the boxes.', equation: `${boxes} × ${perBox} = ${total} beads` },
      { text: countTubes ? `Count the groups of ${divisor} beads. Each group fills one tube.` : `Share the beads equally among the ${divisor} clubs.`, equation: `${total} ÷ ${divisor} = ${result} ${unit}` },
    ],
    explanation: countTubes ? `All ${total} beads fit into ${result} tubes, with ${divisor} beads in each tube.` : `Each club gets ${result} beads. The ${divisor} clubs together get all ${total} beads.`,
    proof: { op: '/', a: { op: '*', a: boxes, b: perBox }, b: divisor },
  };
}
