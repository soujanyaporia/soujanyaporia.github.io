import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragCompositionChangeUnchangedCategory';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Solution = {
  mode: 'addition-percent' | 'addition-decimal' | 'decrease';
  unit: 'beads' | 'counters';
  values: number[];
};

function read(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match;
}

// This solver receives only pupil-visible prose. It imports no generation
// parameters and enumerates physical counts instead of using the generator's
// unchanged-percentage construction. The search exceeds all candidate totals.
function solveVisible(q: VisibleQuestion): Solution {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'How many red beads are put into the box?') {
    const total = Number(read(/contains (\d+) beads/, text)[1]);
    const beforePercent = Number(read(/(\d+)% of the beads are red/, text)[1]);
    const share = read(/now make up (\d+%|0\.\d{1,2}) of all the beads/, text)[1];
    const decimal = !share.endsWith('%');
    const afterPercent = decimal
      ? Number(share.slice(2).padEnd(2, '0'))
      : Number(share.slice(0, -1));
    const redBefore = total * beforePercent / 100;
    if (!Number.isInteger(redBefore) || beforePercent <= 0 ||
        afterPercent <= beforePercent || afterPercent >= 100) {
      throw new Error('Invalid visible addition counts or shares');
    }
    if (!text.includes('the number of blue beads stays the same')) {
      throw new Error('The unchanged category must be explicit');
    }
    const values: number[] = [];
    for (let added = 1; added <= 10000; added++) {
      // Directly check the red fraction after adding whole red beads.
      if (100 * (redBefore + added) === afterPercent * (total + added)) {
        values.push(added);
      }
    }
    return {mode: decimal ? 'addition-decimal' : 'addition-percent', unit: 'beads', values};
  }

  if (q.prompt !== 'How many counters were in the box at first?') {
    throw new Error('Unexpected visible response task');
  }
  const percent = Number(read(/At first, (\d+)% of the counters are red/, text)[1]);
  const removed = Number(read(/(\d+) red counters are taken out/, text)[1]);
  const multiple = Number(read(/now (\d+) times as many red counters as blue counters/, text)[1]);
  if (removed <= 0 || percent >= 100 || multiple < 1 || percent <= multiple * (100 - percent)) {
    throw new Error('Invalid visible decrease constraints');
  }
  if (!text.includes('All the blue counters stay in the box, and no counters are added')) {
    throw new Error('The unchanged category must be explicit');
  }
  const values: number[] = [];
  for (let original = 1; original <= 10000; original++) {
    if ((original * percent) % 100 !== 0) continue;
    const redBefore = original * percent / 100;
    const blue = original - redBefore;
    const redAfter = redBefore - removed;
    if (blue > 0 && redAfter > 0 && redAfter === multiple * blue) values.push(original);
  }
  return {mode: 'decrease', unit: 'counters', values};
}

describe('composition change with an unchanged category', () => {
  it('checks the independent solver against hand-derived examples in both share formats', () => {
    for (const share of ['50%', '0.5']) {
      const visible: VisibleQuestion = {
        prompt: 'How many red beads are put into the box?',
        context: [
          'A craft box contains 600 beads. Every bead is either red or blue.',
          '30% of the beads are red.',
          'Some red beads are put into the box. No beads are taken out, and the number of blue beads stays the same.',
          `The red beads now make up ${share} of all the beads in the box.`,
        ],
      };
      // Initially 180 red and 420 blue; 420 red are needed for equal groups.
      expect(solveVisible(visible).values).toEqual([240]);
    }
    const visible: VisibleQuestion = {
      prompt: 'How many counters were in the box at first?',
      context: [
        'A game box holds only red and blue counters.',
        'At first, 80% of the counters are red.',
        '90 red counters are taken out. All the blue counters stay in the box, and no counters are added.',
        'There are now 3 times as many red counters as blue counters.',
      ],
    };
    // 450 gives 360 red and 90 blue; removing 90 leaves 270 = 3 × 90 red.
    expect(solveVisible(visible).values).toEqual([450]);
  });

  it('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [
      -2147483648, -19, -1, 0, 1, 23, 2147483647,
      ...Array.from({length: 48}, (_, i) => 41 + i * 7919),
    ];
    const modes = new Set<string>();
    const questions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        expect(solved.values).toHaveLength(1);
        expect(q.answer).toBe(String(solved.values[0]));
        expect(q.answer).toMatch(/^[1-9]\d*$/);
        expect(q.unit).toBe(solved.unit);
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        modes.add(solved.mode);
        questions.add(JSON.stringify([q.prompt, q.context]));
      }
    }
    expect([...modes].sort()).toEqual(['addition-decimal', 'addition-percent', 'decrease']);
    expect(questions.size).toBeGreaterThan(25);
  });

  it('responds to changed visible givens without consulting stored answers', () => {
    const visible: VisibleQuestion = {
      prompt: 'How many red beads are put into the box?',
      context: [
        'A craft box contains 600 beads. Every bead is either red or blue.',
        '30% of the beads are red.',
        'Some red beads are put into the box. No beads are taken out, and the number of blue beads stays the same.',
        'The red beads now make up 60% of all the beads in the box.',
      ],
    };
    // 420 blue must be 40% of 1050, so the addition is 450.
    expect(solveVisible(visible).values).toEqual([450]);
  });
});
