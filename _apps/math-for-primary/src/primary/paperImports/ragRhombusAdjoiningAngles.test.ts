import {describe, expect, it} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragRhombusAdjoiningAngles';

describe('rhombus adjoining-angle generator', () => {
  it('declares the level, family and curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-rhombus-adjoining-angle-constraints');
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.SHAPE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02']);
  });

  it.each([[1, 0], [18, 3], [2026, 7], [99123, 2]])('solves the visible givens for seed %i, index %i', (seed, index) => {
    const q = makeRagQuestion(seed, index);
    const match = /Angle BAD is (\d+)°/.exec(q.prompt);
    expect(match).not.toBeNull();
    const given = Number(match![1]);
    const rhombusAngleAtD = 180 - given;
    const angleAtD = 360 - rhombusAngleAtD - 60;
    const independentlySolved = (180 - angleAtD) / 2;
    expect(Number(q.answer)).toBe(independentlySolved);
    expect(q.workedSteps).toHaveLength(3);
  });
});
