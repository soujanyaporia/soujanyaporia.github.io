import { arithmeticGenerators } from './generators/arithmetic';
import type { Generator } from './generators/common';
import { gameGenerators, sequenceLimit } from './generators/games';
import { mulDivGenerators } from './generators/muldiv';
import { structureGenerators } from './generators/structures';
import { wordGenerators } from './generators/word';
import { LEVELS, MUL_LEVELS } from './levels';
import { Rng } from './random';
import type { FactConstraints, LevelId, Problem, SkillId, VisualKind } from './types';

export type TopicId =
  | 'addition'
  | 'subtraction'
  | 'missing'
  | 'bonds'
  | 'patterns'
  | 'reasoning'
  | 'equality'
  | 'multiplication'
  | 'division'
  | 'words'
  | 'translation';

export interface SkillInfo {
  id: SkillId;
  topic: TopicId;
  title: string;
  /** Tiny example of the question shape, shown on the Progress screen. */
  pattern: string;
  minLevel: LevelId;
  maxLevel: LevelId;
  /** Largest number a question at this level may use (checked by tests). */
  limit: (level: LevelId) => number;
}

const additive = (level: LevelId) => LEVELS[level].max;
const multiplicative = (level: LevelId) => MUL_LEVELS[level].maxProduct;
const mixed = (level: LevelId) => Math.max(additive(level), multiplicative(level));

const skill = (
  id: SkillId,
  topic: TopicId,
  title: string,
  pattern: string,
  limit: (level: LevelId) => number = additive,
  minLevel: LevelId = 1,
  maxLevel: LevelId = 5,
): SkillInfo => ({ id, topic, title, pattern, limit, minLevel, maxLevel });

/** Skill metadata. A skill is the unit of mastery tracking and adaptation. */
export const SKILLS: Record<SkillId, SkillInfo> = {
  'add.result': skill('add.result', 'addition', 'Adding', '3 + 4 = □'),
  'add.result_left': skill('add.result_left', 'addition', 'Adding, answer first', '□ = 3 + 4'),
  'sub.result': skill('sub.result', 'subtraction', 'Taking away', '7 − 3 = □'),
  'sub.result_left': skill('sub.result_left', 'subtraction', 'Taking away, answer first', '□ = 7 − 3'),
  'add.missing_first': skill('add.missing_first', 'missing', 'Missing first number', '□ + 3 = 7'),
  'add.missing_second': skill('add.missing_second', 'missing', 'Missing number to add', '4 + □ = 7'),
  'sub.missing_first': skill('sub.missing_first', 'missing', 'Missing starting number', '□ − 3 = 4'),
  'sub.missing_second': skill('sub.missing_second', 'missing', 'Missing number taken away', '7 − □ = 4'),
  'sub.inverse': skill('sub.inverse', 'subtraction', 'Think addition to subtract', '3 + □ = 7'),
  'bond.part': skill('bond.part', 'bonds', 'Number bonds', '7 is 3 and □'),
  'bond.make': skill('bond.make', 'bonds', 'Make the number', '□ + □ = 10'),
  'pattern.sequence': skill('pattern.sequence', 'patterns', 'Number patterns', '2, 4, 6, □', sequenceLimit),
  truefalse: skill('truefalse', 'reasoning', 'True or false?', '3 + 4 = 8 ?'),
  'compare.expr': skill('compare.expr', 'reasoning', 'More, less or equal?', '3 + 4 ○ 8'),
  'equality.balance': skill('equality.balance', 'equality', 'Balancing both sides', '3 + 2 = 4 + □'),
  'mul.groups': skill('mul.groups', 'multiplication', 'Equal groups', '3 groups of 4', multiplicative),
  'mul.array': skill('mul.array', 'multiplication', 'Arrays', '3 rows of 4', multiplicative),
  'mul.repeated': skill('mul.repeated', 'multiplication', 'Adding equal groups', '4 + 4 + 4 = 3 × 4', multiplicative),
  'mul.turnaround': skill('mul.turnaround', 'multiplication', 'Turn-around facts', '3 × 4 = 4 × □', multiplicative),
  'mul.result': skill('mul.result', 'multiplication', 'Times facts', '3 × 4 = □', multiplicative),
  'mul.missing': skill('mul.missing', 'multiplication', 'Missing factor', '□ × 4 = 12', multiplicative),
  'div.sharing': skill('div.sharing', 'division', 'Sharing equally', '12 shared by 3', multiplicative),
  'div.grouping': skill('div.grouping', 'division', 'Making equal groups', '12 in groups of 4', multiplicative),
  'div.inverse': skill('div.inverse', 'division', 'Division and times facts', '□ × 3 = 12', multiplicative),
  'div.result': skill('div.result', 'division', 'Division facts', '12 ÷ 3 = □', multiplicative),
  'word.add': skill('word.add', 'words', 'Addition stories', 'Put together'),
  'word.sub': skill('word.sub', 'words', 'Subtraction stories', 'Take away'),
  'word.compare': skill('word.compare', 'words', 'Comparing stories', 'How many more?'),
  'word.missing': skill('word.missing', 'words', 'Missing-number stories', 'How many at first?'),
  'word.mul': skill('word.mul', 'words', 'Multiplication stories', 'Equal groups', multiplicative),
  'word.div': skill('word.div', 'words', 'Division stories', 'Sharing and grouping', multiplicative),
  'word.choose': skill('word.choose', 'translation', 'Add or subtract?', 'Pick the equation'),
  'word.build': skill('word.build', 'translation', 'Write the equation', 'Build, then solve'),
  'word.tricky': skill('word.tricky', 'translation', 'Tricky words', '"fewer" can mean add'),
  'word.op': skill('word.op', 'translation', 'Which calculation?', '+ − × ÷', mixed),
  'word.match': skill('word.match', 'translation', 'Which story matches?', '8 − 3 = 5', mixed),
  'word.action': skill('word.action', 'translation', 'What happened?', 'Joined? Taken away?', additive),
  'word.translate': skill('word.translate', 'translation', 'Story to equation', 'Read, model, write, solve', additive),
};

export const ALL_SKILLS = Object.keys(SKILLS) as SkillId[];

const GENERATORS: Partial<Record<SkillId, Generator>> = {
  ...arithmeticGenerators,
  ...structureGenerators,
  ...mulDivGenerators,
  ...gameGenerators,
  ...wordGenerators,
};

export function hasGenerator(id: SkillId): boolean {
  return GENERATORS[id] !== undefined;
}

/** What to generate. Lessons, practice and mixed sessions all speak this. */
export interface ProblemRequest {
  skill: SkillId;
  level: LevelId;
  constraints?: FactConstraints;
  visual?: VisualKind;
  variant?: string;
}

export function clampLevel(id: SkillId, level: LevelId): LevelId {
  const info = SKILLS[id];
  return Math.min(info.maxLevel, Math.max(info.minLevel, level)) as LevelId;
}

/** Deterministic: the same request and seed always give the same problem. */
export function generateProblem(req: ProblemRequest, seed: number, avoidFrames?: ReadonlySet<string>): Problem {
  const generator = GENERATORS[req.skill];
  if (!generator) throw new Error(`No generator registered for skill "${req.skill}"`);
  return generator(new Rng(seed), {
    level: clampLevel(req.skill, req.level),
    seed,
    constraints: req.constraints,
    visual: req.visual,
    variant: req.variant,
    avoidFrames,
  });
}
