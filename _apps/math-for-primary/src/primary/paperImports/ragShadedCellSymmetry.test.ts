import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragShadedCellSymmetry';

type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Line = Extract<Diagram['marks'][number], {kind: 'line'}>;
type Cell = {x: number; y: number; width: number; height: number; shaded: boolean; label?: string};

// Read rendered rectangles, number labels and the drawn AB line only.
// Reflect geometric centres by projection, independently of the generator's index rules.
function solveVisible(q: Question) {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing grid figure');
  const cells: Cell[] = [];
  for (const mark of picture.marks) {
    if (mark.kind !== 'path') continue;
    const m = /^M (\d+) (\d+) H (\d+) V (\d+) H (\d+) Z$/.exec(mark.d);
    if (!m) throw new Error('The visible figure contains an unreadable cell');
    const [, left, top, right, bottom, closingLeft] = m;
    if (left !== closingLeft) throw new Error('Cell does not close as a rectangle');
    cells.push({
      x: Number(left), y: Number(top),
      width: Number(right) - Number(left), height: Number(bottom) - Number(top),
      shaded: !!mark.fill && mark.fill !== 'white' && mark.fill !== 'none',
    });
  }
  const lines = picture.marks.filter((mark): mark is Line => mark.kind === 'line');
  if (lines.length !== 1) throw new Error('Expected one visible mirror line');
  const axis = lines[0]!;
  for (const mark of picture.marks) {
    if (mark.kind !== 'text' || !/^\d+$/.test(mark.text)) continue;
    const cell = cells.find(c => mark.x > c.x && mark.x < c.x + c.width && mark.y > c.y && mark.y < c.y + c.height);
    if (!cell || cell.label) throw new Error('Number label is missing a unique cell');
    cell.label = mark.text;
  }
  const dx = axis.x2 - axis.x1, dy = axis.y2 - axis.y1;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) throw new Error('Mirror line has zero length');
  const partners = new Map<Cell, Cell>();
  for (const cell of cells) {
    const x = cell.x + cell.width / 2, y = cell.y + cell.height / 2;
    const t = ((x - axis.x1) * dx + (y - axis.y1) * dy) / lengthSquared;
    const reflectedX = 2 * (axis.x1 + t * dx) - x;
    const reflectedY = 2 * (axis.y1 + t * dy) - y;
    const other = cells.find(c => Math.abs(c.x + c.width / 2 - reflectedX) < 1e-7 && Math.abs(c.y + c.height / 2 - reflectedY) < 1e-7);
    if (!other) throw new Error('A reflected cell lies outside the visible grid');
    partners.set(cell, other);
  }
  const given = cells.filter(c => c.shaded);
  const additions = [...new Set(given.map(c => partners.get(c)!).filter(c => !c.shaded))];
  return {picture, cells, axis, partners, given, additions};
}

function isSymmetric(cells: Set<Cell>, partners: Map<Cell, Cell>) {
  return [...cells].every(cell => cells.has(partners.get(cell)!));
}

describe('shaded-cell symmetry candidate', () => {
  it('independently solves visible grids and checks grading across seeds and indices', () => {
    const forms = new Set<string>();
    const orientations = new Set<string>();
    const counts = new Set<number>();
    for (let seed = 0; seed < 80; seed++) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const visible = solveVisible(q);
        const {cells, axis, partners, given, additions} = visible;
        expect(cells).toHaveLength(36);
        expect(new Set(cells.map(c => `${c.x},${c.y}`)).size).toBe(36);
        expect(new Set(cells.map(c => c.x)).size).toBe(6);
        expect(new Set(cells.map(c => c.y)).size).toBe(6);
        for (const cell of cells) {
          expect(cell.width).toBeGreaterThan(0);
          expect(cell.height).toBe(cell.width);
          expect(cell.width).toBe(cells[0]!.width);
          expect(partners.get(partners.get(cell)!)).toBe(cell);
        }
        const statedCount = /Keep the (\d+) shaded squares/.exec(q.context?.join(' ') ?? '');
        expect(statedCount).not.toBeNull();
        expect(Number(statedCount![1])).toBe(given.length);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(additions.length).toBeGreaterThan(0);
        const completed = new Set([...given, ...additions]);
        expect(isSymmetric(completed, partners)).toBe(true);
        for (const necessary of additions) {
          const incomplete = new Set(completed);
          incomplete.delete(necessary);
          expect(isSymmetric(incomplete, partners)).toBe(false);
        }
        const dx = axis.x2 - axis.x1, dy = axis.y2 - axis.y1;
        orientations.add(dx === 0 ? 'vertical' : dy === 0 ? 'horizontal' : dx * dy > 0 ? 'descending' : 'ascending');
        expect(visible.picture.marks.some(m => m.kind === 'text' && m.text === 'A')).toBe(true);
        expect(visible.picture.marks.some(m => m.kind === 'text' && m.text === 'B')).toBe(true);

        if (q.structuredResponse) {
          forms.add('completion');
          const spec = q.structuredResponse;
          if (spec.kind !== 'named-pair') throw new Error('Unexpected completion response');
          expect(additions).toHaveLength(2);
          const expected = additions.map(cell => {
            if (!cell.label) throw new Error('A necessary addition has no selectable label');
            return cell.label;
          }).sort();
          const labelled = cells.filter(c => c.label);
          expect(labelled).toHaveLength(6);
          expect(labelled.every(c => !c.shaded)).toBe(true);
          expect(labelled.map(c => c.label!).sort()).toEqual([...spec.options].sort());
          expect(JSON.parse(q.answer).sort()).toEqual(expected);
          expect(correctAnswer(q, JSON.stringify(expected))).toBe(true);
          expect(correctAnswer(q, JSON.stringify([...expected].reverse()))).toBe(true);
          const wrong = spec.options.find(label => !expected.includes(label));
          expect(wrong).toBeDefined();
          expect(correctAnswer(q, JSON.stringify([expected[0], wrong]))).toBe(false);
          expect(correctAnswer(q, JSON.stringify([expected[0], expected[0]]))).toBe(false);
          expect(correctAnswer(q, String(additions.length))).toBe(false);
        } else {
          forms.add('count');
          counts.add(additions.length);
          expect(q.unit).toBe('squares');
          expect(q.answer).toBe(String(additions.length));
          expect(correctAnswer(q, String(additions.length))).toBe(true);
          expect(correctAnswer(q, String(additions.length - 1))).toBe(false);
          expect(correctAnswer(q, String(additions.length + 1))).toBe(false);
        }
      }
    }
    expect([...forms].sort()).toEqual(['completion', 'count']);
    expect([...orientations].sort()).toEqual(['ascending', 'descending', 'horizontal', 'vertical']);
    expect([...counts].sort()).toEqual([1, 2, 3, 4]);
  });

  it('is deterministic while varying visible patterns and supporting negative integer seeds', () => {
    const figures = new Set<string>();
    for (let seed = -16; seed < 32; seed++) {
      const q = makeRagQuestion(seed, 0);
      expect(makeRagQuestion(seed)).toEqual(q);
      expect(makeRagQuestion(seed, 0)).toEqual(q);
      expect(makeRagQuestion(seed, 1).key).not.toBe(q.key);
      expect(makeRagQuestion(seed, 1).picture).not.toEqual(q.picture);
      solveVisible(q);
      figures.add(JSON.stringify(q.picture));
    }
    expect(figures.size).toBeGreaterThan(30);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.skillIds).toContain('P4.S.SYM.02');
    expect(RAG_PATTERN.canonicalPatternId).toBe('shaded-cell-symmetry-completion-and-repair');
  });
});
