import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4CompassMapRelations';

type Dot = { x: number; y: number; label: string };

function readDots(q: Question): Dot[] {
  const map = q.picture;
  if (map?.type !== 'batch11-upper') throw new Error('Missing trail map');
  const circles = map.marks.filter(mark => mark.kind === 'circle');
  const labels = map.marks.filter(mark => mark.kind === 'text');
  const north = labels.find(label => label.text === 'N');
  if (!north) throw new Error('Missing north label');
  const lines = map.marks.filter(mark => mark.kind === 'line');
  const shaft = lines.find(line => line.x1 === line.x2 && line.y2 < line.y1);
  if (!shaft) throw new Error('Missing north arrow');
  expect(north.y).toBeLessThan(shaft.y2);
  expect(Math.abs(north.x - shaft.x2)).toBeLessThan(16);
  const tip = lines.filter(line => line !== shaft && line.x2 === shaft.x2 && line.y2 === shaft.y2 && line.y1 > line.y2);
  expect(tip.some(line => line.x1 < shaft.x2)).toBe(true);
  expect(tip.some(line => line.x1 > shaft.x2)).toBe(true);

  const dots = labels.filter(label => label !== north).map(label => {
    const nearby = circles.filter(c => Math.hypot(c.cx - label.x, c.cy - label.y) < 20);
    expect(nearby).toHaveLength(1);
    return { x: nearby[0].cx, y: nearby[0].cy, label: label.text };
  });
  expect(circles).toHaveLength(6);
  expect(new Set(dots.map(dot => dot.label)).size).toBe(6);
  expect(new Set(dots.map(dot => `${dot.x},${dot.y}`)).size).toBe(6);
  return dots;
}

// Read an angle clockwise from the upward arrow. Ignore off-axis pairs.
function compassLetters(from: Dot, to: Dot): string | undefined {
  const dx = to.x - from.x;
  const north = from.y - to.y;
  if (!dx && !north) return;
  const eighths = Math.atan2(dx, north) / (Math.PI / 4);
  const step = Math.round(eighths);
  if (Math.abs(eighths - step) > 1e-8) return;
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][(step + 8) % 8];
}

it('solves both questions from their prompts, printed dots and north arrow', () => {
  const spotBearings = new Set<string>();
  const directionAnswers = new Set<string>();
  const locationControls = new Set<string>();
  for (let seed = -4; seed < 60; seed++) {
    for (const index of [0, 2, 4]) {
      const first = makeRagQuestion(seed, index);
      const second = makeRagQuestion(seed, index + 1);
      expect(second.picture).toEqual(first.picture);
      const dots = readDots(first);
      const spot = (label: string) => {
        const found = dots.find(dot => dot.label === label);
        if (!found) throw new Error(`Unknown stop ${label}`);
        return found;
      };
      const where = /^Which stop is ([a-z-]+) of ([A-Za-z]+)\?$/.exec(first.prompt);
      const whichWay = /^You are at ([A-Za-z]+)\. In which direction is ([A-Za-z]+)\? Write the compass letters\.$/.exec(second.prompt);
      if (!where || !whichWay) throw new Error('Missing origin, destination or direction');
      const letters = where[1].split('-').map(word => word[0].toUpperCase()).join('');
      const matches = dots.filter(dot => compassLetters(spot(where[2]), dot) === letters);
      expect(matches).toHaveLength(1);
      const expectedLabel = matches[0].label;
      expect(first.answer).toBe(expectedLabel);
      spotBearings.add(letters);
      if (expectedLabel.length > 1) {
        if (!first.choices) throw new Error('Missing place choices');
        expect(new Set(first.choices).size).toBe(4);
        expect(first.choices).toHaveLength(4);
        expect(first.choices).toContain(expectedLabel);
        first.choices.forEach(label => expect(spot(label).label).toBe(label));
        locationControls.add('choice');
      } else {
        expect(first.choices).toBeUndefined();
        locationControls.add('entry');
      }
      const expectedDirection = compassLetters(spot(whichWay[1]), spot(whichWay[2]));
      if (!expectedDirection) throw new Error('Stops must lie on an eight-point compass bearing');
      expect(second.answer).toBe(expectedDirection);
      expect(second.choices).toBeUndefined();
      expect(new Set([where[2], expectedLabel, whichWay[1], whichWay[2]]).size).toBe(4);
      directionAnswers.add(expectedDirection);
    }
  }
  expect(spotBearings.size).toBe(8);
  expect(directionAnswers.size).toBe(8);
  expect(locationControls.size).toBe(2);
});

it('reproduces each part and varies the visible map across pairs', () => {
  const maps = new Set<string>();
  for (let seed = 0; seed < 16; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      maps.add(JSON.stringify(q.picture));
    }
  }
  expect(maps.size).toBeGreaterThan(16);
});
