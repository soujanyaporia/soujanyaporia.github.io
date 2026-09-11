import { describe, expect, it } from 'vitest';
import { DAY, dayKey } from '../../engine/adaptive';
import { initialProgress, sanitize, type ProgressState } from '../../state/progress';
import { chestContents, newChest } from '../chests';
import { applyEvent, starsFor, sumRewards, type AnswerInfo, type GameEvent, type QuestionOutcome } from '../engine';
import { generateBoard, progressQuests } from '../quests';
import { CATALOG } from '../store';
import { emptyStreak, touchStreak } from '../streak';
import { levelThreshold, playerLevel, xpForAnswer } from '../xp';

// Monday 7 September 2026, 10am local time.
const MON = new Date(2026, 8, 7, 10).getTime();
const clean: QuestionOutcome = { firstTry: true, correct: true, tries: 1, hints: 0, revealed: false };
const info: AnswerInfo = { skill: 'add.result', level: 2, topic: 'addition', format: 'equation', words: false, missing: false, built: false };

function run(state: ProgressState, events: GameEvent[]) {
  const rewards = [];
  let s = state;
  for (const e of events) {
    const r = applyEvent(s, e);
    s = r.state;
    rewards.push(...r.rewards);
  }
  return { state: s, rewards };
}

describe('XP and levels', () => {
  it('rewards understanding and persistence, not speed', () => {
    expect(xpForAnswer(clean)).toBe(8);
    expect(xpForAnswer({ ...clean, firstTry: false })).toBe(7);
    expect(xpForAnswer({ ...clean, hints: 1 })).toBe(5);
    expect(xpForAnswer({ ...clean, revealed: true, correct: false })).toBe(1);
  });

  it('has increasing level thresholds with titles', () => {
    for (let l = 2; l < 12; l++) expect(levelThreshold(l + 1)).toBeGreaterThan(levelThreshold(l));
    expect(playerLevel(0)).toMatchObject({ level: 1, title: 'Number Explorer' });
    expect(playerLevel(levelThreshold(2)).level).toBe(2);
    expect(playerLevel(levelThreshold(3) - 1).level).toBe(2);
  });
});

describe('streaks are encouraging, not punishing', () => {
  it('counts consecutive days and forgives weekends', () => {
    let s = touchStreak(emptyStreak(), MON).streak;
    s = touchStreak(s, MON + DAY).streak; // Tue
    expect(s.current).toBe(2);
    const fri = MON + 4 * DAY;
    s = touchStreak(touchStreak(touchStreak(s, MON + 2 * DAY).streak, MON + 3 * DAY).streak, fri).streak;
    expect(s.current).toBe(5);
    const nextMon = MON + 7 * DAY;
    const update = touchStreak(s, nextMon);
    expect(update.event).toBe('continued');
    expect(update.streak.current).toBe(6);
  });

  it('uses a shield for a missed school day, otherwise starts again', () => {
    const tue = touchStreak(touchStreak(emptyStreak(), MON).streak, MON + DAY).streak;
    const thu = MON + 3 * DAY; // Wednesday missed
    expect(touchStreak(tue, thu).event).toBe('restarted');
    const shielded = touchStreak({ ...tue, freezes: 1 }, thu);
    expect(shielded.event).toBe('shielded');
    expect(shielded.streak.current).toBe(3);
    expect(shielded.streak.freezes).toBe(0);
  });

  it('gives gems at streak milestones', () => {
    let s = emptyStreak();
    let milestone;
    for (let d = 0; d < 3; d++) {
      const u = touchStreak(s, MON + d * DAY);
      s = u.streak;
      milestone = u.milestone;
    }
    expect(milestone).toEqual({ days: 3, gems: 5 });
  });
});

describe('daily quests', () => {
  const ctx = { topics: ['addition', 'multiplication'] as const, wordsUnlocked: true, gamesUnlocked: true, reviewsDue: 0 };
  it('are the same all day and different kinds', () => {
    const a = generateBoard('2026-09-07', { ...ctx, topics: [...ctx.topics] });
    const b = generateBoard('2026-09-07', { ...ctx, topics: [...ctx.topics] });
    expect(a).toEqual(b);
    expect(a.quests).toHaveLength(3);
    expect(new Set(a.quests.map((q) => q.kind)).size).toBe(3);
    expect(a.quests[0].kind).toBe('questions');
  });

  it('only ask for things that are unlocked', () => {
    for (let d = 1; d <= 28; d++) {
      const board = generateBoard(`2026-09-${String(d).padStart(2, '0')}`, { topics: [], wordsUnlocked: false, gamesUnlocked: false, reviewsDue: 0 });
      for (const q of board.quests) expect(['questions', 'clean', 'lessons', 'persist']).toContain(q.kind);
    }
  });

  it('track progress and completion', () => {
    let board = generateBoard('2026-09-07', { ...ctx, topics: [...ctx.topics] });
    const target = board.quests[0].target;
    let completed = 0;
    for (let i = 0; i < target; i++) {
      const r = progressQuests(board, { answered: true });
      board = r.board;
      completed += r.completed.filter((q) => q.kind === 'questions').length;
    }
    expect(completed).toBe(1);
    expect(board.quests[0].progress).toBe(target);
  });
});

describe('treasure chests', () => {
  it('are deterministic and never give something you already own', () => {
    const chest = newChest('challenge', MON, 1);
    expect(chestContents(chest, [], 42)).toEqual(chestContents(chest, [], 42));
    const allItems = CATALOG.map((i) => i.id);
    const rewards = chestContents(chest, allItems, 42);
    expect(rewards.every((r) => r.kind === 'gems')).toBe(true);
    const rare = chestContents(chest, [], 7);
    expect(rare.some((r) => r.kind === 'item')).toBe(true);
  });
});

describe('the game reducer', () => {
  it('turns an answer into XP, a streak and quest progress', () => {
    let s = applyEvent(initialProgress(MON), { type: 'refreshQuests', ctx: { topics: ['addition'], wordsUnlocked: false, gamesUnlocked: false, reviewsDue: 0 }, at: MON }).state;
    const r = applyEvent(s, { type: 'answer', info, outcome: clean, at: MON });
    s = r.state;
    expect(s.xp).toBe(8);
    expect(s.streak.current).toBe(1);
    expect(s.quests!.quests[0].progress).toBe(1);
    expect(r.rewards.some((x) => x.kind === 'streak')).toBe(true);
  });

  it('rewards finishing a lesson, with extra for a perfect one, and unlocks First Steps', () => {
    const outcomes = Array.from({ length: 5 }, () => clean);
    const { state, rewards } = run(initialProgress(MON), [
      ...outcomes.map((o): GameEvent => ({ type: 'answer', info, outcome: o, at: MON })),
      { type: 'session', kind: 'lesson', nodeId: 'add-10', outcomes, at: MON },
    ]);
    expect(state.nodes['add-10'].bestStars).toBe(3);
    expect(state.counters.lessons).toBe(1);
    expect(state.counters.noHintLessons).toBe(1);
    expect(state.achievements['first-steps']).toBeDefined();
    expect(state.achievements['no-hint-hero']).toBeDefined();
    const { xp, gems } = sumRewards(rewards);
    expect(xp).toBeGreaterThanOrEqual(5 * 8 + 25 + 10);
    expect(gems).toBeGreaterThan(0);
    expect(state.gems).toBe(gems);
  });

  it('pays out quests, and a chest when all three are done', () => {
    let s = applyEvent(initialProgress(MON), { type: 'refreshQuests', ctx: { topics: [], wordsUnlocked: false, gamesUnlocked: false, reviewsDue: 0 }, at: MON }).state;
    s = { ...s, quests: { ...s.quests!, quests: s.quests!.quests.map((q) => ({ ...q, progress: q.target })) } };
    const gems0 = s.gems;
    const { state, rewards } = run(s, s.quests!.quests.map((q): GameEvent => ({ type: 'claimQuest', questId: q.id, at: MON })));
    expect(state.quests!.quests.every((q) => q.claimed)).toBe(true);
    expect(rewards.some((r) => r.kind === 'questsAll')).toBe(true);
    expect(state.chests).toHaveLength(1);
    expect(state.gems).toBeGreaterThan(gems0);
    // Claiming twice does nothing.
    const again = applyEvent(state, { type: 'claimQuest', questId: state.quests!.quests[0].id, at: MON });
    expect(again.state.gems).toBe(state.gems);
  });

  it('opens chests once and adds their gems', () => {
    const chest = newChest('quests', MON, 1);
    const s = { ...initialProgress(MON), chests: [chest] };
    const r = applyEvent(s, { type: 'openChest', chestId: chest.id, at: MON });
    expect(r.state.chests).toHaveLength(0);
    expect(r.state.gems).toBeGreaterThanOrEqual(10);
    expect(applyEvent(r.state, { type: 'openChest', chestId: chest.id, at: MON }).state).toEqual(r.state);
  });

  it('lets children buy and wear cosmetics only with earned gems', () => {
    const s = { ...initialProgress(MON), gems: 55 };
    const bought = applyEvent(s, { type: 'buy', itemId: 'hat-party' }).state;
    expect(bought.gems).toBe(5);
    expect(bought.inventory).toContain('hat-party');
    expect(bought.equipped.hat).toBe('hat-party');
    expect(applyEvent(bought, { type: 'buy', itemId: 'hat-crown' }).state.inventory).not.toContain('hat-crown');
    expect(applyEvent({ ...s, gems: 999 }, { type: 'buy', itemId: 'hat-flower' }).state.inventory).not.toContain('hat-flower');
    expect(applyEvent(bought, { type: 'equip', slot: 'hat', itemId: null }).state.equipped.hat).toBeUndefined();
  });

  it('sells at most two streak shields', () => {
    let s = { ...initialProgress(MON), gems: 200 };
    for (let i = 0; i < 4; i++) s = applyEvent(s, { type: 'buyFreeze' }).state;
    expect(s.streak.freezes).toBe(2);
    expect(s.gems).toBe(150);
  });

  it('celebrates a level up', () => {
    const s = { ...initialProgress(MON), xp: levelThreshold(2) - 3 };
    const r = applyEvent(s, { type: 'answer', info, outcome: clean, at: MON });
    expect(r.rewards.some((x) => x.kind === 'level' && x.level === 2)).toBe(true);
  });

  it('computes stars from first tries', () => {
    expect(starsFor([clean, clean, clean, clean, { ...clean, firstTry: false }])).toBe(3);
    expect(starsFor([clean, { ...clean, firstTry: false }])).toBe(2);
    expect(starsFor([{ ...clean, firstTry: false }])).toBe(1);
  });
});

describe('saved progress', () => {
  it('migrates version 1 data and fills in new fields', () => {
    const v1 = {
      version: 1,
      createdAt: MON,
      skills: { 'add.result': { attempts: 3, mastery: 0.5, level: 2 } },
      lessons: { 'add-5': { completions: 1, bestStars: 2, lastStars: 2, lastAt: MON } },
      totals: { attempted: 3 },
      streak: { current: 2, best: 4, lastDay: dayKey(MON) },
      settings: { sound: false },
    };
    const s = sanitize(v1)!;
    expect(s.version).toBe(2);
    expect(s.nodes['add-5'].bestStars).toBe(2);
    expect(s.skills['add.result']?.attempts).toBe(3);
    expect(s.streak.best).toBe(4);
    expect(s.settings.sound).toBe(false);
    expect(s.inventory).toContain('color-blue');
    expect(sanitize({ version: 99 })).toBeNull();
  });
});
