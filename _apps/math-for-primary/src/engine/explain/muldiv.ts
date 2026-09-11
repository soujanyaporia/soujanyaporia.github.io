import { equationTokens, line } from '../equation';
import type { Explanation, NumberProblem } from '../types';
import { answerLine, arrowList, askPart, checkLine, counted, mk, repeatedLine, show, StepList } from './kit';
import { computeHints, explainFact } from './strategies';
import { arrayVisual, familyVisual, groupsVisual, numberLine, skipLine } from './visuals';

const PREFER: Record<string, string[]> = {
  'sub.inverse': ['think-add', 'count-up', 'take-away'],
  'mul.groups': ['equal-groups', 'repeated', 'skip-count', 'array'],
  'mul.array': ['array', 'skip-count', 'turn-around', 'equal-groups'],
  'mul.result': ['skip-count', 'turn-around', 'double', 'array', 'equal-groups'],
  'div.sharing': ['share', 'think-times', 'group'],
  'div.grouping': ['group', 'skip-count', 'think-times'],
  'div.inverse': ['think-times', 'share', 'group'],
  'div.result': ['think-times', 'share', 'group', 'skip-count'],
};

const GOALS: Record<string, (a: number, b: number) => string> = {
  'mul.groups': (a, b) => `${a} groups of ${b}. How many altogether?`,
  'mul.array': (a, b) => `${a} rows of ${b}. How many altogether?`,
  'mul.result': () => 'How many altogether?',
  'div.sharing': (a, b) => `Share ${a} equally into ${b} groups.`,
  'div.grouping': (a, b) => `How many groups of ${b} are in ${a}?`,
  'div.inverse': () => 'Use the times fact to find the missing number.',
  'div.result': () => 'Divide.',
  'sub.inverse': () => 'Use the adding fact to take away.',
};

export function explainMulDiv(p: NumberProblem): Explanation {
  const f = p.fact;
  const ctx = { item: p.item, prefer: PREFER[p.skill] };

  if (p.skill === 'mul.repeated') return explainRepeated(p);
  if (p.skill === 'mul.turnaround') return explainTurnaround(p);
  if (p.skill === 'mul.missing') return explainMissingFactor(p);

  if (p.skill === 'sub.inverse') return explainSubInverse(p);

  const intro =
    p.skill === 'div.inverse'
      ? (s: StepList) =>
          s.add(`□ × ${f.b} = ${f.a} and ${f.a} ÷ ${f.b} = □ have the same missing number.`, familyVisual('mul', [f.c, f.b], f.a), [
            line(equationTokens(p.related!)),
          ])
      : undefined;
  const fx = explainFact(f, ctx, intro);
  const hints =
    p.skill === 'div.inverse'
      ? [
          { level: 1 as const, say: `What times ${f.b} makes ${f.a}?` },
          { level: 2 as const, say: `Count in ${f.b}s until you reach ${f.a}.`, visual: skipLine(f.b, f.c, { hideEnd: true, show: Math.max(1, f.c - 1) }) },
          { level: 3 as const, say: 'Try this:', work: askPart(mk('*', f.c, f.b), 'a') },
          { level: 4 as const, say: `${arrowList(0, f.c, 1, f.b)}. Count the jumps.`, visual: skipLine(f.b, f.c) },
        ]
      : computeHints(f, ctx);
  return {
    goal: (GOALS[p.skill] ?? GOALS['div.result'])(f.a, f.b),
    strategy: fx.strategy,
    steps: fx.steps,
    alternatives: fx.alternatives,
    hints,
  };
}

/** 4 + 4 + 4 = □ × 4, 4 + 4 + 4 = 3 × □, 4 + 4 + 4 = □ (so 3 × 4 = □). */
function explainRepeated(p: NumberProblem): Explanation {
  const f = p.fact;
  const s = new StepList();
  const right = p.equation!.right;
  const form = right.terms.length === 1 ? 'total' : right.terms[0] === null ? 'times' : 'size';
  const picture = groupsVisual(f.a, f.b, { item: p.item, filled: f.a, sizes: true });
  s.add(`${f.b} is added ${f.a} times. That is ${f.a} equal groups of ${f.b}.`, picture, [repeatedLine(f.b, f.a)]);
  if (form === 'total') {
    s.add(`Add them: ${arrowList(0, f.a, 1, f.b)}.`, groupsVisual(f.a, f.b, { item: p.item, filled: f.a, totals: true }), [repeatedLine(f.b, f.a, f.c)], true);
    s.add(`${f.a} groups of ${f.b} is ${f.a} × ${f.b}. So ${f.a} × ${f.b} = ${f.c} too.`, undefined, [show(f, 'answer')]);
  } else if (form === 'times') {
    s.add(`How many ${f.b}s are there? Count the groups: ${f.a}.`, undefined, [answerLine(f.a)], true);
    s.add(`So adding ${counted(f.a, 'group')} of ${f.b} is ${f.a} × ${f.b}.`, undefined, [show(f)]);
  } else {
    s.add(`Each group has ${f.b}. So it is ${f.a} × ${f.b}.`, undefined, [answerLine(f.b)], true);
    s.add(`${f.a} × ${f.b} = ${f.c}, the same as adding the groups.`, undefined, [show(f)]);
  }
  s.add('Adding equal groups is the same as multiplying.');
  return {
    goal: 'Adding equal groups is multiplying.',
    strategy: 'Equal groups',
    steps: s.steps,
    hints: [
      { level: 1, say: form === 'times' ? `How many ${f.b}s are being added?` : form === 'size' ? 'What number is added again and again?' : `Add ${f.b}, ${f.a} times.` },
      { level: 2, say: 'Adding equal groups is the same as multiplying.' },
      { level: 3, say: 'Count the equal groups in the picture.', visual: picture },
      { level: 4, say: `${arrowList(0, f.a, 1, f.b)}.`, visual: groupsVisual(f.a, f.b, { item: p.item, filled: f.a, totals: true }) },
    ],
  };
}

/** 3 × 4 = 4 × □ */
function explainTurnaround(p: NumberProblem): Explanation {
  const f = p.fact;
  const s = new StepList();
  s.add(`Here is ${f.a} × ${f.b}: ${f.a} rows of ${f.b}.`, arrayVisual(f.a, f.b, { item: p.item }));
  s.add(`Turn the array around. Now it is ${f.b} rows of ${f.a}.`, arrayVisual(f.a, f.b, { item: p.item, turned: true }));
  s.add(`Nothing was added or taken away, so there are still ${f.c}.`, undefined, [show(f), show(mk('*', f.b, f.a))]);
  s.add(`So ${f.a} × ${f.b} = ${f.b} × ${f.a}. The missing number is ${p.answer}.`, undefined, [answerLine(p.answer)], true);
  return {
    goal: 'Turn the array around.',
    strategy: 'Turn it around',
    steps: s.steps,
    hints: [
      { level: 1, say: 'Turning an array around does not change how many there are.' },
      { level: 2, say: `Both sides use the numbers ${f.a} and ${f.b}.` },
      { level: 3, say: `Here is ${f.a} × ${f.b}.`, visual: arrayVisual(f.a, f.b, { item: p.item }) },
      { level: 4, say: `Turned around, it is ${f.b} rows of ${f.a}.`, visual: arrayVisual(f.a, f.b, { item: p.item, turned: true }) },
    ],
  };
}

/** □ × 4 = 12 or 3 × □ = 12 */
function explainMissingFactor(p: NumberProblem): Explanation {
  const f = p.fact;
  const s = new StepList();
  const hideFirst = p.equation!.left.terms[0] === null;
  const known = hideFirst ? f.b : f.a;
  const ans = p.answer;
  if (hideFirst) {
    s.add(`How many groups of ${f.b} make ${f.c}?`, skipLine(f.b, f.a, { show: 0 }));
    s.add(`Count in ${f.b}s to ${f.c}: ${arrowList(0, f.a, 1, f.b)}. That is ${counted(f.a, 'jump')}.`, skipLine(f.b, f.a));
  } else {
    s.add(`${f.a} equal groups make ${f.c}. How many in each?`, groupsVisual(f.a, f.b, { item: p.item, filled: f.a, hideSize: true }));
    s.add(`Share ${f.c} into ${f.a} groups: each group gets ${f.b}.`, groupsVisual(f.a, f.b, { item: p.item, filled: f.a, sizes: true }));
  }
  s.add(`We can undo × ${known} by dividing by ${known}.`, undefined, [show(mk('/', f.c, known))]);
  s.add(`So the missing number is ${ans}.`, undefined, [answerLine(ans)], true);
  s.add(`Check: ${f.a} × ${f.b} = ${f.c}.`, undefined, [checkLine(f)]);
  return {
    goal: 'Find the missing number.',
    strategy: 'Undo the times',
    steps: s.steps,
    hints: [
      { level: 1, say: hideFirst ? `How many groups of ${f.b} make ${f.c}?` : `${f.a} groups of what make ${f.c}?` },
      { level: 2, say: `To undo × ${known}, what could we do?` },
      { level: 3, say: 'Try this:', work: askPart(mk('/', f.c, known), 'c') },
      { level: 4, say: `Count in ${known}s to ${f.c}: ${arrowList(0, ans, 1, known)}.`, visual: skipLine(known, ans) },
    ],
  };
}

/** 3 + □ = 7 and 7 − 3 = □ share their missing number. */
function explainSubInverse(p: NumberProblem): Explanation {
  const f = p.fact;
  const fx = explainFact(f, { item: p.item, prefer: PREFER['sub.inverse'] }, (s) =>
    s.add(`${f.b} + □ = ${f.a} and ${f.a} − ${f.b} = □ have the same missing number.`, familyVisual('add', [f.b, f.c], f.a), [
      line(equationTokens(p.related!)),
    ]),
  );
  return {
    goal: GOALS['sub.inverse'](f.a, f.b),
    strategy: fx.strategy,
    steps: fx.steps,
    alternatives: fx.alternatives,
    hints: [
      { level: 1, say: `What number goes with ${f.b} to make ${f.a}?` },
      { level: 2, say: `Count on from ${f.b} to ${f.a}.`, visual: numberLine(f.b, f.c, { hideEnd: true }) },
      { level: 3, say: 'Try this:', work: askPart(mk('+', f.b, f.c), 'b') },
      { level: 4, say: `${arrowList(f.b, f.c, 1)}. Count the jumps.`, visual: numberLine(f.b, f.c) },
    ],
  };
}
