import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragJourneyDurationParts';

function readRide(label: string) {
  const match = /^(?:(\d+) h )?(\d+) min$/.exec(label);
  if (!match) throw new Error(`Cannot read ride duration: ${label}`);
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  expect(minutes).toBeGreaterThan(0);
  expect(minutes).toBeLessThan(60);
  return { hours, minutes };
}

it('solves the trip from the two route labels and the stop in the story', () => {
  const compoundPositions = new Set<number>();
  const needsRegrouping = new Set<boolean>();
  const trips = new Set<string>();

  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const route = q.picture;
      if (route?.type !== 'paper' || route.layout !== 'timeline') {
        throw new Error('The pupil needs the labelled route');
      }
      expect(route.points.map(point => point.label)).toEqual(['School', 'Park', 'Campsite']);
      expect(route.gaps).toHaveLength(2);
      const rides = route.gaps.map(readRide);
      expect(rides.filter(ride => ride.hours > 0)).toHaveLength(1);
      compoundPositions.add(rides.findIndex(ride => ride.hours > 0));

      const stopLabel = /stops at the park for (\d+) minutes/.exec(q.context?.join(' ') ?? '');
      if (!stopLabel) throw new Error('The park stop needs a duration');
      const stop = Number(stopLabel[1]);
      expect(stop).toBeGreaterThan(0);
      expect(q.unit).toBe('minutes');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();

      // Combine like units first, carrying any full hours out of the minutes column.
      const minutesColumn = rides[0].minutes + stop + rides[1].minutes;
      const wholeHours = rides[0].hours + rides[1].hours + Math.floor(minutesColumn / 60);
      const expected = 60 * wholeHours + minutesColumn % 60;
      expect(q.answer).toBe(String(expected));
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${expected - stop} min + ${stop} min = ${expected} min`);
      needsRegrouping.add(minutesColumn >= 60);
      trips.add(JSON.stringify([route.gaps, stop]));
    }
  }

  expect(compoundPositions.size).toBe(2);
  expect(needsRegrouping.size).toBe(2);
  expect(trips.size).toBeGreaterThan(24);
});

it('reproduces a trip for the same seed and varies visible givens across indices', () => {
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  const trips = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(19, index);
    expect(q).toEqual(makeRagQuestion(19, index));
    trips.add(JSON.stringify([q.context, q.picture]));
  }
  expect(trips.size).toBeGreaterThan(1);
});
