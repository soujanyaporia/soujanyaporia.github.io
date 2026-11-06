import type { Batch11UpperPicture } from './batch11UpperPicture';

type Point = [number, number];
type Vertices = Record<string, Point>;
const radians = (angle: number) => angle * Math.PI / 180;
const offsets: Vertices = {
  A: [-17, 13], B: [6, 13], C: [6, -4], D: [-17, -5],
  E: [-5, -8], F: [6, -6], G: [-4, 19],
};

// Trace the actual sides and mark the smaller angle named in the prompt.
function draw(points: Vertices, traces: string[], target: string, description: string): Batch11UpperPicture {
  const picture: Batch11UpperPicture = { type: 'batch11-upper', label: description, marks: [] };
  for (const trace of traces) {
    for (let i = 1; i < trace.length; i++) {
      const [x1, y1] = points[trace[i - 1]];
      const [x2, y2] = points[trace[i]];
      picture.marks.push({ kind: 'line', x1, y1, x2, y2 });
    }
  }
  const [x, y] = points[target[1]];
  const direction = (name: string) => {
    const [px, py] = points[name];
    return Math.atan2(py - y, px - x);
  };
  const start = direction(target[0]);
  const end = direction(target[2]);
  const radius = 22;
  const onArc = (angle: number) => [x + radius * Math.cos(angle), y + radius * Math.sin(angle)].join(' ');
  const sweep = Math.sin(end - start) > 0 ? 1 : 0;
  picture.marks.push({ kind: 'path', d: `M ${onArc(start)} A ${radius} ${radius} 0 0 ${sweep} ${onArc(end)}` });
  for (const [name, [px, py]] of Object.entries(points)) {
    const [dx, dy] = offsets[name];
    picture.marks.push({ kind: 'text', text: name, x: px + dx, y: py + dy });
  }
  return picture;
}

export function drawSplitCorner(topAngle: number, nearVertical?: number): Batch11UpperPicture {
  const single = nearVertical === undefined;
  const h = single ? 112 : 90;
  const w = single ? h : 218;
  const left = single ? 99 : 45;
  const bottom = 154;
  const top = bottom - h;
  const points: Vertices = {
    A: [left, bottom], B: [left + w, bottom], C: [left + w, top], D: [left, top],
  };
  const hit: Point = [left + h / Math.tan(radians(topAngle)), top];
  if (nearVertical === undefined) {
    points.E = hit;
    return draw(points, ['ABCDA', 'AE'], 'DAE',
      'Square ABCD has A at the bottom left. E is on the top side DC. AE splits the corner at A. The arc is between AD and AE.');
  }
  points.F = hit;
  points.E = [left + h * Math.tan(radians(nearVertical)), top];
  return draw(points, ['ABCDA', 'AE', 'AF'], 'EAF',
    'Rectangle ABCD has A at the bottom left. D, E, F and C lie in order along the top side. The arc is between AE and AF.');
}

export function drawSharedCorner(smallAngle: number, target: string): Batch11UpperPicture {
  const tilt = Math.tan(radians(smallAngle));
  const a: Point = [45, 100];
  // AE goes up to the top edge. AG is perpendicular to AE and goes below AB.
  const e: Point = [a[0] + 54 * tilt, a[1] - 54];
  const g: Point = [a[0] + 76 / tilt, a[1] + 76];
  const points: Vertices = {
    A: a, B: [271, a[1]], C: [271, e[1]], D: [a[0], e[1]], E: e,
    F: [e[0] + g[0] - a[0], e[1] + g[1] - a[1]], G: g,
  };
  return draw(points, ['ABCDA', 'AEFGA'], target,
    `Rectangles ABCD and AEFG share A. From AD, the rays run clockwise in the order AD, AE, AB, AG. The arc marks ∠${target}.`);
}
