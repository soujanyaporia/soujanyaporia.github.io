import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2ContributionsAtTwoRates';

function readNumber(story: string, pattern: RegExp): number {
  const match = pattern.exec(story);
  if (!match) throw new Error(`Missing visible given ${pattern} in ${story}`);
  return Number(match[1]);
}

it('solves each visible story in the unit requested by its question', () => {
  const carAnswers = new Set<number>();
  const wheelAnswers = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      const total = readNumber(story, /have (\d+) wheels in all/);
      const perCar = readNumber(story, /Each car has (\d+) wheels/);
      expect(perCar).toBe(4);
      expect(total).toBeLessThanOrEqual(60);
      expect(q.choices).toBeUndefined();

      if (q.prompt === 'How many cars are on the shelf?') {
        const bikes = readNumber(story, /holds (\d+) bicycles and some cars/);
        const perBike = readNumber(story, /Each bicycle has (\d+) wheels/);
        expect(perBike).toBe(2);
        expect(bikes).toBeGreaterThan(0);
        expect(bikes).toBeLessThanOrEqual(10);
        // Count one car at a time until the shelf total is reached.
        const bikeWheels = bikes * perBike;
        let wheels = bikeWheels;
        let cars = 0;
        while (wheels < total) {
          wheels += perCar;
          cars++;
        }
        expect(wheels).toBe(total);
        expect(cars).toBeGreaterThan(0);
        expect(cars).toBeLessThanOrEqual(10);
        expect(q.unit).toBe('cars');
        expect(q.answer).toBe(String(cars));
        expect(q.workedSteps?.map(step => step.equation)).toEqual([
          `${bikes} × ${perBike} = ${bikeWheels} wheels`,
          `${total} − ${bikeWheels} = ${cars * perCar} wheels`,
          `${cars * perCar} ÷ ${perCar} = ${cars} cars`,
        ]);
        carAnswers.add(cars);
      } else {
        expect(q.prompt).toBe('How many wheels are on the bicycles altogether?');
        const cars = readNumber(story, /holds (\d+) cars and some bicycles/);
        expect(cars).toBeGreaterThan(0);
        expect(cars).toBeLessThanOrEqual(10);
        const bikeWheels = total - cars * perCar;
        expect(bikeWheels).toBeGreaterThan(0);
        expect(bikeWheels % 2).toBe(0);
        expect(q.unit).toBe('wheels');
        expect(q.answer).toBe(String(bikeWheels));
        expect(q.workedSteps?.map(step => step.equation)).toEqual([
          `${cars} × ${perCar} = ${cars * perCar} wheels`,
          `${total} − ${cars * perCar} = ${bikeWheels} wheels`,
        ]);
        wheelAnswers.add(bikeWheels);
      }
    }
  }
  expect(carAnswers.size).toBeGreaterThan(1);
  expect(wheelAnswers.size).toBeGreaterThan(1);
});

it('reproduces the same story for the same seed and index', () => {
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
  expect(makeRagQuestion(18, 3)).toEqual(makeRagQuestion(18, 3));
});
