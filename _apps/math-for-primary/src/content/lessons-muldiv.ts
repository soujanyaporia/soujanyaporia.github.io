import { factTokens, tok } from '../engine/equation';
import { arrayVisual, compareBar, familyVisual, groupingVisual, groupsVisual, shareVisual, skipLine } from '../engine/explain/visuals';
import { makeFact as f } from '../engine/levels';
import type { Token } from '../engine/types';
import type { LessonContent } from '../curriculum/types';
import { fixed, q, times } from './lessons-extra';

/** Multiplication, division and "all four operations" story lessons. */

const repeatedTokens = (n: number, count: number, total: number): Token[] => [
  ...Array.from({ length: count }, (_, i) => (i === 0 ? [tok.num(n)] : [tok.op('+'), tok.num(n)])).flat(),
  tok.eq(),
  tok.num(total),
];

export const mulGroups: LessonContent = {
  id: 'mul-groups',
  title: 'Equal groups',
  goal: 'I can find how many are in equal groups.',
  level: 2,
  icon: 'grid',
  skills: ['mul.groups'],
  topic: 'mul-groups',
  intro: [
    { say: 'Equal groups have the same number in each group.', visual: groupsVisual(3, 4, { item: 'apple', filled: 3, sizes: true }) },
    { say: '3 groups of 4 is written 3 × 4. We say "3 times 4".', tokens: [tok.num(3), tok.op('*'), tok.num(4)] },
  ],
  examples: [q('mul.groups', 2, fixed(3, 4)), ...times(4, q('mul.groups', 2))],
  practice: times(5, q('mul.groups', 2)),
};

export const mulRepeated: LessonContent = {
  id: 'mul-repeated',
  title: 'Adding equal groups',
  goal: 'I know adding equal groups is multiplying.',
  level: 2,
  icon: 'plus',
  skills: ['mul.repeated'],
  topic: 'mul-groups',
  intro: [
    { say: '4 + 4 + 4 adds the same number again and again.', visual: groupsVisual(3, 4, { item: 'strawberry', filled: 3, totals: true }), tokens: repeatedTokens(4, 3, 12) },
    { say: 'Three 4s is 3 × 4. So 4 + 4 + 4 = 3 × 4 = 12.', tokens: factTokens(f('*', 3, 4)) },
  ],
  examples: [
    q('mul.repeated', 2, { ...fixed(3, 4), variant: 'total' }),
    q('mul.repeated', 2, { variant: 'times' }),
    q('mul.repeated', 2, { variant: 'size' }),
    q('mul.repeated', 2, { variant: 'total' }),
    q('mul.repeated', 2, { variant: 'times' }),
  ],
  practice: times(5, q('mul.repeated', 2)),
};

export const mulArrays: LessonContent = {
  id: 'mul-arrays',
  title: 'Arrays',
  goal: 'I can use rows and columns to multiply.',
  level: 2,
  icon: 'grid',
  skills: ['mul.array'],
  topic: 'mul-groups',
  intro: [
    { say: 'An array has rows with the same number in each row.', visual: arrayVisual(3, 4) },
    { say: '3 rows of 4 is 3 × 4 = 12.', tokens: factTokens(f('*', 3, 4)) },
  ],
  examples: [q('mul.array', 2, fixed(3, 4)), ...times(4, q('mul.array', 2))],
  practice: [...times(3, q('mul.array', 2)), ...times(2, q('mul.array', 3))],
};

export const mulTurnaround: LessonContent = {
  id: 'mul-turnaround',
  title: 'Turn it around',
  goal: 'I know 3 × 4 is the same as 4 × 3.',
  level: 3,
  icon: 'refresh',
  skills: ['mul.turnaround'],
  topic: 'mul-facts',
  intro: [
    { say: 'Turn an array around and it still has the same number of dots.', visual: arrayVisual(3, 4, { turned: true }) },
    { say: 'So 3 × 4 = 4 × 3. Both are 12!', tokens: [tok.num(3), tok.op('*'), tok.num(4), tok.eq(), tok.num(4), tok.op('*'), tok.num(3)] },
  ],
  examples: [q('mul.turnaround', 3, fixed(3, 4)), ...times(4, q('mul.turnaround', 3))],
  practice: times(5, q('mul.turnaround', 3)),
};

export const mulFacts: LessonContent = {
  id: 'mul-facts',
  title: 'Times tables: 2, 5 and 10',
  goal: 'I can use skip counting for the 2, 5 and 10 times tables.',
  level: 3,
  icon: 'bolt',
  skills: ['mul.result'],
  topic: 'mul-facts',
  intro: [
    { say: 'Skip counting helps with times tables. Count in 5s: 5, 10, 15, 20.', visual: skipLine(5, 4) },
    { say: 'Four jumps of 5 is 20, so 4 × 5 = 20. Counting in 2s and 10s works the same way.', tokens: factTokens(f('*', 4, 5)) },
  ],
  examples: [
    q('mul.result', 3, { constraints: { table: 2 }, visual: 'numberline' }),
    q('mul.result', 3, { constraints: { table: 5 } }),
    q('mul.result', 3, { constraints: { table: 10 } }),
    q('mul.result', 3, { constraints: { table: 2 } }),
    q('mul.result', 3, { constraints: { table: 5 } }),
  ],
  practice: [
    q('mul.result', 3, { constraints: { table: 2 } }),
    q('mul.result', 3, { constraints: { table: 5 } }),
    q('mul.result', 3, { constraints: { table: 10 } }),
    q('mul.result', 3, { constraints: { table: 5 } }),
    q('mul.result', 3, { constraints: { table: 2 } }),
  ],
};

export const mulStories: LessonContent = {
  id: 'mul-stories',
  title: 'Multiplication stories',
  goal: 'I can spot equal groups in a story.',
  level: 3,
  icon: 'story',
  skills: ['word.mul'],
  topic: 'stories-mul',
  intro: [
    { say: 'Look for equal groups: how many groups, and how many in each?', visual: groupsVisual(4, 5, { item: 'person', filled: 4, sizes: true }) },
    { say: '4 tables with 5 children at each table is 4 × 5.', tokens: factTokens(f('*', 4, 5)) },
  ],
  examples: [
    q('word.mul', 3, { ...fixed(4, 5), variant: 'groups.total' }),
    q('word.mul', 3, { variant: 'array.total' }),
    q('word.mul', 3, { variant: 'rate.total' }),
    q('word.mul', 3, { variant: 'groups.total' }),
    q('word.mul', 3, { variant: 'array.total' }),
  ],
  practice: times(5, q('word.mul', 3)),
};

export const divSharing: LessonContent = {
  id: 'div-sharing',
  title: 'Sharing equally',
  goal: 'I can share things equally and write it with ÷.',
  level: 2,
  icon: 'share',
  skills: ['div.sharing'],
  topic: 'div',
  intro: [
    { say: 'Sharing equally means everyone gets the same.', visual: shareVisual(12, 3, 12, 'strawberry') },
    { say: '12 shared between 3 is 4 each. We write 12 ÷ 3 = 4.', tokens: factTokens(f('/', 12, 3)) },
  ],
  examples: [q('div.sharing', 2, fixed(12, 3)), ...times(4, q('div.sharing', 2))],
  practice: times(5, q('div.sharing', 2)),
};

export const divGrouping: LessonContent = {
  id: 'div-grouping',
  title: 'Making equal groups',
  goal: 'I can find how many groups I can make.',
  level: 2,
  icon: 'grid',
  skills: ['div.grouping'],
  topic: 'div',
  intro: [
    { say: 'Another kind of division: put things into groups of the same size.', visual: groupingVisual(12, 4, 3, 'strawberry') },
    { say: '12 in groups of 4 makes 3 groups. 12 ÷ 4 = 3.', tokens: factTokens(f('/', 12, 4)) },
  ],
  examples: [q('div.grouping', 2, fixed(12, 4)), ...times(4, q('div.grouping', 2))],
  practice: times(5, q('div.grouping', 2)),
};

export const divInverse: LessonContent = {
  id: 'div-inverse',
  title: '× and ÷ are a family',
  goal: 'I can use a times fact to divide.',
  level: 3,
  icon: 'refresh',
  skills: ['div.inverse'],
  topic: 'div-facts',
  intro: [
    { say: '3, 4 and 12 make a fact family: two × facts and two ÷ facts.', visual: familyVisual('mul', [3, 4], 12) },
    { say: 'If 3 × 4 = 12, then 12 ÷ 4 = 3 and 12 ÷ 3 = 4.', tokens: factTokens(f('/', 12, 3)) },
  ],
  examples: [q('div.inverse', 3, fixed(12, 3)), ...times(4, q('div.inverse', 3))],
  practice: times(5, q('div.inverse', 3)),
};

export const mulMissing: LessonContent = {
  id: 'mul-missing',
  title: 'Missing factor: 4 × □ = 24',
  goal: 'I can find a missing number in a times fact.',
  level: 3,
  icon: 'search',
  skills: ['mul.missing'],
  topic: 'mul-facts',
  intro: [
    { say: '4 boxes have the same number of pencils. There are 24 altogether.', visual: groupsVisual(4, 6, { item: 'pencil', filled: 4, hideSize: true }) },
    { say: 'Write it: 4 × □ = 24. Undo × 4 by dividing: 24 ÷ 4 = 6.', tokens: factTokens(f('/', 24, 4)) },
  ],
  examples: [q('mul.missing', 3, fixed(4, 6)), ...times(4, q('mul.missing', 3))],
  practice: times(5, q('mul.missing', 3)),
};

export const divFacts: LessonContent = {
  id: 'div-facts',
  title: 'Division facts',
  goal: 'I can divide by thinking of a times fact.',
  level: 3,
  icon: 'bolt',
  skills: ['div.result'],
  topic: 'div-facts',
  intro: [
    { say: 'To divide, think of the times fact you know.', visual: familyVisual('mul', [4, 5], 20) },
    { say: '20 ÷ 5: what times 5 makes 20? 4 × 5 = 20, so 20 ÷ 5 = 4.', tokens: factTokens(f('/', 20, 5)) },
  ],
  examples: [
    q('div.result', 3, { constraints: { table: 5 } }),
    q('div.result', 3, { constraints: { table: 2 } }),
    q('div.result', 3, { constraints: { table: 10 } }),
    q('div.result', 3),
    q('div.result', 3),
  ],
  practice: times(5, q('div.result', 3)),
};

export const divStories: LessonContent = {
  id: 'div-stories',
  title: 'Division stories',
  goal: 'I can tell sharing stories from grouping stories.',
  level: 3,
  icon: 'story',
  skills: ['word.div'],
  topic: 'stories-div',
  intro: [
    { say: 'Sharing story: 15 sweets are shared among 5 children. How many each?', visual: shareVisual(15, 5, 15, 'sweet') },
    { say: 'Grouping story: 20 pupils make teams of 4. How many teams?', visual: groupingVisual(20, 4, 5, 'person') },
  ],
  examples: [
    q('word.div', 3, { ...fixed(15, 5), variant: 'share.each' }),
    q('word.div', 3, { ...fixed(20, 4), variant: 'group.count' }),
    q('word.div', 3, { variant: 'groups.size' }),
    q('word.div', 3, { variant: 'share.each' }),
    q('word.div', 3, { variant: 'group.count' }),
  ],
  practice: times(5, q('word.div', 3)),
};

export const whichOp: LessonContent = {
  id: 'which-op',
  title: 'Which operation?',
  goal: 'I can choose +, −, × or ÷ from what happens in a story.',
  level: 3,
  icon: 'shuffle',
  skills: ['word.op'],
  topic: 'stories-op',
  intro: [
    { say: 'Joining or parts of a whole: +. Taking away or comparing: −.' },
    { say: 'Equal groups: ×. Sharing or grouping equally: ÷.', visual: groupsVisual(4, 5, { filled: 4, sizes: true }) },
  ],
  examples: [
    q('word.op', 3, { variant: 'join.result' }),
    q('word.op', 3, { variant: 'separate.result' }),
    q('word.op', 3, { ...fixed(4, 5), variant: 'groups.total' }),
    q('word.op', 3, { variant: 'share.each' }),
    q('word.op', 3, { variant: 'compare.difference' }),
  ],
  practice: times(5, q('word.op', 3)),
};

export const whichStory: LessonContent = {
  id: 'which-story',
  title: 'Which story matches?',
  goal: 'I can read an equation as a story.',
  level: 3,
  icon: 'book',
  skills: ['word.match'],
  topic: 'stories-match',
  intro: [
    { say: 'An equation tells a story too. 8 − 3 = 5 means: start with 8 and take 3 away.', tokens: factTokens(f('-', 8, 3)) },
    { say: 'Read each story and find the one that does the same thing.' },
  ],
  examples: [q('word.match', 3, { variant: '-' }), q('word.match', 3, { variant: '+' }), q('word.match', 3, { variant: '*' }), q('word.match', 4, { variant: '/' }), q('word.match', 3)],
  practice: times(5, q('word.match', 3)),
};

export const translateAll: LessonContent = {
  id: 'translate-all',
  title: 'Story to equation',
  goal: 'I can turn any story into an equation and solve it.',
  level: 3,
  icon: 'pencil',
  skills: ['word.translate'],
  topic: 'stories-translate',
  intro: [
    { say: 'Read. Find the numbers. Decide what happened. Write the equation. Solve. Check!' },
    { say: 'Some stories need ×: 5 bags with 4 apples in each is 5 × 4.', visual: groupsVisual(5, 4, { item: 'apple', filled: 5, sizes: true }) },
  ],
  examples: [
    q('word.translate', 3, { variant: 'groups.total' }),
    q('word.translate', 3, { variant: 'separate.result' }),
    q('word.translate', 3, { variant: 'share.each' }),
    q('word.translate', 3, { variant: 'join.start' }),
    q('word.translate', 3, { variant: 'compare.difference' }),
  ],
  practice: times(5, q('word.translate', 3)),
};

export const trickyAgain: LessonContent = {
  id: 'tricky-2',
  title: 'Who has more?',
  goal: 'I draw the bars first when the words are tricky.',
  level: 3,
  icon: 'chart',
  skills: ['word.tricky'],
  topic: 'stories-tricky',
  intro: [
    { say: 'Draw the bars first. The person with more has the longer bar.', visual: compareBar(12, 8, { small: false }, ['Ben', 'Amy']) },
    { say: 'Ben has 12. He has 4 more than Amy. So Amy has fewer: 12 − 4 = 8.', tokens: factTokens(f('-', 12, 4)) },
  ],
  examples: [
    q('word.tricky', 3, { ...fixed(8, 4), variant: 'compare.more_ref' }),
    q('word.tricky', 3, { variant: 'compare.fewer_ref' }),
    q('word.tricky', 3, { variant: 'compare.fewer' }),
    q('word.tricky', 3, { variant: 'compare.more_ref' }),
    q('word.tricky', 3),
  ],
  practice: times(5, q('word.tricky', 3)),
};

export const MULDIV_LESSONS = [
  mulGroups,
  mulRepeated,
  mulArrays,
  mulTurnaround,
  mulFacts,
  mulStories,
  divSharing,
  divGrouping,
  divInverse,
  mulMissing,
  divFacts,
  divStories,
  whichOp,
  whichStory,
  translateAll,
  trickyAgain,
];
