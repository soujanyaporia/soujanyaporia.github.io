import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragSuccessiveTimes';

function read(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible time information in ${text}`);
  return match;
}

function solveVisible(q: Question) {
  const story = (q.context ?? []).join(' ');
  const timeline = q.picture?.type === 'paper' && q.picture.layout === 'timeline' ? q.picture : undefined;
  const start = read(timeline?.points[0].label ?? story, /(\d{1,2}):(\d{2}) (am|pm)/);
  const building = Number(read(timeline?.gaps[0] ?? story, /(\d+) minutes/)[1]);
  const duration = read(story, /fly them for (half an hour|an hour|\d+ minutes)\./)[1];
  const flying = duration === 'half an hour' ? 30 : duration === 'an hour' ? 60 : Number.parseInt(duration, 10);
  const hour = Number(start[1]) % 12 + (start[3] === 'pm' ? 12 : 0);
  const clock = new Date(Date.UTC(2000, 0, 1, hour, Number(start[2])));
  const format = () => clock.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).toLowerCase().replace(/\s+/g, ' ');
  const firstReading = format();
  clock.setUTCMinutes(clock.getUTCMinutes() + building);
  const ready = format();
  clock.setUTCMinutes(clock.getUTCMinutes() + flying);
  const finish = format();
  return { firstReading, building, flying, ready, finish, timeline };
}

it('solves both forms from the story and timeline, and checks every linked entry', () => {
  const forms = new Set<string>();
  const periods = new Set<string>();
  const hourCrossings = new Set<boolean>();
  const convertedMinutes = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { firstReading, building, flying, ready, finish, timeline } = solveVisible(q);
      const [startHour, startMinute, period] = firstReading.split(/[: ]/);
      const [readyHour, readyMinute] = ready.split(/[: ]/);
      const [finishHour, finishMinute, finishPeriod] = finish.split(/[: ]/);
      periods.add(period);
      hourCrossings.add(startHour !== finishHour);
      expect(Number(startMinute) % 5).toBe(0);
      expect(building).toBeGreaterThan(0);
      expect(flying).toBeGreaterThan(0);
      expect(finishPeriod).toBe(period);
      expect(q.workedSteps?.[0].equation).toBe(`${firstReading} + ${building} minutes = ${ready}`);
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${ready} + ${flying} minutes = ${finish}`);

      if (timeline) {
        forms.add('timeline');
        convertedMinutes.add(flying);
        expect(timeline.points.slice(1).map(point => point.label)).toEqual(['Kites ready: ?', 'Finish flying: ?']);
        expect(timeline.gaps[1]).toBe('? minutes');
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-fields') throw new Error('Expected labelled time fields');
        expect(spec.fields.map(field => field.label)).toEqual([
          `Kites ready (${period}) — hour`, 'Kites ready — minutes', 'Time spent flying (minutes)',
          `Finish flying (${period}) — hour`, 'Finish flying — minutes',
        ]);
        const entries = [readyHour, readyMinute, String(flying), finishHour, finishMinute];
        expect(JSON.parse(q.answer)).toEqual(entries);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(entries.map(n => String(Number(n)))))).toBe(true);
        for (let field = 0; field < entries.length; field++) {
          const wrong = [...entries];
          wrong[field] = String(Number(wrong[field]) + 1);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
        }
      } else {
        forms.add('final time');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(finish);
        expect(q.answer).not.toBe(ready);
      }
    }
  }
  expect(forms).toEqual(new Set(['timeline', 'final time']));
  expect(periods).toEqual(new Set(['am', 'pm']));
  expect(convertedMinutes).toEqual(new Set([30, 60]));
  expect(hourCrossings).toEqual(new Set([true, false]));
});

it('repeats the same question for a seed and index and varies the givens across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    const { firstReading, building, flying } = solveVisible(q);
    stories.add(`${firstReading}/${building}/${flying}`);
  }
  expect(stories.size).toBeGreaterThan(1);
});
