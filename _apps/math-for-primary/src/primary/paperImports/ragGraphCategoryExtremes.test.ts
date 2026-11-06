import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragGraphCategoryExtremes';

type Row = { label: string; value: number };

function rows(labels: string[], values: number[], scale: number): Row[] {
  expect(new Set(labels).size).toBe(labels.length);
  expect(values).toHaveLength(labels.length);
  expect(scale).toBeGreaterThan(0);
  return labels.map((label, i) => {
    expect(Number.isInteger(values[i] / scale) && values[i] > 0).toBe(true);
    return { label, value: values[i] };
  });
}

function extreme(table: Row[], most: boolean) {
  const winners = table.filter(a => table.every(b =>
    b === a || (most ? a.value > b.value : a.value < b.value)));
  expect(winners).toHaveLength(1);
  return winners[0];
}

function find(table: Row[], label: string) {
  const row = table.find(item => item.label === label);
  if (!row) throw new Error(`Missing graph label: ${label}`);
  return row;
}

function match(text: string, pattern: RegExp) {
  const result = text.match(pattern);
  if (!result) throw new Error(`Missing visible given: ${pattern}`);
  return result;
}

// This solver uses only the prompt, context, and rendered graph model.
function solve({ picture: p, context = [], prompt }: Pick<Question, 'picture' | 'context' | 'prompt'>) {
  const story = context.join(' ');
  if (p?.type === 'raffles-p3' && p.layout === 'grouped-bars') {
    expect(prompt).toContain('fewest items altogether');
    expect(p.series.map(s => s.label)).toEqual(['Notebooks', 'Cards']);
    const tables = p.series.map(s => rows(p.days, s.values, p.scale));
    const daily = p.days.map(label => ({ label, value: tables.reduce((n, t) => n + find(t, label).value, 0) }));
    const best = extreme(daily, false);
    for (const t of tables) expect(find(t, best.label).value).toBeGreaterThan(Math.min(...t.map(x => x.value)));
    return { task: 'combined', expected: best.label, wrong: daily.find(d => d.label !== best.label)!.label };
  }
  if (p?.type !== 'bars') throw new Error('Expected a labelled graph');
  const table = rows(p.labels, p.values, p.scale);
  if (p.pictures) {
    const [, total, key] = match(story, /ran (\d+) laps in all\. Each dot stands for (\d+) laps/);
    expect(Number(key)).toBe(p.scale);
    expect(table).toHaveLength(3);
    expect(table.reduce((n, row) => n + row.value, 0)).toBe(Number(total));
    const [, n1, n2, lead] = match(story, /rows A and B are (\w+) and (\w+)\. (\w+) ran the most laps/);
    const [, known, comparedTo] = match(prompt, /fewer laps did (\w+) run than (\w+)/);
    expect(comparedTo).toBe(lead);
    expect([n1, n2]).toContain(lead);
    expect(new Set([known, n1, n2]).size).toBe(3);
    const dots = table.map(row => ({ label: row.label, value: row.value / Number(key) }));
    const best = extreme(dots, true);
    expect(['A', 'B']).toContain(best.label);
    const remaining = n1 === lead ? n2 : n1;
    const assigned = ['A', 'B'].map(label => {
      find(dots, label);
      return label === best.label ? lead : remaining;
    });
    const gap = (best.value - find(dots, known).value) * Number(key);
    return { task: 'missing-' + best.label, expected: `${assigned.join(' ')} ${gap}`,
      wrong: `${assigned.reverse().join(' ')} ${gap}` };
  }
  if (prompt.includes('finish line last')) {
    expect(story).toContain('started a race together');
    expect(story).toContain('seconds');
    return { task: 'duration', expected: extreme(table, true).label, wrong: extreme(table, false).label };
  }
  if (prompt.includes('spend the most')) {
    const budget = 100 * Number(match(story, /\$(\d+) in pocket money each day/)[1]);
    expect(story).toContain('savings in cents');
    const spending = table.map(row => ({ label: row.label, value: budget - row.value }));
    expect(spending.every(row => row.value > 0)).toBe(true);
    const dayToRead = match(prompt, /save on (\w+)\?/)[1];
    const cents = find(table, dayToRead).value;
    return { task: 'spending', expected: `${cents} ${extreme(spending, true).label}`,
      wrong: `${cents} ${extreme(table, true).label}` };
  }
  expect(prompt).toContain('fewest shells');
  const [, fewer, more] = match(prompt, /fewer shells did (\w+) find than (\w+)/);
  const diff = find(table, more).value - find(table, fewer).value;
  expect(diff).toBeGreaterThan(0);
  const collector = extreme(table, false).label;
  return { task: 'collection', expected: `${collector} ${diff}`, wrong: `${collector} ${diff + 1}` };
}

it('solves each graph from its visible units, labels and clues', () => {
  const seen = new Set<string>();
  for (let seed = -4; seed < 64; seed++) {
    for (let i = 0; i < 8; i++) {
      const q = makeRagQuestion(seed, i);
      const { task, expected, wrong } = solve(q);
      seen.add(task);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected.toLowerCase())).toBe(true);
      expect(correctAnswer(q, wrong)).toBe(false);
      if (expected.includes(' ')) expect(correctAnswer(q, expected.split(' ')[0])).toBe(false);
    }
  }
  expect([...seen].sort()).toEqual(['collection', 'combined', 'duration', 'missing-A', 'missing-B', 'spending']);
});

it('reproduces a question while the index can vary the visible task for one seed', () => {
  const get = (index: number) => makeRagQuestion(31, index);
  expect(get(3)).toEqual(get(3));
  const charts = Array.from({ length: 16 }, (_, i) => JSON.stringify(get(i).picture));
  expect(new Set(charts).size).toBeGreaterThan(1);
});
