import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragPercentageComparisonFromCounts';

// This solver has access only to what the pupil sees, never the answer,
// worked solution, proof, seed, or generator parameters.
type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;

function solveVisible(q: Visible): number {
  const countPrompt = /^What is (\w+)'s badge count as a percentage of (\w+)'s badge count\?$/.exec(q.prompt);
  if (countPrompt) {
    const counts = new Map<string, number>();
    for (const line of q.context ?? []) {
      const match = /^(\w+) has (\d+) badges\.$/.exec(line);
      if (match) counts.set(match[1], Number(match[2]));
    }
    const compared = counts.get(countPrompt[1]);
    const reference = counts.get(countPrompt[2]);
    if (compared === undefined || reference === undefined || reference <= 0) throw new Error('Missing badge count');
    return 100 * compared / reference;
  }

  const timePrompt = /^What is (\w+)'s activity time as a percentage of (\w+)'s activity time\?$/.exec(q.prompt);
  if (timePrompt) {
    const seconds = new Map<string, number>();
    for (const line of q.context ?? []) {
      const match = /^(\w+)'s activity lasts (\d+) (h|min)\.$/.exec(line);
      if (match) seconds.set(match[1], Number(match[2]) * (match[3] === 'h' ? 3600 : 60));
    }
    const compared = seconds.get(timePrompt[1]);
    const reference = seconds.get(timePrompt[2]);
    if (compared === undefined || reference === undefined || reference <= 0) throw new Error('Missing duration');
    return 100 * compared / reference;
  }

  const tablePrompt = /^In Class (\w+), what percentage of the pupils are (boys|girls)\?$/.exec(q.prompt);
  const picture = q.picture;
  if (tablePrompt && picture?.type === 'nanyang-p4' && picture.layout === 'table') {
    const row = picture.rows.find(item => item.label === tablePrompt[1]);
    const column = picture.columns.findIndex(label => label.toLowerCase() === tablePrompt[2]);
    if (!row || column < 0 || row.values.length !== 2) throw new Error('Missing class or category');
    const compared = row.values[column];
    if (compared === null || compared === undefined) throw new Error('Missing subgroup count');
    const total = row.values.reduce<number>((sum, value) => {
      if (value === null || !Number.isInteger(value) || value <= 0) throw new Error('Invalid pupil count');
      return sum + value;
    }, 0);
    return 100 * compared / total;
  }
  throw new Error('Unrecognised visible question');
}

function visiblePart(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture};
}

function percentageValue(text: string): number {
  if (!/^\d+(?:\.\d+)?%?$/.test(text)) throw new Error('Unexpected percentage format');
  return Number(text.replace(/%$/, ''));
}

describe('percentage comparison from visible givens', () => {
  it('solves every generated variant across varied seeds and indices', () => {
    const families = new Set<string>();
    const timeRelations = new Set<string>();
    const signatures = new Set<string>();
    const tableRows = new Set<string>();
    const tableCategories = new Set<string>();
    const columnOrders = new Set<string>();
    const seeds = [-2147483648, -17, -1, ...Array.from({length: 128}, (_, i) => i), 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible(visiblePart(q));
        expect(percentageValue(q.answer)).toBeCloseTo(expected, 10);
        expect(Number.isInteger(expected)).toBe(true);
        expect(expected).toBeGreaterThan(0);
        expect(q.hint.length).toBeGreaterThan(10);
        expect(q.explanation.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps!.some(step => step.equation?.includes('× 100%'))).toBe(true);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        signatures.add(JSON.stringify(visiblePart(q)));

        if (q.choices) {
          families.add('counts');
          expect(expected).toBeGreaterThan(100);
          expect(expected).toBeLessThanOrEqual(500);
          expect(q.unit).toBeUndefined();
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices.every(choice => choice.endsWith('%'))).toBe(true);
          expect(q.choices).toContain(q.answer);
          expect(q.choices.filter(choice => percentageValue(choice) === expected)).toHaveLength(1);
          const counts = q.context!.map(line => Number(/has (\d+) badges/.exec(line)![1]));
          expect(counts.every(value => Number.isInteger(value) && value > 0)).toBe(true);
          expect(counts).not.toEqual([35, 28]);
        } else {
          expect(q.unit).toBe('%');
          expect(q.answer).not.toContain('%');
          if (q.picture?.type === 'nanyang-p4' && q.picture.layout === 'table') {
            families.add('table');
            expect(expected).toBeLessThan(100);
            expect(q.picture.rows).toHaveLength(2);
            expect(new Set(q.picture.rows.map(row => row.label)).size).toBe(2);
            const match = /^In Class (\w+),.*are (boys|girls)\?$/.exec(q.prompt)!;
            tableRows.add(match[1]);
            tableCategories.add(match[2]);
            columnOrders.add(q.picture.columns.join(','));
            for (const row of q.picture.rows) {
              expect(row.values.every(value => value !== null && Number.isInteger(value) && value > 0)).toBe(true);
              expect(row.values.reduce<number>((sum, value) => sum + value!, 0)).toBeLessThanOrEqual(36);
            }
          } else {
            families.add('time');
            expect(q.picture).toBeUndefined();
            expect(expected).toBeLessThanOrEqual(500);
            timeRelations.add(expected < 100 ? 'less' : expected === 100 ? 'equal' : 'greater');
            expect(q.context![0]).not.toContain('lasts 6 h.');
            expect(q.context![1]).not.toContain('lasts 90 min.');
          }
        }
      }
    }
    expect([...families].sort()).toEqual(['counts', 'table', 'time']);
    expect([...timeRelations].sort()).toEqual(['equal', 'greater', 'less']);
    expect([...tableRows].sort()).toEqual(['6C', '6D']);
    expect([...tableCategories].sort()).toEqual(['boys', 'girls']);
    expect(columnOrders.size).toBe(2);
    expect(signatures.size).toBeGreaterThan(50);
  });

  it('uses the named reference, converts units, and follows table headers independently', () => {
    expect(solveVisible({
      prompt: "What is Asha's badge count as a percentage of Idris's badge count?",
      context: ['Idris has 48 badges.', 'Asha has 72 badges.'],
    })).toBe(150);
    expect(solveVisible({
      prompt: "What is Lina's activity time as a percentage of Omar's activity time?",
      context: ["Omar's activity lasts 240 min.", "Lina's activity lasts 3 h."],
    })).toBe(75);
    const table: Visible = {
      prompt: 'In Class 6D, what percentage of the pupils are girls?',
      picture: {
        type: 'nanyang-p4', layout: 'table', caption: 'Class register', rowHeader: 'Class',
        columns: ['Girls', 'Boys'],
        rows: [{label: '6C', values: [9, 27]}, {label: '6D', values: [18, 12]}],
      },
    };
    expect(solveVisible(table)).toBe(60);
    const picture = table.picture;
    if (picture?.type !== 'nanyang-p4' || picture.layout !== 'table') throw new Error('Expected table fixture');
    const changedOtherRow: Visible = {
      ...table,
      picture: {...picture, rows: [{label: '6C', values: [35, 5]}, picture.rows[1]]},
    };
    expect(solveVisible(changedOtherRow)).toBe(60);
    expect(solveVisible({...table, prompt: 'In Class 6D, what percentage of the pupils are boys?'})).toBe(40);
  });

  it('exports one P6 family with valid prerequisite percentage skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('percentage-comparison-from-counts');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.PCT.01', 'P5.S.PCT.02']);
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
    const keys = Array.from({length: 6}, (_, index) => makeRagQuestion(42, index).key);
    expect(new Set(keys).size).toBe(6);
  });
});
