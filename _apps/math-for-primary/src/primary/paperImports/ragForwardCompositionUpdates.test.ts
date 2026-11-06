import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragForwardCompositionUpdates';

describe('forward composition updates', () => {
  it('solves each generated item from the visible counts and percentage', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      const q = makeRagQuestion(seed, seed % 7);
      const text = [...(q.context ?? []), q.prompt].join(' ');
      const nums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
      let independentlySolved: number;
      if (q.prompt.includes('How many red beads were used?')) {
        const [total, startPct, removed, leftPct] = nums;
        independentlySolved = total * startPct / 100 - (total - removed) * leftPct / 100;
      } else if (text.includes('none of them storybooks')) {
        const [total, pct, added] = nums;
        independentlySolved = total * pct / 100 / (total + added) * 100;
      } else if (text.includes('more ripe oranges are added')) {
        const [total, pct, added] = nums;
        const ripe = total * pct / 100;
        independentlySolved = (ripe + added) / (total + added) * 100;
      } else {
        const [total, count, added] = nums;
        independentlySolved = count / (total + added) * 100;
      }
      expect(Number(q.answer)).toBeCloseTo(independentlySolved, 2);
      seen.add(q.prompt);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
