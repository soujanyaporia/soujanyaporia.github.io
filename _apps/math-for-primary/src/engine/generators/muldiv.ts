import { featuresFor } from '../difficulty';
import { binary, equationText, factToEquation, repeated, single } from '../equation';
import { sampleFact } from '../levels';
import type { Rng } from '../random';
import type { Equation, Fact, ItemKind, LevelId, NumberProblem, SkillId, VisualSpec } from '../types';
import { finish, type Generator, type GenParams } from './common';

/**
 * Multiplication and division, taught as equal groups first:
 * pictures of groups and arrays, repeated addition, turning arrays around,
 * then facts; division as sharing and as grouping, linked back to ×.
 */

const ITEMS: ItemKind[] = ['apple', 'strawberry', 'cookie', 'star', 'ball', 'orange', 'flower', 'cupcake'];

/** Keep pictures countable: at most 6 groups and 10 in each at low levels. */
const pictureLimits = (level: LevelId) => (level <= 3 ? { maxA: 6, maxB: 10 } : { maxA: 10, maxB: 10 });

interface Draft {
  fact: Fact;
  equation: Equation;
  answer: number;
  picture?: VisualSpec;
  prompt?: string;
  related?: Equation;
  unknown: NumberProblem['features']['unknown'];
  equalityForm?: NumberProblem['features']['equalityForm'];
  model: NumberProblem['model'];
  visual: NumberProblem['visual'];
  item?: ItemKind;
  activity?: 'share';
}

function build(skill: SkillId, params: GenParams, d: Draft): NumberProblem {
  const related = d.related ? ` & ${equationText(d.related)}` : '';
  return finish<NumberProblem>({
    id: `${skill}|${equationText(d.equation)}${related}`,
    skill,
    level: params.level,
    seed: params.seed,
    kind: 'number',
    format: 'equation',
    fact: d.fact,
    equation: d.equation,
    related: d.related,
    answer: d.answer,
    picture: d.picture,
    prompt: d.prompt,
    activity: d.activity,
    item: d.item,
    features: featuresFor(d.fact, { unknown: d.unknown, equalityForm: d.equalityForm ?? 'standard' }),
    model: d.model,
    visual: d.visual,
  });
}

const groupsPicture = (f: Fact, item: ItemKind): VisualSpec => ({ type: 'groups', groups: f.a, size: f.b, item, sizes: true });

// ---------------------------------------------------------------- multiplication

const mulGroups: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '*', { ...pictureLimits(params.level), ...params.constraints });
  const item = rng.pick(ITEMS);
  return build('mul.groups', params, {
    fact,
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    picture: groupsPicture(fact, item),
    prompt: `${fact.a} groups of ${fact.b}. How many altogether?`,
    unknown: 'result',
    model: 'groups',
    visual: 'groups',
    item,
  });
};

const mulArray: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '*', { ...pictureLimits(params.level), ...params.constraints });
  return build('mul.array', params, {
    fact,
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    picture: { type: 'array', rows: fact.a, cols: fact.b, labels: true },
    prompt: `${fact.a} rows of ${fact.b}. How many altogether?`,
    unknown: 'result',
    model: 'array',
    visual: 'array',
  });
};

/** 4 + 4 + 4 = □ so 3 × 4 = □  |  4 + 4 + 4 = □ × 4  |  4 + 4 + 4 = 3 × □ */
const mulRepeated: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '*', { maxA: 5, maxB: 10, ...params.constraints });
  const item = rng.pick(ITEMS);
  const sum = repeated(fact.b, fact.a);
  const form = params.variant ?? rng.weighted([['total', 4], ['times', 3], ['size', 3]] as const);
  const common = { fact, picture: groupsPicture(fact, item), model: 'groups' as const, visual: 'groups' as const, item };
  if (form === 'times') {
    return build('mul.repeated', params, {
      ...common,
      equation: { left: sum, right: binary(null, '*', fact.b) },
      answer: fact.a,
      prompt: `How many ${fact.b}s are added?`,
      unknown: 'first',
      equalityForm: 'both-sides',
    });
  }
  if (form === 'size') {
    return build('mul.repeated', params, {
      ...common,
      equation: { left: sum, right: binary(fact.a, '*', null) },
      answer: fact.b,
      prompt: 'Adding equal groups is multiplying.',
      unknown: 'second',
      equalityForm: 'both-sides',
    });
  }
  return build('mul.repeated', params, {
    ...common,
    equation: { left: sum, right: single(null) },
    related: factToEquation(fact, 'c'),
    answer: fact.c,
    prompt: 'Add the equal groups.',
    unknown: 'result',
  });
};

/** 3 × 4 = 4 × □ — turn the array around. */
const mulTurnaround: Generator = (rng, params) => {
  let fact = sampleFact(rng, params.level, '*', { ...pictureLimits(params.level), ...params.constraints });
  if (fact.a === fact.b) fact = sampleFact(rng, params.level, '*', { ...pictureLimits(params.level), ...params.constraints });
  const blankFirst = rng.chance(0.4);
  const right = blankFirst ? binary(null, '*', fact.a) : binary(fact.b, '*', null);
  return build('mul.turnaround', params, {
    fact,
    equation: { left: binary(fact.a, '*', fact.b), right },
    answer: blankFirst ? fact.b : fact.a,
    picture: { type: 'array', rows: fact.a, cols: fact.b, labels: true },
    prompt: 'Turn the array around.',
    unknown: 'second',
    equalityForm: 'both-sides',
    model: 'array',
    visual: 'array',
  });
};

const mulResult: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '*', params.constraints);
  return build('mul.result', params, {
    fact,
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    unknown: 'result',
    model: 'groups',
    visual: params.visual ?? (rng.chance(0.5) ? 'numberline' : 'array'),
  });
};

/** □ × 4 = 12 or 3 × □ = 12 */
const mulMissing: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '*', params.constraints);
  const hideFirst = rng.chance(0.5);
  const item = rng.pick(ITEMS);
  return build('mul.missing', params, {
    fact,
    equation: factToEquation(fact, hideFirst ? 'a' : 'b'),
    answer: hideFirst ? fact.a : fact.b,
    unknown: hideFirst ? 'first' : 'second',
    model: 'groups',
    visual: 'groups',
    item,
  });
};

// ---------------------------------------------------------------- division

/** Sharing: 12 shared equally into 3 groups → 4 in each. */
const divSharing: Generator = (rng, params) => {
  const limits = params.level <= 3 ? { maxB: 5, maxWhole: 30 } : { maxB: 6 };
  const fact = sampleFact(rng, params.level, '/', { ...limits, ...params.constraints });
  const item = rng.pick(ITEMS);
  return build('div.sharing', params, {
    fact,
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    picture: { type: 'share', mode: 'share', total: fact.a, groups: fact.b, size: fact.c, dealt: 0, item },
    prompt: `Share ${fact.a} equally into ${fact.b} groups. How many in each?`,
    unknown: 'result',
    model: 'share',
    visual: 'share',
    item,
    activity: params.variant === 'picnic' ? 'share' : undefined,
  });
};

/** Grouping: 12 in groups of 4 → 3 groups. */
const divGrouping: Generator = (rng, params) => {
  const limits = params.level <= 3 ? { maxWhole: 30 } : {};
  const fact = sampleFact(rng, params.level, '/', { ...limits, ...params.constraints });
  const item = rng.pick(ITEMS);
  return build('div.grouping', params, {
    fact,
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    picture: { type: 'share', mode: 'group', total: fact.a, groups: fact.c, size: fact.b, dealt: 0, item },
    prompt: `Put ${fact.a} into groups of ${fact.b}. How many groups?`,
    unknown: 'result',
    model: 'grouping',
    visual: 'share',
    item,
  });
};

/** □ × 3 = 12, so 12 ÷ 3 = □ — the same missing number. */
const divInverse: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '/', params.constraints);
  return build('div.inverse', params, {
    fact,
    related: { left: binary(null, '*', fact.b), right: single(fact.a) },
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    prompt: 'Use the times fact to help.',
    unknown: 'result',
    model: 'groups',
    visual: 'array',
  });
};

const divResult: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '/', params.constraints);
  return build('div.result', params, {
    fact,
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    unknown: 'result',
    model: rng.chance(0.5) ? 'share' : 'grouping',
    visual: 'share',
    item: rng.pick(ITEMS),
  });
};

/** 3 + □ = 7, so 7 − 3 = □ — subtraction as the inverse of addition. */
const subInverse: Generator = (rng, params) => {
  const fact = sampleFact(rng, params.level, '-', { minOperand: 1, ...params.constraints });
  return build('sub.inverse', params, {
    fact,
    related: { left: binary(fact.b, '+', null), right: single(fact.a) },
    equation: factToEquation(fact, 'c'),
    answer: fact.c,
    prompt: 'Use the adding fact to help.',
    unknown: 'result',
    model: 'part-whole',
    visual: 'bond',
  });
};

export const mulDivGenerators: Partial<Record<SkillId, Generator>> = {
  'sub.inverse': subInverse,
  'mul.groups': mulGroups,
  'mul.array': mulArray,
  'mul.repeated': mulRepeated,
  'mul.turnaround': mulTurnaround,
  'mul.result': mulResult,
  'mul.missing': mulMissing,
  'div.sharing': divSharing,
  'div.grouping': divGrouping,
  'div.inverse': divInverse,
  'div.result': divResult,
};

export type { Rng };
