import { featuresFor } from '../difficulty';
import { equationText, factToEquation, type FactPart } from '../equation';
import { sampleFact } from '../levels';
import type { Rng } from '../random';
import type {
  ConceptModel,
  LevelId,
  NumberProblem,
  Op,
  SkillId,
  UnknownPosition,
  VisualKind,
} from '../types';
import { finish, type Generator } from './common';

/**
 * Equation skills are all "a fact with one part hidden". One table drives
 * eight skills, so a new equation shape is one more row, not new logic.
 */
interface EquationSkill {
  skill: SkillId;
  op: Op;
  hide: FactPart;
  reversed?: boolean;
  unknown: UnknownPosition;
  model: ConceptModel;
  visual: (level: LevelId, rng: Rng) => VisualKind;
}

const smallCountersElseLine = (level: LevelId, rng: Rng): VisualKind =>
  level <= 2 ? (rng.chance(0.6) ? 'counters' : 'numberline') : 'numberline';

const partWholeVisual = (level: LevelId, rng: Rng): VisualKind =>
  level <= 2 ? (rng.chance(0.5) ? 'counters' : 'bar') : 'bar';

const EQUATION_SKILLS: EquationSkill[] = [
  { skill: 'add.result', op: '+', hide: 'c', unknown: 'result', model: 'join', visual: smallCountersElseLine },
  {
    skill: 'add.result_left',
    op: '+',
    hide: 'c',
    reversed: true,
    unknown: 'result',
    model: 'join',
    visual: smallCountersElseLine,
  },
  { skill: 'add.missing_first', op: '+', hide: 'a', unknown: 'first', model: 'part-whole', visual: partWholeVisual },
  {
    skill: 'add.missing_second',
    op: '+',
    hide: 'b',
    unknown: 'second',
    model: 'part-whole',
    visual: (level, rng) => (level <= 2 && rng.chance(0.4) ? 'counters' : 'numberline'),
  },
  { skill: 'sub.result', op: '-', hide: 'c', unknown: 'result', model: 'takeaway', visual: smallCountersElseLine },
  {
    skill: 'sub.result_left',
    op: '-',
    hide: 'c',
    reversed: true,
    unknown: 'result',
    model: 'takeaway',
    visual: smallCountersElseLine,
  },
  { skill: 'sub.missing_first', op: '-', hide: 'a', unknown: 'first', model: 'part-whole', visual: partWholeVisual },
  {
    skill: 'sub.missing_second',
    op: '-',
    hide: 'b',
    unknown: 'second',
    model: 'takeaway',
    visual: (level, rng) => (level <= 2 && rng.chance(0.6) ? 'counters' : 'bar'),
  },
];

function makeEquationGenerator(spec: EquationSkill): Generator {
  return (rng, { level, seed, constraints, visual }) => {
    const fact = sampleFact(rng, level, spec.op, constraints);
    const equation = factToEquation(fact, spec.hide, spec.reversed);
    const features = featuresFor(fact, {
      unknown: spec.unknown,
      equalityForm: spec.reversed ? 'reversed' : 'standard',
    });
    return finish<NumberProblem>({
      id: `${spec.skill}|${equationText(equation)}`,
      skill: spec.skill,
      level,
      seed,
      kind: 'number',
      format: 'equation',
      fact,
      equation,
      answer: fact[spec.hide],
      features,
      model: spec.model,
      visual: visual ?? spec.visual(level, rng),
    });
  };
}

export const arithmeticGenerators: Partial<Record<SkillId, Generator>> = Object.fromEntries(
  EQUATION_SKILLS.map((spec) => [spec.skill, makeEquationGenerator(spec)]),
);
