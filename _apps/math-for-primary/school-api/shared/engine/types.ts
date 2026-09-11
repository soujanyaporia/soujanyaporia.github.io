/**
 * Core data model for the exercise engine.
 *
 * Everything here is plain, serialisable data. The engine is split into:
 *   1. mathematical generation   (generators/*)  -> Problem
 *   2. natural-language rendering (word/*)       -> Story text
 *   3. visual representation      (VisualSpec)   -> rendered by React components
 *   4. answer validation          (validate.ts)  -> CheckResult
 *   5. explanation generation     (explain/*)    -> Steps + Hints + strategies
 * No module in src/engine may import React or touch the DOM.
 */

/** + − × ÷ (stored as ASCII, displayed with proper symbols). */
export type Op = '+' | '-' | '*' | '/';
export type Relation = '<' | '=' | '>';
export type LevelId = 1 | 2 | 3 | 4 | 5;

/** A slot in an expression: a known number, or null for the unknown (□). */
export type Slot = number | null;

/** terms.length === ops.length + 1, e.g. [3, null] with ['+'] is "3 + □". */
export interface Expr {
  terms: Slot[];
  ops: Op[];
}

export interface Equation {
  left: Expr;
  right: Expr;
}

/** Canonical true arithmetic fact: a op b = c (division is always exact). */
export interface Fact {
  a: number;
  op: Op;
  b: number;
  c: number;
}

export type SkillId =
  // Addition and subtraction
  | 'add.result'
  | 'add.result_left'
  | 'add.missing_first'
  | 'add.missing_second'
  | 'sub.result'
  | 'sub.result_left'
  | 'sub.missing_first'
  | 'sub.missing_second'
  | 'sub.inverse'
  | 'bond.part'
  | 'bond.make'
  | 'pattern.sequence'
  | 'truefalse'
  | 'compare.expr'
  | 'equality.balance'
  // Multiplication and division
  | 'mul.groups'
  | 'mul.array'
  | 'mul.repeated'
  | 'mul.turnaround'
  | 'mul.result'
  | 'mul.missing'
  | 'div.sharing'
  | 'div.grouping'
  | 'div.inverse'
  | 'div.result'
  // Stories: from English to mathematics
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
  | 'word.match'
  | 'word.action'
  | 'word.translate';

/** The idea an explanation is built around. */
export type ConceptModel =
  | 'join'
  | 'takeaway'
  | 'part-whole'
  | 'compare'
  | 'balance'
  | 'groups'
  | 'array'
  | 'share'
  | 'grouping'
  | 'pattern';

export type VisualKind = 'counters' | 'numberline' | 'bond' | 'bar' | 'balance' | 'groups' | 'array' | 'share';

/** Concrete objects drawn in pictures (counters by default). */
export type ItemKind =
  | 'dot'
  | 'apple'
  | 'orange'
  | 'strawberry'
  | 'cookie'
  | 'sweet'
  | 'star'
  | 'ball'
  | 'pencil'
  | 'book'
  | 'balloon'
  | 'flower'
  | 'fish'
  | 'bird'
  | 'person'
  | 'coin'
  | 'car'
  | 'cupcake';

export type UnknownPosition = 'result' | 'first' | 'second' | 'part' | 'whole' | 'none';

export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface DifficultyFeatures {
  maxNumber: number;
  operation: Operation;
  unknown: UnknownPosition;
  regroup: boolean;
  equalityForm: 'standard' | 'reversed' | 'both-sides';
  wording: 'none' | 'simple' | 'moderate' | 'complex';
  distractor: boolean;
  steps: number;
  construction: boolean;
  comparison: boolean;
}

/**
 * Optional numeric constraints used by lessons to shape examples.
 * The "whole" is the biggest number of a fact: c for a + b = c and a × b = c,
 * a for a − b = c and a ÷ b = c.
 */
export interface FactConstraints {
  minWhole?: number;
  maxWhole?: number;
  /** Smallest allowed number anywhere in the fact (use 1 to forbid zero). */
  minOperand?: number;
  /** Bounds for a (first number / number of groups). */
  minA?: number;
  maxA?: number;
  /** Bounds for b (second number / size of each group / divisor). */
  minB?: number;
  maxB?: number;
  /** Multiplication and division: use this times table for b. */
  table?: number;
  regroup?: 'avoid' | 'require' | 'allow';
  /** Force a specific fact (curated first examples): a op b. */
  fixed?: { a: number; b: number };
}

// ---------------------------------------------------------------- stories

export type StoryStructure =
  | 'join.result'
  | 'join.change'
  | 'join.start'
  | 'separate.result'
  | 'separate.change'
  | 'separate.start'
  | 'combine.whole'
  | 'combine.part'
  | 'compare.difference'
  | 'compare.more'
  | 'compare.fewer'
  /** "Ben has 9. He has 4 more than Amy." (Amy = 9 − 4, despite "more") */
  | 'compare.more_ref'
  /** "Sarah has 4. She has 3 fewer than Tim." (Tim = 4 + 3, despite "fewer") */
  | 'compare.fewer_ref'
  | 'groups.total'
  | 'array.total'
  | 'rate.total'
  | 'groups.size'
  | 'share.each'
  | 'group.count';

export type QuantityRole =
  | 'start'
  | 'change'
  | 'result'
  | 'part1'
  | 'part2'
  | 'whole'
  | 'big'
  | 'small'
  | 'diff'
  | 'groups'
  | 'each'
  | 'total'
  | 'extra';

/** "What happened in the story?" — the relationship, not a keyword. */
export type ActionId = 'join' | 'separate' | 'partwhole' | 'compare' | 'groups' | 'share';

export interface Noun {
  one: string;
  many: string;
  /** Picture to draw for concrete explanations. */
  item?: ItemKind;
}

/** A piece of story text; numbers are kept separate so the UI can highlight them. */
export interface StorySegment {
  text: string;
  num?: number;
  role?: QuantityRole;
}

export interface Story {
  structure: StoryStructure;
  frameId: string;
  segments: StorySegment[];
  /** The whole story as plain text (question included). */
  text: string;
  /** Just the question sentence. */
  question: string;
  unit: Noun;
  quantities: Partial<Record<QuantityRole, number>>;
  unknownRole: QuantityRole;
  /** Numbers that appear in the text, in reading order. */
  given: { role: QuantityRole; value: number }[];
  answerSentence: string;
  /** Equation as the story is told (may have the unknown in any position). */
  equation: Equation;
  /** The calculation that produces the answer, e.g. 9 − 4 = 5. */
  solve: Fact;
  /** Every "x op y = answer" calculation that answers the story. */
  accepted: Fact[];
  /** What happened (accepted answers to "What happened?"). */
  actions: ActionId[];
  /** Short labels for the known quantities ("At first", "Went away" …). */
  labels: Partial<Record<QuantityRole, string>>;
  /** Names used, for tests and read-aloud. */
  names: string[];
}

// ---------------------------------------------------------------- problems

interface ProblemBase {
  /** Stable key describing the maths (used to avoid repeats in a session). */
  id: string;
  skill: SkillId;
  level: LevelId;
  seed: number;
  difficulty: number;
  features: DifficultyFeatures;
  /** The underlying true fact the problem is built on. */
  fact: Fact;
  model: ConceptModel;
  visual: VisualKind;
  /** Objects to draw in concrete pictures. */
  item?: ItemKind;
}

export interface NumberProblem extends ProblemBase {
  kind: 'number';
  format: 'equation' | 'bond' | 'story';
  equation?: Equation;
  /** A second equation sharing the same unknown ("3 × □ = 12, so 12 ÷ 3 = □"). */
  related?: Equation;
  bond?: { whole: Slot; parts: [Slot, Slot] };
  story?: Story;
  /** Picture shown with the question (equal groups, an array, items to share). */
  picture?: VisualSpec;
  /** Short instruction replacing the default ("3 groups of 4"). */
  prompt?: string;
  /** Interactive activity before the number is entered. */
  activity?: 'share';
  answer: number;
}

export interface TrueFalseProblem extends ProblemBase {
  kind: 'truefalse';
  /** A fully numeric statement that may or may not be true. */
  equation: Equation;
  answer: boolean;
}

export interface RelationProblem extends ProblemBase {
  kind: 'relation';
  left: Expr;
  right: Expr;
  answer: Relation;
}

export interface ChoiceProblem extends ProblemBase {
  kind: 'choice';
  story: Story;
  /** Candidate calculations (all arithmetically true, only one fits the story). */
  options: Fact[];
  /** Show options as full equations (5 + 3 = 8) or calculations (5 + 3). */
  style: 'equation' | 'expression';
  answer: number;
}

/** "Which story matches 8 − 3 = 5?" */
export interface MatchProblem extends ProblemBase {
  kind: 'match';
  equation: Fact;
  options: string[];
  /** The maths each option describes (for tests and explanations). */
  optionFacts: Fact[];
  answer: number;
}

/** "Feed the monster 10": choose two cards (and an operation) that make the target. */
export interface MakeProblem extends ProblemBase {
  kind: 'make';
  target: number;
  cards: number[];
  ops: Op[];
  answer: number;
}

/** Number train: 4 → 6 → 8 → □ */
export interface SequenceProblem extends ProblemBase {
  kind: 'sequence';
  terms: Slot[];
  step: number;
  answer: number;
}

export type TileSpec =
  | { kind: 'num'; value: number }
  | { kind: 'op'; op: Op }
  | { kind: 'eq' }
  | { kind: 'unknown' };

export type TranslateStep = 'quantities' | 'action' | 'build' | 'solve' | 'check';

/**
 * Story → quantities → what happened → equation → solution → does it make sense?
 * Scaffolding is removed step by step as the child gets better.
 */
export interface TranslateProblem extends ProblemBase {
  kind: 'translate';
  story: Story;
  steps: TranslateStep[];
  /** Choices offered for "What happened?" */
  actionChoices: ActionId[];
  tiles: TileSpec[];
  answer: number;
}

export type Problem =
  | NumberProblem
  | TrueFalseProblem
  | RelationProblem
  | ChoiceProblem
  | MatchProblem
  | MakeProblem
  | SequenceProblem
  | TranslateProblem;

export type ProblemKind = Problem['kind'];

// ---------------------------------------------------------------- answers

export type Misconception =
  | 'off_by_one'
  | 'wrong_operation'
  | 'too_big'
  | 'too_small'
  | 'reversed_order'
  | 'used_extra_number'
  | 'wrong_numbers'
  | 'unequal_groups'
  | 'misread_relation'
  | 'other';

export interface CheckResult {
  correct: boolean;
  /** Short line shown first, e.g. "Correct! 3 + 4 = 7." */
  message: string;
  /** Optional second line that explains what the child's answer means. */
  detail?: string;
  misconception?: Misconception;
  /** For built equations: did the child write the story or the calculation? */
  form?: 'story' | 'solve' | 'family';
}

// ---------------------------------------------------------------- explanation

export type Highlight = 'a' | 'b' | 'c' | 'answer' | 'focus' | 'muted';

export type Token =
  | { t: 'num'; v: number; hl?: Highlight }
  | { t: 'op'; v: Op }
  | { t: 'rel'; v: Relation }
  /** The unknown. `v` is shown inside the box once revealed. */
  | { t: 'blank'; v?: number | string; hl?: Highlight }
  | { t: 'text'; v: string };

export interface WorkLine {
  tokens: Token[];
  note?: string;
  tone?: 'normal' | 'answer' | 'check';
}

export type CounterColor = 'blue' | 'orange' | 'green' | 'purple' | 'grey';

export interface CounterGroup {
  count: number;
  color: CounterColor;
  label?: string;
  /** Number of counters (from the end of this group) shown crossed out. */
  crossed?: number;
  /** Dashed outlines: "counters we have not found yet". */
  ghost?: boolean;
}

export interface CountersSpec {
  type: 'counters';
  groups: CounterGroup[];
  /** Number each counter 1, 2, 3 ... (used for counting on). */
  numbered?: boolean;
  /** Start numbering from this counter index (count on from the first group). */
  numberFrom?: number;
  /** 'groups' keeps groups apart; 'frame' fills ten-frames continuously. */
  layout?: 'groups' | 'frame';
  /** Draw objects instead of plain counters. */
  item?: ItemKind;
}

export interface NumberLineSpec {
  type: 'numberline';
  min: number;
  max: number;
  start: number;
  /** Signed jumps, e.g. [1, 1, 1] or [10, 4] or [-1, -1]. */
  jumps: number[];
  /** Points to emphasise (start, end ...). */
  marks?: number[];
  /** Hide the landing number (so a hint does not give the answer away). */
  hideEnd?: boolean;
  /** Label each jump "+1" / "−1" / "+10". */
  jumpLabels?: boolean;
  /** How many jumps to draw (default: all). */
  showJumps?: number;
}

export type BondValue = number | '?';

export interface BondSpec {
  type: 'bond';
  whole: BondValue;
  parts: [BondValue, BondValue];
  focus?: 'whole' | 'part1' | 'part2';
}

export interface BarCell {
  value: number;
  show: boolean;
  label?: string;
}

export interface PartWholeBarSpec {
  type: 'bar';
  mode: 'part-whole';
  whole: BarCell;
  parts: [BarCell, BarCell];
}

export interface CompareBarSpec {
  type: 'bar';
  mode: 'compare';
  big: BarCell;
  small: BarCell;
  diff: BarCell;
  /** Row labels, e.g. ["Tom", "Lily"]. */
  labels: [string, string];
  /** Which row is drawn first. */
  bigFirst: boolean;
}

export interface BalanceSpec {
  type: 'balance';
  left: Token[];
  right: Token[];
  /** Values used to tilt the beam; null means unknown (beam level, dashed). */
  leftValue: number | null;
  rightValue: number | null;
}

/** Equal groups: `groups` plates with `size` objects on each. */
export interface GroupsSpec {
  type: 'groups';
  groups: number;
  size: number;
  item?: ItemKind;
  /** How many groups to show filled (the rest are empty plates). */
  filled?: number;
  /** Running totals under the groups: 4, 8, 12. */
  totals?: boolean;
  /** Label each group with its size ("4"). */
  sizes?: boolean;
  /** The size is unknown: draw "?" instead of objects. */
  hideSize?: boolean;
}

/** An array: `rows` rows of `cols`. `turned` shows it rotated (cols rows of rows). */
export interface ArraySpec {
  type: 'array';
  rows: number;
  cols: number;
  item?: ItemKind;
  turned?: boolean;
  labels?: boolean;
  /** Highlight the first n rows (for counting row by row). */
  highlightRows?: number;
}

/**
 * Division as sharing (deal `total` objects into `groups` plates one at a
 * time) or as grouping (circle groups of `size`).
 */
export interface ShareSpec {
  type: 'share';
  mode: 'share' | 'group';
  total: number;
  /** share: number of plates.  group: number of groups made so far is `dealt`. */
  groups: number;
  size: number;
  /** share: objects dealt so far.  group: groups circled so far. */
  dealt: number;
  item?: ItemKind;
}

/** A fact family: the three numbers and the four facts they make. */
export interface FamilySpec {
  type: 'family';
  kind: 'add' | 'mul';
  parts: [number, number];
  whole: number;
  /** Which of the four facts to highlight (0–3). */
  focus?: number;
}

export type VisualSpec =
  | CountersSpec
  | NumberLineSpec
  | BondSpec
  | PartWholeBarSpec
  | CompareBarSpec
  | BalanceSpec
  | GroupsSpec
  | ArraySpec
  | ShareSpec
  | FamilySpec;

export interface Step {
  /** What the tutor says at this step (short, child-friendly). */
  say: string;
  visual?: VisualSpec;
  /** Working shown so far (cumulative). */
  work: WorkLine[];
  /** True when this step shows the answer. */
  reveal?: boolean;
}

export interface Hint {
  level: 1 | 2 | 3 | 4;
  say: string;
  work?: WorkLine;
  visual?: VisualSpec;
}

/** Another way to work it out ("Make 10", "Doubles", "Skip count" …). */
export interface StrategyView {
  id: string;
  label: string;
  steps: Step[];
}

export interface Explanation {
  /** One sentence that frames the problem ("We need to find the missing number."). */
  goal: string;
  /** Name of the main strategy used in `steps`. */
  strategy?: string;
  steps: Step[];
  /** Progressive hints: a question, a strategy, the calculation, a picture. */
  hints: Hint[];
  /** Other good ways to solve the same problem. */
  alternatives?: StrategyView[];
  /** Two-stage problems (write the equation, then solve it): hints for solving. */
  solveHints?: Hint[];
}
