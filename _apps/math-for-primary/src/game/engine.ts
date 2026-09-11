import { bandIndex, dayKey, masteryBand, updateStats, type AttemptOutcome, type MasteryBand } from '../engine/adaptive';
import { hashString } from '../engine/random';
import type { TopicId } from '../engine/skills';
import type { LevelId, Misconception, SkillId } from '../engine/types';
import type { ProgressState, SessionKind } from '../state/progress';
import { newlyUnlocked } from './achievements';
import { chestContents, newChest, type ChestRecord, type ChestReward } from './chests';
import { generateBoard, progressQuests, QUEST_BONUS_GEMS, questDone, type QuestContext, type QuestSignal } from './quests';
import { itemById, OPTIONAL_SLOTS, type Slot } from './store';
import { FREEZE_PRICE, MAX_FREEZES, touchStreak, type StreakEvent } from './streak';
import { playerLevel, XP_RULES, xpForAnswer } from './xp';

/**
 * The game layer as one pure reducer: every learning event goes in, the
 * new state and a list of rewards come out. The UI only animates rewards;
 * it never computes them. This keeps the economy consistent and testable.
 */

export interface QuestionOutcome {
  firstTry: boolean;
  correct: boolean;
  tries: number;
  hints: number;
  revealed: boolean;
}

export interface AnswerInfo {
  skill: SkillId;
  level: LevelId;
  topic: TopicId;
  /** How the question was shown: 'equation', 'story', 'groups' … */
  format: string;
  words: boolean;
  missing: boolean;
  built: boolean;
}

export type GameEvent =
  | { type: 'answer'; info: AnswerInfo; outcome: QuestionOutcome; misconception?: Misconception; at: number }
  | {
      type: 'session';
      kind: SessionKind;
      nodeId?: string;
      outcomes: QuestionOutcome[];
      gemReward?: number;
      passed?: boolean;
      at: number;
    }
  | { type: 'claimQuest'; questId: string; at: number }
  | { type: 'openChest'; chestId: string; at: number }
  | { type: 'openNodeChest'; nodeId: string; at: number }
  | { type: 'buy'; itemId: string }
  | { type: 'buyFreeze' }
  | { type: 'equip'; slot: Slot; itemId: string | null }
  | { type: 'refreshQuests'; ctx: QuestContext; at: number }
  | { type: 'profile'; name: string };

export type Reward =
  | { kind: 'xp'; amount: number }
  | { kind: 'gems'; amount: number; reason: string }
  | { kind: 'level'; level: number; title: string }
  | { kind: 'achievement'; id: string; title: string; xp: number; gems: number }
  | { kind: 'quest'; id: string; title: string }
  | { kind: 'questsAll' }
  | { kind: 'chest'; chest: ChestRecord }
  | { kind: 'item'; itemId: string }
  | { kind: 'mastery'; skill: SkillId; band: MasteryBand }
  | { kind: 'streak'; days: number; event: StreakEvent };

export interface GameResult {
  state: ProgressState;
  rewards: Reward[];
}

/** Stars are about first tries — every finished session earns at least one. */
export function starsFor(outcomes: QuestionOutcome[]): number {
  if (outcomes.length === 0) return 0;
  const firstTry = outcomes.filter((o) => o.firstTry).length / outcomes.length;
  return firstTry >= 0.8 ? 3 : firstTry >= 0.5 ? 2 : 1;
}

const SESSION_XP: Record<SessionKind, number> = {
  lesson: XP_RULES.lesson,
  practice: XP_RULES.practice,
  mixed: XP_RULES.practice,
  review: XP_RULES.review,
  game: XP_RULES.game,
  challenge: XP_RULES.challenge,
};

const SESSION_GEMS: Record<SessionKind, number> = { lesson: 6, practice: 3, mixed: 4, review: 4, game: 4, challenge: 15 };

// ---------------------------------------------------------------- helpers

function addGems(state: ProgressState, amount: number, reason: string, rewards: Reward[]): ProgressState {
  if (amount <= 0) return state;
  rewards.push({ kind: 'gems', amount, reason });
  return { ...state, gems: state.gems + amount, gemsEarned: state.gemsEarned + amount };
}

function addXp(state: ProgressState, amount: number, rewards: Reward[]): ProgressState {
  if (amount <= 0) return state;
  rewards.push({ kind: 'xp', amount });
  const before = playerLevel(state.xp).level;
  let next = { ...state, xp: state.xp + amount };
  const after = playerLevel(next.xp);
  if (after.level > before) {
    rewards.push({ kind: 'level', level: after.level, title: after.title });
    next = addGems(next, 10, 'Level up', rewards);
  }
  return next;
}

function checkAchievements(state: ProgressState, at: number, rewards: Reward[]): ProgressState {
  let next = state;
  for (let round = 0; round < 3; round++) {
    const unlocked = newlyUnlocked(
      { counters: next.counters, attempted: next.totals.attempted, streakBest: next.streak.best, gemsEarned: next.gemsEarned, skills: next.skills },
      next.achievements,
    );
    if (!unlocked.length) break;
    for (const def of unlocked) {
      next = { ...next, achievements: { ...next.achievements, [def.id]: at } };
      rewards.push({ kind: 'achievement', id: def.id, title: def.title, xp: def.xp, gems: def.gems });
      next = addGems(addXp(next, def.xp, rewards), def.gems, def.title, rewards);
    }
  }
  return next;
}

function signalQuests(state: ProgressState, signal: QuestSignal, rewards: Reward[]): ProgressState {
  if (!state.quests) return state;
  const { board, completed } = progressQuests(state.quests, signal);
  for (const q of completed) rewards.push({ kind: 'quest', id: q.id, title: q.title });
  return { ...state, quests: board };
}

function addChest(state: ProgressState, chest: ChestRecord, rewards: Reward[]): ProgressState {
  rewards.push({ kind: 'chest', chest });
  return { ...state, chests: [...state.chests, chest] };
}

function applyChest(state: ProgressState, chest: ChestRecord, rewards: Reward[]): ProgressState {
  const contents: ChestReward[] = chestContents(chest, state.inventory, hashString(chest.id));
  let next = { ...state, counters: { ...state.counters, chests: state.counters.chests + 1 } };
  for (const reward of contents) {
    if (reward.kind === 'gems') next = addGems(next, reward.amount, 'Treasure chest', rewards);
    else if (!next.inventory.includes(reward.itemId)) {
      next = { ...next, inventory: [...next.inventory, reward.itemId] };
      rewards.push({ kind: 'item', itemId: reward.itemId });
    }
  }
  return next;
}

// ---------------------------------------------------------------- the reducer

export function applyEvent(state: ProgressState, event: GameEvent): GameResult {
  const rewards: Reward[] = [];
  let s = state;

  switch (event.type) {
    case 'answer': {
      const { info, outcome, at } = event;
      const attempt: AttemptOutcome = {
        skill: info.skill,
        level: info.level,
        ...outcome,
        at,
        format: info.format,
        misconception: event.misconception,
      };
      const before = masteryBand(s.skills[info.skill]);
      const stats = updateStats(s.skills[info.skill], attempt);
      const after = masteryBand(stats);
      const success = outcome.correct && !outcome.revealed;
      const clean = outcome.firstTry && outcome.hints === 0 && !outcome.revealed;
      const persisted = !outcome.firstTry && success;
      const t = s.totals;
      const c = s.counters;
      s = {
        ...s,
        skills: { ...s.skills, [info.skill]: stats },
        totals: {
          ...t,
          attempted: t.attempted + 1,
          firstTry: t.firstTry + (outcome.firstTry ? 1 : 0),
          correct: t.correct + (outcome.correct ? 1 : 0),
          hints: t.hints + outcome.hints,
          tries: t.tries + outcome.tries,
        },
        counters: {
          ...c,
          words: c.words + (info.words && success ? 1 : 0),
          missing: c.missing + (info.missing && success ? 1 : 0),
          multiplication: c.multiplication + (info.topic === 'multiplication' && success ? 1 : 0),
          division: c.division + (info.topic === 'division' && success ? 1 : 0),
          built: c.built + (info.built && success ? 1 : 0),
          persisted: c.persisted + (persisted ? 1 : 0),
        },
        recent: [...s.recent, attempt].slice(-100),
      };
      s = addXp(s, xpForAnswer(outcome), rewards);

      const streak = touchStreak(s.streak, at);
      if (streak.event !== 'same-day') rewards.push({ kind: 'streak', days: streak.streak.current, event: streak.event });
      s = { ...s, streak: streak.streak };
      if (streak.milestone) s = addGems(s, streak.milestone.gems, `${streak.milestone.days}-day streak`, rewards);

      s = signalQuests(s, { answered: true, clean, persisted, word: info.words && success, topic: info.topic }, rewards);

      if (after === 'mastered' && before !== 'mastered') {
        rewards.push({ kind: 'mastery', skill: info.skill, band: after });
        s = addGems(s, 10, 'Skill mastered', rewards);
        const masteredCount = Object.values(s.skills).filter((st) => masteryBand(st) === 'mastered').length;
        if (masteredCount % 3 === 0) s = addChest(s, newChest('mastery', at, masteredCount), rewards);
      } else if (bandIndex(after) > bandIndex(before) && bandIndex(after) >= bandIndex('stronger')) {
        rewards.push({ kind: 'mastery', skill: info.skill, band: after });
      }
      s = checkAchievements(s, at, rewards);
      break;
    }

    case 'session': {
      const { kind, outcomes, at, nodeId } = event;
      const stars = starsFor(outcomes);
      const firstTry = outcomes.filter((o) => o.firstTry).length;
      const hints = outcomes.reduce((sum, o) => sum + o.hints, 0);
      const passed = kind !== 'challenge' || event.passed !== false;
      const perfect = stars === 3 && kind === 'lesson';
      const accuracy = outcomes.length ? firstTry / outcomes.length : 0;
      const xpBefore = s.xp;
      const gemsBefore = s.gems;

      s = addXp(s, passed ? SESSION_XP[kind] + (perfect ? XP_RULES.perfectLesson : 0) : XP_RULES.practice, rewards);
      s = addGems(s, (passed ? event.gemReward ?? SESSION_GEMS[kind] : 2) + (perfect ? 3 : 0), 'Session complete', rewards);
      if (nodeId && passed) {
        const prev = s.nodes[nodeId];
        s = {
          ...s,
          nodes: {
            ...s.nodes,
            [nodeId]: {
              completions: (prev?.completions ?? 0) + 1,
              bestStars: Math.max(prev?.bestStars ?? 0, stars),
              lastStars: stars,
              bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
              lastAt: at,
            },
          },
        };
      }
      const c = s.counters;
      s = {
        ...s,
        totals: { ...s.totals, stars: s.totals.stars + stars, sessions: s.totals.sessions + 1 },
        counters: {
          ...c,
          lessons: c.lessons + (kind === 'lesson' ? 1 : 0),
          perfectLessons: c.perfectLessons + (perfect ? 1 : 0),
          noHintLessons: c.noHintLessons + (kind === 'lesson' && hints === 0 ? 1 : 0),
          challenges: c.challenges + (kind === 'challenge' && passed ? 1 : 0),
          games: c.games + (kind === 'game' ? 1 : 0),
          reviews: c.reviews + (kind === 'review' ? 1 : 0),
        },
      };
      s = signalQuests(s, { lesson: kind === 'lesson', game: kind === 'game', review: kind === 'review' }, rewards);
      if (kind === 'challenge' && passed) s = addChest(s, newChest('challenge', at, s.counters.challenges), rewards);
      s = checkAchievements(s, at, rewards);
      s = {
        ...s,
        history: [
          ...s.history,
          { at, kind, nodeId, questions: outcomes.length, firstTry, hints, stars, xp: s.xp - xpBefore, gems: Math.max(0, s.gems - gemsBefore) },
        ].slice(-40),
      };
      break;
    }

    case 'claimQuest': {
      const board = s.quests;
      const quest = board?.quests.find((q) => q.id === event.questId);
      if (!board || !quest || quest.claimed || !questDone(quest)) break;
      const quests = board.quests.map((q) => (q.id === quest.id ? { ...q, claimed: true } : q));
      s = { ...s, quests: { ...board, quests }, counters: { ...s.counters, quests: s.counters.quests + 1 } };
      s = addGems(addXp(s, quest.xp, rewards), quest.gems, quest.title, rewards);
      if (quests.every((q) => q.claimed) && !board.bonusClaimed) {
        rewards.push({ kind: 'questsAll' });
        s = { ...s, quests: { ...s.quests!, bonusClaimed: true } };
        s = addGems(s, QUEST_BONUS_GEMS, 'All quests done', rewards);
        s = addChest(s, newChest('quests', event.at, s.counters.quests), rewards);
      }
      s = checkAchievements(s, event.at, rewards);
      break;
    }

    case 'openChest': {
      const chest = s.chests.find((c) => c.id === event.chestId);
      if (!chest) break;
      s = applyChest({ ...s, chests: s.chests.filter((c) => c.id !== chest.id) }, chest, rewards);
      s = checkAchievements(s, event.at, rewards);
      break;
    }

    case 'openNodeChest': {
      if (s.nodes[event.nodeId]) break;
      const chest = { ...newChest('path', event.at, 0), id: `path-${event.nodeId}` };
      s = { ...s, nodes: { ...s.nodes, [event.nodeId]: { completions: 1, bestStars: 3, lastStars: 3, bestAccuracy: 1, lastAt: event.at } } };
      s = applyChest(s, chest, rewards);
      s = checkAchievements(s, event.at, rewards);
      break;
    }

    case 'buy': {
      const item = itemById(event.itemId);
      if (!item || item.chestOnly || s.inventory.includes(item.id) || s.gems < item.price) break;
      s = { ...s, gems: s.gems - item.price, inventory: [...s.inventory, item.id] };
      if (item.slot !== 'sticker') s = { ...s, equipped: { ...s.equipped, [item.slot]: item.id } };
      rewards.push({ kind: 'item', itemId: item.id });
      break;
    }

    case 'buyFreeze': {
      if (s.gems < FREEZE_PRICE || s.streak.freezes >= MAX_FREEZES) break;
      s = { ...s, gems: s.gems - FREEZE_PRICE, streak: { ...s.streak, freezes: s.streak.freezes + 1 } };
      break;
    }

    case 'equip': {
      if (event.itemId === null) {
        if (OPTIONAL_SLOTS.includes(event.slot)) s = { ...s, equipped: { ...s.equipped, [event.slot]: undefined } };
        break;
      }
      const item = itemById(event.itemId);
      if (item && item.slot === event.slot && s.inventory.includes(item.id)) s = { ...s, equipped: { ...s.equipped, [item.slot]: item.id } };
      break;
    }

    case 'refreshQuests': {
      const day = dayKey(event.at);
      if (!s.quests || s.quests.day !== day) s = { ...s, quests: generateBoard(day, event.ctx) };
      break;
    }

    case 'profile':
      s = { ...s, profile: { name: event.name.trim().slice(0, 20), onboarded: true } };
      break;
  }
  return { state: s, rewards };
}

/** Total XP and gems in a list of rewards (for the session summary). */
export function sumRewards(rewards: Reward[]): { xp: number; gems: number } {
  return rewards.reduce(
    (acc, r) => ({ xp: acc.xp + (r.kind === 'xp' ? r.amount : 0), gems: acc.gems + (r.kind === 'gems' ? r.amount : 0) }),
    { xp: 0, gems: 0 },
  );
}
