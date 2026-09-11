/**
 * XP and player levels.
 *
 * XP rewards effort and understanding, never speed: every answered
 * question earns something, first-try answers without hints earn a little
 * more, and getting there after a mistake is rewarded too.
 * Player level is about how much you have practised — it says nothing
 * about how "good at maths" a child is (that is what mastery is for).
 */
export const XP_RULES = {
  correct: 5,
  cleanBonus: 3,
  persisted: 2,
  revealed: 1,
  lesson: 25,
  perfectLesson: 10,
  practice: 10,
  game: 15,
  review: 15,
  challenge: 40,
} as const;

export interface AnswerForXp {
  correct: boolean;
  firstTry: boolean;
  hints: number;
  revealed: boolean;
}

export function xpForAnswer(o: AnswerForXp): number {
  if (o.revealed || !o.correct) return XP_RULES.revealed;
  if (o.firstTry && o.hints === 0) return XP_RULES.correct + XP_RULES.cleanBonus;
  if (!o.firstTry) return XP_RULES.correct + XP_RULES.persisted;
  return XP_RULES.correct;
}

export const LEVEL_TITLES = [
  'Number Explorer',
  'Addition Adventurer',
  'Equation Explorer',
  'Pattern Finder',
  'Story Solver',
  'Group Builder',
  'Array Architect',
  'Fact Family Friend',
  'Division Detective',
  'Maths Navigator',
  'Puzzle Master',
  'Number Wizard',
] as const;

/** Total XP needed to reach a level (level 1 starts at 0). */
export function levelThreshold(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 2; n <= level; n++) total += 60 + 30 * (n - 2);
  return total;
}

export interface PlayerLevel {
  level: number;
  title: string;
  /** XP gained inside this level, and the XP needed for the next one. */
  into: number;
  needed: number;
  progress: number;
}

export function playerLevel(xp: number): PlayerLevel {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  const start = levelThreshold(level);
  const next = levelThreshold(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    into: xp - start,
    needed: next - start,
    progress: (xp - start) / (next - start),
  };
}
