import { storyOf } from '../engine/session';
import { generateProblem } from '../engine/skills';
import type { Problem } from '../engine/types';
import { starsFor, type QuestionOutcome } from '../game/engine';
import type { DotResult } from '../ui/common';

export { starsFor };

export const dotResults = (outcomes: QuestionOutcome[]): DotResult[] => outcomes.map((o) => (o.firstTry ? 'star' : 'done'));

/** "One more like this": same skill and shape, new numbers, never a repeat. */
export function similarProblem(p: Problem, existing: Problem[], seed: number): Problem {
  const used = new Set(existing.map((x) => x.id));
  const frames = new Set(existing.flatMap((x) => (storyOf(x) ? [storyOf(x)!.frameId] : [])));
  const variant = storyOf(p)?.structure;
  let candidate = p;
  for (let i = 0; i < 20; i++) {
    candidate = generateProblem({ skill: p.skill, level: p.level, variant }, seed + i * 7919, frames);
    if (!used.has(candidate.id)) return candidate;
  }
  return candidate;
}
