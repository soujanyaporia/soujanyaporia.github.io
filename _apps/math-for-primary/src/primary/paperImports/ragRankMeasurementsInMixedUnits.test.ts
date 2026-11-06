import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { makeRagQuestion } from './ragRankMeasurementsInMixedUnits';

function solveDials(picture: Batch11UpperPicture) {
  const circles = picture.marks.filter(m => m.kind === 'circle');
  const lines = picture.marks.filter(m => m.kind === 'line');
  const words = picture.marks.filter(m => m.kind === 'text');
  const rims = circles.filter(c => !circles.some(other => other.cx === c.cx && other.r > c.r));
  expect(rims).toHaveLength(3);
  return rims.map(({ cx, cy, r }) => {
    const nearby = words.filter(m => Math.abs(m.x - cx) < r);
    const name = nearby.find(m => /^[A-Za-z]+$/.test(m.text))?.text;
    const zero = nearby.find(m => m.text === '0');
    const bottom = nearby.find(m => m.y > cy);
    const scale = bottom && /^(\d+) (kg|g)$/.exec(bottom.text);
    const needle = lines.find(m => m.x1 === cx && m.y1 === cy);
    if (!name || !zero || zero.y >= cy || !scale || !needle) throw new Error('Incomplete dial');

    // Read the clockwise angle from the zero mark. Half a turn reaches the bottom label.
    const theta = Math.atan2(needle.x2 - cx, cy - needle.y2);
    const turn = theta < 0 ? theta + 2 * Math.PI : theta;
    const amount = Math.round(Number(scale[1]) * turn / Math.PI);
    expect(Number(scale[1]) * turn / Math.PI).toBeCloseTo(amount, 6);

    // The needle must point to a printed graduation.
    const ticks = lines.filter(m => Math.abs(Math.hypot(m.x2 - cx, m.y2 - cy) - r) < 0.001);
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    const atTick = ticks.some(m => {
      const angle = Math.atan2(m.x2 - cx, cy - m.y2);
      return Math.cos(angle - theta) > 0.999999;
    });
    expect(atTick).toBe(true);
    return { name, unit: scale[2], grams: amount * (scale[2] === 'kg' ? 1000 : 1) };
  });
}

test('reads four printed lengths and applies the direction requested', () => {
  const forms = new Set<string>();
  const winningUnits = { shortest: new Set<string>(), longest: new Set<string>() };
  for (let seed = -4; seed < 44; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.picture) continue;
      const labels = q.order ?? q.choices;
      if (!labels) throw new Error('Missing length options');
      expect(labels).toHaveLength(4);
      const values = labels.map(label => {
        const m = /^(\d+) (cm|m)$/.exec(label);
        if (!m) throw new Error('Length is missing its value or unit');
        return { label, unit: m[2], cm: Number(m[1]) * (m[2] === 'm' ? 100 : 1) };
      });
      expect(values.filter(v => v.unit === 'm')).toHaveLength(2);
      expect(new Set(values.map(v => v.cm)).size).toBe(4);
      expect(values.every(v => v.cm > 0 && v.cm <= 1000)).toBe(true);
      values.sort((a, b) => a.cm - b.cm);
      const shortest = q.prompt.includes('shortest');
      if (!shortest) expect(q.prompt).toMatch(/longest/);
      const sorted = shortest ? values : values.reverse();
      const form = shortest ? 'shortest' : 'longest';
      forms.add(q.order ? 'order' : form);
      const expected = q.order ? sorted.map(v => v.label).join(',') : sorted[0].label;
      if (q.order) {
        expect(shortest).toBe(false);
        expect(q.choices).toBeUndefined();
        expect(q.order.join(',')).not.toBe(expected);
      } else {
        winningUnits[form].add(sorted[0].unit);
      }
      const wrong = q.order ? sorted.map(v => v.label).reverse().join(',') : sorted[3].label;
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, wrong)).toBe(false);
    }
  }
  expect(forms.size).toBe(3);
  for (const units of Object.values(winningUnits)) expect(units).toEqual(new Set(['cm', 'm']));
});

test('ranks items from the drawn pointers, tick positions and unit labels', () => {
  const winners = new Set<string>();
  const arrangements = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (!q.picture) continue;
      if (q.picture.type !== 'batch11-upper' || !q.order) throw new Error('Missing scale diagram or order control');
      expect(q.prompt).toMatch(/lightest/);
      const dials = solveDials(q.picture);
      expect(dials.filter(d => d.unit === 'kg')).toHaveLength(1);
      expect(new Set(dials.map(d => d.grams)).size).toBe(3);
      expect(dials.every(d => d.grams > 0 && d.grams <= 1000)).toBe(true);
      expect([...q.order].sort()).toEqual(dials.map(d => d.name).sort());
      const ranked = dials.sort((a, b) => a.grams - b.grams).map(d => d.name);
      const expected = ranked.join(',');
      expect(q.order.join(',')).not.toBe(expected);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, ranked.reverse().join(','))).toBe(false);
      winners.add(expected.split(',')[0]);
      arrangements.add(expected);
    }
  }
  expect(winners.size).toBe(3);
  expect(arrangements.size).toBe(6);
});

test('repeats the same question for a seed and covers all four tasks in four indices', () => {
  for (const seed of [-13, 0, 7, 104]) {
    const prompts = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      prompts.add(q.prompt);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
    }
    expect(prompts.size).toBe(4);
  }
});
