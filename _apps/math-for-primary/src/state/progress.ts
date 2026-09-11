import {initialPrimary,type PrimaryProgress} from '../primary/progress';
import { touchStreak } from '../game/streak';
import { updateStats, type AttemptOutcome, type StatsMap } from '../engine/stats';
import { emptyCounters, type Counters } from '../game/achievements';
import type { ChestRecord } from '../game/chests';
import type { QuestBoard } from '../game/quests';
import { DEFAULT_EQUIPPED, DEFAULT_OWNED, type Equipped } from '../game/store';
import { emptyStreak, type StreakState } from '../game/streak';

/**
 * Everything we remember about the child, stored locally (offline-first).
 * Plain JSON behind a repository interface, so child profiles and cloud
 * sync can be added later without touching the screens.
 */
export interface NodeRecord {
  completions: number;
  bestStars: number;
  lastStars: number;
  bestAccuracy: number;
  lastAt: number;
}

export interface Settings {
  sound: boolean;
  /** Read stories and tutor messages aloud automatically. */
  readAloud: boolean;
  /** Grown-up setting: open every level on the map (placement). */
  unlockAll: boolean;
}

export interface Totals {
  attempted: number;
  firstTry: number;
  correct: number;
  hints: number;
  tries: number;
  stars: number;
  sessions: number;
}

export type SessionKind = 'lesson' | 'practice' | 'mixed' | 'review' | 'challenge' | 'game';

export interface SessionRecord {
  at: number;
  kind: SessionKind;
  nodeId?: string;
  questions: number;
  firstTry: number;
  hints: number;
  stars: number;
  xp: number;
  gems: number;
}

export interface ProgressState {
  primary: PrimaryProgress;
  version: 2;
  badges: string[];
  createdAt: number;
  profile: { name: string; onboarded: boolean };
  skills: StatsMap;
  /** Map nodes (lessons, games, challenges, chests) that were finished. */
  nodes: Record<string, NodeRecord>;
  totals: Totals;
  counters: Counters;
  xp: number;
  gems: number;
  gemsEarned: number;
  streak: StreakState;
  quests: QuestBoard | null;
  /** Unopened chests. */
  chests: ChestRecord[];
  /** Achievement id → time unlocked. */
  achievements: Record<string, number>;
  inventory: string[];
  equipped: Equipped;
  settings: Settings;
  /** The last 100 answers (for analytics and parents). */
  recent: AttemptOutcome[];
  /** The last 40 finished sessions. */
  history: SessionRecord[];
}

export const STORAGE_KEY = 'math-for-primary.progress.v2';
const LEGACY_KEY = 'math-for-primary.progress.v1';

export function initialProgress(now = Date.now()): ProgressState {
  return {
    version: 2,
    primary: initialPrimary(),
    badges: [],
    createdAt: now,
    profile: { name: '', onboarded: false },
    skills: {},
    nodes: {},
    totals: { attempted: 0, firstTry: 0, correct: 0, hints: 0, tries: 0, stars: 0, sessions: 0 },
    counters: emptyCounters(),
    xp: 0,
    gems: 0,
    gemsEarned: 0,
    streak: emptyStreak(),
    quests: null,
    chests: [],
    achievements: {},
    inventory: [...DEFAULT_OWNED],
    equipped: { ...DEFAULT_EQUIPPED },
    settings: { sound: true, readAloud: false, unlockAll: false },
    recent: [],
    history: [],
  };
}

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {});
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Accept stored data only if it looks like ours; migrate v1 and fill new fields. */
export function sanitize(raw: unknown): ProgressState | null {
  const data = obj(raw);
  if (data.version !== 1 && data.version !== 2) return null;
  const base = initialProgress(typeof data.createdAt === 'number' ? data.createdAt : Date.now());
  if (data.version === 1) {
    // v1 → v2: keep skills, finished lessons, totals and the streak.
    const lessons = obj(data.lessons) as Record<string, Partial<NodeRecord>>;
    const nodes: Record<string, NodeRecord> = {};
    for (const [id, l] of Object.entries(lessons)) {
      nodes[id] = { completions: l.completions ?? 1, bestStars: l.bestStars ?? 1, lastStars: l.lastStars ?? 1, bestAccuracy: 0, lastAt: l.lastAt ?? 0 };
    }
    const streak = obj(data.streak);
    return {
      ...base,
      skills: obj(data.skills) as StatsMap,
      nodes,
      badges: arr<string>(data.badges),
      totals: { ...base.totals, ...(obj(data.totals) as Partial<Totals>) },
      streak: { ...base.streak, current: Number(streak.current) || 0, best: Number(streak.best) || 0, lastDay: (streak.lastDay as string) ?? null },
      settings: { ...base.settings, ...(obj(data.settings) as Partial<Settings>) },
      recent: arr<AttemptOutcome>(data.recent),
      profile: { name: '', onboarded: true },
    };
  }
  const d = data as Partial<ProgressState>;
  return {
    ...base,
    ...d,
    primary: d.primary && typeof d.primary === 'object' ? {selection:d.primary.selection??null,activities:d.primary.activities??{},history:d.primary.history??[],applied:arr<string>(d.primary.applied).filter(id=>typeof id==='string').slice(-400)} : initialPrimary(),
    version: 2,
    profile: { ...base.profile, ...obj(d.profile) },
    totals: { ...base.totals, ...obj(d.totals) },
    counters: { ...base.counters, ...obj(d.counters) },
    streak: { ...base.streak, ...obj(d.streak) },
    settings: { ...base.settings, ...obj(d.settings) },
    equipped: { ...base.equipped, ...obj(d.equipped) },
    skills: obj(d.skills) as StatsMap,
    nodes: obj(d.nodes) as Record<string, NodeRecord>,
    badges: arr<string>(data.badges),
    achievements: obj(d.achievements) as Record<string, number>,
    inventory: Array.from(new Set([...DEFAULT_OWNED, ...arr<string>(d.inventory)])),
    chests: arr<ChestRecord>(d.chests),
    recent: arr<AttemptOutcome>(d.recent),
    history: arr<SessionRecord>(d.history),
    xp: Number(d.xp) || 0,
    gems: Number(d.gems) || 0,
    gemsEarned: Number(d.gemsEarned) || 0,
    quests: d.quests && typeof d.quests === 'object' ? (d.quests as QuestBoard) : null,
  };
}

export interface ProgressRepository {
  /** Storage key, used to follow changes made in another tab. */
  key?: string;
  load(): ProgressState | null;
  save(state: ProgressState): void;
  clear(): void;
}

/** Local progress for one scope. Guests keep the original key; signed-in staff get their own. */
export const progressKeyFor = (scope: string) => (scope === 'guest' ? STORAGE_KEY : `${STORAGE_KEY}:${scope}`);

export function localRepository(key: string, legacyKey?: string): ProgressRepository {
  return {
    key,
    load() {
      try {
        const raw = window.localStorage.getItem(key) ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null);
        return raw ? sanitize(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    save(state) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* storage full or unavailable (private mode): keep playing */
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
        if (legacyKey) window.localStorage.removeItem(legacyKey);
      } catch {
        /* ignore */
      }
    },
  };
}

export const localStorageRepository: ProgressRepository = localRepository(STORAGE_KEY, LEGACY_KEY);

/** Record an answer once, when the child advances to the next question. */
export function applyAttempt(state: ProgressState, outcome: AttemptOutcome): ProgressState {
  const o = { ...outcome, correct: outcome.correct && !outcome.revealed, firstTry: outcome.firstTry && !outcome.revealed };
  return {
    ...state,
    skills: { ...state.skills, [o.skill]: updateStats(state.skills[o.skill], o) },
    totals: { ...state.totals, attempted: state.totals.attempted + 1,
      correct: state.totals.correct + Number(o.correct), firstTry: state.totals.firstTry + Number(o.firstTry),
      hints: state.totals.hints + o.hints, tries: state.totals.tries + o.tries },
    streak: touchStreak(state.streak, o.at).streak,
    recent: [...state.recent, o].slice(-100),
  };
}

export function applySessionComplete(state: ProgressState, stars: number, lessonId?: string, at = Date.now()): ProgressState {
  const previous = lessonId ? state.nodes[lessonId] : undefined;
  return {
    ...state,
    totals: { ...state.totals, sessions: state.totals.sessions + 1, stars: state.totals.stars + stars },
    nodes: lessonId ? { ...state.nodes, [lessonId]: {
      completions: (previous?.completions ?? 0) + 1, bestStars: Math.max(previous?.bestStars ?? 0, stars),
      lastStars: stars, bestAccuracy: previous?.bestAccuracy ?? 0, lastAt: at,
    } } : state.nodes,
  };
}
