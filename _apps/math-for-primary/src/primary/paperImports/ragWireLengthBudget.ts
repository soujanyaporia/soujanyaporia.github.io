import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-wire-length-budget',
  level: 5,
  title: 'Find the wire left after a construction',
  objective: 'Find a rectilinear construction perimeter from component lengths and subtract it from a wire length.',
  skillIds: ['P4.S.AREA.02'],
  canonicalPatternId: 'p5-wire-length-budget',
} as const;

function makeRng(seed: number, index: number) {
  let state = (Math.imul(seed | 0, 1664525) + Math.imul(index + 1, 1013904223)) >>> 0;
  return (min: number, max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const pick = makeRng(seed, index);
  const leftWidth = pick(18, 35);
  const leftHeight = pick(30, 45);
  const rightWidth = pick(16, 28);
  const rightHeight = pick(38, 55);
  const shared = pick(8, Math.min(leftHeight, rightHeight) - 4);
  const used = 2 * (leftWidth + leftHeight) + 2 * (rightWidth + rightHeight) - 2 * shared;
  const wire = used + pick(25, 100);
  const left = wire - used;

  const prompt = `A piece of wire is ${wire} cm long. It is bent around two rectangles placed side by side. The first rectangle is ${leftWidth} cm wide and ${leftHeight} cm high. The second is ${rightWidth} cm wide and ${rightHeight} cm high. They share a straight boundary of ${shared} cm. How much wire is left?`;
  const workedSteps = [
    { text: 'Find the boundary length of each rectangle.', equation: `2 × (${leftWidth} + ${leftHeight}) = ${2 * (leftWidth + leftHeight)} cm; 2 × (${rightWidth} + ${rightHeight}) = ${2 * (rightWidth + rightHeight)} cm` },
    { text: 'The shared boundary was counted twice, so subtract it twice.', equation: `${2 * (leftWidth + leftHeight)} + ${2 * (rightWidth + rightHeight)} − 2 × ${shared} = ${used} cm` },
    { text: 'Subtract the length used from the wire length.', equation: `${wire} − ${used} = ${left} cm` },
  ];

  return {
    key: `rag-wire-length-budget:${seed}:${index}`,
    prompt,
    answer: String(left),
    unit: 'cm',
    hint: 'Add the two rectangle perimeters. The shared boundary is inside the construction, so remove it twice before finding the leftover wire.',
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    workedSteps,
  };
}
