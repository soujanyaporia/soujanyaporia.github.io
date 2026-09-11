import { countBlanks, evalExpr, holds, solutionsInRange } from '../equation';
import type { Equation, Expr, Fact, Problem, Story, TileSpec, VisualSpec } from '../types';

export const factIsTrue = (f: Fact) => {
  switch (f.op) {
    case '+':
      return f.a + f.b === f.c;
    case '-':
      return f.a - f.b === f.c;
    case '*':
      return f.a * f.b === f.c;
    case '/':
      return f.b !== 0 && f.a === f.b * f.c;
  }
};

export function storyOf(p: Problem): Story | undefined {
  if (p.kind === 'choice' || p.kind === 'translate') return p.story;
  if (p.kind === 'number') return p.story;
  return undefined;
}

/** Every number a child will see in the question (not counting wrong options). */
export function numbersIn(p: Problem): number[] {
  const out = [p.fact.a, p.fact.b, p.fact.c];
  const eqNums = (eq: Equation) => [...eq.left.terms, ...eq.right.terms].filter((t): t is number => t !== null);
  switch (p.kind) {
    case 'number':
      if (p.equation) out.push(...eqNums(p.equation));
      if (p.related) out.push(...eqNums(p.related));
      if (p.bond) out.push(...[p.bond.whole, ...p.bond.parts].filter((t): t is number => t !== null));
      out.push(p.answer);
      break;
    case 'truefalse':
      out.push(...eqNums(p.equation));
      break;
    case 'relation':
      out.push(...eqNums({ left: p.left, right: p.right }));
      break;
    case 'match':
      out.push(p.equation.a, p.equation.b, p.equation.c);
      break;
    case 'make':
      out.push(p.target, ...p.cards);
      break;
    case 'sequence':
      out.push(...p.terms.filter((t): t is number => t !== null), p.answer);
      break;
    case 'translate':
    case 'choice':
      break;
  }
  const story = storyOf(p);
  if (story) {
    for (const [role, value] of Object.entries(story.quantities)) if (role !== 'extra') out.push(value as number);
  }
  return out;
}

/** Checks an equation has exactly one blank and exactly one valid answer. */
export function expectUniqueAnswer(eq: Equation, answer: number, max: number): string | null {
  if (countBlanks(eq) !== 1) return `expected one blank, found ${countBlanks(eq)}`;
  if (!holds(eq, answer)) return `answer ${answer} does not satisfy the equation`;
  const solutions = solutionsInRange(eq, 0, max * 3);
  if (solutions.length !== 1 || solutions[0] !== answer) return `solutions ${solutions.join(',')} (expected ${answer})`;
  return null;
}

/** The tiles a child would lay down to build this equation. */
export function tilesOf(eq: Equation): TileSpec[] {
  const side = (e: Expr): TileSpec[] =>
    e.terms.flatMap((t, i): TileSpec[] => {
      const term: TileSpec = t === null ? { kind: 'unknown' } : { kind: 'num', value: t };
      return i === 0 ? [term] : [{ kind: 'op', op: e.ops[i - 1] }, term];
    });
  return [...side(eq.left), { kind: 'eq' }, ...side(eq.right)];
}

/** Visual specs must describe something drawable. */
export function visualProblem(v: VisualSpec | undefined): string | null {
  if (!v) return null;
  switch (v.type) {
    case 'counters':
      for (const g of v.groups) {
        if (!Number.isInteger(g.count) || g.count < 0) return `bad counter count ${g.count}`;
        if ((g.crossed ?? 0) > g.count) return 'more crossed than counters';
      }
      return null;
    case 'numberline': {
      const end = v.start + v.jumps.reduce((s, j) => s + j, 0);
      if (v.min > v.max) return 'number line min > max';
      if (v.start < v.min || v.start > v.max) return `start ${v.start} outside ${v.min}-${v.max}`;
      if (end < v.min || end > v.max) return `end ${end} outside ${v.min}-${v.max}`;
      return null;
    }
    case 'bar':
      if (v.mode === 'part-whole') return v.whole.value === v.parts[0].value + v.parts[1].value ? null : 'bar parts do not add up';
      return v.big.value - v.small.value === v.diff.value && v.diff.value >= 0 ? null : 'compare bar mismatch';
    case 'groups':
      if (v.groups < 1 || v.size < 1 || !Number.isInteger(v.groups) || !Number.isInteger(v.size)) return 'bad groups';
      return (v.filled ?? v.groups) <= v.groups ? null : 'more filled groups than groups';
    case 'array':
      return v.rows >= 1 && v.cols >= 1 && v.rows <= 12 && v.cols <= 12 ? null : `bad array ${v.rows}x${v.cols}`;
    case 'share':
      if (v.mode === 'share') return v.groups >= 1 && v.total % v.groups === 0 && v.dealt <= v.total ? null : 'uneven sharing';
      return v.size >= 1 && v.total % v.size === 0 && v.dealt <= v.total / v.size ? null : 'uneven grouping';
    case 'family':
      return null;
    case 'bond':
    case 'balance':
      return null;
  }
}

export { evalExpr };
