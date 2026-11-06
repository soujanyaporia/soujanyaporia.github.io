import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragSuccessiveChanges';

it('solves each story from the stated count and moves, and checks both worked equations', () => {
  const seen = new Set<string>();
  const stories = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const lines = q.context ?? [];
      const anchors = lines.filter(line => line.startsWith('At the '));
      expect(anchors).toHaveLength(1);
      const anchor = /^At the (start|end), the box held (\d+) tickets\.$/.exec(anchors[0]);
      if (!anchor) throw new Error('Expected a visible starting or ending count');
      const givenStart = anchor[1] === 'start';
      const given = Number(anchor[2]);
      const deltas = lines.flatMap(line => {
        const take = /^Asha took (\d+) tickets out of the box\.$/.exec(line);
        if (take) return [-Number(take[1])];
        const put = /^Asha put (\d+) tickets into the box\.$/.exec(line);
        return put ? [Number(put[1])] : [];
      });
      expect(deltas).toHaveLength(2);
      expect(deltas[0] * deltas[1]).toBeLessThan(0);
      expect(q.prompt).toBe(`How many tickets were in the box at the ${givenStart ? 'end' : 'start'}?`);

      // Recover a missing start from the net change, then replay the story in time order.
      const start = givenStart ? given : given - (deltas[0] + deltas[1]);
      const middle = start + deltas[0];
      const end = middle + deltas[1];
      for (const count of [start, middle, end]) {
        expect(Number.isInteger(count)).toBe(true);
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(10000);
      }
      if (!givenStart) expect(end).toBe(given);
      expect(q.answer).toBe(String(givenStart ? end : start));
      expect(q.unit).toBe('tickets');
      expect(q.choices).toBeUndefined();
      expect(q.picture).toBeUndefined();

      const path = givenStart ? [start, middle, end] : [end, middle, start];
      const equations = path.slice(1).map((next, i) => {
        const previous = path[i];
        return `${previous} ${next > previous ? '+' : '−'} ${Math.abs(next - previous)} = ${next}`;
      });
      expect(q.workedSteps?.map(step => step.equation)).toEqual(equations);
      seen.add(`${anchor[1]}:${deltas[0] > 0 ? 'gain' : 'loss'}`);
      stories.add(lines.join(' '));
    }
  }
  expect([...seen].sort()).toEqual(['end:gain', 'end:loss', 'start:loss']);
  expect(stories.size).toBeGreaterThan(100);
});

it('reproduces an indexed question and uses index zero by default', () => {
  expect(makeRagQuestion(71)).toEqual(makeRagQuestion(71, 0));
  expect(makeRagQuestion(71, 4)).toEqual(makeRagQuestion(71, 4));
  const contexts = Array.from({ length: 8 }, (_, i) => makeRagQuestion(71, i).context?.join(' '));
  expect(new Set(contexts).size).toBeGreaterThan(1);
});
