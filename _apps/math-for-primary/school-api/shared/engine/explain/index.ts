import type { Explanation, Problem } from '../types';
import { explainMissing, explainResult } from './arithmetic';
import { explainMake, explainSequence } from './games';
import { explainMulDiv } from './muldiv';
import { explainBond, explainCompare, explainEquality, explainTrueFalse } from './other';
import { explainMatch, explainStory } from './story';

/**
 * Produce the worked solution, the progressive hints and alternative
 * strategies for any problem. Explanations are pure data (text + visual
 * specs + equation tokens) assembled from composable strategies, so they
 * can be tested, reused by every screen, and later swapped for AI-written
 * ones without touching the UI.
 */
export function explain(problem: Problem): Explanation {
  switch (problem.kind) {
    case 'truefalse':
      return explainTrueFalse(problem);
    case 'relation':
      return explainCompare(problem);
    case 'choice':
    case 'translate':
      return explainStory(problem);
    case 'match':
      return explainMatch(problem);
    case 'make':
      return explainMake(problem);
    case 'sequence':
      return explainSequence(problem);
    case 'number':
      if (problem.format === 'story') return explainStory(problem);
      if (problem.format === 'bond') return explainBond(problem);
      if (problem.skill === 'equality.balance') return explainEquality(problem);
      if (problem.skill.startsWith('mul.') || problem.skill.startsWith('div.') || problem.skill === 'sub.inverse') return explainMulDiv(problem);
      if (problem.skill.includes('missing')) return explainMissing(problem);
      return explainResult(problem);
  }
}

export { storyModel, whatWeKnow } from './story';
export { computeHints, explainFact } from './strategies';
