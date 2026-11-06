import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-count-unit-cubes-volume',
  level: 5,
  title: 'Count cubes and find volume',
  objective: 'Count cubes in complete layers and use the volume of one small cube to find a total volume.',
  skillIds: ['P5.S.VOL.01', 'P5.S.VOL.03'],
  canonicalPatternId: 'count-unit-cubes-and-find-volume',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (hashString(String(seed)) % 4 + (index % 4 + 4) % 4) % 4;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const finish = (question: Omit<Question, 'key' | 'explanation'>): Question => ({
    ...question,
    key,
    explanation: (question.workedSteps ?? [])
      .map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  // A supplied count makes a picture unnecessary.
  if (variant === 2) {
    const count = r.int(7, 30);
    const edge = r.int(3, 5);
    const oneCube = edge * edge * edge;
    return finish({
      prompt: 'What is the total volume of all the small cubes?',
      context: [
        `A model uses ${count} identical small cubes.`,
        `Each small cube has an edge length of ${edge} cm.`,
        'The cubes do not overlap.',
      ],
      answer: String(count * oneCube),
      unit: 'cm³',
      hint: 'Find the volume of one small cube, then use the number of cubes.',
      workedSteps: [
        {text: 'Multiply the three equal edge lengths of one cube.',
          equation: `${edge} × ${edge} × ${edge} = ${oneCube} cm³`},
        {text: 'Add the equal volumes by multiplying by the number of cubes.',
          equation: `${count} × ${oneCube} = ${count * oneCube} cm³`},
      ],
    });
  }

  const countOnly = variant === 1;
  const depth = r.int(2, 3);
  let heights: number[];
  if (variant === 3) {
    // A complete cuboid with a visible grid of small cubes.
    const width = r.int(2, 4);
    const height = r.int(2, 4);
    heights = Array.from({length: width}, () => height);
  } else {
    const width = r.int(3, 4);
    heights = [r.int(3, 4), r.int(1, 3), r.int(1, 2)];
    if (width === 4) heights.push(1);
    heights.sort((a, b) => b - a);
  }
  const front = heights.reduce((sum, height) => sum + height, 0);
  const count = front * depth;
  const edge = variant === 3 ? r.int(3, 5) : 1;
  const oneCube = edge * edge * edge;
  const context = [
    'Solid 1 is built from identical small cubes.',
    'Each layer behind the front layer is an exact copy of it. There are no gaps inside the solid.',
  ];
  if (!countOnly) context.push(`Each small cube has an edge length of ${edge} cm.`);
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: 'Count the cubes in the front layer by adding its column heights.',
      equation: `${heights.join(' + ')} = ${front} cubes`},
    {text: `There are ${depth} matching layers, including the front layer. Count the hidden cubes too.`,
      equation: `${front} × ${depth} = ${count} cubes`},
  ];
  if (!countOnly) workedSteps.push(
    {text: 'Find the volume of one small cube.',
      equation: `${edge} × ${edge} × ${edge} = ${oneCube} cm³`},
    {text: 'Multiply the number of cubes by the volume of one cube.',
      equation: `${count} × ${oneCube} = ${count * oneCube} cm³`},
  );
  const question = finish({
    prompt: countOnly ? 'Count all the small cubes in Solid 1. How many are there?'
      : 'What is the volume of Solid 1?',
    context,
    picture: {type: 'maha-bodhi-p5', layout: 'cube-growth', heights, depths: [depth]},
    answer: String(countOnly ? count : count * oneCube),
    unit: countOnly ? 'unit cubes' : 'cm³',
    hint: countOnly
      ? 'Count the cubes in the front layer, then count the matching layers behind it.'
      : 'Count every cube, including hidden cubes. Then find the volume of one cube.',
    workedSteps,
  });
  if (variant === 0) {
    const boundingCount = heights.length * Math.max(...heights) * depth;
    const options = [...new Set([count, front, boundingCount, count + depth, count - depth])]
      .slice(0, 4).map(String);
    question.choices = r.shuffle(options);
  }
  return question;
}
