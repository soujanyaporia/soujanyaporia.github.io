import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p5-basic-rectangle-measurements',
  level: 5,
  title: 'Measure a rectangle',
  objective: 'Find rectangle area using side lengths, a side difference, perimeter, or a covered fraction.',
  skillIds: ['P3.S.AREA.03', 'P4.S.AREA.01', 'P5.S.FRAC.01'],
  canonicalPatternId: 'p5-basic-rectangle-measurements',
};

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const fraction = (n: number, d: number) => {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`rag-basic-rectangle-measurements:${seed}:${index}`));
  const variant = rng.int(0, 2);
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    const breadth = rng.int(4, 12);
    const excess = rng.int(2, 9);
    const length = breadth + excess;
    const area = length * breadth;
    return {
      key, context: [`A rectangle is ${breadth} cm wide. Its length is ${excess} cm greater than its width.`],
      prompt: 'What is the area of the rectangle?', answer: String(area), unit: 'cm²',
      hint: 'First find the length. Then multiply the length by the width.',
      explanation: `Length = ${breadth} + ${excess} = ${length} cm. Area = ${length} × ${breadth} = ${area} cm².`,
      workedSteps: [{ text: `Length = ${breadth} + ${excess} = ${length} cm.` }, { text: `Area = ${length} × ${breadth} = ${area} cm².` }],
    };
  }

  if (variant === 1) {
    const breadth = rng.int(4, 12);
    const length = breadth + rng.int(3, 10);
    const perimeter = 2 * (length + breadth);
    const area = length * breadth;
    return {
      key, context: [`A rectangle has a perimeter of ${perimeter} cm and a breadth of ${breadth} cm.`],
      prompt: 'What is its area?', answer: String(area), unit: 'cm²',
      hint: 'Half the perimeter is the length plus the breadth.',
      explanation: `Half the perimeter is ${perimeter} ÷ 2 = ${length + breadth} cm. Length = ${length + breadth} − ${breadth} = ${length} cm. Area = ${length} × ${breadth} = ${area} cm².`,
      workedSteps: [{ text: `Length + breadth = ${perimeter} ÷ 2 = ${length + breadth} cm.` }, { text: `Length = ${length + breadth} − ${breadth} = ${length} cm.` }, { text: `Area = ${length} × ${breadth} = ${area} cm².` }],
    };
  }

  const length = rng.pick([6, 8, 10, 12, 14, 16]);
  const breadth = rng.pick([6, 8, 10, 12, 14, 16]);
  const denominators = [2, 3, 4, 5].filter(d => (length * breadth) % d === 0);
  const denominator = rng.pick(denominators);
  const numerator = rng.int(1, denominator - 1);
  const wholeArea = length * breadth;
  const coveredArea = wholeArea * numerator / denominator;
  return {
    key, context: [`A rectangular tabletop is ${length} m long and ${breadth} m wide. ${fraction(numerator, denominator)} of it is covered.`],
    prompt: 'What area is covered?', answer: String(coveredArea), unit: 'm²',
    hint: 'Find the whole tabletop area, then take the stated fraction.',
    explanation: `Whole area = ${length} × ${breadth} = ${wholeArea} m². Covered area = ${fraction(numerator, denominator)} × ${wholeArea} = ${coveredArea} m².`,
    workedSteps: [{ text: `Whole area = ${length} × ${breadth} = ${wholeArea} m².` }, { text: `Covered area = ${fraction(numerator, denominator)} × ${wholeArea} = ${coveredArea} m².` }],
  };
}
