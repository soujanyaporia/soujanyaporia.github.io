import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

function clockMarks(cx: number, label: string, time: number): Batch11UpperMark[] {
  const cy = 85;
  const point = (turns: number, radius: number) => ({
    x: cx + radius * Math.sin(2 * Math.PI * turns),
    y: cy - radius * Math.cos(2 * Math.PI * turns),
  });
  const marks: Batch11UpperMark[] = [{ kind: 'circle', cx, cy, r: 68, fill: 'white' }];
  for (let n = 1; n <= 12; n++) {
    const start = point(n / 12, 62);
    const end = point(n / 12, 66);
    const digit = point(n / 12, 50);
    marks.push({ kind: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    marks.push({ kind: 'text', x: digit.x - (n < 10 ? 5 : 10), y: digit.y + 6, text: String(n) });
  }
  const short = point(time / 720, 27);
  const long = point((time % 60) / 60, 38);
  marks.push(
    { kind: 'line', x1: cx, y1: cy, x2: short.x, y2: short.y },
    { kind: 'line', x1: cx, y1: cy, x2: long.x, y2: long.y },
    { kind: 'circle', cx, cy, r: 2, fill: '#235b4c' },
    { kind: 'text', x: cx - label.length * 4.5, y: 181, text: label },
  );
  return marks;
}

function describeHands(time: number) {
  const hour = Math.floor(time / 60);
  const minute = time % 60;
  const short = minute === 0 ? `at ${hour}` : `between ${hour} and ${hour + 1}`;
  return `short hand ${short}, long hand at ${minute / 5 || 12}`;
}

export function elapsedClocks(start: number, finish: number): Batch11UpperPicture {
  return {
    type: 'batch11-upper',
    label: `Start clock: ${describeHands(start)}. Finish clock: ${describeHands(finish)}.`,
    marks: [...clockMarks(80, 'Start', start), ...clockMarks(240, 'Finish', finish)],
  };
}
