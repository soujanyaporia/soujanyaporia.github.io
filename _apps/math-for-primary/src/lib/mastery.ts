import { ENABLED_TOPICS } from '../content/topics';
import { BAND_LABEL, masteryBand, type SkillStats, type StatsMap } from '../engine/adaptive';
import type { LevelId, SkillId } from '../engine/types';
import { LESSONS } from '../content/lessons';
import type { ProgressState } from '../state/progress';

export interface MasteryView {
  /** 0–4 filled pips. */
  pips: number;
  label: string;
}

export function skillMastery(s: SkillStats | undefined): MasteryView {
  const band = masteryBand(s);
  if (!s || band === 'new') return { pips: 0, label: BAND_LABEL.new };
  const pips = band === 'mastered' ? 4 : Math.max(1, Math.min(3, Math.round(s.mastery * 4)));
  return { pips, label: BAND_LABEL[band] };
}

/** Average over the skills that have been practised. */
export function topicMastery(stats: StatsMap, skills: SkillId[]): MasteryView {
  const practised = skills.map((id) => stats[id]).filter((s): s is SkillStats => !!s && s.attempts > 0);
  if (practised.length === 0) return { pips: 0, label: BAND_LABEL.new };
  const views = practised.map(skillMastery);
  const pips = Math.round(views.reduce((sum, v) => sum + v.pips, 0) / skills.length);
  const label = pips >= 4 ? BAND_LABEL.mastered : pips >= 3 ? BAND_LABEL.practising : BAND_LABEL.learning;
  return { pips: Math.max(1, pips), label };
}

/** A starting level for practice: the working level of the weakest skill. */
export function suggestedLevel(stats: StatsMap, skills: SkillId[]): LevelId {
  const levels = skills.map((id) => stats[id]?.level).filter((l): l is LevelId => l !== undefined);
  return levels.length ? (Math.min(...levels) as LevelId) : 2;
}

/** Skills available to mixed practice: learned in lessons or already practised. */
export function mixedPool(progress: ProgressState): SkillId[] {
  const pool = new Set<SkillId>();
  for (const lesson of LESSONS) {
    if (progress.nodes[lesson.id]?.completions) lesson.skills.forEach((s) => pool.add(s));
  }
  for (const [id, s] of Object.entries(progress.skills)) {
    if (s && s.attempts > 0) pool.add(id as SkillId);
  }
  if (pool.size < 3) {
    (['add.result', 'sub.result', 'add.missing_first', 'sub.missing_second'] as SkillId[]).forEach((s) => pool.add(s));
  }
  const enabled = new Set(ENABLED_TOPICS.flatMap(t => t.skills));
  return [...pool].filter(id => enabled.has(id));
}

export function nextLessonFor(progress: ProgressState) {
  return LESSONS.find((l) => !progress.nodes[l.id]?.completions) ?? LESSONS[LESSONS.length - 1];
}
