import { useCallback, useRef, useState } from 'react';
import { bandIndex, masteryBand, type StatsMap } from '../engine/adaptive';
import { storyOf } from '../engine/session';
import { SKILLS } from '../engine/skills';
import type { Problem, SkillId } from '../engine/types';
import type { AnswerInfo, QuestionOutcome, Reward } from '../game/engine';
import type { SessionKind } from '../state/progress';
import type { AnswerReport } from '../question/QuestionPlayer';
import { useGame } from '../state/GameContext';

const MISSING: SkillId[] = ['add.missing_first', 'add.missing_second', 'sub.missing_first', 'sub.missing_second', 'bond.part', 'mul.missing', 'div.inverse', 'sub.inverse', 'word.missing'];

export function formatOf(p: Problem): string {
  if (p.kind === 'number') return p.format === 'equation' ? p.picture?.type ?? 'equation' : p.format;
  return p.kind;
}

export function answerInfo(p: Problem, report: AnswerReport): AnswerInfo {
  return {
    skill: p.skill,
    level: p.level,
    topic: SKILLS[p.skill].topic,
    format: formatOf(p),
    words: !!storyOf(p) || p.kind === 'match',
    missing: MISSING.includes(p.skill),
    built: !!report.built,
  };
}

/** Story-to-equation scaffolding fades as the skill grows. */
export function scaffoldFor(stats: StatsMap): 'full' | 'partial' | 'none' {
  const band = bandIndex(masteryBand(stats['word.translate']));
  if (band >= bandIndex('almost')) return 'none';
  if (band >= bandIndex('practising')) return 'partial';
  return 'full';
}

/**
 * Records answers and sessions through the game reducer and keeps every
 * reward earned during the session for the summary screen.
 */
export function useRecorder() {
  const { dispatch, state } = useGame();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [inRow, setInRow] = useState(0);
  const before = useRef<StatsMap>(state.skills);

  const record = useCallback(
    (p: Problem, report: AnswerReport) => {
      const r = dispatch({ type: 'answer', info: answerInfo(p, report), outcome: report, misconception: report.misconception, at: Date.now() });
      setRewards((prev) => [...prev, ...r]);
      setInRow((n) => (report.firstTry && report.hints === 0 && !report.revealed ? n + 1 : 0));
    },
    [dispatch],
  );

  const complete = useCallback(
    (kind: SessionKind, outcomes: QuestionOutcome[], opts: { nodeId?: string; gemReward?: number; passed?: boolean } = {}) => {
      const r = dispatch({ type: 'session', kind, outcomes, ...opts, at: Date.now() });
      setRewards((prev) => [...prev, ...r]);
      return r;
    },
    [dispatch],
  );

  return { record, complete, rewards, inRow, skillsBefore: before.current };
}
