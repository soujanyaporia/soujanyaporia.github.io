import {expect, it} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperPicture} from './batch11UpperPicture';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragMeasurementAdditiveComparisons';

function quantity(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing given for ${pattern}`);
  return Number(match[1]);
}

// Read only the drawn marks and their captions. The alternative text is not used.
function gramsOnDial(picture: Batch11UpperPicture, caption: string): number {
  const labels = picture.marks.filter(m => m.kind === 'text');
  const name = labels.find(m => m.text === caption);
  if (!name) throw new Error(`Missing caption: ${caption}`);
  const rings = picture.marks.filter(m => m.kind === 'circle').filter(c => c.r > 10);
  expect(rings).toHaveLength(2);
  const ring = rings.sort((a, b) => Math.abs(a.cx - name.x) - Math.abs(b.cx - name.x))[0];
  const lines = picture.marks.filter(m => m.kind === 'line');
  const pointer = lines.find(l => l.x1 === ring.cx && l.y1 === ring.cy);
  if (!pointer) throw new Error('A dial needs a pointer');
  const ticks = lines.filter(l => Math.abs(Math.hypot(l.x2 - ring.cx, l.y2 - ring.cy) - ring.r) < 0.01);
  const turn = (x: number, y: number) =>
    (Math.atan2(x - ring.cx, ring.cy - y) / (2 * Math.PI) + 1) % 1;
  const tickTurns = ticks.map(t => turn(t.x2, t.y2)).sort((a, b) => a - b);
  expect(tickTurns).toHaveLength(40);
  tickTurns.forEach((t, i) => expect(t).toBeCloseTo(i / ticks.length, 8));

  // The whole-kilogram labels run clockwise from zero at the top.
  const numbers = labels.filter(l => /^\d+$/.test(l.text) && Math.abs(l.x - ring.cx) < ring.r);
  expect(numbers).toHaveLength(4);
  for (let kg = 0; kg < 4; kg++) {
    const label = numbers.find(l => l.text === String(kg));
    if (!label) throw new Error('Missing kilogram label');
    expect(Math.round(turn(label.x, label.y) * 4) % 4).toBe(kg);
  }
  const spacesPerKg = ticks.length / numbers.length;
  const position = turn(pointer.x2, pointer.y2) * ticks.length;
  expect(position).toBeCloseTo(Math.round(position), 8);
  return Math.round(position) * 1000 / spacesPerKg;
}

function solveVisible(q: Question): 'bags' | 'heights' | 'trail' {
  const text = q.context?.join(' ') ?? '';
  if (q.picture?.type === 'batch11-upper') {
    expect(text).toContain('that same blue bag and a red bag');
    expect(q.prompt).toContain('blue bag than the red bag');
    const blue = gramsOnDial(q.picture, 'Blue bag (kg)');
    const both = gramsOnDial(q.picture, 'Both bags (kg)');
    const red = both - blue;
    expect(red).toBeGreaterThan(0);
    expect(blue).toBeGreaterThan(red);
    expect(q.unit).toBe('g');
    expect(q.answer).toBe(String(blue - red));
    return 'bags';
  }

  if (q.structuredResponse) {
    const km = quantity(text, /bridge to the pond is (\d+) km/);
    const less = quantity(text, /gate to the bridge is (\d+) m shorter than the path from the bridge to the pond/);
    const back = quantity(text, /pond back to the gate is (\d+) m/);
    expect(text).toContain('from a gate to a bridge, then to a pond and back to the gate');
    const first = 1000 * km - less;
    const lap = first + km * 1000 + back;
    expect(first).toBeGreaterThan(0);
    expect(lap).toBeLessThan(10000);
    const whole = Math.trunc(lap / 1000), remaining = lap - 1000 * whole;
    expect(remaining).toBeGreaterThan(0);
    expect(q.structuredResponse).toEqual({kind: 'number-fields', fields: [
      {label: '(a) Gate to bridge (m)'}, {label: '(b) Whole kilometres'}, {label: '(b) Remaining metres'},
    ]});
    const answerFor = (m: number, k: number, rest: number) => JSON.stringify([m, k, rest].map(String));
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, answerFor(first, whole, remaining))).toBe(true);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, answerFor(first, whole - 1, remaining + 1000))).toBe(false);
    return 'trail';
  }

  const bamboo = quantity(text, /bamboo plant stands (\d+) cm/);
  const drop = quantity(text, /fern is (\d+) cm shorter than the bamboo/);
  const rise = quantity(text, /sunflower is (\d+) cm taller than the fern/);
  expect(bamboo - drop).toBeGreaterThan(0);
  expect(q.prompt).toContain('sunflower');
  expect(q.unit).toBe('cm');
  expect(q.answer).toBe(String(bamboo - drop + rise));
  return 'heights';
}

it('solves each form from the labels, pointers or story seen by the pupil', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      forms.add(solveVisible(q));
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  }
  expect([...forms].sort()).toEqual(['bags', 'heights', 'trail']);
});

it('replays an item exactly and varies the visible givens within every form', () => {
  const seen = {bags: new Set<string>(), heights: new Set<string>(), trail: new Set<string>()};
  for (const seed of [-9, 0, 2, 5, 19, 74, 221, 805]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const form = q.picture ? 'bags' : q.structuredResponse ? 'trail' : 'heights';
      seen[form].add(JSON.stringify([q.context, q.picture]));
    }
  }
  for (const inputs of Object.values(seen)) expect(inputs.size).toBeGreaterThan(3);
});
