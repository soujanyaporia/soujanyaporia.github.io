import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-distance-over-repeated-laps',
  level: 3,
  title: 'Distance around a field',
  objective: 'Find the distance around a rectangle and use it to work out the total distance for several full laps.',
  skillIds: ['P3.S.AREA.02', 'P3.S.MD.03', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03'],
  canonicalPatternId: 'p3-distance-over-repeated-laps',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['stated-choice', 'plan-entry', 'plan-choice', 'side-multiple'] as const);
  const usePlan = form === 'plan-entry' || form === 'plan-choice';
  const mixed = form === 'side-multiple';
  const width = mixed ? rng.int(61, 79) : rng.int(10, 19);
  const factor = mixed ? rng.int(2, 3) : undefined;
  const length = factor === undefined ? rng.int(27, 39) : width * factor;
  const laps = mixed ? rng.int(3, 4) : rng.int(2, 3);
  const perimeter = 2 * (length + width);
  const distance = perimeter * laps;

  let dimensions: string;
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (factor !== undefined) {
    dimensions = `A rectangular field is ${width} m wide. Its length is ${factor} times its width.`;
    workedSteps.push({ text: 'Use the width to find the length.', equation: `${width} × ${factor} = ${length} m` });
  } else if (usePlan) {
    dimensions = 'The plan shows a rectangular field.';
  } else {
    dimensions = `A rectangular field is ${length} m long and ${width} m wide.`;
  }
  workedSteps.push(
    { text: 'One full lap covers two long sides and two short sides.', equation: `2 × (${length} + ${width}) = ${perimeter} m` },
    { text: `Count the distance around the field ${laps} times.`, equation: `${perimeter} × ${laps} = ${distance} m` },
  );

  let response: Pick<Question, 'prompt' | 'answer' | 'unit' | 'choices' | 'structuredResponse'> = {
    prompt: 'How many metres does Siti run in all?', answer: String(distance), unit: 'm',
  };
  if (mixed) {
    const km = Math.floor(distance / 1000);
    const metres = distance % 1000;
    response = {
      prompt: 'How far does Siti run in all? Give your answer in kilometres and metres.',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Kilometres', secondLabel: 'Metres' },
      answer: JSON.stringify([String(km), String(metres)]),
    };
    workedSteps.push({
      text: 'Each group of 1000 m makes one kilometre. Keep the metres left over.',
      equation: `${distance} m = ${km * 1000} m + ${metres} m = ${km} km ${metres} m`,
    });
  } else if (form !== 'plan-entry') {
    const options = [length + width, perimeter, distance, distance + perimeter];
    response.choices = rng.shuffle(options.map(String));
  }

  return {
    key,
    context: [dimensions, `Siti runs ${laps} full laps around the edge of the field.`],
    ...(usePlan ? { picture: { type: 'shape' as const, shape: 'rectangle', labels: [`${length} m`, `${width} m`] } } : {}),
    ...response,
    hint: mixed ? 'Find the long side first. Work in metres until you have counted every lap.' : 'Imagine starting at one corner. Which sides do you pass before you get back to it?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
