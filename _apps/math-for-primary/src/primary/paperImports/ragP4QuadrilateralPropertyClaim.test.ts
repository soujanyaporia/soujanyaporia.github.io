import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4QuadrilateralPropertyClaim';

function solveFromVisibleText(context: string[], prompt: string): string {
  const givens = context.join(' ').toLowerCase();
  const claim = prompt.toLowerCase();
  if (givens.includes('4 equal sides and 4 right angles') && claim.includes('is a square')) return 'True';
  if (givens.includes('rectangle has 4 equal angles') && claim.includes('exactly 1 pair')) return 'False';
  if (givens.includes('2 pairs of perpendicular lines') && claim.includes('is a rectangle')) return 'Cannot tell';
  if (givens.includes('4 equal sides and 2 pairs of parallel sides') && claim.includes('is a square')) return 'Cannot tell';
  if (givens.includes('opposite sides are equal in length') && claim.includes('is a square')) return 'Cannot tell';
  if (givens.includes('4 equal sides') && claim.includes('is a rectangle')) return 'Cannot tell';
  throw new Error(`No independent rule for visible question: ${context.join(' ')} ${prompt}`);
}

describe('quadrilateral property claim generator', () => {
  it('has answers supported by the visible givens across varied seeds and indices', () => {
    for (const seed of [-31, 0, 7, 2026, 918273]) {
      for (const index of [0, 1, 3, 8]) {
        const q = makeRagQuestion(seed, index);
        expect(q.choices).toEqual(['True', 'False', 'Cannot tell']);
        expect(solveFromVisibleText(q.context ?? [], q.prompt)).toBe(q.answer);
      }
    }
  });
});
