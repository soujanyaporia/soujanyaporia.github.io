import { EXTRA_LESSONS, q } from '../content/lessons-extra';
import { MULDIV_LESSONS } from '../content/lessons-muldiv';
import { LESSONS } from '../content/lessons';
import { SKILLS, type ProblemRequest } from '../engine/skills';
import type { LevelId, SkillId } from '../engine/types';
import type { IconName } from '../ui/Icon';
import type { ChallengeNode, ChestNode, GameId, GameNode, LessonContent, LessonNode, WorldDef } from './types';

/**
 * The learning journey. Worlds run from early P1 (adding within 5) to
 * P2/P3 (multiplication, division and four-operation stories). Children
 * move by mastery, not age: grown-ups can open any level in settings.
 */

const ALL_CONTENT: LessonContent[] = [...LESSONS, ...EXTRA_LESSONS, ...MULDIV_LESSONS];

function content(id: string): LessonContent {
  const found = ALL_CONTENT.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown lesson ${id}`);
  return found;
}

const TRANSLATION: SkillId[] = ['word.build', 'word.translate', 'word.action'];

function lesson(world: string, c: LessonContent | string, xpReward = 25, gemReward = 6): LessonNode {
  const lc = typeof c === 'string' ? content(c) : c;
  return {
    id: lc.id,
    type: 'lesson',
    title: lc.title,
    world,
    icon: lc.icon,
    xpReward,
    gemReward,
    lessonType: lc.skills.some((s) => TRANSLATION.includes(s)) ? 'translate' : 'guided',
    skills: lc.skills,
    level: lc.level,
    numberRange: [0, SKILLS[lc.skills[0]].limit(lc.level)],
    lesson: lc,
  };
}

const chest = (world: string, id: string): ChestNode => ({ id, type: 'chest', title: 'Treasure chest', world, icon: 'gift', xpReward: 0, gemReward: 0 });

function game(world: string, id: string, gameId: GameId, skill: SkillId, level: LevelId, title: string, blurb: string, icon: IconName): GameNode {
  return { id, type: 'game', title, world, icon, xpReward: 15, gemReward: 4, game: gameId, skill, level, rounds: 6, blurb };
}

function challenge(world: string, id: string, title: string, requests: ProblemRequest[], blurb: string): ChallengeNode {
  return { id, type: 'challenge', title, world, icon: 'crown', xpReward: 40, gemReward: 15, requests, passMark: 0.7, blurb };
}

const W = {
  add: 'addition-adventure',
  sub: 'subtraction-valley',
  missing: 'missing-caves',
  story: 'story-forest',
  mul: 'multiplication-meadow',
  div: 'division-dunes',
  summit: 'story-summit',
};

export const WORLDS: WorldDef[] = [
  {
    id: W.add,
    title: 'Addition Adventure',
    subtitle: 'Putting things together',
    tone: 'blue',
    scenery: 'hills',
    nodes: [
      lesson(W.add, 'add-5'),
      lesson(W.add, 'add-10'),
      game(W.add, 'game-monster-10', 'monster', 'bond.make', 2, 'Feed the Monster', 'Choose two numbers that make what the monster wants.', 'puzzle'),
      lesson(W.add, 'add-20'),
      chest(W.add, 'chest-add'),
      challenge(
        W.add,
        'challenge-add',
        'Addition Challenge',
        [q('add.result', 2), q('add.result_left', 2), q('bond.make', 2), q('add.result', 3), q('truefalse', 2), q('word.add', 2), q('add.result', 3), q('bond.part', 2)],
        'Mixed adding questions. Show what you know!',
      ),
    ],
  },
  {
    id: W.sub,
    title: 'Subtraction Valley',
    subtitle: 'Taking away and finding what is left',
    tone: 'orange',
    scenery: 'valley',
    nodes: [
      lesson(W.sub, 'sub-5'),
      lesson(W.sub, 'sub-10'),
      lesson(W.sub, 'sub-think-add'),
      game(W.sub, 'game-train-count', 'train', 'pattern.sequence', 2, 'Number Train', 'Find the missing carriage.', 'train'),
      chest(W.sub, 'chest-sub'),
      lesson(W.sub, 'sub-20'),
      challenge(
        W.sub,
        'challenge-sub',
        'Subtraction Challenge',
        [q('sub.result', 2), q('sub.result_left', 2), q('sub.inverse', 2), q('sub.result', 3), q('truefalse', 2), q('word.sub', 2), q('pattern.sequence', 2), q('sub.result', 3)],
        'Take away, think addition, and solve stories.',
      ),
    ],
  },
  {
    id: W.missing,
    title: 'Missing Number Caves',
    subtitle: 'Parts, wholes and balance',
    tone: 'green',
    scenery: 'cave',
    nodes: [
      lesson(W.missing, 'bonds'),
      lesson(W.missing, 'missing-add-first'),
      lesson(W.missing, 'missing-add-second'),
      chest(W.missing, 'chest-missing'),
      lesson(W.missing, 'missing-sub-first'),
      lesson(W.missing, 'missing-sub-second'),
      game(W.missing, 'game-balance', 'balance', 'equality.balance', 2, 'Balance Scale', 'Make both sides weigh the same.', 'scale'),
      lesson(W.missing, 'equality'),
      challenge(
        W.missing,
        'challenge-missing',
        'Cave Challenge',
        [
          q('add.missing_first', 2),
          q('add.missing_second', 2),
          q('sub.missing_first', 2),
          q('sub.missing_second', 2),
          q('bond.part', 2),
          q('equality.balance', 2),
          q('word.missing', 2),
          q('compare.expr', 2),
        ],
        'Find every missing number.',
      ),
    ],
  },
  {
    id: W.story,
    title: 'Story Forest',
    subtitle: 'From words to maths',
    tone: 'purple',
    scenery: 'forest',
    nodes: [
      lesson(W.story, 'story-what'),
      lesson(W.story, 'stories-add'),
      lesson(W.story, 'stories-sub'),
      chest(W.story, 'chest-story-1'),
      lesson(W.story, 'story-mystery'),
      lesson(W.story, 'compare'),
      lesson(W.story, 'stories-choose'),
      chest(W.story, 'chest-story-2'),
      lesson(W.story, 'stories-build'),
      lesson(W.story, 'tricky-words'),
      lesson(W.story, 'mixed'),
      challenge(
        W.story,
        'challenge-stories',
        'Story Challenge',
        [q('word.add', 2), q('word.sub', 2), q('word.missing', 2), q('word.compare', 2), q('word.choose', 2), q('word.build', 2), q('word.tricky', 2), q('word.action', 2)],
        'Read carefully. Nobody will tell you whether to add or subtract!',
      ),
    ],
  },
  {
    id: W.mul,
    title: 'Multiplication Meadow',
    subtitle: 'Equal groups everywhere',
    tone: 'teal',
    scenery: 'meadow',
    nodes: [
      lesson(W.mul, 'mul-groups'),
      lesson(W.mul, 'mul-repeated'),
      lesson(W.mul, 'mul-arrays'),
      game(W.mul, 'game-train-skip', 'train', 'pattern.sequence', 4, 'Skip-Counting Train', 'Count in 2s, 3s, 5s and 10s.', 'train'),
      chest(W.mul, 'chest-mul'),
      lesson(W.mul, 'mul-turnaround'),
      lesson(W.mul, 'mul-facts'),
      lesson(W.mul, 'mul-stories'),
      challenge(
        W.mul,
        'challenge-mul',
        'Multiplication Challenge',
        [q('mul.groups', 2), q('mul.array', 2), q('mul.repeated', 2), q('mul.turnaround', 3), q('mul.result', 3), q('mul.result', 3), q('word.mul', 3), q('pattern.sequence', 4)],
        'Groups, arrays, facts and stories.',
      ),
    ],
  },
  {
    id: W.div,
    title: 'Division Dunes',
    subtitle: 'Sharing and grouping',
    tone: 'yellow',
    scenery: 'desert',
    nodes: [
      lesson(W.div, 'div-sharing'),
      game(W.div, 'game-picnic', 'picnic', 'div.sharing', 2, 'Sharing Picnic', 'Share the food fairly between friends.', 'share'),
      lesson(W.div, 'div-grouping'),
      lesson(W.div, 'div-inverse'),
      chest(W.div, 'chest-div'),
      lesson(W.div, 'mul-missing'),
      lesson(W.div, 'div-facts'),
      lesson(W.div, 'div-stories'),
      challenge(
        W.div,
        'challenge-div',
        'Division Challenge',
        [q('div.sharing', 2), q('div.grouping', 2), q('div.inverse', 3), q('mul.missing', 3), q('div.result', 3), q('div.result', 3), q('word.div', 3), q('word.op', 3)],
        'Share, group, and use times facts to divide.',
      ),
    ],
  },
  {
    id: W.summit,
    title: 'Story Summit',
    subtitle: 'All four operations',
    tone: 'pink',
    scenery: 'mountain',
    nodes: [
      lesson(W.summit, 'which-op'),
      lesson(W.summit, 'which-story'),
      lesson(W.summit, 'translate-all'),
      game(W.summit, 'game-monster-mixed', 'monster', 'bond.make', 4, 'Hungry Monster', 'Use + or − to make the number.', 'puzzle'),
      chest(W.summit, 'chest-summit'),
      lesson(W.summit, 'tricky-2'),
      challenge(
        W.summit,
        'challenge-final',
        'Grand Challenge',
        [
          q('word.translate', 3),
          q('word.op', 3),
          q('word.match', 3),
          q('word.tricky', 3),
          q('mul.result', 4),
          q('div.result', 4),
          q('add.missing_first', 3),
          q('sub.missing_second', 3),
          q('equality.balance', 3),
          q('word.div', 3),
        ],
        'The top of the mountain: everything you have learned.',
      ),
    ],
  },
];
