import {expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragSumOfSegmentsOrLengths';

function solveRoute(picture: Question['picture']) {
  if (picture?.type !== 'paper' || picture.layout !== 'timeline') throw new Error('Expected a labelled route');
  expect(picture.points.map(point => point.label)).toEqual(['Library', 'Theatre', 'Orchard']);
  expect(picture.gaps).toHaveLength(2);
  const first = /^(\d+) km (\d+) m$/.exec(picture.gaps[0]);
  const second = /^(\d+) m$/.exec(picture.gaps[1]);
  if (!first || !second) throw new Error('Both arrows need distance labels in the stated units');
  const firstKm = Number(first[1]);
  const firstExtraM = Number(first[2]);
  const secondM = Number(second[1]);
  expect(firstKm).toBeGreaterThan(0);
  expect(firstExtraM).toBeGreaterThan(0);
  expect(firstExtraM).toBeLessThan(1000);
  expect(secondM).toBeGreaterThan(1000);

  // Split the second label into km and m, then combine like units.
  const looseMetres = firstExtraM + secondM % 1000;
  expect(looseMetres).toBeGreaterThan(1000);
  const km = firstKm + Math.floor(secondM / 1000) + 1;
  const m = looseMetres - 1000;
  expect(m).toBeGreaterThan(0);
  expect(m).toBeLessThan(1000);
  expect(km * 1000 + m).toBeLessThan(10000);
  return {km, m};
}

test('both answer fields follow from the two visible arrow labels', () => {
  for (let seed = 0; seed < 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const {km, m} = solveRoute(q.picture);
      const expected = JSON.stringify([String(km), String(m)]);
      expect(q.answer).toBe(expected);
      const spec = q.structuredResponse;
      if (spec?.kind !== 'number-pair') throw new Error('Expected separate km and m fields');
      expect([spec.firstLabel, spec.secondLabel]).toEqual(['Whole kilometres', 'Remaining metres']);
      expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
      const ungrouped = JSON.stringify([String(km - 1), String(m + 1000)]);
      expect(structuredResponseCorrect(spec, q.answer, ungrouped)).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(km)]))).toBe(false);
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${km * 1000 + m} m = ${km} km ${m} m`);
    }
  }
});

test('the same inputs reproduce a ride and changing the index varies its distances', () => {
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
  const routes = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(18, index);
    expect(makeRagQuestion(18, index)).toEqual(q);
    routes.add(JSON.stringify(q.picture));
  }
  expect(routes.size).toBeGreaterThan(1);
});
