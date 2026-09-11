import { factFamily, sameCalculation, sameFact } from '../equation';
import { makeFact } from '../levels';
import type { Rng } from '../random';
import type { Fact, Noun, Op } from '../types';
import { NOUNS } from './frame';
import { PEOPLE, PRONOUNS, type Person } from './people';
import { plural } from './render';

/**
 * One-sentence situations for "Which story matches 8 − 3 = 5?".
 * All options share the same child and objects, so only the relationship
 * differs — the child has to read for meaning, not for names or numbers.
 */
export type MiniKind = 'join' | 'separate' | 'compare' | 'groups' | 'share';

const MINI_UNITS: Noun[] = [NOUNS.sticker, NOUNS.marble, NOUNS.apple, NOUNS.pencil, NOUNS.cookie, NOUNS.strawberry];

export interface MiniContext {
  A: Person;
  B: Person;
  unit: Noun;
}

export function miniContext(rng: Rng): MiniContext {
  const [A, B] = rng.shuffle(PEOPLE).slice(0, 2);
  return { A, B, unit: rng.pick(MINI_UNITS) };
}

const count = (n: number, noun: Noun) => `${n} ${plural(n, noun)}`;

/** The maths a mini story describes (null if the numbers do not fit it). */
export function miniFact(kind: MiniKind, x: number, y: number): Fact | null {
  switch (kind) {
    case 'join':
      return makeFact('+', x, y);
    case 'separate':
    case 'compare':
      return x > y ? makeFact('-', x, y) : null;
    case 'groups':
      return x >= 2 && y >= 2 ? makeFact('*', x, y) : null;
    case 'share':
      return y >= 2 && x % y === 0 && x / y >= 1 ? makeFact('/', x, y) : null;
  }
}

export function miniSentence(kind: MiniKind, x: number, y: number, ctx: MiniContext): string {
  const { A, B, unit } = ctx;
  const his = PRONOUNS[A.pronoun].his;
  switch (kind) {
    case 'join':
      return `${A.name} has ${count(x, unit)} and gets ${y} more.`;
    case 'separate':
      return `${A.name} has ${count(x, unit)} and gives ${y} away.`;
    case 'compare':
      return `${A.name} has ${count(x, unit)} and ${B.name} has ${y}. How many more does ${A.name} have?`;
    case 'groups':
      return `${A.name} has ${x} bags with ${count(y, unit)} in each bag.`;
    case 'share':
      return `${A.name} shares ${count(x, unit)} equally among ${y} of ${his} friends.`;
  }
}

const KIND_OF: Record<Op, MiniKind[]> = {
  '+': ['join'],
  '-': ['separate', 'compare'],
  '*': ['groups'],
  '/': ['share'],
};

export interface MiniOption {
  text: string;
  fact: Fact;
}

/**
 * The matching story for a fact plus two stories that describe different
 * calculations. No distractor may belong to the fact's own family, so there
 * is always exactly one right answer.
 */
export function matchOptions(rng: Rng, fact: Fact, allowMul: boolean, ctx: MiniContext): MiniOption[] | null {
  const kinds = KIND_OF[fact.op];
  const correctKind = rng.pick(kinds);
  const correct: MiniOption = { text: miniSentence(correctKind, fact.a, fact.b, ctx), fact };
  const family = factFamily(fact);
  const { a, b, c } = fact;
  const pool: [MiniKind, number, number][] = [
    ['join', a, b],
    ['join', b, a],
    ['separate', a, b],
    ['separate', b, a],
    ['compare', Math.max(a, b), Math.min(a, b)],
    ['join', c, b],
  ];
  if (allowMul) pool.push(['groups', a, b], ['share', a, b], ['groups', b, a]);
  const options: MiniOption[] = [];
  for (const [kind, x, y] of rng.shuffle(pool)) {
    const f = miniFact(kind, x, y);
    if (!f) continue;
    // Never a second right answer: nothing from the fact's own family.
    if (family.some((g) => sameFact(g, f)) || sameCalculation(f, fact)) continue;
    const text = miniSentence(kind, x, y, ctx);
    if (text === correct.text || options.some((o) => o.text === text)) continue;
    options.push({ text, fact: f });
    if (options.length === 2) break;
  }
  if (options.length < 2) return null;
  return [correct, ...options];
}
