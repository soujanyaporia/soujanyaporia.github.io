import { applyOp, commutes, countBlanks, evalExpr, exprText, factText, holds, OP_SYMBOL } from './equation';
import type {
  ActionId,
  CheckResult,
  ChoiceProblem,
  Equation,
  Expr,
  MakeProblem,
  MatchProblem,
  NumberProblem,
  Op,
  Problem,
  Relation,
  RelationProblem,
  SequenceProblem,
  Story,
  TileSpec,
  TranslateProblem,
  TrueFalseProblem,
} from './types';

/** A child's response. Translate problems also use checkBuilt/checkAction. */
export type Answer =
  | { kind: 'number'; value: number }
  | { kind: 'truefalse'; value: boolean }
  | { kind: 'relation'; value: Relation }
  | { kind: 'choice'; index: number }
  | { kind: 'make'; a: number; op: Op; b: number };

export function checkAnswer(problem: Problem, answer: Answer): CheckResult {
  switch (problem.kind) {
    case 'number':
      return answer.kind === 'number' ? checkNumber(problem, answer.value) : mismatch();
    case 'translate':
      return answer.kind === 'number' ? checkStoryNumber(problem.story, problem.answer, answer.value) : mismatch();
    case 'sequence':
      return answer.kind === 'number' ? checkSequence(problem, answer.value) : mismatch();
    case 'truefalse':
      return answer.kind === 'truefalse' ? checkTrueFalse(problem, answer.value) : mismatch();
    case 'relation':
      return answer.kind === 'relation' ? checkRelation(problem, answer.value) : mismatch();
    case 'choice':
      return answer.kind === 'choice' ? checkChoice(problem, answer.index) : mismatch();
    case 'match':
      return answer.kind === 'choice' ? checkMatch(problem, answer.index) : mismatch();
    case 'make':
      return answer.kind === 'make' ? checkMake(problem, answer) : mismatch();
  }
}

const mismatch = (): CheckResult => ({ correct: false, message: 'Please choose an answer.' });

/** Parse typed input: digits only, up to 3 of them. */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return Number(trimmed);
}

const isBlank = (e: Expr) => e.terms.length === 1 && e.terms[0] === null;
const are = (n: number) => (n === 1 ? 'is' : 'are');

// ---------------------------------------------------------------- misconceptions about operations

/** Which other operation on a and b gives this value? */
export function operationUsed(value: number, a: number, b: number, actual: Op): Op | null {
  const tries: [Op, number][] = [
    ['+', a + b],
    ['-', Math.abs(a - b)],
    ['*', a * b],
    ['/', b !== 0 && a % b === 0 ? a / b : a !== 0 && b % a === 0 ? b / a : NaN],
  ];
  for (const [op, result] of tries) if (op !== actual && (actual === '*' || actual === '/' || op === '+' || op === '-') && result === value) return op;
  return null;
}

const DID: Record<Op, (a: number, b: number) => string> = {
  '+': (_a, b) => `That is the result of adding ${b}.`,
  '-': (_a, b) => `That is the result of taking away ${b}.`,
  '*': () => 'You multiplied.',
  '/': () => 'You divided.',
};

const MEANS: Record<Op, (a: number, b: number) => string> = {
  '+': (a, b) => `+ means ${a} and ${b} are put together, we can count on from ${Math.max(a, b)}.`,
  '-': (a, b) => `− means ${b} ${are(b)} taken away from ${a}, we can count back from ${a}.`,
  '*': (a, b) => `× means ${a} groups of ${b}.`,
  '/': (a, b) => `÷ means sharing ${a} into ${b} equal groups, so each group is smaller than ${a}.`,
};

export function operationMistake(used: Op, a: number, op: Op, b: number): string {
  return `${DID[used](a, b)} But ${MEANS[op](a, b)}`;
}

// ---------------------------------------------------------------- number answers

function checkNumber(p: NumberProblem, value: number): CheckResult {
  if (p.format === 'story') return checkStoryNumber(p.story!, p.answer, value);
  if (p.format === 'bond') return checkBond(p, value);
  const eq = p.equation!;
  const close = Math.abs(value - p.answer) === 1;
  if (value === p.answer) return { correct: true, message: `Correct! ${exprTextOf(eq, value)}.` };

  // Result questions: 3 + 4 = □, □ = 3 + 4, or 4 + 4 + 4 = □.
  if (isBlank(eq.left) || isBlank(eq.right)) {
    const expr = isBlank(eq.left) ? eq.right : eq.left;
    if (expr.terms.length === 2) {
      const [a, b] = expr.terms as number[];
      const op = expr.ops[0];
      const used = operationUsed(value, a, b, op);
      if (used) {
        return { correct: false, misconception: 'wrong_operation', message: 'Look at the sign again.', detail: operationMistake(used, a, op, b) };
      }
    }
    if (close) return { correct: false, misconception: 'off_by_one', message: 'So close!', detail: 'Count again carefully.' };
    return {
      correct: false,
      misconception: value > p.answer ? 'too_big' : 'too_small',
      message: 'Not quite.',
      detail: `${exprText(expr)} is not ${value}.`,
    };
  }
  return checkMissing(eq, p.answer, value);
}

const exprTextOf = (eq: Equation, value: number) => `${exprText(eq.left, String(value))} = ${exprText(eq.right, String(value))}`;

/** Missing numbers: put the child's number in and check both sides. */
function checkMissing(eq: Equation, answer: number, value: number): CheckResult {
  const blankOnLeft = eq.left.terms.includes(null);
  const withBlank = blankOnLeft ? eq.left : eq.right;
  const other = blankOnLeft ? eq.right : eq.left;
  const target = evalExpr(other, 0);
  const got = evalExpr(withBlank, value);
  const tried = exprText(withBlank, String(value));
  const close = Math.abs(value - answer) === 1;

  if (!Number.isFinite(got)) {
    return { correct: false, misconception: 'other', message: 'Not quite.', detail: 'We cannot share into 0 groups.' };
  }
  if (got < 0) {
    return { correct: false, misconception: 'too_big', message: 'Not quite.', detail: `${tried} does not work. We cannot take away more than we have.` };
  }

  // "□ + 4 = 9" answered 13: the child did the operation to 9 instead of undoing it.
  if (withBlank.terms.length === 2 && other.terms.length === 1) {
    const op = withBlank.ops[0];
    const blankFirst = withBlank.terms[0] === null;
    const known = (blankFirst ? withBlank.terms[1] : withBlank.terms[0]) as number;
    const sym = OP_SYMBOL[op];
    if (op === '+' && value === target + known) {
      return {
        correct: false,
        misconception: 'wrong_operation',
        message: `We aren't adding ${known} to ${target}.`,
        detail: `We need the number that makes ${target} after adding ${known}. Can we undo + ${known}?`,
      };
    }
    if (op === '-' && blankFirst && value === target - known) {
      return {
        correct: false,
        misconception: 'wrong_operation',
        message: `We aren't taking ${known} from ${target}.`,
        detail: `${target} is what is left after taking away ${known}. What did we start with?`,
      };
    }
    if (op === '-' && !blankFirst && value === known + target) {
      return {
        correct: false,
        misconception: 'wrong_operation',
        message: `We don't add ${target} and ${known} here.`,
        detail: `How many do we take away from ${known} to leave ${target}?`,
      };
    }
    if (op === '*' && value === target * known) {
      return {
        correct: false,
        misconception: 'wrong_operation',
        message: `We aren't multiplying ${target} by ${known}.`,
        detail: `Which number of groups of ${known} makes ${target}? Try ${target} ${OP_SYMBOL['/']} ${known}.`,
      };
    }
    if (op === '*' && (value === target - known || value === target + known)) {
      return {
        correct: false,
        misconception: 'wrong_operation',
        message: `This is about equal groups, not ${value === target - known ? 'taking away' : 'adding'}.`,
        detail: `How many ${known}s make ${target}? Or: ${known} ${sym} □ = ${target}.`,
      };
    }
  }

  const increasing = evalExpr(withBlank, value + 1) > got;
  const needBigger = increasing ? got < target : got > target;
  const shown = Number.isInteger(got) ? String(got) : 'not a whole number';
  const needed = other.terms.length === 1 ? `not ${target}` : `but ${exprText(other)} = ${target}`;
  return {
    correct: false,
    misconception: close ? 'off_by_one' : needBigger ? 'too_small' : 'too_big',
    message: close ? 'So close!' : 'Not quite.',
    detail: `Let's check: ${tried} = ${shown}, ${needed}. Try a ${needBigger ? 'bigger' : 'smaller'} number.`,
  };
}

function checkBond(p: NumberProblem, value: number): CheckResult {
  const { whole, parts } = p.bond!;
  if (whole === null) {
    const [x, y] = parts as number[];
    if (value === p.answer) return { correct: true, message: `Correct! ${x} and ${y} make ${value}.` };
    return {
      correct: false,
      misconception: Math.abs(value - p.answer) === 1 ? 'off_by_one' : value > p.answer ? 'too_big' : 'too_small',
      message: 'Not quite.',
      detail: `Put the parts together: ${x} and ${y}.`,
    };
  }
  const known = (parts[0] ?? parts[1]) as number;
  if (value === p.answer) return { correct: true, message: `Correct! ${known} and ${value} make ${whole}.` };
  const total = known + value;
  return {
    correct: false,
    misconception: Math.abs(value - p.answer) === 1 ? 'off_by_one' : total > whole ? 'too_big' : 'too_small',
    message: Math.abs(value - p.answer) === 1 ? 'So close!' : 'Not quite.',
    detail: `${known} and ${value} make ${total}, not ${whole}.`,
  };
}

/** Why the story needs its operation — used when a child picks another one. */
export function storyReason(story: Story): string {
  const q = story.quantities as Record<string, number>;
  switch (story.structure) {
    case 'join.result':
      return `${q.change} more joined, so there should be more than ${q.start}.`;
    case 'join.change':
      return `we need the part that was added to ${q.start} to make ${q.result}.`;
    case 'join.start':
      return `we need the amount before ${q.change} more joined.`;
    case 'separate.result':
      return `${q.change} ${are(q.change)} taken away.`;
    case 'separate.change':
      return `we need how many were taken from ${q.start} to leave ${q.result}.`;
    case 'separate.start':
      return `${q.result} were left after ${q.change} went away, so there were more at the start.`;
    case 'combine.whole':
      return 'the two parts are put together, so the whole is bigger than each part.';
    case 'combine.part':
      return `${q.whole} is the whole and ${q.part1} is one part. We need the other part.`;
    case 'compare.difference':
      return `we are finding the difference between ${q.big} and ${q.small}.`;
    case 'compare.more':
      return `${q.diff} more than ${q.small} is bigger than ${q.small}.`;
    case 'compare.fewer':
      return `${q.diff} fewer than ${q.big} is smaller than ${q.big}.`;
    case 'compare.more_ref':
      return `the person with ${q.big} has MORE, so the other person has fewer than ${q.big}.`;
    case 'compare.fewer_ref':
      return `the person with ${q.small} has FEWER, so the other person has more than ${q.small}.`;
    case 'groups.total':
    case 'array.total':
    case 'rate.total':
      return `there are ${q.groups} equal groups of ${q.each}.`;
    case 'groups.size':
      return `${q.total} is split into ${q.groups} equal groups.`;
    case 'share.each':
      return `${q.total} are shared equally into ${q.groups} groups, so each gets fewer than ${q.total}.`;
    case 'group.count':
      return `we make groups of ${q.each} from ${q.total}.`;
  }
}

export function checkStoryNumber(story: Story, answer: number, value: number): CheckResult {
  if (value === answer) return { correct: true, message: `Correct! ${story.answerSentence}` };
  const [x, y] = story.given.filter((g) => g.role !== 'extra').map((g) => g.value);
  if (x !== undefined && y !== undefined) {
    const used = operationUsed(value, Math.max(x, y), Math.min(x, y), story.solve.op);
    if (used) {
      const did = used === '+' ? `You added ${x} and ${y}.` : used === '-' ? `You took ${Math.min(x, y)} away from ${Math.max(x, y)}.` : DID[used](x, y);
      return { correct: false, misconception: 'wrong_operation', message: 'Hmm, not quite.', detail: `${did} But in this story, ${storyReason(story)}` };
    }
  }
  if (Math.abs(value - answer) === 1) {
    return { correct: false, misconception: 'off_by_one', message: 'So close!', detail: 'Check your working again.' };
  }
  return {
    correct: false,
    misconception: value > answer ? 'too_big' : 'too_small',
    message: 'Not quite.',
    detail: "Let's look at the story again.",
  };
}

// ---------------------------------------------------------------- other kinds

function checkTrueFalse(p: TrueFalseProblem, said: boolean): CheckResult {
  const { left, right } = p.equation;
  const expr = left.ops.length ? left : right;
  const shown = left.ops.length ? right : left;
  const actual = evalExpr(expr, 0);
  const shownValue = evalExpr(shown, 0);
  const correct = said === p.answer;
  if (p.answer) {
    return correct
      ? { correct, message: `Correct! ${exprText(expr)} is ${actual}, so it is true.` }
      : { correct, message: 'Look again.', detail: `${exprText(expr)} is ${actual}. Both sides are the same, so it is true.` };
  }
  return correct
    ? { correct, message: `Correct! ${exprText(expr)} is ${actual}, not ${shownValue}.` }
    : { correct, message: 'Look again.', detail: `${exprText(expr)} is ${actual}, not ${shownValue}. So it is false.` };
}

export const RELATION_WORDS: Record<Relation, string> = {
  '<': 'is less than',
  '=': 'is equal to',
  '>': 'is more than',
};

function checkRelation(p: RelationProblem, said: Relation): CheckResult {
  const l = evalExpr(p.left, 0);
  const r = evalExpr(p.right, 0);
  if (said === p.answer) return { correct: true, message: `Correct! ${l} ${RELATION_WORDS[p.answer]} ${r}.` };
  const workings = [p.left, p.right].filter((e) => e.ops.length).map((e) => `${exprText(e)} = ${evalExpr(e, 0)}`);
  return {
    correct: false,
    message: 'Not quite.',
    detail: workings.length ? `Work out each side first: ${workings.join(', ')}.` : `Which is bigger, ${l} or ${r}?`,
  };
}

const calcText = (f: { a: number; op: Op; b: number }) => `${f.a} ${OP_SYMBOL[f.op]} ${f.b}`;

function checkChoice(p: ChoiceProblem, index: number): CheckResult {
  const right = p.options[p.answer];
  const chosen = p.options[index];
  if (!chosen) return mismatch();
  if (index === p.answer) {
    return {
      correct: true,
      message: p.style === 'expression' ? `Correct! ${calcText(right)} answers the question.` : `Correct! ${factText(right)} matches the story.`,
    };
  }
  if (chosen.op !== right.op) {
    return {
      correct: false,
      misconception: 'wrong_operation',
      message: 'Not quite.',
      detail: `${calcText(chosen)} = ${chosen.c}. In this story, ${storyReason(p.story)}`,
    };
  }
  return { correct: false, misconception: 'wrong_numbers', message: 'Not quite.', detail: 'Check the numbers. Do they match the story?' };
}

const MATCH_WORDS: Record<Op, string> = {
  '+': 'gets more',
  '-': 'takes some away or compares',
  '*': 'has equal groups',
  '/': 'shares equally',
};

function checkMatch(p: MatchProblem, index: number): CheckResult {
  if (index === p.answer) return { correct: true, message: `Correct! That story is ${factText(p.equation)}.` };
  const chosen = p.optionFacts[index];
  if (!chosen) return mismatch();
  return {
    correct: false,
    misconception: chosen.op === p.equation.op ? 'wrong_numbers' : 'wrong_operation',
    message: 'Not quite.',
    detail: `That story is ${calcText(chosen)}. We need a story that ${MATCH_WORDS[p.equation.op]}, with ${p.equation.a} and ${p.equation.b}.`,
  };
}

function checkMake(p: MakeProblem, ans: { a: number; op: Op; b: number }): CheckResult {
  if (ans.a === ans.b) return { correct: false, message: 'Pick two different cards.' };
  const x = p.cards[ans.a];
  const y = p.cards[ans.b];
  const result = applyOp(ans.op, x, y);
  const text = `${x} ${OP_SYMBOL[ans.op]} ${y}`;
  if (result === p.target) return { correct: true, message: `Yum! ${text} = ${p.target}.` };
  if (result < 0) return { correct: false, message: `${text} does not work.`, detail: 'We cannot take away more than we have.', misconception: 'reversed_order' };
  return {
    correct: false,
    misconception: result > p.target ? 'too_big' : 'too_small',
    message: `${text} = ${result}.`,
    detail: result > p.target ? `That is more than ${p.target}. Try smaller numbers.` : `That is less than ${p.target}. Try bigger numbers.`,
  };
}

function checkSequence(p: SequenceProblem, value: number): CheckResult {
  const dir = p.step > 0 ? 'up' : 'down';
  if (value === p.answer) return { correct: true, message: `Correct! The train goes ${dir} in ${Math.abs(p.step)}s.` };
  const i = p.terms.indexOf(null);
  const prev = i > 0 ? p.terms[i - 1] : null;
  if (prev !== null && Math.abs(value - (prev as number)) === 1 && Math.abs(p.step) !== 1) {
    return { correct: false, misconception: 'other', message: 'Look at the jumps.', detail: 'The numbers do not change by 1 each time. How much do they change by?' };
  }
  return { correct: false, misconception: value > p.answer ? 'too_big' : 'too_small', message: 'Not quite.', detail: 'How much does each car go up or down by?' };
}

// ---------------------------------------------------------------- story → equation

export const ACTION_PRAISE: Record<ActionId, string> = {
  join: 'Yes! More joined in.',
  partwhole: 'Yes! Two parts make a whole.',
  separate: 'Yes! Some went away.',
  compare: 'Yes! We are comparing two amounts.',
  groups: 'Yes! There are equal groups.',
  share: 'Yes! Things are shared or grouped equally.',
};

export function checkAction(story: Story, action: ActionId): CheckResult {
  if (story.actions.includes(action)) return { correct: true, message: ACTION_PRAISE[action] };
  return {
    correct: false,
    misconception: 'misread_relation',
    message: 'Look again at the story.',
    detail: `Think about what really happens: ${storyReason(story)}`,
  };
}

/** Tapping the numbers we need: an unneeded number gets a gentle question. */
export function checkQuantity(_story: Story, role: string, value: number): CheckResult {
  if (role === 'extra') {
    return { correct: false, misconception: 'used_extra_number', message: `Do we need ${value}?`, detail: 'This number does not help to answer the question.' };
  }
  return { correct: true, message: `${value} is important.` };
}

/** Turn tiles into an equation (null if it is not one yet). */
export function parseTiles(tiles: TileSpec[]): { equation: Equation | null; problem?: string } {
  const eqAt = tiles.findIndex((t) => t.kind === 'eq');
  if (eqAt < 0) return { equation: null, problem: 'An equation needs an = sign.' };
  if (tiles.filter((t) => t.kind === 'eq').length > 1) return { equation: null, problem: 'Use just one = sign.' };
  const side = (part: TileSpec[]): Expr | null => {
    if (part.length === 0 || part.length % 2 === 0) return null;
    const terms: (number | null)[] = [];
    const ops: Op[] = [];
    for (let i = 0; i < part.length; i++) {
      const t = part[i];
      if (i % 2 === 0) {
        if (t.kind === 'num') terms.push(t.value);
        else if (t.kind === 'unknown') terms.push(null);
        else return null;
      } else if (t.kind === 'op') ops.push(t.op);
      else return null;
    }
    return { terms, ops };
  };
  const left = side(tiles.slice(0, eqAt));
  const right = side(tiles.slice(eqAt + 1));
  if (!left || !right) return { equation: null, problem: 'Put a number or ? on both sides of =, with a sign between numbers.' };
  return { equation: { left, right } };
}

/** Canonical text for comparing equations: sides may swap, and 3 + 4 matches 4 + 3. */
function canonical(eq: Equation): string {
  const side = (e: Expr) => {
    const parts = e.terms.map((t) => (t === null ? '?' : String(t)));
    if (e.ops.length === 1 && commutes(e.ops[0])) parts.sort();
    return e.ops.length === 1 ? `${parts[0]}${e.ops[0]}${parts[1]}` : parts.join(e.ops.join(''));
  };
  return [side(eq.left), side(eq.right)].sort().join('=');
}

export function sameEquation(x: Equation, y: Equation): boolean {
  return canonical(x) === canonical(y);
}

export function checkBuilt(p: TranslateProblem, tiles: TileSpec[]): CheckResult {
  const { equation, problem } = parseTiles(tiles);
  if (!equation) return { correct: false, message: 'Almost!', detail: problem, misconception: 'other' };
  if (countBlanks(equation) !== 1) {
    return { correct: false, message: 'Almost!', detail: 'Use one ? for the number we are looking for.', misconception: 'other' };
  }
  const story = p.story;
  const used = tiles.filter((t): t is { kind: 'num'; value: number } => t.kind === 'num').map((t) => t.value);
  const extra = story.quantities.extra;
  if (extra !== undefined && used.includes(extra) && !story.given.some((g) => g.role !== 'extra' && g.value === extra)) {
    return { correct: false, misconception: 'used_extra_number', message: `Do we need the number ${extra}?`, detail: 'Read the question again. Which numbers help to answer it?' };
  }
  const needed = story.given.filter((g) => g.role !== 'extra').map((g) => g.value).sort((a, b) => a - b);
  if (JSON.stringify([...used].sort((a, b) => a - b)) !== JSON.stringify(needed)) {
    return { correct: false, misconception: 'wrong_numbers', message: 'Check your numbers.', detail: `Use the numbers from the story: ${needed.join(' and ')}.` };
  }
  if (!holds(equation, p.answer)) {
    const ops = [...equation.left.ops, ...equation.right.ops];
    const expected = [...story.equation.left.ops, ...story.equation.right.ops, story.solve.op];
    if (!ops.some((op) => expected.includes(op))) {
      return { correct: false, misconception: 'wrong_operation', message: 'Look at what happened in the story.', detail: `In this story, ${storyReason(story)}` };
    }
    return { correct: false, misconception: 'reversed_order', message: 'Almost!', detail: 'Check the order of the numbers. Does your equation match the story?' };
  }
  if (sameEquation(equation, story.equation)) {
    return { correct: true, form: 'story', message: 'You wrote the story as an equation!' };
  }
  const blankAlone = isBlank(equation.left) || isBlank(equation.right);
  if (blankAlone) return { correct: true, form: 'solve', message: 'Yes! That calculation finds the answer.' };
  return { correct: true, form: 'family', message: 'Yes! That equation is true for this story.' };
}
