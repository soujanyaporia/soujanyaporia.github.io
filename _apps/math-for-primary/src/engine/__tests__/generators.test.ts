import { describe, expect, it } from 'vitest';
import { factFamily, holds, sameCalculation, sameFact } from '../equation';
import { explain } from '../explain';
import { makeSolutions } from '../generators/games';
import { LEVEL_IDS } from '../levels';
import { ALL_SKILLS, generateProblem, hasGenerator, SKILLS } from '../skills';
import type { Problem, SkillId } from '../types';
import { checkAnswer, checkBuilt, type Answer } from '../validate';
import { evalExpr, expectUniqueAnswer, factIsTrue, numbersIn, storyOf, tilesOf, visualProblem } from './helpers';

const PER_CASE = 220; // 37 skills × 5 levels × 220 ≈ 40,000 generated questions

function correctAnswer(p: Problem): Answer {
  switch (p.kind) {
    case 'number':
    case 'translate':
    case 'sequence':
      return { kind: 'number', value: p.answer };
    case 'truefalse':
      return { kind: 'truefalse', value: p.answer };
    case 'relation':
      return { kind: 'relation', value: p.answer };
    case 'choice':
    case 'match':
      return { kind: 'choice', index: p.answer };
    case 'make': {
      const [a, op, b] = makeSolutions(p.cards, p.ops, p.target)[0];
      return { kind: 'make', a, op, b };
    }
  }
}

function wrongAnswer(p: Problem): Answer | null {
  switch (p.kind) {
    case 'number':
    case 'translate':
    case 'sequence':
      return { kind: 'number', value: p.answer + 1 };
    case 'truefalse':
      return { kind: 'truefalse', value: !p.answer };
    case 'relation':
      return { kind: 'relation', value: p.answer === '=' ? '<' : '=' };
    case 'choice':
    case 'match':
      return { kind: 'choice', index: (p.answer + 1) % p.options.length };
    case 'make':
      for (let a = 0; a < p.cards.length; a++)
        for (let b = 0; b < p.cards.length; b++)
          if (a !== b && p.cards[a] + p.cards[b] !== p.target) return { kind: 'make', a, op: '+', b };
      return null;
  }
}

/** Returns a description of the first problem found, or null if valid. */
function validate(p: Problem): string | null {
  const limit = SKILLS[p.skill].limit(p.level);
  if (!factIsTrue(p.fact)) return `fact is false: ${JSON.stringify(p.fact)}`;
  if (p.difficulty < 1 || p.difficulty > 10) return `difficulty ${p.difficulty} out of range`;
  for (const n of numbersIn(p)) {
    if (!Number.isInteger(n)) return `non-integer ${n}`;
    if (n < 0) return `negative number ${n}`;
    if (n > limit) return `number ${n} above the level limit ${limit}`;
  }

  switch (p.kind) {
    case 'number': {
      if (p.related && !holds(p.related, p.answer)) return 'related equation does not share the answer';
      if (p.format === 'equation') return expectUniqueAnswer(p.equation!, p.answer, limit);
      if (p.format === 'bond') {
        const { whole, parts } = p.bond!;
        const filled = [whole, ...parts].map((v) => v ?? p.answer);
        if ([whole, ...parts].filter((v) => v === null).length !== 1) return 'bond must hide exactly one value';
        return filled[0] === filled[1] + filled[2] ? null : 'bond parts do not make the whole';
      }
      const story = p.story!;
      if (story.solve.c !== p.answer) return 'story answer does not match solve fact';
      return expectUniqueAnswer(story.equation, p.answer, limit);
    }
    case 'truefalse':
      return (evalExpr(p.equation.left, 0) === evalExpr(p.equation.right, 0)) === p.answer ? null : 'true/false answer is wrong';
    case 'relation': {
      const l = evalExpr(p.left, 0);
      const r = evalExpr(p.right, 0);
      const actual = l < r ? '<' : l > r ? '>' : '=';
      return actual === p.answer ? null : `relation should be ${actual}`;
    }
    case 'choice': {
      const min = p.style === 'expression' ? 3 : 3;
      if (p.options.length < min) return `expected at least ${min} options, got ${p.options.length}`;
      if (new Set(p.options.map((o) => `${o.a}${o.op}${o.b}`)).size !== p.options.length) return 'duplicate options';
      if (!p.options.every(factIsTrue)) return 'an option is not a true equation';
      const fitting = p.options.filter((o) => p.story.accepted.some((f) => sameCalculation(f, o)));
      if (fitting.length !== 1) return `${fitting.length} options fit the story`;
      if (p.style === 'expression' && p.options.some((o, i) => i !== p.answer && o.c === p.options[p.answer].c)) {
        return 'a wrong calculation gives the right number';
      }
      return sameCalculation(p.options[p.answer], p.story.solve) ? null : 'marked option is not the solve fact';
    }
    case 'match': {
      if (p.options.length !== 3 || new Set(p.options).size !== 3) return 'match needs 3 different stories';
      if (!p.optionFacts.every(factIsTrue)) return 'a story describes impossible maths';
      const family = factFamily(p.equation);
      const matching = p.optionFacts.filter((f) => sameCalculation(f, p.equation));
      if (matching.length !== 1 || !sameCalculation(p.optionFacts[p.answer], p.equation)) return 'exactly one story must match';
      if (p.optionFacts.some((f, i) => i !== p.answer && family.some((g) => sameFact(g, f)))) return 'a wrong story is in the fact family';
      return null;
    }
    case 'make':
      return makeSolutions(p.cards, p.ops, p.target).length > 0 ? null : 'no way to make the target';
    case 'sequence': {
      const filled = p.terms.map((t) => t ?? p.answer);
      if (p.terms.filter((t) => t === null).length !== 1) return 'sequence needs one gap';
      for (let i = 1; i < filled.length; i++) if (filled[i] - filled[i - 1] !== p.step) return 'sequence is not steady';
      return null;
    }
    case 'translate': {
      const story = p.story;
      if (story.solve.c !== p.answer) return 'translate answer mismatch';
      const issue = expectUniqueAnswer(story.equation, p.answer, limit);
      if (issue) return issue;
      const asStory = checkBuilt(p, tilesOf(story.equation));
      if (!asStory.correct || asStory.form !== 'story') return `story equation tiles rejected: ${asStory.detail}`;
      const solveEq = { left: { terms: [story.solve.a, story.solve.b], ops: [story.solve.op] }, right: { terms: [null], ops: [] } };
      const asSolve = checkBuilt(p, tilesOf(solveEq));
      if (!asSolve.correct) return `solve tiles rejected: ${asSolve.detail}`;
      if (!story.actions.every((a) => p.actionChoices.includes(a) || story.actions.length > 1)) return 'action choices miss the answer';
      if (!p.actionChoices.some((a) => story.actions.includes(a))) return 'no correct action offered';
      return null;
    }
  }
}

describe('skill registry', () => {
  it('has a generator for every skill', () => {
    for (const id of ALL_SKILLS) expect(hasGenerator(id), id).toBe(true);
  });
});

describe('generated questions are mathematically valid', () => {
  for (const skill of ALL_SKILLS) {
    for (const level of LEVEL_IDS) {
      if (level < SKILLS[skill].minLevel || level > SKILLS[skill].maxLevel) continue;
      it(`${skill} at level ${level}`, () => {
        for (let i = 0; i < PER_CASE; i++) {
          const seed = (level * 1_000_003 + i * 7919) >>> 0;
          const p = generateProblem({ skill, level }, seed);
          const problem = validate(p);
          if (problem) throw new Error(`${skill} L${level} seed ${seed}: ${problem}\n${JSON.stringify(p)}`);
          expect(p.skill).toBe(skill);
          expect(p.level).toBe(level);

          // Answer checking agrees with the generator.
          expect(checkAnswer(p, correctAnswer(p)).correct).toBe(true);
          const wrong = wrongAnswer(p);
          if (wrong) expect(checkAnswer(p, wrong).correct).toBe(false);

          // Every question can be explained, with four progressive hints.
          const e = explain(p);
          expect(e.steps.length).toBeGreaterThanOrEqual(3);
          expect(e.hints.map((h) => h.level)).toEqual([1, 2, 3, 4]);
          expect(e.steps.some((s) => s.reveal)).toBe(true);
          const text = [e.goal, ...e.steps.map((s) => s.say), ...e.hints.map((h) => h.say), ...(e.alternatives ?? []).flatMap((a) => a.steps.map((s) => s.say))].join(' ');
          expect(text).not.toMatch(/undefined|NaN|\{|\}|Infinity/);
          const visuals = [...e.steps, ...e.hints, ...(e.alternatives ?? []).flatMap((a) => a.steps)].map((s) => s.visual);
          for (const v of visuals) {
            const issue = visualProblem(v);
            if (issue) throw new Error(`${skill} L${level} seed ${seed}: ${issue}`);
          }
          if (storyOf(p)) expect(storyOf(p)!.text.length).toBeGreaterThan(20);
        }
      });
    }
  }
});

describe('determinism', () => {
  it('the same seed always gives the same question', () => {
    for (const skill of ALL_SKILLS) {
      expect(generateProblem({ skill, level: 3 }, 12345)).toEqual(generateProblem({ skill, level: 3 }, 12345));
    }
  });

  it('different seeds give varied questions', () => {
    for (const skill of ALL_SKILLS) {
      const ids = new Set(Array.from({ length: 60 }, (_, i) => generateProblem({ skill, level: 3 }, i + 1).id));
      expect(ids.size, skill).toBeGreaterThan(8);
    }
  });
});

describe('difficulty model', () => {
  it('ranks question shapes sensibly', () => {
    const d = (skill: SkillId, a: number, b: number, level: 1 | 2 | 3 = 3) =>
      generateProblem({ skill, level, constraints: { fixed: { a, b } } }, 1).difficulty;
    expect(d('add.result', 3, 2, 1)).toBeLessThan(d('add.missing_first', 6, 7));
    expect(d('add.missing_first', 6, 7)).toBeLessThan(d('sub.missing_first', 14, 6));
    expect(d('mul.result', 3, 4)).toBeLessThan(d('div.result', 12, 4));
  });
});

describe('level limits and pedagogy', () => {
  it('within-5 and within-10 questions never exceed their range', () => {
    for (const skill of ALL_SKILLS) {
      for (const level of [1, 2] as const) {
        for (let i = 0; i < 150; i++) {
          const p = generateProblem({ skill, level }, 900 + i);
          expect(Math.max(...numbersIn(p))).toBeLessThanOrEqual(SKILLS[skill].limit(level));
        }
      }
    }
  });

  it('respects lesson constraints', () => {
    for (let i = 0; i < 500; i++) {
      const p = generateProblem({ skill: 'add.result', level: 2, constraints: { maxWhole: 5, minOperand: 1, maxB: 3 } }, i);
      expect(p.fact.c).toBeLessThanOrEqual(5);
      expect(p.fact.b).toBeLessThanOrEqual(3);
      expect(Math.min(p.fact.a, p.fact.b)).toBeGreaterThanOrEqual(1);
      const t = generateProblem({ skill: 'mul.result', level: 4, constraints: { table: 5 } }, i);
      expect(t.fact.b).toBe(5);
    }
  });

  it('division is always exact, with no remainders or zero divisors', () => {
    for (const skill of ['div.sharing', 'div.grouping', 'div.inverse', 'div.result', 'word.div'] as SkillId[]) {
      for (const level of LEVEL_IDS) {
        for (let i = 0; i < 200; i++) {
          const p = generateProblem({ skill, level }, 40 + i);
          const f = p.kind === 'number' && p.story ? p.story.solve : p.fact;
          if (f.op === '/') {
            expect(f.b).toBeGreaterThan(1);
            expect(f.a % f.b).toBe(0);
          }
        }
      }
    }
  });

  it('early multiplication pictures stay small enough to count', () => {
    for (let i = 0; i < 300; i++) {
      const p = generateProblem({ skill: 'mul.groups', level: 2 }, i);
      if (p.kind !== 'number' || p.picture?.type !== 'groups') throw new Error('expected a groups picture');
      expect(p.picture.groups * p.picture.size).toBeLessThanOrEqual(20);
    }
  });
});
