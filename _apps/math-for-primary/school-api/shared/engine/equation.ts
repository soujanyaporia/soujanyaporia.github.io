import type { Equation, Expr, Fact, Highlight, Op, Relation, Slot, Token, WorkLine } from './types';

export const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
export const OP_WORD: Record<Op, string> = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };

export const BLANK = '□';

/** Addition undoes subtraction and multiplication undoes division (and back). */
export const INVERSE: Record<Op, Op> = { '+': '-', '-': '+', '*': '/', '/': '*' };

export const isAdditive = (op: Op) => op === '+' || op === '-';
export const commutes = (op: Op) => op === '+' || op === '*';

export function applyOp(op: Op, a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
  }
}

// ---------------------------------------------------------------- building

export function single(value: Slot): Expr {
  return { terms: [value], ops: [] };
}

export function binary(a: Slot, op: Op, b: Slot): Expr {
  return { terms: [a, b], ops: [op] };
}

/** 4 + 4 + 4 */
export function repeated(value: Slot, times: number, op: Op = '+'): Expr {
  return { terms: Array.from({ length: times }, () => value), ops: Array.from({ length: times - 1 }, () => op) };
}

export const exprOf = (fact: Fact): Expr => binary(fact.a, fact.op, fact.b);

export type FactPart = 'a' | 'b' | 'c';

/**
 * Turn a fact into an equation with the chosen part hidden.
 *   standard:  a op b = c        reversed:  c = a op b
 */
export function factToEquation(fact: Fact, hide: FactPart | null, reversed = false): Equation {
  const a = hide === 'a' ? null : fact.a;
  const b = hide === 'b' ? null : fact.b;
  const c = hide === 'c' ? null : fact.c;
  const expr = binary(a, fact.op, b);
  return reversed ? { left: single(c), right: expr } : { left: expr, right: single(c) };
}

// ---------------------------------------------------------------- maths

/** Evaluate with the usual order: × and ÷ before + and −. */
export function evalExpr(expr: Expr, unknown: number): number {
  const values = expr.terms.map((t) => (t === null ? unknown : t));
  const sums: number[] = [values[0]];
  const addOps: Op[] = [];
  expr.ops.forEach((op, i) => {
    const next = values[i + 1];
    if (op === '*' || op === '/') sums[sums.length - 1] = applyOp(op, sums[sums.length - 1], next);
    else {
      addOps.push(op);
      sums.push(next);
    }
  });
  return addOps.reduce((total, op, i) => applyOp(op, total, sums[i + 1]), sums[0]);
}

export function countBlanks(eq: Equation): number {
  return [...eq.left.terms, ...eq.right.terms].filter((t) => t === null).length;
}

export function holds(eq: Equation, unknown = 0): boolean {
  return Math.abs(evalExpr(eq.left, unknown) - evalExpr(eq.right, unknown)) < 1e-9;
}

/**
 * Solve an equation with a single unknown that appears linearly (every
 * equation in the engine except "12 ÷ □ = 4", which callers solve directly).
 */
export function solve(eq: Equation): number | null {
  const f = (x: number) => evalExpr(eq.left, x) - evalExpr(eq.right, x);
  const slope = f(1) - f(0);
  if (Math.abs(slope) < 1e-12) return null;
  const x = -f(0) / slope;
  const rounded = Math.round(x);
  return Math.abs(x - rounded) < 1e-9 ? rounded : null;
}

/** Every integer in [min, max] that makes the equation true. */
export function solutionsInRange(eq: Equation, min: number, max: number): number[] {
  const found: number[] = [];
  for (let x = min; x <= max; x++) if (holds(eq, x)) found.push(x);
  return found;
}

/**
 * The fact family:
 *   3 + 4 = 7, 4 + 3 = 7, 7 − 3 = 4, 7 − 4 = 3
 *   3 × 4 = 12, 4 × 3 = 12, 12 ÷ 3 = 4, 12 ÷ 4 = 3
 */
export function factFamily(fact: Fact): Fact[] {
  const additive = isAdditive(fact.op);
  const forward = fact.op === '+' || fact.op === '*';
  const [p, q, whole] = forward ? [fact.a, fact.b, fact.c] : [fact.b, fact.c, fact.a];
  const [up, down]: [Op, Op] = additive ? ['+', '-'] : ['*', '/'];
  const family: Fact[] = [
    { a: p, op: up, b: q, c: whole },
    { a: q, op: up, b: p, c: whole },
    { a: whole, op: down, b: p, c: q },
    { a: whole, op: down, b: q, c: p },
  ];
  const seen = new Set<string>();
  return family.filter((f) => {
    const key = factText(f);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sameFact(x: Fact, y: Fact): boolean {
  return x.a === y.a && x.b === y.b && x.op === y.op && x.c === y.c;
}

/** Same calculation, allowing 3 + 4 to match 4 + 3 (and 3 × 4 to match 4 × 3). */
export function sameCalculation(x: Fact, y: Fact): boolean {
  if (x.op !== y.op || x.c !== y.c) return false;
  if (x.a === y.a && x.b === y.b) return true;
  return commutes(x.op) && x.a === y.b && x.b === y.a;
}

// ---------------------------------------------------------------- text

export function exprText(expr: Expr, blank = BLANK): string {
  const show = (slot: Slot) => (slot === null ? blank : String(slot));
  let out = show(expr.terms[0]);
  expr.ops.forEach((op, i) => {
    out += ` ${OP_SYMBOL[op]} ${show(expr.terms[i + 1])}`;
  });
  return out;
}

export function equationText(eq: Equation, blank = BLANK): string {
  return `${exprText(eq.left, blank)} = ${exprText(eq.right, blank)}`;
}

export function factText(fact: Fact): string {
  return `${fact.a} ${OP_SYMBOL[fact.op]} ${fact.b} = ${fact.c}`;
}

// ---------------------------------------------------------------- tokens

export const tok = {
  num: (v: number, hl?: Highlight): Token => ({ t: 'num', v, hl }),
  op: (v: Op): Token => ({ t: 'op', v }),
  eq: (): Token => ({ t: 'rel', v: '=' }),
  rel: (v: Relation): Token => ({ t: 'rel', v }),
  blank: (v?: number | string, hl?: Highlight): Token => ({ t: 'blank', v, hl }),
  text: (v: string): Token => ({ t: 'text', v }),
};

export function exprTokens(expr: Expr, fill?: number | string): Token[] {
  const slot = (s: Slot): Token => (s === null ? tok.blank(fill, 'answer') : tok.num(s));
  const out: Token[] = [slot(expr.terms[0])];
  expr.ops.forEach((op, i) => {
    out.push(tok.op(op), slot(expr.terms[i + 1]));
  });
  return out;
}

/** Tokens for an equation; `fill` is shown inside the blank (e.g. once revealed). */
export function equationTokens(eq: Equation, fill?: number | string): Token[] {
  return [...exprTokens(eq.left, fill), tok.eq(), ...exprTokens(eq.right, fill)];
}

export interface FactTokenOptions {
  /** Hide one part as a box ("?"-style unknown). */
  hide?: FactPart;
  /** Colour a, b and c consistently with the visuals. */
  colour?: boolean;
  /** Value to show inside the hidden box. */
  fill?: number | string;
}

export function factTokens(fact: Fact, opts: FactTokenOptions = {}): Token[] {
  const part = (key: FactPart, v: number): Token => {
    if (opts.hide === key) return tok.blank(opts.fill, 'answer');
    return tok.num(v, opts.colour ? key : undefined);
  };
  return [part('a', fact.a), tok.op(fact.op), part('b', fact.b), tok.eq(), part('c', fact.c)];
}

/** Just the calculation: "4 × 5". */
export const calcTokens = (fact: Fact): Token[] => [tok.num(fact.a), tok.op(fact.op), tok.num(fact.b)];

export function line(tokens: Token[], tone: WorkLine['tone'] = 'normal', note?: string): WorkLine {
  return { tokens, tone, note };
}
