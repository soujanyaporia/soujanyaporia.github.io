import { binary, single } from '../equation';
import { makeFact } from '../levels';
import type {
  ActionId,
  ConceptModel,
  DifficultyFeatures,
  Equation,
  Fact,
  Op,
  QuantityRole,
  StoryStructure,
  UnknownPosition,
} from '../types';

/**
 * The mathematics behind each story structure, independent of wording.
 * A structure maps a sampled fact onto named quantities (start, change,
 * result, groups, each …) and knows:
 *   - which quantity is unknown,
 *   - the equation that *describes* the story (□ + 4 = 9),
 *   - the calculation that *finds* the unknown (9 − 4 = 5),
 *   - what happened ("more joined", "shared equally" …).
 * Keeping "describe" and "calculate" apart is central to the translation
 * curriculum: children model the story first, then decide how to solve it.
 */
export type Quantities = Partial<Record<QuantityRole, number>>;

export interface StructureInfo {
  /** Operation of the fact the quantities are sampled from. */
  op: Op;
  roles: (fact: Fact) => Quantities;
  unknown: QuantityRole;
  /** The story told as an equation, e.g. 4 + □ = 9. */
  equation: (q: Quantities) => Equation;
  /** The calculation that gives the answer, e.g. 9 − 4 = 5. */
  solve: (q: Quantities) => Fact;
  /** Every "x op y = answer" calculation that answers the story. */
  accepted: (q: Quantities) => Fact[];
  model: ConceptModel;
  position: UnknownPosition;
  wording: DifficultyFeatures['wording'];
  /** Accepted answers to "What happened?" */
  actions: ActionId[];
  /** Short labels for the quantities ("At first", "Went away" …). */
  labels: Partial<Record<QuantityRole, string>>;
}

const v = (q: Quantities, role: QuantityRole): number => {
  const value = q[role];
  if (value === undefined) throw new Error(`Missing quantity ${role}`);
  return value;
};
const add = (a: number, b: number) => makeFact('+', a, b);
const sub = (a: number, b: number) => makeFact('-', a, b);
const mul = (a: number, b: number) => makeFact('*', a, b);
const div = (a: number, b: number) => makeFact('/', a, b);
const eq = (a: number | null, op: Op, b: number | null, c: number | null): Equation => ({
  left: binary(a, op, b),
  right: single(c),
});

const change = (f: Fact): Quantities => ({ start: f.a, change: f.b, result: f.c });
const partWhole = (f: Fact): Quantities => ({ part1: f.a, part2: f.b, whole: f.c });
const groups = (f: Fact): Quantities => ({ groups: f.a, each: f.b, total: f.c });

const JOIN_LABELS = { start: 'At first', change: 'Joined', result: 'Now' };
const SEPARATE_LABELS = { start: 'At first', change: 'Went away', result: 'Left' };
const PART_LABELS = { part1: 'One part', part2: 'Other part', whole: 'Altogether' };
const COMPARE_LABELS = { big: 'Bigger amount', small: 'Smaller amount', diff: 'Difference' };
const GROUP_LABELS = { groups: 'Groups', each: 'In each group', total: 'Altogether' };

export const STRUCTURES: Record<StoryStructure, StructureInfo> = {
  'join.result': {
    op: '+',
    roles: change,
    unknown: 'result',
    equation: (q) => eq(v(q, 'start'), '+', v(q, 'change'), null),
    solve: (q) => add(v(q, 'start'), v(q, 'change')),
    accepted: (q) => [add(v(q, 'start'), v(q, 'change')), add(v(q, 'change'), v(q, 'start'))],
    model: 'join',
    position: 'result',
    wording: 'simple',
    actions: ['join', 'partwhole'],
    labels: JOIN_LABELS,
  },
  'join.change': {
    op: '+',
    roles: change,
    unknown: 'change',
    equation: (q) => eq(v(q, 'start'), '+', null, v(q, 'result')),
    solve: (q) => sub(v(q, 'result'), v(q, 'start')),
    accepted: (q) => [sub(v(q, 'result'), v(q, 'start'))],
    model: 'part-whole',
    position: 'second',
    wording: 'moderate',
    actions: ['join', 'partwhole'],
    labels: JOIN_LABELS,
  },
  'join.start': {
    op: '+',
    roles: change,
    unknown: 'start',
    equation: (q) => eq(null, '+', v(q, 'change'), v(q, 'result')),
    solve: (q) => sub(v(q, 'result'), v(q, 'change')),
    accepted: (q) => [sub(v(q, 'result'), v(q, 'change'))],
    model: 'part-whole',
    position: 'first',
    wording: 'complex',
    actions: ['join', 'partwhole'],
    labels: JOIN_LABELS,
  },
  'separate.result': {
    op: '-',
    roles: change,
    unknown: 'result',
    equation: (q) => eq(v(q, 'start'), '-', v(q, 'change'), null),
    solve: (q) => sub(v(q, 'start'), v(q, 'change')),
    accepted: (q) => [sub(v(q, 'start'), v(q, 'change'))],
    model: 'takeaway',
    position: 'result',
    wording: 'simple',
    actions: ['separate'],
    labels: SEPARATE_LABELS,
  },
  'separate.change': {
    op: '-',
    roles: change,
    unknown: 'change',
    equation: (q) => eq(v(q, 'start'), '-', null, v(q, 'result')),
    solve: (q) => sub(v(q, 'start'), v(q, 'result')),
    accepted: (q) => [sub(v(q, 'start'), v(q, 'result'))],
    model: 'takeaway',
    position: 'second',
    wording: 'moderate',
    actions: ['separate'],
    labels: SEPARATE_LABELS,
  },
  'separate.start': {
    op: '-',
    roles: change,
    unknown: 'start',
    equation: (q) => eq(null, '-', v(q, 'change'), v(q, 'result')),
    solve: (q) => add(v(q, 'result'), v(q, 'change')),
    accepted: (q) => [add(v(q, 'result'), v(q, 'change')), add(v(q, 'change'), v(q, 'result'))],
    model: 'part-whole',
    position: 'first',
    wording: 'complex',
    actions: ['separate'],
    labels: SEPARATE_LABELS,
  },
  'combine.whole': {
    op: '+',
    roles: partWhole,
    unknown: 'whole',
    equation: (q) => eq(v(q, 'part1'), '+', v(q, 'part2'), null),
    solve: (q) => add(v(q, 'part1'), v(q, 'part2')),
    accepted: (q) => [add(v(q, 'part1'), v(q, 'part2')), add(v(q, 'part2'), v(q, 'part1'))],
    model: 'part-whole',
    position: 'whole',
    wording: 'simple',
    actions: ['partwhole', 'join'],
    labels: PART_LABELS,
  },
  'combine.part': {
    op: '+',
    roles: partWhole,
    unknown: 'part2',
    equation: (q) => eq(v(q, 'part1'), '+', null, v(q, 'whole')),
    solve: (q) => sub(v(q, 'whole'), v(q, 'part1')),
    accepted: (q) => [sub(v(q, 'whole'), v(q, 'part1'))],
    model: 'part-whole',
    position: 'part',
    wording: 'moderate',
    actions: ['partwhole'],
    labels: PART_LABELS,
  },
  'compare.difference': {
    op: '-',
    roles: (f) => ({ big: f.a, small: f.b, diff: f.c }),
    unknown: 'diff',
    equation: (q) => eq(v(q, 'big'), '-', v(q, 'small'), null),
    solve: (q) => sub(v(q, 'big'), v(q, 'small')),
    accepted: (q) => [sub(v(q, 'big'), v(q, 'small'))],
    model: 'compare',
    position: 'result',
    wording: 'moderate',
    actions: ['compare'],
    labels: COMPARE_LABELS,
  },
  'compare.more': {
    op: '+',
    roles: (f) => ({ small: f.a, diff: f.b, big: f.c }),
    unknown: 'big',
    equation: (q) => eq(v(q, 'small'), '+', v(q, 'diff'), null),
    solve: (q) => add(v(q, 'small'), v(q, 'diff')),
    accepted: (q) => [add(v(q, 'small'), v(q, 'diff')), add(v(q, 'diff'), v(q, 'small'))],
    model: 'compare',
    position: 'result',
    wording: 'moderate',
    actions: ['compare'],
    labels: COMPARE_LABELS,
  },
  'compare.fewer': {
    op: '-',
    roles: (f) => ({ big: f.a, diff: f.b, small: f.c }),
    unknown: 'small',
    equation: (q) => eq(v(q, 'big'), '-', v(q, 'diff'), null),
    solve: (q) => sub(v(q, 'big'), v(q, 'diff')),
    accepted: (q) => [sub(v(q, 'big'), v(q, 'diff'))],
    model: 'compare',
    position: 'result',
    wording: 'moderate',
    actions: ['compare'],
    labels: COMPARE_LABELS,
  },
  'compare.more_ref': {
    op: '+',
    roles: (f) => ({ small: f.a, diff: f.b, big: f.c }),
    unknown: 'small',
    equation: (q) => eq(null, '+', v(q, 'diff'), v(q, 'big')),
    solve: (q) => sub(v(q, 'big'), v(q, 'diff')),
    accepted: (q) => [sub(v(q, 'big'), v(q, 'diff'))],
    model: 'compare',
    position: 'first',
    wording: 'complex',
    actions: ['compare'],
    labels: COMPARE_LABELS,
  },
  'compare.fewer_ref': {
    op: '+',
    roles: (f) => ({ small: f.a, diff: f.b, big: f.c }),
    unknown: 'big',
    equation: (q) => eq(null, '-', v(q, 'diff'), v(q, 'small')),
    solve: (q) => add(v(q, 'small'), v(q, 'diff')),
    accepted: (q) => [add(v(q, 'small'), v(q, 'diff')), add(v(q, 'diff'), v(q, 'small'))],
    model: 'compare',
    position: 'first',
    wording: 'complex',
    actions: ['compare'],
    labels: COMPARE_LABELS,
  },
  'groups.total': {
    op: '*',
    roles: groups,
    unknown: 'total',
    equation: (q) => eq(v(q, 'groups'), '*', v(q, 'each'), null),
    solve: (q) => mul(v(q, 'groups'), v(q, 'each')),
    accepted: (q) => [mul(v(q, 'groups'), v(q, 'each')), mul(v(q, 'each'), v(q, 'groups'))],
    model: 'groups',
    position: 'result',
    wording: 'simple',
    actions: ['groups'],
    labels: GROUP_LABELS,
  },
  'array.total': {
    op: '*',
    roles: groups,
    unknown: 'total',
    equation: (q) => eq(v(q, 'groups'), '*', v(q, 'each'), null),
    solve: (q) => mul(v(q, 'groups'), v(q, 'each')),
    accepted: (q) => [mul(v(q, 'groups'), v(q, 'each')), mul(v(q, 'each'), v(q, 'groups'))],
    model: 'array',
    position: 'result',
    wording: 'simple',
    actions: ['groups'],
    labels: { groups: 'Rows', each: 'In each row', total: 'Altogether' },
  },
  'rate.total': {
    op: '*',
    roles: groups,
    unknown: 'total',
    equation: (q) => eq(v(q, 'groups'), '*', v(q, 'each'), null),
    solve: (q) => mul(v(q, 'groups'), v(q, 'each')),
    accepted: (q) => [mul(v(q, 'groups'), v(q, 'each')), mul(v(q, 'each'), v(q, 'groups'))],
    model: 'groups',
    position: 'result',
    wording: 'moderate',
    actions: ['groups'],
    labels: { groups: 'How many times', each: 'Each time', total: 'Altogether' },
  },
  'groups.size': {
    op: '*',
    roles: groups,
    unknown: 'each',
    equation: (q) => eq(v(q, 'groups'), '*', null, v(q, 'total')),
    solve: (q) => div(v(q, 'total'), v(q, 'groups')),
    accepted: (q) => [div(v(q, 'total'), v(q, 'groups'))],
    model: 'share',
    position: 'second',
    wording: 'moderate',
    actions: ['groups', 'share'],
    labels: GROUP_LABELS,
  },
  'share.each': {
    op: '/',
    roles: (f) => ({ total: f.a, groups: f.b, each: f.c }),
    unknown: 'each',
    equation: (q) => eq(v(q, 'total'), '/', v(q, 'groups'), null),
    solve: (q) => div(v(q, 'total'), v(q, 'groups')),
    accepted: (q) => [div(v(q, 'total'), v(q, 'groups'))],
    model: 'share',
    position: 'result',
    wording: 'simple',
    actions: ['share'],
    labels: { total: 'Altogether', groups: 'Shared between', each: 'Each gets' },
  },
  'group.count': {
    op: '/',
    roles: (f) => ({ total: f.a, each: f.b, groups: f.c }),
    unknown: 'groups',
    equation: (q) => eq(v(q, 'total'), '/', v(q, 'each'), null),
    solve: (q) => div(v(q, 'total'), v(q, 'each')),
    accepted: (q) => [div(v(q, 'total'), v(q, 'each'))],
    model: 'grouping',
    position: 'result',
    wording: 'moderate',
    actions: ['share', 'groups'],
    labels: { total: 'Altogether', each: 'In each group', groups: 'Groups' },
  },
};

export const STORY_STRUCTURES = Object.keys(STRUCTURES) as StoryStructure[];

/** The four "what happened?" answers, in the order they are offered. */
export const ACTION_INFO: Record<ActionId, { label: string; symbol: string; op: Op }> = {
  join: { label: 'More joined', symbol: '+', op: '+' },
  partwhole: { label: 'Parts make a whole', symbol: '+', op: '+' },
  separate: { label: 'Some went away', symbol: '−', op: '-' },
  compare: { label: 'Comparing two amounts', symbol: '−', op: '-' },
  groups: { label: 'Equal groups', symbol: '×', op: '*' },
  share: { label: 'Shared or grouped equally', symbol: '÷', op: '/' },
};
