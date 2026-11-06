import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-composition-change-unchanged-category',
  level: 5,
  title: 'Keep track of the unchanged group',
  objective: 'Use an unchanged group to find how many items were added or how many there were at first.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02', 'P5.S.PCT.03'],
  canonicalPatternId: 'p5-composition-change-unchanged-category',
} as const;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  // Four consecutive indices include both addition representations and removal.
  const lane = ((hashString(`composition-form:${seed}`) >>> 0) + (index >>> 0)) % 4;
  const make = (
    context: string[],
    prompt: string,
    answer: number,
    unit: string,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer: String(answer),
    unit,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
  });

  if (lane < 2) {
    const [beforePercent, afterPercent] = r.pick([
      [15, 35], [20, 50], [25, 45], [30, 50], [35, 60],
      [40, 65], [45, 75], [55, 70], [60, 80],
    ]);
    const beforeBluePercent = 100 - beforePercent;
    const afterBluePercent = 100 - afterPercent;
    const commonFactor = gcd(beforeBluePercent, afterBluePercent);
    const scale = r.int(1, 3);
    // Both totals are multiples of 100 and give exactly the same blue count.
    const initialTotal = 100 * (afterBluePercent / commonFactor) * scale;
    const finalTotal = 100 * (beforeBluePercent / commonFactor) * scale;
    const blueCount = initialTotal / 100 * beforeBluePercent;
    const added = finalTotal - initialTotal;
    const decimalShare = String(afterPercent / 100);
    const finalShare = lane === 1 ? decimalShare : `${afterPercent}%`;
    const steps: NonNullable<Question['workedSteps']> = [];

    if (lane === 1) {
      steps.push({
        text: 'Write the final red share as a percentage.',
        equation: `${decimalShare} = ${afterPercent}/100 = ${afterPercent}%`,
      });
    }
    steps.push(
      {
        text: 'Find the percentage of blue beads at first.',
        equation: `100% − ${beforePercent}% = ${beforeBluePercent}%`,
      },
      {
        text: 'Find the number of blue beads at first.',
        equation: `${initialTotal} ÷ 100 × ${beforeBluePercent} = ${blueCount} beads`,
      },
      {
        text: `There are still ${blueCount} blue beads. Find their percentage of the new total.`,
        equation: `100% − ${afterPercent}% = ${afterBluePercent}%`,
      },
      {
        text: `The ${blueCount} blue beads make up ${afterBluePercent}% of the new total. Find 1%, then 100%.`,
        equation: `${blueCount} ÷ ${afterBluePercent} × 100 = ${finalTotal} beads`,
      },
      {
        text: 'Only red beads were added, so subtract the original total from the new total.',
        equation: `${finalTotal} − ${initialTotal} = ${added} beads`,
      },
    );

    return make(
      [
        `A craft box contains ${initialTotal} beads. Every bead is either red or blue.`,
        `${beforePercent}% of the beads are red.`,
        'Some red beads are put into the box. No beads are taken out, and the number of blue beads stays the same.',
        `The red beads now make up ${finalShare} of all the beads in the box.`,
      ],
      'How many red beads are put into the box?',
      added,
      'beads',
      'The number of blue beads does not change. Find their percentage before and after the red beads are added.',
      steps,
    );
  }

  const [initialRedPercent, multiple] = r.pick([
    [70, 2], [75, 2], [80, 3], [85, 4], [80, 2], [90, 4],
  ]);
  const initialTotal = 100 * r.int(3, 15);
  const bluePercent = 100 - initialRedPercent;
  const remainingRedPercentOfOriginal = multiple * bluePercent;
  const removedPercentOfOriginal = initialRedPercent - remainingRedPercentOfOriginal;
  const removed = initialTotal / 100 * removedPercentOfOriginal;

  return make(
    [
      'A game box holds only red and blue counters.',
      `At first, ${initialRedPercent}% of the counters are red.`,
      `${removed} red counters are taken out. All the blue counters stay in the box, and no counters are added.`,
      `There are now ${multiple} times as many red counters as blue counters.`,
    ],
    'How many counters were in the box at first?',
    initialTotal,
    'counters',
    'Blue counters do not change. Use their share of the original total to find the share of the original total that was removed.',
    [
      {
        text: 'Find the blue counters as a percentage of the original total. Their number stays the same.',
        equation: `100% − ${initialRedPercent}% = ${bluePercent}%`,
      },
      {
        text: `The remaining red counters are ${multiple} times the blue counters. Express them as a percentage of the original total, not the remaining total.`,
        equation: `${multiple} × ${bluePercent}% = ${remainingRedPercentOfOriginal}%`,
      },
      {
        text: 'Find the removed counters as a percentage of the original total.',
        equation: `${initialRedPercent}% − ${remainingRedPercentOfOriginal}% = ${removedPercentOfOriginal}%`,
      },
      {
        text: `${removed} counters represent ${removedPercentOfOriginal}% of the original total. Find 1%, then 100%.`,
        equation: `${removed} ÷ ${removedPercentOfOriginal} × 100 = ${initialTotal} counters`,
      },
    ],
  );
}
