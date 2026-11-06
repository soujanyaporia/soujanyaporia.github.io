import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'compass-direction-constraints',
  level: 5,
  title: 'Find points by compass direction',
  objective: 'Compare labelled grid positions using compass directions.',
  skillIds: ['P1.S.SHAPE.03'],
  canonicalPatternId: 'compass-direction-constraints',
} as const;

type Direction = 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
type Point = { name: string; x: number; y: number };
const direction = (dx: number, dy: number): Direction => {
  if (dy > 0) return dx > 0 ? 'north-east' : dx < 0 ? 'north-west' : 'north';
  if (dy < 0) return dx > 0 ? 'south-east' : dx < 0 ? 'south-west' : 'south';
  return dx > 0 ? 'east' : 'west';
};
const opposite = (d: Direction): Direction => ({
  north: 'south', 'north-east': 'south-west', east: 'west', 'south-east': 'north-west',
  south: 'north', 'south-west': 'north-east', west: 'east', 'north-west': 'south-east',
}[d] as Direction);

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const mode = rng.int(0, 2);
  const jitter = rng.int(0, 2);
  let points: Point[];
  let prompt: string;
  let answer: string;
  let hint: string;
  let steps: string[];

  if (mode === 0) {
    const y = 2 + jitter;
    points = [{ name: 'A', x: 2, y }, { name: 'B', x: 6, y }, { name: 'C', x: 1, y: 1 }, { name: 'D', x: 4, y: 6 }];
    prompt = 'Which labelled point is directly east of point A?';
    answer = 'B';
    hint = 'East means to the right. For directly east, the points must also be on the same row.';
    steps = [`A is at (2, ${y}). B is at (6, ${y}), on the same row and farther east.`, 'So B is directly east of A.'];
  } else if (mode === 1) {
    const x = 1 + jitter;
    points = [{ name: 'A', x, y: 1 }, { name: 'B', x: x + 3, y: 5 }, { name: 'C', x: 1, y: 6 }, { name: 'D', x: 7, y: 2 }];
    prompt = 'In which compass direction is point B from point A?';
    answer = 'north-east';
    hint = 'Compare the positions: is B to the right or left of A, and higher or lower?';
    steps = [`From A to B, the horizontal position increases from ${x} to ${x + 3}. B is east of A.`, 'The vertical position also increases from 1 to 5. B is north of A.', 'So B is north-east of A.'];
  } else {
    const shift = jitter;
    points = [{ name: 'A', x: 5 + shift, y: 5 }, { name: 'B', x: 2 + shift, y: 2 }, { name: 'C', x: 1, y: 6 }, { name: 'D', x: 7, y: 1 }];
    const clue = direction(points[0].x - points[1].x, points[0].y - points[1].y);
    prompt = `Point A is ${clue} of point ____. Which labelled point completes the sentence?`;
    answer = 'B';
    hint = `Reverse the direction from A: look ${opposite(clue)} of A.`;
    steps = [`A is ${clue} of B, so reverse the direction to locate B from A.`, `B is ${opposite(clue)} of A. The missing point is B.`];
  }

  const visible = points.map(p => `${p.name} (${p.x}, ${p.y})`).join('; ');
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [`On a square grid, east is right and north is up. The labelled points are: ${visible}.`],
    prompt,
    answer,
    hint,
    explanation: steps.join(' '),
    workedSteps: steps.map(text => ({ text })),
  };
}
