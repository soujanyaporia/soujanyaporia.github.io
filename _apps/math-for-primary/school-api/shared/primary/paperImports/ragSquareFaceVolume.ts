import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'volume-from-square-face-information',
  level: 5,
  title: 'Find volume from square information',
  objective: 'Recover a square side from its area or perimeter, then use it to find volume.',
  skillIds: ['P5.S.VOL.03'],
  canonicalPatternId: 'p5-volume-square-face-information',
};

const rand = (seed: number, index: number) => {
  let state = (Math.imul(seed | 0, 1664525) + Math.imul(index | 0, 1013904223) + 12345) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
const pick = <T,>(r: () => number, items: T[]): T => items[Math.floor(r() * items.length)];

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = rand(seed, index);
  const variant = ((seed + index) % 3 + 3) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    const side = 6 + Math.floor(r() * 11);
    const perimeter = side * 4;
    const height = 4 + Math.floor(r() * 12);
    const baseArea = side * side;
    const answer = baseArea * height;
    const workedSteps = [
      { text: 'A square has four equal sides, so divide its perimeter by 4.', equation: `${perimeter} ÷ 4 = ${side} cm` },
      { text: 'Find the area of the square base.', equation: `${side} × ${side} = ${baseArea} cm²` },
      { text: 'Multiply the base area by the cuboid height.', equation: `${baseArea} × ${height} = ${answer} cm³` },
    ];
    return {
      key,
      prompt: `A cuboid has a square base with perimeter ${perimeter} cm and height ${height} cm. What is its volume?`,
      answer: String(answer), unit: 'cm³', hint: 'Find one side of the square base first.', workedSteps,
      explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '),
    };
  }

  if (variant === 1) {
    const denominator = pick(r, [2, 3, 4]);
    const numerator = pick(r, Array.from({ length: denominator - 1 }, (_, i) => i + 1));
    const side = denominator * (4 + Math.floor(r() * 8));
    const baseArea = side * side;
    const height = side * numerator / denominator;
    const answer = baseArea * height;
    const workedSteps = [
      { text: 'The base is a square. Find its side from its area.', equation: `${side} × ${side} = ${baseArea} cm², so one side is ${side} cm` },
      { text: 'Use the given fraction of the side to find the height.', equation: `${numerator}/${denominator} × ${side} = ${height} cm` },
      { text: 'Multiply the base area by the height.', equation: `${baseArea} × ${height} = ${answer} cm³` },
    ];
    return {
      key,
      prompt: `A cuboid has a square base with area ${baseArea} cm². Its height is ${numerator}/${denominator} of the side of the base. What is its volume?`,
      answer: String(answer), unit: 'cm³', hint: 'Recover the square side, then use the fraction to find the height.', workedSteps,
      explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '),
    };
  }

  const edge = 3 + Math.floor(r() * 10);
  const faceArea = edge * edge;
  const answer = edge * edge * edge;
  const workedSteps = [
    { text: 'A face of a cube is a square. Find its side length.', equation: `${edge} × ${edge} = ${faceArea} cm², so one edge is ${edge} cm` },
    { text: 'Multiply the three equal edge lengths to find the volume.', equation: `${edge} × ${edge} × ${edge} = ${answer} cm³` },
  ];
  return {
    key,
    prompt: `One square face of a cube has an area of ${faceArea} cm². What is the volume of the cube?`,
    answer: String(answer), unit: 'cm³', hint: 'Find the side length of the square face first.', workedSteps,
    explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '),
  };
}
