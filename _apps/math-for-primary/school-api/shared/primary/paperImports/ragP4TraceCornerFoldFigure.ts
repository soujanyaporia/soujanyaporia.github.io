import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

type Point = { x: number; y: number };
type Sheet = 'square' | 'rectangle' | 'diagonal';
type Target = 'FOM' | 'AOM';

export function cornerFoldFigure(sheet: Sheet, half: number, target?: Target): Batch11UpperPicture {
  const radians = Math.PI / 180;
  const angle = half * radians;
  const width = sheet === 'square' ? 138 : 158;
  const rise = width * Math.tan(angle);
  const foldedRise = width * Math.sin(2 * angle);
  // On the diagonal F is the opposite corner. In the other rectangle
  // the crease hits the right side below the top and the flap sticks out.
  const height = sheet === 'square' ? width : sheet === 'diagonal' ? rise : (rise + foldedRise) / 2;
  const o = { x: 70, y: 172 };
  const a = { x: o.x, y: o.y - height };
  const b = { x: o.x + width, y: o.y };
  const f = { x: b.x, y: o.y - rise };
  const m = { x: o.x + width * Math.cos(2 * angle), y: o.y - foldedRise };
  const xy = (p: Point) => `${p.x} ${p.y}`;
  const text = (p: Point, dx: number, dy: number, name: string): Batch11UpperMark =>
    ({ kind: 'text', x: p.x + dx, y: p.y + dy, text: name });
  const marks: Batch11UpperMark[] = [
    { kind: 'path', d: `M ${xy(o)} H ${b.x} V ${a.y} H ${a.x} Z` },
    // The open path fills the flap without stroking over its dashed crease.
    { kind: 'path', d: `M ${xy(o)} L ${xy(m)} L ${xy(f)}`, fill: '#e4f1ea' },
    { kind: 'line', x1: o.x, y1: o.y, x2: f.x, y2: f.y, dashed: true },
    text(o, -17, 17, 'O'), text(a, -20, 5, 'A'), text(b, -2, 19, 'B'),
    text(f, 7, 5, 'F'), text(m, -21, 1, 'M'),
  ];
  if (target) {
    const radius = 29;
    const onArc = (d: number) => xy({ x: o.x + radius * Math.cos(d * radians), y: o.y - radius * Math.sin(d * radians) });
    const start = target === 'FOM' ? half : 2 * half;
    const end = target === 'FOM' ? 2 * half : 90;
    marks.push({ kind: 'path', d: `M ${onArc(start)} A ${radius} ${radius} 0 0 0 ${onArc(end)}` });
  }
  const label = 'A is above O and B is to its right. From OB towards OA, the rays are OB, OF, OM and OA. B folds onto M across OF.';
  return { type: 'batch11-upper', label: target ? `${label} The arc marks ∠${target}.` : label, marks };
}
