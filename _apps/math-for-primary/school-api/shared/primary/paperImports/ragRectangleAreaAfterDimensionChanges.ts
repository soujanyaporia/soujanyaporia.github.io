import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-rectangle-area-after-dimension-changes',
  level: 5,
  title: 'Find the area of a rectangular border',
  objective: 'Find the outside dimensions of a rectangular border and subtract the inner area, using whole numbers or fractions.',
  skillIds: ['P3.S.AREA.03', 'P4.S.AREA.02', 'P5.S.FRAC.04', 'P5.S.FRAC.05', 'P5.S.FRAC.07'],
  canonicalPatternId: 'p5-rectangle-area-after-dimension-changes',
};

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function measure(numerator: number, denominator = 1): string {
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  if (d === 1) return String(n);
  const whole = Math.floor(n / d);
  const remainder = n % d;
  return whole === 0 ? `${remainder}/${d}` : `${whole} ${remainder}/${d}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const form = ((Math.trunc(seed) % 3 + Math.trunc(index) % 3) % 3 + 3) % 3;
  let denominator: number;
  let lengthNumerator: number;
  let breadth: number;
  let widthNumerator: number;
  let unit: 'm' | 'cm';

  if (form === 0) {
    denominator = r.pick([3, 4, 5, 6, 8]);
    breadth = r.int(4, 9);
    const wholeLength = r.int(breadth + 3, breadth + 8);
    // Adding two path widths makes the outer length a whole number.
    lengthNumerator = wholeLength * denominator + denominator - 2;
    widthNumerator = 1;
    unit = 'm';
  } else if (form === 1) {
    denominator = r.pick([3, 4, 5, 6, 8]);
    breadth = r.int(3, 6);
    lengthNumerator = r.int(8, 14) * denominator + r.int(1, denominator - 1);
    widthNumerator = r.int(1, 3) * denominator;
    unit = 'cm';
  } else {
    denominator = 1;
    breadth = r.int(7, 12);
    lengthNumerator = r.int(breadth + 4, breadth + 10);
    widthNumerator = r.int(1, 3);
    unit = 'm';
  }

  const innerName = form === 0 ? 'herb bed' : form === 1 ? 'art print' : 'vegetable plot';
  const borderName = form === 0 ? 'path' : form === 1 ? 'border' : 'walkway';
  const length = measure(lengthNumerator, denominator);
  const width = measure(widthNumerator, denominator);
  const twiceWidth = measure(2 * widthNumerator, denominator);
  const outerLengthNumerator = lengthNumerator + 2 * widthNumerator;
  const outerBreadthNumerator = breadth * denominator + 2 * widthNumerator;
  const outerLength = measure(outerLengthNumerator, denominator);
  const outerBreadth = measure(outerBreadthNumerator, denominator);
  const areaDenominator = denominator * denominator;
  const innerAreaNumerator = lengthNumerator * breadth * denominator;
  const outerAreaNumerator = outerLengthNumerator * outerBreadthNumerator;
  const borderAreaNumerator = outerAreaNumerator - innerAreaNumerator;
  const innerArea = measure(innerAreaNumerator, areaDenominator);
  const outerArea = measure(outerAreaNumerator, areaDenominator);
  const borderArea = measure(borderAreaNumerator, areaDenominator);
  const squareUnit = `${unit}²`;

  const context = [
    `A rectangular ${innerName} is ${length} ${unit} long and ${breadth} ${unit} wide.`,
    form === 1
      ? `The print is placed on a rectangular sheet of card. The border is ${width} cm wide all the way around the outside of the print.`
      : `The ${borderName} is ${width} m wide all the way around the outside of the ${innerName}. Its outer edge is a rectangle.`,
  ];
  const workedSteps = [
    {
      text: `Find the area of the ${innerName}${form === 2 ? ' for part (a)' : ''}.`,
      equation: `${length} × ${breadth} = ${innerArea} ${squareUnit}`,
    },
    {
      text: `The ${borderName} adds its width at both ends of each dimension.`,
      equation: `2 × ${width} = ${twiceWidth} ${unit}`,
    },
    {
      text: 'Find the length of the outside rectangle.',
      equation: `${length} + ${twiceWidth} = ${outerLength} ${unit}`,
    },
    {
      text: 'Find the width of the outside rectangle.',
      equation: `${breadth} + ${twiceWidth} = ${outerBreadth} ${unit}`,
    },
    {
      text: 'Find the area of the outside rectangle.',
      equation: `${outerLength} × ${outerBreadth} = ${outerArea} ${squareUnit}`,
    },
    {
      text: `Subtract the ${innerName} area to leave only the ${borderName}${form === 2 ? ' for part (b)' : ''}.`,
      equation: `${outerArea} − ${innerArea} = ${borderArea} ${squareUnit}`,
    },
  ];
  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt: form === 2
      ? '(a) Find the area of the vegetable plot. (b) Find the area of just the walkway.'
      : form === 1
        ? 'Which value is the area of just the border?'
        : 'Find the area of just the path. Give a whole number, or a fraction or mixed number in simplest form.',
    answer: borderArea,
    hint: 'Add the border width at both ends of each dimension. Then compare the areas of the two rectangles.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };

  if (form === 2) {
    question.answer = JSON.stringify([innerArea, borderArea]);
    question.structuredResponse = {
      kind: 'number-pair',
      firstLabel: '(a) Plot area (m²)',
      secondLabel: '(b) Walkway area (m²)',
    };
  } else {
    question.unit = squareUnit;
    if (form === 0) {
      question.requireSimplified = true;
    } else {
      const missingCorners = 2 * widthNumerator * (lengthNumerator + breadth * denominator);
      const addedWidthOnce = (lengthNumerator + widthNumerator)
        * (breadth * denominator + widthNumerator) - innerAreaNumerator;
      question.choices = r.shuffle([
        borderAreaNumerator,
        outerAreaNumerator,
        missingCorners,
        addedWidthOnce,
      ].map(n => measure(n, areaDenominator)));
    }
  }
  return question;
}
