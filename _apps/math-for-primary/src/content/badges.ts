import { masteryBand } from '../engine/adaptive';
import type { SkillId } from '../engine/types';
import type { ProgressState } from '../state/progress';

export type BadgeIcon = 'seed' | 'star' | 'plus' | 'minus' | 'search' | 'book' | 'scale' | 'flame' | 'mountain' | 'bolt';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'yellow';
  earned: (s: ProgressState) => boolean;
}

const mastered = (s: ProgressState, id: SkillId) => masteryBand(s.skills[id]) === 'mastered';

export const BADGES: readonly BadgeDef[] = [
  {
    id: 'first-lesson',
    title: 'First steps',
    description: 'Finish your first lesson.',
    icon: 'seed',
    color: 'green',
    earned: (s) => Object.values(s.nodes).some((l) => l.completions > 0),
  },
  {
    id: 'questions-25',
    title: 'Busy bee',
    description: 'Answer 25 questions.',
    icon: 'bolt',
    color: 'yellow',
    earned: (s) => s.totals.attempted >= 25,
  },
  {
    id: 'questions-100',
    title: 'Hundred club',
    description: 'Answer 100 questions.',
    icon: 'mountain',
    color: 'purple',
    earned: (s) => s.totals.attempted >= 100,
  },
  {
    id: 'three-stars',
    title: 'Star lesson',
    description: 'Get 3 stars in a lesson.',
    icon: 'star',
    color: 'yellow',
    earned: (s) => Object.values(s.nodes).some((l) => l.bestStars >= 3),
  },
  {
    id: 'adding-ace',
    title: 'Adding ace',
    description: 'Master adding.',
    icon: 'plus',
    color: 'blue',
    earned: (s) => mastered(s, 'add.result'),
  },
  {
    id: 'take-away-ace',
    title: 'Take-away ace',
    description: 'Master taking away.',
    icon: 'minus',
    color: 'orange',
    earned: (s) => mastered(s, 'sub.result'),
  },
  {
    id: 'detective',
    title: 'Number detective',
    description: 'Master two kinds of missing-number questions.',
    icon: 'search',
    color: 'teal',
    earned: (s) =>
      (['add.missing_first', 'add.missing_second', 'sub.missing_first', 'sub.missing_second'] as SkillId[]).filter((id) =>
        mastered(s, id),
      ).length >= 2,
  },
  {
    id: 'storyteller',
    title: 'Story solver',
    description: 'Master addition and subtraction stories.',
    icon: 'book',
    color: 'purple',
    earned: (s) => mastered(s, 'word.add') && mastered(s, 'word.sub'),
  },
  {
    id: 'balancer',
    title: 'Balance keeper',
    description: 'Master balancing both sides of =.',
    icon: 'scale',
    color: 'teal',
    earned: (s) => mastered(s, 'equality.balance'),
  },
  {
    id: 'never-give-up',
    title: 'Never give up',
    description: 'Get a tricky question right after trying again.',
    icon: 'mountain',
    color: 'green',
    earned: (s) => s.recent.some((o) => o.correct && !o.revealed && o.tries >= 3),
  },
  {
    id: 'streak-3',
    title: '3-day streak',
    description: 'Practise 3 days in a row.',
    icon: 'flame',
    color: 'orange',
    earned: (s) => s.streak.best >= 3,
  },
  {
    id: 'streak-7',
    title: '7-day streak',
    description: 'Practise 7 days in a row.',
    icon: 'flame',
    color: 'orange',
    earned: (s) => s.streak.best >= 7,
  },
];

/** Badges newly earned in this state (not yet recorded). */
export function newBadges(state: ProgressState): BadgeDef[] {
  return BADGES.filter((b) => !state.badges.includes(b.id) && b.earned(state));
}
