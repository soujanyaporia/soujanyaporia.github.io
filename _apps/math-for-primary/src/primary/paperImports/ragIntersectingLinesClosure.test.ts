import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragIntersectingLinesClosure';

function solveVisibleQuestion(prompt: string): string {
  const rightTriangle = /angle ABC is (\d+)° and angle BAC is 90°\. In triangle CDE, angle CED is (\d+)°\. Find angle CDE\./;
  const plainTriangles = /angle BAC is (\d+)° and angle ABC is (\d+)°\. In triangle CDE, angle CED is (\d+)°\. Find angle CDE\./;
  const collinearTriangles = /Angle AED is (\d+)°\. In triangle ECD, angle CDE is (\d+)°\. In triangle ABC, angle BAC is (\d+)°\. Find angle ABC\./;
  const perpendicular = /Angle AOC is (\d+)°\. Are the lines perpendicular\?/;

  let match = rightTriangle.exec(prompt);
  if (match) {
    const [, b, e] = match.map(Number) as [number, number, number];
    const c = 180 - 90 - b;
    return String(180 - e - c);
  }
  match = plainTriangles.exec(prompt);
  if (match) {
    const [, a, b, e] = match.map(Number) as [number, number, number, number];
    const c = 180 - a - b;
    return String(180 - e - c);
  }
  match = collinearTriangles.exec(prompt);
  if (match) {
    const [, e, d, a] = match.map(Number) as [number, number, number, number];
    const ced = 180 - e;
    const ecd = 180 - ced - d;
    const acb = 180 - ecd;
    return String(180 - a - acb);
  }
  match = perpendicular.exec(prompt);
  if (match) return Number(match[1]) === 90 ? 'Yes' : 'No';
  throw new Error(`Could not solve from visible question text: ${prompt}`);
}

describe('intersecting-line angle closure generator', () => {
  it('uses every supported structure and agrees with a solver reading only visible givens', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed++) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        seen.add(question.choices ? 'perpendicular' : question.prompt.includes('angle BAC is 90°') ? 'right-triangle' : question.prompt.includes('A, E and C') ? 'collinear-triangles' : 'intersecting-triangles');
        expect(question.answer).toBe(solveVisibleQuestion(question.prompt));
        if (question.unit === '°') {
          expect(Number(question.answer)).toBeGreaterThan(0);
          expect(Number(question.answer)).toBeLessThan(180);
        }
      }
    }
    expect([...seen].sort()).toEqual(['collinear-triangles', 'intersecting-triangles', 'perpendicular', 'right-triangle']);
  });
});
