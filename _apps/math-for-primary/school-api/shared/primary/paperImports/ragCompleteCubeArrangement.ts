import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-complete-cube-arrangement',
  level: 5,
  title: 'Complete a cube arrangement',
  objective: 'Count the cubes in a solid and find how many more make a stated volume, cube or cuboid.',
  skillIds: ['P5.S.VOL.01', 'P5.S.VOL.03'],
  canonicalPatternId: 'complete-or-reduce-cube-arrangement',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (hashString(`${RAG_PATTERN.id}:variant:${seed}`) + (index >>> 0)) % 3;
  const heights = [...r.pick([[1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 2, 3, 4]])];
  const depth = r.int(1, 3);
  const front = heights.reduce((sum, height) => sum + height, 0);
  const existing = front * depth;
  const context = [
    'Each small cube has side length 1 cm.',
    `The solid is ${depth} ${depth === 1 ? 'cube' : 'cubes'} deep. Every row from front to back matches the front row.`,
    'Every stack starts on the base. There are no gaps or hollow spaces inside the stacks.',
  ];
  const steps: NonNullable<Question['workedSteps']> = [
    {text: 'Find the volume of one small cube.', equation: '1 × 1 × 1 = 1 cm³'},
    {text: 'Count the cubes in the vertical stacks of the front row.', equation: `${heights.join(' + ')} = ${front} cubes`},
    {text: 'Include every row, including cubes hidden behind the front row.', equation: `${front} × ${depth} = ${existing} cubes`},
  ];
  let target: number;
  let prompt: string;
  if (variant === 0) {
    target = existing + r.int(5, 24);
    if (target === 20) target += 1;
    context.push(`The finished solid must have a volume of ${target} cm³.`);
    prompt = 'How many more small cubes are needed to reach this volume?';
    steps.push({text: 'Each cube fills 1 cm³. Find the number of cubes needed for the stated volume.', equation: `${target} ÷ 1 = ${target} cubes`});
  } else if (variant === 1) {
    const side = Math.max(heights.length, ...heights, depth) + r.int(1, 2);
    target = side * side * side;
    context.push(`The finished cube must have side length ${side} cm.`, 'Keep all the existing cubes in place.');
    prompt = 'How many more small cubes are needed to complete the finished cube?';
    steps.push(
      {text: 'Find the volume of the specified cube.', equation: `${side} × ${side} × ${side} = ${target} cm³`},
      {text: 'Change this volume to a number of small cubes.', equation: `${target} ÷ 1 = ${target} cubes`},
    );
  } else {
    let length = heights.length + r.int(1, 3);
    const width = depth + r.int(1, 2);
    const height = Math.max(...heights) + r.int(0, 2);
    if (length === width && width === height) length += 1;
    target = length * width * height;
    context.push(
      `A rectangular box has inside dimensions ${length} cm from left to right, ${width} cm from front to back and ${height} cm high.`,
      'The pictured solid rests on the base inside this box. Keep all the existing cubes in place.',
    );
    prompt = 'How many more small cubes are needed to fill the box with no gaps?';
    steps.push(
      {text: 'Find the volume inside the box.', equation: `${length} × ${width} × ${height} = ${target} cm³`},
      {text: 'Change this volume to a number of small cubes.', equation: `${target} ÷ 1 = ${target} cubes`},
    );
  }
  const answer = target - existing;
  steps.push({text: 'Subtract the cubes already in the solid.', equation: `${target} − ${existing} = ${answer} cubes`});
  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    context,
    answer: String(answer),
    unit: 'cubes',
    picture: {type: 'maha-bodhi-p5', layout: 'cube-growth', heights, depths: [depth]},
    hint: 'Count the front row, then include all identical rows behind it. Find the target cube count and subtract the cubes already there.',
    explanation: steps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
    workedSteps: steps,
  };
  if (variant === 1) {
    const options = [...new Set([answer, existing, target, target - front, answer + 1, answer + 2])].slice(0, 4);
    question.choices = r.shuffle(options.map(String));
  }
  return question;
}
