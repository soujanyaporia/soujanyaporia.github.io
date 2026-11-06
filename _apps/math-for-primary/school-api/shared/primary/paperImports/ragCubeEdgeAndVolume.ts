import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-cube-edge-and-volume',
  level: 6,
  title: 'Cube edges and face areas',
  objective: 'Use the volume of a cube to find its edge length or the area of one square face.',
  skillIds: ['P6.S.VOL.01', 'P6.S.VOL.03', 'P5.S.VOL.03'],
  canonicalPatternId: 'p6-cube-edge-and-volume',
};

function questionHash(seed: number, index: number): number {
  let value = 2166136261;
  for (const character of `${seed}:${index}`) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return value;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const code = questionHash(seed, index);
  const edges = [2, 3, 4, 6, 7, 8, 9, 11, 12];
  const edge = edges[Math.floor(code / 2) % edges.length]!;
  const volume = edge * edge * edge;
  const findArea = code % 2 === 1;
  const answer = findArea ? edge * edge : edge;
  const unit = findArea ? 'cm²' : 'cm';
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'A cube has three equal dimensions. Find three equal whole numbers whose product is its volume.',
      equation: `${edge} × ${edge} × ${edge} = ${volume} cm³`,
    },
    {
      text: 'Each of these equal dimensions is an edge of the cube.',
      equation: `Edge length = ${edge} cm`,
    },
  ];
  if (findArea) {
    workedSteps.push({
      text: 'One face is a square. Multiply its side length by itself to find its area.',
      equation: `${edge} × ${edge} = ${answer} cm²`,
    });
  }
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [`A wooden block is a cube. Its volume is ${volume} cm³.`],
    prompt: findArea
      ? 'What is the area of one square face of the block?'
      : 'How long is each edge of the block?',
    answer: String(answer),
    unit,
    hint: findArea
      ? 'First find the edge length using three equal factors of the volume. Then find the area of a square with that side length.'
      : 'The length, width and height of a cube are equal. Which three equal whole numbers multiply to give this volume?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
  };
}
