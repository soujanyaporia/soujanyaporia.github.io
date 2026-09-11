import { hashString, Rng } from '../engine/random';
import type { TopicId } from '../engine/skills';

/**
 * Three small, achievable quests a day. They are generated from the date
 * (the same all day, fresh tomorrow) and from what the child has unlocked,
 * so a quest never asks for something they cannot do yet.
 */
export type QuestKind = 'questions' | 'clean' | 'lessons' | 'persist' | 'words' | 'topic' | 'game' | 'review';

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  target: number;
  progress: number;
  claimed: boolean;
  xp: number;
  gems: number;
  topic?: TopicId;
}

export interface QuestBoard {
  day: string;
  quests: Quest[];
  bonusClaimed: boolean;
}

export interface QuestContext {
  topics: TopicId[];
  wordsUnlocked: boolean;
  gamesUnlocked: boolean;
  reviewsDue: number;
}

/** What happened, for quest progress. */
export interface QuestSignal {
  answered?: boolean;
  clean?: boolean;
  persisted?: boolean;
  word?: boolean;
  topic?: TopicId;
  lesson?: boolean;
  game?: boolean;
  review?: boolean;
}

export const QUEST_BONUS_GEMS = 10;

const TOPIC_WORDS: Partial<Record<TopicId, string>> = {
  addition: 'adding',
  subtraction: 'taking-away',
  missing: 'missing-number',
  bonds: 'number bond',
  multiplication: 'multiplication',
  division: 'division',
  words: 'story',
  translation: 'story',
  patterns: 'pattern',
  equality: 'balancing',
};

interface Template {
  kind: QuestKind;
  weight: number;
  available: (ctx: QuestContext) => boolean;
  make: (rng: Rng, ctx: QuestContext) => Pick<Quest, 'title' | 'target' | 'xp' | 'gems' | 'topic'>;
}

const TEMPLATES: Template[] = [
  {
    kind: 'questions',
    weight: 0,
    available: () => true,
    make: (rng) => {
      const target = rng.pick([8, 10, 12]);
      return { title: `Answer ${target} questions`, target, xp: 15, gems: 5 };
    },
  },
  {
    kind: 'clean',
    weight: 3,
    available: () => true,
    make: (rng) => {
      const target = rng.pick([4, 5, 6]);
      return { title: `Get ${target} right first time, no hints`, target, xp: 20, gems: 6 };
    },
  },
  {
    kind: 'lessons',
    weight: 3,
    available: () => true,
    make: (rng) => {
      const target = rng.chance(0.7) ? 1 : 2;
      return { title: target === 1 ? 'Finish a lesson' : 'Finish 2 lessons', target, xp: 20, gems: 8 };
    },
  },
  {
    kind: 'persist',
    weight: 2,
    available: () => true,
    make: () => ({ title: 'Get 2 answers right after trying again', target: 2, xp: 15, gems: 5 }),
  },
  {
    kind: 'words',
    weight: 3,
    available: (ctx) => ctx.wordsUnlocked,
    make: (rng) => {
      const target = rng.pick([3, 5]);
      return { title: `Solve ${target} story problems`, target, xp: 20, gems: 6 };
    },
  },
  {
    kind: 'topic',
    weight: 3,
    available: (ctx) => ctx.topics.length > 0,
    make: (rng, ctx) => {
      const topic = rng.pick(ctx.topics);
      const target = rng.pick([4, 6]);
      return { title: `Answer ${target} ${TOPIC_WORDS[topic] ?? topic} questions`, target, xp: 15, gems: 5, topic };
    },
  },
  {
    kind: 'game',
    weight: 2,
    available: (ctx) => ctx.gamesUnlocked,
    make: () => ({ title: 'Play a mini-game', target: 1, xp: 10, gems: 5 }),
  },
  {
    kind: 'review',
    weight: 4,
    available: (ctx) => ctx.reviewsDue > 0,
    make: () => ({ title: 'Finish a review round', target: 1, xp: 15, gems: 6 }),
  },
];

export function generateBoard(day: string, ctx: QuestContext): QuestBoard {
  const rng = new Rng(hashString(`quests:${day}`));
  const first = TEMPLATES[0];
  const chosen: Template[] = [first];
  const pool = TEMPLATES.filter((t) => t !== first && t.available(ctx));
  while (chosen.length < 3 && pool.length) {
    const pick = rng.weighted(pool.map((t) => [t, t.weight] as const));
    chosen.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return {
    day,
    bonusClaimed: false,
    quests: chosen.map((t, i) => ({ id: `${day}-${i}-${t.kind}`, kind: t.kind, progress: 0, claimed: false, ...t.make(rng, ctx) })),
  };
}

const matches = (q: Quest, s: QuestSignal): boolean => {
  switch (q.kind) {
    case 'questions':
      return !!s.answered;
    case 'clean':
      return !!s.clean;
    case 'persist':
      return !!s.persisted;
    case 'words':
      return !!s.word;
    case 'topic':
      return !!s.answered && s.topic === q.topic;
    case 'lessons':
      return !!s.lesson;
    case 'game':
      return !!s.game;
    case 'review':
      return !!s.review;
  }
};

export const questDone = (q: Quest) => q.progress >= q.target;

export function progressQuests(board: QuestBoard, signal: QuestSignal): { board: QuestBoard; completed: Quest[] } {
  const completed: Quest[] = [];
  const quests = board.quests.map((q) => {
    if (questDone(q) || !matches(q, signal)) return q;
    const next = { ...q, progress: q.progress + 1 };
    if (questDone(next)) completed.push(next);
    return next;
  });
  return { board: { ...board, quests }, completed };
}
