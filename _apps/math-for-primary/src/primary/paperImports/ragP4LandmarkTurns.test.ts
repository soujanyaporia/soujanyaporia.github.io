import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4LandmarkTurns';

function readMap(picture: Question['picture']): string[] {
  if (picture?.type !== 'batch11-upper') throw Error('Expected a labelled park map');
  const paths = picture.marks.filter(m => m.kind === 'line');
  const labels = picture.marks.filter(m => m.kind === 'text');
  expect(paths).toHaveLength(8);
  expect(labels).toHaveLength(8);
  const { x1: cx, y1: cy } = paths[0];
  const bearing = (x: number, y: number) => (Math.atan2(x - cx, cy - y) * 180 / Math.PI + 360) % 360;
  const rays = paths.map(path => {
    expect([path.x1, path.y1]).toEqual([cx, cy]);
    return bearing(path.x2, path.y2);
  }).sort((a, b) => a - b);
  rays.forEach((angle, i) => expect(angle).toBeCloseTo(i * 45));

  const ring = Array<string>(8).fill('');
  for (const label of labels) {
    const slot = Math.round(bearing(label.x, label.y) / 45) % 8;
    expect(ring[slot]).toBe('');
    ring[slot] = label.text;
  }
  expect(new Set(ring).size).toBe(8);
  expect(picture.label).toContain(ring.join(', '));
  return ring;
}

// Try every possible starting path and make only forward moves.
// The given start or finish must select exactly one complete route.
function solve({ picture, prompt, context }: Pick<Question, 'picture' | 'prompt' | 'context'>) {
  const ring = readMap(picture);
  const backwards = prompt.includes('at first?');
  const lines = context ?? [];
  const heading = lines.find(line => line.startsWith(backwards ? 'At the end,' : 'At first,'));
  const known = heading?.match(/faces the (\w+)\.$/)?.[1];
  expect(ring).toContain(known);
  const angles = lines.filter(line => /^(She turns|Then she turns)/.test(line)).map(line => {
    const match = /turns (?:(\d+)°|1\/(\d+) of a turn) (clockwise|anticlockwise)\.$/.exec(line);
    if (!match) throw Error(`Unreadable turn: ${line}`);
    const angle = match[1] ? Number(match[1]) : 360 / Number(match[2]);
    expect(angle % 45).toBe(0);
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(360);
    return match[3] === 'clockwise' ? angle : -angle;
  });
  expect(backwards ? [1, 2] : [2]).toContain(angles.length);
  const routes = ring.map((place, i) => {
    let degrees = i * 45;
    const route = [place];
    for (const angle of angles) {
      degrees = (degrees + angle + 360) % 360;
      route.push(ring[degrees / 45]);
    }
    return route;
  }).filter(route => (backwards ? route.at(-1) : route[0]) === known);
  expect(routes).toHaveLength(1);
  const walk = backwards ? routes[0].slice().reverse() : routes[0];
  return { ring, walk, backwards, angles };
}

it('finds the unique place from the map and the printed turns', () => {
  const forms = new Set<string>();
  const fractions = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { ring, walk, backwards, angles } = solve(q);
      const expected = walk.at(-1)!;
      expect(q.answer).toBe(expected);
      expect(expected).not.toBe(walk[0]);
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        q.choices.forEach(place => expect(ring).toContain(place));
      }
      const moves = q.workedSteps?.filter(step => step.text.includes(' and count ')) ?? [];
      expect(moves).toHaveLength(angles.length);
      for (let i = 0; i < moves.length; i++) {
        const angle = backwards ? -angles[angles.length - 1 - i] : angles[i];
        expect(moves[i].text).toContain(`start at the ${walk[i]} and count`);
        expect(moves[i].text).toContain(`${angle > 0 ? ' clockwise' : ' anticlockwise'} to the ${walk[i + 1]}.`);
      }
      forms.add([backwards ? 'before' : 'after', angles.length, q.choices ? 'choice' : 'entry'].join('-'));
      for (const line of q.context ?? []) {
        const fraction = line.match(/1\/\d+ of a turn/);
        if (fraction) fractions.add(fraction[0]);
      }
    }
  }
  expect(forms).toEqual(new Set(['before-1-choice', 'after-2-choice', 'after-2-entry', 'before-2-choice', 'before-2-entry']));
  expect(fractions).toEqual(new Set(['1/4 of a turn', '1/2 of a turn']));
});

it('replays the same seeded map and varies the visible task across a session', () => {
  const tasks = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const q = makeRagQuestion(72, i);
    expect(makeRagQuestion(72, i)).toEqual(q);
    tasks.add(JSON.stringify([q.picture, q.context, q.prompt]));
  }
  expect(tasks.size).toBeGreaterThan(8);
});
