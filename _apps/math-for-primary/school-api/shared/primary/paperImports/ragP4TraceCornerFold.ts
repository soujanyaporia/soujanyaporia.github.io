import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { cornerFoldFigure } from './ragP4TraceCornerFoldFigure';

export const RAG_PATTERN = {
  id: 'rag-p4-trace-corner-fold',
  level: 4,
  title: 'Follow an edge across a fold',
  objective: 'Trace an edge to its folded position and use the two equal angles at the crease to reason about a right-angled corner.',
  skillIds: ['P4.S.ANGLE.01', 'P4.S.SHAPE.01', 'P3.S.ANGLE.01'],
  canonicalPatternId: 'p4-crease-reflection-in-a-right-angled-corner',
};

const sizes = [17, 18, 19, 21, 22, 23, 25, 26, 27, 28, 29, 31, 32];
const must = 'Must be true';
const cannot = 'Cannot be true';
const maybe = 'Need more information';
const fold = 'The dashed line OF is the crease. When the paper is folded, B lands on M. The outline shows where the edges were before the fold.';
const match = 'OB folds onto OM. So the two angles beside the crease, ∠BOF and ∠FOM, are equal.';

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = rng.pick(['find-half', 'find-gap', 'measure-claim', 'equality-claim'] as const);
  const half = rng.pick(sizes);
  const gap = 90 - 2 * half;

  function finish(base: Pick<Question, 'prompt' | 'picture' | 'context' | 'answer' | 'choices' | 'unit'>, steps: string[]): Question {
    return { ...base, key, hint: 'Follow OB to OM as the paper folds. Which angles fit together to make the corner at O?',
      workedSteps: steps.map(text => ({ text })), explanation: steps.join(' ') };
  }

  if (task === 'find-half' || task === 'find-gap') {
    const findHalf = task === 'find-half';
    const target = findHalf ? 'FOM' : 'AOM';
    const value = findHalf ? half : gap;
    const context = ['O is the bottom left corner of a rectangular sheet.',
      findHalf ? 'F lies on the right edge.' : 'F is the top right corner.', fold,
      findHalf ? `∠AOM is ${gap}°.` : `∠FOM is ${half}°.`];
    const steps = findHalf ? [
      'The corner at O is a right angle.',
      `Take away ∠AOM. The angle from OB to OM is 90° − ${gap}° = ${2 * half}°.`,
      match, `∠FOM is half of ${2 * half}°, so it is ${2 * half}° ÷ 2 = ${half}°.`,
    ] : [match, `From OB to OM there are two angles of ${half}°, making ${2 * half}°.`,
      `∠AOM is the rest of the right angle: 90° − ${2 * half}° = ${gap}°.`];
    const prompt = `How large is ∠${target}?`;
    const picture = cornerFoldFigure(findHalf ? 'rectangle' : 'diagonal', half, target);
    if (findHalf && rng.chance(0.5)) {
      return finish({ prompt, picture, context, answer: String(value), unit: '°' }, steps);
    }
    const others = [...new Set([half, gap, 2 * half, 90 - half, value + 1, value - 1])]
      .filter(n => n !== value).slice(0, 3);
    const choices = rng.shuffle([value, ...others]).map(n => `${n}°`);
    return finish({ prompt, picture, context, choices, answer: `${value}°` }, steps);
  }

  const context = ['O is the bottom left corner of a square sheet. F lies somewhere between the two corners on the right edge.', fold,
    'The sketch shows one possible fold. Use the clues to judge the claim.'];
  function claim(statement: string, answer: string, steps: string[], drawnHalf = half): Question {
    return finish({ context, picture: cornerFoldFigure('square', drawnHalf), prompt: `“${statement}” What do the clues tell you?`,
      choices: [must, cannot, maybe], answer }, steps);
  }
  if (task === 'measure-claim') {
    const verdict = rng.pick([must, cannot, maybe]);
    const proposed = verdict === cannot ? half + rng.pick([2, 3, 4]) : half;
    const statement = `∠FOM is ${proposed}°.`;
    if (verdict === maybe) {
      return claim(statement, maybe, [match,
        `A fold with ∠BOF = ${proposed}° gives ∠FOM = ${proposed}°. A fold with ∠BOF = ${proposed + 2}° gives ∠FOM = ${proposed + 2}°.`,
        'Both folds can meet the right edge. We need another clue to tell which angle we have.'], rng.pick(sizes));
    }
    context.push(`∠AOM is ${gap}°.`);
    return claim(statement, verdict, [`∠BOM is the rest of the square corner: 90° − ${gap}° = ${2 * half}°.`,
      match, `∠FOM = ${2 * half}° ÷ 2 = ${half}°. ${verdict === must ? 'This agrees with the claim.' : `This rules out ${proposed}°.`}`]);
  }

  const pair = rng.pick(['both-halves', 'whole-and-half', 'rest-and-half'] as const);
  if (pair === 'both-halves') {
    return claim('∠BOF and ∠FOM are equal.', must, [match, 'OF stays in place as B folds onto M. The two openings match for every such fold.']);
  }
  if (pair === 'whole-and-half') {
    return claim('∠BOM and ∠FOM are equal.', cannot, [match, '∠BOM contains both openings. Each has some size because F is above B. The whole opening is twice ∠FOM.']);
  }
  return claim('∠AOM and ∠FOM are equal.', maybe, [match,
    'If each angle beside the crease is 30°, the part left at the top is 90° − 60° = 30°. The angles match.',
    'If each is 20°, the part left is 90° − 40° = 50°. Now the angles differ. Both folds fit the clues.']);
}
