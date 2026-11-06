import type { Batch11UpperPicture } from './batch11UpperPicture';

type Vertex = [x: number, y: number, labelDx: number, labelDy: number];
type Vertices = Record<string, Vertex>;

function diagram(vertices: Vertices, outlines: string[], angles: string[], description: string): Batch11UpperPicture {
  const marks: Batch11UpperPicture['marks'] = [];
  for (const outline of outlines) {
    for (let i = 1; i < outline.length; i++) {
      const [x1, y1] = vertices[outline[i - 1]];
      const [x2, y2] = vertices[outline[i]];
      marks.push({ kind: 'line', x1, y1, x2, y2 });
    }
  }

  for (const [i, name] of angles.entries()) {
    const [x, y] = vertices[name[1]];
    const direction = (letter: string) => {
      const [px, py] = vertices[letter];
      return Math.atan2(py - y, px - x);
    };
    const start = direction(name[0]);
    const end = direction(name[2]);
    // Different radii keep adjacent marked sectors distinguishable.
    const radius = [21, 16, 25][i];
    const onArc = (a: number) => `${x + radius * Math.cos(a)} ${y + radius * Math.sin(a)}`;
    const sweep = Math.sin(end - start) > 0 ? 1 : 0;
    marks.push({ kind: 'path', d: `M ${onArc(start)} A ${radius} ${radius} 0 0 ${sweep} ${onArc(end)}` });
  }

  for (const [text, [x, y, dx, dy]] of Object.entries(vertices)) {
    marks.push({ kind: 'text', x: x + dx, y: y + dy, text });
  }
  return { type: 'batch11-upper', label: description + ' Curved marks show ' + angles.map(a => '∠' + a).join(', ') + '.', marks };
}

export function squareOnEdge(tilt: number, side: number): Batch11UpperPicture {
  const a = tilt * Math.PI / 180;
  const u = side * Math.cos(a);
  const v = side * Math.sin(a);
  const x = 141;
  const y = 158;
  return diagram({
    W: [33, y, -16, 15], X: [286, y, 5, 15], Y: [286, 48, 6, -4], Z: [33, 48, -16, -4],
    P: [x, y, -5, 20], A: [x + u, y - v, 7, 6], C: [x - v, y - u, -17, 4],
    B: [x + u - v, y - u - v, -5, -5],
  }, ['WXYZW', 'PABCP'], ['WPC', 'APX'],
  'P is between W and X. Above side WX the rays at P run from PW through PC and PA to PX.');
}

export function partitionedRectangle(degrees: number, height: number): Batch11UpperPicture {
  const left = 40;
  const right = 278;
  const top = 43;
  const bottom = top + height;
  const foot = left + height / Math.tan(degrees * Math.PI / 180);
  return diagram({
    P: [left, top, -16, -5], Q: [right, top, 5, -5], R: [right, bottom, 6, 16],
    S: [left, bottom, -16, 16], T: [foot, bottom, -5, 20],
  }, ['PQRSP', 'PT', 'QT'], ['SPT', 'PQT', 'TQR'],
  'PQ is the top edge and SR is the bottom edge. T lies between S and R. PT and QT divide the corners at P and Q.');
}

export function sharedVertex(degrees: number, side: number): Batch11UpperPicture {
  const a = degrees * Math.PI / 180;
  const x = 128;
  const y = 177;
  const ux = 122 * Math.cos(a);
  const uy = -122 * Math.sin(a);
  const wx = -83 * Math.sin(a);
  const wy = -83 * Math.cos(a);
  return diagram({
    P: [x, y, -6, 19], Q: [x + side, y, 6, 15], R: [x + side, y - side, 5, -5],
    S: [x, y - side, 4, -6], U: [x + ux, y + uy, 7, 6], W: [x + wx, y + wy, -19, 4],
    V: [x + ux + wx, y + uy + wy, -5, -6],
  }, ['PQRSP', 'PUVWP'], ['QPW', 'QRS'],
  'Square PQRS and rectangle PUVW meet at P. Turning from PQ towards PW inside the marked angle, you pass PU and then PS.');
}
