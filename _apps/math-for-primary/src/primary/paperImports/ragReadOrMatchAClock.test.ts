import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragReadOrMatchAClock';

const hours = 'twelve one two three four five six seven eight nine ten eleven'.split(' ');

// Read the same objects the child sees: two unequal hands, numbers on the dial,
// and the text below it. Do not use the SVG accessibility label as an answer key.
function dials(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw Error('Expected clock faces');
  const { marks } = picture;
  const rings = marks.filter(m => m.kind === 'circle' && m.r > 10);
  expect(rings).toHaveLength(3);
  return rings.map(ring => {
    if (ring.kind !== 'circle') throw Error('Expected a dial rim');
    const { cx, cy, r } = ring;
    const below = marks.flatMap(m => m.kind === 'text' && Math.abs(m.x - cx) < r && m.y > cy + r ? [m.text] : []);
    const tag = below.find(s => /^[A-Za-z]+$/.test(s));
    if (!tag) throw Error('Missing clock name');
    const rays = marks.flatMap(m => m.kind === 'line' && m.x1 === cx && m.y1 === cy
      ? [{ dx: m.x2 - cx, dy: m.y2 - cy }] : []);
    rays.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
    expect(rays).toHaveLength(2);
    expect(Math.hypot(rays[0].dx, rays[0].dy)).toBeLessThan(Math.hypot(rays[1].dx, rays[1].dy));
    const turn = (v: { dx: number; dy: number }) => (Math.atan2(v.dx, -v.dy) / (2 * Math.PI) + 1) % 1;
    const minute = Math.round(turn(rays[1]) * 60) % 60;
    expect([0, 30]).toContain(minute);
    const clockMinutes = Math.round(turn(rays[0]) * 720) % 720;
    expect(clockMinutes % 60).toBe(minute);
    const timeText = `${Math.floor(clockMinutes / 60) || 12}:${String(minute).padStart(2, '0')}`;
    return { tag, clockMinutes, timeText, claim: below.find(s => /^\d{1,2}:\d{2}$/.test(s)) };
  });
}

function solve(q: Question) {
  if (q.prompt.includes('long hand point')) {
    const h = /^At (\w+) o'clock,/.exec(q.prompt)?.[1] ?? '';
    expect(hours).toContain(h);
    const minutesPast = 0;
    return String(minutesPast / 5 || 12);
  }
  const faces = dials(q);
  expect(new Set(faces.map(f => f.tag)).size).toBe(faces.length);
  expect(new Set(faces.map(f => f.clockMinutes)).size).toBe(faces.length);
  let matches;
  if (q.prompt.includes('written below')) {
    for (const f of faces) expect(f.claim).toMatch(/^(?:[1-9]|1[012]):(?:00|30)$/);
    matches = faces.filter(f => f.claim === f.timeText);
  } else {
    const word = /half past (\w+)/.exec(q.prompt)?.[1] ?? '';
    const h = hours.indexOf(word);
    expect(h).toBeGreaterThanOrEqual(0);
    matches = faces.filter(f => f.clockMinutes === h * 60 + 30);
    expect(faces.filter(f => f.clockMinutes % 60 === 30)).toHaveLength(2);
  }
  expect(matches).toHaveLength(1);
  return matches[0].tag;
}

it('solves each response from its prompt, drawn hands and visible labels', () => {
  const forms = new Set<string>();
  const selected = new Set<string>();
  let halfPastTwelve = false;
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solve(q);
      expect(q.answer).toBe(expected);
      const form = q.prompt.startsWith('Who') ? 'name' : q.prompt.includes('written below') ? 'check' : q.picture ? 'face' : 'hand';
      forms.add(form);
      if (form === 'name') expect(q.choices).toBeUndefined();
      else expect(q.choices?.filter(c => c === expected)).toHaveLength(1);
      if (form === 'face') selected.add(expected);
      halfPastTwelve ||= q.prompt.includes('half past twelve');
    }
  }
  expect([...forms].sort()).toEqual(['check', 'face', 'hand', 'name']);
  expect([...selected].sort()).toEqual(['A', 'B', 'C']);
  expect(halfPastTwelve).toBe(true);
});

it('keeps clock positions, labels and response stable for the same seed and index', () => {
  for (let i = 0; i < 4; i++) expect(makeRagQuestion(73, i)).toEqual(makeRagQuestion(73, i));
});
