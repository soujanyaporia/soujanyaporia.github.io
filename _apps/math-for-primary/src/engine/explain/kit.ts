import { factTokens, line, OP_SYMBOL, tok } from '../equation';
import { makeFact } from '../levels';
import type { Fact, Op, Step, Token, VisualSpec, WorkLine } from '../types';
import { COUNTER_LIMIT } from './visuals';

/** Collects steps; the visual carries over until a step changes it. */
export class StepList {
  private work: WorkLine[] = [];
  private visual: VisualSpec | undefined;
  readonly steps: Step[] = [];

  /** `visual: undefined` keeps the previous picture, `null` clears it. */
  add(say: string, visual?: VisualSpec | null, lines: WorkLine[] = [], reveal = false): this {
    if (visual !== undefined) this.visual = visual ?? undefined;
    this.work = [...this.work, ...lines];
    this.steps.push({ say, visual: this.visual, work: [...this.work], reveal });
    return this;
  }
}

export const sym = (op: Op) => OP_SYMBOL[op];
export const mk = makeFact;

/** "7 − 4 = ?" */
export const ask = (fact: Fact): WorkLine => line(factTokens(fact, { hide: 'c', fill: '?' }));
/** "? + 4 = 7" style: hide any part. */
export const askPart = (fact: Fact, hide: 'a' | 'b' | 'c'): WorkLine => line(factTokens(fact, { hide, fill: '?' }));
export const show = (fact: Fact, tone: WorkLine['tone'] = 'normal'): WorkLine =>
  line(factTokens(fact, { colour: tone === 'answer' }), tone);
export const checkLine = (fact: Fact): WorkLine => line(factTokens(fact), 'check', 'Check');
export const answerLine = (value: number): WorkLine =>
  line([tok.blank(value, 'answer'), tok.eq(), tok.num(value, 'answer')], 'answer');

/** 4 + 4 + 4 = ? */
export function repeatedLine(value: number, times: number, total?: number): WorkLine {
  const tokens: Token[] = [];
  for (let i = 0; i < times; i++) {
    if (i > 0) tokens.push(tok.op('+'));
    tokens.push(tok.num(value));
  }
  tokens.push(tok.eq(), total === undefined ? tok.blank('?') : tok.num(total, 'answer'));
  return line(tokens, total === undefined ? 'normal' : 'answer');
}

export const countable = (f: Fact) => Math.max(f.a, f.b, f.c) <= COUNTER_LIMIT;

export const counted = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "5, 6, 7" or "6, 7, … 13" for long counts (step 1 by default). */
export function countList(from: number, steps: number, dir: 1 | -1, size = 1): string {
  const nums = Array.from({ length: steps }, (_, i) => from + dir * size * (i + 1));
  if (nums.length <= 6) return nums.join(', ');
  return `${nums[0]}, ${nums[1]}, … ${nums[nums.length - 1]}`;
}

/** "9 → 8 → 7 → 6 → 5" */
export function arrowList(from: number, steps: number, dir: 1 | -1, size = 1): string {
  const nums = [from, ...Array.from({ length: steps }, (_, i) => from + dir * size * (i + 1))];
  if (nums.length <= 8) return nums.join(' → ');
  return `${nums[0]} → ${nums[1]} → … → ${nums[nums.length - 1]}`;
}
