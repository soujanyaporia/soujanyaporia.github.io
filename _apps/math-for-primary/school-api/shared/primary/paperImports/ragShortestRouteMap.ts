import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

type Segment = { from: number; to: number; length: string; x: number; y: number };

export function routeMap(names: string[], top: string, right: string, left: string, bottom: string,
  diagonal?: string): Batch11UpperPicture {
  const points = [
    { x: 24, y: 50, tx: 4, ty: 36 }, { x: 296, y: 50, tx: 266, ty: 36 },
    { x: 24, y: 151, tx: 4, ty: 178 }, { x: 296, y: 151, tx: 266, ty: 178 },
    { x: 157, y: 103, tx: 130, ty: 126 },
  ];
  const roads: Segment[] = [
    { from: 0, to: 1, length: top, x: 118, y: 41 },
    { from: 1, to: 3, length: right, x: 193, y: 127 },
    { from: 0, to: 2, length: left, x: 33, y: 92 },
    { from: 2, to: 3, length: bottom, x: 110, y: 177 },
  ];
  if (diagonal) roads.push({ from: 1, to: 2, length: diagonal, x: 118, y: 85 });
  if (names.length === 5) roads.push({ from: 1, to: 4, length: '? m', x: 188, y: 77 });

  const marks: Batch11UpperMark[] = [];
  const descriptions: string[] = [];
  for (const { from, to, length, x, y } of roads) {
    const a = points[from], b = points[to];
    marks.push({ kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y },
      { kind: 'text', x, y, text: length });
    descriptions.push(`${names[from]} to ${names[to]}: ${length}.`);
  }
  names.forEach((name, i) => {
    const p = points[i];
    marks.push({ kind: 'circle', cx: p.x, cy: p.y, r: 3, fill: '#235b4c' },
      { kind: 'text', x: p.tx, y: p.ty, text: name });
  });
  return { type: 'batch11-upper', marks, label: descriptions.join(' ') };
}
