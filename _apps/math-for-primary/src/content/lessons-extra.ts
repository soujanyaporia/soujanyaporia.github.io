import { factTokens, tok } from '../engine/equation';
import { bond, compareBar, familyVisual, joinCounters, partWholeBar } from '../engine/explain/visuals';
import { makeFact as f } from '../engine/levels';
import type { ProblemRequest } from '../engine/skills';
import type { LevelId, SkillId, Token, VisualKind } from '../engine/types';
import type { LessonContent } from '../curriculum/types';

/** New addition, subtraction and story lessons for the upgraded path. */

type Extra = Omit<Partial<ProblemRequest>, 'skill' | 'level'>;
export const q = (skill: SkillId, level: LevelId, extra: Extra = {}): ProblemRequest => ({ skill, level, ...extra });
export const fixed = (a: number, b: number, visual?: VisualKind): Extra => ({ constraints: { fixed: { a, b } }, visual });
export const times = (n: number, req: ProblemRequest): ProblemRequest[] => Array.from({ length: n }, () => ({ ...req }));

export const blankEq = (...parts: (number | '+' | '-' | '*' | '/' | '□')[]): Token[] =>
  parts.flatMap((p, i) => {
    const t = p === '□' ? tok.blank() : typeof p === 'number' ? tok.num(p) : tok.op(p);
    return i === parts.length - 2 ? [t, tok.eq()] : [t];
  });

const bridge = { constraints: { regroup: 'require' as const, maxA: 9, maxB: 9 } };

export const addWithin20: LessonContent = {
  id: 'add-20',
  title: 'Make 10 to add',
  goal: 'I can add past 10 by making 10 first.',
  level: 3,
  icon: 'plus',
  skills: ['add.result'],
  topic: 'addition',
  intro: [
    { say: 'To add 8 + 5, make 10 first. 8 needs 2 more to make 10.', visual: { ...joinCounters(8, 5), layout: 'frame' } },
    { say: 'Split 5 into 2 and 3. 8 + 2 = 10, then 10 + 3 = 13.', visual: bond(5, [2, 3]), tokens: factTokens(f('+', 8, 5)) },
  ],
  examples: [q('add.result', 3, fixed(8, 5, 'counters')), q('add.result', 3, fixed(9, 4)), q('add.result', 3, bridge), q('add.result', 3, fixed(7, 7)), q('add.result', 3, bridge)],
  practice: [...times(4, q('add.result', 3, bridge)), q('add.result', 3)],
};

export const subInverse: LessonContent = {
  id: 'sub-think-add',
  title: 'Think addition to subtract',
  goal: 'I can use an addition fact to take away.',
  level: 2,
  icon: 'refresh',
  skills: ['sub.inverse'],
  topic: 'subtraction',
  intro: [
    { say: 'Adding and taking away are a family. 3, 4 and 7 make four facts.', visual: familyVisual('add', [3, 4], 7) },
    { say: 'To find 7 − 3, think: 3 + what makes 7? It is 4!', tokens: factTokens(f('-', 7, 3)) },
  ],
  examples: [q('sub.inverse', 2, fixed(7, 3)), ...times(4, q('sub.inverse', 2, { constraints: { minOperand: 1 } }))],
  practice: times(5, q('sub.inverse', 2, { constraints: { minOperand: 1 } })),
};

export const subWithin20: LessonContent = {
  id: 'sub-20',
  title: 'Take away through 10',
  goal: 'I can take away past 10 by stopping at 10.',
  level: 3,
  icon: 'minus',
  skills: ['sub.result'],
  topic: 'subtraction',
  intro: [
    {
      say: 'To take 5 from 13, first take 3 to get to 10.',
      visual: { type: 'numberline', min: 0, max: 20, start: 13, jumps: [-3, -2], jumpLabels: true, marks: [13, 10] },
    },
    { say: 'Then take the other 2: 10 − 2 = 8. So 13 − 5 = 8.', tokens: factTokens(f('-', 13, 5)) },
  ],
  examples: [q('sub.result', 3, fixed(13, 5, 'numberline')), q('sub.result', 3, fixed(15, 7)), ...times(3, q('sub.result', 3, { constraints: { regroup: 'require', maxB: 9, maxWhole: 19 } }))],
  practice: [...times(4, q('sub.result', 3, { constraints: { regroup: 'require', maxB: 9, maxWhole: 19 } })), q('sub.result', 3)],
};

export const storyWhat: LessonContent = {
  id: 'story-what',
  title: "What's happening?",
  goal: 'I can say what happens in a story before I calculate.',
  level: 2,
  icon: 'eye',
  skills: ['word.action'],
  topic: 'stories-translate',
  intro: [
    { say: 'Before choosing + or −, ask: what is happening in the story?' },
    { say: 'Did more join? Did some go away? Are there two parts? Are we comparing?', visual: partWholeBar(4, 3, { whole: false }, { p1: 'at first', p2: 'joined' }) },
  ],
  examples: [
    q('word.action', 2, { ...fixed(4, 3), variant: 'join.result' }),
    q('word.action', 2, { variant: 'separate.result' }),
    q('word.action', 2, { variant: 'combine.whole' }),
    q('word.action', 2, { variant: 'compare.difference' }),
    q('word.action', 2, { variant: 'join.start' }),
  ],
  practice: times(5, q('word.action', 2)),
};

export const storyMystery: LessonContent = {
  id: 'story-mystery',
  title: 'Mystery start: □ + 4 = 9',
  goal: 'I can write what the story says, then find the unknown.',
  level: 2,
  icon: 'search',
  skills: ['word.translate'],
  topic: 'stories-translate',
  intro: [
    { say: 'Ryan had some marbles. His friend gave him 4 more. Now he has 9.', tokens: blankEq('□', '+', 4, 9) },
    { say: 'First write what the story says: □ + 4 = 9. Then undo the + 4: 9 − 4 = 5.', tokens: factTokens(f('-', 9, 4)) },
  ],
  examples: [
    q('word.translate', 2, { ...fixed(5, 4), variant: 'join.start' }),
    q('word.translate', 2, { variant: 'join.change' }),
    q('word.translate', 2, { variant: 'separate.change' }),
    q('word.translate', 2, { variant: 'separate.start' }),
    q('word.translate', 2, { variant: 'join.start' }),
  ],
  practice: [
    q('word.translate', 2, { variant: 'join.start' }),
    q('word.translate', 2, { variant: 'join.change' }),
    q('word.translate', 2, { variant: 'separate.change' }),
    q('word.translate', 2, { variant: 'separate.start' }),
    q('word.translate', 2),
  ],
};

export const trickyWords: LessonContent = {
  id: 'tricky-words',
  title: 'Tricky words: more and fewer',
  goal: 'I can tell who has more, even when the words are tricky.',
  level: 2,
  icon: 'bulb',
  skills: ['word.tricky'],
  topic: 'stories-tricky',
  intro: [
    { say: '"Fewer" does not always mean take away. First find who has more.', visual: compareBar(7, 4, { big: false }, ['Tim', 'Sarah'], false) },
    { say: 'Sarah has 4. She has 3 fewer than Tim. So Tim has more: 4 + 3 = 7.', tokens: factTokens(f('+', 4, 3)) },
  ],
  examples: [
    q('word.tricky', 2, { ...fixed(4, 3), variant: 'compare.fewer_ref' }),
    q('word.tricky', 2, { variant: 'compare.more_ref' }),
    q('word.tricky', 2, { variant: 'compare.fewer' }),
    q('word.tricky', 2, { variant: 'compare.more_ref' }),
    q('word.tricky', 2, { variant: 'compare.fewer_ref' }),
  ],
  practice: times(5, q('word.tricky', 2)),
};

export const EXTRA_LESSONS = [addWithin20, subInverse, subWithin20, storyWhat, storyMystery, trickyWords];
