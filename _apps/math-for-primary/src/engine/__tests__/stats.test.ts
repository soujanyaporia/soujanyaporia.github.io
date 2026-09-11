import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, clampLevel, SKILLS } from '../skills';
import { updateStats as reducerStats } from '../stats';
import { updateStats } from '../adaptive';
import type { LevelId } from '../types';

describe('skill statistics used by the progress reducer', () => {
  it('bounds working levels exactly as clampLevel does for every skill', () => {
    for (const id of ALL_SKILLS) {
      expect([SKILLS[id].minLevel, SKILLS[id].maxLevel], id).toEqual([1, 5]);
      for (const level of [1, 2, 3, 4, 5] as LevelId[]) expect(clampLevel(id, level)).toBe(level);
    }
  });
  it('is the same function the adaptive policies export', () => {
    expect(reducerStats).toBe(updateStats);
  });
});
