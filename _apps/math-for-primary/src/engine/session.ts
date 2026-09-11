import { Rng } from './random';
import { generateProblem, type ProblemRequest } from './skills';
import type { Problem } from './types';

export interface SessionOptions {
  /** Order questions from easier to harder (a gentle warm-up). */
  sortByDifficulty?: boolean;
}

export const storyOf = (p: Problem) =>
  p.kind === 'choice' || p.kind === 'translate' ? p.story : p.kind === 'number' ? p.story : undefined;

const storyFrame = (p: Problem): string | undefined => storyOf(p)?.frameId;

const answerKey = (p: Problem): string | undefined =>
  p.kind === 'number' || p.kind === 'translate' || p.kind === 'sequence' ? String(p.answer) : undefined;

/**
 * Turn a list of requests into concrete problems for one session.
 * Guarantees (when the level allows it): no repeated question, no repeated
 * story frame, and no identical answers back to back.
 */
export function buildSession(
  requests: readonly ProblemRequest[],
  seed: number,
  opts: SessionOptions = {},
): Problem[] {
  // Retry the whole assignment when early picks consume a later constrained pool.
  for (let assignment = 0; assignment < 50; assignment++) {
    const rng = new Rng(seed + assignment * 104729);
    const usedIds = new Set<string>();
    const usedFrames = new Set<string>();
    const problems: Problem[] = [];
    let previousAnswer: string | undefined;

    for (const request of requests) {
      let fallback: Problem | undefined;
      let chosen: Problem | undefined;
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = generateProblem(request, rng.int(1, 0x7fffffff), usedFrames);
        const fresh = !usedIds.has(candidate.id);
        if (!fallback || (fresh && usedIds.has(fallback.id))) fallback = candidate;
        if (!fresh) continue;
        const frame = storyFrame(candidate);
        if (frame && usedFrames.has(frame) && attempt < 20) continue;
        if (previousAnswer !== undefined && answerKey(candidate) === previousAnswer && attempt < 12) continue;
        chosen = candidate;
        break;
      }
      const problem = chosen ?? fallback!;
      if (usedIds.has(problem.id)) break;
      usedIds.add(problem.id);
      const frame = storyFrame(problem);
      if (frame) usedFrames.add(frame);
      previousAnswer = answerKey(problem);
      problems.push(problem);
    }

    if (problems.length !== requests.length) continue;
    if (opts.sortByDifficulty) {
      return problems
        .map((p, i) => ({ p, i }))
        .sort((x, y) => x.p.difficulty - y.p.difficulty || x.i - y.i)
        .map(({ p }) => p);
    }
    return problems;
  }
  throw new Error("These constraints do not allow enough different questions. Try fewer questions or a wider number range.");
}

/** A repeat of the same skill/level: used for topic practice. */
export function repeatRequest(request: ProblemRequest, count: number): ProblemRequest[] {
  return Array.from({ length: count }, () => ({ ...request }));
}
