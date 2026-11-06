import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-linked-comparisons',
  level: 2,
  title: 'Use clues to compare lengths and masses',
  objective: 'Link comparisons to find the longest ribbon or to identify both the lightest and heaviest parcels.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.MEASURE.02'],
  canonicalPatternId: 'p2-order-from-linked-comparisons',
};

function ribbons(rng: Rng, key: string): Question {
  const [shortest, middle, tied, longest] = rng.shuffle(['Mei', 'Jun', 'Lina', 'Ravi', 'Nina', 'Ben', 'Zara', 'Ari']);
  const workedSteps = [
    { text: `${middle} and ${tied} have ribbons of the same length. Put them together.` },
    { text: `${shortest}'s ribbon is shorter than ${middle}'s, so it is shorter than both ribbons in the pair.` },
    { text: `${longest}'s ribbon is longer than the pair. That makes it the longest of all four.` },
  ];
  return {
    key, prompt: 'Whose ribbon is the longest?',
    context: rng.shuffle([
      `${middle}'s ribbon is shorter than ${longest}'s ribbon.`,
      `${middle}'s ribbon is longer than ${shortest}'s ribbon.`,
      `${tied}'s ribbon is the same length as ${middle}'s ribbon.`,
    ]),
    choices: rng.shuffle([shortest, middle, tied, longest]), answer: longest,
    hint: 'Find the two ribbons that go together. Which ribbon is longer than that pair?',
    workedSteps, explanation: workedSteps.map(step => step.text).join(' '),
  };
}

function parcelMarks(number: string, x: number, beamY: number): Batch11UpperMark[] {
  const panY = beamY - 5;
  return [
    { kind: 'path', d: `M ${x - 24} ${panY} h 48 M ${x} ${panY} V ${beamY}` },
    { kind: 'path', d: `M ${x - 17} ${panY} v -24 h 34 v 24 Z`, fill: '#fff' },
    { kind: 'text', x: x - 10, y: panY - 6, text: number },
  ];
}

function parcels(rng: Rng, key: string): Question {
  const [light, middle, heavy] = rng.shuffle(['14', '25', '36', '47', '58', '69', '72', '83']);
  const pairs = rng.shuffle([[light, middle], [middle, heavy], [light, heavy]]);
  const heavyOnLeft = rng.shuffle([true, false, rng.chance(0.5)]);
  const marks: Batch11UpperMark[] = [];
  const descriptions: string[] = [];
  const workedSteps: { text: string }[] = [];

  pairs.forEach(([lighter, heavier], row) => {
    const leftIsLower = heavyOnLeft[row];
    const left = leftIsLower ? heavier : lighter;
    const right = leftIsLower ? lighter : heavier;
    const pivotY = 42 + row * 64;
    const offset = leftIsLower ? 9 : -9;
    const leftY = pivotY + offset;
    const rightY = pivotY - offset;
    marks.push(
      { kind: 'path', d: `M 160 ${pivotY} l -12 17 h 24 Z`, fill: '#c9e4d7' },
      { kind: 'line', x1: 65, y1: leftY, x2: 255, y2: rightY },
      ...parcelMarks(left, 65, leftY), ...parcelMarks(right, 255, rightY),
    );
    descriptions.push(`Balance ${row + 1} has parcel ${left} on the left and parcel ${right} on the right. The ${leftIsLower ? 'left' : 'right'} side is lower.`);
    workedSteps.push({ text: `On balance ${row + 1}, parcel ${heavier} sits lower than parcel ${lighter}. Parcel ${heavier} is heavier.` });
  });
  workedSteps.push({ text: `From lightest to heaviest, the parcels are ${light}, ${middle}, then ${heavy}. The first and last parcels give the two answers.` });
  return {
    key, prompt: 'Which parcel is the lightest? Which is the heaviest?',
    context: ['The numbers on the parcels are their names. A parcel keeps the same mass each time it is weighed. Write the parcel number in each box.'],
    picture: { type: 'batch11-upper', label: descriptions.join(' '), marks },
    structuredResponse: { kind: 'number-pair', firstLabel: 'Lightest parcel', secondLabel: 'Heaviest parcel' },
    answer: JSON.stringify([light, heavy]),
    hint: 'Look at the lower end of each balance. Which parcel goes down both times? Which goes up both times?',
    workedSteps, explanation: workedSteps.map(step => step.text).join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  return (hashString(String(seed)) + index) % 2 === 0 ? parcels(rng, key) : ribbons(rng, key);
}
