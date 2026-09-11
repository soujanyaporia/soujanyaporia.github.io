import { scoreDifficulty } from '../difficulty';
import type { Rng } from '../random';
import type { FactConstraints, LevelId, Problem, VisualKind } from '../types';

export interface GenParams {
  level: LevelId;
  /** Recorded on the problem so it can be regenerated exactly. */
  seed: number;
  constraints?: FactConstraints;
  /** Force a representation (lessons use this to vary worked examples). */
  visual?: VisualKind;
  /** Generator-specific variant, e.g. a particular story structure. */
  variant?: string;
  /** Story frames already used in this session (for variety). */
  avoidFrames?: ReadonlySet<string>;
}

export type Generator = (rng: Rng, params: GenParams) => Problem;

type WithoutDifficulty<P> = P extends Problem ? Omit<P, 'difficulty'> : never;

/** Adds the difficulty score computed from the problem's features. */
export function finish<P extends Problem>(problem: WithoutDifficulty<P>): P {
  return { ...problem, difficulty: scoreDifficulty(problem.features) } as unknown as P;
}
