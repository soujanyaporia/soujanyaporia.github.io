import { featuresFor } from '../difficulty';
import { applyOp, factFamily, factText, INVERSE, isAdditive, sameCalculation, sameFact } from '../equation';
import { LEVELS, makeFact, sampleFact } from '../levels';
import type { Rng } from '../random';
import type {
  ActionId,
  ChoiceProblem,
  DifficultyFeatures,
  Fact,
  LevelId,
  MatchProblem,
  NumberProblem,
  Op,
  SkillId,
  Story,
  StoryStructure,
  TileSpec,
  TranslateProblem,
  TranslateStep,
  VisualKind,
} from '../types';
import { matchOptions, miniContext } from '../word/mini';
import { buildStory } from '../word/story';
import { STRUCTURES } from '../word/storyMath';
import { finish, type GenParams, type Generator } from './common';

export type WordSkill =
  | 'word.add'
  | 'word.sub'
  | 'word.compare'
  | 'word.missing'
  | 'word.choose'
  | 'word.build'
  | 'word.mul'
  | 'word.div'
  | 'word.tricky'
  | 'word.op'
  | 'word.action'
  | 'word.translate';

type Mix = readonly (readonly [StoryStructure, number])[];
const from = (level: LevelId, min: LevelId, weight: number) => (level >= min ? weight : 0);

/** Which story structures each story skill draws on, by level. */
const MIXES: Record<WordSkill, (level: LevelId) => Mix> = {
  'word.add': (l) => [
    ['join.result', 5],
    ['combine.whole', 4],
    ['compare.more', from(l, 2, 1.5)],
  ],
  'word.sub': (l) => [
    ['separate.result', 6],
    ['combine.part', l >= 2 ? 2.5 : 1],
    ['compare.fewer', from(l, 2, 1.5)],
  ],
  'word.compare': () => [
    ['compare.difference', 5],
    ['compare.more', 2.5],
    ['compare.fewer', 2.5],
  ],
  'word.missing': () => [
    ['join.change', 3],
    ['separate.change', 3],
    ['join.start', 2],
    ['separate.start', 2],
  ],
  'word.choose': (l) => [
    ['join.result', 4],
    ['separate.result', 4],
    ['combine.whole', 2],
    ['compare.difference', from(l, 2, 2)],
  ],
  'word.build': (l) => [
    ['join.result', 4],
    ['separate.result', 4],
    ['combine.whole', 2],
    ['combine.part', from(l, 2, 1.5)],
    ['compare.difference', from(l, 2, 1.5)],
    ['join.change', from(l, 2, 1)],
    ['separate.change', from(l, 2, 1)],
    ['join.start', from(l, 3, 1)],
    ['separate.start', from(l, 3, 1)],
  ],
  'word.mul': () => [
    ['groups.total', 4],
    ['array.total', 3],
    ['rate.total', 2],
  ],
  'word.div': (l) => [
    ['share.each', 4],
    ['group.count', 4],
    ['groups.size', from(l, 3, 2)],
  ],
  'word.tricky': () => [
    ['compare.more_ref', 3],
    ['compare.fewer_ref', 3],
    ['compare.fewer', 2],
    ['compare.more', 2],
  ],
  'word.op': (l) => [
    ['join.result', 2],
    ['separate.result', 2],
    ['combine.part', 1],
    ['compare.difference', 1.5],
    ['groups.total', from(l, 2, 2)],
    ['array.total', from(l, 3, 1)],
    ['share.each', from(l, 2, 2)],
    ['group.count', from(l, 3, 1.5)],
  ],
  'word.action': (l) => [
    ['join.result', 2],
    ['separate.result', 2],
    ['combine.whole', 1.5],
    ['combine.part', 1],
    ['compare.difference', 1.5],
    ['join.start', from(l, 2, 1)],
    ['separate.change', from(l, 2, 1)],
  ],
  'word.translate': (l) => [
    ['join.result', 2],
    ['separate.result', 2],
    ['combine.part', 1.5],
    ['compare.difference', 1.5],
    ['join.start', from(l, 2, 1.5)],
    ['join.change', from(l, 2, 1)],
    ['separate.change', from(l, 2, 1)],
    ['separate.start', from(l, 2, 1)],
  ],
};

export function structuresFor(skill: WordSkill, level: LevelId): StoryStructure[] {
  return MIXES[skill](level)
    .filter(([, w]) => w > 0)
    .map(([s]) => s);
}

interface Draft {
  fact: Fact;
  story: Story;
  structure: StoryStructure;
}

function draft(rng: Rng, params: GenParams, skill: WordSkill): Draft {
  const { level, constraints } = params;
  const allowed = structuresFor(skill, level);
  const structure =
    params.variant && allowed.includes(params.variant as StoryStructure)
      ? (params.variant as StoryStructure)
      : rng.weighted(MIXES[skill](level).filter(([, w]) => w > 0));
  const info = STRUCTURES[structure];
  const extra = level >= 3 && isAdditive(info.op) && rng.chance(0.3);
  for (let attempt = 0; attempt < 60; attempt++) {
    const fact = sampleFact(rng, level, info.op, { ...constraints, minOperand: Math.max(1, constraints?.minOperand ?? 1) });
    const story = buildStory(rng, structure, fact, {
      extra,
      maxExtra: Math.min(LEVELS[level].max, 20),
      avoidFrames: params.avoidFrames,
    });
    if (story) return { fact, story, structure };
  }
  throw new Error(`No story frame fits ${structure} at level ${level}`);
}

function storyFeatures(d: Draft, construction = false): DifficultyFeatures {
  const { story, structure } = d;
  const info = STRUCTURES[structure];
  const numbers = Object.entries(story.quantities)
    .filter(([role]) => role !== 'extra')
    .map(([, value]) => value as number);
  return featuresFor(story.solve, {
    maxNumber: Math.max(...numbers),
    unknown: info.position,
    wording: info.wording,
    distractor: story.quantities.extra !== undefined,
    construction,
    comparison: structure.startsWith('compare'),
  });
}

const VISUAL_OF: Record<string, VisualKind> = { groups: 'groups', array: 'array', share: 'share', grouping: 'share' };
const visualFor = (d: Draft): VisualKind => VISUAL_OF[STRUCTURES[d.structure].model] ?? 'bar';

const keyOf = (skill: SkillId, d: Draft) => `${skill}|${d.structure}|${d.fact.a},${d.fact.b},${d.fact.c}`;

function base(skill: SkillId, params: GenParams, d: Draft) {
  return {
    id: keyOf(skill, d),
    skill,
    level: params.level,
    seed: params.seed,
    story: d.story,
    fact: d.story.solve,
    model: STRUCTURES[d.structure].model,
    visual: visualFor(d),
    item: d.story.unit.item,
  };
}

function solveGenerator(skill: WordSkill): Generator {
  return (rng, params) => {
    const d = draft(rng, params, skill);
    return finish<NumberProblem>({
      ...base(skill, params, d),
      kind: 'number',
      format: 'story',
      equation: d.story.equation,
      answer: d.story.solve.c,
      features: storyFeatures(d),
      visual: params.visual ?? visualFor(d),
    });
  };
}

// ---------------------------------------------------------------- choosing a calculation

const valid = (f: Fact) => f.a >= 0 && f.b >= 0 && f.c >= 0 && Number.isInteger(f.c) && !(f.op === '/' && f.b === 0);

/**
 * Wrong options are true equations that do not fit the story (another
 * operation, or a misread number). The correct fact's whole family is
 * excluded so a second "correct" option can never appear.
 */
export function distractorsFor(rng: Rng, correct: Fact, story: Story): Fact[] {
  const family = factFamily(correct);
  const { a, b, op } = correct;
  const others: Op[] = isAdditive(op) ? [INVERSE[op]] : ['+', INVERSE[op]];
  const otherOps = others.map((o) => (o === '-' || o === '/' ? makeFact(o, Math.max(a, b), Math.min(a, b)) : makeFact(o, a, b)));
  const nudged = [makeFact(op, a + 1, b), makeFact(op, a, b + 1), makeFact(op, a - 1, b), makeFact(op, a, b - 1)];
  const extra = story.quantities.extra;
  if (extra !== undefined) nudged.push(makeFact(op, Math.max(a, extra), Math.min(a, extra)));

  const seen = new Set<string>([factText(correct)]);
  const pick: Fact[] = [];
  for (const f of [...otherOps, ...rng.shuffle(nudged)]) {
    const key = factText(f);
    if (!valid(f) || seen.has(key) || family.some((g) => sameFact(f, g))) continue;
    seen.add(key);
    pick.push(f);
    if (pick.length === 2) break;
  }
  return pick;
}

/**
 * "Which calculation answers the question?" with + − × ÷. Every wrong
 * option uses the story's numbers but gives a different value.
 */
export function operationOptions(rng: Rng, correct: Fact): Fact[] {
  const [x, y] = [correct.a, correct.b];
  const big = Math.max(x, y);
  const small = Math.min(x, y);
  const candidates: Fact[] = [
    makeFact('+', x, y),
    makeFact('-', big, small),
    makeFact('*', x, y),
    makeFact('/', big, small),
    makeFact('/', correct.c, y),
    makeFact('-', correct.c, y),
  ];
  const seen = new Set<string>();
  const pick: Fact[] = [];
  for (const f of rng.shuffle(candidates)) {
    const key = `${f.a}${f.op}${f.b}`;
    if (!valid(f) || f.c === correct.c || sameCalculation(f, correct) || seen.has(key)) continue;
    seen.add(key);
    pick.push(f);
    if (pick.length === 3) break;
  }
  return pick;
}

function choiceGenerator(skill: 'word.choose' | 'word.op'): Generator {
  return (rng, params) => {
    const d = draft(rng, params, skill);
    const correct = d.story.solve;
    const wrong = skill === 'word.op' ? operationOptions(rng, correct) : distractorsFor(rng, correct, d.story);
    const options = [correct, ...wrong];
    const order = rng.shuffle(options.map((_, i) => i));
    return finish<ChoiceProblem>({
      ...base(skill, params, d),
      kind: 'choice',
      options: order.map((i) => options[i]),
      style: skill === 'word.op' ? 'expression' : 'equation',
      answer: order.indexOf(0),
      features: storyFeatures(d, true),
    });
  };
}

// ---------------------------------------------------------------- which story matches?

const matchGenerator: Generator = (rng, params) => {
  const { level } = params;
  const ops: Op[] = level <= 2 ? ['+', '-'] : level === 3 ? ['+', '-', '*'] : ['+', '-', '*', '/'];
  for (let attempt = 0; attempt < 60; attempt++) {
    const op = (params.variant as Op | undefined) && ops.includes(params.variant as Op) ? (params.variant as Op) : rng.pick(ops);
    const fact = sampleFact(rng, level, op, { minOperand: 1, ...params.constraints });
    if (fact.a === fact.b) continue;
    const ctx = miniContext(rng);
    const options = matchOptions(rng, fact, level >= 3, ctx);
    if (!options) continue;
    const order = rng.shuffle([0, 1, 2]);
    return finish<MatchProblem>({
      id: `word.match|${factText(fact)}`,
      skill: 'word.match',
      level,
      seed: params.seed,
      kind: 'match',
      equation: fact,
      options: order.map((i) => options[i].text),
      optionFacts: order.map((i) => options[i].fact),
      answer: order.indexOf(0),
      fact,
      features: featuresFor(fact, { wording: 'moderate', unknown: 'none' }),
      model: fact.op === '*' ? 'groups' : fact.op === '/' ? 'share' : fact.op === '+' ? 'join' : 'takeaway',
      visual: 'bar',
      item: ctx.unit.item,
    });
  }
  throw new Error(`Could not build a story-matching problem at level ${level}`);
};

// ---------------------------------------------------------------- story → equation

const ACTIONS_EARLY: ActionId[] = ['join', 'separate', 'partwhole', 'compare'];
const ACTIONS_LATER: ActionId[] = ['join', 'separate', 'groups', 'share'];

export function actionChoices(story: Story, _level: LevelId): ActionId[] {
  const multiplicative = !isAdditive(story.solve.op) || !isAdditive(STRUCTURES[story.structure].op);
  const pool = multiplicative ? [...ACTIONS_LATER] : [...ACTIONS_EARLY];
  const primary = story.actions[0];
  if (!pool.includes(primary)) {
    // Swap in the right answer, replacing an option that is not accepted.
    const replace = pool.findIndex((a) => !story.actions.includes(a) && a !== 'join' && a !== 'separate');
    pool[replace >= 0 ? replace : pool.length - 1] = primary;
  }
  return pool;
}

function tilesFor(story: Story, _level: LevelId): TileSpec[] {
  const numbers = story.given.map((g) => g.value);
  const ops: Op[] =
    !isAdditive(STRUCTURES[story.structure].op) ? ['+', '-', '*', '/'] : ['+', '-'];
  return [
    ...numbers.map((value): TileSpec => ({ kind: 'num', value })),
    ...ops.map((op): TileSpec => ({ kind: 'op', op })),
    { kind: 'eq' },
    { kind: 'unknown' },
  ];
}

const STEPS: Record<'word.action' | 'word.translate' | 'word.build', TranslateStep[]> = {
  'word.action': ['quantities', 'action'],
  'word.translate': ['quantities', 'action', 'build', 'solve', 'check'],
  'word.build': ['build', 'solve'],
};

function translateGenerator(skill: 'word.action' | 'word.translate' | 'word.build'): Generator {
  return (rng, params) => {
    const d = draft(rng, params, skill);
    return finish<TranslateProblem>({
      ...base(skill, params, d),
      kind: 'translate',
      steps: STEPS[skill],
      actionChoices: actionChoices(d.story, params.level),
      tiles: tilesFor(d.story, params.level),
      answer: d.story.solve.c,
      features: storyFeatures(d, skill !== 'word.action'),
    });
  };
}

export const wordGenerators: Partial<Record<SkillId, Generator>> = {
  'word.add': solveGenerator('word.add'),
  'word.sub': solveGenerator('word.sub'),
  'word.compare': solveGenerator('word.compare'),
  'word.missing': solveGenerator('word.missing'),
  'word.mul': solveGenerator('word.mul'),
  'word.div': solveGenerator('word.div'),
  'word.tricky': solveGenerator('word.tricky'),
  'word.choose': choiceGenerator('word.choose'),
  'word.op': choiceGenerator('word.op'),
  'word.match': matchGenerator,
  'word.action': translateGenerator('word.action'),
  'word.translate': translateGenerator('word.translate'),
  'word.build': translateGenerator('word.build'),
};

export { applyOp };
