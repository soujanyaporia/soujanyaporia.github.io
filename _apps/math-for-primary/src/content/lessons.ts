import { binary, factTokens, single, tok } from '../engine/equation';
import {
  balance,
  bond,
  compareBar,
  joinCounters,
  numberLine,
  partWholeBar,
  partWholeCounters,
  takeAwayCounters,
} from '../engine/explain/visuals';
import { makeFact as f } from '../engine/levels';
import type { ProblemRequest } from '../engine/skills';
import type { LevelId, SkillId, Token, VisualKind, VisualSpec } from '../engine/types';
import type { IconName } from '../ui/Icon';

/**
 * Lessons are data. Each one runs through the same player:
 *   Understand (intro cards) → See (5 worked examples) → Try (5 guided
 *   questions, with extra practice after mistakes) → Done.
 * Adding a lesson means adding an entry here — no new screens.
 */

export type Tone = 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'yellow' | 'pink';

export interface IntroCard {
  say: string;
  visual?: VisualSpec;
  tokens?: Token[];
}

export interface LessonDef {
  id: string;
  number: number;
  title: string;
  /** "I can ..." statement shown before and after the lesson. */
  goal: string;
  level: LevelId;
  tone: Tone;
  icon: IconName;
  skills: SkillId[];
  intro: IntroCard[];
  examples: ProblemRequest[];
  practice: ProblemRequest[];
  /** Practice topic for "Practise more". */
  topic: string;
}

export interface UnitDef {
  id: string;
  title: string;
  subtitle: string;
  tone: Tone;
  lessons: LessonDef[];
}

type Extra = Omit<Partial<ProblemRequest>, 'skill' | 'level'>;
const q = (skill: SkillId, level: LevelId, extra: Extra = {}): ProblemRequest => ({ skill, level, ...extra });
const fixed = (a: number, b: number, visual?: VisualKind): Extra => ({ constraints: { fixed: { a, b } }, visual });
const pos = { minOperand: 1 };

const blankEq = (...parts: (number | '+' | '-' | '□')[]): Token[] =>
  parts.flatMap((p, i) => {
    const t = p === '□' ? tok.blank() : p === '+' || p === '-' ? tok.op(p) : tok.num(p);
    return i === parts.length - 2 ? [t, tok.eq()] : [t];
  });

// ---------------------------------------------------------------- Unit A: adding

const addWithin5: LessonDef = {
  id: 'add-5',
  number: 1,
  title: 'Adding within 5',
  goal: 'I can put two groups together and find how many.',
  level: 1,
  tone: 'blue',
  icon: 'plus',
  skills: ['add.result'],
  topic: 'addition',
  intro: [
    { say: 'Adding means putting groups together.', visual: joinCounters(2, 1), tokens: factTokens(f('+', 2, 1)) },
    {
      say: 'To find how many altogether, start at the first number and count on.',
      visual: { ...joinCounters(3, 2), numbered: true, numberFrom: 3 },
      tokens: factTokens(f('+', 3, 2)),
    },
  ],
  examples: [
    q('add.result', 1, fixed(2, 1, 'counters')),
    q('add.result', 1, { visual: 'counters', constraints: pos }),
    q('add.result', 1, { visual: 'numberline', constraints: pos }),
    q('add.result', 1, { visual: 'counters', constraints: { ...pos, minWhole: 4 } }),
    q('add.result', 1, { visual: 'numberline', constraints: { minWhole: 3 } }),
  ],
  practice: [
    q('add.result', 1, { constraints: { ...pos, maxWhole: 4 } }),
    q('add.result', 1, { constraints: pos }),
    q('add.result', 1, { constraints: { ...pos, minWhole: 4 } }),
    q('add.result', 1, { constraints: pos }),
    q('add.result', 1),
  ],
};

const addWithin10: LessonDef = {
  id: 'add-10',
  number: 2,
  title: 'Adding within 10',
  goal: 'I can add two numbers up to 10.',
  level: 2,
  tone: 'blue',
  icon: 'plus',
  skills: ['add.result', 'add.result_left'],
  topic: 'addition',
  intro: [
    {
      say: 'Start with the bigger number, then count on.',
      visual: { type: 'counters', groups: [{ count: 6, color: 'orange', label: '6' }, { count: 2, color: 'blue', label: '2' }], numbered: true, numberFrom: 6 },
      tokens: factTokens(f('+', 6, 2)),
    },
    { say: 'A number line helps us count on. Each jump is 1 more.', visual: numberLine(4, 3), tokens: factTokens(f('+', 4, 3)) },
    { say: 'The = sign means both sides are the same. So 7 = 4 + 3 is true too!', tokens: [tok.num(7), tok.eq(), tok.num(4), tok.op('+'), tok.num(3)] },
  ],
  examples: [
    q('add.result', 2, fixed(4, 3, 'counters')),
    q('add.result', 2, { visual: 'numberline', constraints: { ...pos, minWhole: 6 } }),
    q('add.result', 2, fixed(2, 6, 'counters')),
    q('add.result_left', 2, { visual: 'numberline', constraints: pos }),
    q('add.result', 2, { visual: 'counters', constraints: { ...pos, minWhole: 8 } }),
  ],
  practice: [
    q('add.result', 2, { constraints: { ...pos, minWhole: 5 } }),
    q('add.result', 2, { constraints: pos }),
    q('add.result_left', 2, { constraints: pos }),
    q('add.result', 2, { constraints: { ...pos, minWhole: 7 } }),
    q('add.result', 2),
  ],
};

// ---------------------------------------------------------------- Unit B: taking away

const subWithin5: LessonDef = {
  id: 'sub-5',
  number: 3,
  title: 'Subtracting within 5',
  goal: 'I can take away and count what is left.',
  level: 1,
  tone: 'orange',
  icon: 'minus',
  skills: ['sub.result'],
  topic: 'subtraction',
  intro: [
    { say: 'Subtracting means taking some away. Then we count what is left.', visual: takeAwayCounters(5, 2, 2, true), tokens: factTokens(f('-', 5, 2)) },
    { say: 'The − sign means take away.', tokens: [tok.num(4), tok.op('-'), tok.num(1)] },
  ],
  examples: [
    q('sub.result', 1, fixed(5, 2, 'counters')),
    q('sub.result', 1, { visual: 'counters', constraints: pos }),
    q('sub.result', 1, { visual: 'numberline', constraints: pos }),
    q('sub.result', 1, { visual: 'counters', constraints: { ...pos, minWhole: 4 } }),
    q('sub.result', 1, { visual: 'numberline' }),
  ],
  practice: [
    q('sub.result', 1, { constraints: pos }),
    q('sub.result', 1, { constraints: { ...pos, minWhole: 4 } }),
    q('sub.result', 1, { constraints: pos }),
    q('sub.result', 1, { constraints: pos }),
    q('sub.result', 1),
  ],
};

const subWithin10: LessonDef = {
  id: 'sub-10',
  number: 4,
  title: 'Subtracting within 10',
  goal: 'I can take away from numbers up to 10, and check with adding.',
  level: 2,
  tone: 'orange',
  icon: 'minus',
  skills: ['sub.result', 'sub.result_left'],
  topic: 'subtraction',
  intro: [
    { say: 'We can count back on a number line.', visual: numberLine(9, -3), tokens: factTokens(f('-', 9, 3)) },
    { say: 'Adding checks taking away. 6 + 3 = 9, so 9 − 3 = 6 is right.', tokens: factTokens(f('+', 6, 3)) },
  ],
  examples: [
    q('sub.result', 2, fixed(9, 4, 'counters')),
    q('sub.result', 2, { visual: 'numberline', constraints: { ...pos, minWhole: 7 } }),
    q('sub.result', 2, { visual: 'counters', constraints: pos }),
    q('sub.result_left', 2, { visual: 'numberline', constraints: pos }),
    q('sub.result', 2, { visual: 'counters', constraints: { ...pos, minWhole: 8 } }),
  ],
  practice: [
    q('sub.result', 2, { constraints: pos }),
    q('sub.result', 2, { constraints: { ...pos, minWhole: 7 } }),
    q('sub.result_left', 2, { constraints: pos }),
    q('sub.result', 2, { constraints: pos }),
    q('sub.result', 2),
  ],
};

// ---------------------------------------------------------------- Unit C: bonds and missing numbers

const bonds: LessonDef = {
  id: 'bonds',
  number: 5,
  title: 'Number bonds',
  goal: 'I can find the missing part of a whole.',
  level: 2,
  tone: 'green',
  icon: 'sparkle',
  skills: ['bond.part'],
  topic: 'bonds',
  intro: [
    { say: 'A number bond shows a whole and its two parts.', visual: bond(7, [3, 4]) },
    { say: 'The two parts make the whole. 3 and 4 make 7.', visual: partWholeCounters(3, 4, true, true), tokens: factTokens(f('+', 3, 4)) },
  ],
  examples: [
    q('bond.part', 2, fixed(3, 4)),
    q('bond.part', 2, { constraints: { minWhole: 5, maxWhole: 8 } }),
    q('bond.part', 2, { constraints: { minWhole: 6 } }),
    q('bond.part', 2, { constraints: { minWhole: 8 } }),
    q('bond.part', 2),
  ],
  practice: [q('bond.part', 2), q('bond.part', 2), q('bond.part', 2, { constraints: { minWhole: 7 } }), q('bond.part', 2), q('bond.part', 2)],
};

const missingAddFirst: LessonDef = {
  id: 'missing-add-first',
  number: 6,
  title: 'Missing number: □ + 3 = 5',
  goal: 'I can find the missing first number in an addition.',
  level: 2,
  tone: 'green',
  icon: 'search',
  skills: ['add.missing_first'],
  topic: 'missing-add',
  intro: [
    { say: 'The box stands for a number we do not know yet.', tokens: blankEq('□', '+', 3, 5) },
    { say: '5 is the whole. 3 is one part. The box is the other part.', visual: partWholeBar(2, 3, { p1: false }) },
  ],
  examples: [
    q('add.missing_first', 2, fixed(2, 3, 'counters')),
    q('add.missing_first', 2, { visual: 'bar', constraints: pos }),
    q('add.missing_first', 2, { visual: 'counters', constraints: pos }),
    q('add.missing_first', 2, { visual: 'bar', constraints: { ...pos, minWhole: 7 } }),
    q('add.missing_first', 2, { visual: 'counters', constraints: pos }),
  ],
  practice: [
    q('add.missing_first', 2, fixed(3, 4)),
    q('add.missing_first', 2, { constraints: pos }),
    q('add.missing_first', 2, { constraints: pos }),
    q('add.missing_first', 2, { constraints: { ...pos, minWhole: 7 } }),
    q('add.missing_first', 2),
  ],
};

const missingAddSecond: LessonDef = {
  id: 'missing-add-second',
  number: 7,
  title: 'Missing number: 5 + □ = 8',
  goal: 'I can find how many more are needed.',
  level: 2,
  tone: 'green',
  icon: 'search',
  skills: ['add.missing_second'],
  topic: 'missing-add',
  intro: [
    { say: 'Start at 5. How many jumps to get to 8?', visual: { ...numberLine(5, 3), marks: [5, 8] }, tokens: blankEq(5, '+', '□', 8) },
    { say: 'We can also take away: 8 − 5 = 3.', tokens: factTokens(f('-', 8, 5)) },
  ],
  examples: [
    q('add.missing_second', 2, fixed(5, 3, 'numberline')),
    q('add.missing_second', 2, { visual: 'counters', constraints: pos }),
    q('add.missing_second', 2, { visual: 'numberline', constraints: pos }),
    q('add.missing_second', 2, { visual: 'counters', constraints: { ...pos, minWhole: 7 } }),
    q('add.missing_second', 2, { visual: 'numberline', constraints: pos }),
  ],
  practice: [
    q('add.missing_second', 2, { constraints: pos }),
    q('add.missing_second', 2, { constraints: pos }),
    q('add.missing_second', 2, { constraints: { ...pos, minWhole: 7 } }),
    q('add.missing_second', 2, { constraints: pos }),
    q('add.missing_second', 2),
  ],
};

const missingSubFirst: LessonDef = {
  id: 'missing-sub-first',
  number: 8,
  title: 'Missing number: □ − 2 = 6',
  goal: 'I can find the number we started with.',
  level: 2,
  tone: 'green',
  icon: 'search',
  skills: ['sub.missing_first'],
  topic: 'missing-sub',
  intro: [
    { say: 'Something take away 2 leaves 6. What did we start with?', tokens: blankEq('□', '-', 2, 6) },
    {
      say: 'Put back what was taken away: 6 + 2 = 8.',
      visual: { type: 'counters', groups: [{ count: 6, color: 'blue', label: '6 left' }, { count: 2, color: 'orange', crossed: 2, label: '2 gone' }] },
      tokens: factTokens(f('+', 6, 2)),
    },
  ],
  examples: [
    q('sub.missing_first', 2, fixed(8, 2, 'counters')),
    q('sub.missing_first', 2, { visual: 'bar', constraints: pos }),
    q('sub.missing_first', 2, { visual: 'counters', constraints: pos }),
    q('sub.missing_first', 2, { visual: 'bar', constraints: { ...pos, minWhole: 7 } }),
    q('sub.missing_first', 2, { visual: 'counters', constraints: pos }),
  ],
  practice: [
    q('sub.missing_first', 2, { constraints: pos }),
    q('sub.missing_first', 2, { constraints: pos }),
    q('sub.missing_first', 2, { constraints: { ...pos, minWhole: 7 } }),
    q('sub.missing_first', 2, { constraints: pos }),
    q('sub.missing_first', 2),
  ],
};

const missingSubSecond: LessonDef = {
  id: 'missing-sub-second',
  number: 9,
  title: 'Missing number: 9 − □ = 4',
  goal: 'I can find how many were taken away.',
  level: 2,
  tone: 'green',
  icon: 'search',
  skills: ['sub.missing_second'],
  topic: 'missing-sub',
  intro: [
    {
      say: 'We start with 9. Some are taken away. 4 are left.',
      visual: { type: 'counters', groups: [{ count: 4, color: 'blue', label: '4 left' }, { count: 5, color: 'orange', label: '?' }] },
      tokens: blankEq(9, '-', '□', 4),
    },
    {
      say: 'Cross out until 4 are left. Count the crossed ones: 5.',
      visual: { type: 'counters', groups: [{ count: 4, color: 'blue', label: '4 left' }, { count: 5, color: 'orange', crossed: 5, label: '5' }] },
      tokens: factTokens(f('-', 9, 5)),
    },
  ],
  examples: [
    q('sub.missing_second', 2, fixed(9, 5, 'counters')),
    q('sub.missing_second', 2, { visual: 'bar', constraints: pos }),
    q('sub.missing_second', 2, { visual: 'counters', constraints: pos }),
    q('sub.missing_second', 2, { visual: 'bar', constraints: { ...pos, minWhole: 7 } }),
    q('sub.missing_second', 2, { visual: 'counters', constraints: pos }),
  ],
  practice: [
    q('sub.missing_second', 2, fixed(7, 5)),
    q('sub.missing_second', 2, { constraints: pos }),
    q('sub.missing_second', 2, { constraints: pos }),
    q('sub.missing_second', 2, { constraints: { ...pos, minWhole: 7 } }),
    q('sub.missing_second', 2),
  ],
};

// ---------------------------------------------------------------- Unit D: stories

const storiesAdd: LessonDef = {
  id: 'stories-add',
  number: 10,
  title: 'Addition stories',
  goal: 'I can solve stories where we put together or get more.',
  level: 2,
  tone: 'purple',
  icon: 'story',
  skills: ['word.add'],
  topic: 'stories-add',
  intro: [
    { say: 'In some stories, more things join in. We add to find how many now.', visual: partWholeBar(4, 3, { whole: false }, { p1: 'at first', p2: 'more' }) },
    { say: 'In other stories, two groups are put together. We add to find the whole.', visual: partWholeBar(5, 4, { whole: false }) },
  ],
  examples: [
    q('word.add', 2, { ...fixed(4, 3), variant: 'join.result' }),
    q('word.add', 2, { variant: 'combine.whole' }),
    q('word.add', 2, { variant: 'join.result' }),
    q('word.add', 2, { variant: 'compare.more' }),
    q('word.add', 2, { variant: 'combine.whole' }),
  ],
  practice: [q('word.add', 2), q('word.add', 2), q('word.add', 2), q('word.add', 2), q('word.add', 2)],
};

const storiesSub: LessonDef = {
  id: 'stories-sub',
  number: 11,
  title: 'Subtraction stories',
  goal: 'I can solve stories where things are taken away.',
  level: 2,
  tone: 'purple',
  icon: 'story',
  skills: ['word.sub'],
  topic: 'stories-sub',
  intro: [
    { say: 'In some stories, things are taken away. We subtract to find what is left.', visual: partWholeBar(6, 3, { p1: false }, { p1: 'left', p2: 'gone', whole: 'at first' }) },
    { say: 'If we know the whole and one part, we subtract to find the other part.', visual: partWholeBar(5, 4, { p2: false }) },
  ],
  examples: [
    q('word.sub', 2, { ...fixed(9, 3), variant: 'separate.result' }),
    q('word.sub', 2, { variant: 'combine.part' }),
    q('word.sub', 2, { variant: 'separate.result' }),
    q('word.sub', 2, { variant: 'compare.fewer' }),
    q('word.sub', 2, { variant: 'separate.result' }),
  ],
  practice: [q('word.sub', 2), q('word.sub', 2), q('word.sub', 2), q('word.sub', 2), q('word.sub', 2)],
};

const storiesChoose: LessonDef = {
  id: 'stories-choose',
  number: 12,
  title: 'Add or subtract?',
  goal: 'I can decide whether a story needs + or −.',
  level: 2,
  tone: 'purple',
  icon: 'shuffle',
  skills: ['word.choose'],
  topic: 'stories-choose',
  intro: [
    { say: 'Ask yourself: are we finding the whole? Then we add.', visual: partWholeBar(5, 3, { whole: false }) },
    { say: 'Are we finding a part, or what is left? Then we subtract.', visual: partWholeBar(5, 3, { p2: false }) },
  ],
  examples: [
    q('word.choose', 2, { ...fixed(5, 3), variant: 'join.result' }),
    q('word.choose', 2, { variant: 'separate.result' }),
    q('word.choose', 2, { variant: 'combine.whole' }),
    q('word.choose', 2, { variant: 'compare.difference' }),
    q('word.choose', 2, { variant: 'separate.result' }),
  ],
  practice: [q('word.choose', 2), q('word.choose', 2), q('word.choose', 2), q('word.choose', 2), q('word.choose', 2)],
};

const storiesBuild: LessonDef = {
  id: 'stories-build',
  number: 13,
  title: 'Writing equations from stories',
  goal: 'I can write an equation for a story and solve it.',
  level: 2,
  tone: 'purple',
  icon: 'pencil',
  skills: ['word.build'],
  topic: 'stories-build',
  intro: [
    { say: 'Step 1: find the numbers in the story.' },
    { say: 'Step 2: decide. Do we put together (+) or take away (−)?' },
    { say: 'Step 3: write the equation. Step 4: solve it!', tokens: blankEq(8, '-', 3, '□') },
  ],
  examples: [
    q('word.build', 2, { ...fixed(8, 3), variant: 'separate.result' }),
    q('word.build', 2, { variant: 'join.result' }),
    q('word.build', 2, { variant: 'combine.whole' }),
    q('word.build', 2, { variant: 'separate.result' }),
    q('word.build', 2, { variant: 'join.change' }),
  ],
  practice: [q('word.build', 2), q('word.build', 2), q('word.build', 2), q('word.build', 2), q('word.build', 2)],
};

// ---------------------------------------------------------------- Unit E: comparing and equality

const comparing: LessonDef = {
  id: 'compare',
  number: 14,
  title: 'Comparing two amounts',
  goal: 'I can find how many more or how many fewer.',
  level: 2,
  tone: 'teal',
  icon: 'chart',
  skills: ['word.compare', 'compare.expr'],
  topic: 'stories-compare',
  intro: [
    { say: 'To compare, line up the two amounts. The extra part is the difference.', visual: compareBar(8, 5, { diff: false }, ['Tom', 'Lily']) },
    { say: 'We find the difference by subtracting: 8 − 5 = 3.', tokens: factTokens(f('-', 8, 5)) },
  ],
  examples: [
    q('word.compare', 2, { ...fixed(8, 5), variant: 'compare.difference' }),
    q('word.compare', 2, { variant: 'compare.more' }),
    q('word.compare', 2, { variant: 'compare.fewer' }),
    q('compare.expr', 2),
    q('word.compare', 2, { variant: 'compare.difference' }),
  ],
  practice: [q('word.compare', 2), q('compare.expr', 2), q('word.compare', 2), q('compare.expr', 2), q('word.compare', 2)],
};

const mixed: LessonDef = {
  id: 'mixed',
  number: 15,
  title: 'Mixed adding and taking away',
  goal: 'I can look at the sign and choose what to do.',
  level: 2,
  tone: 'teal',
  icon: 'shuffle',
  skills: ['add.result', 'sub.result', 'truefalse'],
  topic: 'true-false',
  intro: [
    { say: 'Look at the sign before you start. + means add. − means take away.', tokens: [tok.num(6), tok.op('+'), tok.num(2), tok.text('and'), tok.num(6), tok.op('-'), tok.num(2)] },
  ],
  examples: [
    q('add.result', 2, { constraints: pos }),
    q('sub.result', 2, { constraints: pos }),
    q('add.missing_first', 2, { constraints: pos }),
    q('sub.missing_second', 2, { constraints: pos }),
    q('truefalse', 2),
  ],
  practice: [q('sub.result', 2), q('add.result', 2), q('truefalse', 2), q('add.missing_second', 2), q('sub.missing_first', 2)],
};

const equality: LessonDef = {
  id: 'equality',
  number: 16,
  title: 'Equality and balancing',
  goal: 'I know = means both sides have the same value.',
  level: 2,
  tone: 'teal',
  icon: 'scale',
  skills: ['equality.balance'],
  topic: 'balance',
  intro: [
    { say: 'The = sign means both sides have the same value, like a balanced scale.', visual: balance(binary(3, '+', 2), single(5)) },
    { say: '3 + 2 and 4 + 1 are both 5. So 3 + 2 = 4 + 1 is true.', visual: balance(binary(3, '+', 2), binary(4, '+', 1)) },
  ],
  examples: [
    q('equality.balance', 2),
    q('equality.balance', 2),
    q('add.result_left', 2, { constraints: pos }),
    q('equality.balance', 2),
    q('equality.balance', 2),
  ],
  practice: [q('equality.balance', 2), q('equality.balance', 2), q('equality.balance', 2), q('equality.balance', 2), q('equality.balance', 2)],
};

export const UNITS: readonly UnitDef[] = [
  { id: 'A', title: 'Adding', subtitle: 'Putting together', tone: 'blue', lessons: [addWithin5, addWithin10] },
  { id: 'B', title: 'Taking away', subtitle: 'Subtraction', tone: 'orange', lessons: [subWithin5, subWithin10] },
  {
    id: 'C',
    title: 'Missing numbers',
    subtitle: 'Parts and wholes',
    tone: 'green',
    lessons: [bonds, missingAddFirst, missingAddSecond, missingSubFirst, missingSubSecond],
  },
  { id: 'D', title: 'Story problems', subtitle: 'Think, write, solve', tone: 'purple', lessons: [storiesAdd, storiesSub, storiesChoose, storiesBuild] },
  { id: 'E', title: 'Comparing and =', subtitle: 'Reasoning with numbers', tone: 'teal', lessons: [comparing, mixed, equality] },
];

export const LESSONS: readonly LessonDef[] = UNITS.flatMap((u) => u.lessons);

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);

export const unitOf = (lesson: LessonDef) => UNITS.find((u) => u.lessons.includes(lesson))!;

export function nextLesson(lesson: LessonDef): LessonDef | undefined {
  return LESSONS[LESSONS.indexOf(lesson) + 1];
}
