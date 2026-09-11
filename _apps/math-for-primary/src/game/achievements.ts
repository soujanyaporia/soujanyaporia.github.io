import { bandIndex, masteryBand, type StatsMap } from '../engine/stats';

/**
 * Achievements celebrate effort, persistence and understanding — not speed.
 * Each one gives XP and Math Gems and has visible progress, so children
 * can see what they are working towards.
 */
export type BadgeIcon =
  | 'seed'
  | 'star'
  | 'search'
  | 'book'
  | 'scale'
  | 'flame'
  | 'mountain'
  | 'bolt'
  | 'grid'
  | 'share'
  | 'gem'
  | 'chest'
  | 'trophy'
  | 'pencil';

export type BadgeTone = 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'yellow';

export interface Counters {
  lessons: number;
  perfectLessons: number;
  noHintLessons: number;
  words: number;
  missing: number;
  multiplication: number;
  division: number;
  built: number;
  persisted: number;
  quests: number;
  chests: number;
  challenges: number;
  games: number;
  reviews: number;
}

export const emptyCounters = (): Counters => ({
  lessons: 0,
  perfectLessons: 0,
  noHintLessons: 0,
  words: 0,
  missing: 0,
  multiplication: 0,
  division: 0,
  built: 0,
  persisted: 0,
  quests: 0,
  chests: 0,
  challenges: 0,
  games: 0,
  reviews: 0,
});

export interface AchievementContext {
  counters: Counters;
  attempted: number;
  streakBest: number;
  gemsEarned: number;
  skills: StatsMap;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  tone: BadgeTone;
  xp: number;
  gems: number;
  progress: (ctx: AchievementContext) => [number, number];
}

const masteredCount = (skills: StatsMap) => Object.values(skills).filter((s) => masteryBand(s) === 'mastered').length;

const a = (
  id: string,
  title: string,
  description: string,
  icon: BadgeIcon,
  tone: BadgeTone,
  xp: number,
  gems: number,
  progress: (ctx: AchievementContext) => [number, number],
): AchievementDef => ({ id, title, description, icon, tone, xp, gems, progress });

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  a('first-steps', 'First Steps', 'Finish your first lesson.', 'seed', 'green', 10, 5, (c) => [c.counters.lessons, 1]),
  a('number-explorer', 'Number Explorer', 'Finish 10 lessons.', 'mountain', 'blue', 50, 20, (c) => [c.counters.lessons, 10]),
  a('missing-master', 'Missing Number Master', 'Solve 50 missing-number questions.', 'search', 'teal', 60, 25, (c) => [c.counters.missing, 50]),
  a('story-solver', 'Story Solver', 'Solve 25 word problems.', 'book', 'purple', 50, 20, (c) => [c.counters.words, 25]),
  a('equation-writer', 'Equation Writer', 'Build 15 equations from stories.', 'pencil', 'orange', 40, 15, (c) => [c.counters.built, 15]),
  a('multiplication-builder', 'Multiplication Builder', 'Master equal groups.', 'grid', 'teal', 60, 25, (c) => [
    Math.max(0, bandIndex(masteryBand(c.skills['mul.groups']))),
    5,
  ]),
  a('division-detective', 'Division Detective', 'Answer 20 division questions.', 'share', 'yellow', 50, 20, (c) => [c.counters.division, 20]),
  a('no-hint-hero', 'No-Hint Hero', 'Finish a lesson without any hints.', 'bolt', 'yellow', 30, 10, (c) => [c.counters.noHintLessons, 1]),
  a('star-lesson', 'Star Lesson', 'Get 3 stars in a lesson.', 'star', 'yellow', 20, 10, (c) => [c.counters.perfectLessons, 1]),
  a('never-give-up', 'Never Give Up', 'Get 10 answers right after trying again.', 'mountain', 'green', 40, 15, (c) => [c.counters.persisted, 10]),
  a('streak-3', '3-Day Streak', 'Practise 3 days in a row.', 'flame', 'orange', 20, 5, (c) => [c.streakBest, 3]),
  a('streak-7', '7-Day Streak', 'Practise 7 days in a row.', 'flame', 'orange', 50, 20, (c) => [c.streakBest, 7]),
  a('streak-30', '30-Day Streak', 'Practise 30 days in a row.', 'flame', 'purple', 150, 60, (c) => [c.streakBest, 30]),
  a('quest-champion', 'Quest Champion', 'Complete 10 daily quests.', 'trophy', 'orange', 50, 20, (c) => [c.counters.quests, 10]),
  a('treasure-hunter', 'Treasure Hunter', 'Open 5 treasure chests.', 'chest', 'yellow', 30, 10, (c) => [c.counters.chests, 5]),
  a('gem-collector', 'Gem Collector', 'Earn 300 Math Gems.', 'gem', 'teal', 40, 0, (c) => [c.gemsEarned, 300]),
  a('hundred-club', 'Hundred Club', 'Answer 100 questions.', 'bolt', 'purple', 40, 15, (c) => [c.attempted, 100]),
  a('challenge-champion', 'Challenge Champion', 'Pass 3 challenges.', 'trophy', 'purple', 80, 30, (c) => [c.counters.challenges, 3]),
  a('skill-master', 'Skill Master', 'Master 5 skills.', 'star', 'blue', 80, 30, (c) => [masteredCount(c.skills), 5]),
];

export function achievementProgress(def: AchievementDef, ctx: AchievementContext): { value: number; target: number; done: boolean } {
  const [value, target] = def.progress(ctx);
  return { value: Math.min(value, target), target, done: value >= target };
}

export function newlyUnlocked(ctx: AchievementContext, unlocked: Record<string, number>): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => !(def.id in unlocked) && achievementProgress(def, ctx).done);
}
