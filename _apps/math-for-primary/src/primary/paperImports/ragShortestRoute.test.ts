import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragShortestRoute';

type Road = { a: string; b: string; m: number | null };

function readMap(q: Question): Road[] {
  const pic = q.picture;
  if (pic?.type !== 'batch11-upper') throw Error('Missing path map');
  const names = new Map<string, string>();
  for (const [i, mark] of pic.marks.entries()) {
    if (mark.kind !== 'circle') continue;
    const name = pic.marks[i + 1];
    if (name?.kind !== 'text') throw Error('Missing place name');
    names.set([mark.cx, mark.cy].join(','), name.text);
  }
  const roads: Road[] = [];
  const descriptions: string[] = [];
  for (const [i, mark] of pic.marks.entries()) {
    if (mark.kind !== 'line') continue;
    const a = names.get([mark.x1, mark.y1].join(','));
    const b = names.get([mark.x2, mark.y2].join(','));
    const label = pic.marks[i + 1];
    if (!a || !b || label?.kind !== 'text') throw Error('Unlabelled path');
    const digits = /^(?:(\d+) km )?(\d+) m$/.exec(label.text);
    if (!digits && label.text !== '? m') throw Error('Unreadable distance');
    if (digits?.[1]) expect(Number(digits[2])).toBeLessThan(1000);
    const m = digits ? Number(digits[1] || 0) * 1000 + Number(digits[2]) : null;
    if (m !== null) expect(m).toBeGreaterThan(0);
    roads.push({ a, b, m });
    descriptions.push(`${a} to ${b}: ${label.text}.`);
  }
  expect(pic.label).toBe(descriptions.join(' '));
  return roads;
}

// Positive lengths make a repeated place unnecessary within a single leg.
// A place already visited on a previous leg can be visited again.
function lengths(roads: Road[], from: string, to: string, forbidden: string[]): number[] {
  if (from === to) return [0];
  return roads.flatMap(({ a, b, m }) => {
    const next = a === from ? b : b === from ? a : undefined;
    if (!next || m === null || forbidden.includes(next)) return [];
    return lengths(roads, next, to, [...forbidden, from]).map(rest => m + rest);
  });
}

it('solves each journey from its drawn paths, units and required stops', () => {
  const modes = new Set<string>(), middleLegs = new Set<string>(), winners = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const roads = readMap(q), stops = q.display!.split(' → ');
      const totals = stops.slice(1).map((stop, i) => {
        const possible = lengths(roads, stops[i], stop, stops.slice(i + 2));
        expect(possible.length).toBeGreaterThan(0);
        return Math.min(...possible);
      });
      const distance = totals.reduce((sum, part) => sum + part, 0);
      expect(distance).toBeLessThan(10000);
      const km = Math.floor(distance / 1000), m = distance - 1000 * km;
      let expected: string;
      if (q.structuredResponse) {
        modes.add('linked');
        expect(stops).toHaveLength(2);
        expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [
          { label: '(a) Kilometres' }, { label: '(a) Metres' }, { label: '(b) Metres to Hut' },
        ] });
        const clue = /^The path from (\w+) to (\w+) is (\d+) times as long as the path from (\w+) to (\w+)\.$/;
        const match = clue.exec(q.context!.at(-1)!);
        if (!match) throw Error('Missing comparison for the spur');
        const [, from, to, multiple, spurFrom, spurTo] = match;
        const joins = (r: Road, x: string, y: string) => (r.a === x && r.b === y) || (r.a === y && r.b === x);
        const known = roads.find(r => joins(r, from, to))?.m;
        if (known == null) throw Error('Missing comparison length');
        expect(roads.filter(r => r.m === null)).toHaveLength(1);
        expect(roads.find(r => joins(r, spurFrom, spurTo))?.m).toBeNull();
        expect(q.prompt).toContain(`from ${spurFrom} to ${spurTo}`);
        expect(known % Number(multiple)).toBe(0);
        expected = JSON.stringify([km, m, known / Number(multiple)].map(String));
      } else if (stops.length === 4) {
        modes.add('ordered');
        const direct = roads.find(r => [r.a, r.b].includes(stops[1]) && [r.a, r.b].includes(stops[2]));
        if (direct?.m == null) throw Error('Missing direct path between the middle stops');
        middleLegs.add(totals[1] < direct.m ? 'via start' : 'direct');
        expected = `${km} km ${m} m`;
      } else {
        modes.add('metres');
        expect(stops).toHaveLength(2);
        const possible = lengths(roads, stops[0], stops[1], []);
        expect(new Set(possible).size).toBe(2);
        winners.add(possible[0] === distance ? 'first' : 'second');
        expected = `${distance} m`;
      }
      expect(q.answer).toBe(expected);
      if (!q.structuredResponse) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
      }
    }
  }
  expect(modes.size).toBe(3);
  expect(winners.size).toBe(2);
  expect(middleLegs.size).toBe(2);
});

it('repeats the map, choices and working for the same seed and index', () => {
  for (const seed of [-7, 0, 123456]) {
    for (const index of [0, 1, 2]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
