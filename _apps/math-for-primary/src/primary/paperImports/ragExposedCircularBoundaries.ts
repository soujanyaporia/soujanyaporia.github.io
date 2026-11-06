import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p6-exposed-circular-boundaries',
  level: 6,
  title: 'Find the perimeter after a semicircle is cut out',
  objective: 'Add the exposed straight edges and circular arc after a semicircle is cut from a square.',
  skillIds: ['P6.S.CIRCLE.03'],
  canonicalPatternId: 'p6-exposed-circular-boundaries',
};

const sides = [30, 32, 34, 36] as const;
const diameters = [14, 28] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const n = Math.abs(Math.trunc(seed + index * 3));
  const side = sides[n % sides.length];
  const diameter = diameters[Math.floor(n / sides.length) % diameters.length];
  const arc = (22 / 7) * diameter / 2;
  const answer = 3 * side + (side - diameter) + arc;
  const fmt = (value: number) => String(Number(value.toFixed(4)));

  return {
    key: `rag-exposed-circular-boundaries:${seed}:${index}`,
    prompt: 'What is the perimeter of the cardboard that remains?',
    context: [
      `A semicircle with diameter ${diameter} cm is cut from the middle of one side of a square piece of cardboard. The square has side length ${side} cm. Use π = 22/7.`,
      'The cut makes a semicircular curved edge. The rest of the square boundary remains around the cardboard.',
    ],
    answer: fmt(answer),
    unit: 'cm',
    hint: 'Add the three full sides, the two short top pieces, and the semicircle arc. The arc is half a circle’s circumference.',
    explanation: `The straight edges total 3 × ${side} + (${side} − ${diameter}) = ${3 * side + side - diameter} cm. The semicircle arc is 22/7 × ${diameter} ÷ 2 = ${fmt(arc)} cm. Add them to get ${fmt(answer)} cm.`,
    workedSteps: [
      { text: `The straight edges total 3 × ${side} + (${side} − ${diameter}) = ${3 * side + side - diameter} cm.` },
      { text: `The semicircular arc is 22/7 × ${diameter} ÷ 2 = ${fmt(arc)} cm.` },
      { text: `The perimeter is ${3 * side + side - diameter} + ${fmt(arc)} = ${fmt(answer)} cm.` },
    ],
  };
}
