import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export interface ClockEntry {
  name: string;
  minutes: number;
}

// A quarter turn points to 3. At half past, the hour hand sits between two ticks.
function tip(cx: number, cy: number, turns: number, length: number) {
  const angle = turns * 2 * Math.PI;
  return { x: cx + length * Math.sin(angle), y: cy - length * Math.cos(angle) };
}

export function fourClocks(entries: ClockEntry[]): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [
    { kind: 'line', x1: 160, y1: 4, x2: 160, y2: 196 },
    { kind: 'line', x1: 4, y1: 100, x2: 316, y2: 100 },
  ];
  const descriptions: string[] = [];

  entries.forEach(({ name, minutes }, i) => {
    const left = (i % 2) * 160;
    const cx = left + 111;
    const cy = 50 + Math.floor(i / 2) * 100;
    marks.push({ kind: 'text', x: left + 8, y: cy + 6, text: name });
    marks.push({ kind: 'circle', cx, cy, r: 44, fill: 'white' });
    for (let n = 1; n <= 12; n++) {
      const a = tip(cx, cy, n / 12, 39);
      const b = tip(cx, cy, n / 12, 43);
      marks.push({ kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      if (n % 3 === 0) {
        const p = tip(cx, cy, n / 12, 30);
        marks.push({ kind: 'text', x: p.x - (n === 12 ? 10 : 5), y: p.y + 5, text: String(n) });
      }
    }
    const hourEnd = tip(cx, cy, minutes / 720, 14);
    const minuteEnd = tip(cx, cy, (minutes % 60) / 60, 22);
    marks.push(
      { kind: 'line', x1: cx, y1: cy, x2: hourEnd.x, y2: hourEnd.y },
      { kind: 'line', x1: cx, y1: cy, x2: minuteEnd.x, y2: minuteEnd.y },
      { kind: 'circle', cx, cy, r: 2, fill: '#235b4c' },
    );
    const hour = Math.floor(minutes / 60) % 12 || 12;
    const hands = minutes % 60 === 0
      ? `long hand at 12, short hand at ${hour}`
      : `long hand at 6, short hand halfway between ${hour} and ${hour % 12 + 1}`;
    descriptions.push(`${name}: ${hands}.`);
  });

  return { type: 'batch11-upper', label: descriptions.join(' '), marks };
}
