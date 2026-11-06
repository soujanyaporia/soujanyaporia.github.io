import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p5-triangle-altitude',
  level: 5,
  title: 'Match a base to its height',
  objective: 'Identify the perpendicular from the opposite vertex to a chosen base or its extension.',
  skillIds: ['P5.S.AREA.01'],
  canonicalPatternId: 'triangle-altitude',
};

type Point = { x: number; y: number };
type Drop = { vertex: number; a: number; b: number; foot: number };

function project(vertex: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = ((vertex.x - a.x) * dx + (vertex.y - a.y) * dy) / (dx * dx + dy * dy);
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function fitDiagram(raw: Point[], degrees: number): Point[] {
  const angle = degrees * Math.PI / 180;
  const rotated = raw.map(p => ({
    x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
    y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
  }));
  const minX = Math.min(...rotated.map(p => p.x));
  const maxX = Math.max(...rotated.map(p => p.x));
  const minY = Math.min(...rotated.map(p => p.y));
  const maxY = Math.max(...rotated.map(p => p.y));
  // Uniform scaling preserves perpendicularity; margins allow upright labels.
  const scale = Math.min(220 / (maxX - minX), 125 / (maxY - minY));
  return rotated.map(p => ({
    x: 160 + (p.x - (minX + maxX) / 2) * scale,
    y: 100 + (p.y - (minY + maxY) / 2) * scale,
  }));
}

function rightAngle(foot: Point, along: Point, vertex: Point): Batch11UpperMark {
  const baseLength = Math.hypot(along.x - foot.x, along.y - foot.y);
  const heightLength = Math.hypot(vertex.x - foot.x, vertex.y - foot.y);
  const u = { x: (along.x - foot.x) / baseLength, y: (along.y - foot.y) / baseLength };
  const v = { x: (vertex.x - foot.x) / heightLength, y: (vertex.y - foot.y) / heightLength };
  const size = 7;
  const first = { x: foot.x + size * u.x, y: foot.y + size * u.y };
  const middle = { x: first.x + size * v.x, y: first.y + size * v.y };
  const last = { x: foot.x + size * v.x, y: foot.y + size * v.y };
  return { kind: 'path', d: `M ${first.x} ${first.y} L ${middle.x} ${middle.y} L ${last.x} ${last.y}` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const exterior = rng.chance(0.5);
  const width = rng.pick(exterior ? [95, 110] : [170, 180, 190]);
  const tipX = rng.pick(exterior ? [160, 180] : [80, 90, 100]);
  const height = rng.pick(exterior ? [85, 105] : [140, 150, 160]);
  const raw: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: tipX, y: -height }];
  const triples: [number, number, number][] = exterior
    ? [[2, 0, 1], [1, 0, 2]]
    : [[2, 0, 1], [0, 1, 2], [1, 2, 0]];
  const drops: Drop[] = triples.map(([vertex, a, b], i) => {
    raw.push(project(raw[vertex], raw[a], raw[b]));
    return { vertex, a, b, foot: 3 + i };
  });
  const selected = exterior ? drops[0] : rng.pick(drops);
  const points = fitDiagram(raw, rng.pick([-35, -15, 15, 35, 90, 145]));
  const labels = rng.shuffle('JKLMNPQRSTUVWXYZ'.split('')).slice(0, points.length);
  const segment = (a: number, b: number) => labels[a] + labels[b];
  const triangle = labels.slice(0, 3).join('');
  const base = segment(selected.a, selected.b);
  const answer = segment(selected.vertex, selected.foot);
  const options = exterior
    ? [answer, segment(0, 2), segment(1, 2), segment(drops[1].vertex, drops[1].foot)]
    : [...drops.map(d => segment(d.vertex, d.foot)), segment(selected.a, selected.vertex)];

  const marks: Batch11UpperMark[] = [];
  const addLine = (a: number, b: number, dashed = false) => {
    marks.push({ kind: 'line', x1: points[a].x, y1: points[a].y, x2: points[b].x, y2: points[b].y, dashed });
  };
  addLine(0, 1);
  addLine(1, 2);
  addLine(2, 0);
  if (exterior) addLine(1, drops[0].foot, true);
  for (const drop of drops) {
    addLine(drop.vertex, drop.foot, true);
    marks.push(rightAngle(points[drop.foot], points[drop.a], points[drop.vertex]));
  }
  const centre = {
    x: points.slice(0, 3).reduce((sum, p) => sum + p.x, 0) / 3,
    y: points.slice(0, 3).reduce((sum, p) => sum + p.y, 0) / 3,
  };
  points.forEach((p, i) => {
    const dx = p.x - centre.x;
    const dy = p.y - centre.y;
    const distance = Math.hypot(dx, dy);
    marks.push({ kind: 'circle', cx: p.x, cy: p.y, r: 2, fill: '#235b4c' });
    marks.push({ kind: 'text', x: p.x + 18 * dx / distance - 5, y: p.y + 18 * dy / distance + 6, text: labels[i] });
  });

  const context = ['Each small square marks a right angle. The diagram is not drawn to scale.'];
  if (exterior) {
    context.push(`${labels[0]}, ${labels[1]} and ${labels[3]} lie on one straight line, with ${labels[1]} between the other two points.`);
  }
  // Describe the same geometric givens for readers who cannot see the figure.
  const relations = drops.map(d => `${segment(d.vertex, d.foot)} meets the line through ${labels[d.a]} and ${labels[d.b]} at a right angle at ${labels[d.foot]}.`);
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `Triangle ${triangle}, with chosen base ${base}. ${context.join(' ')} ${relations.join(' ')}`,
    marks,
  };
  const workedSteps = [
    { text: `The chosen base is ${base}. The vertex opposite this base is ${labels[selected.vertex]}.` },
    { text: `Follow ${answer} to the small square at ${labels[selected.foot]}. It meets the line through ${labels[selected.a]} and ${labels[selected.b]} at a right angle.` },
    { text: exterior
      ? `This perpendicular ends on the extension of ${base}. A height can lie outside a triangle, so choose ${answer}.`
      : `This perpendicular joins the opposite vertex to ${base}, so choose ${answer}.` },
  ];
  return {
    key,
    prompt: `Triangle ${triangle} has base ${base}. Which line segment is its perpendicular height?`,
    context,
    picture,
    answer,
    choices: rng.shuffle(options),
    hint: 'Start at the vertex opposite the named base. Look for a line that meets the base, or its extension, at a right angle.',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
