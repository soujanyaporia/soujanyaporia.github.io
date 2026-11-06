import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Point } from './p3RafflesPicture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4RightAngleBenchmark';

type Reading = { name: string; degrees: number };
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const triple = (a: string, v: string, b: string) => '∠' + [a + v + b, b + v + a].sort()[0];

function measure(a: Point, vertex: Point, b: Point) {
  const direction = ([x, y]: Point) => Math.atan2(y - vertex[1], x - vertex[0]);
  const difference = Math.abs(direction(a) - direction(b)) * 180 / Math.PI;
  return Math.min(difference, 360 - difference);
}

// Recover names and openings from the same polygon vertices or line ends the pupil sees.
function readings(q: Question): Reading[] {
  const p = q.picture;
  if (p?.type === 'raffles-p3' && p.layout === 'angle-polygon') {
    const n = p.points.length;
    const labelAt = (i: number) => {
      const label = p.angles.find(mark => mark.vertex === i)?.label;
      if (!label) throw new Error('Missing corner label');
      return label;
    };
    expect(new Set(p.angles.map(mark => mark.label)).size).toBe(n);
    return p.points.map((v, i) => {
      const before = (i + n - 1) % n, after = (i + 1) % n;
      const a = p.points[before], b = p.points[after];
      const turn = (v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]);
      expect(turn).toBeGreaterThan(0); // Each marked inside angle is the smaller turn.
      const label = labelAt(i);
      const name = label === label.toLowerCase() ? '∠' + label : triple(labelAt(before), label, labelAt(after));
      return { name, degrees: measure(a, v, b) };
    });
  }
  if (p?.type !== 'batch11-upper') throw new Error('Missing diagram of the five arms');
  const dot = p.marks.find(mark => mark.kind === 'circle');
  if (dot?.kind !== 'circle') throw new Error('Missing centre dot');
  const centre: Point = [dot.cx, dot.cy];
  const vertexLetter = q.context?.join(' ').match(/centre dot is ([A-Z])/i)?.[1];
  if (!vertexLetter) throw new Error('The shared vertex must be named');
  const letters = p.marks.filter(mark => mark.kind === 'text');
  const arms = p.marks.filter(mark => mark.kind === 'line').map(line => {
    expect([line.x1, line.y1]).toEqual(centre);
    const end: Point = [line.x2, line.y2];
    const near = [...letters].sort((a, b) => distance([a.x, a.y], end) - distance([b.x, b.y], end))[0];
    return { end, label: near.text, direction: Math.atan2(dot.cy - line.y2, line.x2 - dot.cx) };
  }).sort((a, b) => a.direction - b.direction);
  expect(arms).toHaveLength(5);
  expect(p.marks.filter(mark => mark.kind === 'path')).toHaveLength(5);
  expect(new Set(arms.map(a => a.label)).size).toBe(5);
  const result = arms.map((a, i) => {
    const b = arms[(i + 1) % arms.length];
    return { name: triple(a.label, vertexLetter, b.label), degrees: measure(a.end, centre, b.end) };
  });
  expect(result.reduce((sum, a) => sum + a.degrees, 0)).toBeCloseTo(360, 8);
  return result;
}

it('solves each prompt from its labelled openings and checks the pupil response', () => {
  const prompts = new Set<string>(), winners = new Set<string>();
  for (let seed = -8; seed <= 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const all = readings(q);
      const strictLess = q.prompt.includes('smaller');
      const strictMore = q.prompt.includes('wider');
      const equality = q.prompt.includes('exactly');
      expect([strictLess, strictMore, equality].filter(Boolean)).toHaveLength(1);
      const matching = all.filter(a => {
        const delta = a.degrees - 90;
        if (Math.abs(delta) > 1e-7) expect(Math.abs(delta)).toBeGreaterThan(10);
        return strictLess ? delta < -1e-7 : strictMore ? delta > 1e-7 : Math.abs(delta) <= 1e-7;
      }).map(a => a.name).sort();
      prompts.add(q.prompt);
      expect(q.unit).toBeUndefined();
      const pair = q.prompt.includes('both');
      expect(matching).toHaveLength(pair ? 2 : 1);
      const allNames = all.map(a => a.name).sort();
      if (pair) {
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw new Error('Expected two angle selections');
        expect([...spec.options].sort()).toEqual(allNames);
        expect(JSON.parse(q.answer).sort()).toEqual(matching);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...matching].reverse()))).toBe(true);
        for (const wrong of allNames.filter(name => !matching.includes(name))) {
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([matching[0], wrong]))).toBe(false);
        }
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([matching[0], matching[0]]))).toBe(false);
      } else {
        expect([...(q.choices ?? [])].sort()).toEqual(allNames);
        expect(q.answer).toBe(matching[0]);
        winners.add(matching[0]);
      }
    }
  }
  expect(prompts.size).toBe(4);
  expect(winners.size).toBeGreaterThan(4);
});

it('reproduces a question for the same seed and index', () => {
  expect(makeRagQuestion(725, 3)).toEqual(makeRagQuestion(725, 3));
  expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
});
