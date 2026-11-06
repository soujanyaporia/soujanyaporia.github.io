import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragFilterByLineType';

type Point = [number, number];

// Follow the visible SVG strokes. Moving the pen draws nothing, but closing
// a path can add a straight side even when all the earlier strokes are curves.
function trace(d: string) {
  const tokens = d.trim().split(/\s+/);
  let i = 0;
  let x = 0, y = 0;
  let start: Point = [0, 0];
  let straight = false, curved = false;
  const points: Point[] = [];
  function pair(): Point {
    const p: Point = [Number(tokens[i++]), Number(tokens[i++])];
    if (!p.every(Number.isFinite)) throw new Error('Invalid path coordinates');
    return p;
  }
  function line(toX: number, toY: number) {
    points.push([x, y], [toX, toY]);
    if (toX !== x || toY !== y) straight = true;
    x = toX;
    y = toY;
  }
  while (i < tokens.length) {
    const command = tokens[i++];
    switch (command) {
      case 'M': [x, y] = pair(); start = [x, y]; break;
      case 'm': {
        const [dx, dy] = pair();
        x += dx; y += dy; start = [x, y];
        break;
      }
      case 'l': {
        const [dx, dy] = pair();
        line(x + dx, y + dy);
        break;
      }
      case 'q': {
        const [cx, cy] = pair(), [dx, dy] = pair();
        if (cx * dy !== cy * dx) curved = true;
        else if (cx || cy || dx || dy) straight = true;
        points.push([x, y], [x + cx, y + cy], [x + dx, y + dy]);
        x += dx; y += dy;
        break;
      }
      case 'z': line(...start); break;
      default: throw new Error(`Unexpected drawing command ${command}`);
    }
  }
  expect(points.length).toBeGreaterThan(0);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  expect(Math.min(...xs)).toBeGreaterThan(0);
  expect(Math.max(...xs)).toBeLessThan(320);
  expect(Math.min(...ys)).toBeGreaterThan(0);
  expect(Math.max(...ys)).toBeLessThan(200);
  return { straight, curved, left: Math.min(...xs), right: Math.max(...xs), bottom: Math.max(...ys) };
}

it('solves every task from the drawn strokes and their visible labels', () => {
  const positions = new Set<string>(), pairs = new Set<string>(), totals = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const diagram = q.picture;
      if (diagram?.type !== 'batch11-upper') throw new Error('Missing stroke diagram');
      const paths = diagram.marks.flatMap(m => m.kind === 'path' ? [trace(m.d)] : []);
      const labels = diagram.marks.flatMap(m => m.kind === 'text' ? [m] : []);
      if (q.prompt.includes('letters')) {
        const word = /^The word ([A-Z]+) in block capitals\.$/.exec(diagram.label)?.[1];
        if (!word) throw new Error('Missing word description');
        expect(labels).toHaveLength(0);
        paths.sort((a, b) => a.left - b.left);
        expect(paths).toHaveLength(word.length);
        const strokes = paths.map(path => path.straight && !path.curved);
        expect(strokes).toEqual([...word].map(letter => /^[AEFHKLT]$/.test(letter)));
        const total = strokes.filter(Boolean).length;
        totals.add(total);
        expect(q.answer).toBe(String(total));
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(total));
        for (const option of q.choices ?? []) expect(correctAnswer(q, option)).toBe(Number(option) === total);
        continue;
      }

      expect(paths).toHaveLength(4);
      expect(labels.map(m => m.text).sort()).toEqual(['A', 'B', 'C', 'D']);
      const both = q.prompt.includes('straight edge and a curved edge');
      if (!both) expect(q.prompt).toContain('without following any straight line');
      const matching = labels.filter(label => {
        const above = paths.filter(path => label.x >= path.left && label.x <= path.right
          && label.y > path.bottom && label.y - path.bottom < 60);
        expect(above).toHaveLength(1);
        const path = above[0];
        return path.curved && path.straight === both;
      }).map(label => label.text).sort();
      if (both) {
        expect(matching).toHaveLength(2);
        const expected = JSON.stringify(matching);
        pairs.add(expected);
        expect(q.structuredResponse).toEqual({ kind: 'named-pair', options: ['A', 'B', 'C', 'D'] });
        expect(JSON.parse(q.answer).sort()).toEqual(matching);
        expect(correctAnswer(q, JSON.stringify([...matching].reverse()))).toBe(true);
        for (const other of labels.filter(label => !matching.includes(label.text))) {
          expect(correctAnswer(q, JSON.stringify([matching[0], other.text]))).toBe(false);
        }
      } else {
        expect(matching).toHaveLength(1);
        positions.add(matching[0]);
        expect(q.answer).toBe(matching[0]);
        expect(q.choices).toEqual(['A', 'B', 'C', 'D']);
      }
    }
  }
  expect(positions.size).toBe(4);
  expect(pairs.size).toBe(6);
  expect(totals.size).toBeGreaterThanOrEqual(3);
});

it('reproduces the diagram, responses and explanation for the same seed and index', () => {
  for (const seed of [-7, 0, 18]) {
    for (const index of [0, 1, 9]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
  }
});
