import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragBarGraphMultipleMatch';

it('finds exactly one design using the printed relationship and the plotted bars', () => {
  const forms = new Set<string>();
  const factors = new Set<number>();
  const scales = new Set<number>();
  const answers = new Set<string>();
  for (let seed = -4; seed < 76; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const chart = q.picture;
      if (!chart || !(chart.type === 'bars' || (chart.type === 'batch2-early' && chart.layout === 'sales-bars'))) {
        throw new Error('A labelled bar graph is required.');
      }
      const labels = chart.type === 'bars' ? chart.labels : chart.days;
      const scale = chart.type === 'bars' ? chart.scale : chart.minorStep;
      const { values } = chart;
      expect(new Set(labels).size).toBe(5);
      expect(values.length).toBe(labels.length);
      expect(new Set(values).size).toBe(values.length);
      expect([1, 2]).toContain(scale);
      scales.add(scale);
      for (const value of values) {
        expect(Number.isSafeInteger(value) && value > 0 && value <= 60).toBe(true);
        expect(value % scale).toBe(0);
      }
      if (chart.type === 'batch2-early') {
        expect(chart.maximum).toBeGreaterThanOrEqual(Math.max(...values));
        expect(chart.labelStep % scale).toBe(0);
        expect(chart.maximum % chart.labelStep).toBe(0);
      }

      const larger = /^Which design appears on (\d+) times as many bookmarks as the (\w+) design\?$/.exec(q.prompt);
      const smaller = /^For every bookmark with the mystery design, there are (\d+) bookmarks with the (\w+) design\. Which design is the mystery design\?$/.exec(q.prompt);
      const relation = larger ?? smaller;
      if (!relation) throw new Error('The prompt must give the factor and name a reference design.');
      const factor = Number(relation[1]);
      const reference = relation[2];
      expect([2, 3]).toContain(factor);
      factors.add(factor);
      expect(labels).toContain(reference);
      const known = values[labels.indexOf(reference)];
      const matches = labels.filter((label, i) => label !== reference && (
        larger ? values[i] === factor * known : factor * values[i] === known
      ));
      expect(matches).toHaveLength(1);
      const expected = matches[0];
      expect(q.answer).toBe(expected);
      answers.add(expected);
      if (q.choices) {
        expect([...q.choices].sort()).toEqual(labels.filter(label => label !== reference).sort());
      }
      forms.add(`${larger ? 'larger' : 'smaller'}-${q.choices ? 'choice' : 'entry'}`);
      const target = values[labels.indexOf(expected)];
      expect(q.workedSteps?.map(s => s.equation)).toContain(`${known} ${larger ? '×' : '÷'} ${factor} = ${target}`);
    }
  }
  expect(forms).toEqual(new Set(['larger-entry', 'smaller-entry', 'smaller-choice']));
  expect(factors.size).toBe(2);
  expect(scales.size).toBe(2);
  expect(answers.size).toBe(5);
});

it('reproduces an item and varies visible questions across indices', () => {
  expect(makeRagQuestion(83)).toEqual(makeRagQuestion(83, 0));
  const visible = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const q = makeRagQuestion(83, i);
    expect(makeRagQuestion(83, i)).toEqual(q);
    visible.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(visible.size).toBeGreaterThan(1);
});
