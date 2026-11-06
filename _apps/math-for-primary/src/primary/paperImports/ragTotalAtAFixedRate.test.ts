import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragTotalAtAFixedRate';

it('recovers each total from the story, including the child at the table', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      if (!story.includes('classmates')) continue;
      const group = /with (\d+) classmates\./.exec(story);
      const share = /Each child at the table makes (\d+) ([^.]+)\./.exec(story);
      if (!group || !share) throw new Error(`Missing headcount or amount in ${story}`);
      const others = Number(group[1]);
      const each = Number(share[1]);
      expect(others).toBeGreaterThanOrEqual(4);
      expect(others).toBeLessThanOrEqual(8);
      expect([2, 3, 4, 5, 10]).toContain(each);
      let total = each;
      for (let child = 0; child < others; child++) total += each;
      expect(q.answer).toBe(String(total));
      expect(q.unit).toBe(share[2]);
      expect(q.prompt).toContain(`How many ${share[2]}`);
      expect(q.picture).toBeUndefined();
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${others} + 1 = ${others + 1}`, `${others + 1} × ${each} = ${total}`,
      ]);
      stories.add(`${others},${each}`);
    }
  }
  expect(stories.size).toBeGreaterThan(5);
});

it('solves the weekly story and checks the bar label, equation and final unit', () => {
  const amounts = new Set<number>();
  for (let seed = -8; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      if (!story.includes('week')) continue;
      const rate = /reads (\d+) pages of a storybook each day for one full week\./.exec(story);
      if (!rate) throw new Error(`Missing daily amount or period in ${story}`);
      const daily = Number(rate[1]);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const total = days.reduce(sum => sum + daily, 0);
      expect([2, 3, 4, 10]).toContain(daily);
      const bar = q.picture;
      if (bar?.type !== 'paper' || bar.layout !== 'bars') throw new Error('Missing weekly bar');
      expect(bar.rows).toHaveLength(1);
      const parts = bar.rows[0].parts;
      expect(parts).toHaveLength(days.length);
      expect(parts[0].label).toBe('?');
      expect(parts[0].size).toBeGreaterThan(0);
      expect(parts.every(part => part.size === parts[0].size)).toBe(true);
      expect(q.display).toBe('___ days × ___ pages each day = ___ pages in one week');
      const spec = q.structuredResponse;
      if (spec?.kind !== 'number-fields') throw new Error('Missing model and equation fields');
      expect(spec.fields.map(field => field.label)).toEqual([
        'Label for the first part (pages)', 'Days in the week', 'Pages each day', 'Pages read in one week',
      ]);
      const expected = [daily, days.length, daily, total].map(String);
      expect(JSON.parse(q.answer)).toEqual(expected);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
      for (let slot = 0; slot < expected.length; slot++) {
        const wrong = [...expected];
        wrong[slot] = String(Number(wrong[slot]) + 1);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
      }
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${days.length} × ${daily} = ${total}`);
      amounts.add(daily);
    }
  }
  expect(amounts.size).toBeGreaterThan(1);
});

it('replays a seed and index and varies the visible givens across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    stories.add(JSON.stringify(q.context));
  }
  expect(stories.size).toBeGreaterThan(3);
});
