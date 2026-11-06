import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPictureGraphDifference';

it('solves each prompt using only its named rows, graph key and visible clue', () => {
  const forms = new Set<string>();
  let sawNonExtremePair = false;
  for (let seed = -8; seed < 48; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const graph = q.picture;
      if (!graph || graph.type !== 'bars' || !graph.pictures) throw Error('Expected a picture graph');
      expect(graph.scale).toBe(1);
      expect(q.context?.join(' ')).toContain('Each dot stands for 1 stamp.');
      expect(new Set(graph.labels).size).toBe(4);
      expect(graph.labels).toHaveLength(4);
      expect(graph.values).toHaveLength(4);
      expect(graph.values.every(v => Number.isInteger(v) && v >= 1 && v <= 10)).toBe(true);
      const count = (name: string) => {
        const row = graph.labels.indexOf(name);
        if (row < 0) throw Error(`No row for ${name}`);
        return graph.values[row];
      };

      const compare = /^How many (fewer|more) stamps does (\w+) have than (\w+)\?$/.exec(q.prompt);
      if (compare) {
        const [, direction, a, b] = compare;
        const expected = direction === 'fewer' ? count(b) - count(a) : count(a) - count(b);
        expect(expected).toBeGreaterThan(0);
        expect(q.answer).toBe(String(expected));
        expect(q.unit).toBe('stamps');
        expect(q.choices).toBeUndefined();
        forms.add(direction);
        if (expected !== Math.max(...graph.values) - Math.min(...graph.values)) sawNonExtremePair = true;
      } else {
        const clue = /^Who has (\d+) more stamps? than (\w+)\?$/.exec(q.prompt);
        if (!clue) throw Error(`Unrecognised question: ${q.prompt}`);
        const [, extra, reference] = clue;
        expect(Number(extra)).toBeGreaterThan(0);
        const matches = graph.labels.filter(name => count(name) - count(reference) === Number(extra));
        expect(matches).toHaveLength(1);
        expect(q.answer).toBe(matches[0]);
        expect(q.unit).toBeUndefined();
        forms.add('name');
      }
    }
  }
  expect([...forms].sort()).toEqual(['fewer', 'more', 'name']);
  expect(sawNonExtremePair).toBe(true);
});

it('replays the same question and varies visible givens across a session', () => {
  const visible = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    visible.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
  expect(visible.size).toBeGreaterThan(1);
});
