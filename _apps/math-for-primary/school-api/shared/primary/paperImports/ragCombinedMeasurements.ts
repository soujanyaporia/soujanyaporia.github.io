import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-combined-measurements',
  level: 3,
  title: 'Combine two lengths using their difference',
  objective: 'Find a missing length from a difference, then use both lengths to find a total or half of that total.',
  skillIds: ['P3.S.AS.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-combined-measurements-from-a-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['ride', 'ride', 'trails', 'towers']);
  function finish(body: Omit<Question, 'key' | 'explanation' | 'workedSteps'>, workedSteps: NonNullable<Question['workedSteps']>): Question {
    return {
      ...body,
      key,
      workedSteps,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 'ride') {
    const monday = rng.int(130, 310) * 10 + 5;
    const extra = rng.int(12, 64) * 10 + 2;
    const tuesday = monday + extra;
    const total = monday + tuesday;
    return finish({
      context: [`On Monday, Jia cycled ${monday} m.`, `On Tuesday, she cycled ${extra} m farther than on Monday.`],
      prompt: 'How far did Jia cycle over the two days? Give your answer in metres.',
      answer: String(total),
      unit: 'm',
      hint: 'Which day was the longer ride? Find that distance before adding the two rides.',
    }, [
      { text: 'Add the extra distance to Monday’s ride to find Tuesday’s ride.', equation: `${monday} m + ${extra} m = ${tuesday} m` },
      { text: 'Count each day’s ride once.', equation: `${monday} m + ${tuesday} m = ${total} m` },
    ]);
  }

  if (variant === 'trails') {
    const hill = rng.int(23, 43) * 100;
    const excess = rng.int(12, 49) * 10 + rng.pick([1, 3, 7, 9]);
    const pond = hill - excess;
    const total = hill + pond;
    const km = Math.floor(total / 1000);
    const metres = total % 1000;
    return finish({
      context: [`The hill trail is ${hill} m long.`, `It is ${excess} m longer than the pond trail.`],
      prompt: '(a) How long is the pond trail in metres?\n(b) How long are the two trails altogether? Give your answer in kilometres and metres.',
      structuredResponse: {
        kind: 'number-fields',
        fields: [{ label: '(a) Pond trail (m)' }, { label: '(b) Whole kilometres (km)' }, { label: '(b) Metres left over (m)' }],
      },
      answer: JSON.stringify([String(pond), String(km), String(metres)]),
      hint: 'The pond trail is shorter. Use its length in part (b), then group the total into thousands of metres.',
    }, [
      { text: '(a) Take the extra length away from the hill trail to find the pond trail.', equation: `${hill} m − ${excess} m = ${pond} m` },
      { text: '(b) Add the hill trail and the pond trail.', equation: `${hill} m + ${pond} m = ${total} m` },
      { text: 'Every 1000 m makes 1 km. Keep the metres left over.', equation: `${total} m = ${km * 1000} m + ${metres} m = ${km} km ${metres} m` },
    ]);
  }

  const cmPart = rng.int(36, 67);
  const difference = 2 * rng.int(3, 13);
  const blue = 100 + cmPart;
  const red = blue - difference;
  const combined = blue + red;
  const yellow = combined / 2;
  return finish({
    context: [
      `The blue tower is 1 m ${cmPart} cm tall.`,
      `It is ${difference} cm taller than the red tower.`,
      'The yellow tower is half the height of the blue and red towers stacked together.',
    ],
    prompt: 'How tall is the yellow tower in centimetres?',
    answer: String(yellow),
    unit: 'cm',
    hint: 'Write the blue tower’s height in centimetres. Find the red tower’s height before you put the two heights together.',
  }, [
    { text: 'One metre is 100 cm. Write the whole height of the blue tower in centimetres.', equation: `100 cm + ${cmPart} cm = ${blue} cm` },
    { text: 'The red tower is shorter by the given difference.', equation: `${blue} cm − ${difference} cm = ${red} cm` },
    { text: 'Add the heights of the two towers.', equation: `${blue} cm + ${red} cm = ${combined} cm` },
    { text: 'The yellow tower is half that height.', equation: `${combined} cm ÷ 2 = ${yellow} cm` },
  ]);
}
