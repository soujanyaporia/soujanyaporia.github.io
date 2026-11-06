import type {Batch11UpperPicture} from './batch11UpperPicture';

export type Point = [number, number];
export const patch = '#b7d6c7';

// Draw in length units. Keep the same scale on both axes and leave space for labels.
export function boundaryDiagram(width: number, height: number, label: string) {
  const picture: Batch11UpperPicture = {type: 'batch11-upper', label, marks: []};
  const scale = Math.min(184 / width, 110 / height);
  const x = (u: number) => 160 + (u - width / 2) * scale;
  const y = (v: number) => 91 + (v - height / 2) * scale;
  const line = (x1: number, y1: number, x2: number, y2: number, dashed = false) => {
    picture.marks.push({kind: 'line', x1, y1, x2, y2, dashed});
  };
  function polygon(points: Point[], fill?: string) {
    const d = points.map(([u, v], i) => (i ? 'L' : 'M') + x(u) + ' ' + y(v)).join(' ') + ' Z';
    picture.marks.push({kind: 'path', d, fill});
  }
  function box(u: number, v: number, w: number, h: number) {
    polygon([[u, v], [u + w, v], [u + w, v + h], [u, v + h]]);
  }
  function guide(a: Point, b: Point) {
    line(x(a[0]), y(a[1]), x(b[0]), y(b[1]), true);
  }
  function horizontal(from: number, to: number, at: number, below: boolean, unit: string) {
    const a = x(from), b = x(to), v = y(at) + (below ? 9 : -9);
    const text = (to - from) + ' ' + unit;
    line(a, v, b, v);
    line(a, v - 3, a, v + 3);
    line(b, v - 3, b, v + 3);
    picture.marks.push({kind: 'text', x: (a + b) / 2 - 4 * text.length, y: v + (below ? 20 : -5), text});
  }
  function vertical(from: number, to: number, at: number, right: boolean, unit: string) {
    const a = y(from), b = y(to), u = x(at) + (right ? 9 : -9);
    const text = (to - from) + ' ' + unit;
    line(u, a, u, b);
    line(u - 3, a, u + 3, a);
    line(u - 3, b, u + 3, b);
    picture.marks.push({kind: 'text', x: right ? u + 5 : u - 9 * text.length - 6, y: (a + b) / 2 + 5, text});
  }
  return {picture, polygon, box, guide, horizontal, vertical};
}
