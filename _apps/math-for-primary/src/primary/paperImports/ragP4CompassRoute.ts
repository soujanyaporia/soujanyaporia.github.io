import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-compass-route',
  level: 4,
  title: 'Follow a route on a square grid',
  objective: 'Follow steps and quarter turns to find a stop, or retrace a walk to find where it began.',
  skillIds: ['P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-trace-or-reverse-compass-route-on-grid',
};

type Point = { col: number; row: number };
type Stop = Point & { label: string };
const columns = 7;
const rows = 6;
const directions = ['north', 'east', 'south', 'west'] as const;
const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const stepCount = (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`;
const turnName = (turn: number) => turn === 1 ? 'clockwise' : 'anticlockwise';

function drawMap(stops: Stop[]): Batch11UpperPicture {
  const x = (col: number) => 35 + 26 * col;
  const y = (row: number) => 22 + 26 * row;
  const marks: Batch11UpperPicture['marks'] = [];
  for (let row = 0; row <= rows; row++) {
    marks.push({ kind: 'line', x1: x(0), y1: y(row), x2: x(columns), y2: y(row), dashed: true });
  }
  for (let col = 0; col <= columns; col++) {
    marks.push({ kind: 'line', x1: x(col), y1: y(0), x2: x(col), y2: y(rows), dashed: true });
  }
  marks.push(
    { kind: 'text', text: 'N', x: 266, y: 55 },
    { kind: 'line', x1: 272, y1: 110, x2: 272, y2: 66 },
    { kind: 'line', x1: 266, y1: 76, x2: 272, y2: 66 },
    { kind: 'line', x1: 278, y1: 76, x2: 272, y2: 66 },
  );
  for (const stop of stops) {
    marks.push({ kind: 'circle', cx: x(stop.col), cy: y(stop.row), r: 3, fill: '#235b4c' });
    marks.push({ kind: 'text', text: stop.label, x: x(stop.col) + 5, y: y(stop.row) - 4 });
  }
  const locations = stops.map(s => `${s.label} at row ${s.row + 1}, column ${s.col + 1}`);
  return { type: 'batch11-upper', marks, label: `Square grid with north up. Count rows of crossings from the top and columns from the left, starting at 1. ${locations.join('. ')}.` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.weighted<'forward' | 'reverse' | 'turns'>([['forward', 5], ['reverse', 2], ['turns', 1]]);
  const legCount = mode === 'forward' && rng.chance(0.5) ? 2 : 3;
  const firstHeading = rng.int(0, 3);
  const firstTurn = rng.pick([-1, 1]);
  const secondTurn = mode === 'turns' ? rng.pick([-1, 1]) : firstTurn;
  const turns = [0, firstTurn, secondTurn];
  const firstLength = rng.int(3, 4);
  // When the third leg continues in the first direction, reserve room for both.
  const lastLimit = firstTurn === secondTurn ? 4 : rows - firstLength;
  const lengths = [firstLength, rng.int(3, 4), rng.int(1, lastLimit)].slice(0, legCount);
  const points: Point[] = [{ col: 0, row: 0 }];
  const headings: number[] = [];
  let heading = firstHeading;
  for (const [i, length] of lengths.entries()) {
    heading = (heading + turns[i] + 4) % 4;
    headings.push(heading);
    const [dx, dy] = vectors[heading];
    points.push({ col: points[i].col + length * dx, row: points[i].row + length * dy });
  }
  // Slide the whole route onto the map, keeping every bend inside the border.
  const cols = points.map(p => p.col);
  const rowNumbers = points.map(p => p.row);
  const left = rng.int(-Math.min(...cols), columns - Math.max(...cols));
  const top = rng.int(-Math.min(...rowNumbers), rows - Math.max(...rowNumbers));
  const labels = rng.shuffle(['A', 'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'P', 'R', 'T']);
  const route = points.map((p, i) => ({ col: p.col + left, row: p.row + top, label: labels[i] }));
  const empty = Array.from({ length: (rows + 1) * (columns + 1) }, (_, i) => ({
    row: Math.floor(i / (columns + 1)), col: i % (columns + 1),
  })).filter(p => !route.some(s => s.col === p.col && s.row === p.row));
  const others = rng.shuffle(empty).slice(0, 6 - route.length)
    .map((p, i) => ({ ...p, label: labels[route.length + i] }));
  const stops = [...route, ...others].sort((a, b) => a.row - b.row || a.col - b.col);
  const reverse = mode === 'reverse';
  const start = route[0].label;
  const finish = route[legCount].label;
  const answer = reverse ? start : finish;
  const known = reverse ? finish : start;
  const origin = reverse ? `Jia finishes at ${finish}.` : mode === 'turns'
    ? `Jia starts at ${start}, facing ${directions[firstHeading]}.` : `Jia starts at ${start}.`;
  const context = ['Moving along one side of a grid square counts as one step.', origin, 'Jia follows these instructions in order.'];
  const steps = [reverse ? `Begin at ${finish}, where the walk ended. Undo the last instruction first.`
    : mode === 'turns' ? `Begin at ${start}, facing ${directions[firstHeading]}.` : `Begin at ${start}. North is up on this map.`];
  for (const [i, length] of lengths.entries()) {
    const distance = stepCount(length);
    if (mode === 'turns') {
      context.push(i === 0 ? `Walk forward ${distance}.` : `Make a quarter turn ${turnName(turns[i])}, then walk forward ${distance}.`);
    } else {
      context.push(`Walk ${distance} ${directions[headings[i]]}.`);
    }
    const j = reverse ? legCount - 1 - i : i;
    const from = route[reverse ? j + 1 : j].label;
    const to = route[reverse ? j : j + 1].label;
    const dir = directions[(headings[j] + (reverse ? 2 : 0)) % 4];
    const walk = `From ${from}, count ${stepCount(lengths[j])} ${dir} to ${to}.`;
    if (reverse) steps.push(`Undo the walk ${directions[headings[j]]}. ${walk}`);
    else if (mode === 'turns' && i > 0) steps.push(`A quarter turn ${turnName(turns[i])} from ${directions[headings[i - 1]]} points ${dir}. ${walk}`);
    else steps.push(walk);
  }
  const entry = mode === 'forward' && legCount === 3;
  const distractors = stops.filter(s => s.label !== known && s.label !== answer).map(s => s.label);
  const choices = entry ? undefined : rng.shuffle([answer, ...rng.shuffle(distractors).slice(0, 3)]);
  return {
    key, context, picture: drawMap(stops), answer, choices,
    prompt: reverse ? 'At which letter did Jia begin her walk?' : 'At which letter does Jia finish her walk?',
    hint: reverse ? 'Put your finger on the last stop. Read the instructions from the bottom up and move the opposite way each time.'
      : mode === 'turns' ? 'Point in the starting direction. Each quarter turn changes the way you are facing before you walk again.'
      : 'Start at the given letter. Count gaps between crossings and keep your finger where each instruction ends.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}
