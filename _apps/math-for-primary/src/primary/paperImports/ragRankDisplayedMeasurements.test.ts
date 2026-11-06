import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragRankDisplayedMeasurements';

// Measure the drawn strokes, independently of the rule used to build them.
function measurePath(d: string) {
  const tokens = d.split(/\s+/);
  let cursor = 0;
  const read = () => Number(tokens[cursor++]);
  expect(tokens[cursor++]).toBe('M');
  const startX = read(), startY = read();
  let x = startX, y = startY, length = 0;
  while (cursor < tokens.length) {
    const command = tokens[cursor++];
    if (command === 'L') {
      const nextX = read(), nextY = read();
      length += Math.hypot(nextX - x, nextY - y);
      x = nextX;
      y = nextY;
    } else {
      expect(command).toBe('Q');
      const cx = read(), cy = read(), endX = read(), endY = read();
      const fromX = x, fromY = y;
      for (let n = 1; n <= 32; n++) {
        const t = n / 32, s = 1 - t;
        const nextX = s * s * fromX + 2 * s * t * cx + t * t * endX;
        const nextY = s * s * fromY + 2 * s * t * cy + t * t * endY;
        length += Math.hypot(nextX - x, nextY - y);
        x = nextX;
        y = nextY;
      }
    }
  }
  return { startX, startY, endX: x, endY: y, length };
}

function checkVisibleQuestion(q: Question): string {
  const picture = q.picture;
  expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
  if (picture?.type === 'batch11-upper') {
    const labels = picture.marks.filter(mark => mark.kind === 'text');
    const paths = picture.marks.filter(mark => mark.kind === 'path').map(mark => measurePath(mark.d));
    expect(paths).toHaveLength(4);
    expect(labels).toHaveLength(4);
    expect(new Set(paths.map(path => path.startX)).size).toBe(1);
    expect(new Set(paths.map(path => path.endX)).size).toBe(1);
    const measured = paths.map(path => {
      expect(path.endY).toBe(path.startY);
      const label = labels.find(mark => Math.abs(mark.y - path.startY) < 10);
      if (!label) throw Error('A string is missing its label');
      return { name: label.text, length: path.length };
    }).sort((a, b) => a.length - b.length);
    for (let i = 1; i < measured.length; i++) {
      expect(measured[i].length - measured[i - 1].length).toBeGreaterThan(1);
    }
    expect(q.choices?.slice().sort()).toEqual(measured.map(item => item.name).sort());
    const shortest = q.prompt.includes('shortest');
    if (!shortest) expect(q.prompt).toContain('longest');
    expect(q.answer).toBe(measured[shortest ? 0 : measured.length - 1].name);
    return shortest ? 'shortest' : 'greatest';
  }
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw Error('Missing measurement display');
  const cards = picture.cards;
  const labels = cards.map(card => card.label);
  expect(new Set(labels).size).toBe(labels.length);
  if (cards.some(card => card.count !== undefined)) {
    expect(cards).toHaveLength(3);
    expect(q.context?.join(' ')).toContain('1 litre');
    expect(q.prompt).toContain('more water than one tub but less water than the other');
    const counts = cards.map(card => {
      expect(card.icon).toBe('water');
      expect(card.removed ?? 0).toBe(0);
      const count = card.count;
      if (count === undefined || !Number.isInteger(count) || count < 1 || count > 10) throw Error('Invalid jug count');
      return count;
    });
    expect(new Set(counts).size).toBe(3);
    const middle = counts.findIndex(value => counts.some(n => n < value) && counts.some(n => n > value));
    expect(q.choices?.slice().sort()).toEqual(labels.slice().sort());
    expect(q.answer).toBe(labels[middle]);
    return 'middle';
  }
  const masses = cards.map(card => {
    const match = /^(\d+) (kg|g)$/.exec(card.value);
    if (!match) throw Error('Missing mass or unit');
    return { label: card.label, mass: Number(match[1]), unit: match[2] };
  });
  const unit = masses[0].unit;
  expect(masses.every(item => item.unit === unit)).toBe(true);
  expect(masses).toHaveLength(unit === 'g' ? 3 : 4);
  expect(new Set(masses.map(item => item.mass)).size).toBe(masses.length);
  expect(masses.every(item => item.mass >= (unit === 'g' ? 100 : 20) && item.mass <= (unit === 'g' ? 999 : 40))).toBe(true);
  if (q.order) {
    expect(q.prompt).toContain('weighs the most');
    const names = masses.slice().sort((a, b) => b.mass - a.mass).map(item => item.label);
    expect(q.order.slice().sort()).toEqual(labels.slice().sort());
    expect(q.order).not.toEqual(names);
    expect(q.answer).toBe(names.join(','));
    return unit + '-order';
  }
  const pair = /kilograms lighter is (\w+) than (\w+)\?/.exec(q.prompt);
  if (!pair) throw Error('Missing names to compare');
  const light = masses.find(item => item.label === pair[1]);
  const heavy = masses.find(item => item.label === pair[2]);
  if (!light || !heavy) throw Error('Named child missing from the table');
  expect(unit).toBe('kg');
  expect(q.unit).toBe(unit);
  expect(heavy.mass).toBeGreaterThan(light.mass);
  expect(q.answer).toBe(String(heavy.mass - light.mass));
  return 'difference';
}

it('solves each requested rank from the visible mass cards, jug counts or drawn paths', () => {
  const forms = new Set<string>();
  for (let seed = -3; seed < 21; seed++) {
    for (let i = 0; i < 12; i++) {
      const q = makeRagQuestion(seed, i);
      forms.add(checkVisibleQuestion(q));
      if (q.unit === 'kg') {
        const next = makeRagQuestion(seed, i + 1);
        expect(next.picture).toEqual(q.picture);
        expect(next.order).toHaveLength(4);
      }
    }
  }
  expect([...forms].sort()).toEqual(['difference', 'g-order', 'greatest', 'kg-order', 'middle', 'shortest']);
});

it('replays each question and varies the givens for every form', () => {
  const variants = new Map<string, Set<string>>();
  for (let seed = 0; seed < 8; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const form = checkVisibleQuestion(q);
      const seen = variants.get(form) ?? new Set<string>();
      seen.add(JSON.stringify(q.picture));
      variants.set(form, seen);
    }
  }
  expect(variants.size).toBe(6);
  for (const seen of variants.values()) expect(seen.size).toBeGreaterThan(1);
});
