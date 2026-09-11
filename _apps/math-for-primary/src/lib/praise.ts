import type { Misconception } from '../engine/types';
import type { Mood } from '../ui/Mascot';

/**
 * Short, specific reactions from Dot. Praise the reasoning and the effort
 * (trying again, writing the equation, no hints) rather than repeating
 * "Awesome!" for everything.
 */
export interface PraiseContext {
  firstTry: boolean;
  hints: number;
  wrong: number;
  revealed: boolean;
  /** For built equations: the story or the calculation. */
  form?: 'story' | 'solve' | 'family';
  /** Clean answers in a row, including this one. */
  inRow: number;
  kind: string;
}

const pick = (options: string[], seed: number) => options[Math.abs(seed) % options.length];

const CLEAN = ['Nice thinking!', 'Spot on!', 'You worked it out!', 'Great reasoning!', 'Yes! Well done.'];

export function praiseFor(c: PraiseContext, seed: number): { line: string; mood: Mood } {
  if (c.revealed) return { line: 'You got there. Well done for sticking with it!', mood: 'happy' };
  if (c.form === 'story') return { line: 'You wrote the story as an equation!', mood: 'cheer' };
  if (c.wrong > 0) return { line: pick(['You changed your strategy and got it.', 'Trying again worked!', 'You kept going. Brilliant!'], seed), mood: 'cheer' };
  if (c.hints > 0) return { line: pick(['The hint helped you think it through.', 'Good use of a hint!'], seed), mood: 'happy' };
  if (c.inRow >= 3 && c.inRow % 3 === 0) return { line: `${c.inRow} in a row!`, mood: 'cheer' };
  if (c.kind === 'choice' || c.kind === 'match' || c.kind === 'translate') return { line: 'You found the relationship first!', mood: 'cheer' };
  return { line: pick(CLEAN, seed), mood: 'happy' };
}

const OOPS: Partial<Record<Misconception, string[]>> = {
  wrong_operation: ['Almost. Look at what changed.', 'Check the sign again.'],
  off_by_one: ['So close! Count again.', 'Nearly! Check the last step.'],
  too_big: ['A little too big.', 'Try a smaller number.'],
  too_small: ['A little too small.', 'Try a bigger number.'],
  used_extra_number: ['Do we need every number?'],
  reversed_order: ['Check the order.'],
  wrong_numbers: ['Look at the numbers again.'],
  misread_relation: ['What really happens in the story?'],
  unequal_groups: ['Are the groups fair?'],
};

export function oopsFor(m: Misconception | undefined, seed: number): { line: string; mood: Mood } {
  const lines = (m && OOPS[m]) ?? ["Let's look again together.", 'Have another think.'];
  return { line: pick(lines, seed), mood: 'oops' };
}
