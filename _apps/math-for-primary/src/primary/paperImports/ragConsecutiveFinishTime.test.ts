import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragConsecutiveFinishTime';

it('solves every interval from the pupil’s text, including the break and any crossing of noon', () => {
  const forms = new Set<number>();
  const finishes = new Set<string>();
  let crossedNoon = false;
  let finishedBeforeNoon = false;

  for (let seed = 0; seed < 128; seed++) {
    for (const index of [0, 1, 7]) {
      const q = makeRagQuestion(seed, index);
      const [opening, ...activities] = q.context ?? [];
      const start = /\bat (\d{1,2}):(\d{2}) (am|pm)\./.exec(opening ?? '');
      if (!start) throw new Error('The pupil needs a start time and a period.');
      const hour = Number(start[1]);
      const minute = Number(start[2]);
      expect(hour).toBeGreaterThanOrEqual(1);
      expect(hour).toBeLessThanOrEqual(12);
      expect(minute).toBeLessThan(60);
      expect(minute % 5).toBe(0);
      const startHour = hour % 12 + (start[3] === 'pm' ? 12 : 0);
      const cursor = new Date(Date.UTC(2000, 0, 1, startHour, minute));
      const expectedStops: string[] = [];
      const lengths: number[] = [];
      for (const activity of activities) {
        const parts = /^They spent (?:(\d+) h )?(\d+) min (.+)\.$/.exec(activity);
        if (!parts) throw new Error(`Missing interval in ${activity}`);
        const mins = Number(parts[2]);
        expect(mins).toBeLessThan(60);
        const length = 60 * Number(parts[1] ?? 0) + mins;
        expect(length).toBeGreaterThan(0);
        expect(length % 5).toBe(0);
        lengths.push(length);
        cursor.setUTCMinutes(cursor.getUTCMinutes() + length);
        const hours = cursor.getUTCHours();
        expectedStops.push(`${hours % 12 || 12}:${cursor.toISOString().slice(14, 16)} ${hours < 12 ? 'am' : 'pm'}`);
      }
      expect(cursor.getUTCDate()).toBe(1);
      forms.add(activities.length);
      expect([2, 3]).toContain(activities.length);
      expect(q.workedSteps?.map(step => step.equation?.split(' = ')[1])).toEqual(expectedStops);
      const finish = expectedStops[expectedStops.length - 1];
      finishes.add(finish);
      if (activities.length === 3) {
        expect(activities[1]).toContain('snack break');
        expect(q.prompt).toContain('am or pm');
        expect(q.unit).toBeUndefined();
        expect(q.answer).toBe(finish);
        crossedNoon ||= startHour < 12 && cursor.getUTCHours() >= 12;
        finishedBeforeNoon ||= cursor.getUTCHours() < 12;
      } else {
        expect(start[3]).toBe('pm');
        expect(lengths[0] % 60 + lengths[1] % 60).toBe(60);
        expect(q.unit).toBe('pm');
        expect(`${q.answer} ${q.unit}`).toBe(finish);
      }
    }
  }
  expect(forms.size).toBe(2);
  expect(finishes.size).toBeGreaterThan(12);
  expect(crossedNoon).toBe(true);
  expect(finishedBeforeNoon).toBe(true);
});

it('repeats the same question for the same seed and uses the index to vary visible givens', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(93, index);
    expect(makeRagQuestion(93, index)).toEqual(q);
    contexts.add(JSON.stringify(q.context));
  }
  expect(contexts.size).toBeGreaterThan(1);
  expect(makeRagQuestion(93)).toEqual(makeRagQuestion(93, 0));
});
