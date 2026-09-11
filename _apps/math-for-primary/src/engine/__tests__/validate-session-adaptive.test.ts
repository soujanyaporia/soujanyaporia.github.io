import { describe, expect, it } from 'vitest';
import {
  DAY,
  dueReviews,
  emptyStats,
  masteryBand,
  simplePolicy,
  updateStats,
  type AttemptOutcome,
  type StatsMap,
} from '../adaptive';
import { Rng } from '../random';
import { buildSession, repeatRequest } from '../session';
import { generateProblem } from '../skills';
import type { NumberProblem, SkillId, TranslateProblem } from '../types';
import { checkAction, checkAnswer, checkBuilt, parseNumber, parseTiles } from '../validate';
import { tilesOf } from './helpers';

const numberProblem = (skill: SkillId, a: number, b: number, level: 1 | 2 | 3 | 4 = 2) =>
  generateProblem({ skill, level, constraints: { fixed: { a, b } } }, 1) as NumberProblem;

describe('answer checking and misconceptions', () => {
  it('□ + 4 = 7 accepts 3 and explains adding instead of undoing', () => {
    const p = numberProblem('add.missing_first', 3, 4);
    expect(checkAnswer(p, { kind: 'number', value: 3 })).toMatchObject({ correct: true, message: 'Correct! 3 + 4 = 7.' });
    const added = checkAnswer(p, { kind: 'number', value: 11 });
    expect(added.misconception).toBe('wrong_operation');
    expect(added.message).toBe("We aren't adding 4 to 7.");
    expect(checkAnswer(p, { kind: 'number', value: 2 }).misconception).toBe('off_by_one');
  });

  it('8 − 3 answered 11: "You added 3"', () => {
    const r = checkAnswer(numberProblem('sub.result', 8, 3), { kind: 'number', value: 11 });
    expect(r.misconception).toBe('wrong_operation');
    expect(r.detail).toContain('That is the result of adding 3.');
  });

  it('spots the wrong operation in × and ÷', () => {
    expect(checkAnswer(numberProblem('mul.result', 3, 4, 3), { kind: 'number', value: 7 }).detail).toContain('result of adding');
    expect(checkAnswer(numberProblem('div.result', 12, 3, 3), { kind: 'number', value: 9 }).detail).toContain('result of taking away');
    expect(checkAnswer(numberProblem('div.result', 12, 3, 3), { kind: 'number', value: 36 }).detail).toContain('You multiplied');
  });

  it('9 − □ = 4: a number that is too big is explained', () => {
    const r = checkAnswer(numberProblem('sub.missing_second', 9, 5), { kind: 'number', value: 7 });
    expect(r.correct).toBe(false);
    expect(r.detail).toContain('9 − 7 = 2');
    expect(r.detail).toContain('smaller');
  });

  it('story mistakes point back to what happens in the story', () => {
    const p = generateProblem({ skill: 'word.sub', level: 2, variant: 'separate.result', constraints: { fixed: { a: 8, b: 3 } } }, 3) as NumberProblem;
    const r = checkAnswer(p, { kind: 'number', value: 11 });
    expect(r.misconception).toBe('wrong_operation');
    expect(r.detail).toContain('But in this story, 3 are taken away.');
  });

  it('parses typed numbers safely', () => {
    expect(parseNumber('12')).toBe(12);
    expect(parseNumber(' 7 ')).toBe(7);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('-3')).toBeNull();
    expect(parseNumber('1.5')).toBeNull();
    expect(parseNumber('1000')).toBeNull();
  });
});

describe('story → equation', () => {
  it('accepts the story equation and the calculation, and rejects wrong ones', () => {
    for (let seed = 1; seed < 300; seed++) {
      const p = generateProblem({ skill: 'word.build', level: 3 }, seed) as TranslateProblem;
      const story = checkBuilt(p, tilesOf(p.story.equation));
      expect(story.correct).toBe(true);
      expect(story.form).toBe('story');
      const s = p.story.solve;
      const flippedOp = s.op === '+' ? '-' : '+';
      const flipped = checkBuilt(p, tilesOf({ left: { terms: [s.a, s.b], ops: [flippedOp] }, right: { terms: [null], ops: [] } }));
      expect(flipped.correct).toBe(false);
      if (s.op === '-') {
        const reversed = checkBuilt(p, tilesOf({ left: { terms: [s.b, s.a], ops: ['-'] }, right: { terms: [null], ops: [] } }));
        expect(reversed.correct).toBe(false);
      }
    }
  });

  it('models "Ryan had some marbles…" as □ + 4 = 9, then calculates 9 − 4', () => {
    const p = generateProblem({ skill: 'word.translate', level: 2, variant: 'join.start', constraints: { fixed: { a: 5, b: 4 } } }, 9) as TranslateProblem;
    expect(checkBuilt(p, [{ kind: 'unknown' }, { kind: 'op', op: '+' }, { kind: 'num', value: 4 }, { kind: 'eq' }, { kind: 'num', value: 9 }])).toMatchObject({
      correct: true,
      form: 'story',
    });
    expect(checkBuilt(p, [{ kind: 'num', value: 9 }, { kind: 'op', op: '-' }, { kind: 'num', value: 4 }, { kind: 'eq' }, { kind: 'unknown' }])).toMatchObject({
      correct: true,
      form: 'solve',
    });
    expect(checkAction(p.story, 'join').correct).toBe(true);
    expect(checkAction(p.story, 'separate').correct).toBe(false);
  });

  it('explains incomplete equations', () => {
    expect(parseTiles([{ kind: 'num', value: 3 }, { kind: 'op', op: '+' }, { kind: 'num', value: 4 }]).problem).toMatch(/= sign/);
    expect(parseTiles([{ kind: 'num', value: 3 }, { kind: 'eq' }]).problem).toMatch(/both sides/);
  });
});

describe('sessions', () => {
  it('never repeats a question and varies story frames', () => {
    for (const skill of ['add.result', 'sub.missing_second', 'mul.groups', 'word.add', 'word.translate'] as SkillId[]) {
      for (let seed = 1; seed <= 20; seed++) {
        const problems = buildSession(repeatRequest({ skill, level: 3 }, 10), seed);
        expect(new Set(problems.map((p) => p.id)).size).toBe(10);
        const frames = problems.map((p) => ('story' in p && p.story ? p.story.frameId : null)).filter(Boolean);
        if (frames.length) expect(new Set(frames).size).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('is deterministic for a seed', () => {
    const reqs = repeatRequest({ skill: 'word.sub', level: 2 }, 5);
    expect(buildSession(reqs, 42)).toEqual(buildSession(reqs, 42));
  });

  it('can sort from easier to harder', () => {
    const reqs = (['add.result', 'sub.missing_first', 'add.missing_second', 'sub.result'] as SkillId[]).map((skill) => ({ skill, level: 2 as const }));
    const problems = buildSession(reqs, 3, { sortByDifficulty: true });
    for (let i = 1; i < problems.length; i++) expect(problems[i].difficulty).toBeGreaterThanOrEqual(problems[i - 1].difficulty);
  });
});

describe('mastery, spaced review and adaptation', () => {
  const T0 = new Date(2026, 8, 1, 10).getTime();
  const outcome = (over: Partial<AttemptOutcome>): AttemptOutcome => ({
    skill: 'sub.missing_second',
    level: 2,
    firstTry: true,
    correct: true,
    tries: 1,
    hints: 0,
    revealed: false,
    at: T0,
    format: 'equation',
    ...over,
  });

  it('raises the working level after a confident run', () => {
    let s = emptyStats(2);
    for (let i = 0; i < 5; i++) s = updateStats(s, outcome({}));
    expect(s.level).toBe(3);
  });

  it('lowers the working level after sustained difficulty', () => {
    let s = emptyStats(3);
    for (let i = 0; i < 6; i++) s = updateStats(s, outcome({ level: 3, firstTry: false, correct: false, revealed: true, hints: 3, tries: 4 }));
    expect(s.level).toBe(2);
    expect(masteryBand(s)).toBe('learning');
  });

  it('needs practice on more than one day to reach "mastered"', () => {
    let s = emptyStats(2);
    for (let i = 0; i < 10; i++) s = updateStats(s, outcome({ level: 5 }));
    expect(masteryBand(s)).toBe('almost');
    for (let i = 0; i < 3; i++) s = updateStats(s, outcome({ level: 5, at: T0 + DAY + i }));
    expect(masteryBand(s)).toBe('mastered');
  });

  it('schedules spaced reviews that stretch after success and shrink after a slip', () => {
    let s = emptyStats(2);
    for (let i = 0; i < 6; i++) s = updateStats(s, outcome({ level: 5 }));
    expect(s.review).not.toBeNull();
    expect(dueReviews({ 'sub.missing_second': s }, T0 + 2 * DAY)).toEqual(['sub.missing_second']);
    s = updateStats(s, outcome({ level: 5, at: T0 + 2 * DAY }));
    expect(s.review!.interval).toBe(3);
    s = updateStats(s, outcome({ level: 5, at: T0 + 6 * DAY, firstTry: false, hints: 2 }));
    expect(s.review!.interval).toBe(1);
  });

  it('remembers which mistakes a child makes', () => {
    let s = emptyStats(2);
    s = updateStats(s, outcome({ firstTry: false, misconception: 'wrong_operation' }));
    s = updateStats(s, outcome({ firstTry: false, misconception: 'wrong_operation' }));
    expect(s.misconceptions.wrong_operation).toBe(2);
  });

  it('gives more practice to weaker skills', () => {
    let strong = emptyStats(2);
    let weak = emptyStats(2);
    for (let i = 0; i < 10; i++) {
      strong = updateStats(strong, outcome({ skill: 'add.result' }));
      weak = updateStats(weak, outcome({ firstTry: false, hints: 2, tries: 3 }));
    }
    const stats: StatsMap = { 'add.result': strong, 'sub.result': strong, 'bond.part': strong, 'sub.missing_second': weak };
    const pool: SkillId[] = ['add.result', 'sub.result', 'bond.part', 'sub.missing_second'];
    const rng = new Rng(5);
    const counts = new Map<SkillId, number>();
    for (let session = 0; session < 200; session++) {
      const picks = simplePolicy.chooseSkills(stats, pool, 10, rng, T0);
      expect(picks.filter((id) => id === 'sub.missing_second').length).toBeLessThanOrEqual(4);
      for (const id of picks) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const weakCount = counts.get('sub.missing_second') ?? 0;
    for (const id of ['add.result', 'sub.result', 'bond.part'] as SkillId[]) expect(weakCount).toBeGreaterThan(1.5 * (counts.get(id) ?? 0));
  });
});
