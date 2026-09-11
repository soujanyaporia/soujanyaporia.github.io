import type { Tone } from '../curriculum/types';
import type { SkillId } from '../engine/types';
import type { IconName } from '../ui/Icon';

export interface PracticeTopic {
  id: string;
  title: string;
  /** A tiny example of the question shape. */
  pattern: string;
  tone: Tone;
  icon: IconName;
  skills: SkillId[];
  area: 'practice' | 'words';
  /** Use multiplication levels ("Up to 20") instead of "Within 10". */
  multiplicative?: boolean;
}

const topic = (
  id: string,
  title: string,
  pattern: string,
  tone: Tone,
  icon: IconName,
  skills: SkillId[],
  area: 'practice' | 'words' = 'practice',
  multiplicative = false,
): PracticeTopic => ({ id, title, pattern, tone, icon, skills, area, multiplicative });

const PRACTICE_CATALOG: readonly PracticeTopic[] = [
  topic('addition', 'Adding', '3 + 4 = □', 'blue', 'plus', ['add.result', 'add.result_left']),
  topic('subtraction', 'Taking away', '7 − 3 = □', 'orange', 'minus', ['sub.result', 'sub.result_left', 'sub.inverse']),
  topic('missing-add', 'Missing numbers (+)', '□ + 3 = 7', 'green', 'search', ['add.missing_first', 'add.missing_second']),
  topic('missing-sub', 'Missing numbers (−)', '9 − □ = 4', 'teal', 'search', ['sub.missing_first', 'sub.missing_second']),
  topic('bonds', 'Number bonds', '7 is 3 and □', 'purple', 'sparkle', ['bond.part', 'bond.make']),
  topic('mul-groups', 'Equal groups & arrays', '3 groups of 4', 'teal', 'grid', ['mul.groups', 'mul.array', 'mul.repeated'], 'practice', true),
  topic('mul-facts', 'Times tables', '3 × 4 = □', 'blue', 'bolt', ['mul.result', 'mul.turnaround', 'mul.missing'], 'practice', true),
  topic('div', 'Sharing & grouping', '12 ÷ 3 = □', 'yellow', 'share', ['div.sharing', 'div.grouping'], 'practice', true),
  topic('div-facts', 'Division facts', '□ × 3 = 12', 'orange', 'share', ['div.result', 'div.inverse'], 'practice', true),
  topic('patterns', 'Number patterns', '2, 4, 6, □', 'pink', 'train', ['pattern.sequence']),
  topic('true-false', 'True or false?', '3 + 4 = 8 ?', 'yellow', 'check', ['truefalse']),
  topic('compare', 'More, less or equal?', '3 + 4 ○ 8', 'blue', 'chart', ['compare.expr']),
  topic('balance', 'Balance both sides', '3 + 2 = 4 + □', 'green', 'scale', ['equality.balance']),
];

const WORD_CATALOG: readonly PracticeTopic[] = [
  topic('stories-translate', 'Story to equation', 'Read, model, write, solve', 'purple', 'pencil', ['word.translate', 'word.action'], 'words'),
  topic('stories-add', 'Adding stories', 'Join in, put together', 'blue', 'plus', ['word.add'], 'words'),
  topic('stories-sub', 'Taking-away stories', 'How many are left?', 'orange', 'minus', ['word.sub'], 'words'),
  topic('stories-missing', 'Mystery numbers', 'How many at first?', 'teal', 'search', ['word.missing'], 'words'),
  topic('stories-compare', 'Comparing stories', 'How many more?', 'yellow', 'chart', ['word.compare'], 'words'),
  topic('stories-tricky', 'Tricky words', '"fewer" can mean add', 'pink', 'bulb', ['word.tricky'], 'words'),
  topic('stories-choose', 'Add or subtract?', 'Pick the equation', 'green', 'shuffle', ['word.choose'], 'words'),
  topic('stories-build', 'Write the equation', 'Tap or drag the tiles', 'teal', 'pencil', ['word.build'], 'words'),
  topic('stories-mul', 'Multiplication stories', 'Equal groups', 'teal', 'grid', ['word.mul'], 'words', true),
  topic('stories-div', 'Division stories', 'Sharing and grouping', 'yellow', 'share', ['word.div'], 'words', true),
  topic('stories-op', 'Which operation?', '+ − × ÷', 'purple', 'shuffle', ['word.op'], 'words', true),
  topic('stories-match', 'Which story matches?', '8 − 3 = 5', 'blue', 'book', ['word.match'], 'words', true),
];

/** Future expansion content is kept intact but is not reachable in V1. */
export const ALL_TOPICS = [...PRACTICE_CATALOG, ...WORD_CATALOG];
export const PRACTICE_TOPICS = PRACTICE_CATALOG.filter(t => !t.multiplicative && t.id !== 'patterns');
export const WORD_TOPICS = WORD_CATALOG.filter(t => !t.multiplicative);
export const ENABLED_TOPICS = [...PRACTICE_TOPICS, ...WORD_TOPICS];

export const topicById = (id: string) => ENABLED_TOPICS.find((t) => t.id === id);
