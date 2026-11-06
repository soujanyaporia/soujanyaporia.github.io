import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-reconstruct-order',
  level: 1,
  title: 'Who goes where?',
  objective: 'Use position clues to arrange a row and find a named member’s place.',
  skillIds: ['P1.S.WN.06'],
  canonicalPatternId: 'p1-reconstruct-order-from-clues',
};

const names = ['Bao', 'Dina', 'Isha', 'Joel', 'Kavi', 'Lina', 'Noor', 'Teo', 'Uma', 'Zane'];
const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) >>> 0) + index % 3 + 3) % 3;
  const bears = variant === 1;
  // Physical order is left to right on the shelf, or front to back in the queue.
  const line = rng.shuffle([...names]).slice(0, bears ? 5 : 6);
  const forward = rng.chance(0.5);
  const reading = forward ? line : [...line].reverse();
  const cards = rng.shuffle([...line]);
  if (cards.every((name, i) => name === line[i])) cards.push(cards.shift()!);

  const setting = bears ? 'Five toy bears sit side by side on a shelf.' : 'Six children are in a queue for the slide. Count from the front.';
  const roster = `Their names are ${cards.slice(0, -1).join(', ')} and ${cards[cards.length - 1]}.`;
  const place = (name: string) => ordinals[line.indexOf(name)];
  const fixedPlace = (name: string) => `${name} is ${place(name)} in the queue.`;
  const question = (clues: string[], prompt: string, answer: string, hint: string, steps: string[], order?: string[]): Question => ({
    key, prompt, answer, hint,
    context: [setting, roster, ...rng.shuffle(clues)],
    workedSteps: steps.map(text => ({ text })),
    explanation: steps.join(' '),
    ...(order ? { order } : {}),
  });

  if (variant === 0) {
    const [one, two, anchor, middle, far, last] = reading;
    const [fixed, missing] = rng.shuffle([one, two]);
    const shortSide = forward ? 'ahead of' : 'behind';
    const longSide = forward ? 'behind' : 'ahead of';
    const direction = forward ? 'back' : 'front';
    return question([
      fixedPlace(anchor), fixedPlace(fixed),
      `${middle} is between ${anchor} and ${far}.`,
      `${last} is ${longSide} ${far}.`,
    ], `What is ${missing}'s position from the front? Write the number.`, String(line.indexOf(missing) + 1),
    'Place the two children whose positions you know. Look for room to put the others.', [
      `Put ${anchor} in ${place(anchor)} place and ${fixed} in ${place(fixed)} place.`,
      `Only one space ${shortSide} ${anchor} is free. ${middle} and ${far} cannot both fit there.`,
      `Start at ${anchor} and go towards the ${direction}. ${middle} comes next, then ${far}, then ${last}.`,
      `The only empty place is ${place(missing)}, so ${missing} goes there.`,
    ]);
  }

  if (bears) {
    const [edge, anchor, neighbour, target, other] = reading;
    const clueEnd = forward ? 'left' : 'right';
    const countEnd = rng.pick(['left', 'right']);
    const position = countEnd === 'left' ? line.indexOf(target) + 1 : line.length - line.indexOf(target);
    return question([
      `${edge} is first from the ${clueEnd}.`, `${anchor} is second from the ${clueEnd}.`,
      `${neighbour} is next to ${anchor}.`, `${target} is between ${neighbour} and ${other}.`,
    ], `What is ${target}'s position from the ${countEnd}? Write the number.`, String(position),
    'Start at the end named in the clues. Check which space beside the second bear is free.', [
      `From the ${clueEnd}, place ${edge} first and ${anchor} second.`,
      `${edge} already sits on one side of ${anchor}. That puts ${neighbour} in third place from the ${clueEnd}.`,
      `${target} must sit between ${neighbour} and ${other}. From the ${clueEnd}, the bears are ${reading.join(', ')}.`,
      `Count from the ${countEnd}. ${target} is ${ordinals[position - 1]}.`,
    ]);
  }

  const [outside, anchor, remaining, neighbour, secondAnchor, end] = reading;
  const near = forward ? 'ahead of' : 'behind';
  const beyond = forward ? 'behind' : 'ahead of';
  return question([
    fixedPlace(anchor), fixedPlace(secondAnchor),
    `${outside} is immediately ${near} ${anchor}.`,
    `${neighbour} is immediately ${near} ${secondAnchor}.`,
    `${end} is ${beyond} ${secondAnchor}.`,
  ], 'Put all the names in order from the front of the queue to the back.', line.join(','),
  'Place the children whose positions you know. Immediately means there is nobody in between.', [
    `Put ${anchor} in ${place(anchor)} place and ${secondAnchor} in ${place(secondAnchor)} place.`,
    `${outside} goes right ${near} ${anchor}, in ${place(outside)} place. ${neighbour} goes right ${near} ${secondAnchor}, in ${place(neighbour)} place.`,
    `Only ${place(end)} place is ${beyond} ${secondAnchor}. Put ${end} there. That leaves ${place(remaining)} place for ${remaining}.`,
    `From front to back, the order is ${line.join(', ')}.`,
  ], cards);
}
