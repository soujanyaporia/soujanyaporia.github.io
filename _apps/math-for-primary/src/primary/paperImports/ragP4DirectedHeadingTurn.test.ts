import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4DirectedHeadingTurn';

const compass: Record<string, number> = {
  north: 0, east: 90, south: 180, west: 270,
  'north-east': 45, 'south-east': 135, 'south-west': 225, 'north-west': 315,
};

function readBearings(q: Question): Record<string, number> {
  if (!q.picture) return compass;
  const map = q.picture;
  if (map.type !== 'batch11-upper') throw Error('Expected a labelled path map');
  const centre = map.marks.find(m => m.kind === 'circle');
  if (!centre || centre.kind !== 'circle') throw Error('Missing meeting point');

  const bearing = (x: number, y: number) => {
    const radians = Math.atan2(x - centre.cx, centre.cy - y);
    return (Math.round(radians / (Math.PI / 4)) * 45 + 360) % 360;
  };
  const rays = new Set<number>();
  const labels: Record<string, number> = {};
  const north = map.marks.find(m => m.kind === 'text' && m.text === 'N');
  if (!north || north.kind !== 'text') throw Error('Missing north marker');
  expect(map.marks.some(m => m.kind === 'line' && m.x1 === m.x2 && m.y2 < m.y1
    && m.y2 > north.y && Math.abs(m.x2 - north.x) < 12)).toBe(true);
  for (const mark of map.marks) {
    if (mark.kind === 'line' && mark.x1 === centre.cx && mark.y1 === centre.cy) {
      rays.add(bearing(mark.x2, mark.y2));
    }
    if (mark.kind === 'text' && mark.text !== 'N') labels[`the ${mark.text}`] = bearing(mark.x, mark.y);
  }
  expect(rays.size).toBe(8);
  expect(Object.keys(labels)).toHaveLength(8);
  expect(new Set(Object.values(labels))).toEqual(rays);
  return { ...compass, ...labels };
}

it('solves each turn from the printed headings or path labels', () => {
  const forms = new Set<string>();
  const angles = new Set<number>();
  const longTurns = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const lookup = readBearings(q);
      const startText = /You are facing ([^.]+)\./.exec(q.context?.join(' ') ?? '')?.[1];
      if (!startText || lookup[startText] === undefined) throw Error('Start is missing');
      const start = lookup[startText];
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
      }
      const pair = /^Which of these turns will make you face (.+)\?$/.exec(q.prompt);
      if (pair) {
        forms.add('pair');
        expect(q.picture).toBeUndefined();
        const finish = lookup[pair[1]];
        const valid = (q.choices ?? []).filter(choice => {
          const match = /^(\d+)° (clockwise|anticlockwise)$/.exec(choice);
          if (!match) throw Error('A turn needs both an angle and a direction');
          const signedAngle = Number(match[1]) * (match[2] === 'clockwise' ? 1 : -1);
          return (start + signedAngle + 360) % 360 === finish;
        });
        expect(valid).toHaveLength(1);
        expect(q.answer).toBe(valid[0]);
        continue;
      }

      const turn = /^Turn (clockwise|anticlockwise) and stop when you first face (.+)\. How many degrees do you turn\?$/.exec(q.prompt);
      if (!turn || lookup[turn[2]] === undefined) throw Error('Target or turn direction is missing');
      const finish = lookup[turn[2]];
      const difference = turn[1] === 'clockwise' ? finish - start : start - finish;
      const angle = (difference + 360) % 360;
      const fromPlace = startText.startsWith('the ');
      const toPlace = turn[2].startsWith('the ');
      forms.add(fromPlace ? 'two places' : toPlace ? 'heading to place' : 'two headings');
      expect(Boolean(q.picture)).toBe(toPlace);
      expect(Boolean(q.choices)).toBe(fromPlace);
      angles.add(angle);
      if (angle > 180) longTurns.add(turn[1]);
      if (q.choices) {
        const expected = `${angle}°`;
        expect(q.choices).toContain(expected);
        expect(q.answer).toBe(expected);
      } else {
        expect(q.unit).toBe('degrees');
        expect(q.answer).toBe(String(angle));
      }
    }
  }
  expect(forms).toEqual(new Set(['two places', 'heading to place', 'two headings', 'pair']));
  expect(angles).toEqual(new Set([45, 90, 135, 180, 225, 270, 315]));
  expect(longTurns).toEqual(new Set(['clockwise', 'anticlockwise']));
});

it('repeats the same question for a seed and index', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  expect(makeRagQuestion(-5, 3)).toEqual(makeRagQuestion(-5, 3));
});
